import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ServerTransport,
  ClientTransport,
  transportSerializationAdapter,
  type QueryEvent,
  type QueryProgressEvent,
  type ReadableStreamRelayEvent,
} from "../transport.ts";
import { ReplaySubject, type OperationDescriptor } from "relay-runtime";
import * as React from "react";

// Mock React hooks
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    useId: vi.fn(() => "test-id-123"),
    useRef: vi.fn((value) => ({ current: value })),
    useEffect: vi.fn((callback) => callback()),
  };
});

// Helper to create mock operation
function createMockOperation(
  id: string,
  variables: Record<string, any> = {},
): OperationDescriptor {
  return {
    request: {
      node: {
        params: {
          id,
          cacheID: id,
          name: `TestQuery_${id}`,
          operationKind: "query" as const,
          text: null,
          metadata: {},
        },
        kind: "Request" as const,
        fragment: {} as any,
        operation: {} as any,
      },
      variables,
      identifier: `${id}_${JSON.stringify(variables)}`,
    },
    fragment: {} as any,
  } as OperationDescriptor;
}

// Helper to read all chunks from a ReadableStream
async function readAllChunks<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const chunks: T[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return chunks;
}

// Helper to read stream with timeout
async function readStreamWithTimeout<T>(
  stream: ReadableStream<T>,
  timeout: number = 100,
): Promise<T[]> {
  const chunks: T[] = [];
  const reader = stream.getReader();

  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => resolve(), timeout);
  });

  const readPromise = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } catch (error) {
      // Stream might be cancelled
    }
  })();

  await Promise.race([readPromise, timeoutPromise]);

  try {
    reader.releaseLock();
  } catch {
    // Already released
  }

  return chunks;
}

describe("ServerTransport", () => {
  let serverTransport: ServerTransport;

  beforeEach(() => {
    serverTransport = new ServerTransport();
  });

  describe("constructor", () => {
    it("should create a ReadableStream", () => {
      expect(serverTransport.stream).toBeInstanceOf(ReadableStream);
    });

    it("should initialize with closed = false", async () => {
      // We can verify this by checking if the stream is still writable
      const reader = serverTransport.stream.getReader();
      reader.releaseLock();

      expect(serverTransport.stream.locked).toBe(false);
    });
  });

  describe("streamValue", () => {
    it("should enqueue a value event to the stream", async () => {
      const testValue = { foo: "bar" };
      const testId = "value-123";

      serverTransport.streamValue(testId, testValue);

      const chunks = await readStreamWithTimeout(serverTransport.stream, 50);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({
        type: "value",
        id: testId,
        value: testValue,
      });
    });

    it("should enqueue multiple values", async () => {
      serverTransport.streamValue("id-1", "value1");
      serverTransport.streamValue("id-2", "value2");
      serverTransport.streamValue("id-3", "value3");

      const chunks = await readStreamWithTimeout(serverTransport.stream, 50);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ type: "value", id: "id-1", value: "value1" });
      expect(chunks[1]).toEqual({ type: "value", id: "id-2", value: "value2" });
      expect(chunks[2]).toEqual({ type: "value", id: "id-3", value: "value3" });
    });
  });

  describe("dispatchRequestStarted", () => {
    it("should enqueue started event to stream", async () => {
      const operation = createMockOperation("test1");
      const replaySubject = new ReplaySubject<QueryProgressEvent>();

      const startedEvent: Extract<QueryEvent, { type: "started" }> = {
        type: "started",
        id: "query-123",
        operation,
      };

      serverTransport.dispatchRequestStarted({
        event: startedEvent,
        replaySubject,
      });

      const chunks = await readStreamWithTimeout(serverTransport.stream, 50);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual(startedEvent);
    });

    it("should forward next events from replaySubject to stream", async () => {
      const operation = createMockOperation("test1");
      const replaySubject = new ReplaySubject<QueryProgressEvent>();

      const startedEvent: Extract<QueryEvent, { type: "started" }> = {
        type: "started",
        id: "query-123",
        operation,
      };

      serverTransport.dispatchRequestStarted({
        event: startedEvent,
        replaySubject,
      });

      // Emit progress events
      const nextEvent: QueryProgressEvent = {
        type: "next",
        id: "query-123",
        data: { test: "data" },
      };

      replaySubject.next(nextEvent);

      const chunks = await readStreamWithTimeout(serverTransport.stream, 50);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual(startedEvent);
      expect(chunks[1]).toEqual(nextEvent);
    });

    it("should handle error events from replaySubject", async () => {
      const operation = createMockOperation("test1");
      const replaySubject = new ReplaySubject<QueryProgressEvent>();

      const startedEvent: Extract<QueryEvent, { type: "started" }> = {
        type: "started",
        id: "query-123",
        operation,
      };

      serverTransport.dispatchRequestStarted({
        event: startedEvent,
        replaySubject,
      });

      const errorEvent: QueryProgressEvent = {
        type: "error",
        id: "query-123",
        error: { message: "Test error" },
      };

      replaySubject.next(errorEvent);
      replaySubject.error(new Error("Test error"));

      const chunks = await readStreamWithTimeout(serverTransport.stream, 50);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual(startedEvent);
      expect(chunks[1]).toEqual(errorEvent);
    });

    it("should handle complete events from replaySubject", async () => {
      const operation = createMockOperation("test1");
      const replaySubject = new ReplaySubject<QueryProgressEvent>();

      const startedEvent: Extract<QueryEvent, { type: "started" }> = {
        type: "started",
        id: "query-123",
        operation,
      };

      serverTransport.dispatchRequestStarted({
        event: startedEvent,
        replaySubject,
      });

      const completeEvent: QueryProgressEvent = {
        type: "complete",
        id: "query-123",
      };

      replaySubject.next(completeEvent);
      replaySubject.complete();

      const chunks = await readStreamWithTimeout(serverTransport.stream, 50);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual(startedEvent);
      expect(chunks[1]).toEqual(completeEvent);
    });
  });

  describe("closeOnceFinished", () => {
    it("should set shouldClose flag", () => {
      serverTransport.closeOnceFinished();

      // We can't directly check the flag, but we can verify behavior
      // If there are no ongoing streams, the stream should close
      const reader = serverTransport.stream.getReader();

      // The stream should close eventually
      reader.read().then((result) => {
        expect(result.done).toBe(true);
      });
    });

    it("should close stream when no ongoing streams exist", async () => {
      serverTransport.closeOnceFinished();

      const reader = serverTransport.stream.getReader();
      const { done } = await reader.read();

      expect(done).toBe(true);
    });

    it("should not close stream while there are ongoing streams", async () => {
      const operation = createMockOperation("test1");
      const replaySubject = new ReplaySubject<QueryProgressEvent>();

      const startedEvent: Extract<QueryEvent, { type: "started" }> = {
        type: "started",
        id: "query-123",
        operation,
      };

      serverTransport.dispatchRequestStarted({
        event: startedEvent,
        replaySubject,
      });

      serverTransport.closeOnceFinished();

      // Stream should still be open because there's an ongoing stream
      const chunks = await readStreamWithTimeout(serverTransport.stream, 50);

      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    it("should close stream after ongoing streams complete", async () => {
      const operation = createMockOperation("test1");
      const replaySubject = new ReplaySubject<QueryProgressEvent>();

      const startedEvent: Extract<QueryEvent, { type: "started" }> = {
        type: "started",
        id: "query-123",
        operation,
      };

      serverTransport.dispatchRequestStarted({
        event: startedEvent,
        replaySubject,
      });

      serverTransport.closeOnceFinished();

      // Complete the replay subject
      replaySubject.complete();

      // Give some time for async operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      const reader = serverTransport.stream.getReader();
      const allChunks: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        allChunks.push(value);
      }

      // Stream should be closed
      expect(allChunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("useStaticValueRef", () => {
    it("should call streamValue and return a ref", () => {
      const testValue = { foo: "bar" };

      const result = serverTransport.useStaticValueRef(testValue);

      expect(result).toEqual({ current: testValue });
      expect(React.useId).toHaveBeenCalled();
      expect(React.useRef).toHaveBeenCalledWith(testValue);
    });

    it("should use useId to generate the id for streaming", async () => {
      const testValue = "test-value";

      serverTransport.useStaticValueRef(testValue);

      const chunks = await readStreamWithTimeout(serverTransport.stream, 50);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({
        type: "value",
        id: "test-id-123",
        value: testValue,
      });
    });
  });
});

describe("ClientTransport", () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should consume the provided stream", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "started",
            id: "query-1",
            operation: createMockOperation("test1"),
          } as QueryEvent);
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "ClientTransport consuming stream",
      );
    });
  });

  describe("event buffering", () => {
    it("should buffer QueryEvents before onQueryEvent is set", async () => {
      const operation = createMockOperation("test1");
      const startedEvent: QueryEvent = {
        type: "started",
        id: "query-1",
        operation,
      };

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(startedEvent);
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const callback = vi.fn();
      clientTransport.onQueryEvent = callback;

      expect(callback).toHaveBeenCalledWith(startedEvent);
    });

    it("should immediately call callback for new events after onQueryEvent is set", async () => {
      const stream = new ReadableStream({
        start(controller) {
          // Don't enqueue anything initially
          setTimeout(() => {
            controller.enqueue({
              type: "next",
              id: "query-1",
              data: { test: "data" },
            } as QueryEvent);
            controller.close();
          }, 50);
        },
      });

      const clientTransport = new ClientTransport(stream);
      const callback = vi.fn();

      // Set callback before events arrive
      clientTransport.onQueryEvent = callback;

      // Wait for event to arrive
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalledWith({
        type: "next",
        id: "query-1",
        data: { test: "data" },
      });
    });

    it("should handle multiple buffered events", async () => {
      const operation = createMockOperation("test1");
      const events: QueryEvent[] = [
        {
          type: "started",
          id: "query-1",
          operation,
        },
        {
          type: "next",
          id: "query-1",
          data: { test: "data" },
        },
        {
          type: "complete",
          id: "query-1",
        },
      ];

      const stream = new ReadableStream({
        start(controller) {
          events.forEach((event) => controller.enqueue(event));
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const callback = vi.fn();
      clientTransport.onQueryEvent = callback;

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, events[0]);
      expect(callback).toHaveBeenNthCalledWith(2, events[1]);
      expect(callback).toHaveBeenNthCalledWith(3, events[2]);
    });
  });

  describe("value streaming", () => {
    it("should store value events in receivedValues", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "value",
            id: "value-1",
            value: { foo: "bar" },
          });
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const value = clientTransport.getStreamedValue("value-1");

      expect(value).toEqual({ foo: "bar" });
    });

    it("should not buffer value events as QueryEvents", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "value",
            id: "value-1",
            value: "test",
          });
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const callback = vi.fn();
      clientTransport.onQueryEvent = callback;

      // Value events should not be passed to onQueryEvent callback
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("getStreamedValue", () => {
    it("should return undefined for non-existent values", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);
      const value = clientTransport.getStreamedValue("non-existent");

      expect(value).toBeUndefined();
    });

    it("should return the correct value for existing id", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "value",
            id: "test-id",
            value: "test-value",
          });
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const value = clientTransport.getStreamedValue<string>("test-id");

      expect(value).toBe("test-value");
    });
  });

  describe("deleteStreamedValue", () => {
    it("should remove value from receivedValues", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "value",
            id: "test-id",
            value: "test-value",
          });
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(clientTransport.getStreamedValue("test-id")).toBe("test-value");

      clientTransport.deleteStreamedValue("test-id");

      expect(clientTransport.getStreamedValue("test-id")).toBeUndefined();
    });

    it("should not throw error when deleting non-existent value", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      expect(() =>
        clientTransport.deleteStreamedValue("non-existent"),
      ).not.toThrow();
    });
  });

  describe("useStaticValueRef", () => {
    it("should return ref with original value when no streamed value exists", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);
      const testValue = { foo: "bar" };

      const result = clientTransport.useStaticValueRef(testValue);

      expect(result).toEqual({ current: testValue });
      expect(React.useRef).toHaveBeenCalledWith(testValue);
    });

    it("should return ref with streamed value when it exists", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "value",
            id: "test-id-123",
            value: "streamed-value",
          });
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = clientTransport.useStaticValueRef("original-value");

      expect(result).toEqual({ current: "streamed-value" });
      expect(React.useRef).toHaveBeenCalledWith("streamed-value");
    });

    it("should call deleteStreamedValue via useEffect", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);
      const deleteSpy = vi.spyOn(clientTransport, "deleteStreamedValue");

      clientTransport.useStaticValueRef("test-value");

      expect(React.useEffect).toHaveBeenCalled();
      expect(deleteSpy).toHaveBeenCalledWith("test-id-123");
    });
  });

  describe("stream completion", () => {
    it("should handle stream completion", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "next",
            id: "query-1",
            data: { test: "data" },
          } as QueryEvent);
          controller.close();
        },
      });

      const clientTransport = new ClientTransport(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const callback = vi.fn();
      clientTransport.onQueryEvent = callback;

      expect(callback).toHaveBeenCalledWith({
        type: "next",
        id: "query-1",
        data: { test: "data" },
      });
    });
  });
});

describe("transportSerializationAdapter", () => {
  describe("key", () => {
    it("should have the correct key", () => {
      expect(transportSerializationAdapter.key).toBe("relay-ssr-transport");
    });
  });

  describe("test", () => {
    it("should return true for ServerTransport instances", () => {
      const serverTransport = new ServerTransport();

      expect(transportSerializationAdapter.test(serverTransport)).toBe(true);
    });

    it("should return false for non-ServerTransport instances", () => {
      const notServerTransport = { stream: new ReadableStream() };

      expect(
        transportSerializationAdapter.test(notServerTransport as any),
      ).toBe(false);
    });

    it("should return false for ClientTransport instances", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
      const clientTransport = new ClientTransport(stream);

      expect(transportSerializationAdapter.test(clientTransport as any)).toBe(
        false,
      );
    });
  });

  describe("toSerializable", () => {
    it("should extract the stream from ServerTransport", () => {
      const serverTransport = new ServerTransport();
      const serializable =
        transportSerializationAdapter.toSerializable(serverTransport);

      expect(serializable).toBe(serverTransport.stream);
    });
  });

  describe("fromSerializable", () => {
    it("should create a ClientTransport from a stream", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const result = transportSerializationAdapter.fromSerializable(stream);

      expect(result).toBeInstanceOf(ClientTransport);
    });

    it("should create a ClientTransport that can consume the stream", async () => {
      const operation = createMockOperation("test1");
      const event: QueryEvent = {
        type: "started",
        id: "query-1",
        operation,
      };

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(event);
          controller.close();
        },
      });

      const clientTransport =
        transportSerializationAdapter.fromSerializable(stream);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const callback = vi.fn();
      clientTransport.onQueryEvent = callback;

      expect(callback).toHaveBeenCalledWith(event);
    });
  });

  describe("roundtrip serialization", () => {
    it("should serialize and deserialize correctly", async () => {
      const serverTransport = new ServerTransport();
      const testValue = { test: "data" };

      serverTransport.streamValue("test-id", testValue);

      // Serialize
      const serialized =
        transportSerializationAdapter.toSerializable(serverTransport);

      // Deserialize
      const clientTransport =
        transportSerializationAdapter.fromSerializable(serialized);

      // Give time for async consumption
      await new Promise((resolve) => setTimeout(resolve, 100));

      const value = clientTransport.getStreamedValue("test-id");

      expect(value).toEqual(testValue);
    });
  });
});
