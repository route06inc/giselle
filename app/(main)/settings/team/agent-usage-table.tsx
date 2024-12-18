import { LocalDateTime } from "./components/local-date-time";

export type AgentActivity = {
	agentId: string;
	agentName: string | null;
	startTime: Date;
	endTime: Date | null;
	usedCharge: number;
};

type AgentUsageTableProps = {
	activities: AgentActivity[];
	containerClassName?: string;
};

export function AgentUsageTable({
	activities,
	containerClassName,
}: AgentUsageTableProps) {
	return (
		<div className="font-avenir rounded-[16px]">
			<div className="grid grid-cols-4 gap-4 border-b border-zinc-800 bg-zinc-900/50 p-4 font-medium text-zinc-200">
				<div>Agent</div>
				<div>Start Time</div>
				<div>End Time</div>
				<div>Charge</div>
			</div>
			<div className={containerClassName}>
				<div className="divide-y divide-zinc-800">
					{activities.length > 0 ? (
						activities.map((activity) => (
							<div
								key={`${activity.agentId}-${activity.startTime}`}
								className="grid grid-cols-4 gap-4 p-4 items-center text-zinc-200"
							>
								<div className="break-words max-w-xs">
									{activity.agentName ?? activity.agentId}
								</div>
								<div className="text-zinc-400">
									<LocalDateTime date={new Date(activity.startTime)} />
								</div>
								<div className="text-zinc-400">
									{activity.endTime ? (
										<LocalDateTime date={new Date(activity.endTime)} />
									) : (
										"-"
									)}
								</div>
								<div>{activity.usedCharge} seconds</div>
							</div>
						))
					) : (
						<div className="p-4 text-zinc-400">No agent activities</div>
					)}
				</div>
			</div>
		</div>
	);
}
