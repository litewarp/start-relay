// https://github.com/TanStack/query/blob/main/packages/query-core/src/subscribable.ts

type GenericFunction = (...args: never[]) => unknown;

export class Subscribable<TListener extends GenericFunction> {
	protected listeners = new Set<TListener>();

	constructor() {
		this.subscribe = this.subscribe.bind(this);
	}

	subscribe(listener: TListener): () => void {
		this.listeners.add(listener);

		this.onSubscribe();

		return () => {
			this.listeners.delete(listener);
			this.onUnsubscribe();
		};
	}

	hasListeners(): boolean {
		return this.listeners.size > 0;
	}

	protected onSubscribe(): void {
		// Do nothing
	}

	protected onUnsubscribe(): void {
		// Do nothing
	}
}
