import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { upload } from "@vercel/blob/client";
import { readStreamableValue } from "ai/rsc";
import clsx from "clsx/lite";
import {
	ArrowUpFromLineIcon,
	ChevronsUpDownIcon,
	Minimize2Icon,
	TrashIcon,
} from "lucide-react";
import {
	type ComponentProps,
	type FC,
	type HTMLAttributes,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react";
import { DocumentIcon } from "../../beta-proto/components/icons/document";
import { PanelCloseIcon } from "../../beta-proto/components/icons/panel-close";
import { PanelOpenIcon } from "../../beta-proto/components/icons/panel-open";
import { WilliIcon } from "../../beta-proto/components/icons/willi";
import { action, parse } from "../actions";
import { vercelBlobFileFolder } from "../constants";
import {
	useArtifact,
	useGraph,
	useNode,
	useSelectedNode,
} from "../contexts/graph";
import { usePropertiesPanel } from "../contexts/properties-panel";
import type {
	FileContent,
	Node,
	NodeHandle,
	NodeId,
	Text,
	TextArtifactObject,
	TextContent,
	TextGenerateActionContent,
} from "../types";
import {
	createArtifactId,
	createConnectionId,
	createFileId,
	createNodeHandleId,
	isFile,
	isText,
	isTextGeneration,
	pathJoin,
} from "../utils";
import { Block } from "./block";
import { ContentTypeIcon } from "./content-type-icon";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "./select";
import { Slider } from "./slider";

function PropertiesPanelContentBox({
	children,
	className,
}: { children: ReactNode; className?: string }) {
	return (
		<div className={clsx("px-[24px] py-[8px]", className)}>{children}</div>
	);
}

interface PropertiesPanelCollapsible {
	title: string;
	glanceLabel?: string;
	children: ReactNode;
}

function PropertiesPanelCollapsible({
	title,
	glanceLabel,
	children,
}: PropertiesPanelCollapsible) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<>
			{isExpanded ? (
				<PropertiesPanelContentBox className="text-black-30 grid gap-2">
					<div className="flex justify-between items-center">
						<p className="font-rosart">{title}</p>
						<button type="button" onClick={() => setIsExpanded(false)}>
							<Minimize2Icon
								size={16}
								className="text-black-50 hover:text-black-30"
							/>
						</button>
					</div>
					{children}
				</PropertiesPanelContentBox>
			) : (
				<button type="button" onClick={() => setIsExpanded(true)}>
					<PropertiesPanelContentBox className="text-black-30 flex justify-between items-center group">
						<div className="flex gap-2 items-center">
							<p className="font-rosart">{title}</p>
							{glanceLabel && (
								<span className="text-[10px] text-black-50">{glanceLabel}</span>
							)}
						</div>
						<ChevronsUpDownIcon
							size={16}
							className="text-black-50 group-hover:text-black-30"
						/>
					</PropertiesPanelContentBox>
				</button>
			)}
		</>
	);
}

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

function HoverCardContent({
	className,
	align = "center",
	sideOffset = 4,
	side = "left",
	...props
}: ComponentProps<typeof HoverCardPrimitive.Content>) {
	return (
		<HoverCardPrimitive.Content
			align={align}
			side={side}
			sideOffset={sideOffset}
			className="z-50 w-64 rounded-[16px] border border-black-70 bg-black-100 p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
			{...props}
		/>
	);
}
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

const Tabs = TabsPrimitive.Root;

function TabsList(props: ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List className="gap-[16px] flex items-center" {...props} />
	);
}
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger: FC<ComponentProps<typeof TabsPrimitive.Trigger>> = ({
	ref,
	className,
	...props
}) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className="font-rosart text-[16px] text-black-70 hover:text-black-30/70 data-[state=active]:text-black-30 py-[6px] px-[2px]"
		{...props}
	/>
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent: FC<ComponentProps<typeof TabsPrimitive.Content>> = ({
	ref,
	...props
}) => (
	<TabsPrimitive.Content
		ref={ref}
		className="overflow-y-auto overflow-x-hidden"
		{...props}
	/>
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

function DialogOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			className="fixed inset-0 z-50 bg-black-100/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
			{...props}
		/>
	);
}
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

function DialogContent({
	children,
	...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				className={clsx(
					"fixed left-[50%] top-[50%] z-50",
					"w-[800px] h-[90%] overflow-hidden translate-x-[-50%] translate-y-[-50%]",
					"px-[32px] py-[32px] flex",
					"font-rosart bg-black-100 rounded-[16px] shadow-[0px_0px_3px_0px_hsla(0,_0%,_100%,_0.25)_inset,0px_0px_8px_0px_hsla(0,_0%,_100%,_0.2)]",
					"duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
				)}
				{...props}
			>
				<div className="relative z-10 flex flex-col">{children}</div>
				<div className="absolute z-0 rounded-[16px] inset-0 border mask-fill bg-gradient-to-br bg-origin-border bg-clip-boarder border-transparent from-[hsla(233,4%,37%,1)] to-[hsla(233,62%,22%,1)]" />
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader(props: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className="flex flex-col space-y-1.5 text-center sm:text-left"
			{...props}
		/>
	);
}
DialogHeader.displayName = "DialogHeader";

function DialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			className="text-lg font-semibold leading-none tracking-tight"
			{...props}
		/>
	);
}

function DialogFooter(props: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className="flex flex-col space-y-1.5 text-center sm:text-left"
			{...props}
		/>
	);
}
DialogFooter.displayName = "DialogHeader";

export function PropertiesPanel() {
	const { graph, dispatch, flush } = useGraph();
	const selectedNode = useSelectedNode();
	const { open, setOpen, tab, setTab } = usePropertiesPanel();
	return (
		<div
			className={clsx(
				"absolute bg-black-100 rounded-[16px] overflow-hidden shadow-[0px_0px_8px_0px_hsla(0,_0%,_100%,_0.2)] top-[0px] right-[20px] mt-[60px]",
				"data-[state=show]:w-[380px] data-[state=show]:bottom-[20px]",
			)}
			data-state={open ? "show" : "hidden"}
		>
			<div className="absolute z-0 rounded-[16px] inset-0 border mask-fill bg-gradient-to-br bg-origin-border bg-clip-boarder border-transparent from-[hsla(233,4%,37%,1)] to-[hsla(233,62%,22%,1)]" />
			{open ? (
				<Tabs
					className="h-full overflow-y-hidden flex flex-col"
					value={tab}
					onValueChange={(v) => setTab(v)}
				>
					<div className="relative z-10 flex justify-between items-center pl-[16px] pr-[24px] py-[10px] h-[56px]">
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="p-[8px]"
						>
							<PanelCloseIcon className="w-[18px] h-[18px] fill-black-70 hover:fill-black-30" />
						</button>
						<TabsList>
							{selectedNode?.content?.type === "textGeneration" && (
								<>
									<TabsTrigger value="Prompt">Prompt</TabsTrigger>
									<TabsTrigger value="Result">Result</TabsTrigger>
								</>
							)}
							{selectedNode?.content?.type === "text" && (
								<TabsTrigger value="Text">Text</TabsTrigger>
							)}
							{selectedNode?.content?.type === "file" && (
								<TabsTrigger value="File">File</TabsTrigger>
							)}
						</TabsList>
					</div>

					{selectedNode && (
						<div className="bg-black-80 px-[24px] py-[8px] flex items-center justify-between">
							<div className="flex items-center gap-[8px]">
								<div
									data-type={selectedNode.type}
									className={clsx(
										"rounded-[2px] flex items-center justify-center px-[4px] py-[4px]",
										"data-[type=action]:bg-[hsla(187,71%,48%,1)]",
										"data-[type=variable]:bg-white",
									)}
								>
									<ContentTypeIcon
										contentType={selectedNode.content.type}
										className="w-[14px] h-[14px] fill-black-100"
									/>
								</div>
								<div className="font-avenir text-[16px] text-black-30">
									{selectedNode.content.type}
								</div>
							</div>
							{selectedNode.content.type === "textGeneration" && (
								<div className="">
									<button
										type="button"
										className="relative z-10 rounded-[8px] shadow-[0px_0px_3px_0px_#FFFFFF40_inset] py-[4px] px-[8px] bg-black-80 text-black-30 font-rosart text-[14px] disabled:bg-black-40"
										onClick={async () => {
											const artifactId = createArtifactId();
											dispatch({
												type: "upsertArtifact",
												input: {
													nodeId: selectedNode.id,
													artifact: {
														id: artifactId,
														type: "streamArtifact",
														creatorNodeId: selectedNode.id,
														object: {
															type: "text",
															title: "",
															content: "",
															messages: {
																plan: "",
																description: "",
															},
														},
													},
												},
											});
											setTab("Result");
											const latestGraphUrl = await flush();
											console.log(latestGraphUrl);
											const stream = await action(
												latestGraphUrl,
												selectedNode.id,
											);

											let textArtifactObject: TextArtifactObject = {
												type: "text",
												title: "",
												content: "",
												messages: {
													plan: "",
													description: "",
												},
											};
											for await (const streamContent of readStreamableValue(
												stream,
											)) {
												if (streamContent === undefined) {
													continue;
												}
												dispatch({
													type: "upsertArtifact",
													input: {
														nodeId: selectedNode.id,
														artifact: {
															id: artifactId,
															type: "streamArtifact",
															creatorNodeId: selectedNode.id,
															object: streamContent,
														},
													},
												});
												textArtifactObject = {
													...textArtifactObject,
													...streamContent,
												};
											}
											dispatch({
												type: "upsertArtifact",
												input: {
													nodeId: selectedNode.id,
													artifact: {
														id: artifactId,
														type: "generatedArtifact",
														creatorNodeId: selectedNode.id,
														createdAt: Date.now(),
														object: textArtifactObject,
													},
												},
											});
										}}
									>
										Generate
									</button>
								</div>
							)}
						</div>
					)}

					{selectedNode && isTextGeneration(selectedNode) && (
						<TabsContent value="Prompt" className="flex-1">
							<TabsContentPrompt
								key={selectedNode.id}
								content={selectedNode.content}
								onContentChange={(content) => {
									dispatch({
										type: "updateNode",
										input: {
											nodeId: selectedNode.id,
											node: {
												...selectedNode,
												content,
											},
										},
									});
								}}
								onRequirementConnect={(sourceNode) => {
									const requirement: NodeHandle = {
										id: createNodeHandleId(),
										label: "Requirement",
									};
									dispatch([
										{
											type: "updateNode",
											input: {
												nodeId: selectedNode.id,
												node: {
													...selectedNode,
													content: {
														...selectedNode.content,
														requirement,
													},
												},
											},
										},
										{
											type: "addConnection",
											input: {
												connection: {
													id: createConnectionId(),
													sourceNodeId: sourceNode.id,
													sourceNodeType: sourceNode.type,
													targetNodeId: selectedNode.id,
													targetNodeType: selectedNode.type,
													targetNodeHandleId: requirement.id,
												},
											},
										},
									]);
								}}
								onRequirementRemove={(sourceNode) => {
									const connection = graph.connections.find(
										(connection) =>
											connection.targetNodeId === selectedNode.id &&
											connection.sourceNodeId === sourceNode.id,
									);
									if (connection === undefined) {
										return;
									}
									dispatch([
										{
											type: "removeConnection",
											input: {
												connectionId: connection.id,
											},
										},
										{
											type: "updateNode",
											input: {
												nodeId: selectedNode.id,
												node: {
													...selectedNode,
													content: {
														...selectedNode.content,
														requirement: undefined,
													},
												},
											},
										},
									]);
								}}
								onSourceConnect={(sourceNode) => {
									const source: NodeHandle = {
										id: createNodeHandleId(),
										label: `Source${selectedNode.content.sources.length + 1}`,
									};
									dispatch([
										{
											type: "updateNode",
											input: {
												nodeId: selectedNode.id,
												node: {
													...selectedNode,
													content: {
														...selectedNode.content,
														sources: [...selectedNode.content.sources, source],
													},
												},
											},
										},
										{
											type: "addConnection",
											input: {
												connection: {
													id: createConnectionId(),
													sourceNodeId: sourceNode.id,
													sourceNodeType: sourceNode.type,
													targetNodeId: selectedNode.id,
													targetNodeType: selectedNode.type,
													targetNodeHandleId: source.id,
												},
											},
										},
									]);
								}}
								onSourceRemove={(sourceNode) => {
									const connection = graph.connections.find(
										(connection) =>
											connection.targetNodeId === selectedNode.id &&
											connection.sourceNodeId === sourceNode.id,
									);
									if (connection === undefined) {
										return;
									}
									dispatch([
										{
											type: "removeConnection",
											input: {
												connectionId: connection.id,
											},
										},
										{
											type: "updateNode",
											input: {
												nodeId: selectedNode.id,
												node: {
													...selectedNode,
													content: {
														...selectedNode.content,
														sources: selectedNode.content.sources.filter(
															(source) =>
																source.id !== connection.targetNodeHandleId,
														),
													},
												},
											},
										},
									]);
								}}
							/>
						</TabsContent>
					)}
					{selectedNode && isText(selectedNode) && (
						<TabsContent value="Text" className="flex-1">
							<TabContentText
								content={selectedNode.content}
								onContentChange={(content) => {
									dispatch({
										type: "updateNode",
										input: {
											nodeId: selectedNode.id,
											node: {
												...selectedNode,
												content,
											},
										},
									});
								}}
							/>
						</TabsContent>
					)}
					{selectedNode && isFile(selectedNode) && (
						<TabsContent value="File" className="h-full">
							<TabContentFile
								nodeId={selectedNode.id}
								content={selectedNode.content}
								onContentChange={(content) => {
									dispatch({
										type: "updateNode",
										input: {
											nodeId: selectedNode.id,
											node: {
												...selectedNode,
												content,
											},
										},
									});
								}}
							/>
						</TabsContent>
					)}
					{selectedNode && (
						<TabsContent value="Result">
							<TabContentGenerateTextResult node={selectedNode} />
						</TabsContent>
					)}
				</Tabs>
			) : (
				<div className="relative z-10 flex justify-between items-center">
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="p-[16px] group"
					>
						<PanelOpenIcon className="w-[18px] h-[18px] fill-black-70 group-hover:fill-black-30" />
					</button>
				</div>
			)}
		</div>
	);
}

function NodeDropdown({
	triggerLabel,
	nodes,
	onValueChange,
}: {
	triggerLabel?: string;
	nodes: Node[];
	onValueChange?: (node: Node) => void;
}) {
	const textGenerationNodes = nodes.filter(
		(node) => node.content.type === "textGeneration",
	);
	const textNodes = nodes.filter((node) => node.content.type === "text");
	const fileNodes = nodes.filter((node) => node.content.type === "file");

	const handleValueChange = (value: string) => {
		if (!onValueChange) return;

		const node = nodes.find((node) => node.id === value);
		if (node === undefined) return;

		onValueChange(node);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="text-[12px] px-[8px] py-[0.5px] border border-black-50 rounded-[4px]">
				{triggerLabel ?? "Select"}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" sideOffset={6}>
				<DropdownMenuRadioGroup onValueChange={handleValueChange}>
					<DropdownMenuLabel>Text Generator</DropdownMenuLabel>
					{textGenerationNodes.map((node) => (
						<DropdownMenuRadioItem value={node.id} key={node.id}>
							{node.name}
						</DropdownMenuRadioItem>
					))}
					{textNodes.length > 0 && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuLabel>Text</DropdownMenuLabel>
							{textNodes.map((node) => (
								<DropdownMenuRadioItem value={node.id} key={node.id}>
									{node.name}
								</DropdownMenuRadioItem>
							))}
						</>
					)}
					{fileNodes.length > 0 && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuLabel>File</DropdownMenuLabel>
							{fileNodes.map((node) => (
								<DropdownMenuRadioItem value={node.id} key={node.id}>
									{node.name}
								</DropdownMenuRadioItem>
							))}
						</>
					)}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function TabsContentPrompt({
	content,
	onContentChange,
	onRequirementConnect,
	onRequirementRemove,
	onSourceConnect,
	onSourceRemove,
}: {
	content: TextGenerateActionContent;
	onContentChange?: (content: TextGenerateActionContent) => void;
	onRequirementConnect?: (sourceNode: Node) => void;
	onRequirementRemove?: (sourceNode: Node) => void;
	onSourceConnect?: (sourceNode: Node) => void;
	onSourceRemove?: (sourceNode: Node) => void;
}) {
	const {
		graph: { nodes, connections },
	} = useGraph();
	const connectableTextNodes: Text[] = nodes
		.filter((node) => node.content.type === "text")
		.map((node) => node as Text);
	const connectableTextGeneratorNodes = nodes.filter(
		(node) => node.content.type === "textGeneration",
	);
	const connectableFileNodes = nodes.filter(
		(node) => node.content.type === "file",
	);
	const requirementNode = useNode({
		targetNodeHandleId: content.requirement?.id,
	});
	const sourceNodes = useMemo(
		() =>
			content.sources
				.map((source) => {
					const connection = connections.find(
						(connection) => connection.targetNodeHandleId === source.id,
					);
					const node = nodes.find(
						(node) => node.id === connection?.sourceNodeId,
					);
					return node;
				})
				.filter((node) => node !== undefined),
		[connections, content.sources, nodes],
	);
	return (
		<div className="relative z-10 flex flex-col gap-[2px] h-full">
			<PropertiesPanelCollapsible title="LLM" glanceLabel={content.llm}>
				<div className="flex flex-col gap-[10px]">
					<div className="grid gap-[8px]">
						<Select
							value={content.llm}
							onValueChange={(value) => {
								onContentChange?.({
									...content,
									llm: value as TextGenerateActionContent["llm"],
								});
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a LLM" />
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
									<SelectItem value="anthropic:claude-3-5-sonnet-latest">
										Claude 3.5 Sonnet
									</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-[8px]">
						<div className="font-rosart text-[16px] text-black-30">
							Parameters
						</div>
						<div className="grid gap-[16px]">
							<Slider
								label="Temperature"
								value={content.temperature}
								max={2.0}
								min={0.0}
								step={0.01}
							/>
						</div>
						<Slider
							label="Top P"
							value={content.topP}
							max={1.0}
							min={0.0}
							step={0.01}
						/>
					</div>
				</div>
			</PropertiesPanelCollapsible>

			<div className="border-t border-[hsla(222,21%,40%,1)]" />
			<PropertiesPanelCollapsible
				title="Requirement"
				glanceLabel={
					requirementNode === null ? "Not selected" : requirementNode.name
				}
			>
				{requirementNode === null ? (
					<div className="flex items-center gap-[4px]">
						<div className="py-[4px] text-[12px] flex-1">Not selected</div>
						<NodeDropdown
							nodes={[
								...connectableTextNodes,
								...connectableTextGeneratorNodes,
							]}
							onValueChange={(node) => {
								onRequirementConnect?.(node);
							}}
						/>
					</div>
				) : (
					<HoverCard>
						<HoverCardTrigger asChild>
							<Block>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-[8px]">
										<p className="truncate text-[14px] font-rosart">
											{requirementNode.name}
										</p>
									</div>
									<button
										type="button"
										className="group-hover:block hidden p-[2px] hover:bg-black-70 rounded-[4px]"
										onClick={() => {
											onRequirementRemove?.(requirementNode);
										}}
									>
										<TrashIcon className="w-[16px] h-[16px] text-black-30" />
									</button>
								</div>
							</Block>
						</HoverCardTrigger>
						<HoverCardContent className="w-80">
							<div className="flex justify-between space-x-4">
								{requirementNode.content.type === "text" && (
									<div className="line-clamp-5 text-[14px]">
										{requirementNode.content.text}
									</div>
								)}
							</div>
						</HoverCardContent>
					</HoverCard>
				)}
				{/* <div className="mb-[4px]">
					<Select value={requirementNode?.id}>
						<SelectTrigger>
							<SelectValue placeholder="Select a requirement" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Text Generator</SelectLabel>
								{connectableTextGeneratorNodes.map((node) => (
									<SelectItem value={node.id} key={node.id} label={node.name}>
										<p>it's a text generator</p>
									</SelectItem>
								))}
							</SelectGroup>
							<SelectGroup>
								<SelectLabel>Text</SelectLabel>
								{connectableTextNodes.map((node) => (
									<SelectItem value={node.id} key={node.id} label={node.name}>
										<p>{node.content.text}</p>
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div> */}
			</PropertiesPanelCollapsible>

			<div className="border-t border-[hsla(222,21%,40%,1)]" />

			<PropertiesPanelCollapsible
				title="Sources"
				glanceLabel={
					sourceNodes.length < 1
						? "No sources"
						: `${sourceNodes.length} sources selected`
				}
			>
				{sourceNodes.length < 1 ? (
					<div className="flex items-center gap-[4px]">
						<div className="py-[4px] text-[12px] flex-1">Not selected</div>
						<NodeDropdown
							triggerLabel="add"
							nodes={[
								...connectableTextNodes,
								...connectableTextGeneratorNodes,
								...connectableFileNodes,
							]}
							onValueChange={(node) => {
								onSourceConnect?.(node);
							}}
						/>
					</div>
				) : (
					<div className="grid gap-2">
						{sourceNodes.map((sourceNode) => (
							<HoverCard key={sourceNode.id}>
								<HoverCardTrigger asChild>
									<Block>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-[8px]">
												<p className="truncate text-[14px] font-rosart">
													{sourceNode.name}
												</p>
											</div>
											<button
												type="button"
												className="group-hover:block hidden p-[2px] hover:bg-black-70 rounded-[4px]"
												onClick={() => {
													onSourceRemove?.(sourceNode);
												}}
											>
												<TrashIcon className="w-[16px] h-[16px] text-black-30" />
											</button>
										</div>
									</Block>
								</HoverCardTrigger>
								<HoverCardContent className="w-80">
									<div className="flex justify-between space-x-4">
										node type: {sourceNode.content.type}
										{sourceNode.content.type === "text" && (
											<div className="line-clamp-5 text-[14px]">
												{sourceNode.content.text}
											</div>
										)}
									</div>
								</HoverCardContent>
							</HoverCard>
						))}

						<div className="flex items-center gap-[4px]">
							<NodeDropdown
								triggerLabel="add"
								nodes={[
									...connectableTextNodes,
									...connectableTextGeneratorNodes,
									...connectableFileNodes,
								]}
								onValueChange={(node) => {
									onSourceConnect?.(node);
								}}
							/>
						</div>
					</div>
				)}
			</PropertiesPanelCollapsible>

			<div className="border-t border-[hsla(222,21%,40%,1)]" />

			<PropertiesPanelContentBox className="flex flex-col gap-[8px] flex-1">
				<label htmlFor="text" className="font-rosart text-[16px] text-black-30">
					Instruction
				</label>
				<textarea
					name="text"
					id="text"
					className="w-full text-[14px] bg-[hsla(222,21%,40%,0.3)] rounded-[8px] text-white p-[14px] font-rosart outline-none resize-none flex-1 mb-[16px]"
					defaultValue={content.instruction}
				/>
			</PropertiesPanelContentBox>

			{/* <div className="grid gap-[8px]">
				<div className="flex justify-between">
					<div className="font-rosart text-[16px] text-black-30">
						Requirement
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger />
						<DropdownMenuContent>
							<DropdownMenuRadioGroup value={requirementNode?.id}>
								<DropdownMenuLabel>Text Generator</DropdownMenuLabel>
								{connectableTextGeneratorNodes.map((node) => (
									<DropdownMenuRadioItem value={node.id} key={node.id}>
										{node.name}
									</DropdownMenuRadioItem>
								))}
								<DropdownMenuSeparator />
								<DropdownMenuLabel>Text</DropdownMenuLabel>
								{connectableTextNodes.map((node) => (
									<DropdownMenuRadioItem value={node.id} key={node.id}>
										{node.name}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				{requirementNode === null ? (
					<div className="text-[12px] text-black-40 h-[36px]">
						This prompt has no requirement.
					</div>
				) : (
					// <Block
					// 	icon={
					// 		<ContentTypeIcon
					// 			contentType={requirementNode.content.type}
					// 			className="fill-white"
					// 		/>
					// 	}
					// 	title={requirementNode.name}
					// />
					<NodeBlock node={requirementNode} />
				)}
			</div>

			<div className="border-t border-[hsla(222,21%,40%,1)]" />

			<div className="grid gap-[8px]">
				<div className="flex justify-between">
					<div className="font-rosart text-[16px] text-black-30">Sources</div>
					<DropdownMenu>
						<DropdownMenuTrigger />
						<DropdownMenuContent>
							<DropdownMenuLabel>Text Generator</DropdownMenuLabel>
							{connectableTextGeneratorNodes.map((node) => (
								<DropdownMenuCheckboxItem
									checked={sourceNodes.some((source) => source.id === node.id)}
									key={node.id}
								>
									{node.name}
								</DropdownMenuCheckboxItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuLabel>Text</DropdownMenuLabel>
							{connectableTextNodes.map((node) => (
								<DropdownMenuCheckboxItem
									checked={sourceNodes.some((source) => source.id === node.id)}
									key={node.id}
								>
									{node.name}
								</DropdownMenuCheckboxItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuLabel>File</DropdownMenuLabel>
							{connectableFileNodes.map((node) => (
								<DropdownMenuCheckboxItem
									checked={sourceNodes.some((source) => source.id === node.id)}
									key={node.id}
								>
									{node.name}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div> */}
			{/* <div className="grid gap-[8px]">
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
							</div> */}
		</div>
	);
}

/**
 * Formats a timestamp number into common English date string formats
 */
const formatTimestamp = {
	/**
	 * Format: Nov 25, 2024 10:30:45 AM
	 */
	toLongDateTime: (timestamp: number): string => {
		return new Date(timestamp).toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
	},

	/**
	 * Format: 11/25/2024 10:30 AM
	 */
	toShortDateTime: (timestamp: number): string => {
		return new Date(timestamp).toLocaleString("en-US", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	},

	/**
	 * Format: November 25, 2024
	 */
	toLongDate: (timestamp: number): string => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	},

	/**
	 * Format: 11/25/2024
	 */
	toShortDate: (timestamp: number): string => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
		});
	},

	/**
	 * Format: 10:30:45 AM
	 */
	toTime: (timestamp: number): string => {
		return new Date(timestamp).toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
	},

	/**
	 * Format: ISO 8601 (2024-11-25T10:30:45Z)
	 * Useful for APIs and database storage
	 */
	toISO: (timestamp: number): string => {
		return new Date(timestamp).toISOString();
	},

	/**
	 * Returns relative time like "2 hours ago", "in 3 days", etc.
	 * Supports both past and future dates
	 */
	toRelativeTime: (timestamp: number): string => {
		const now = Date.now();
		const diff = timestamp - now;
		const absMs = Math.abs(diff);
		const isPast = diff < 0;

		// Time units in milliseconds
		const minute = 60 * 1000;
		const hour = 60 * minute;
		const day = 24 * hour;
		const week = 7 * day;
		const month = 30 * day;
		const year = 365 * day;

		// Helper function to format the time with proper pluralization
		const formatUnit = (value: number, unit: string): string => {
			const plural = value === 1 ? "" : "s";
			return isPast
				? `${value} ${unit}${plural} ago`
				: `in ${value} ${unit}${plural}`;
		};

		if (absMs < minute) {
			return isPast ? "just now" : "in a few seconds";
		}

		if (absMs < hour) {
			const mins = Math.floor(absMs / minute);
			return formatUnit(mins, "minute");
		}

		if (absMs < day) {
			const hrs = Math.floor(absMs / hour);
			return formatUnit(hrs, "hour");
		}

		if (absMs < week) {
			const days = Math.floor(absMs / day);
			return formatUnit(days, "day");
		}

		if (absMs < month) {
			const weeks = Math.floor(absMs / week);
			return formatUnit(weeks, "week");
		}

		if (absMs < year) {
			const months = Math.floor(absMs / month);
			return formatUnit(months, "month");
		}

		const years = Math.floor(absMs / year);
		return formatUnit(years, "year");
	},
};

function TabContentGenerateTextResult({
	node,
}: {
	node: Node;
}) {
	const artifact = useArtifact({ creatorNodeId: node.id });
	if (artifact === null) {
		return null;
	}
	if (artifact.object.type !== "text") {
		return null;
	}
	return (
		<div className="grid gap-[8px] font-rosart text-[12px] text-black-30 px-[24px] py-[8px] relative z-10">
			<div>{artifact.object.messages.plan}</div>

			{artifact.object.title !== "" && (
				<Dialog>
					<DialogTrigger>
						<Block size="large">
							<div className="flex items-center gap-[12px]">
								<DocumentIcon className="w-[18px] h-[18px] fill-black-30" />
								<div className="text-[14px]">{artifact.object.title}</div>
							</div>
						</Block>
					</DialogTrigger>
					<DialogContent>
						<div className="sr-only">
							<DialogHeader>
								<DialogTitle>{artifact.object.title}</DialogTitle>
							</DialogHeader>
						</div>
						<div className="flex-1">{artifact.object.content}</div>
						{artifact.type === "generatedArtifact" && (
							<DialogFooter className="text-[14px] font-bold text-black-70">
								Generated {formatTimestamp.toRelativeTime(artifact.createdAt)}
							</DialogFooter>
						)}
					</DialogContent>
				</Dialog>
			)}
			<div>{artifact.object.messages.description}</div>

			{artifact.type === "streamArtifact" && (
				<div className="flex gap-[12px]">
					<WilliIcon className="w-[20px] h-[20px] fill-black-40 animate-[pop-pop_1.8s_steps(1)_infinite]" />
					<WilliIcon className="w-[20px] h-[20px] fill-black-40 animate-[pop-pop_1.8s_steps(1)_0.6s_infinite]" />
					<WilliIcon className="w-[20px] h-[20px] fill-black-40 animate-[pop-pop_1.8s_steps(1)_1.2s_infinite]" />
				</div>
			)}

			{artifact.type === "generatedArtifact" && (
				<div>
					<div className="inline-flex items-center gap-[6px] text-black-30/50 font-sans">
						<p className="italic">Generation completed.</p>
					</div>
				</div>
			)}
		</div>
	);
}

function TabContentText({
	content,
	onContentChange,
}: {
	content: TextContent;
	onContentChange?: (content: TextContent) => void;
}) {
	return (
		<div className="relative z-10 flex flex-col gap-[2px] h-full">
			<PropertiesPanelContentBox className="h-full flex">
				<textarea
					name="text"
					id="text"
					className="flex-1 text-[14px] bg-[hsla(222,21%,40%,0.3)] rounded-[8px] text-white p-[14px] font-rosart outline-none resize-none  my-[16px]"
					defaultValue={content.text}
					ref={(el) => {
						function handleBlur() {
							if (el?.value != null && content.text !== el.value) {
								onContentChange?.({
									...content,
									text: el.value,
								});
							}
						}
						el?.addEventListener("blur", handleBlur);
						return () => {
							el?.removeEventListener("blur", handleBlur);
						};
					}}
				/>
			</PropertiesPanelContentBox>
		</div>
	);
}

function DataList({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div>
			<p className="text-[12px] text-black-40">{label}</p>
			<div>{children}</div>
		</div>
	);
}

function formatFileSize(bytes: number): string {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	const targetUnit =
		size < 1024
			? "B"
			: size < 1024 ** 2
				? "KB"
				: size < 1024 ** 3
					? "MB"
					: size < 1024 ** 4
						? "GB"
						: "TB";

	while (
		size >= 1024 &&
		unitIndex < units.length - 1 &&
		units[unitIndex] !== targetUnit
	) {
		size /= 1024;
		unitIndex++;
	}

	return `${Math.round(size * 100) / 100} ${targetUnit}`;
}

function TabContentFile({
	nodeId,
	content,
	onContentChange,
}: {
	nodeId: NodeId;
	content: FileContent;
	onContentChange?: (content: FileContent) => void;
}) {
	const { graph } = useGraph();

	const sourcedFromNodes = useMemo(
		() =>
			graph.connections
				.filter((connection) => connection.sourceNodeId === nodeId)
				.map((connection) =>
					graph.nodes.find((node) => node.id === connection.targetNodeId),
				)
				.filter((node) => node !== undefined),
		[graph, nodeId],
	);
	const [isDragging, setIsDragging] = useState(false);

	const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const setFile = useCallback(
		(file: File) => {
			const fileData = new FileReader();

			fileData.readAsArrayBuffer(file);
			fileData.onload = async () => {
				if (!fileData.result) {
					return;
				}
				const fileId = createFileId();
				onContentChange?.({
					...content,
					data: {
						id: fileId,
						status: "uploading",
						name: file.name,
						contentType: file.type,
						size: file.size,
					},
				});
				const blob = await upload(
					pathJoin(vercelBlobFileFolder, fileId, file.name),
					file,
					{
						access: "public",
						handleUploadUrl: "/api/files/upload",
					},
				);
				const uploadedAt = Date.now();

				onContentChange?.({
					...content,
					data: {
						id: fileId,
						status: "processing",
						name: file.name,
						contentType: file.type,
						size: file.size,
						uploadedAt,
						fileBlobUrl: blob.url,
					},
				});

				const parseBlob = await parse(fileId, file.name, blob.url);

				onContentChange?.({
					...content,
					data: {
						id: fileId,
						status: "completed",
						name: file.name,
						contentType: file.type,
						size: file.size,
						uploadedAt,
						fileBlobUrl: blob.url,
						processedAt: Date.now(),
						textDataUrl: parseBlob.url,
					},
				});
			};
		},
		[content, onContentChange],
	);

	const onDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(false);
			setFile(e.dataTransfer.files[0]);
		},
		[setFile],
	);

	const onFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files) {
				return;
			}
			setFile(e.target.files[0]);
		},
		[setFile],
	);
	return (
		<div className="relative z-10 flex flex-col gap-[2px] h-full text-[14px] text-black-30">
			{content.data == null ? (
				<div className="p-[16px]">
					<div
						className={clsx(
							"h-[300px] flex flex-col gap-[16px] justify-center items-center rounded-[8px] border border-dashed text-black-70 px-[18px]",
							isDragging ? "bg-black-80/20 border-black-50" : "border-black-70",
						)}
						onDragOver={onDragOver}
						onDragLeave={onDragLeave}
						onDrop={onDrop}
					>
						{isDragging ? (
							<>
								<DocumentIcon className="w-[30px] h-[30px] fill-black-70" />
								<p className="text-center">Drop to upload your files</p>
							</>
						) : (
							<div className="flex flex-col gap-[16px] justify-center items-center">
								<ArrowUpFromLineIcon size={38} className="stroke-black-70" />
								<label
									htmlFor="file"
									className="text-center flex flex-col gap-[16px]"
								>
									<p>
										No contents added yet. Click to upload or drag and drop
										files here (supports images, documents, and more; max 4.5MB
										per file).
									</p>
									<div className="flex gap-[8px] justify-center items-center">
										<span>or</span>
										<span className="font-bold text-black--50 text-[14px] underline cursor-pointer">
											Select files
											<input
												id="file"
												type="file"
												onChange={onFileChange}
												className="hidden"
											/>
										</span>
									</div>
								</label>
							</div>
						)}
					</div>
				</div>
			) : (
				<>
					<PropertiesPanelContentBox>
						<div className="my-[12px] flex flex-col gap-[8px]">
							<DataList label="File Name">
								<p>{content.data.name}</p>
							</DataList>
							<DataList label="Content Type">
								<p>{content.data.contentType}</p>
							</DataList>
							<DataList label="Size">
								<p>{formatFileSize(content.data.size)}</p>
							</DataList>
							<DataList label="Status">
								<p>{content.data.status}</p>
							</DataList>
							<DataList label="Uploaded">
								<p>
									{content.data.status !== "completed"
										? "---"
										: formatTimestamp.toRelativeTime(content.data.processedAt)}
								</p>
							</DataList>
						</div>
					</PropertiesPanelContentBox>
					<div className="border-t border-[hsla(222,21%,40%,1)]" />
					<PropertiesPanelContentBox className="text-black-30 grid gap-2">
						<div className="flex justify-between items-center">
							<p className="font-rosart">Sourced From</p>
						</div>

						<div className="grid gap-2">
							{sourcedFromNodes.map((node) => (
								<HoverCard key={node.id}>
									<HoverCardTrigger asChild>
										<Block>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-[8px]">
													<p className="truncate text-[14px] font-rosart">
														{node.name}
													</p>
												</div>
											</div>
										</Block>
									</HoverCardTrigger>
									<HoverCardContent className="w-80">
										<div className="flex justify-between space-x-4">
											node type: {node.content.type}
											{node.content.type === "text" && (
												<div className="line-clamp-5 text-[14px]">
													{node.content.text}
												</div>
											)}
										</div>
									</HoverCardContent>
								</HoverCard>
							))}
						</div>
					</PropertiesPanelContentBox>
				</>
			)}
		</div>
	);
}
