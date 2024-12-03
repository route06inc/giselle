import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	db,
	subscriptions,
	supabaseUserMappings,
	teamMemberships,
	teams,
} from "@/drizzle";
import { proTeamPlanFlag } from "@/flags";
import { getUser } from "@/lib/supabase";
import { manageBilling } from "@/services/teams/actions/manage-billing";
import { upgradeTeam } from "@/services/teams/actions/upgrade-team";
import { and, eq } from "drizzle-orm";
import { Suspense } from "react";
import { Card } from "../components/card";

export default async function BillingSection() {
	const team = await fetchTeam();
	const isProPlan = team.subscriptionId != null || team.type === "internal";

	const proTeamPlan = await proTeamPlanFlag();
	return (
		<Card title="Billing">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm text-zinc-400">Current Plan</p>
					<p className="text-xl font-semibold text-zinc-200">
						{isProPlan ? "Pro" : "Free"} Plan
					</p>
				</div>
				{proTeamPlan && team.type !== "internal" && (
					<form>
						<Suspense
							fallback={<Skeleton className="h-10 w-[120px] rounded-md" />}
						>
							<BillingButton
								subscriptionId={team.subscriptionId}
								teamDbId={team.dbid}
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

async function fetchTeam() {
	const user = await getUser();

	// FIXME: Users may have multiple teams. fetching the team should be changed in near future.
	const [team] = await db
		.select({
			dbid: teams.dbId,
			name: teams.name,
			type: teams.type,
			subscriptionId: subscriptions.id,
		})
		.from(teams)
		.innerJoin(teamMemberships, eq(teams.dbId, teamMemberships.teamDbId))
		.innerJoin(
			supabaseUserMappings,
			eq(teamMemberships.userDbId, supabaseUserMappings.userDbId),
		)
		.leftJoin(
			subscriptions,
			and(
				eq(subscriptions.teamDbId, teams.dbId),
				eq(subscriptions.status, "active"),
			),
		)
		.where(eq(supabaseUserMappings.supabaseUserId, user.id));
	return team;
}
