import { getCurrentTeam } from "@/app/(auth)/lib";
import { Button } from "@/components/ui/button";
import { agents, db } from "@/drizzle";
import { getUser } from "@/lib/supabase";
import { createId } from "@paralleldrive/cuid2";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { putGraph } from "../../(playground)/p/[agentId]/canary/actions";
import { initGraph } from "../../(playground)/p/[agentId]/canary/utils";

export default function Layout({
	children,
}: {
	children: ReactNode;
}) {
	async function createAgent() {
		"use server";
		const graph = initGraph();
		const agentId = `agnt_${createId()}` as const;
		const { url } = await putGraph(graph);
		const team = await getCurrentTeam();
		await db.insert(agents).values({
			id: agentId,
			teamDbId: team.dbId,
			graphUrl: url,
			graphv2: {
				agentId,
				nodes: [],
				xyFlow: {
					nodes: [],
					edges: [],
				},
				connectors: [],
				artifacts: [],
				webSearches: [],
				mode: "edit",
				flowIndexes: [],
			},
		});
		redirect(`/p/${agentId}`);
	}

	return (
		<div className="flex h-full divide-x divide-black-80">
			<div className="w-[200px] h-full p-[24px]">
				<form action={createAgent}>
					<Button type="submit">New Agent +</Button>
				</form>
			</div>
			{children}
		</div>
	);
}
