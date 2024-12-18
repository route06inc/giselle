import { jsonSchema } from "ai";
import type { GeneratedObject } from "./types";

export const schema = jsonSchema<GeneratedObject>({
	type: "object",
	properties: {
		thinking: {
			type: "string",
			description:
				"How you think about the content of the artefact (purpose, structure, essentials) and how you intend to output it",
		},
		artifact: {
			type: "object",
			properties: {
				title: { type: "string", description: "The title of the artefact" },
				content: {
					type: "string",
					description: "The content of the artefact formatted markdown.",
				},
				citations: {
					type: "array",
					items: {
						type: "object",
						properties: {
							title: {
								type: "string",
								description: "The title of the citation page",
							},
							url: {
								type: "string",
								description: "The URL of the citation page",
							},
						},
					},
				},
				completed: {
					type: "boolean",
					description: "Whether the artefact is completed",
				},
			},
			required: ["title", "citations", "content", "completed"],
		},
		description: {
			type: "string",
			description:
				"Explanation of the Artifact and what the intention was in creating this Artifact. Add any suggestions for making it even better.",
		},
	},
	required: ["thinking", "artifact", "description"],
});
