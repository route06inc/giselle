import type { SVGProps } from "react";
import { DocumentIcon } from "../prev/beta-proto/components/icons/document";
import { GlobeIcon } from "../prev/beta-proto/components/icons/globe";
import { PromptIcon } from "../prev/beta-proto/components/icons/prompt";
import { TextGenerationIcon } from "../prev/beta-proto/components/icons/text-generation";
import type { Node } from "../types";

type ContentTypeIconProps = SVGProps<SVGSVGElement> & {
	contentType: Node["content"]["type"];
};
export function ContentTypeIcon({
	contentType,
	...props
}: ContentTypeIconProps) {
	switch (contentType) {
		case "textGeneration":
			return <TextGenerationIcon {...props} />;
		case "webSearch":
			return <GlobeIcon {...props} />;
		case "text":
			return <PromptIcon {...props} />;
		case "file":
			return <DocumentIcon {...props} />;
		case "files":
			return <DocumentIcon {...props} />;
	}
}
