// src/query-cache.ts
import "relay-runtime";

// src/query.ts
import runtime from "relay-runtime";
function queryKeyFromIdAndVariables(id, variables) {
  return `${id}:${JSON.stringify(variables)}`;
}
function buildQueryKey(operation) {
  const key = operation.request.node.params.id ?? operation.request.node.params.cacheID;
  return queryKeyFromIdAndVariables(key, operation.request.variables);
}
function buildUniqueKey(queryKey) {
  return `${queryKey}:${Date.now()}`;
}
var RelayQuery = class {
  _uuid;
  _operation;
  queryKey;
  replaySubject;
  isComplete = false;
  hasData = false;
  constructor(operation) {
    this._operation = operation;
    this.queryKey = buildQueryKey(this._operation);
    this._uuid = buildUniqueKey(this.queryKey);
    this.replaySubject = new runtime.ReplaySubject();
  }
  getOperation() {
    return this._operation;
  }
};

// src/stream-utils.ts
import { Observable } from "relay-runtime";
function observableFromStream(stream) {
  return Observable.create((subscriber) => {
    stream.pipeTo(
      new WritableStream({
        write: (chunk) => {
          subscriber.next(chunk);
        },
        abort: (error) => {
          subscriber.error(error);
        },
        close: () => {
          subscriber.complete();
        }
      })
    );
    return () => {
      if (!stream.locked) {
        stream.cancel();
      }
    };
  });
}
function createBackpressuredCallback() {
  const queue = [];
  let push = queue.push.bind(queue);
  return {
    push: (value) => push(value),
    register: (callback) => {
      if (callback) {
        push = callback;
        while (queue.length) {
          callback(queue.shift());
        }
      } else {
        push = queue.push.bind(queue);
      }
    }
  };
}

// src/query-cache.ts
var createQueryCache = (isServer) => {
  return new QueryCache(isServer);
};
var QueryCache = class {
  _isServer;
  // server side subscription to requests
  watchQueryQueue = createBackpressuredCallback();
  // client side map of consumed queries
  simulatedStreamingQueries = /* @__PURE__ */ new Map();
  queries;
  constructor(isServer) {
    this._isServer = isServer ?? false;
    this.queries = /* @__PURE__ */ new Map();
  }
  build(operation) {
    const queryId = buildQueryKey(operation);
    let query = this.get(queryId);
    if (!query) {
      query = new RelayQuery(operation);
      this.add(query);
    }
    return query;
  }
  add(query) {
    if (!this.queries.has(query.queryKey)) {
      this.queries.set(query.queryKey, query);
    }
  }
  get(queryId) {
    return this.queries.get(queryId);
  }
  onQueryStarted(event) {
    const query = this.build(event.operation);
    this.simulatedStreamingQueries.set(event.id, {
      operation: query.getOperation(),
      replaySubject: query.replaySubject
    });
  }
  onQueryProgress(event) {
    const query = this.simulatedStreamingQueries.get(event.id);
    if (!query?.replaySubject) {
      throw new Error(`ReplaySubject for query with id ${event.id} not found`);
    }
    switch (event.type) {
      case "next":
        query.replaySubject.next(event);
        break;
      case "error":
        this.simulatedStreamingQueries.delete(event.id);
        query.replaySubject.error(new Error(JSON.stringify(event.error)));
        break;
      case "complete":
        this.simulatedStreamingQueries.delete(event.id);
        query.replaySubject.complete();
        break;
    }
  }
  /**
   * Can be called when the stream closed unexpectedly while there might still be unresolved
   * simulated server-side queries going on.
   * Those queries will be cancelled and then re-run in the browser.
   */
  rerunSimulatedQueries = (environment) => {
    for (const [id, query] of this.simulatedStreamingQueries) {
      this.simulatedStreamingQueries.delete(id);
      console.log(
        "Streaming connection closed before server query could be fully transported, rerunning:",
        query.operation.request
      );
      return environment.execute({ operation: query.operation });
    }
  };
  watchQuery(operation, replaySubject) {
    if (!this._isServer) {
      throw new Error("watchQuery is not supported on the client");
    }
    if (!this.watchQueryQueue) {
      throw new Error("watchQueryQueue is not initialized");
    }
    const id = buildQueryKey(operation);
    this.watchQueryQueue.push({
      event: {
        id,
        type: "started",
        operation
      },
      replaySubject
    });
  }
};

// src/network.ts
import runtime2 from "relay-runtime";

// src/fetch-multipart/patch-resolver.ts
var PatchResolver = class {
  onResponse;
  boundary;
  chunkBuffer;
  isPreamble;
  constructor(config) {
    this.boundary = config.boundary || "-";
    this.onResponse = config.onResponse;
    this.chunkBuffer = "";
    this.isPreamble = true;
  }
  handleChunk(data) {
    const prevParts = [];
    this.chunkBuffer += data;
    const { newBuffer, parts, isPreamble } = parseMultipartHttp(
      this.chunkBuffer,
      this.boundary,
      prevParts,
      this.isPreamble
    );
    this.isPreamble = isPreamble;
    this.chunkBuffer = newBuffer;
    if (parts.length) {
      this.onResponse(parts);
    }
  }
};
function getDelimiter(boundary) {
  return `\r
--${boundary}`;
}
function getClosingDelimiter(boundary) {
  return `\r
--${boundary}--`;
}
function splitWithRest(string, delim) {
  const index = string.indexOf(delim);
  if (index < 0) {
    return [void 0, string];
  }
  return [string.substring(0, index), string.substring(index + delim.length)];
}
function parseMultipartHttp(buffer, boundary, previousParts = [], isPreamble = true) {
  const delimiter = getDelimiter(boundary);
  let [region, next] = splitWithRest(buffer, delimiter);
  if (region !== void 0 && (region.length || region.trim() === "") && isPreamble) {
    if (next?.length) {
      return parseMultipartHttp(next, boundary, previousParts, false);
    } else {
      return { newBuffer: "", parts: previousParts, isPreamble: false };
    }
  }
  if (!region) {
    const closingDelimiter = getClosingDelimiter(boundary);
    [region, next] = splitWithRest(buffer, closingDelimiter);
    if (!region) {
      return {
        newBuffer: buffer,
        parts: previousParts,
        isPreamble
      };
    }
  }
  let [_headers, body] = splitWithRest(region, "\r\n\r\n");
  body = body.replace(`${delimiter}\r
`, "").replace(`${delimiter}--\r
`, "");
  const payload = JSON.parse(body);
  const parts = [...previousParts, payload];
  if (next?.length) {
    return parseMultipartHttp(next, boundary, parts, isPreamble);
  }
  return { parts, newBuffer: "", isPreamble };
}

// src/fetch-multipart/index.ts
function getBoundary(contentType = "") {
  const contentTypeParts = contentType.split(";");
  for (const contentTypePart of contentTypeParts) {
    const [key, value] = (contentTypePart || "").trim().split("=");
    if (key === "boundary" && !!value) {
      if (value[0] === '"' && value[value.length - 1] === '"') {
        return value.substring(1, value.length - 1);
      }
      return value;
    }
  }
  return "-";
}
async function multipartFetch(url, options) {
  console.log(url);
  const { onNext, onComplete, onError, ...fetchOptions } = options;
  const response = await fetch(url, fetchOptions);
  const contentType = !!response.headers && response.headers.get("Content-Type") || "";
  if (response.status < 300 && contentType.indexOf("multipart/mixed") >= 0) {
    const boundary = getBoundary(contentType);
    if (!response.body) {
      throw new Error("Malformed response");
    }
    const textDecoder = new TextDecoder();
    const patchResolver = new PatchResolver({
      onResponse: (r) => onNext(r, { responseHeaders: response.headers }),
      boundary
    });
    return observableFromStream(response.body).subscribe({
      next: (value) => {
        const decoded = textDecoder.decode(value);
        patchResolver.handleChunk(decoded);
      },
      error: (error) => onError(error instanceof Error ? error : new Error(String(error))),
      complete: () => onComplete()
    });
  } else {
    return response.json().then(
      (json) => {
        onNext([json], { responseHeaders: response.headers });
        onComplete();
      },
      (err) => {
        const parseError = err;
        parseError.response = response;
        parseError.statusCode = response.status;
        onError(parseError);
      }
    );
  }
}

// src/transformer.ts
function isInitialIncrementalExecutionResult(result) {
  return "data" in result || "errors" in result;
}
var RelayIncrementalDeliveryTransformer = class {
  constructor(next) {
    this.next = next;
    this.pendingParts = /* @__PURE__ */ new Map();
    this.dataTree = {};
  }
  pendingParts;
  dataTree;
  onNext(parts) {
    for (const result of parts) {
      if (isInitialIncrementalExecutionResult(result)) {
        this.dataTree = result.data;
        this.next({
          data: result.data,
          errors: result.errors,
          extensions: {
            ...result.extensions,
            is_final: !result.hasNext
          }
        });
      }
      for (const pending of result.pending || []) {
        this.pendingParts.set(pending.id, {
          id: pending.id,
          path: pending.path,
          label: pending.label,
          data: {}
        });
      }
      if (!isInitialIncrementalExecutionResult(result)) {
        for (const incremental of result.incremental || []) {
          const pendingPart = this.pendingParts.get(incremental.id);
          if (pendingPart) {
            if ("data" in incremental) {
              let dataTreeObject = this.dataTree;
              let object = pendingPart.data;
              for (const pathSegment of pendingPart.path) {
                dataTreeObject = dataTreeObject[pathSegment];
              }
              if (incremental.subPath) {
                for (const pathSegment of incremental.subPath) {
                  dataTreeObject = dataTreeObject[pathSegment];
                  object = object[pathSegment];
                }
              }
              Object.assign(object, incremental.data);
              Object.assign(dataTreeObject, incremental.data);
            } else if ("items" in incremental) {
              let dataTreeList = this.dataTree;
              for (const pathSegment of pendingPart.path) {
                dataTreeList = dataTreeList[pathSegment];
              }
              if (!Array.isArray(dataTreeList)) {
                throw new Error("Expected a list");
              }
              let currentIndex = dataTreeList.length;
              for (const item of incremental.items || []) {
                dataTreeList.push(item);
                this.next({
                  data: item,
                  path: [...pendingPart.path, currentIndex],
                  label: pendingPart.label,
                  extensions: {
                    ...result.extensions,
                    is_final: !result.hasNext
                  }
                });
                currentIndex++;
              }
            }
          }
        }
        for (const completed of result.completed || []) {
          const pendingPart = this.pendingParts.get(completed.id);
          let dataTreeObject = this.dataTree;
          for (const pathSegment of pendingPart.path) {
            dataTreeObject = dataTreeObject[pathSegment];
          }
          if (pendingPart) {
            if (Array.isArray(dataTreeObject)) {
              this.next({
                data: null,
                extensions: {
                  ...result.extensions,
                  is_final: !result.hasNext
                }
              });
            } else {
              this.next({
                data: pendingPart.data,
                path: pendingPart.path,
                label: pendingPart.label,
                extensions: {
                  ...result.extensions,
                  is_final: !result.hasNext
                }
              });
            }
          }
        }
      }
    }
  }
};

// src/network.ts
var { Network, Observable: Observable2 } = runtime2;
var RelayReplayNetwork = class {
  execute;
  queryCache;
  _url;
  _fetchOpts;
  _fetchFn;
  _isServer;
  constructor(config) {
    const { url, fetchOpts, queryCache, isServer } = config;
    this._url = url;
    this._fetchOpts = fetchOpts;
    this._isServer = isServer;
    this.queryCache = queryCache;
    this._fetchFn = (request, variables, _cacheConfig, _uploadables) => {
      const requestInit = {
        method: this._fetchOpts.method ?? "POST",
        headers: {
          "content-type": "application/mixe",
          ...this._fetchOpts.headers
        },
        body: JSON.stringify({
          id: request.id,
          query: request.text,
          variables
        }),
        credentials: this._fetchOpts.credentials
        // signal: this._isServer ? undefined : signal,
      };
      const queryKey = queryKeyFromIdAndVariables(request.id ?? request.cacheID, variables);
      if (this._isServer) {
        const query2 = this.queryCache.get(queryKey);
        if (!query2) {
          throw new Error(`Query not found in cache`);
        }
        const replaySubject = query2.replaySubject;
        this.queryCache.watchQuery(query2.getOperation(), replaySubject);
        const transformer = new RelayIncrementalDeliveryTransformer((...args) => {
          for (const arg of args) {
            replaySubject.next({ type: "next", id: query2.queryKey, data: arg });
          }
        });
        multipartFetch(
          this._url,
          {
            ...requestInit,
            onComplete: () => {
              replaySubject.next({ type: "complete", id: query2.queryKey });
              replaySubject.complete();
            },
            onError: (err) => {
              const error = err instanceof Error ? err.message : String(err);
              replaySubject.next({ type: "error", id: query2.queryKey, error });
              replaySubject.error(err);
            },
            onNext: (value) => {
              transformer.onNext(value);
            }
          }
        );
        return Observable2.create((sink) => {
          replaySubject.subscribe({
            next: (value) => {
              switch (value.type) {
                case "next":
                  sink.next(value.data);
                  break;
                case "error":
                  sink.error(new Error(JSON.stringify(value.error)));
                  break;
                case "complete":
                  sink.complete();
                  break;
              }
            },
            error: (error) => {
              sink.error(error);
            },
            complete: () => {
              sink.complete();
            }
          });
        });
      }
      const query = this.queryCache.get(queryKey);
      if (query) {
        return Observable2.create((sink) => {
          return query.replaySubject.subscribe({
            next: (data) => {
              switch (data.type) {
                case "next":
                  sink.next(data.data);
                  break;
              }
            },
            error: (err) => {
              const error = err instanceof Error ? err : new Error(`Unknown error`);
              sink.error(error);
            },
            complete: () => {
              sink.complete();
            }
          });
        });
      } else {
        return Observable2.create((sink) => {
          const transformer = new RelayIncrementalDeliveryTransformer((...args) => {
            for (const arg of args) {
              sink.next(arg);
            }
          });
          multipartFetch(
            this._url,
            {
              ...requestInit,
              onComplete: () => {
                sink.complete();
              },
              onError: (error) => {
                sink.error(error);
              },
              onNext: (value) => {
                transformer.onNext(value);
              }
            }
          );
        });
      }
    };
    const network = Network.create(this._fetchFn);
    this.execute = network.execute;
  }
};

// src/router-with-relay.tsx
import { RecordSource } from "relay-runtime";

// src/preloaded-query.ts
import runtime3 from "relay-runtime";
import relay from "react-relay";
var { getRequest, createOperationDescriptor } = runtime3;
var createPreloader = (environment, queryCache) => {
  return (request, variables, options, environmentProviderOptions) => {
    const req = getRequest(request);
    const operation = createOperationDescriptor(req, variables, options?.networkCacheConfig);
    if (environment.isServer()) {
      queryCache.build(operation);
    }
    const preloadedQuery = relay.loadQuery(
      environment,
      request,
      variables,
      options,
      environmentProviderOptions
    );
    if (environment.isServer()) {
      return {
        ...preloadedQuery,
        $__relay_queryRef: {
          operation
        }
      };
    } else {
      return preloadedQuery;
    }
  };
};

// src/transport.ts
import { createSerializationAdapter } from "@tanstack/react-router";
import { useEffect, useId, useRef } from "react";
var transportSerializationAdapter = createSerializationAdapter({
  key: "relay-ssr-transport",
  test: (value) => value instanceof ServerTransport,
  toSerializable(data) {
    return data.stream;
  },
  fromSerializable(data) {
    return new ClientTransport(data);
  }
});
var ServerTransport = class {
  stream;
  controller;
  ongoingStreams = /* @__PURE__ */ new Set();
  closed = false;
  shouldClose = false;
  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller;
      }
    });
  }
  closeOnceFinished() {
    this.shouldClose = true;
    this.closeIfFinished();
  }
  closeIfFinished() {
    if (this.shouldClose && this.ongoingStreams.size === 0 && !this.closed) {
      this.controller.close();
      this.closed = true;
    }
  }
  dispatchRequestStarted = ({
    event,
    replaySubject
  }) => {
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
      complete: finalize
    });
  };
  streamValue(id, value) {
    this.controller.enqueue({ type: "value", id, value });
  }
  useStaticValueRef = (value) => {
    const id = useId();
    this.streamValue(id, value);
    return useRef(value);
  };
};
var ClientTransport = class {
  bufferedEvents = [];
  receivedValues = {};
  constructor(stream) {
    this.consume(stream);
  }
  async consume(stream) {
    console.log("ClientTransport consuming stream");
    observableFromStream(stream).subscribe({
      next: (event) => {
        if (event.type === "value") {
          this.receivedValues[event.id] = event.value;
        } else {
          console.log("pushing event", event);
          this.bufferedEvents.push(event);
        }
      },
      complete: () => {
      },
      error: (error) => {
        console.error("Error in ClientTransport:", error);
      }
    });
  }
  // this will be set from the `WrapApolloProvider` data transport
  set onQueryEvent(cb) {
    let event;
    while (event = this.bufferedEvents.shift()) {
      cb(event);
    }
    this.bufferedEvents.push = (...events) => {
      for (const event2 of events) {
        cb(event2);
      }
      return 0;
    };
  }
  // this will be set from the `WrapApolloProvider` data transport
  rerunSimulatedQueries;
  getStreamedValue(id) {
    return this.receivedValues[id];
  }
  deleteStreamedValue(id) {
    delete this.receivedValues[id];
  }
  useStaticValueRef = (value) => {
    const id = useId();
    const streamedValue = this.getStreamedValue(id);
    const dataValue = streamedValue !== void 0 ? streamedValue : value;
    useEffect(() => {
      this.deleteStreamedValue(id);
    }, [id]);
    return useRef(dataValue);
  };
};

// src/hydration.ts
import "relay-runtime";
import { createSerializationAdapter as createSerializationAdapter2 } from "@tanstack/react-router";
var dehydratedOmittedKeys = /* @__PURE__ */ new Set([
  "dispose",
  "environment",
  "isDisposed",
  "networkError",
  "releaseQuery",
  "source"
]);
var isStreamedPreloadedQuery = (value) => {
  return value !== null && typeof value === "object" && Object.keys(value).some((key) => dehydratedOmittedKeys.has(key));
};
function dehydratePreloadedQuery(preloadedQuery) {
  return {
    kind: preloadedQuery.kind,
    environmentProviderOptions: preloadedQuery.environmentProviderOptions,
    fetchKey: preloadedQuery.fetchKey,
    fetchPolicy: preloadedQuery.fetchPolicy,
    networkCacheConfig: preloadedQuery.networkCacheConfig,
    id: preloadedQuery.id,
    name: preloadedQuery.name,
    variables: preloadedQuery.variables,
    $__relay_queryRef: {
      operation: preloadedQuery.$__relay_queryRef.operation
    }
  };
}
function hydratePreloadedQuery(environment, dehydratedQuery, queryCache) {
  let isDisposed = false;
  let isReleased = false;
  console.log("hydrating query");
  const _query = queryCache.build(dehydratedQuery.$__relay_queryRef.operation);
  return {
    kind: dehydratedQuery.kind,
    dispose() {
      if (isDisposed) {
        return;
      }
      isDisposed = true;
    },
    get isDisposed() {
      return isDisposed || isReleased;
    },
    environment,
    environmentProviderOptions: dehydratedQuery.environmentProviderOptions,
    fetchKey: dehydratedQuery.fetchKey,
    fetchPolicy: dehydratedQuery.fetchPolicy,
    networkCacheConfig: dehydratedQuery.networkCacheConfig,
    id: dehydratedQuery.id,
    name: dehydratedQuery.name,
    variables: dehydratedQuery.variables,
    $__relay_queryRef: dehydratedQuery.$__relay_queryRef
  };
}
function createPreloadedQuerySerializer(environment, queryCache) {
  return createSerializationAdapter2({
    key: "relay-ssr-preloaded-query",
    test: isStreamedPreloadedQuery,
    // @ts-expect-error tanstack-serialization
    toSerializable: (value) => {
      return dehydratePreloadedQuery(value);
    },
    fromSerializable: (value) => {
      return hydratePreloadedQuery(environment, value, queryCache);
    }
  });
}

// src/router-with-relay.tsx
import { Fragment } from "react/jsx-runtime";

// src/wrap-relay-provider.tsx
import { createContext, useMemo } from "react";
import "relay-runtime";
import relay2 from "react-relay";
import { jsx } from "react/jsx-runtime";
var { RelayEnvironmentProvider } = relay2;
var DataTransportContext = createContext(null);
function WrapRelayProvider(TransportProvider) {
  const WrappedRelayProvider2 = (props) => {
    const { getEnvironment, children, ...extraProps } = props;
    const { environment, queryCache } = useMemo(() => getEnvironment(), []);
    return /* @__PURE__ */ jsx(RelayEnvironmentProvider, { environment, children: /* @__PURE__ */ jsx(
      TransportProvider,
      {
        onQueryEvent: (event) => event.type === "started" ? queryCache.onQueryStarted(event) : queryCache.onQueryProgress(event),
        rerunSimulatedQueries: () => queryCache.rerunSimulatedQueries(environment),
        registerDispatchRequestStarted: queryCache.watchQueryQueue?.register,
        ...extraProps,
        children
      }
    ) });
  };
  return WrappedRelayProvider2;
}

// src/relay-provider.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var WrappedRelayProvider = WrapRelayProvider((props) => {
  const transport = props.context.transport;
  if ("dispatchRequestStarted" in transport) {
    if (!props.registerDispatchRequestStarted) {
      throw new Error("registerDispatchRequestStarted is required in server");
    }
    props.registerDispatchRequestStarted(transport.dispatchRequestStarted);
  } else {
    if (!props.onQueryEvent || !props.rerunSimulatedQueries) {
      throw new Error("onQueryEvent and rerunSimulatedQueries are required in client");
    }
    transport.onQueryEvent = props.onQueryEvent;
    transport.rerunSimulatedQueries = props.rerunSimulatedQueries;
  }
  return /* @__PURE__ */ jsx2(DataTransportContext.Provider, { value: transport, children: props.children });
});
function RelayProvider(props) {
  return /* @__PURE__ */ jsx2(
    WrappedRelayProvider,
    {
      getEnvironment: () => ({
        environment: props.environment,
        queryCache: props.queryCache
      }),
      context: props.context,
      children: props.children
    }
  );
}

// src/router-with-relay.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function routerWithRelay(router, environment, queryCache) {
  const ogOptions = router.options;
  router.options.context ??= {};
  router.options.context.environment = environment;
  router.options.context.preloadQuery = createPreloader(environment, queryCache);
  const ogHydrate = router.options.hydrate;
  const ogDehydrate = router.options.dehydrate;
  const providerContext = {};
  if (router.isServer) {
    const relayTransport = new ServerTransport();
    providerContext.transport = relayTransport;
    router.options.dehydrate = async () => {
      router.serverSsr.onRenderFinished(() => relayTransport.closeOnceFinished());
      return {
        ...await ogDehydrate?.(),
        recordSource: environment.getStore().getSource().toJSON(),
        relayTransport
      };
    };
  } else {
    router.options.hydrate = (dehydratedState) => {
      providerContext.transport = dehydratedState.relayTransport;
      if (dehydratedState.recordSource) {
        environment.getStore().publish(new RecordSource(dehydratedState.recordSource));
      }
      return ogHydrate?.(dehydratedState);
    };
  }
  router.options.serializationAdapters = [
    ...router.options.serializationAdapters ?? [],
    createPreloadedQuerySerializer(environment, queryCache),
    transportSerializationAdapter
  ];
  const PreviousInnerWrap = ogOptions.InnerWrap ?? Fragment;
  router.options.InnerWrap = ({ children }) => {
    return /* @__PURE__ */ jsx3(RelayProvider, { environment, queryCache, context: providerContext, children: /* @__PURE__ */ jsx3(PreviousInnerWrap, { children }) });
  };
  return router;
}
export {
  QueryCache,
  RelayReplayNetwork,
  createQueryCache,
  routerWithRelay
};
