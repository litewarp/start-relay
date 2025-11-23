import { PatchResolver } from './patch-resolver.ts';

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

export class HttpError extends Error {
  statusCode: number;
  response: Response;
  bodyText?: string;

  constructor(opts: {
    message: string;
    response: Response;
    statusCode: number;
    bodyText?: string;
  }) {
    const { message, response, statusCode, bodyText } = opts;
    super(message);
    this.statusCode = statusCode;
    this.response = response;
    this.bodyText = bodyText;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export function multipartFetch<T>(
  url: string,
  options: Pick<RequestInit, 'method' | 'headers' | 'credentials' | 'body' | 'signal'> & {
    onNext: (patch: T[], options: { responseHeaders: Headers }) => void;
    onComplete: () => void;
    onError: (error: HttpError) => void;
  },
) {
  const { onNext, onComplete, onError, ...fetchOptions } = options;
  return fetch(url, fetchOptions)
    .then((response) => {
      const contentType = (!!response.headers && response.headers.get('Content-Type')) || '';
      // @defer uses multipart responses to stream patches over HTTP
      if (response.status < 300 && contentType.indexOf('multipart/mixed') >= 0) {
        const boundary = getBoundary(contentType);

        if (!response.body) {
          throw new Error('Malformed response');
        }

        // For the majority of browsers with support for ReadableStream and TextDecoder
        const reader = response.body.getReader();
        const textDecoder = new TextDecoder();
        const patchResolver = new PatchResolver<T>({
          onResponse: (r) => onNext(r, { responseHeaders: response.headers }),
          boundary,
        });
        return reader.read().then(function sendNext({ value, done }) {
          if (!done) {
            let plaintext: string = '';
            try {
              plaintext = textDecoder.decode(value);
              // Read the header to get the Content-Length
              patchResolver.handleChunk(plaintext);
            } catch (err) {
              const message = err instanceof Error ? err.message : `${err}`;
              const error = new HttpError({
                message,
                response,
                statusCode: response.status,
                bodyText: plaintext,
              });
              onError(error);
            }
            reader.read().then(sendNext);
          } else {
            onComplete();
          }
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
    })
    .catch(onError);
}
