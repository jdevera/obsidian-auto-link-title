# Title Providers

Other Obsidian plugins, CustomJS classes, and RunJS scripts can extend Auto Link Title with domain-specific title fetchers called **title providers**. A provider claims a set of URLs via a predicate and supplies the title via a function. At paste or drop time the plugin walks the user-configured order of providers, calling the first one that matches the URL. If every matching provider errors or times out, the plugin falls back to its built-in LinkPreview and scraper chain.

Providers are useful for URLs behind authentication (where a generic HTML scraper cannot reach the title), for services that return richer metadata through an API than through their HTML, and for any site where a human-curated title is worth calling dedicated logic.

## Registration API

The plugin exposes an `api` object on its instance. Grab it via Obsidian's plugin registry:

```js
const plugin = app.plugins.plugins["obsidian-auto-link-title"];
if (!plugin?.api?.registerTitleProvider) {
  console.warn("Auto Link Title is not loaded or does not expose the provider API");
  return;
}
```

### `registerTitleProvider(provider): () => void`

Registers a provider. Returns an unregister function, so callers can tear down cleanly when their host plugin or script unloads. Registering the same `id` twice replaces the previous provider.

```js
const unregister = plugin.api.registerTitleProvider({
  id: "my-provider",
  label: "My Provider",
  origin: "RunJS: my-script.js",
  match: (url) => url.startsWith("https://example.com/"),
  fetch: async (url) => {
    // ... return the title as a string
  },
});
```

### `unregisterTitleProvider(id: string): void`

Removes a provider by id. No-op if the id is not currently registered.

### `listProviders(): TitleProviderInfo[]`

Returns a snapshot of the registry combined with the user's settings. Each entry carries the `id`, optional `label` and `origin`, and two booleans: `registered` (is a live provider present under this id) and `enabled` (has the user toggled it on in settings). Useful for debugging or for other plugins that want to introspect which providers are available.

## The `TitleProvider` interface

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique, stable. Lowercase alphanumeric with optional dashes (e.g. `todoist`, `google-docs`). |
| `label` | `string` | no | Human-readable name shown in settings. Falls back to `id`. |
| `origin` | `string` | no | Short descriptor of where the provider came from (e.g. `"Built-in"`, `"CustomJS: todoist"`, `"RunJS: my-script.js"`). Shown in settings so users can see what is providing a given entry. |
| `match` | `(url: string) => boolean` | yes | Return true for URLs this provider will handle. Called synchronously on every paste attempt, so keep it fast and side-effect free. |
| `fetch` | `(url: string) => Promise<string>` | yes | Produce the title. Throw or return an empty string to fall back to the next matching provider. |
| `priority` | `number` | no | Hint for the initial position of a brand-new id in the settings order list. The user's drag-to-reorder preference overrides this. Defaults to 0. |

## Ordering and dispatch

Order is stored in plugin settings as a list of ids. The user reorders it from **Settings → Auto Link Title → Title providers**. Each provider also has an enable/disable toggle. At paste time:

1. The dispatcher walks the ordered list.
2. For each id, if the provider is currently registered and enabled, it calls `match(url)`.
3. If `match` returns true, it calls `fetch(url)` with a 5-second timeout.
4. If `fetch` resolves to a non-empty string, that is the title.
5. If `fetch` throws or times out, the dispatcher logs the error and continues to the next matching provider.
6. If every provider declines or fails, the built-in LinkPreview (if configured) and then the HTTP or Electron scraper run as fallbacks.

## Lifecycle and late registration

Providers are expected to register during plugin or script load. Auto Link Title runs a sweep on `onLayoutReady`: any id sitting in the settings order that no one has registered by then is removed. This keeps stale entries from accumulating when a provider's host plugin is uninstalled.

Providers that register after `onLayoutReady` still work, but they are treated as brand new and appended to the bottom of the order list.

When a provider's host plugin temporarily unloads (for example, disabled in Obsidian's Community Plugins panel), the id stays in the settings order, greyed out and marked "not currently loaded". Re-enabling the plugin brings the provider back in place without the user having to reconfigure.

## Storing credentials

Use Obsidian's `app.secretStorage` for anything that looks like a token or API key. Secrets are stored outside `data.json` in Obsidian's per-vault encrypted store, and you pick a name the user chose:

```js
const token = app.secretStorage.getSecret("todoist-api-token");
if (!token) throw new Error("Todoist token missing");
```

Set a secret once, interactively, from the Obsidian dev console:

```js
app.secretStorage.setSecret("todoist-api-token", "YOUR_TOKEN_HERE");
```

The `SecretStorage` API requires Obsidian 1.11.4 or later. Auto Link Title already depends on that version, so anything built on top of it can rely on it being present.

## Complete example: Todoist provider in RunJS

This script registers a provider that fetches task and project titles from the Todoist API. It expects a bearer token in SecretStorage under the id `todoist-api-token`.

```js
// Registers a Todoist title provider with the Auto Link Title plugin.

const plugin = this.app.plugins.plugins["obsidian-auto-link-title"];
if (!plugin?.api?.registerTitleProvider) return;

function parseTodoistUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.hostname !== "app.todoist.com" && parsed.hostname !== "todoist.com") {
    return null;
  }
  const match = parsed.pathname.match(/^\/app\/(task|project)\/(?:.*-)?([A-Za-z0-9]{10,})$/);
  if (!match) return null;
  return { kind: match[1], id: match[2] };
}

plugin.api.registerTitleProvider({
  id: "todoist",
  label: "Todoist tasks and projects",
  origin: "RunJS: auto-link-title-todoist",
  match: (url) => parseTodoistUrl(url) !== null,
  fetch: async (url) => {
    const { kind, id } = parseTodoistUrl(url);
    const token = this.app.secretStorage.getSecret("todoist-api-token");
    if (!token) throw new Error("Todoist token missing");
    const endpoint = kind === "project" ? "projects" : "tasks";
    const res = await fetch(`https://api.todoist.com/api/v1/${endpoint}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Todoist API ${res.status} ${res.statusText}`);
    const data = await res.json();
    return kind === "project" ? `Todoist Project - ${data.name}` : `Todoist - ${data.content}`;
  },
});
```

To make it survive Obsidian restarts, add the script name to RunJS's Autostart list.

## A note on built-in providers

The plugin ships one built-in provider (`twitter`) that routes `twitter.com` and `x.com` URLs through `fxtwitter.com` and `fixupx.com` for better og:title metadata. It registers via the same API as any external provider and is shown in the settings list with `origin: Built-in`. Users can disable or reorder it like any other provider.
