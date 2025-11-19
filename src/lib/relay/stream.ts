export interface PushableStream<T> {
	stream: ReadableStream;
	enqueue: (chunk: T) => void;
	close: () => void;
	isClosed: () => boolean;
	error: (err: Error) => void;
}

export function createPushableStream<T>(): PushableStream<T> {
	let controllerRef: ReadableStreamDefaultController<T>;
	const stream = new ReadableStream<T>({
		start(controller) {
			controllerRef = controller;
		},
	});
	let _isClosed = false;

	return {
		stream,
		enqueue: (chunk) => {
			controllerRef.enqueue(chunk);
		},
		close: () => {
			controllerRef.close();
			_isClosed = true;
		},
		isClosed: () => _isClosed,
		error: (err: unknown) => controllerRef.error(err),
	};
}
