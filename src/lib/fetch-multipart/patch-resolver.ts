export class PatchResolver<T> {
	onResponse: (results: T[]) => void;
	boundary: string;
	chunkBuffer: string;
	isPreamble: boolean;

	constructor(config: { onResponse: (results: T[]) => void; boundary?: string }) {
		this.boundary = config.boundary || "-";
		this.onResponse = config.onResponse;
		this.chunkBuffer = "";
		this.isPreamble = true;
	}

	handleChunk(data: string) {
		const prevParts: T[] = [];
		this.chunkBuffer += data;
		const { newBuffer, parts, isPreamble } = parseMultipartHttp(
			this.chunkBuffer,
			this.boundary,
			prevParts,
			this.isPreamble,
		);
		this.isPreamble = isPreamble;
		this.chunkBuffer = newBuffer;
		if (parts.length) {
			this.onResponse(parts);
		}
	}
}

function getDelimiter(boundary: string) {
	return `\r\n--${boundary}`;
}

function getClosingDelimiter(boundary: string) {
	return `\r\n--${boundary}--`;
}

function splitWithRest(string: string, delim: string): [string | undefined, string] {
	const index = string.indexOf(delim);
	if (index < 0) {
		return [undefined, string];
	}
	return [string.substring(0, index), string.substring(index + delim.length)];
}

export function parseMultipartHttp<T>(
	buffer: string,
	boundary: string,
	previousParts: T[] = [],
	isPreamble = true,
): { newBuffer: string; parts: T[]; isPreamble: boolean } {
	const delimiter = getDelimiter(boundary);

	let [region, next] = splitWithRest(buffer, delimiter);

	if (region !== undefined && (region.length || region.trim() === "") && isPreamble) {
		if (next?.length) {
			// if we have stuff after the boundary; and we're in preamble—we recurse
			return parseMultipartHttp(next, boundary, previousParts, false);
		} else {
			return { newBuffer: "", parts: previousParts, isPreamble: false };
		}
	}

	if (!region) {
		const closingDelimiter = getClosingDelimiter(boundary);
		[region, next] = splitWithRest(buffer, closingDelimiter);

		if (!region) {
			// we need more things
			return {
				newBuffer: buffer,
				parts: previousParts,
				isPreamble,
			};
		}
	}

	let [_headers, body] = splitWithRest(region, "\r\n\r\n");

	// remove trailing boundary things
	body = body.replace(`${delimiter}\r\n`, "").replace(`${delimiter}--\r\n`, "");

	let payload = JSON.parse(body);
	if (payload.incremental) payload = payload.incremental[0];
	const parts = [...previousParts, payload];

	if (next?.length) {
		// we have more parts
		return parseMultipartHttp(next, boundary, parts, isPreamble);
	}

	return { parts, newBuffer: "", isPreamble };
}
