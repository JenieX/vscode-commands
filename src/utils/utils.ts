
/**
 * Emulate delay with async setTimeout().
 */
const sleep = async (ms: number): Promise<void> => new Promise(resolve => {
	setTimeout(resolve, ms);
});
/**
 * Return `true` when item is an object (NOT Array, NOT null)
 */
function isSimpleObject(item: unknown): item is Record<string, unknown> {
	if (Array.isArray(item) || item === null) {
		return false;
	} else if (typeof item === 'object') {
		return true;
	}
	return false;
}
/**
 * Unique id... Ehh, good enough.
 */
function uniqueId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
/**
 * Copy object or array (hopefully without circular references).
 */
function deepCopy<T>(object: T): T {
	return JSON.parse(JSON.stringify(object)) as T;
}

/**
 * True when not `undefined` and not `null`.
 */
function nonNullable<T>(value: T): value is NonNullable<T> {
	return value !== undefined &&
		value !== null;
}
/**
 * Keep only unique items (for primitives).
 */
function unique<T>(arr: T[]): T[] {
	return Array.from(new Set(arr));
}

/**
 * Replace all matches in a string (async, sequential).
 */
async function replaceAsync(str: string, regex: RegExp, asyncFn: (match: string, ...args: string[])=> Promise<string>): Promise<string> {
	const data: string[] = [];
	const matches = str.match(regex);

	for await (const match of matches ?? []) {
		data.push(await asyncFn(match));
	}

	return str.replace(regex, () => data.shift()!);
}

function isWindowsOs(): boolean {
	return process.platform === 'win32';
}

export const utils = {
	sleep,
	isSimpleObject,
	uniqueId,
	deepCopy,
	nonNullable,
	unique,
	replaceAsync,
	isWindowsOs,
};
