/**
 * @fileoverview
 * Utility class for checking URL and markdown link states.
 * Used to determine whether to auto-fetch titles when pasting.
 */
import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import type { Editor } from "obsidian";
import { DEFAULT_SETTINGS } from "./settings";

/**
 * Strips angle brackets from autolink format URLs
 * @param text - Text that may be in `<URL>` format
 * @returns URL without angle brackets, or original text if not autolink
 */
export function stripAngleBrackets(text: string): string {
	const trimmed = text.trim();
	if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
		return trimmed.slice(1, -1);
	}
	return text;
}

/**
 * Utility class for URL and link state checking
 */
export class CheckIf {
	/**
	 * Checks if the cursor is already inside a markdown link syntax
	 * @param editor - Obsidian editor instance
	 * @returns true if the two characters before cursor are `](`
	 * @example
	 * // [title](|) ← If cursor is at |, returns true
	 */
	public static isMarkdownLinkAlready(editor: Editor): boolean {
		const cursor = editor.getCursor();

		const titleEnd = editor.getRange(
			{ ch: cursor.ch - 2, line: cursor.line },
			{ ch: cursor.ch, line: cursor.line },
		);

		return titleEnd === "](";
	}

	/**
	 * Checks if the cursor is immediately after a quote character.
	 * Used to detect pasting inside HTML attributes (e.g., href="...")
	 * @param editor - Obsidian editor instance
	 * @returns true if the character before cursor is `"` or `'`
	 * @example
	 * // href="|" ← If cursor is at |, returns true
	 */
	public static isAfterQuote(editor: Editor): boolean {
		const cursor = editor.getCursor();

		const beforeChar = editor.getRange(
			{ ch: cursor.ch - 1, line: cursor.line },
			{ ch: cursor.ch, line: cursor.line },
		);

		return beforeChar === '"' || beforeChar === "'";
	}

	/**
	 * Checks if the text is a valid URL format
	 * @param text - Text to check
	 * @returns true if text matches URL pattern
	 */
	public static isUrl(text: string): boolean {
		const urlRegex = new RegExp(DEFAULT_SETTINGS.regex);
		return urlRegex.test(text);
	}

	/**
	 * Checks if the text is an image URL.
	 *
	 * The regex is tested against the URL's pathname, not the full URL, so
	 * a bare domain on an image-like TLD (e.g. https://openclaw.ai for the
	 * ".ai" Adobe Illustrator extension) is not misclassified as an image.
	 * @param text - Text to check
	 * @returns true if URL has an image extension in its path
	 */
	public static isImage(text: string): boolean {
		const imageRegex = new RegExp(DEFAULT_SETTINGS.imageRegex);
		try {
			return imageRegex.test(new URL(text).pathname);
		} catch {
			return imageRegex.test(text);
		}
	}

	/**
	 * Checks if the text is in markdown link format
	 * @param text - Text to check
	 * @returns true if text matches `[title](url)` format
	 */
	public static isLinkedUrl(text: string): boolean {
		const urlRegex = new RegExp(DEFAULT_SETTINGS.linkRegex);
		return urlRegex.test(text);
	}

	/**
	 * Checks if the cursor is inside inline code or a fenced code block.
	 *
	 * Uses CodeMirror's Lezer syntax tree so that escaped backticks and
	 * multi-backtick inline-code delimiters are handled correctly. Falls back
	 * to counting fence markers above the cursor when the parser has not yet
	 * committed an unclosed fence to a `FencedCode` node.
	 * @param editor - Obsidian editor instance
	 * @returns true if cursor is inside code formatting
	 */
	public static isInsideCode(editor: Editor): boolean {
		// @ts-expect-error - cm is an undocumented but stable EditorView reference
		const view = editor.cm;
		if (!view) return false;
		const pos = view.state.selection.main.head;
		const tree = ensureSyntaxTree(view.state, view.state.doc.length, 50) ?? syntaxTree(view.state);
		let found = false;
		tree.iterate({
			from: pos,
			to: pos,
			enter(n) {
				if (found) return false;
				// Obsidian layers HyperMD token classes on top of the Lezer markdown
				// parser, so node names look like "HyperMD-codeblock_hmd-codeblock" or
				// "formatting_formatting-code_inline-code". Match substrings of those
				// class names as well as the bare Lezer markdown node names for views
				// where the HyperMD layer is absent.
				const name = n.type.name;
				if (
					name.includes("codeblock") ||
					name.includes("code-block") ||
					name.includes("inline-code") ||
					name === "FencedCode" ||
					name === "CodeBlock" ||
					name === "InlineCode" ||
					name === "CodeText"
				) {
					found = true;
				}
			},
		});
		if (found) return true;

		// Fallback: an unclosed fenced block has no closing ``` yet, so the parser
		// has not committed it to a FencedCode node. Count fence markers on lines
		// strictly above the cursor line. An odd count means we are inside an open fence.
		const { doc } = view.state;
		const cursorLine = doc.lineAt(pos);
		let fenceMarkers = 0;
		for (let n = 1; n < cursorLine.number; n++) {
			if (/^\s{0,3}(`{3,}|~{3,})/.test(doc.line(n).text)) {
				fenceMarkers++;
			}
		}
		return fenceMarkers % 2 === 1;
	}
}
