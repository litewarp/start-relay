import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createQueryCache, QueryCache } from './query-cache.ts';
import { buildQueryKey, RelayQuery } from './query.ts';
import type { OperationDescriptor } from 'relay-runtime';
import { ReplaySubject } from 'relay-runtime';
import type { QueryEvent, QueryProgressEvent } from './transport.ts';

// Mock helper to create a basic OperationDescriptor
function createMockOperation(id: string, variables: Record<string, any> = {}): OperationDescriptor {
  return {
    request: {
      node: {
        params: {
          id,
          cacheID: id,
          name: `TestQuery_${id}`,
          operationKind: 'query' as const,
          text: null,
          metadata: {},
        },
        kind: 'Request' as const,
        fragment: {} as any,
        operation: {} as any,
      },
      variables,
      identifier: `${id}_${JSON.stringify(variables)}`,
    },
    fragment: {} as any,
  } as OperationDescriptor;
}

describe('createQueryCache', () => {
  it('should create a QueryCache instance', () => {
    const cache = createQueryCache();
    expect(cache).toBeInstanceOf(QueryCache);
  });

  it('should create a server-side QueryCache when isServer is true', () => {
    const cache = createQueryCache(true);
    expect(cache).toBeInstanceOf(QueryCache);
  });

  it('should create a client-side QueryCache when isServer is false', () => {
    const cache = createQueryCache(false);
    expect(cache).toBeInstanceOf(QueryCache);
  });
});

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
  });

  describe('constructor', () => {
    it('should initialize with empty queries map', () => {
      expect(cache.queries.size).toBe(0);
    });

    it('should set isServer to false by default', () => {
      const cache = new QueryCache();
      expect(() => cache.watchQuery(createMockOperation('test'), new ReplaySubject())).toThrow(
        'watchQuery is not supported on the client',
      );
    });

    it('should set isServer to true when provided', () => {
      const serverCache = new QueryCache(true);
      const operation = createMockOperation('test');
      const replaySubject = new ReplaySubject();

      expect(() => serverCache.watchQuery(operation, replaySubject)).not.toThrow(
        'watchQuery is not supported on the client',
      );
    });
  });

  describe('add', () => {
    it('should add a query to the cache', () => {
      const operation = createMockOperation('test1');
      const query = new RelayQuery(operation);

      cache.add(query);

      expect(cache.queries.size).toBe(1);
      expect(cache.queries.has(query.queryKey)).toBe(true);
    });

    it('should not add duplicate queries with the same queryKey', () => {
      const operation = createMockOperation('test1', { foo: 'bar' });
      const query1 = new RelayQuery(operation);
      const query2 = new RelayQuery(operation);

      cache.add(query1);
      cache.add(query2);

      expect(cache.queries.size).toBe(1);
      expect(cache.queries.get(query1.queryKey)).toBe(query1);
    });

    it('should add multiple queries with different queryKeys', () => {
      const operation1 = createMockOperation('test1');
      const operation2 = createMockOperation('test2');
      const query1 = new RelayQuery(operation1);
      const query2 = new RelayQuery(operation2);

      cache.add(query1);
      cache.add(query2);

      expect(cache.queries.size).toBe(2);
    });
  });

  describe('get', () => {
    it('should retrieve a query by queryId', () => {
      const operation = createMockOperation('test1');
      const query = new RelayQuery(operation);
      cache.add(query);

      const retrieved = cache.get(query.queryKey);

      expect(retrieved).toBe(query);
    });

    it('should return undefined for non-existent queryId', () => {
      const retrieved = cache.get('non-existent');

      expect(retrieved).toBeUndefined();
    });

    it('should retrieve queries with different variables separately', () => {
      const operation1 = createMockOperation('test1', { foo: 'bar' });
      const operation2 = createMockOperation('test1', { foo: 'baz' });
      const query1 = new RelayQuery(operation1);
      const query2 = new RelayQuery(operation2);

      cache.add(query1);
      cache.add(query2);

      expect(cache.get(query1.queryKey)).toBe(query1);
      expect(cache.get(query2.queryKey)).toBe(query2);
    });
  });

  describe('build', () => {
    it('should create and add a new query if not exists', () => {
      const operation = createMockOperation('test1');

      const query = cache.build(operation);

      expect(query).toBeInstanceOf(RelayQuery);
      expect(cache.queries.size).toBe(1);
      expect(cache.queries.get(query.queryKey)).toBe(query);
    });

    it('should return existing query if already exists', () => {
      const operation = createMockOperation('test1');

      const query1 = cache.build(operation);
      const query2 = cache.build(operation);

      expect(query1).toBe(query2);
      expect(cache.queries.size).toBe(1);
    });

    it('should create separate queries for same operation with different variables', () => {
      const operation1 = createMockOperation('test1', { id: 1 });
      const operation2 = createMockOperation('test1', { id: 2 });

      const query1 = cache.build(operation1);
      const query2 = cache.build(operation2);

      expect(query1).not.toBe(query2);
      expect(cache.queries.size).toBe(2);
    });
  });

  describe('onQueryStarted', () => {
    it('should build query and add to simulatedStreamingQueries', () => {
      const operation = createMockOperation('test1');
      const event: Extract<QueryEvent, { type: 'started' }> = {
        id: 'query-123',
        type: 'started',
        operation,
      };

      cache.onQueryStarted(event);

      const queryKey = buildQueryKey(operation);
      const query = cache.get(queryKey);

      expect(query).toBeDefined();
      expect(query).toBeInstanceOf(RelayQuery);
    });

    it('should reuse existing query if already built', () => {
      const operation = createMockOperation('test1');
      const existingQuery = cache.build(operation);

      const event: Extract<QueryEvent, { type: 'started' }> = {
        id: 'query-123',
        type: 'started',
        operation,
      };

      cache.onQueryStarted(event);

      const queryKey = buildQueryKey(operation);
      const query = cache.get(queryKey);

      expect(query).toBe(existingQuery);
    });
  });

  describe('onQueryProgress', () => {
    let operation: OperationDescriptor;
    let queryId: string;

    beforeEach(() => {
      operation = createMockOperation('test1');
      queryId = 'query-123';

      const startEvent: Extract<QueryEvent, { type: 'started' }> = {
        id: queryId,
        type: 'started',
        operation,
      };

      cache.onQueryStarted(startEvent);
    });

    it('should handle "next" events', () => {
      const query = cache.get(buildQueryKey(operation))!;
      const nextSpy = vi.spyOn(query.replaySubject, 'next');

      const progressEvent: QueryProgressEvent = {
        id: queryId,
        type: 'next',
        data: { test: 'data' },
      };

      cache.onQueryProgress(progressEvent);

      expect(nextSpy).toHaveBeenCalledWith(progressEvent);
    });

    it('should handle "error" events', () => {
      const query = cache.get(buildQueryKey(operation))!;
      const errorSpy = vi.spyOn(query.replaySubject, 'error');

      const progressEvent: QueryProgressEvent = {
        id: queryId,
        type: 'error',
        error: { message: 'Test error' },
      };

      cache.onQueryProgress(progressEvent);

      expect(errorSpy).toHaveBeenCalledWith(new Error(JSON.stringify(progressEvent.error)));
    });

    it('should handle "complete" events', () => {
      const query = cache.get(buildQueryKey(operation))!;
      const completeSpy = vi.spyOn(query.replaySubject, 'complete');

      const progressEvent: QueryProgressEvent = {
        id: queryId,
        type: 'complete',
      };

      cache.onQueryProgress(progressEvent);

      expect(completeSpy).toHaveBeenCalled();
    });

    it('should throw error if replaySubject not found', () => {
      const progressEvent: QueryProgressEvent = {
        id: 'non-existent-id',
        type: 'next',
        data: {},
      };

      expect(() => cache.onQueryProgress(progressEvent)).toThrow(
        'ReplaySubject for query with id non-existent-id not found',
      );
    });
  });

  describe('rerunSimulatedQueries', () => {
    let consoleLogSpy: any;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should rerun queries and call environment.execute', () => {
      const operation = createMockOperation('test1');
      const queryId = 'query-123';

      const startEvent: Extract<QueryEvent, { type: 'started' }> = {
        id: queryId,
        type: 'started',
        operation,
      };

      cache.onQueryStarted(startEvent);

      const mockEnvironment = {
        execute: vi.fn(),
      } as any;

      cache.rerunSimulatedQueries(mockEnvironment);

      expect(mockEnvironment.execute).toHaveBeenCalledWith({ operation });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Streaming connection closed before server query could be fully transported, rerunning:',
        operation.request,
      );
    });

    it('should not call execute if no simulated queries exist', () => {
      const mockEnvironment = {
        execute: vi.fn(),
      } as any;

      cache.rerunSimulatedQueries(mockEnvironment);

      expect(mockEnvironment.execute).not.toHaveBeenCalled();
    });

    it('should only rerun the first simulated query', () => {
      const operation1 = createMockOperation('test1');
      const operation2 = createMockOperation('test2');

      cache.onQueryStarted({
        id: 'query-1',
        type: 'started',
        operation: operation1,
      });

      cache.onQueryStarted({
        id: 'query-2',
        type: 'started',
        operation: operation2,
      });

      const mockEnvironment = {
        execute: vi.fn(),
      } as any;

      cache.rerunSimulatedQueries(mockEnvironment);

      // Only called once, for the first query
      expect(mockEnvironment.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('watchQuery', () => {
    it('should throw error on client side', () => {
      const clientCache = new QueryCache(false);
      const operation = createMockOperation('test1');
      const replaySubject = new ReplaySubject();

      expect(() => clientCache.watchQuery(operation, replaySubject)).toThrow(
        'watchQuery is not supported on the client',
      );
    });

    it('should add query to watchQueryQueue on server side', () => {
      const serverCache = new QueryCache(true);
      const operation = createMockOperation('test1');
      const replaySubject = new ReplaySubject();

      const pushSpy = vi.spyOn(serverCache.watchQueryQueue, 'push');

      serverCache.watchQuery(operation, replaySubject);

      expect(pushSpy).toHaveBeenCalledWith({
        event: {
          id: buildQueryKey(operation),
          type: 'started',
          operation,
        },
        replaySubject,
      });
    });

    it('should throw error if watchQueryQueue is not initialized', () => {
      const serverCache = new QueryCache(true);

      // Manually set watchQueryQueue to undefined to simulate uninitialized state
      (serverCache as any).watchQueryQueue = undefined;

      const operation = createMockOperation('test1');
      const replaySubject = new ReplaySubject();

      expect(() => serverCache.watchQuery(operation, replaySubject)).toThrow(
        'watchQueryQueue is not initialized',
      );
    });

    it('should use buildQueryKey to generate query id', () => {
      const serverCache = new QueryCache(true);
      const operation = createMockOperation('test1', { userId: 123 });
      const replaySubject = new ReplaySubject();

      const pushSpy = vi.spyOn(serverCache.watchQueryQueue, 'push');

      serverCache.watchQuery(operation, replaySubject);

      const expectedId = buildQueryKey(operation);

      expect(pushSpy).toHaveBeenCalledWith({
        event: {
          id: expectedId,
          type: 'started',
          operation,
        },
        replaySubject,
      });
    });
  });
});
