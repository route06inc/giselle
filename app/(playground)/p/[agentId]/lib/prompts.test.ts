import { describe, expect, test } from "bun:test";
import HandleBars from "handlebars";
import { textGenerationPrompt } from "./prompts";

describe("textGenerationPrompt template", () => {
	const template = HandleBars.compile(textGenerationPrompt);

	test("should render basic instruction without sources or requirement", () => {
		const result = template({
			instruction: "Write a summary about cats.",
		});

		expect(result).toContain(
			"<instruction>\nWrite a summary about cats.\n</instruction>",
		);
		expect(result).not.toContain("<requirement>");
		expect(result).not.toContain("<sources>");
	});

	test("should render instruction with requirement", () => {
		const result = template({
			instruction: "Write a summary about cats.",
			requirement: "Must include information about different breeds.",
		});

		expect(result).toContain(
			"<instruction>\nWrite a summary about cats.\n</instruction>",
		);
		expect(result).toContain(
			"<requirement>\nMust include information about different breeds.\n</requirement>",
		);
		expect(result).not.toContain("<sources>");
	});

	test("should render instruction with text sources", () => {
		const result = template({
			instruction: "Write a summary about cats.",
			sources: [
				{
					type: "text",
					nodeId: "node1",
					content: "Cats are great pets.",
				},
				{
					type: "text",
					nodeId: "node2",
					content: "Cats need regular grooming.",
				},
			],
		});

		expect(result).toContain(
			"<instruction>\nWrite a summary about cats.\n</instruction>",
		);
		expect(result).toContain(
			'<text id="node1">\nCats are great pets.\n</text>',
		);
		expect(result).toContain(
			'<text id="node2">\nCats need regular grooming.\n</text>',
		);
	});

	test("should render instruction with text generation sources", () => {
		const result = template({
			instruction: "Write a summary about cats.",
			sources: [
				{
					type: "textGeneration",
					nodeId: "node1",
					title: "Cat Care Guide",
					content: "How to take care of your cat.",
				},
			],
		});

		expect(result).toContain(
			"<instruction>\nWrite a summary about cats.\n</instruction>",
		);
		expect(result).toContain(
			'<generated id="node1" title="Cat Care Guide">\nHow to take care of your cat.\n</generated>',
		);
	});

	test("should render instruction with mixed sources", () => {
		const result = template({
			instruction: "Write a summary about cats.",
			sources: [
				{
					type: "text",
					nodeId: "node1",
					content: "Cats are great pets.",
				},
				{
					type: "textGeneration",
					nodeId: "node2",
					title: "Cat Care Guide",
					content: "How to take care of your cat.",
				},
			],
		});

		expect(result).toContain(
			'<text id="node1">\nCats are great pets.\n</text>',
		);
		expect(result).toContain(
			'<generated id="node2" title="Cat Care Guide">\nHow to take care of your cat.\n</generated>',
		);
	});

	test("should handle empty sources array", () => {
		const result = template({
			instruction: "Write a summary about cats.",
			sources: [],
		});

		expect(result).toContain(
			"<instruction>\nWrite a summary about cats.\n</instruction>",
		);
		expect(result).not.toContain("<sources>");
	});

	test("should escape HTML in content", () => {
		const result = template({
			instruction: "Write a summary about <cats>.",
			sources: [
				{
					type: "text",
					nodeId: "node1",
					content: "<p>Cats are great pets.</p>",
				},
			],
		});

		expect(result).toContain("&lt;cats&gt;");
		expect(result).toContain("&lt;p&gt;Cats are great pets.&lt;/p&gt;");
	});

	test("should render all components together", () => {
		const result = template({
			instruction: "Write a summary about cats.",
			requirement: "Must include information about different breeds.",
			sources: [
				{
					type: "text",
					nodeId: "node1",
					content: "Cats are great pets.",
				},
				{
					type: "textGeneration",
					nodeId: "node2",
					title: "Cat Care Guide",
					content: "How to take care of your cat.",
				},
			],
		});

		expect(result).toContain("<instruction>");
		expect(result).toContain("<requirement>");
		expect(result).toContain("<sources>");
		expect(result).toContain('<text id="node1">');
		expect(result).toContain('<generated id="node2" title="Cat Care Guide">');
	});
});
