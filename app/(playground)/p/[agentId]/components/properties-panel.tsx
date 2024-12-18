import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { upload } from "@vercel/blob/client";
import { readStreamableValue } from "ai/rsc";
import clsx from "clsx/lite";
import {
	ArrowUpFromLineIcon,
	CheckCircle,
	CheckIcon,
	ChevronsUpDownIcon,
	CornerDownRightIcon,
	FileIcon,
	FileXIcon,
	FingerprintIcon,
	Minimize2Icon,
	TrashIcon,
	UndoIcon,
} from "lucide-react";
import {
	type ComponentProps,
	type DetailedHTMLProps,
	type FC,
	type HTMLAttributes,
	type ReactNode,
	useCallback,
	useId,
	useMemo,
	useState,
} from "react";
import { action, parse, remove } from "../actions";
import { vercelBlobFileFolder } from "../constants";
import { useDeveloperMode } from "../contexts/developer-mode";
import { useExecution } from "../contexts/execution";
import {
	useArtifact,
	useGraph,
	useNode,
	useSelectedNode,
} from "../contexts/graph";
import { usePropertiesPanel } from "../contexts/properties-panel";
import { useToast } from "../contexts/toast";
import { textGenerationPrompt } from "../lib/prompts";
import {
	createArtifactId,
	createConnectionId,
	createFileId,
	createNodeHandleId,
	createNodeId,
	formatTimestamp,
	isFile,
	isFiles,
	isText,
	isTextGeneration,
	pathJoin,
	toErrorWithMessage,
} from "../lib/utils";
import { DocumentIcon } from "../prev/beta-proto/components/icons/document";
import { PanelCloseIcon } from "../prev/beta-proto/components/icons/panel-close";
import { PanelOpenIcon } from "../prev/beta-proto/components/icons/panel-open";
import { SpinnerIcon } from "../prev/beta-proto/components/icons/spinner";
import { WilliIcon } from "../prev/beta-proto/components/icons/willi";
import type {
	FileContent,
	FileData,
	FileId,
	FilesContent,
	Node,
	NodeHandle,
	NodeId,
	Text,
	TextArtifactObject,
	TextContent,
	TextGenerateActionContent,
} from "../types";
import { Block } from "./block";
import ClipboardButton from "./clipboard-button";
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
import { Markdown } from "./markdown";
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
import { Tooltip } from "./tooltip";

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
	expandedClassName?: string;
}

function PropertiesPanelCollapsible({
	title,
	glanceLabel,
	expandedClassName,
	children,
}: PropertiesPanelCollapsible) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<>
			{isExpanded ? (
				<PropertiesPanelContentBox
					className={clsx(
						"text-black-30 flex flex-col gap-2",
						expandedClassName,
					)}
				>
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
		<DialogPrimitive.DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				className={clsx(
					"fixed left-[50%] top-[50%] z-50",
					"w-[800px] h-[90%] overflow-hidden translate-x-[-50%] translate-y-[-50%]",
					"px-[32px] py-[24px] flex",
					"font-rosart bg-black-100 rounded-[16px] shadow-[0px_0px_3px_0px_hsla(0,_0%,_100%,_0.25)_inset,0px_0px_8px_0px_hsla(0,_0%,_100%,_0.2)]",
					"duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
				)}
				{...props}
			>
				<div className="relative z-10 flex flex-col w-full">{children}</div>
				<div className="absolute z-0 rounded-[16px] inset-0 border mask-fill bg-gradient-to-br bg-origin-border bg-clip-boarder border-transparent from-[hsla(233,4%,37%,1)] to-[hsla(233,62%,22%,1)]" />
			</DialogPrimitive.Content>
		</DialogPrimitive.DialogPortal>
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
	const { execute } = useExecution();
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
						<div className="bg-black-80 px-[24px] h-[36px] flex items-center justify-between">
							<div className="flex items-center gap-[10px]">
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
									{selectedNode.name}
								</div>
							</div>
							{selectedNode.content.type === "textGeneration" && (
								<div className="">
									<button
										type="button"
										className="relative z-10 rounded-[8px] shadow-[0px_0px_3px_0px_#FFFFFF40_inset] py-[3px] px-[8px] bg-black-80 text-black-30 font-rosart text-[14px] disabled:bg-black-40"
										onClick={() => execute(selectedNode.id)}
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
					{selectedNode && isFiles(selectedNode) && (
						<TabsContentFiles
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
					)}
					{selectedNode && (
						<TabsContent value="Result">
							<TabContentGenerateTextResult
								node={selectedNode}
								onCreateNewTextGenerator={() => {
									const nodeId = createNodeId();
									const handleId = createNodeHandleId();
									dispatch([
										{
											type: "addNode",
											input: {
												node: {
													id: nodeId,
													name: `Untitle node - ${graph.nodes.length + 1}`,
													position: {
														x: selectedNode.position.x + 400,
														y: selectedNode.position.y + 100,
													},
													selected: true,
													type: "action",
													content: {
														type: "textGeneration",
														llm: "anthropic:claude-3-5-sonnet-latest",
														temperature: 0.7,
														topP: 1,
														instruction: "",
														sources: [{ id: handleId, label: "Source1" }],
													},
												},
											},
										},
										{
											type: "addConnection",
											input: {
												connection: {
													id: createConnectionId(),
													sourceNodeId: selectedNode.id,
													sourceNodeType: selectedNode.type,
													targetNodeId: nodeId,
													targetNodeHandleId: handleId,
													targetNodeType: "action",
												},
											},
										},
										{
											type: "updateNode",
											input: {
												nodeId: selectedNode.id,
												node: {
													...selectedNode,
													selected: false,
												},
											},
										},
									]);
									setTab("Prompt");
								}}
								onEditPrompt={() => setTab("Prompt")}
								onGenerateText={() => execute(selectedNode.id)}
							/>
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
	const fileNodes = nodes.filter((node) => node.content.type === "files");

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

function RevertToDefaultButton({ onClick }: { onClick: () => void }) {
	const [clicked, setClicked] = useState(false);

	const handleClick = useCallback(() => {
		onClick();
		setClicked(true);
		setTimeout(() => setClicked(false), 2000);
	}, [onClick]);

	return (
		<button
			type="button"
			className="group flex items-center bg-black-100/30 text-white px-[8px] py-[2px] rounded-md transition-all duration-300 ease-in-out hover:bg-black-100"
			onClick={handleClick}
		>
			<div className="relative h-[12px] w-[12px]">
				<span
					className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${clicked ? "opacity-0" : "opacity-100"}`}
				>
					<UndoIcon className="h-[12px] w-[12px]" />
				</span>
				<span
					className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${clicked ? "opacity-100" : "opacity-0"}`}
				>
					<CheckIcon className="h-[12px] w-[12px]" />
				</span>
			</div>
			<div
				className="overflow-hidden transition-all duration-300 ease-in-out w-0 data-[clicked=false]:group-hover:w-[98px] data-[clicked=true]:group-hover:w-[40px] group-hover:ml-[4px] flex"
				data-clicked={clicked}
			>
				<span className="whitespace-nowrap text-[12px]">
					{clicked ? "Revert!" : "Revert to Default"}
				</span>
			</div>
		</button>
	);
}

interface SystemPromptTextareaProps
	extends Pick<
		DetailedHTMLProps<
			React.TextareaHTMLAttributes<HTMLTextAreaElement>,
			HTMLTextAreaElement
		>,
		"defaultValue" | "className"
	> {
	onValueChange?: (value: string) => void;
	onRevertToDefault?: () => void;
	revertValue?: string;
}
function SystemPromptTextarea({
	defaultValue,
	className,
	onValueChange,
	onRevertToDefault,
	revertValue,
}: SystemPromptTextareaProps) {
	const id = useId();
	return (
		<div className={clsx("relative", className)}>
			<textarea
				className="w-full text-[14px] bg-[hsla(222,21%,40%,0.3)] rounded-[8px] text-white p-[14px] font-rosart outline-none resize-none h-full"
				defaultValue={defaultValue}
				ref={(ref) => {
					if (ref === null) {
						return;
					}
					ref.dataset.refId = id;

					function handleBlur() {
						if (ref === null) {
							return;
						}
						if (defaultValue !== ref.value) {
							onValueChange?.(ref.value);
						}
					}
					ref.addEventListener("blur", handleBlur);
					return () => {
						ref.removeEventListener("blur", handleBlur);
					};
				}}
			/>

			<div className="absolute bottom-[4px] right-[4px]">
				<RevertToDefaultButton
					onClick={() => {
						onRevertToDefault?.();
						const textarea = document.querySelector(
							`textarea[data-ref-id="${id}"]`,
						);
						if (
							revertValue !== undefined &&
							textarea !== null &&
							textarea instanceof HTMLTextAreaElement
						) {
							textarea.value = revertValue;
						}
					}}
				/>
			</div>
		</div>
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
	const developerMode = useDeveloperMode();
	const connectableTextNodes: Text[] = nodes
		.filter((node) => node.content.type === "text")
		.map((node) => node as Text);
	const connectableTextGeneratorNodes = nodes.filter(
		(node) => node.content.type === "textGeneration",
	);
	const connectableFileNodes = nodes.filter(
		(node) => node.content.type === "files",
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
								<SelectGroup>
									<SelectLabel>Google</SelectLabel>
									<SelectItem value="google:gemini-1.5-flash">
										Gemini 1.5 Flash
									</SelectItem>
									<SelectItem value="google:gemini-1.5-pro">
										Gemini 1.5 Pro
									</SelectItem>
									<SelectItem value="google:gemini-2.0-flash-exp">
										Gemini 2.0 Flash Exp
									</SelectItem>
								</SelectGroup>
								{developerMode && (
									<SelectGroup>
										<SelectLabel>Development</SelectLabel>
										<SelectItem value="dev:error">
											Mock(Raise an error)
										</SelectItem>
									</SelectGroup>
								)}
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
			<PropertiesPanelCollapsible
				title="System"
				glanceLabel={content.system === undefined ? "Default" : "Modified"}
				expandedClassName="flex-1"
			>
				<div className="flex-1 flex flex-col gap-[3px]">
					<p className="text-[11px] text-black-70">
						System prompts combine requirements and guide you through tasks.
						Make changes or click "Revert to Default" anytime.
					</p>
					<SystemPromptTextarea
						className="flex-1"
						defaultValue={content.system ?? textGenerationPrompt}
						revertValue={textGenerationPrompt}
						onValueChange={(value) => {
							onContentChange?.({
								...content,
								system: value,
							});
						}}
						onRevertToDefault={() => {
							onContentChange?.({
								...content,
								system: undefined,
							});
						}}
					/>
				</div>
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
					ref={(ref) => {
						if (ref === null) {
							return;
						}

						function handleBlur() {
							if (ref === null) {
								return;
							}
							if (content.instruction !== ref.value) {
								onContentChange?.({
									...content,
									instruction: ref.value,
								});
							}
						}
						ref.addEventListener("blur", handleBlur);
						return () => {
							ref.removeEventListener("blur", handleBlur);
						};
					}}
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

function TabContentGenerateTextResult({
	node,
	onCreateNewTextGenerator,
	onGenerateText,
	onEditPrompt,
}: {
	node: Node;
	onCreateNewTextGenerator?: () => void;
	onGenerateText: () => void;
	onEditPrompt: () => void;
}) {
	const artifact = useArtifact({ creatorNodeId: node.id });
	if (artifact == null || artifact.object.type !== "text") {
		return (
			<div className="grid gap-[12px] text-[12px] text-black-30 px-[24px] pt-[120px] relative z-10 text-center justify-center">
				<div>
					<p className="font-[800] text-black-30 text-[18px]">
						Nothing is generated.
					</p>
					<p className="text-black-70 text-[12px] text-center leading-5 w-[220px]">
						Generate with the current Prompt or adjust the Prompt and the
						results will be displayed.
					</p>
				</div>

				<div className="flex flex-col gap-[4px]">
					<div>
						<button
							type="button"
							className="inline-flex items-center gap-[4px] bg-black hover:bg-white/20 transition-colors px-[4px] text-black-50 hover:text-black-30 rounded"
							onClick={() => {
								onGenerateText();
							}}
						>
							<CornerDownRightIcon className="w-[12px] h-[12px]" />
							Generate with the current Prompt
						</button>
					</div>
					<div>
						<button
							type="button"
							className="inline-flex items-center gap-[4px] bg-black hover:bg-white/20 transition-colors px-[4px] text-black-50 hover:text-black-30 rounded"
							onClick={() => {
								onEditPrompt();
							}}
						>
							<CornerDownRightIcon className="w-[12px] h-[12px]" />
							Adjust the Prompt
						</button>
					</div>
				</div>
			</div>
		);
	}
	return (
		<div className="grid gap-[8px] font-rosart text-[12px] text-black-30 px-[24px] py-[8px] relative z-10">
			<div>{artifact.object.messages.plan}</div>

			{artifact.object.title !== "" && (
				<DialogPrimitive.Root>
					<DialogPrimitive.DialogTrigger>
						<Block size="large">
							<div className="flex items-center gap-[12px]">
								<div className="px-[8px]">
									{artifact.type === "generatedArtifact" ? (
										<DocumentIcon className="w-[20px] h-[20px] fill-black-30 flex-shrink-0" />
									) : (
										<SpinnerIcon className="w-[20px] h-[20px] stroke-black-30 animate-follow-through-spin fill-transparent" />
									)}
								</div>
								<div className="flex flex-col gap-[2px]">
									<div className="text-[14px]">{artifact.object.title}</div>
									<p className="text-black-70">Click to open</p>
								</div>
							</div>
						</Block>
					</DialogPrimitive.DialogTrigger>
					<DialogContent
						// Prevent Tooltip within popover opens automatically due to trigger receiving focus
						// https://github.com/radix-ui/primitives/issues/2248
						onOpenAutoFocus={(event) => {
							event.preventDefault();
						}}
					>
						<div className="sr-only">
							<DialogHeader>
								<DialogTitle>{artifact.object.title}</DialogTitle>
							</DialogHeader>
							<DialogPrimitive.DialogDescription>
								{artifact.object.content}
							</DialogPrimitive.DialogDescription>
						</div>
						<div className="flex-1 overflow-y-auto">
							<Markdown>{artifact.object.content}</Markdown>
						</div>
						{artifact.type === "generatedArtifact" && (
							<DialogFooter className="mt-[10px] flex justify-between">
								<div className="text-[14px] font-bold text-black-70 ">
									Generated {formatTimestamp.toRelativeTime(artifact.createdAt)}
								</div>
								<div className="text-black-30">
									<ClipboardButton
										text={artifact.object.content}
										sizeClassName="w-[16px] h-[16px]"
									/>
								</div>
							</DialogFooter>
						)}
					</DialogContent>
				</DialogPrimitive.Root>
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
				<div className="flex flex-col gap-[8px]">
					<div className="inline-flex items-center gap-[6px] text-black-30/50 font-sans">
						<p className="italic">Generation completed.</p>
						<ClipboardButton
							sizeClassName="w-[12px] h-[12px]"
							text={artifact.id}
							tooltip={`Copy the fingerprint: ${artifact.id}`}
							defaultIcon={<FingerprintIcon className="h-[12px] w-[12px]" />}
						/>
					</div>
					<div>
						<button
							type="button"
							className="inline-flex items-center gap-[4px] bg-black hover:bg-white/20 transition-colors px-[4px] text-black-50 hover:text-black-30 rounded"
							onClick={() => {
								onCreateNewTextGenerator?.();
							}}
						>
							<CornerDownRightIcon className="w-[12px] h-[12px]" />
							Create a new Text Generator with this result as Source
						</button>
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

function TabsContentFiles({
	content,
	onContentChange,
}: {
	nodeId: NodeId;
	content: FilesContent;
	onContentChange: (content: FilesContent) => void;
}) {
	const [isDragging, setIsDragging] = useState(false);

	const { addToast } = useToast();

	const setFiles = useCallback(
		async (files: File[]) => {
			let contentData = content.data;
			await Promise.all(
				files.map(async (file) => {
					const fileData = new FileReader();
					fileData.readAsArrayBuffer(file);
					fileData.onload = async () => {
						if (!fileData.result) {
							return;
						}
						const fileId = createFileId();
						contentData = [
							...contentData,
							{
								id: fileId,
								status: "uploading",
								name: file.name,
								contentType: file.type,
								size: file.size,
							},
						];
						try {
							onContentChange?.({
								...content,
								data: contentData,
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

							contentData = [
								...contentData.filter((file) => file.id !== fileId),
								{
									id: fileId,
									status: "processing",
									name: file.name,
									contentType: file.type,
									size: file.size,
									uploadedAt,
									fileBlobUrl: blob.url,
								},
							];

							onContentChange?.({
								...content,
								data: contentData,
							});

							const parseBlob = await parse(fileId, file.name, blob.url);

							contentData = [
								...contentData.filter((file) => file.id !== fileId),
								{
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
							];
							onContentChange?.({
								...content,
								data: contentData,
							});
						} catch (error) {
							contentData = [
								...contentData.filter((file) => file.id !== fileId),
								{
									id: fileId,
									status: "failed",
									name: file.name,
									contentType: file.type,
									size: file.size,
								},
							];
							onContentChange?.({
								...content,
								data: contentData,
							});

							addToast({
								type: "error",
								message: toErrorWithMessage(error).message,
							});
						}
					};
				}),
			);
		},
		[content, onContentChange, addToast],
	);

	const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const onDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(false);
			setFiles(Array.from(e.dataTransfer.files));
		},
		[setFiles],
	);

	const onFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (!e.target.files) {
				return;
			}
			setFiles(Array.from(e.target.files));
		},
		[setFiles],
	);

	const handleRemoveFile = useCallback(
		async (fileToRemove: FileData) => {
			onContentChange({
				...content,
				data: content.data.filter((file) => file.id !== fileToRemove.id),
			});
			await remove(fileToRemove);
		},
		[content, onContentChange],
	);

	return (
		<div className="relative z-10 flex flex-col gap-[2px] h-full text-[14px] text-black-30">
			<div className="p-[16px] divide-y divide-black-50">
				{content.data.length > 0 && (
					<div className="pb-[16px] flex flex-col gap-[8px]">
						{content.data.map((file) => (
							<FileListItem
								key={file.id}
								fileData={file}
								onRemove={handleRemoveFile}
							/>
						))}
					</div>
				)}
				<div className="py-[16px]">
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
										Click to upload or drag and drop files here (supports
										images, documents, and more).
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
			</div>
		</div>
	);
}

function FileListItem({
	fileData,
	onRemove,
}: {
	fileData: FileData;
	onRemove: (file: FileData) => void;
}) {
	return (
		<div className="flex items-center overflow-x-hidden group justify-between bg-black-100 hover:bg-white/10 transition-colors px-[4px] py-[8px] rounded-[8px]">
			<div className="flex items-center overflow-x-hidden">
				{fileData.status === "failed" ? (
					<FileXIcon className="w-[46px] h-[46px] stroke-current stroke-1" />
				) : (
					<div className="relative">
						<FileIcon className="w-[46px] h-[46px] stroke-current stroke-1" />
						<div className="uppercase absolute bottom-[8px] w-[46px] py-[2px] text-[10px] flex justify-center">
							<p>
								{fileData.contentType === "application/pdf"
									? "pdf"
									: fileData.contentType === "text/markdown"
										? "md"
										: ""}
							</p>
						</div>
					</div>
				)}
				<div className="overflow-x-hidden">
					<p className="truncate">{fileData.name}</p>
					{fileData.status === "uploading" && <p>Uploading...</p>}
					{fileData.status === "processing" && <p>Processing...</p>}
					{fileData.status === "completed" && (
						<p className="text-black-50">
							{formatTimestamp.toRelativeTime(fileData.uploadedAt)}
						</p>
					)}
					{fileData.status === "failed" && <p>Failed</p>}
				</div>
			</div>
			<Tooltip text="Remove">
				<button
					type="button"
					className="hidden group-hover:block px-[4px] py-[4px] bg-transparent hover:bg-white/10 rounded-[8px] transition-colors mr-[2px] flex-shrink-0"
					onClick={() => onRemove(fileData)}
				>
					<TrashIcon className="w-[24px] h-[24px] stroke-current stroke-[1px] " />
				</button>
			</Tooltip>
		</div>
	);
}
