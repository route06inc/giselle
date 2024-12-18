import { Card } from "@/app/(main)/settings/components/card";
import { getAgentActivities } from "./actions";
import { AgentUsageDialog } from "./agent-usage-dialog";
import { AgentUsageTable } from "./agent-usage-table";

export async function AgentUsage() {
	const result = await getAgentActivities({ limit: 50 });

	if (!result.success || !result.data) {
		return (
			<Card title="Recent Agent Usage">
				<div className="text-zinc-400 p-4">Failed to load agent activities</div>
			</Card>
		);
	}

	const activities = result.data;
	const recentActivities = activities.slice(0, 3);

	return (
		<Card
			title="Recent Agent Usage"
			action={{
				component:
					activities.length > 0 ? (
						<AgentUsageDialog activities={activities} />
					) : null,
			}}
		>
			<AgentUsageTable activities={recentActivities} />
		</Card>
	);
}
