import { Observable } from 'relay-runtime';
import type { RelayObservable } from 'relay-runtime/lib/network/RelayObservable.js';

export function observableFromStream<T>(stream: ReadableStream<T>): RelayObservable<T> {
  return Observable.create<T>((subscriber) => {
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
        },
      }),
    );
    return () => {
      if (!stream.locked) {
        stream.cancel();
      }
    };
  });
}

export function observableFromReadableStream<T>(stream: ReadableStream<T>): RelayObservable<T> {
  return Observable.create<T>((subscriber) => {
    const reader = stream.getReader();
    function consume(event: ReadableStreamReadResult<T>) {
      const value = event.value;
      if (value) {
        subscriber.next(value);
      }
      if (event.done) {
        subscriber.complete();
      } else {
        reader.read().then(consume);
      }
    }
    reader.read().then(consume);
  });
}
