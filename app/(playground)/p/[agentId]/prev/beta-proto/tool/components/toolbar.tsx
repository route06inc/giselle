import {
	ChevronUpIcon,
	FileCode2Icon,
	FileSearchIcon,
	HandIcon,
	MousePointer2Icon,
	TextIcon,
} from "lucide-react";
import { type FC, type PropsWithChildren, forwardRef } from "react";
import { DataIcon } from "../../components/icons/data";
import { GlobeIcon } from "../../components/icons/globe";
import { PromptIcon } from "../../components/icons/prompt";
import { TextGenerationIcon } from "../../components/icons/text-generation";
import { ToolIcon } from "../../components/icons/tool";
import { WilliIcon } from "../../components/icons/willi";
import { ListItem } from "../../components/list-item";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "../../components/popover";
import { useFeatureFlags } from "../../feature-flags/context";
import {
	textGeneratorBlueprint,
	webSearchBlueprint,
} from "../../giselle-node/blueprints";
import { ToolSelectOption } from "./tool-select-option";

export const GradientBorder: FC = () => (
	<div className="absolute z-0 rounded-[46px] inset-0 border mask-fill bg-gradient-to-br from-[hsla(232,37%,72%,0.2)] to-[hsla(218,58%,21%,0.9)] bg-origin-border bg-clip-boarder border-transparent" />
);

const ToolbarButton = forwardRef<HTMLButtonElement, PropsWithChildren>(
	(props, ref) => (
		<button
			type="button"
			className="w-[38px] h-[38px] flex items-center justify-center"
			ref={ref}
			{...props}
		/>
	),
);

export const Toolbar: FC = () => {
	return (
		<div className="relative rounded-[46px] overflow-hidden bg-black-100">
			<GradientBorder />
			<div className="flex divide-x divide-[hsla(232,36%,72%,0.2)] items-center h-[46px] px-[8px]">
				<div className="flex items-center px-2 z-10 h-full">
					<div className="flex gap-[4px]">
						<Popover>
							<PopoverTrigger asChild>
								<ToolbarButton>
									<ToolIcon className="fill-black-30" />
								</ToolbarButton>
							</PopoverTrigger>
							<PopoverContent sideOffset={24}>
								<div className="grid">
									<ToolSelectOption
										tool={{
											type: "addGiselleNode",
											giselleNodeBlueprint: textGeneratorBlueprint,
										}}
										icon={
											<TextGenerationIcon className="fill-black-30 w-[16px] h-[16px]" />
										}
										label="Text Generation"
									/>
									<ToolSelectOption
										tool={{
											type: "addGiselleNode",
											giselleNodeBlueprint: webSearchBlueprint,
										}}
										icon={
											<GlobeIcon className="fill-black-30 w-[16px] h-[16px]" />
										}
										label="Web Search"
									/>
									{/**
								<ToolSelectOption
									tool={{
										type: "add-knowledge-retrieval-node",
									}}
									icon={
										<FileSearchIcon
											size={16}
											strokeWidth={2}
											className="text-black-30"
										/>
									}
									label="Knowledge Retrieval"
								/>
								<ToolSelectOption
									tool={{
										type: "add-web-scraping-node",
									}}
									icon={
										<FileCode2Icon
											size={16}
											strokeWidth={2}
											className="text-black-30"
										/>
									}
									label="Web Scraping"
								/>
						  */}
								</div>
							</PopoverContent>
						</Popover>

						{/**
					<Popover>
						<PopoverTrigger asChild>
							<ToolbarButton>
								<DataIcon className="fill-black-30" />
							</ToolbarButton>
						</PopoverTrigger>
						<PopoverContent sideOffset={24}>
							<div className="flex gap-6">
								<ToolSelectOption
									tool={{
										type: "add-text-node",
									}}
									icon={<PromptIcon className="fill-black-30" />}
									label="Prompt"
								/>
							</div>
						</PopoverContent>
					</Popover>
				 */}
					</div>
				</div>
			</div>
		</div>
	);
};
