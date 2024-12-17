import { beforeAll, describe, expect, mock, test } from "bun:test";
import { getCookie, setCookie } from "./signed-cookie";

// Mock Next.js cookies
const mockCookieStore = {
	cookies: new Map<string, string>(),
	get(name: string) {
		const value = this.cookies.get(name);
		return value ? { value } : null;
	},
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	set(name: string, value: string, options: any) {
		this.cookies.set(name, value);
	},
};

mock.module("next/headers", () => ({
	cookies: () => mockCookieStore,
}));

describe("signed-cookie", () => {
	beforeAll(() => {
		process.env.COOKIE_SECRET = "test-secret";
	});

	test("should set and get cookie", async () => {
		const testData = { foo: "bar", num: 123 };
		await setCookie("test-cookie", testData);

		const result = await getCookie("test-cookie");
		expect(result).toEqual(testData);
	});

	test("should return null for non-existent cookie", async () => {
		const result = await getCookie("non-existent");
		expect(result).toBeNull();
	});

	test("should return null for tampered cookie", async () => {
		const testData = { foo: "bar" };
		await setCookie("tampered-cookie", testData);

		// Modify the cookie value directly to simulate tampering
		const tamperedValue = `${mockCookieStore.cookies.get("tampered-cookie")}tampered`;
		mockCookieStore.cookies.set("tampered-cookie", tamperedValue);

		const result = await getCookie("tampered-cookie");
		expect(result).toBeNull();
	});
});
