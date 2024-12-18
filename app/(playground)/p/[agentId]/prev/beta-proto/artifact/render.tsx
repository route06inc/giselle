import { MarkdownRender } from "../giselle-node/components/panel/markdown-render";
import type { Artifact } from "./types";

interface ArtifactRenderProps {
	title: string;
	content: string;
}
export function ArtifactRender(props: ArtifactRenderProps) {
	return (
		<div>
			<div
				className="px-[32px] py-[16px] font-rosart text-[22px] text-black--30 drop-shadow-[0px_0px_20px_0px_hsla(207,_100%,_48%,_1)]"
				style={{
					textShadow: "0px 0px 20px hsla(207, 100%, 48%, 1)",
				}}
			>
				{props.title}
			</div>
			<div className="border-t border-black-40" />
			<div className="overflow-x-hidden overflow-y-auto flex-1">
				<div className="px-[32px] py-[16px] font-rosart text-[18px] text-black-30">
					<MarkdownRender markdownLike={`${props.content}`} />
				</div>
			</div>
		</div>
	);
}
