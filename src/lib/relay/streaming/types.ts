import type { ExecutionResult, ExperimentalIncrementalExecutionResults } from "graphql";
import type { CacheConfig } from "relay-runtime";

export interface RelayCacheConfig<T extends object> extends Omit<CacheConfig, "metadata"> {
	metadata?: T;
}

interface RelayCacheMetadata {
	signal: AbortController;
}

export type EnhancedCacheConfig = RelayCacheConfig<RelayCacheMetadata>;

export type NotifyEventType = "added" | "data" | "error" | "complete";

export interface NotifyEvent {
	type: NotifyEventType;
}

export type RelayGraphQLResponse<
	T extends ExecutionResult | ExperimentalIncrementalExecutionResults =
		| ExecutionResult
		| ExperimentalIncrementalExecutionResults,
> = T extends ExecutionResult ? ExecutionResult : ExperimentalIncrementalExecutionResults;

// biome-ignore lint/complexity/noBannedTypes: hack
export type Register = {};

export type DefaultError = Register extends {
	defaultError: infer TError;
}
	? TError
	: Error;
