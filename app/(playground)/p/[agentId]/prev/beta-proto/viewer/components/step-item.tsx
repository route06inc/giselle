import type { DetailedHTMLProps } from "react";
import { SpinnerIcon } from "../../components/icons/spinner";
import type { StepNode } from "../../flow/step-nodes/types";
import { type Step, stepStatuses } from "../../flow/types";
import { ArchetypeIcon } from "../../giselle-node/components/archetype-icon";

interface ActionItemProps
	extends DetailedHTMLProps<
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	> {
	step: Step;
	node: StepNode;
}
export function StepItem({ step, node, ...props }: ActionItemProps) {
	return (
		<button
			type="button"
			className="flex items-center gap-[8px] rounded-[4px] px-[8px] py-[4px] data-[state=active]:bg-black-80"
			{...props}
		>
			{step.status === stepStatuses.queued && (
				<SpinnerIcon className="w-[18px] h-[18px] stroke-black-30 fill-transparent" />
			)}
			{(step.status === stepStatuses.running ||
				step.status === stepStatuses.streaming) && (
				<SpinnerIcon className="w-[18px] h-[18px] stroke-black-30 animate-follow-through-spin fill-transparent" />
			)}
			{step.status === stepStatuses.completed && (
				<ArchetypeIcon
					archetype={node.archetype}
					className="w-[18px] h-[18px] fill-white"
				/>
			)}

			<div className="flex flex-col items-start">
				<p className="truncate text-[14px] font-rosart">{node.archetype}</p>
				<p className="line-clamp-1 font-rosart text-black-70 text-[8px]">
					{node.name} / {step.status}
				</p>
			</div>
		</button>
	);
}
