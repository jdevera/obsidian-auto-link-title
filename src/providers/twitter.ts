/**
 * @fileoverview
 * Built-in title provider for Twitter/X URLs. Routes requests through
 * fxtwitter.com (and fixupx.com for x.com) to get meaningful og:title
 * metadata that Twitter itself does not serve to bots.
 */
import { requestUrl } from "obsidian";
import type { TitleProvider } from "../api";
import { blank, getOgTitle, notBlank } from "../scraper/common";

const TWITTER_USER_AGENT = "ObsidianLinkPreview/1.0 (+https://obsidian.md)";

/** Hostnames the provider recognizes */
const TWITTER_HOSTS = new Set(["twitter.com", "www.twitter.com", "x.com", "www.x.com"]);

/** Returns true for a URL whose hostname is twitter.com or x.com (with optional www) */
export function isTwitterUrl(url: string): boolean {
	try {
		return TWITTER_HOSTS.has(new URL(url).hostname.toLowerCase());
	} catch {
		return false;
	}
}

/** Rewrites a Twitter/X URL to its proxy equivalent. twitter.com -> fxtwitter.com, x.com -> fixupx.com */
export function toTwitterProxyUrl(url: string): string {
	try {
		const u = new URL(url);
		const host = u.hostname.toLowerCase();
		if (host === "twitter.com" || host === "www.twitter.com") {
			u.hostname = "fxtwitter.com";
		} else if (host === "x.com" || host === "www.x.com") {
			u.hostname = "fixupx.com";
		} else {
			return url;
		}
		return u.toString();
	} catch {
		return url;
	}
}

/** Creates the Twitter/X title provider for registration via the plugin API */
export function createTwitterProvider(): TitleProvider {
	return {
		id: "twitter",
		label: "Twitter/X (via fxtwitter)",
		origin: "Built-in",
		match: isTwitterUrl,
		fetch: async (url: string): Promise<string> => {
			const proxyUrl = toTwitterProxyUrl(url);
			const response = await requestUrl({
				url: proxyUrl,
				headers: { "User-Agent": TWITTER_USER_AGENT },
			});
			const contentType = response.headers["content-type"];
			if (!contentType?.includes("text/html")) {
				throw new Error(`Unexpected content type: ${contentType}`);
			}
			const doc = new DOMParser().parseFromString(response.text, "text/html");
			const ogTitle = getOgTitle(doc);
			if (notBlank(ogTitle)) return ogTitle;
			const title = doc.querySelector("title")?.innerText ?? "";
			if (blank(title)) throw new Error("No title found in Twitter response");
			return title;
		},
	};
}
