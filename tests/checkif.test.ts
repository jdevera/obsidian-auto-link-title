/**
 * @fileoverview
 * Tests for CheckIf utility class and related functions.
 * Run with: bun test
 */
import { describe, expect, test } from "bun:test";
import { CheckIf, stripAngleBrackets } from "../src/checkif";
import { isTwitterUrl, toTwitterProxyUrl } from "../src/providers/twitter";

describe("stripAngleBrackets", () => {
	test("strips angle brackets from autolink URL", () => {
		expect(stripAngleBrackets("<https://example.com>")).toBe("https://example.com");
	});

	test("strips angle brackets with surrounding whitespace", () => {
		expect(stripAngleBrackets("  <https://example.com>  ")).toBe("https://example.com");
	});

	test("returns original text if not autolink format", () => {
		expect(stripAngleBrackets("https://example.com")).toBe("https://example.com");
	});

	test("returns original if only opening bracket", () => {
		expect(stripAngleBrackets("<https://example.com")).toBe("<https://example.com");
	});

	test("returns original if only closing bracket", () => {
		expect(stripAngleBrackets("https://example.com>")).toBe("https://example.com>");
	});

	test("handles empty string", () => {
		expect(stripAngleBrackets("")).toBe("");
	});

	test("handles text that is just angle brackets", () => {
		expect(stripAngleBrackets("<>")).toBe("");
	});
});

describe("CheckIf.isUrl", () => {
	test("returns true for valid http URL", () => {
		expect(CheckIf.isUrl("http://example.com")).toBe(true);
	});

	test("returns true for valid https URL", () => {
		expect(CheckIf.isUrl("https://example.com")).toBe(true);
	});

	test("returns true for URL with hyphenated domain", () => {
		expect(CheckIf.isUrl("http://www-cs-students.stanford.edu/")).toBe(true);
	});

	test("returns false for invalid URL", () => {
		expect(CheckIf.isUrl("not a url")).toBe(false);
	});

	test("returns false for URL without protocol", () => {
		expect(CheckIf.isUrl("example.com")).toBe(false);
	});
});

describe("CheckIf.isImage", () => {
	test("returns true for PNG URL", () => {
		expect(CheckIf.isImage("https://example.com/image.png")).toBe(true);
	});

	test("returns true for JPG URL", () => {
		expect(CheckIf.isImage("https://example.com/image.jpg")).toBe(true);
	});

	test("returns true for uppercase extension", () => {
		expect(CheckIf.isImage("https://example.com/image.PNG")).toBe(true);
	});

	test("returns false for HTML page", () => {
		expect(CheckIf.isImage("https://example.com/page.html")).toBe(false);
	});

	test("returns false for URL without extension", () => {
		expect(CheckIf.isImage("https://example.com/path")).toBe(false);
	});

	test("returns false for bare .ai domain (TLD, not file)", () => {
		expect(CheckIf.isImage("https://openclaw.ai")).toBe(false);
	});

	test("returns false for bare .ai domain with trailing slash", () => {
		expect(CheckIf.isImage("https://openclaw.ai/")).toBe(false);
	});

	test("returns true for .ai file in path on .ai domain", () => {
		expect(CheckIf.isImage("https://openclaw.ai/logo.ai")).toBe(true);
	});

	test("returns true for .ai file in path on .com domain", () => {
		expect(CheckIf.isImage("https://example.com/logo.ai")).toBe(true);
	});
});

describe("CheckIf.isLinkedUrl", () => {
	test("returns true for markdown link format", () => {
		expect(CheckIf.isLinkedUrl("[Title](https://example.com)")).toBe(true);
	});

	test("returns true for link with hyphenated domain", () => {
		expect(CheckIf.isLinkedUrl("[Title](http://www-cs-students.stanford.edu/)")).toBe(true);
	});

	test("returns false for plain URL", () => {
		expect(CheckIf.isLinkedUrl("https://example.com")).toBe(false);
	});

	test("returns false for incomplete markdown", () => {
		expect(CheckIf.isLinkedUrl("[Title]")).toBe(false);
	});
});

describe("isTwitterUrl", () => {
	test("returns true for twitter.com", () => {
		expect(isTwitterUrl("https://twitter.com/user/status/123")).toBe(true);
	});

	test("returns true for www.twitter.com", () => {
		expect(isTwitterUrl("https://www.twitter.com/user/status/123")).toBe(true);
	});

	test("returns true for x.com", () => {
		expect(isTwitterUrl("https://x.com/user/status/123")).toBe(true);
	});

	test("returns true for www.x.com", () => {
		expect(isTwitterUrl("https://www.x.com/user/status/123")).toBe(true);
	});

	test("returns false for other domains", () => {
		expect(isTwitterUrl("https://example.com")).toBe(false);
	});

	test("returns false for similar but different domains", () => {
		expect(isTwitterUrl("https://nottwitter.com")).toBe(false);
		expect(isTwitterUrl("https://twitter.org")).toBe(false);
	});

	test("returns false for invalid URL", () => {
		expect(isTwitterUrl("not a url")).toBe(false);
	});
});

describe("toTwitterProxyUrl", () => {
	test("converts twitter.com to fxtwitter.com", () => {
		expect(toTwitterProxyUrl("https://twitter.com/user/status/123")).toBe(
			"https://fxtwitter.com/user/status/123",
		);
	});

	test("converts www.twitter.com to fxtwitter.com", () => {
		expect(toTwitterProxyUrl("https://www.twitter.com/user/status/123")).toBe(
			"https://fxtwitter.com/user/status/123",
		);
	});

	test("converts x.com to fixupx.com", () => {
		expect(toTwitterProxyUrl("https://x.com/user/status/123")).toBe(
			"https://fixupx.com/user/status/123",
		);
	});

	test("converts www.x.com to fixupx.com", () => {
		expect(toTwitterProxyUrl("https://www.x.com/user/status/123")).toBe(
			"https://fixupx.com/user/status/123",
		);
	});

	test("returns original URL for non-Twitter domains", () => {
		expect(toTwitterProxyUrl("https://example.com")).toBe("https://example.com");
	});

	test("preserves path and query parameters", () => {
		expect(toTwitterProxyUrl("https://twitter.com/user/status/123?s=20")).toBe(
			"https://fxtwitter.com/user/status/123?s=20",
		);
	});

	test("returns original for invalid URL", () => {
		expect(toTwitterProxyUrl("not a url")).toBe("not a url");
	});
});
