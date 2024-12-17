"use client";

import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { FileUpIcon, LetterTextIcon, MousePointer2Icon } from "lucide-react";
import { type ComponentProps, forwardRef } from "react";
import { TextGenerationIcon } from "../../beta-proto/components/icons/text-generation";
import { useToolbar } from "../contexts/toolbar";
import type { Tool } from "../types";
import { Tooltip } from "./tooltip";

function TooltipAndHotkey({ text, hotkey }: { text: string; hotkey: string }) {
	return (
		<div className="flex justify-between items-center gap-[8px]">
			<p>{text}</p>
			<p className="uppercase text-black-70">{hotkey}</p>
		</div>
	);
}

function ToggleGroupItem({
	tooltip,
	value,
	shortcut,
	...props
}: ComponentProps<typeof ToggleGroup.Item> & {
	tooltip: string;
	shortcut: string;
}) {
	const { selectedTool } = useToolbar();
	return (
		<Tooltip text={<TooltipAndHotkey text={tooltip} hotkey={shortcut} />}>
			<ToggleGroup.Item
				value={value}
				className="hover:bg-white/20 p-[4px] rounded-[4px] data-[state=on]:bg-black-80 focus:outline-none "
				data-state={selectedTool?.action === value ? "on" : "off"}
				{...props}
			/>
		</Tooltip>
	);
}

export function Toolbar() {
	const { selectTool, selectedTool } = useToolbar();
	return (
		<div className="relative rounded-[46px] overflow-hidden bg-black-100">
			<div className="absolute z-0 rounded-[46px] inset-0 border mask-fill bg-gradient-to-br from-[hsla(232,37%,72%,0.2)] to-[hsla(218,58%,21%,0.9)] bg-origin-border bg-clip-boarder border-transparent" />
			<div className="flex divide-x divide-[hsla(232,36%,72%,0.2)] items-center px-[8px] py-[8px]">
				<ToggleGroup.Root
					type="single"
					className="flex items-center px-[16px] z-10 h-full"
					value={selectedTool?.action}
					onValueChange={(value) => {
						selectTool(value as Tool["action"]);
					}}
				>
					<div className="flex gap-[12px]">
						<ToggleGroupItem value="move" tooltip="Move" shortcut="v">
							<MousePointer2Icon
								className={"w-[24px] h-[24px] text-black-30"}
							/>
						</ToggleGroupItem>
						<ToggleGroupItem value="addTextNode" tooltip="Text" shortcut="t">
							<LetterTextIcon className={"w-[24px] h-[24px] text-black-30"} />
						</ToggleGroupItem>
						<ToggleGroupItem value="addFileNode" tooltip="File" shortcut="f">
							<FileUpIcon className={"w-[24px] h-[24px] text-black-30 "} />
						</ToggleGroupItem>
						<ToggleGroupItem
							value="addTextGenerationNode"
							tooltip="Text Generator"
							shortcut="g"
						>
							<TextGenerationIcon
								className={"w-[24px] h-[24px] text-black-30 fill-current"}
							/>
						</ToggleGroupItem>
					</div>
				</ToggleGroup.Root>
			</div>
		</div>
	);
}
