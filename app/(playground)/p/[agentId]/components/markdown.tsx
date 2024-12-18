import { type ReactNode, useEffect, useState } from "react";
import { remark } from "remark";
import html from "remark-html";

export function Markdown(props: {
	children: ReactNode;
}) {
	const [markdown, setMarkdown] = useState("");
	useEffect(() => {
		remark()
			.use(html)
			.process(String(props.children))
			.then((parsedContent) => {
				setMarkdown(parsedContent.toString());
			});
	}, [props.children]);
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
