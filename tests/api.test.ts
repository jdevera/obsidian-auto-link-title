/**
 * @fileoverview Tests for the title handler API helpers.
 */
import { describe, expect, test } from "bun:test";
import { isValidProviderId, withTimeout } from "../src/api";

describe("isValidProviderId", () => {
	test("accepts a single lowercase word", () => {
		expect(isValidProviderId("todoist")).toBe(true);
	});

	test("accepts digits", () => {
		expect(isValidProviderId("abc123")).toBe(true);
	});

	test("accepts dashes between segments", () => {
		expect(isValidProviderId("google-docs")).toBe(true);
		expect(isValidProviderId("abc-123-def")).toBe(true);
	});

	test("rejects uppercase", () => {
		expect(isValidProviderId("Todoist")).toBe(false);
	});

	test("rejects underscores", () => {
		expect(isValidProviderId("google_docs")).toBe(false);
	});

	test("rejects leading or trailing dash", () => {
		expect(isValidProviderId("-todoist")).toBe(false);
		expect(isValidProviderId("todoist-")).toBe(false);
	});

	test("rejects consecutive dashes", () => {
		expect(isValidProviderId("google--docs")).toBe(false);
	});

	test("rejects empty string", () => {
		expect(isValidProviderId("")).toBe(false);
	});
});

describe("withTimeout", () => {
	test("resolves when the promise resolves within the timeout", async () => {
		const result = await withTimeout(Promise.resolve("ok"), 100);
		expect(result).toBe("ok");
	});

	test("rejects with 'timeout' when the promise takes too long", async () => {
		const slow = new Promise<string>((resolve) => setTimeout(() => resolve("late"), 200));
		await expect(withTimeout(slow, 50)).rejects.toThrow("timeout");
	});

	test("propagates rejection from the wrapped promise", async () => {
		const failing = Promise.reject(new Error("boom"));
		await expect(withTimeout(failing, 100)).rejects.toThrow("boom");
	});
});
