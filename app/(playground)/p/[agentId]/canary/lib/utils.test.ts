import { describe, expect, test } from "bun:test";
import { pathJoin, pathnameToFilename } from "./utils";

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

describe("pathNameToFileName", () => {
	test("articles/test.txt", () => {
		expect(pathnameToFilename("articles/test.txt")).toBe("test.txt");
	});
	test("empty", () => {
		expect(pathnameToFilename("")).toBe("");
	});
	test("just filename", () => {
		expect(pathnameToFilename("test.txt")).toBe("test.txt");
	});
	test("nested path", () => {
		expect(pathnameToFilename("path/to/nested/file.txt")).toBe("file.txt");
	});
	test("no extension", () => {
		expect(pathnameToFilename("folder/file")).toBe("file");
	});
	test("with spaces", () => {
		expect(pathnameToFilename("folder/my file.txt")).toBe("my file.txt");
	});
});
