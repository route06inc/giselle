import { cn } from "@/lib/utils";
import { cva } from "cva";
import { CircleCheckIcon, CircleIcon, LoaderCircleIcon } from "lucide-react";
import type { FC } from "react";
import { P, match } from "ts-pattern";

import type {
	AgentRequest,
	RequestStep,
} from "@/app/agents/models/agent-process";
import type { RunStatus } from "@/drizzle/schema";
const stepListItemVariant = cva({
	base: "flex items-center justify-between ",
	variants: {
		status: {
			idle: "text-muted-foreground",
			running: "text-foreground",
			success: "text-foreground",
			failed: "text-foreground",
		},
	},
});

type StepListItemProps = RequestStep;
const StepListItem: FC<StepListItemProps> = (props) => (
	<div
		className={cn(
			stepListItemVariant({
				status: props.status,
			}),
		)}
	>
		<p>{props.node.type}</p>
		<div className="flex items-center justify-end gap-2">
			{/* {match(props.runStep)
				.with({ status: "idle" }, () => <></>)
				.otherwise(() => (
					<span className="text-xs">2s</span>
				))} */}
			{match(props)
				.with({ status: "idle" }, () => <CircleIcon className="w-4 h-4" />)
				.with({ status: "running" }, () => (
					<LoaderCircleIcon className="w-4 h-4 animate-spin" />
				))
				.with({ status: "success" }, () => (
					<CircleCheckIcon className="w-4 h-4" />
				))
				// .with({ status: "failure" }, () => <CircleIcon className="w-4 h-4" />)
				.otherwise(() => null)}
		</div>
	</div>
);

export const AgentProcessLogger: FC<AgentRequest> = ({ run }) => {
	return (
		<div className="bg-background/50 border border-border w-[200px] text-sm">
			<div className="px-4 py-1 border-b">
				<p>Run Workflow</p>
			</div>

			<div className="px-4 py-2 flex flex-col gap-2">
				{match(run)
					.with(P.nullish, () => <p>Creating workflow...</p>)
					.otherwise(({ processes }) =>
						processes.map((process) => (
							<StepListItem key={process.id} {...process} />
						)),
					)}
			</div>
		</div>
	);
};
