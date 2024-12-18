import clsx from "clsx";
import type { FC } from "react";
import { PanelCloseIcon } from "../components/icons/panel-close";
import { WilliIcon } from "../components/icons/willi";
import { ArchetypeIcon } from "../giselle-node/components/archetype-icon";
import { TabTrigger } from "../giselle-node/components/tabs";
import {
	type GiselleNode,
	giselleNodeCategories,
	giselleNodeState,
	panelTabs,
} from "../giselle-node/types";
import type { PartialGeneratedObject } from "./types";
import { WebSearchBlock } from "./websearch-block";

function PopPopWillis() {
	return (
		<div className="flex gap-[16px]">
			<WilliIcon className="w-[24px] h-[24px] fill-black-40 animate-[pop-pop_2.1s_steps(1)_infinite]" />
			<WilliIcon className="w-[24px] h-[24px] fill-black-40 animate-[pop-pop_2.1s_steps(1)_0.7s_infinite]" />
			<WilliIcon className="w-[24px] h-[24px] fill-black-40 animate-[pop-pop_2.1s_steps(1)_1.4s_infinite]" />
		</div>
	);
}

type WebSearchPropertyPanelProps = {
	node: GiselleNode;
};
export const WebSearchPropertyPanel: FC<WebSearchPropertyPanelProps> = ({
	node,
}) => {
	return (
		<div className="flex gap-[10px] flex-col h-full">
			<div className="relative z-10 pt-[16px] px-[24px] flex justify-between h-[40px]">
				<button type="button">
					<PanelCloseIcon className="w-[18px] h-[18px] fill-black-30" />
				</button>
				<div className="gap-[16px] flex items-center">
					<TabTrigger value="result">Result</TabTrigger>
				</div>
			</div>
			<div className="bg-black-80 px-[24px] py-[8px] flex items-center justify-between">
				<div className="flex items-center gap-[8px]">
					<div
						className={clsx(
							"rounded-[2px] flex items-center justify-center px-[4px] py-[4px]",
							node.category === giselleNodeCategories.action &&
								"bg-[hsla(187,71%,48%,1)]",
							node.category === giselleNodeCategories.instruction && "bg-white",
						)}
					>
						<ArchetypeIcon
							archetype={node.archetype}
							className="w-[14px] h-[14px] fill-black-100"
						/>
					</div>
					<div className="font-avenir text-[16px] text-black-30">
						{node.archetype}
					</div>
				</div>
			</div>

			{node.ui.panelTab === panelTabs.result && (
				<div className="px-[24px] pb-[16px] overflow-y-auto overflow-x-hidden text-black-30 font-rosart text-[12px]">
					<div className="flex flex-col gap-[8px]">
						{node.state === giselleNodeState.inProgress && (
							<div className="flex justify-center mt-[120px]">
								<div className="flex flex-col gap-[36px]">
									<p className="text-black-30 font-rosart text-[18px]">
										Generating...
									</p>
									<PopPopWillis />
								</div>
							</div>
						)}
						<div>{(node.output as PartialGeneratedObject).plan}</div>
						{(node.output as PartialGeneratedObject).webSearch && (
							<div>
								<WebSearchBlock
									name={(node.output as PartialGeneratedObject).webSearch?.name}
									items={
										(node.output as PartialGeneratedObject).webSearch?.items
									}
									status={
										(node.output as PartialGeneratedObject).webSearch?.status
									}
									node={node}
								/>
							</div>
						)}
						<div>{(node.output as PartialGeneratedObject).description}</div>
					</div>
				</div>
			)}
		</div>
	);
};
