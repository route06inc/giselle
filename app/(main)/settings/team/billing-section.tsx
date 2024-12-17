import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { proTeamPlanFlag } from "@/flags";
import { fetchCurrentTeam, isProPlan } from "@/services/teams";
import { manageBilling } from "@/services/teams/actions/manage-billing";
import { upgradeTeam } from "@/services/teams/actions/upgrade-team";
import { Suspense } from "react";
import { Card } from "../components/card";

export default async function BillingSection() {
	const team = await fetchCurrentTeam();
	const proTeamPlan = await proTeamPlanFlag();

	return (
		<Card title="Billing">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-zinc-400">Current Plan</p>
					<p className="text-xl font-semibold text-zinc-200">
						{isProPlan(team) ? "Pro" : "Free"} Plan
					</p>
				</div>
				{proTeamPlan && team.type !== "internal" && (
					<form>
						<Suspense
							fallback={<Skeleton className="h-10 w-[120px] rounded-md" />}
						>
							<BillingButton
								subscriptionId={team.activeSubscriptionId}
								teamDbId={team.dbId}
							/>
						</Suspense>
					</form>
				)}
			</div>
		</Card>
	);
}

type BillingButtonProps = {
	subscriptionId: string | null;
	teamDbId: number;
};

async function BillingButton({ subscriptionId, teamDbId }: BillingButtonProps) {
	const upgrateTeamWithTeamDbId = upgradeTeam.bind(null, teamDbId);
	if (subscriptionId == null) {
		return (
			<Button className="w-fit" formAction={upgrateTeamWithTeamDbId}>
				Upgrade Plan
			</Button>
		);
	}

	const manageBillingWithSubscriptionId = manageBilling.bind(
		null,
		subscriptionId,
	);
	return (
		<Button className="w-fit" formAction={manageBillingWithSubscriptionId}>
			Manage Billing
		</Button>
	);
}
