import {
  Observable,
  type CacheConfig,
  type GraphQLResponse,
  type RequestParameters,
  type UploadableMap,
  type Variables,
} from 'relay-runtime';
import { ReplaySubject } from 'relay-runtime';
import type { Sink, Subscription } from 'relay-runtime/lib/network/RelayObservable.js';

interface RelayQueryConfig {
  request: RequestParameters;
  variables: Variables;
  cacheConfig: CacheConfig;
  uploadables?: UploadableMap | null;
}

export const buildQueryId = (request: RequestParameters, variables: Variables = {}): string => {
  const cacheKey = request.id ?? request.cacheID;
  return `${cacheKey}:${JSON.stringify(variables)}`;
};

export class RelayQuery {
  queryId: string;
  request: RequestParameters;
  variables: Variables;
  cacheConfig: CacheConfig;
  uploadables?: UploadableMap | null;
  replaySubject: ReplaySubject<GraphQLResponse>;
  hasData?: boolean = false;
  isServerStreaming?: boolean = false;
  isComplete?: boolean = false;
  stream?: ReadableStream<GraphQLResponse[]>;

  constructor(config: RelayQueryConfig) {
    const { request, variables, cacheConfig, uploadables } = config;
    this.request = request;
    this.variables = variables;
    this.queryId = buildQueryId(request, variables);
    this.cacheConfig = cacheConfig;
    this.uploadables = uploadables;
    this.replaySubject = new ReplaySubject<GraphQLResponse>();
  }

  isQuery(): boolean {
    return this.request.operationKind === 'query';
  }

  startStream() {
    this.isServerStreaming = true;
  }

  next(val: GraphQLResponse) {
    this.replaySubject.next(val);
    this.hasData = true;
  }

  error(err: Error) {
    this.replaySubject.error(err);
    this.isComplete = true;
  }

  complete() {
    this.replaySubject.complete();
    this.isComplete = true;
  }

  subscribe(observer: Sink<GraphQLResponse>): Subscription {
    return this.replaySubject.subscribe(observer);
  }

  replay(): Observable<GraphQLResponse> {}

  setStream(stream: ReadableStream<GraphQLResponse[]>) {
    this.stream = stream;
  }
}
