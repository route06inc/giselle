import type { FC, SVGProps } from "react";
import { GlobeIcon } from "../../beta-proto/components/icons/globe";
import { PromptIcon } from "../../beta-proto/components/icons/prompt";
import { TextGenerationIcon } from "../../beta-proto/components/icons/text-generation";
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
	}
}