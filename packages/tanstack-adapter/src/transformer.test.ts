import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelayIncrementalDeliveryTransformer } from './transformer.ts';
import type {
  InitialIncrementalExecutionResult,
  SubsequentIncrementalExecutionResult,
} from 'graphql';

describe('RelayIncrementalDeliveryTransformer', () => {
  let transformer: RelayIncrementalDeliveryTransformer;
  let nextCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nextCallback = vi.fn();
    transformer = new RelayIncrementalDeliveryTransformer(nextCallback);
  });

  describe('constructor', () => {
    it('should initialize with empty pendingParts and dataTree', () => {
      const callback = vi.fn();
      const transformer = new RelayIncrementalDeliveryTransformer(callback);

      // We can verify initialization by checking that no callbacks are made initially
      expect(callback).not.toHaveBeenCalled();
    });

    it('should store the next callback', () => {
      const callback = vi.fn();
      const transformer = new RelayIncrementalDeliveryTransformer(callback);

      // Process an initial result to verify callback is used
      const initialResult: InitialIncrementalExecutionResult = {
        data: { test: 'data' },
        hasNext: false,
      };

      transformer.onNext([initialResult]);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('onNext - initial results', () => {
    it('should handle initial execution result with data', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1', name: 'Alice' } },
        hasNext: false,
      };

      transformer.onNext([initialResult]);

      expect(nextCallback).toHaveBeenCalledWith({
        data: { user: { id: '1', name: 'Alice' } },
        errors: undefined,
        extensions: {
          is_final: true,
        },
      });
    });

    it('should handle initial execution result with errors', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: null,
        errors: [{ message: 'Test error' }],
        hasNext: false,
      };

      transformer.onNext([initialResult]);

      expect(nextCallback).toHaveBeenCalledWith({
        data: null,
        errors: [{ message: 'Test error' }],
        extensions: {
          is_final: true,
        },
      });
    });

    it('should handle initial result with hasNext: true', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' } },
        hasNext: true,
      };

      transformer.onNext([initialResult]);

      expect(nextCallback).toHaveBeenCalledWith({
        data: { user: { id: '1' } },
        errors: undefined,
        extensions: {
          is_final: false,
        },
      });
    });

    it('should handle initial result with extensions', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { test: 'data' },
        hasNext: false,
        extensions: {
          customField: 'customValue',
        },
      };

      transformer.onNext([initialResult]);

      expect(nextCallback).toHaveBeenCalledWith({
        data: { test: 'data' },
        errors: undefined,
        extensions: {
          customField: 'customValue',
          is_final: true,
        },
      });
    });

    it('should update dataTree with initial data', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1', name: 'Alice' } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user'] }],
      };

      transformer.onNext([initialResult]);

      // Verify dataTree was set
      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { user: { id: '1', name: 'Alice' } },
        }),
      );

      // Process incremental update which will merge into the dataTree
      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { age: 30 },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      // Should be called once for the completed part
      expect(nextCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('onNext - pending parts', () => {
    it('should register pending parts from initial result', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1', profile: {}, posts: {} } },
        hasNext: true,
        pending: [
          { id: 'deferred-1', path: ['user', 'profile'] },
          { id: 'deferred-2', path: ['user', 'posts'] },
        ],
      };

      transformer.onNext([initialResult]);

      // Verify pending parts are registered by processing subsequent result
      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { bio: 'Test bio' },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      // Should call next for completed part
      expect(nextCallback).toHaveBeenCalled();
    });

    it('should register pending parts with labels', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user'], label: 'UserProfile' }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'UserProfile',
        }),
      );
    });

    it('should handle pending parts from subsequent results', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { test: 'data' },
        hasNext: true,
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['test'] }],
      };

      transformer.onNext([subsequentResult]);

      // Verify by completing the pending part
      const completionResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([completionResult]);

      expect(nextCallback).toHaveBeenCalled();
    });
  });

  describe('onNext - incremental data', () => {
    it('should handle incremental data updates', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1', name: 'Alice' } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { age: 30, email: 'alice@example.com' },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledWith({
        data: { age: 30, email: 'alice@example.com' },
        path: ['user'],
        label: undefined,
        extensions: {
          is_final: true,
        },
      });
    });

    it('should handle incremental data at nested paths', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1', profile: {} } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user', 'profile'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { bio: 'Test bio', age: 30 },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledWith({
        data: { bio: 'Test bio', age: 30 },
        path: ['user', 'profile'],
        label: undefined,
        extensions: {
          is_final: true,
        },
      });
    });

    it('should merge incremental data into dataTree', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1', name: 'Alice' } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { age: 30 },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      transformer.onNext([subsequentResult]);

      // The dataTree should now contain merged data
      // We can verify this indirectly through the completed callback
      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { age: 30 },
        }),
      );
    });

    it('should handle multiple incremental updates for same pending part', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user'] }],
      };

      transformer.onNext([initialResult]);

      // First incremental update
      const subsequentResult1: SubsequentIncrementalExecutionResult = {
        hasNext: true,
        incremental: [
          {
            id: 'deferred-1',
            data: { name: 'Alice' },
          },
        ],
      };

      transformer.onNext([subsequentResult1]);

      // Second incremental update
      const subsequentResult2: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { age: 30 },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult2]);

      // Should have merged both updates
      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Alice',
            age: 30,
          }),
        }),
      );
    });
  });

  describe('onNext - incremental items (stream)', () => {
    it('should handle incremental items for lists', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { posts: [] },
        hasNext: true,
        pending: [{ id: 'stream-1', path: ['posts'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'stream-1',
            items: [
              { id: '1', title: 'Post 1' },
              { id: '2', title: 'Post 2' },
            ],
          },
        ],
        completed: [{ id: 'stream-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      // Should call next once for each item
      expect(nextCallback).toHaveBeenCalledTimes(3); // 2 items + 1 completion

      expect(nextCallback).toHaveBeenNthCalledWith(1, {
        data: { id: '1', title: 'Post 1' },
        path: ['posts', 0],
        label: undefined,
        extensions: {
          is_final: true,
        },
      });

      expect(nextCallback).toHaveBeenNthCalledWith(2, {
        data: { id: '2', title: 'Post 2' },
        path: ['posts', 1],
        label: undefined,
        extensions: {
          is_final: true,
        },
      });
    });

    it('should handle multiple batches of incremental items', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { posts: [] },
        hasNext: true,
        pending: [{ id: 'stream-1', path: ['posts'] }],
      };

      transformer.onNext([initialResult]);

      // First batch
      const subsequentResult1: SubsequentIncrementalExecutionResult = {
        hasNext: true,
        incremental: [
          {
            id: 'stream-1',
            items: [{ id: '1', title: 'Post 1' }],
          },
        ],
      };

      transformer.onNext([subsequentResult1]);

      // Second batch
      const subsequentResult2: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'stream-1',
            items: [{ id: '2', title: 'Post 2' }],
          },
        ],
        completed: [{ id: 'stream-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult2]);

      // Should use correct index for second batch (index 1)
      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          path: ['posts', 1],
        }),
      );
    });

    it('should handle incremental items with label', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { posts: [] },
        hasNext: true,
        pending: [{ id: 'stream-1', path: ['posts'], label: 'PostStream' }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'stream-1',
            items: [{ id: '1', title: 'Post 1' }],
          },
        ],
        completed: [{ id: 'stream-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'PostStream',
        }),
      );
    });

    it('should throw error if items are added to non-array', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' } },
        hasNext: true,
        pending: [{ id: 'stream-1', path: ['user'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'stream-1',
            items: [{ id: '1' }],
          },
        ],
      };

      expect(() => transformer.onNext([subsequentResult])).toThrow('Expected a list');
    });

    it('should handle empty items array', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { posts: [] },
        hasNext: true,
        pending: [{ id: 'stream-1', path: ['posts'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'stream-1',
            items: [],
          },
        ],
        completed: [{ id: 'stream-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      // Should only call next for completion, not for items
      expect(nextCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('onNext - completed parts', () => {
    it('should handle completed object parts', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { name: 'Alice' },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledWith({
        data: { name: 'Alice' },
        path: ['user'],
        label: undefined,
        extensions: {
          is_final: true,
        },
      });
    });

    it('should handle completed array parts', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { posts: [] },
        hasNext: true,
        pending: [{ id: 'stream-1', path: ['posts'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        completed: [{ id: 'stream-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      // For arrays, should send null data
      expect(nextCallback).toHaveBeenCalledWith({
        data: null,
        extensions: {
          is_final: true,
        },
      });
    });

    it('should handle multiple completed parts', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' }, posts: [] },
        hasNext: true,
        pending: [
          { id: 'deferred-1', path: ['user'] },
          { id: 'stream-1', path: ['posts'] },
        ],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { name: 'Alice' },
          },
        ],
        completed: [{ id: 'deferred-1' }, { id: 'stream-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledTimes(2);
    });

    it('should preserve extensions in completed parts', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        completed: [{ id: 'deferred-1' }],
        extensions: {
          customField: 'customValue',
        },
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          extensions: {
            customField: 'customValue',
            is_final: true,
          },
        }),
      );
    });
  });

  describe('onNext - complex scenarios', () => {
    it('should handle multiple results in single call', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user'] }],
      };

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { name: 'Alice' },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      transformer.onNext([initialResult, subsequentResult]);

      expect(nextCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle nested paths', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { profile: { settings: {} } } },
        hasNext: true,
        pending: [{ id: 'deferred-1', path: ['user', 'profile', 'settings'] }],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { theme: 'dark' },
          },
        ],
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledWith({
        data: { theme: 'dark' },
        path: ['user', 'profile', 'settings'],
        label: undefined,
        extensions: {
          is_final: true,
        },
      });
    });

    it('should handle combination of data and items incremental updates', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' }, posts: [] },
        hasNext: true,
        pending: [
          { id: 'deferred-1', path: ['user'] },
          { id: 'stream-1', path: ['posts'] },
        ],
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'deferred-1',
            data: { name: 'Alice' },
          },
          {
            id: 'stream-1',
            items: [{ id: '1', title: 'Post 1' }],
          },
        ],
        completed: [{ id: 'deferred-1' }, { id: 'stream-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      // Should call: once for item, twice for completions (object and array)
      expect(nextCallback).toHaveBeenCalledTimes(3);
    });

    it('should ignore incremental updates for non-existent pending parts', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { user: { id: '1' } },
        hasNext: true,
      };

      transformer.onNext([initialResult]);

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        incremental: [
          {
            id: 'non-existent',
            data: { name: 'Alice' },
          },
        ],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      // Should not call next for non-existent pending part
      expect(nextCallback).not.toHaveBeenCalled();
    });

    it('should handle hasNext correctly across multiple results', () => {
      const initialResult: InitialIncrementalExecutionResult = {
        data: { test: 'data' },
        hasNext: true,
      };

      transformer.onNext([initialResult]);

      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          extensions: expect.objectContaining({
            is_final: false,
          }),
        }),
      );

      const subsequentResult: SubsequentIncrementalExecutionResult = {
        hasNext: false,
        pending: [{ id: 'deferred-1', path: ['test'] }],
        completed: [{ id: 'deferred-1' }],
      };

      nextCallback.mockClear();
      transformer.onNext([subsequentResult]);

      expect(nextCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          extensions: expect.objectContaining({
            is_final: true,
          }),
        }),
      );
    });
  });
});
