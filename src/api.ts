/**
 * @fileoverview
 * Public plugin API for registering custom title-fetching handlers.
 *
 * Other plugins or user scripts (e.g. CustomJS) can register a handler that
 * produces titles for URLs they recognize (Todoist tasks, Twist threads, and
 * so on). At paste time the dispatcher walks the user-configured order and
 * calls the first handler whose `match(url)` returns true.
 */

/** A single registered title handler */
export interface TitleHandler {
	/** Unique, stable id. Lowercase alphanumeric and dashes is conventional. */
	id: string;
	/** Optional human-readable label for the settings UI */
	label?: string;
	/** Returns true if this handler can produce a title for the given URL */
	match: (url: string) => boolean;
	/** Produces the title. Throw or return empty string to fall back to the next handler. */
	fetch: (url: string) => Promise<string>;
	/**
	 * Initial priority for brand-new ids appended to the settings order list.
	 * Higher priorities appear earlier. Settings order overrides this once
	 * the id is known to the user. Defaults to 0.
	 */
	priority?: number;
}

/** Return value of {@link AutoLinkTitleApi.listHandlers} */
export interface TitleHandlerInfo {
	id: string;
	label?: string;
	/** True if a live handler is currently registered under this id */
	registered: boolean;
	/** True if the user has not disabled this handler in settings */
	enabled: boolean;
}

/** Public API exposed on the plugin instance as `plugin.api` */
export interface AutoLinkTitleApi {
	/**
	 * Register a title handler. Returns an unregister function.
	 *
	 * Registering the same id a second time replaces the previous handler.
	 */
	registerTitleHandler(handler: TitleHandler): () => void;

	/** Remove a registered handler by id. No-op if not currently registered. */
	unregisterTitleHandler(id: string): void;

	/** Inspect the current registry plus settings state */
	listHandlers(): TitleHandlerInfo[];
}

/** Default per-handler timeout in milliseconds */
export const DEFAULT_HANDLER_TIMEOUT_MS = 5000;

/** Lowercase alphanumeric and dashes, starting and ending with alphanumeric */
const VALID_HANDLER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validates a handler id against the Obsidian-style convention */
export function isValidHandlerId(id: string): boolean {
	return VALID_HANDLER_ID.test(id);
}

/** Wraps a promise in a timeout, rejecting with Error("timeout") after `ms` */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<T>((_, reject) => {
		timer = setTimeout(() => reject(new Error("timeout")), ms);
	});
	return Promise.race([promise, timeout]).finally(() => {
		if (timer) clearTimeout(timer);
	});
}
