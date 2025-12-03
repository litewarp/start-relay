import type { QueryProgressEvent } from './transport.ts';

import runtime from 'relay-runtime';
import type { OperationDescriptor, ReplaySubject } from 'relay-runtime';

export function queryKeyFromIdAndVariables(id: string, variables: Record<string, any>): string {
  return `${id}:${JSON.stringify(variables)}`;
}

export function buildQueryKey(operation: OperationDescriptor): string {
  const key = operation.request.node.params.id ?? operation.request.node.params.cacheID;
  return queryKeyFromIdAndVariables(key, operation.request.variables);
}

export function buildUniqueKey(queryKey: string): string {
  return `${queryKey}:${Date.now()}`;
}

export function parseUniqueKey(uniqueKey: string): [string, number] {
  const [queryKey, timestamp] = uniqueKey.split(':');
  return [queryKey, parseInt(timestamp)];
}

export class RelayQuery {
  private _uuid: string;
  private _operation: OperationDescriptor;
  queryKey: string;
  replaySubject: ReplaySubject<QueryProgressEvent>;

  isComplete = false;
  hasData = false;

  constructor(operation: OperationDescriptor) {
    this._operation = operation;
    this.queryKey = buildQueryKey(this._operation);
    this._uuid = buildUniqueKey(this.queryKey);
    this.replaySubject = new runtime.ReplaySubject<QueryProgressEvent>();
  }

  getOperation(): OperationDescriptor {
    return this._operation;
  }
}
