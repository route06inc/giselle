import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { AgentTimeCharge } from "./agent-time-charge";
import { AgentUsage } from "./agent-usage";
import BillingSection from "./billing-section";
import { DangerZone } from "./danger-zone";
import { TeamMembers } from "./team-members";
import { TeamName } from "./team-name";

export default function TeamPage() {
	return (
		<div className="grid gap-[16px]">
			<h3
				className="text-[32px] text-black--30 font-rosart"
				style={{ textShadow: "0px 0px 20px hsla(207, 100%, 48%, 1)" }}
			>
				Team
			</h3>
			<Suspense
				fallback={
					<div className="w-full h-24">
						<Skeleton className="h-full w-full" />
					</div>
				}
			>
				<AgentTimeCharge />
			</Suspense>

			<Suspense
				fallback={
					<div className="w-full h-24">
						<Skeleton className="h-full w-full" />
					</div>
				}
			>
				<TeamName />
			</Suspense>
			<TeamMembers />
			<AgentUsage />
			<BillingSection />
			<DangerZone />
		</div>
	);
}
