export interface PushableStream {
	stream: ReadableStream;
	enqueue: (chunk: unknown) => void;
	close: () => void;
	isClosed: () => boolean;
	error: (err: unknown) => void;
}

export function createPushableStream(): PushableStream {
	let controllerRef: ReadableStreamDefaultController;
	const stream = new ReadableStream({
		start(controller) {
			controllerRef = controller;
		},
	});
	let _isClosed = false;

	return {
		stream,
		enqueue: (chunk) => controllerRef.enqueue(chunk),
		close: () => {
			controllerRef.close();
			_isClosed = true;
		},
		isClosed: () => _isClosed,
		error: (err: unknown) => controllerRef.error(err),
	};
}
