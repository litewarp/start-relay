import { observableFromStream } from "./stream-utils.ts";
import type { DataTransportContext } from "./wrap-relay-provider.tsx";

import { createSerializationAdapter } from "@tanstack/react-router";
import { useEffect, useId, useRef, type Context, type RefObject } from "react";
import type { ReplaySubject } from "relay-runtime";
import type { GraphQLResponse, OperationDescriptor } from "relay-runtime";
import { debug } from "./debug.ts";

export type ReadableStreamRelayEvent<
  T extends GraphQLResponse = GraphQLResponse,
> =
  | { type: "next"; data: T }
  | { type: "error"; error: string | Record<string, unknown> }
  | { type: "complete" };

export type QueryEvent =
  | {
      type: "started";
      operation: OperationDescriptor;
      id: string;
    }
  | (ReadableStreamRelayEvent & {
      id: string;
    });

interface ValueEvent<T = unknown> {
  type: "value";
  value: T;
  id: string;
}
export type QueryProgressEvent = Exclude<QueryEvent, { type: "started" }>;

export type Transported = ReadableStream<QueryEvent | ValueEvent>;

type DataTransportAbstraction =
  typeof DataTransportContext extends Context<infer T> ? NonNullable<T> : never;

export const transportSerializationAdapter = createSerializationAdapter<
  ServerTransport | ClientTransport,
  Transported
>({
  key: "relay-ssr-transport",
  test: (value): value is ServerTransport => value instanceof ServerTransport,
  toSerializable(data) {
    // TS is a bit too strict about serializability here - some values are just `unknown`, but definitely serializable
    return (data as ServerTransport).stream satisfies Transported as any;
  },
  fromSerializable(data) {
    return new ClientTransport(data);
  },
});

export class ServerTransport implements DataTransportAbstraction {
  stream: Transported;
  private controller!: ReadableStreamDefaultController<QueryEvent | ValueEvent>;
  private ongoingStreams = new Set<Extract<QueryEvent, { type: "started" }>>();

  private closed = false;
  private shouldClose = false;

  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      },
    });
  }

  closeOnceFinished() {
    this.shouldClose = true;
    this.closeIfFinished();
  }

  private closeIfFinished() {
    if (this.shouldClose && this.ongoingStreams.size === 0 && !this.closed) {
      this.controller.close();
      this.closed = true;
    }
  }

  dispatchRequestStarted = ({
    event,
    replaySubject,
  }: {
    event: Extract<QueryEvent, { type: "started" }>;
    replaySubject: ReplaySubject<QueryProgressEvent>;
  }): void => {
    this.controller.enqueue(event);
    this.ongoingStreams.add(event);
    const finalize = () => {
      this.ongoingStreams.delete(event);
      this.closeIfFinished();
    };
    replaySubject.subscribe({
      next: (ev) => {
        if (!this.closed) {
          this.controller.enqueue(ev);
        }
      },
      error: finalize,
      complete: finalize,
    });
  };

  streamValue(id: string, value: unknown) {
    this.controller.enqueue({ type: "value", id, value });
  }

  useStaticValueRef = <T>(value: T): { current: T } => {
    const id = useId();
    this.streamValue(id, value);
    return useRef(value);
  };
}

export class ClientTransport implements DataTransportAbstraction {
  private bufferedEvents: QueryEvent[] = [];
  private receivedValues: Record<string, unknown> = {};

  constructor(stream: Transported) {
    this.consume(stream);
  }

  private async consume(stream: Transported) {
    debug("ClientTransport consuming stream");
    observableFromStream(stream).subscribe({
      next: (event) => {
        if (event.type === "value") {
          this.receivedValues[event.id] = event.value;
        } else {
          debug("pushing event", event);
          this.bufferedEvents.push(event);
        }
      },
      complete: () => {
        // this.rerunSimulatedQueries?.();
      },
      error: (error: unknown) => {
        debug("Error in ClientTransport:", error);
      },
    });
  }
  // this will be set from the `WrapApolloProvider` data transport

  public set onQueryEvent(cb: (event: QueryEvent) => void) {
    let event: QueryEvent | undefined;
    while ((event = this.bufferedEvents.shift())) {
      cb(event);
    }
    this.bufferedEvents.push = (...events: QueryEvent[]) => {
      for (const event of events) {
        cb(event);
      }
      return 0;
    };
  }
  // this will be set from the `WrapApolloProvider` data transport
  public rerunSimulatedQueries?: () => void;

  public getStreamedValue<T>(id: string): T | undefined {
    return this.receivedValues[id] as T | undefined;
  }
  public deleteStreamedValue(id: string) {
    delete this.receivedValues[id];
  }

  useStaticValueRef = <T>(value: T): RefObject<T> => {
    const id = useId();
    const streamedValue = this.getStreamedValue<T>(id);
    const dataValue = streamedValue !== undefined ? streamedValue : value;

    useEffect(() => {
      this.deleteStreamedValue(id);
    }, [id]);
    return useRef(dataValue);
  };
}
