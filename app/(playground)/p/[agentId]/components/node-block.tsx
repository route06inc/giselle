import { ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";
import type { Node } from "../types";
import { ContentTypeIcon } from "./content-type-icon";

export function NodeBlock(props: {
	node: Node;
}) {
	const [expand, setExpand] = useState(false);
	if (expand) {
		return (
			<div className="text-[12px] rounded-[8px] px-[8px] py-[8px]  border border-black-50  text-black-30 group hover:border-black--70 h-[80px]">
				<div className=" flex items-center justify-between">
					<div className="flex items-center gap-[4px]">
						<ContentTypeIcon
							contentType={props.node.content.type}
							className="fill-white w-[12px]"
						/>
						<span className="font-bold">{props.node.name}</span>
					</div>
				</div>
			</div>
		);
	}
	return (
		<button
			type="button"
			className="text-[12px] text-black-30 flex items-center border border-black-50 rounded-[8px] px-[8px] py-[8px] justify-between group hover:border-black--70"
			onClick={() => setExpand(true)}
		>
			<div className="flex items-center gap-[4px]">
				<ContentTypeIcon
					contentType={props.node.content.type}
					className="fill-white w-[12px]"
				/>
				<span className="font-bold">{props.node.name}</span>
			</div>
			<ChevronsUpDownIcon className="w-[16px] h-[16px] text-black-50 group-hover:text-black--70" />
		</button>
	);
}
