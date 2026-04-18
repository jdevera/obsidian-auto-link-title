/**
 * @fileoverview
 * Plugin settings interface, defaults, and settings tab UI.
 * Handles all user-configurable options for Auto Link Title.
 */
import { type App, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import { i18n } from "./lang/i18n";
import type AutoLinkTitle from "./main";

/**
 * Plugin settings interface defining all configurable options
 */
export interface AutoLinkTitleSettings {
	regex: RegExp;
	lineRegex: RegExp;
	linkRegex: RegExp;
	linkLineRegex: RegExp;
	imageRegex: RegExp;
	shouldPreserveSelectionAsTitle: boolean;
	enhanceDefaultPaste: boolean;
	enhanceDropEvents: boolean;
	websiteBlacklist: string;
	maximumTitleLength: number;
	useNewScraper: boolean;
	linkPreviewSecretId: string;
	useBetterPasteId: boolean;
	ignoreCodeBlocks: boolean;
	useTwitterProxy: boolean;
	/** Ordered list of registered title handler ids (highest priority first) */
	titleHandlerOrder: string[];
	/** Title handler ids the user has explicitly disabled */
	titleHandlerDisabled: string[];
}

/**
 * Default settings values for the plugin
 */
export const DEFAULT_SETTINGS: AutoLinkTitleSettings = {
	// URL regex that supports hyphens in domain names (e.g., www-cs-students.stanford.edu)
	regex: /^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/[^\s]*)?$/i,
	lineRegex: /https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/[^\s]*)?/gi,
	linkRegex:
		/^\[([^[\]]*)\]\((https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/[^\s]*)?)\)$/i,
	linkLineRegex:
		/\[([^[\]]*)\]\((https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/[^\s]*)?)\)/gi,
	imageRegex: /\.(gif|jpe?g|tiff?|png|webp|bmp|tga|psd|ai)$/i,
	enhanceDefaultPaste: true,
	shouldPreserveSelectionAsTitle: false,
	enhanceDropEvents: true,
	websiteBlacklist: "",
	maximumTitleLength: 0,
	useNewScraper: false,
	linkPreviewSecretId: "",
	useBetterPasteId: false,
	ignoreCodeBlocks: true,
	useTwitterProxy: true,
	titleHandlerOrder: [],
	titleHandlerDisabled: [],
};

/**
 * Settings tab UI for the Auto Link Title plugin
 */
export class AutoLinkTitleSettingTab extends PluginSettingTab {
	plugin: AutoLinkTitle;

	constructor(app: App, plugin: AutoLinkTitle) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(i18n.settings.enhancePaste.name)
			.setDesc(i18n.settings.enhancePaste.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.enhanceDefaultPaste).onChange(async (value) => {
					console.log(value);
					this.plugin.settings.enhanceDefaultPaste = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.enhanceDrop.name)
			.setDesc(i18n.settings.enhanceDrop.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.enhanceDropEvents).onChange(async (value) => {
					console.log(value);
					this.plugin.settings.enhanceDropEvents = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.maxTitleLength.name)
			.setDesc(i18n.settings.maxTitleLength.desc)
			.addText((val) =>
				val
					.setValue(this.plugin.settings.maximumTitleLength.toString(10))
					.onChange(async (value) => {
						const titleLength = Number(value);
						this.plugin.settings.maximumTitleLength =
							Number.isNaN(titleLength) || titleLength < 0 ? 0 : titleLength;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.preserveSelection.name)
			.setDesc(i18n.settings.preserveSelection.desc)
			.addToggle((val) =>
				val
					.setValue(this.plugin.settings.shouldPreserveSelectionAsTitle)
					.onChange(async (value) => {
						console.log(value);
						this.plugin.settings.shouldPreserveSelectionAsTitle = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.blacklist.name)
			.setDesc(i18n.settings.blacklist.desc)
			.addTextArea((val) =>
				val
					.setValue(this.plugin.settings.websiteBlacklist)
					.setPlaceholder(i18n.settings.blacklist.placeholder)
					.onChange(async (value) => {
						this.plugin.settings.websiteBlacklist = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.newScraper.name)
			.setDesc(i18n.settings.newScraper.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.useNewScraper).onChange(async (value) => {
					console.log(value);
					this.plugin.settings.useNewScraper = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.betterPlaceholder.name)
			.setDesc(i18n.settings.betterPlaceholder.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.useBetterPasteId).onChange(async (value) => {
					console.log(value);
					this.plugin.settings.useBetterPasteId = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.apiKey.name)
			.setDesc(i18n.settings.apiKey.desc)
			.addComponent((el) =>
				new SecretComponent(this.app, el)
					.setValue(this.plugin.settings.linkPreviewSecretId)
					.onChange(async (value) => {
						this.plugin.settings.linkPreviewSecretId = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.ignoreCodeBlocks.name)
			.setDesc(i18n.settings.ignoreCodeBlocks.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.ignoreCodeBlocks).onChange(async (value) => {
					this.plugin.settings.ignoreCodeBlocks = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName(i18n.settings.useTwitterProxy.name)
			.setDesc(i18n.settings.useTwitterProxy.desc)
			.addToggle((val) =>
				val.setValue(this.plugin.settings.useTwitterProxy).onChange(async (value) => {
					this.plugin.settings.useTwitterProxy = value;
					await this.plugin.saveSettings();
				}),
			);

		this.renderTitleHandlers(containerEl);
	}

	/**
	 * Renders the title handlers section: one row per ordered handler id with
	 * enable toggle and move up/down buttons. Orphan ids (in settings but not
	 * currently registered) are shown greyed and kept in place, since the
	 * sweep at onLayoutReady has already removed ids nobody claims.
	 */
	private renderTitleHandlers(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(i18n.settings.titleHandlers.heading).setHeading();

		const desc = containerEl.createEl("div", { cls: "setting-item-description" });
		desc.setText(i18n.settings.titleHandlers.desc);

		const order = this.plugin.settings.titleHandlerOrder;
		if (order.length === 0) {
			const empty = containerEl.createEl("div", { cls: "setting-item-description" });
			empty.setText(i18n.settings.titleHandlers.empty);
			return;
		}

		const disabled = new Set(this.plugin.settings.titleHandlerDisabled);
		for (let i = 0; i < order.length; i++) {
			const id = order[i];
			const handler = this.plugin.titleHandlers.get(id);
			const label = handler?.label ?? id;
			const isRegistered = handler !== undefined;

			const row = new Setting(containerEl).setName(label);
			if (!isRegistered) {
				row.setDesc(`${id} (${i18n.settings.titleHandlers.notLoaded})`);
				row.settingEl.addClass("mod-muted");
			} else if (handler?.label && handler.label !== id) {
				row.setDesc(id);
			}

			row.addToggle((t) =>
				t.setValue(!disabled.has(id)).onChange(async (enabled) => {
					const next = new Set(this.plugin.settings.titleHandlerDisabled);
					if (enabled) {
						next.delete(id);
					} else {
						next.add(id);
					}
					this.plugin.settings.titleHandlerDisabled = Array.from(next);
					await this.plugin.saveSettings();
				}),
			);

			const currentIndex = i;
			row.addExtraButton((btn) =>
				btn
					.setIcon("chevron-up")
					.setTooltip(i18n.settings.titleHandlers.moveUp)
					.setDisabled(currentIndex === 0)
					.onClick(async () => {
						await this.moveHandler(currentIndex, currentIndex - 1);
					}),
			);
			row.addExtraButton((btn) =>
				btn
					.setIcon("chevron-down")
					.setTooltip(i18n.settings.titleHandlers.moveDown)
					.setDisabled(currentIndex === order.length - 1)
					.onClick(async () => {
						await this.moveHandler(currentIndex, currentIndex + 1);
					}),
			);
		}
	}

	/** Swaps two ids in the handler order list and re-renders the settings tab */
	private async moveHandler(fromIndex: number, toIndex: number): Promise<void> {
		const order = [...this.plugin.settings.titleHandlerOrder];
		const [id] = order.splice(fromIndex, 1);
		order.splice(toIndex, 0, id);
		this.plugin.settings.titleHandlerOrder = order;
		await this.plugin.saveSettings();
		this.display();
	}
}
