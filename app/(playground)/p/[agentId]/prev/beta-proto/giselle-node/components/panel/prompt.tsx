import * as Popover from "@radix-ui/react-popover";
import clsx from "clsx";
import { CheckIcon, CirclePlusIcon } from "lucide-react";
import {
	type FC,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Artifact, ArtifactReference } from "../../../artifact/types";
import { DocumentIcon } from "../../../components/icons/document";
import { PanelCloseIcon } from "../../../components/icons/panel-close";
import { TextsIcon } from "../../../components/icons/texts";
import type { ConnectorObject } from "../../../connector/types";
import type { GiselleFile } from "../../../files/types";
import {
	generateText as generateTextAction,
	setNodeOutput,
	updateNodeProperty,
	updateNodesUI,
} from "../../../graph/actions";
import { type CompositeAction, useGraph } from "../../../graph/context";
import { addSource } from "../../../graph/v2/composition/add-source";
import { removeSource } from "../../../graph/v2/composition/remove-source";
import { updateNode } from "../../../graph/v2/composition/update-node";
import type {
	TextContent,
	TextContentReference,
} from "../../../text-content/types";
import type { WebSearch } from "../../../web-search/types";
import {
	type GiselleNode,
	type GiselleNodeId,
	giselleNodeCategories,
	panelTabs,
} from "../../types";
import { ArchetypeIcon } from "../archetype-icon";
import { TabTrigger } from "../tabs";
import { AddSourceDialog } from "./add-source-dialog";
import { ArtifactBlock } from "./artifact-block";
import { Block } from "./block";

function setTextToPropertyAndOutput(
	nodeId: GiselleNodeId,
	text: string,
): CompositeAction {
	return (dispatch) => {
		dispatch(
			updateNodeProperty({
				node: {
					id: nodeId,
					property: {
						key: "text",
						value: text,
					},
				},
			}),
		);
		dispatch(
			setNodeOutput({
				node: {
					id: nodeId,
					output: text,
				},
			}),
		);
	};
}

interface CreateGenerateTextActionInput {
	outgoingConnections: ConnectorObject[];
}
function createGenerateTextAction({
	input,
}: { input: CreateGenerateTextActionInput }): CompositeAction {
	return (dispatch, getState) => {
		input.outgoingConnections.map((connector) => {
			dispatch(
				updateNode({
					input: {
						nodeId: connector.target,
						ui: {
							isInflluencable: false,
						},
					},
				}),
			);
		});

		const selectedNodes = getState().graph.nodes.filter(
			(node) => node.ui.selected,
		);
		selectedNodes.map((node) => {
			dispatch(
				updateNode({
					input: {
						nodeId: node.id,
						ui: {
							selected: false,
						},
					},
				}),
			);
		});
		dispatch(
			updateNode({
				input: {
					nodeId: input.outgoingConnections[0].target,
					ui: {
						selected: true,
						panelTab: panelTabs.result,
					},
				},
			}),
		);
		dispatch(
			generateTextAction({
				textGeneratorNode: {
					id: input.outgoingConnections[0].target,
				},
			}),
		);
	};
}

type Source = ArtifactReference | TextContent | GiselleFile | WebSearch;

type PromptPropertyPanelProps = {
	node: GiselleNode;
};
export const PromptPropertyPanel: FC<PromptPropertyPanelProps> = ({ node }) => {
	const { state, dispatch } = useGraph();
	const outgoingConnections = useMemo(
		() =>
			state.graph.connectors.filter(
				(connector) => connector.source === node.id,
			),
		[state.graph.connectors, node.id],
	);
	const [text, setText] = useState<string>(
		(node.properties?.text as string) ?? "",
	);
	const handleMouseEnter = useCallback(() => {
		outgoingConnections.map((connector) => {
			dispatch(
				updateNode({
					input: {
						nodeId: connector.target,
						ui: {
							isInflluencable: true,
						},
					},
				}),
			);
		});
	}, [dispatch, outgoingConnections]);

	const handleMouseLeave = useCallback(() => {
		outgoingConnections.map((connector) => {
			dispatch(
				updateNode({
					input: {
						nodeId: connector.target,
						ui: {
							isInflluencable: false,
						},
					},
				}),
			);
		});
	}, [dispatch, outgoingConnections]);

	const handleBlur = useCallback(
		(event: React.FormEvent<HTMLTextAreaElement>) => {
			event.preventDefault();
			dispatch(setTextToPropertyAndOutput(node.id, text));
		},
		[dispatch, node.id, text],
	);
	const handleClick = useCallback(() => {
		dispatch(
			createGenerateTextAction({
				input: {
					outgoingConnections,
				},
			}),
		);
	}, [dispatch, outgoingConnections]);

	const availableArtifactsOrWebSearches = useMemo<(Artifact | WebSearch)[]>(
		() => [
			...state.graph.artifacts.filter(
				(artifact) =>
					!outgoingConnections.some(
						({ target }) => target === artifact.generatorNode.id,
					),
			),
			...state.graph.webSearches.filter(
				(webSearch) =>
					!outgoingConnections.some(
						({ target }) => target === webSearch.generatorNode.id,
					),
			),
		],
		[outgoingConnections, state.graph.artifacts, state.graph.webSearches],
	);
	const sources = useMemo<(Artifact | TextContent | GiselleFile | WebSearch)[]>(
		() =>
			(node.properties.sources as Source[])
				?.map((source) =>
					source.object === "textContent" ||
					source.object === "file" ||
					source.object === "webSearch"
						? source
						: state.graph.artifacts.find(
								(artifact) => artifact.id === source.id,
							),
				)
				.filter((artifactIdsOrNull) => artifactIdsOrNull != null) ?? [],
		[node.properties.sources, state.graph.artifacts],
	);
	const handleArtifactClick = useCallback(
		(artifact: Artifact) => () => {
			const artifactIds = sources.map(({ id }) => id);
			if (artifactIds.includes(artifact.id)) {
				dispatch(
					removeSource({
						input: {
							nodeId: node.id,
							source: {
								id: artifact.id,
								object: "artifact.reference",
							},
						},
					}),
				);
			} else {
				dispatch(
					addSource({
						input: {
							nodeId: node.id,
							source: {
								id: artifact.id,
								object: "artifact.reference",
							},
						},
					}),
				);
			}
		},
		[dispatch, node.id, sources],
	);
	const handleWebSearchClick = useCallback(
		(webSearch: WebSearch) => () => {
			const webSearchIds = sources.map(({ id }) => id);
			if (webSearchIds.includes(webSearch.id)) {
				dispatch(
					removeSource({
						input: {
							nodeId: node.id,
							source: webSearch,
						},
					}),
				);
			} else {
				dispatch(
					addSource({
						input: {
							nodeId: node.id,
							source: webSearch,
						},
					}),
				);
			}
		},
		[dispatch, node.id, sources],
	);
	const removeTextContent = useCallback(
		(textContent: Pick<TextContentReference, "id">) => () => {
			dispatch(
				removeSource({
					input: {
						nodeId: node.id,
						source: {
							id: textContent.id,
							object: "textContent.reference",
						},
					},
				}),
			);
		},
		[dispatch, node.id],
	);
	const instructionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
	useEffect(() => {
		if (instructionTextareaRef.current === null) {
			return;
		}
		if (node.ui.forceFocus) {
			instructionTextareaRef.current.focus();
		}
	}, [node]);
	return (
		<div className="flex gap-[10px] flex-col h-full">
			<div className="relative z-10 pt-[16px] px-[24px] flex justify-between h-[40px]">
				<button type="button">
					<PanelCloseIcon className="w-[18px] h-[18px] fill-black-30" />
				</button>
				<div className="gap-[16px] flex items-center">
					<TabTrigger value="property">Property</TabTrigger>
				</div>
			</div>
			<div className="bg-black-80 px-[24px] flex items-center justify-between  h-[48px]">
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
						disabled={text.length === 0}
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
						onClick={handleClick}
					>
						Push Value
					</button>
				</div>
			</div>

			{node.ui.panelTab === panelTabs.property && (
				<div className="px-[16px] pb-[16px] overflow-y-auto">
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
									onBlur={handleBlur}
									value={text}
									onChange={(event) => {
										setText(event.target.value);
										if (node.ui.forceFocus && event.target.value !== "") {
											dispatch(
												updateNodesUI({
													nodes: [{ id: node.id, ui: { forceFocus: false } }],
												}),
											);
										}
									}}
									ref={instructionTextareaRef}
								/>
							</div>

							<div className="border-t border-[hsla(222,21%,40%,1)]" />
							<div className="grid gap-[8px]">
								<div className="flex justify-between">
									<div className="font-rosart text-[16px] text-black-30">
										Sources
									</div>
									<div className="flex items-center gap-[4px]">
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
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									{sources.map((source) =>
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
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
