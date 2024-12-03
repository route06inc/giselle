import { describe, expect, test } from "bun:test";
import { pathJoin } from "./utils";

describe("pathJoin", () => {
	test("a, b, c", () => {
		expect(pathJoin("a", "b", "c")).toBe("a/b/c");
	});
	test("a, b/, /c", () => {
		expect(pathJoin("a", "b/", "/c")).toBe("a/b/c");
	});
	test("nested", () => {
		const folder = pathJoin("a", "b");
		const file = pathJoin(folder, "c.json");
		expect(file).toBe("a/b/c.json");
	});
});
