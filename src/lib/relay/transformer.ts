// https://github.com/robrichard/defer-relay-example/blob/main/client/fetchGraphQL.ts

import type {
	InitialIncrementalExecutionResult,
	SubsequentIncrementalExecutionResult,
} from "graphql";

function isInitialIncrementalExecutionResult(
	result: InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult,
): result is InitialIncrementalExecutionResult {
	if ("data" in result || "errors" in result) {
		return !("path" in result) || !("label" in result);
	}
	return false;
}

export class RelayIncrementalDeliveryTransformer {
	private pendingParts: Map<string, any>;
	private dataTree: any;
	constructor(private readonly next: (arg: any) => void) {
		this.next = next;
		this.pendingParts = new Map<string, any>();
		this.dataTree = {};
	}
	onNext(parts: Array<InitialIncrementalExecutionResult | SubsequentIncrementalExecutionResult>) {
		for (const result of parts) {
			console.log("transformer", result);
			if (isInitialIncrementalExecutionResult(result)) {
				this.dataTree = result.data;
				this.next({
					data: result.data,
					errors: result.errors,
					extensions: {
						...result.extensions,
						is_final: !result.hasNext,
					},
				});
			}
			for (const pending of result.pending || []) {
				this.pendingParts.set(pending.id, {
					id: pending.id,
					path: pending.path,
					label: pending.label,
					data: {},
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
							for (const item of (incremental.items as Array<any>) || []) {
								dataTreeList.push(item);
								this.next({
									data: item,
									path: [...pendingPart.path, currentIndex],
									label: pendingPart.label,
									extensions: {
										...result.extensions,
										is_final: !result.hasNext,
									},
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
							// don't send any data for completed stream lists
							this.next({
								data: null,
								extensions: {
									...result.extensions,
									is_final: !result.hasNext,
								},
							});
						} else {
							this.next({
								data: pendingPart.data,
								path: pendingPart.path,
								label: pendingPart.label,
								extensions: {
									...result.extensions,
									is_final: !result.hasNext,
								},
							});
						}
					}
				}
			}
		}
	}
}
