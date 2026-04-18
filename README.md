## Obsidian Auto Link Title
![Auto linking example](auto-link-title.gif)

### Automatically Title New Links
This plugin automatically fetches the webpage to extract link titles when they're pasted, creating a markdown link with the correct title set.

#### For example:

When pasting `https://github.com/zolrath/obsidian-auto-link-title` the plugin fetches the page and retrieves the title, resulting in a paste of: `[zolrath/obsidian-auto-link-title: Automatically fetch the titles of pasted links](https://github.com/zolrath/obsidian-auto-link-title)`

### Add Titles To Existing Raw URLs
Additionally, using `ctrl-shift-e` (Windows) or `cmd-shift-e` (OS X) you can enhance an existing raw link to a markdown formatted link with the proper title.

If your text cursor is within the url `https://github.com/zolrath/obsidian-auto-link-title` pressing `ctrl-shift-e` or `cmd-shift-e` converts the text to `[zolrath/obsidian-auto-link-title: Automatically fetch the titles of pasted links](https://github.com/zolrath/obsidian-auto-link-title)`

### Overwrite Titles Of Existing Markdown Links
Additionally, using `ctrl-shift-e` (Windows) or `cmd-shift-e` (OS X) you can overwrite an existing title of a markdown link with the fetched title from the url.

If your text cursor is within `[some plugin](https://github.com/zolrath/obsidian-auto-link-title)` pressing `ctrl+shift+e` fetches the sites title and replaces it, resulting in `[zolrath/obsidian-auto-link-title: Automatically fetch the titles of pasted links](https://github.com/zolrath/obsidian-auto-link-title)`

### Extensibility: Title Providers
Other plugins or user scripts (CustomJS, RunJS) can register custom title fetchers for URLs behind authentication or for services that expose richer metadata through an API. See [docs/title-providers.md](docs/title-providers.md) for the registration API and a worked example.

### Mobile Pasting
In order to paste the URL ensure you perform the `Tap and Hold -> Paste` action to paste the URL into your document.

#### Gboard
Google's [Gboard](https://play.google.com/store/apps/details?id=com.google.android.inputmethod.latin&hl=en_US&gl=US) keyboard has a Clipboard helper shortcut above the keyboard to quickly paste.
Due to the implementation of that feature, it does not trigger the `paste` event, preventing this plugin from interacting with the text.
