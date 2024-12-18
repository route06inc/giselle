interface Element {
	type: string;
	element_id: string;
	text: string;
	metadata: {
		languages: string[];
		page_number: number;
		filename: string;
		filetype: string;
		parent_id?: string;
	};
}

/**
 * Check if the given object is an Unstructured Element.
 * Now, it's not check metadata field because it's not used in the function.
 */
function isElement(obj: unknown): obj is Element {
	return (
		typeof obj === "object" &&
		obj !== null &&
		typeof (obj as Element).type === "string" &&
		typeof (obj as Element).element_id === "string" &&
		typeof (obj as Element).text === "string"
		// typeof (obj as Element).metadata === "object" &&
		// (obj as Element).metadata !== null &&
		// Array.isArray((obj as Element).metadata.languages) &&
		// typeof (obj as Element).metadata.page_number === "number" &&
		// typeof (obj as Element).metadata.filename === "string" &&
		// typeof (obj as Element).metadata.filetype === "string" &&
		// (typeof (obj as Element).metadata.parent_id === "string" ||
		// 	(obj as Element).metadata.parent_id === undefined)
	);
}

export function elementsToMarkdown(elementLikes: unknown[]): string {
	let markdown = "";
	let currentTitle = "";

	for (const elementLike of elementLikes) {
		if (!isElement(elementLike)) {
			continue;
		}
		switch (elementLike.type) {
			case "Title": {
				const titleLevel = currentTitle ? "##" : "#";
				markdown += `${titleLevel} ${elementLike.text}\n\n`;
				currentTitle = elementLike.text;
				break;
			}
			case "Header":
				markdown += `### ${elementLike.text}\n\n`;
				break;
			case "NarrativeText":
			case "UncategorizedText":
				markdown += `${elementLike.text}\n\n`;
				break;
			default:
				// Handle other types if needed
				break;
		}
	}

	return markdown.trim();
}
