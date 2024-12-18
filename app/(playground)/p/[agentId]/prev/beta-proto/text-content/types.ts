export type TextContentId = `txt_${string}`;
export type TextContent = {
	id: TextContentId;
	object: "textContent";
	title: string;
	content: string;
};
export type TextContentReference = {
	id: TextContentId;
	object: "textContent.reference";
};
