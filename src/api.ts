/**
 * @fileoverview
 * Public plugin API for registering custom title-fetching providers.
 *
 * Other plugins or user scripts (e.g. CustomJS) can register a provider that
 * produces titles for URLs they recognize (Todoist tasks, internal tools
 * behind authentication, and so on). At paste time the dispatcher walks the
 * user-configured order and calls the first provider whose `match(url)`
 * returns true.
 */

/** A single registered title provider */
export interface TitleProvider {
	/** Unique, stable id. Lowercase alphanumeric and dashes is conventional. */
	id: string;
	/** Optional human-readable label for the settings UI */
	label?: string;
	/**
	 * Optional short string describing where this provider came from, shown in
	 * the settings UI so users aren't puzzled by unfamiliar entries. Examples:
	 * "Built-in", "My Plugin", "CustomJS: my-script", "RunJS: my-script.js".
	 */
	origin?: string;
	/** Returns true if this provider can produce a title for the given URL */
	match: (url: string) => boolean;
	/** Produces the title. Throw or return empty string to fall back to the next provider. */
	fetch: (url: string) => Promise<string>;
	/**
	 * Initial priority for brand-new ids appended to the settings order list.
	 * Higher priorities appear earlier. Settings order overrides this once
	 * the id is known to the user. Defaults to 0.
	 */
	priority?: number;
}

/** Return value of {@link AutoLinkTitleApi.listProviders} */
export interface TitleProviderInfo {
	id: string;
	label?: string;
	origin?: string;
	/** True if a live provider is currently registered under this id */
	registered: boolean;
	/** True if the user has not disabled this provider in settings */
	enabled: boolean;
}

/** Public API exposed on the plugin instance as `plugin.api` */
export interface AutoLinkTitleApi {
	/**
	 * Register a title provider. Returns an unregister function.
	 *
	 * Registering the same id a second time replaces the previous provider.
	 */
	registerTitleProvider(provider: TitleProvider): () => void;

	/** Remove a registered provider by id. No-op if not currently registered. */
	unregisterTitleProvider(id: string): void;

	/** Inspect the current registry plus settings state */
	listProviders(): TitleProviderInfo[];
}

/** Default per-provider timeout in milliseconds */
export const DEFAULT_PROVIDER_TIMEOUT_MS = 5000;

/** Lowercase alphanumeric and dashes, starting and ending with alphanumeric */
const VALID_PROVIDER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validates a provider id against the Obsidian-style convention */
export function isValidProviderId(id: string): boolean {
	return VALID_PROVIDER_ID.test(id);
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
