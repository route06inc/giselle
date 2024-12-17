import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AGENT_TIME_CHARGE_LIMIT_MINUTES } from "@/services/agents/activities";
import { AlertTriangleIcon } from "lucide-react";

export function AgentTimeUsageForFreePlan({
	usedMinutes,
}: { usedMinutes: number }) {
	const includedMinutes = AGENT_TIME_CHARGE_LIMIT_MINUTES.FREE;
	const warningMessage =
		"Your free plan limit is almost reached. Upgrade to Pro for unlimited usage.";
	const overLimitMessage =
		"You've reached your free plan limit. Please upgrade to continue using the service.";
	return (
		<AgentTimeUsage
			usedMinutes={usedMinutes}
			includedMinutes={includedMinutes}
			warningMessage={warningMessage}
			overLimitMessage={overLimitMessage}
		/>
	);
}

export function AgentTimeUsageForProPlan({
	usedMinutes,
}: { usedMinutes: number }) {
	const includedMinutes = AGENT_TIME_CHARGE_LIMIT_MINUTES.PRO;
	const warningMessage =
		"Getting close to your monthly limit. Usage beyond this limit will be billed additionally";
	const overLimitMessage = "Additional minutes are subject to extra charges";

	return (
		<AgentTimeUsage
			usedMinutes={usedMinutes}
			includedMinutes={includedMinutes}
			warningMessage={warningMessage}
			overLimitMessage={overLimitMessage}
		/>
	);
}

type AgentTimeUsageProps = {
	/** Minutes used */
	usedMinutes: number;
	/** Minutes included in the plan */
	includedMinutes: number;
	/** Warning threshold ratio (decimal between 0-1) */
	warningThreshold?: number;
	/** Message displayed when approaching threshold */
	warningMessage?: string;
	/** Message displayed when exceeding limit */
	overLimitMessage?: string;
};

function AgentTimeUsage(props: AgentTimeUsageProps) {
	const {
		usedMinutes,
		includedMinutes,
		warningThreshold = 0.8,
		warningMessage = "",
		overLimitMessage = "",
	} = props;

	const percentage = (usedMinutes / includedMinutes) * 100;
	const isOverLimit = usedMinutes > includedMinutes;
	const isNearLimit =
		usedMinutes >= includedMinutes * warningThreshold && !isOverLimit;
	const remainingMinutes = includedMinutes - usedMinutes;
	const overMinutes = usedMinutes - includedMinutes;

	return (
		<>
			<div className="flex justify-between items-baseline font-avenir">
				<h2 className="text-black-30 text-[16px]">Agent Time Usage</h2>
				<div className="text-right">
					<div className="text-lg font-medium text-zinc-200">
						{isOverLimit ? (
							<span>
								{includedMinutes}min +{" "}
								<span className="text-red-400">{overMinutes}min used</span>
							</span>
						) : (
							<span>{usedMinutes}min used</span>
						)}
					</div>
					<div className="text-sm text-black--50">
						{Math.round(percentage)}% of your monthly limit used
					</div>
				</div>
			</div>

			<div className="relative w-full h-2">
				<div className="absolute w-full h-full rounded-full bg-blue-950" />
				<div
					className="absolute h-full rounded-full bg-slate-400 transition-all duration-300"
					style={{
						width: `${Math.min(100, percentage)}%`,
					}}
				/>
				{isOverLimit && (
					<div
						className="absolute h-full rounded-r-full bg-red-400 transition-all duration-300"
						style={{
							width: `${(overMinutes / includedMinutes) * 100}%`,
							left: "100%",
							transform: "translateX(-100%)",
						}}
					/>
				)}
			</div>

			<div className="flex justify-between text-sm text-slate-400">
				<span>0min</span>
				<span>
					{isOverLimit ? `${usedMinutes}min` : `${includedMinutes}min`}
				</span>
			</div>

			<div className="text-sm text-black--50">
				{includedMinutes} minutes included with your plan
			</div>

			{isNearLimit && (
				<Alert className="border-lime-400 p-4 text-lime-100">
					<AlertTriangleIcon className="h-5 w-5 stroke-zinc-800 fill-lime-200" />

					<div className="mt-2">
						<AlertTitle className="text-lime-200 font-bold">
							Only {remainingMinutes}{" "}
							{remainingMinutes === 1 ? "minute" : "minutes"} remaining in your
							plan
						</AlertTitle>

						<AlertDescription className="text-lime-100">
							{warningMessage}
						</AlertDescription>
					</div>
				</Alert>
			)}

			{isOverLimit && (
				<Alert
					variant="destructive"
					className="bg-red-950/30 border-red-500/20 flex"
				>
					<AlertTriangleIcon className="h-5 w-5 stroke-zinc-800 fill-red-500" />

					<div className="mt-2">
						<AlertTitle className="text-red-500 font-bold">
							{overMinutes} minutes over your plan limit
						</AlertTitle>
						<AlertDescription className="text-red-400">
							{overLimitMessage}
						</AlertDescription>
					</div>
				</Alert>
			)}
		</>
	);
}
