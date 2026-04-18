/**
 * @fileoverview
 * Main plugin file for Auto Link Title.
 * Automatically fetches and inserts titles when pasting or dropping URLs.
 */
import { type Editor, Notice, Plugin } from "obsidian";
import {
	type AutoLinkTitleApi,
	DEFAULT_HANDLER_TIMEOUT_MS,
	isValidHandlerId,
	type TitleHandler,
	type TitleHandlerInfo,
	withTimeout,
} from "./api";
import { CheckIf, stripAngleBrackets } from "./checkif";
import { EditorExtensions } from "./editor-enhancements";
import { i18n } from "./lang/i18n";
import { type AutoLinkTitleSettings, AutoLinkTitleSettingTab, DEFAULT_SETTINGS } from "./settings";
import { fetchUrlTitle } from "./title-fetcher";
import { escapeMarkdown, getUrlFromLink, shortTitle } from "./utils/markdown";
import { getPasteId } from "./utils/placeholder";

/** Event handler type for paste events */
type PasteFunction = (this: HTMLElement, ev: ClipboardEvent) => void;

/** Event handler type for drop events */
type DropFunction = (this: HTMLElement, ev: DragEvent) => void;

/**
 * Main plugin class for Auto Link Title
 * Handles URL paste/drop events and fetches page titles automatically
 */
export default class AutoLinkTitle extends Plugin {
	settings: AutoLinkTitleSettings;
	pasteFunction: PasteFunction;
	dropFunction: DropFunction;
	blacklist: Array<string>;

	/** Live registry of externally-registered title handlers, keyed by id */
	titleHandlers: Map<string, TitleHandler> = new Map();

	/** Public API exposed on the plugin instance for external callers */
	api: AutoLinkTitleApi = {
		registerTitleHandler: (handler: TitleHandler): (() => void) => {
			if (!isValidHandlerId(handler.id)) {
				throw new Error(
					`Invalid title handler id "${handler.id}": must be lowercase alphanumeric with optional dashes`,
				);
			}
			this.titleHandlers.set(handler.id, handler);
			if (!this.settings.titleHandlerOrder.includes(handler.id)) {
				this.settings.titleHandlerOrder.push(handler.id);
				void this.saveSettings();
			}
			return () => this.api.unregisterTitleHandler(handler.id);
		},
		unregisterTitleHandler: (id: string): void => {
			this.titleHandlers.delete(id);
		},
		listHandlers: (): TitleHandlerInfo[] => {
			const disabled = new Set(this.settings.titleHandlerDisabled);
			return this.settings.titleHandlerOrder.map((id) => {
				const handler = this.titleHandlers.get(id);
				return {
					id,
					label: handler?.label,
					registered: handler !== undefined,
					enabled: !disabled.has(id),
				};
			});
		},
	};

	/**
	 * Walks the user-configured handler order and returns the first title
	 * produced by a matching, registered, enabled handler. Returns null if
	 * nothing matched or every matching handler errored or timed out.
	 */
	async tryRegisteredHandlers(url: string): Promise<string | null> {
		const disabled = new Set(this.settings.titleHandlerDisabled);
		for (const id of this.settings.titleHandlerOrder) {
			if (disabled.has(id)) continue;
			const handler = this.titleHandlers.get(id);
			if (!handler) continue;
			let matches: boolean;
			try {
				matches = handler.match(url);
			} catch (err) {
				console.error(`[auto-link-title] handler "${id}" match() threw`, err);
				continue;
			}
			if (!matches) continue;
			try {
				const title = await withTimeout(handler.fetch(url), DEFAULT_HANDLER_TIMEOUT_MS);
				if (title && title.trim().length > 0) {
					return title.trim();
				}
			} catch (err) {
				console.error(`[auto-link-title] handler "${id}" fetch() failed`, err);
			}
		}
		return null;
	}

	/**
	 * Drops handler ids from settings.titleHandlerOrder that are not in the
	 * live registry after all plugins have had a chance to call registerTitleHandler.
	 */
	async sweepUnknownHandlers(): Promise<void> {
		const before = this.settings.titleHandlerOrder;
		const after = before.filter((id) => this.titleHandlers.has(id));
		if (after.length !== before.length) {
			this.settings.titleHandlerOrder = after;
			this.settings.titleHandlerDisabled = this.settings.titleHandlerDisabled.filter((id) =>
				this.titleHandlers.has(id),
			);
			await this.saveSettings();
		}
	}

	async onload() {
		console.log("loading obsidian-auto-link-title");
		await this.loadSettings();

		this.blacklist = this.settings.websiteBlacklist
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		// Listen to paste event
		this.pasteFunction = this.pasteUrlWithTitle.bind(this);

		// Listen to drop event
		this.dropFunction = this.dropUrlWithTitle.bind(this);

		this.addCommand({
			id: "auto-link-title-paste",
			name: i18n.commands.pasteUrl,
			editorCallback: (editor) => this.manualPasteUrlWithTitle(editor),
			hotkeys: [],
		});

		this.addCommand({
			id: "auto-link-title-normal-paste",
			name: i18n.commands.normalPaste,
			editorCallback: (editor) => this.normalPaste(editor),
			hotkeys: [
				{
					modifiers: ["Mod", "Shift"],
					key: "v",
				},
			],
		});

		this.registerEvent(this.app.workspace.on("editor-paste", this.pasteFunction));

		this.registerEvent(this.app.workspace.on("editor-drop", this.dropFunction));

		this.addCommand({
			id: "enhance-url-with-title",
			name: i18n.commands.enhanceUrl,
			editorCallback: (editor) => this.addTitleToLink(editor),
			hotkeys: [
				{
					modifiers: ["Mod", "Shift"],
					key: "e",
				},
			],
		});

		this.addSettingTab(new AutoLinkTitleSettingTab(this.app, this));

		// Sweep handler ids that are in settings but nobody has registered by the
		// time Obsidian has finished loading. onLayoutReady fires after every
		// enabled plugin's onload has run.
		this.app.workspace.onLayoutReady(() => {
			void this.sweepUnknownHandlers();
		});
	}

	/**
	 * Adds a title to an existing URL or markdown link at cursor position
	 * @param editor - Obsidian editor instance
	 */
	addTitleToLink(editor: Editor): void {
		// Only attempt fetch if online

		const selectedText = (EditorExtensions.getSelectedText(editor) || "").trim();

		// If the cursor is on a raw html link, convert to a markdown link and fetch title
		if (CheckIf.isUrl(selectedText)) {
			this.convertUrlToTitledLink(editor, selectedText);
		}

		if (!navigator.onLine) {
			new Notice(i18n.notices.noInternet);
			return;
		}

		// If the cursor is on the URL part of a markdown link, fetch title and replace existing link title
		else if (CheckIf.isLinkedUrl(selectedText)) {
			const link = getUrlFromLink(selectedText);
			this.convertUrlToTitledLink(editor, link);
		}
	}

	/**
	 * Performs a normal paste without title fetching
	 * @param editor - Obsidian editor instance
	 */
	async normalPaste(editor: Editor): Promise<void> {
		const clipboardText = await navigator.clipboard.readText();
		if (clipboardText === null || clipboardText === "") return;

		editor.replaceSelection(clipboardText);
	}

	/**
	 * Core handler for processing URLs and converting them to titled links
	 * Shared logic between paste, drop, and manual paste operations
	 * @param editor - Obsidian editor instance
	 * @param text - URL text to process
	 * @param fallbackToPlainPaste - Whether to paste plain text if URL is invalid
	 * @returns true if URL was processed, false otherwise
	 */
	private async processUrlText(
		editor: Editor,
		text: string,
		fallbackToPlainPaste: boolean,
	): Promise<boolean> {
		// Skip empty text
		if (text === null || text === "") return false;

		// Strip angle brackets from autolink format <URL>
		const url = stripAngleBrackets(text);

		// If not a URL or is an image URL, skip processing
		if (!CheckIf.isUrl(url) || CheckIf.isImage(url)) {
			if (fallbackToPlainPaste) editor.replaceSelection(text);
			return false;
		}

		// Only attempt fetch if online
		if (!navigator.onLine) {
			if (fallbackToPlainPaste) editor.replaceSelection(text);
			new Notice(i18n.notices.noInternet);
			return false;
		}

		// If pasting into an existing markdown link context, just paste the URL
		if (CheckIf.isMarkdownLinkAlready(editor) || CheckIf.isAfterQuote(editor)) {
			editor.replaceSelection(url);
			return true;
		}

		// If inside code block and setting is enabled, just paste the URL
		if (this.settings.ignoreCodeBlocks && CheckIf.isInsideCode(editor)) {
			editor.replaceSelection(url);
			return true;
		}

		// If URL is blacklisted, just paste the URL without wrapping
		if (await this.isBlacklisted(url)) {
			editor.replaceSelection(url);
			return true;
		}

		// If URL is pasted over selected text and setting is enabled, use selection as title
		const selectedText = (EditorExtensions.getSelectedText(editor) || "").trim();
		if (selectedText && this.settings.shouldPreserveSelectionAsTitle) {
			editor.replaceSelection(`[${selectedText}](${url})`);
			return true;
		}

		// Fetch title and create markdown link
		this.convertUrlToTitledLink(editor, url);
		return true;
	}

	/**
	 * Manually triggered paste that fetches title for URLs
	 * @param editor - Obsidian editor instance
	 */
	async manualPasteUrlWithTitle(editor: Editor): Promise<void> {
		const clipboardText = await navigator.clipboard.readText();
		await this.processUrlText(editor, clipboardText, true);
	}

	/**
	 * Handles paste events to automatically fetch titles for URLs
	 * @param clipboard - Clipboard event from paste action
	 * @param editor - Obsidian editor instance
	 */
	async pasteUrlWithTitle(clipboard: ClipboardEvent, editor: Editor): Promise<void> {
		if (!this.settings.enhanceDefaultPaste) return;
		if (clipboard.defaultPrevented) return;

		const clipboardText = clipboard.clipboardData?.getData("text/plain") ?? "";
		if (clipboardText === null || clipboardText === "") return;

		// Strip angle brackets from autolink format <URL>
		const url = stripAngleBrackets(clipboardText);

		// Skip non-URLs and image URLs (let default handler process them)
		if (!CheckIf.isUrl(url) || CheckIf.isImage(url)) return;

		// Only attempt fetch if online
		if (!navigator.onLine) {
			new Notice(i18n.notices.noInternet);
			return;
		}

		// We're handling this paste - prevent default behavior
		clipboard.stopPropagation();
		clipboard.preventDefault();

		await this.processUrlText(editor, url, false);
	}

	/**
	 * Handles drop events to automatically fetch titles for URLs
	 * @param dropEvent - Drag event from drop action
	 * @param editor - Obsidian editor instance
	 */
	async dropUrlWithTitle(dropEvent: DragEvent, editor: Editor): Promise<void> {
		if (!this.settings.enhanceDropEvents) return;
		if (dropEvent.defaultPrevented) return;

		const dropText = dropEvent.dataTransfer?.getData("text/plain") ?? "";
		if (dropText === null || dropText === "") return;

		// Strip angle brackets from autolink format <URL>
		const url = stripAngleBrackets(dropText);

		// Skip non-URLs and image URLs (let default handler process them)
		if (!CheckIf.isUrl(url) || CheckIf.isImage(url)) return;

		// Only attempt fetch if online
		if (!navigator.onLine) {
			new Notice(i18n.notices.noInternet);
			return;
		}

		// We're handling this drop - prevent default behavior
		dropEvent.stopPropagation();
		dropEvent.preventDefault();

		await this.processUrlText(editor, url, false);
	}

	/**
	 * Checks if a URL is blacklisted based on user settings
	 * @param url - URL to check
	 * @returns true if URL matches any blacklist entry
	 */
	async isBlacklisted(url: string): Promise<boolean> {
		await this.loadSettings();
		this.blacklist = this.settings.websiteBlacklist
			.split(/,|\n/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		return this.blacklist.some((site) => url.includes(site));
	}

	/**
	 * Converts a URL to a markdown link with fetched title
	 * @param editor - Obsidian editor instance
	 * @param url - URL to convert
	 */
	async convertUrlToTitledLink(editor: Editor, url: string): Promise<void> {
		// If URL is blacklisted, just paste the URL without wrapping
		if (await this.isBlacklisted(url)) {
			editor.replaceSelection(url);
			return;
		}

		// Generate a unique id for find/replace operations for the title.
		const pasteId = getPasteId(this.settings.useBetterPasteId);

		// Instantly paste so you don't wonder if paste is broken
		editor.replaceSelection(`[${pasteId}](${url})`);

		// Try externally-registered handlers first (Todoist, Twist, etc.),
		// then fall back to the built-in LinkPreview and scraper chain.
		let title = await this.tryRegisteredHandlers(url);
		if (title === null) {
			const linkPreviewApiKey = this.settings.linkPreviewSecretId
				? (this.app.secretStorage.getSecret(this.settings.linkPreviewSecretId) ?? "")
				: "";
			title = await fetchUrlTitle(url, { ...this.settings, linkPreviewApiKey });
		}
		const escapedTitle = escapeMarkdown(title);
		const shortenedTitle = shortTitle(escapedTitle, this.settings.maximumTitleLength);

		const text = editor.getValue();

		const start = text.indexOf(pasteId);
		if (start < 0) {
			console.log(`Unable to find text "${pasteId}" in current editor, bailing out; link ${url}`);
		} else {
			const end = start + pasteId.length;
			const startPos = EditorExtensions.getEditorPositionFromIndex(text, start);
			const endPos = EditorExtensions.getEditorPositionFromIndex(text, end);

			editor.replaceRange(shortenedTitle, startPos, endPos);
		}
	}

	onunload() {
		console.log("unloading obsidian-auto-link-title");
	}

	/** Loads plugin settings from Obsidian's data store */
	async loadSettings() {
		const loaded = (await this.loadData()) as
			| (AutoLinkTitleSettings & { linkPreviewApiKey?: string })
			| null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);

		// Migrate the legacy plaintext `linkPreviewApiKey` setting into Obsidian's
		// SecretStorage. The key moves out of data.json and the setting now holds
		// the SecretStorage id that the user can later swap via SecretComponent.
		const legacyKey = loaded?.linkPreviewApiKey;
		if (legacyKey && !this.settings.linkPreviewSecretId) {
			const migratedId = "linkpreview-api-key";
			this.app.secretStorage.setSecret(migratedId, legacyKey);
			this.settings.linkPreviewSecretId = migratedId;
			(this.settings as { linkPreviewApiKey?: string }).linkPreviewApiKey = undefined;
			await this.saveSettings();
		}
	}

	/** Saves plugin settings to Obsidian's data store */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
