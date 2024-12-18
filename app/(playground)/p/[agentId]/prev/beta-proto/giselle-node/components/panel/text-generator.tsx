import clsx from "clsx";
import { CirclePlusIcon, CopyIcon } from "lucide-react";
import type { FC } from "react";
import type {
	GeneratedObject,
	PartialGeneratedObject,
} from "../../../artifact/types";
import {
	Dialog,
	DialogContent,
	DialogTrigger,
} from "../../../components/dialog";
import { PanelCloseIcon } from "../../../components/icons/panel-close";
import { SpinnerIcon } from "../../../components/icons/spinner";
import { WilliIcon } from "../../../components/icons/willi";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "../../../components/select";
import { Slider } from "../../../components/slider";
import { Spinner } from "../../../components/spinner";
import { useFeatureFlags } from "../../../feature-flags/context";
import { useGraph } from "../../../graph/context";
import { updateNode } from "../../../graph/v2/composition/update-node";
import {
	type GiselleNode,
	giselleNodeCategories,
	giselleNodeState,
	panelTabs,
} from "../../types";
import { ArchetypeIcon } from "../archetype-icon";
import { TabTrigger } from "../tabs";
import { ArtifactBlock } from "./artifact-block";
import { MarkdownRender } from "./markdown-render";
import { TemperatureSlider } from "./temperature-slider";
import { TopPSlider } from "./top-p-slider";

function PopPopWillis() {
	return (
		<div className="flex gap-[16px]">
			<WilliIcon className="w-[24px] h-[24px] fill-black-40 animate-[pop-pop_2.1s_steps(1)_infinite]" />
			<WilliIcon className="w-[24px] h-[24px] fill-black-40 animate-[pop-pop_2.1s_steps(1)_0.7s_infinite]" />
			<WilliIcon className="w-[24px] h-[24px] fill-black-40 animate-[pop-pop_2.1s_steps(1)_1.4s_infinite]" />
		</div>
	);
}

type TextGeneratorPropertyPanelProps = {
	node: GiselleNode;
};
export const TextGeneratorPropertyPanel: FC<
	TextGeneratorPropertyPanelProps
> = ({ node }) => {
	const { dispatch } = useGraph();
	const { playgroundV2Flag } = useFeatureFlags();
	return (
		<div className="flex gap-[10px] flex-col h-full">
			<div className="relative z-10 pt-[16px] px-[24px] flex justify-between h-[40px]">
				<button type="button">
					<PanelCloseIcon className="w-[18px] h-[18px] fill-black-30" />
				</button>
				<div className="gap-[16px] flex items-center">
					{playgroundV2Flag && <TabTrigger value="prompt">Prompt</TabTrigger>}
					<TabTrigger value="property">Property</TabTrigger>
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
				<div className="">
					<button
						type="button"
						className="relative z-10 rounded-[8px] shadow-[0px_0px_3px_0px_#FFFFFF40_inset] py-[4px] px-[8px] bg-black-80 text-black-30 font-rosart text-[14px] disabled:bg-black-40"
					>
						Generate
					</button>
				</div>
			</div>

			{node.ui.panelTab === panelTabs.prompt && (
				<div className="px-[16px] pb-[16px] overflow-y-auto overflow-x-hidden">
					<div>
						<div className="relative z-10 flex flex-col gap-[10px]">
							<div className="grid gap-[8px] pb-[14px]">
								<label
									htmlFor="text"
									className="font-rosart text-[16px] text-black-30"
								>
									Instruction
								</label>
								<textarea
									name="text"
									id="text"
									className="w-full text-[14px] h-[200px] bg-[hsla(222,21%,40%,0.3)] rounded-[8px] text-white p-[14px] font-rosart outline-none resize-none"
								/>
							</div>
							<div className="border-t border-[hsla(222,21%,40%,1)]" />
							<div className="grid gap-[8px]">
								<div className="flex justify-between">
									<div className="font-rosart text-[16px] text-black-30">
										Requirements
									</div>
									<button type="button">
										<CirclePlusIcon
											size={20}
											className="stroke-black-100 fill-black-30"
										/>
									</button>
								</div>
							</div>
							<div className="border-t border-[hsla(222,21%,40%,1)]" />
							<div className="grid gap-[8px]">
								<div className="flex justify-between">
									<div className="font-rosart text-[16px] text-black-30">
										Sources
									</div>
									<button type="button">
										<CirclePlusIcon
											size={20}
											className="stroke-black-100 fill-black-30"
										/>
									</button>

									{/* <div className="flex items-center gap-[4px]">
										<AddSourceDialog node={node} />
										<Popover.Root>
											<Popover.Trigger asChild>
												<button type="button">
													<CirclePlusIcon
														size={20}
														className="stroke-black-100 fill-black-30"
													/>
												</button>
											</Popover.Trigger>
											<Popover.Content
												side={"top"}
												align="end"
												className="rounded-[16px] p-[8px] text-[14px] w-[200px] text-black-30 bg-black-100 border border-[hsla(222,21%,40%,1)] shadow-[0px_0px_2px_0px_hsla(0,_0%,_100%,_0.1)_inset] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
												sideOffset={5}
											>
												<div className="px-[8px]">
													<div>
														{availableArtifactsOrWebSearches.map(
															(artifactOrWebSearch) =>
																artifactOrWebSearch.object === "artifact" ? (
																	<button
																		type="button"
																		className="flex justify-between items-center py-[4px] w-full"
																		key={artifactOrWebSearch.id}
																		onClick={handleArtifactClick(
																			artifactOrWebSearch,
																		)}
																	>
																		<p className="line-clamp-1 text-left">
																			{artifactOrWebSearch.title}
																		</p>
																		{sources.some(
																			(source) =>
																				source.id === artifactOrWebSearch.id,
																		) && (
																			<CheckIcon
																				size={16}
																				className="stroke-white flex-shrink-0"
																			/>
																		)}
																	</button>
																) : (
																	<button
																		type="button"
																		className="flex justify-between items-center py-[4px] w-full"
																		key={artifactOrWebSearch.id}
																		onClick={handleWebSearchClick(
																			artifactOrWebSearch,
																		)}
																	>
																		<p className="line-clamp-1 text-left">
																			{artifactOrWebSearch.name}
																		</p>
																		{sources.some(
																			(source) =>
																				source.id === artifactOrWebSearch.id,
																		) && (
																			<CheckIcon
																				size={16}
																				className="stroke-white flex-shrink-0"
																			/>
																		)}
																	</button>
																),
														)}
													</div>
												</div>
											</Popover.Content>
										</Popover.Root>
									</div> */}
								</div>
								<div className="grid grid-cols-2 gap-4">
									{/*sources.map((source) =>
										source.object === "artifact" ? (
											<ArtifactBlock
												key={source.id}
												title={source.title}
												node={source.generatorNode}
												content={source.content}
												completed={true}
											/>
										) : source.object === "file" ? (
											<Block
												key={source.id}
												title={source.name}
												description={
													source.status === "uploading"
														? "Uploading..."
														: source.status === "processing"
															? "Processing..."
															: source.status === "processed"
																? "Ready"
																: "Pending"
												}
												icon={
													<DocumentIcon className="w-[18px] h-[18px] fill-black-30 flex-shrink-0" />
												}
											/>
										) : source.object === "webSearch" ? (
											<Block
												key={source.id}
												title={source.name}
												icon={
													<TextsIcon className="w-[18px] h-[18px] fill-black-30 flex-shrink-0" />
												}
											/>
										) : (
											<Block
												key={source.id}
												title={source.title}
												icon={
													<TextsIcon className="w-[18px] h-[18px] fill-black-30 flex-shrink-0" />
												}
												onDelete={removeTextContent({ id: source.id })}
											/>
										),
									)} */}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
			{node.ui.panelTab === panelTabs.property && (
				<div className="px-[16px] pb-[16px] overflow-y-auto overflow-x-hidden">
					<div>
						<div className="relative z-10 flex flex-col gap-[10px]">
							<div className="grid gap-[8px]">
								<label
									htmlFor="text"
									className="font-rosart text-[16px] text-black-30"
								>
									LLM
								</label>
								<Select
									value={
										(node.properties.llm as string) ?? "openai:gpt-4o-mini"
									}
									onValueChange={(value) => {
										dispatch(
											updateNode({
												input: {
													nodeId: node.id,
													properties: {
														...node.properties,
														llm: value,
													},
												},
											}),
										);
									}}
								>
									<SelectTrigger className="w-[280px]">
										<SelectValue placeholder="Select a timezone" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectLabel>OpenAI</SelectLabel>
											<SelectItem value="openai:gpt-4o">gpt-4o</SelectItem>
											<SelectItem value="openai:gpt-4o-mini">
												gpt-4o-mini
											</SelectItem>
										</SelectGroup>
										<SelectGroup>
											<SelectLabel>Anthropic </SelectLabel>
											<SelectItem value="anthropic:claude-3.5-sonnet">
												Claude 3.5 Sonnet
											</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
							<div className="border-t border-[hsla(222,21%,40%,1)]" />
							<div className="grid gap-[16px]">
								<div className="font-rosart text-[16px] text-black-30">
									Parameters
								</div>
								<div className="grid gap-[16px]">
									<TemperatureSlider
										value={(node.properties.temperature as number) ?? 1.0}
										onChange={(temperature) => {
											dispatch(
												updateNode({
													input: {
														nodeId: node.id,
														properties: {
															...node.properties,
															temperature,
														},
													},
												}),
											);
										}}
									/>
								</div>
								<TopPSlider
									value={(node.properties.topP as number) ?? 1.0}
									onChange={(topP) => {
										dispatch(
											updateNode({
												input: {
													nodeId: node.id,
													properties: {
														...node.properties,
														topP,
													},
												},
											}),
										);
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
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
						<div>{(node.output as PartialGeneratedObject).thinking}</div>
						{(node.output as PartialGeneratedObject).artifact?.content && (
							<div>
								<ArtifactBlock
									title={
										(node.output as PartialGeneratedObject).artifact?.title
									}
									content={
										(node.output as PartialGeneratedObject).artifact?.content
									}
									completed={
										(node.output as PartialGeneratedObject).artifact?.completed
									}
									citations={
										(node.output as PartialGeneratedObject).artifact?.citations
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
