import { createGiselleNodeBlueprint } from "./factory";
import {
	createObjectParameterBlueprint,
	createStringParameterBlueprint,
} from "./parameter/factory";
import { giselleNodeCategories } from "./types";

export const textGeneratorParameterNames = {
	instruction: "instruction",
};
export const textGeneratorBlueprint = createGiselleNodeBlueprint({
	archetype: "Text Generator",
	category: giselleNodeCategories.action,
	resultPortLabel: "Result",
	parameters: createObjectParameterBlueprint({
		type: "object",
		properties: {
			[textGeneratorParameterNames.instruction]: createStringParameterBlueprint(
				{
					type: "string",
					label: "Instruction",
				},
			),
		},
		required: ["instruction"],
	}),
});

export const webSearchBlueprint = createGiselleNodeBlueprint({
	archetype: "Web Search",
	category: giselleNodeCategories.action,
	resultPortLabel: "Result",
	parameters: createObjectParameterBlueprint({
		type: "object",
		properties: {
			[textGeneratorParameterNames.instruction]: createStringParameterBlueprint(
				{
					type: "string",
					label: "Instruction",
				},
			),
		},
		required: ["instruction"],
	}),
});

export const promptBlueprint = createGiselleNodeBlueprint({
	archetype: "Prompt",
	category: giselleNodeCategories.instruction,
	resultPortLabel: "Text",
});

export const giselleNodeArchetypes = {
	textGenerator: textGeneratorBlueprint.archetype,
	prompt: promptBlueprint.archetype,
	webSearch: webSearchBlueprint.archetype,
} as const;

export type GiselleNodeArchetype =
	(typeof giselleNodeArchetypes)[keyof typeof giselleNodeArchetypes];
