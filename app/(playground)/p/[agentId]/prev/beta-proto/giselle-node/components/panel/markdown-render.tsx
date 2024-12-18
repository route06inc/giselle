import { useEffect, useState } from "react";
import { remark } from "remark";
import html from "remark-html";

type MarkdownRenderProps = {
	markdownLike: string;
};
export function MarkdownRender(props: MarkdownRenderProps) {
	const [markdown, setMarkdown] = useState("");
	useEffect(() => {
		remark()
			.use(html)
			.process(props.markdownLike)
			.then((parsedContent) => {
				setMarkdown(parsedContent.toString());
			});
	}, [props.markdownLike]);
	if (markdown === "") {
		return null;
	}

	return (
		<div
			// biome-ignore lint: lint/security/noDangerouslySetInnerHtml
			dangerouslySetInnerHTML={{ __html: markdown }}
			className="prose prose-sm prose-giselle max-w-none"
		/>
	);
}
