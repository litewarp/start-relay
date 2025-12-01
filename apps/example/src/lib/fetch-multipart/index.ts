import { PatchResolver } from './patch-resolver.ts';
import { observableFromStream } from '../relay-streaming/stream-utils.ts';

function getBoundary(contentType = '') {
  const contentTypeParts = contentType.split(';');
  for (const contentTypePart of contentTypeParts) {
    const [key, value] = (contentTypePart || '').trim().split('=');
    if (key === 'boundary' && !!value) {
      if (value[0] === '"' && value[value.length - 1] === '"') {
        return value.substring(1, value.length - 1);
      }
      return value;
    }
  }
  return '-';
}

export async function multipartFetch<T>(
  url: string,
  options: Pick<RequestInit, 'method' | 'headers' | 'credentials' | 'body' | 'signal'> & {
    onNext: (patch: T[], options: { responseHeaders: Headers }) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
  },
) {
  console.log(url);
  const { onNext, onComplete, onError, ...fetchOptions } = options;
  const response = await fetch(url, fetchOptions);
  const contentType = (!!response.headers && response.headers.get('Content-Type')) || '';
  // @defer uses multipart responses to stream patches over HTTP
  if (response.status < 300 && contentType.indexOf('multipart/mixed') >= 0) {
    const boundary = getBoundary(contentType);

    if (!response.body) {
      throw new Error('Malformed response');
    }

    // For the majority of browsers with support for ReadableStream and TextDecoder
    const textDecoder = new TextDecoder();
    const patchResolver = new PatchResolver<T>({
      onResponse: (r) => onNext(r, { responseHeaders: response.headers }),
      boundary,
    });

    return observableFromStream(response.body).subscribe({
      next: (value) => {
        const decoded = textDecoder.decode(value);
        patchResolver.handleChunk(decoded);
      },
      error: (error: Error | unknown) =>
        onError(error instanceof Error ? error : new Error(String(error))),
      complete: () => onComplete(),
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
      },
    );
  }
}
