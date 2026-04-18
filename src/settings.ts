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
	/** Ordered list of registered title provider ids (highest priority first) */
	titleProviderOrder: string[];
	/** Title provider ids the user has explicitly disabled */
	titleProviderDisabled: string[];
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
	titleProviderOrder: [],
	titleProviderDisabled: [],
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

		this.renderTitleProviders(containerEl);
	}

	/**
	 * Renders the title providers section: one row per ordered provider id with
	 * enable toggle and move up/down buttons. Orphan ids (in settings but not
	 * currently registered) are shown greyed and kept in place, since the
	 * sweep at onLayoutReady has already removed ids nobody claims.
	 */
	private renderTitleProviders(containerEl: HTMLElement): void {
		new Setting(containerEl).setName(i18n.settings.titleProviders.heading).setHeading();

		const desc = containerEl.createEl("div", { cls: "setting-item-description" });
		desc.setText(i18n.settings.titleProviders.desc);

		const order = this.plugin.settings.titleProviderOrder;
		if (order.length === 0) {
			const empty = containerEl.createEl("div", { cls: "setting-item-description" });
			empty.setText(i18n.settings.titleProviders.empty);
			return;
		}

		const disabled = new Set(this.plugin.settings.titleProviderDisabled);
		for (let i = 0; i < order.length; i++) {
			const id = order[i];
			const provider = this.plugin.titleProviders.get(id);
			const label = provider?.label ?? id;
			const isRegistered = provider !== undefined;

			const row = new Setting(containerEl).setName(label);
			const descParts: string[] = [];
			if (provider?.label && provider.label !== id) descParts.push(id);
			if (provider?.origin) descParts.push(`from ${provider.origin}`);
			if (!isRegistered) descParts.push(`(${i18n.settings.titleProviders.notLoaded})`);
			if (descParts.length > 0) row.setDesc(descParts.join(" · "));
			if (!isRegistered) row.settingEl.addClass("mod-muted");

			row.addToggle((t) =>
				t.setValue(!disabled.has(id)).onChange(async (enabled) => {
					const next = new Set(this.plugin.settings.titleProviderDisabled);
					if (enabled) {
						next.delete(id);
					} else {
						next.add(id);
					}
					this.plugin.settings.titleProviderDisabled = Array.from(next);
					await this.plugin.saveSettings();
				}),
			);

			const currentIndex = i;
			row.addExtraButton((btn) =>
				btn
					.setIcon("chevron-up")
					.setTooltip(i18n.settings.titleProviders.moveUp)
					.setDisabled(currentIndex === 0)
					.onClick(async () => {
						await this.moveProvider(currentIndex, currentIndex - 1);
					}),
			);
			row.addExtraButton((btn) =>
				btn
					.setIcon("chevron-down")
					.setTooltip(i18n.settings.titleProviders.moveDown)
					.setDisabled(currentIndex === order.length - 1)
					.onClick(async () => {
						await this.moveProvider(currentIndex, currentIndex + 1);
					}),
			);
		}
	}

	/** Swaps two ids in the provider order list and re-renders the settings tab */
	private async moveProvider(fromIndex: number, toIndex: number): Promise<void> {
		const order = [...this.plugin.settings.titleProviderOrder];
		const [id] = order.splice(fromIndex, 1);
		order.splice(toIndex, 0, id);
		this.plugin.settings.titleProviderOrder = order;
		await this.plugin.saveSettings();
		this.display();
	}
}
