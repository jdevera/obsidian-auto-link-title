/**
 * @fileoverview Tests for the title handler API helpers.
 */
import { describe, expect, test } from "bun:test";
import { isValidHandlerId, withTimeout } from "../src/api";

describe("isValidHandlerId", () => {
	test("accepts a single lowercase word", () => {
		expect(isValidHandlerId("todoist")).toBe(true);
	});

	test("accepts digits", () => {
		expect(isValidHandlerId("abc123")).toBe(true);
	});

	test("accepts dashes between segments", () => {
		expect(isValidHandlerId("google-docs")).toBe(true);
		expect(isValidHandlerId("abc-123-def")).toBe(true);
	});

	test("rejects uppercase", () => {
		expect(isValidHandlerId("Todoist")).toBe(false);
	});

	test("rejects underscores", () => {
		expect(isValidHandlerId("google_docs")).toBe(false);
	});

	test("rejects leading or trailing dash", () => {
		expect(isValidHandlerId("-todoist")).toBe(false);
		expect(isValidHandlerId("todoist-")).toBe(false);
	});

	test("rejects consecutive dashes", () => {
		expect(isValidHandlerId("google--docs")).toBe(false);
	});

	test("rejects empty string", () => {
		expect(isValidHandlerId("")).toBe(false);
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
