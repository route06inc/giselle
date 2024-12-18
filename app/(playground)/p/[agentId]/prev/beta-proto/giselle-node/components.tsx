import { clsx } from "clsx/lite";
import { type FC, useMemo } from "react";
import { PanelCloseIcon } from "../components/icons/panel-close";
import type { ConnectorObject } from "../connector/types";
import { useGraph } from "../graph/context";
import { WebSearchPropertyPanel } from "../web-search/panel";
import { giselleNodeArchetypes } from "./blueprints";
import { ArchetypeIcon } from "./components/archetype-icon";
import { PromptPropertyPanel } from "./components/panel/prompt";
import { TextGeneratorPropertyPanel } from "./components/panel/text-generator";
import {
	type GiselleNodeBlueprint,
	type GiselleNodeCategory,
	type GiselleNode as GiselleNodeType,
	giselleNodeCategories,
} from "./types";

type PortHandleProps = {
	id: string;
	className?: string;
	state?: string;
};

type GiselleNodeProps = (GiselleNodeBlueprint | GiselleNodeType) & {
	parameterPortHandle?: FC<PortHandleProps>;
	resultPortHandle?: FC<PortHandleProps>;
	incomingConnections?: ConnectorObject[];
	outgoingConnections?: ConnectorObject[];
	debug?: boolean;
};

type TargetParameterProps = {
	id: string;
	handle?: FC<PortHandleProps>;
	label: string;
	category: GiselleNodeCategory;
};
const TargetParameter: FC<TargetParameterProps> = ({
	id,
	handle: Handle,
	label,
	category,
}) => (
	<div className="relative flex items-center h-[28px]">
		{Handle && (
			<div
				className={clsx(
					"*:!absolute *:!w-[6px] *:!h-[12px] *:!rounded-l-[12px] *:!rounded-r-none *:!top-[50%] *:!-translate-y-[50%] *:!-left-[10px]",
					category === giselleNodeCategories.action &&
						"*:!bg-[hsla(187,71%,48%,1)]",
					category === giselleNodeCategories.instruction &&
						"*:!bg-[hsla(236,7%,39%,1)]",
				)}
			>
				<Handle id={id} />
			</div>
		)}
		<div className="text-[14px] text-black--30 px-[12px]">{label}</div>
	</div>
);

type SourceParameterProps = {
	id: string;
	handle?: FC<PortHandleProps>;
	label: string;
	category: GiselleNodeCategory;
	connections: ConnectorObject[];
};
const SourceParameter: FC<SourceParameterProps> = ({
	id,
	handle: Handle,
	label,
	category,
	connections,
}) => (
	<div className="relative flex items-center h-[28px]">
		{Handle && (
			<div className="absolute -right-[10px] translate-x-[6px]">
				<div
					className={clsx(
						"h-[28px] w-[10px]",
						category === giselleNodeCategories.action &&
							"bg-[hsla(195,74%,21%,1)]",
						category === giselleNodeCategories.instruction &&
							"bg-[hsla(236,7%,39%,1)]",
					)}
				/>
				{Handle && (
					<Handle
						id={id}
						className={clsx(
							"!w-[12px] !absolute !h-[12px] !rounded-full !bg-black-100 !border-[2px] !top-[50%] !-translate-y-[50%] !translate-x-[5px]",
							category === giselleNodeCategories.action &&
								"!border-[hsla(195,74%,21%,1)] data-[state=connected]:!bg-[hsla(187,71%,48%,1)] hover:!bg-[hsla(187,71%,48%,1)]",
							category === giselleNodeCategories.instruction &&
								"!border-[hsla(236,7%,39%,1)] data-[state=connected]:!bg-white",
						)}
						state={connections.length ? "connected" : "disconnected"}
					/>
				)}
			</div>
		)}
		<div className="text-[14px] text-black--30 px-[12px]">{label}</div>
	</div>
);

export function GiselleNode(props: GiselleNodeProps) {
	return (
		<div
			className={clsx(
				"relative rounded-[16px] bg-gradient-to-tl min-w-[180px] backdrop-blur-[1px] transition-shadow",
				props.category === giselleNodeCategories.action &&
					"from-[hsla(187,79%,54%,0.2)] to-[hsla(207,100%,9%,0.2)]",
				props.category === giselleNodeCategories.instruction &&
					"from-[hsla(0,0%,91%,0.2)] to-[hsla(0,0%,16%,0.2)]",
				props.object === "node" &&
					props.ui.selected &&
					"shadow-[0px_0px_16px_0px_hsla(187,_79%,_54%,_0.5)]",
				props.object === "node" &&
					props.ui.isInflluencable &&
					"shadow-[0px_0px_16px_0px_hsla(187,_79%,_54%,_0.5)]",
				props.object === "nodeBlueprint" && "opacity-50",
			)}
		>
			<div
				className={clsx(
					"absolute z-0 rounded-[16px] inset-0 border mask-fill bg-gradient-to-br bg-origin-border bg-clip-boarder border-transparent",
					props.category === giselleNodeCategories.action &&
						"from-[hsla(187,79%,54%,1)] to-[hsla(187,68%,30%,1)]",
					props.category === giselleNodeCategories.instruction &&
						"from-[hsla(0,0%,91%,1)] to-[hsla(0,0%,35%,1)]",
				)}
			/>
			{props.object === "node" && (
				<div className="absolute text-black-30 font-rosart text-[12px] -translate-y-full left-[8px] -top-[2px] flex items-center gap-[12px]">
					{props.isFinal && <span>Final</span>}
					{props.name}
				</div>
			)}
			<div
				className={clsx(
					"py-[12px] rounded-t-[16px]",
					props.category === giselleNodeCategories.action &&
						"bg-[hsla(187,71%,48%,0.3)]",
					props.category === giselleNodeCategories.instruction &&
						"bg-[hsla(0,0%,93%,0.3)]",
				)}
			>
				<div className="flex items-center gap-[8px] px-[12px]">
					<div
						className={clsx(
							"w-[28px] h-[28px] flex items-center justify-center rounded-[4px] shadow-[1px_1px_12px_0px]",
							props.category === giselleNodeCategories.action &&
								"bg-[hsla(187,71%,48%,1)] shadow-[hsla(182,73%,52%,0.8)]",
							props.category === giselleNodeCategories.instruction &&
								"bg-white shadow-[hsla(0,0%,93%,0.8)]",
						)}
					>
						<ArchetypeIcon
							archetype={props.archetype}
							className="w-[18px] h-[18px] fill-black-100"
						/>
					</div>
					<div className="font-rosart text-[16px] text-black-30">
						{props.archetype}
					</div>
				</div>
			</div>
			<div className="py-[4px]">
				<div className="flex justify-between h-full">
					<div className="grid">
						{props.parameters?.object === "objectParameter" &&
							Object.entries(props.parameters.properties).map(
								([key, property]) => (
									<TargetParameter
										key={key}
										id={key}
										label={property.label ?? key}
										handle={props.parameterPortHandle}
										category={props.category}
									/>
								),
							)}
						{props.parameters?.object === "objectParameterBlueprint" &&
							Object.entries(props.parameters.properties).map(
								([key, property]) => (
									<TargetParameter
										key={key}
										id={key}
										label={property.label ?? key}
										category={props.category}
									/>
								),
							)}
					</div>

					<div className="grid">
						<SourceParameter
							id="result"
							label={props.resultPortLabel}
							category={props.category}
							connections={props.outgoingConnections ?? []}
							handle={props.resultPortHandle}
						/>
					</div>
				</div>
			</div>
			{props.debug && props.object === "node" && (
				<div className="absolute top-[calc(100%+8px)] left-[8px] right-[8px] font-mono text-[8px] py-[4px] px-[8px] bg-black-100/30 border border-black-70 text-black--30">
					<div className="flex flex-col gap-[4px]">
						<div>Debug info</div>
						<div>id: {props.id}</div>
						<div>state: {props.state}</div>
						<div>incoming: {props.incomingConnections?.length ?? 0}</div>
						<div>outgoing: {props.outgoingConnections?.length ?? 0}</div>
						<div>property: {JSON.stringify(props.properties, null, 2)}</div>
						<div>ui: {JSON.stringify(props.ui, null, 2)}</div>
						<div>isFinal: {JSON.stringify(props.isFinal)}</div>
					</div>
				</div>
			)}
		</div>
	);
}

export const GiselleNodeInformationPanel: FC = () => {
	const { state } = useGraph();
	const selectedNodes = useMemo(
		() => state.graph.nodes.filter((node) => node.ui.selected),
		[state.graph.nodes],
	);
	return (
		<div className="absolute bg-black-100 w-[380px] rounded-[16px] overflow-hidden shadow-[0px_0px_8px_0px_hsla(0,_0%,_100%,_0.2)] top-[0px] bottom-[20px] right-[20px] mt-[60px]">
			<div className="absolute z-0 rounded-[16px] inset-0 border mask-fill bg-gradient-to-br bg-origin-border bg-clip-boarder border-transparent from-[hsla(233,4%,37%,1)] to-[hsla(233,62%,22%,1)]" />

			{selectedNodes.length > 1 ? (
				<div className="grid gap-[10px]">
					<div className="relative z-10 pt-[16px] px-[24px] flex justify-between h-[40px]">
						<button type="button">
							<PanelCloseIcon className="w-[18px] h-[18px] fill-black-30" />
						</button>
					</div>
					<div className="h-[380px] flex flex-col gap-[8px] items-center justify-center">
						<div className="font-avenir text-[18px] font-[800px] text-black-30">
							{selectedNodes.length} nodes selected
						</div>
					</div>
				</div>
			) : selectedNodes.length < 1 ? (
				<div className="grid gap-[10px]">
					<div className="relative z-10 pt-[16px] px-[24px] flex justify-between h-[40px]">
						<button type="button">
							<PanelCloseIcon className="w-[18px] h-[18px] fill-black-30" />
						</button>
					</div>
					<div className="h-[380px] flex flex-col gap-[8px] items-center justify-center">
						<div className="font-avenir text-[18px] font-[800px] text-black-30">
							No selected node...
						</div>
						<p className="text-black-70 w-[320px] text-center leading-[20px] text-[12px]">
							Here you will find information on the nodes that are parts of the
							workflow you have assembled. Click on a node!
						</p>
					</div>
				</div>
			) : (
				<>
					{selectedNodes[0].archetype === giselleNodeArchetypes.prompt && (
						<PromptPropertyPanel
							node={selectedNodes[0]}
							key={selectedNodes[0].id}
						/>
					)}
					{selectedNodes[0].archetype ===
						giselleNodeArchetypes.textGenerator && (
						<TextGeneratorPropertyPanel
							node={selectedNodes[0]}
							key={selectedNodes[0].id}
						/>
					)}
					{selectedNodes[0].archetype === giselleNodeArchetypes.webSearch && (
						<WebSearchPropertyPanel
							node={selectedNodes[0]}
							key={selectedNodes[0].id}
						/>
					)}
				</>
			)}
		</div>
	);
};
