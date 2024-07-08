import type { GET } from "@/app/api/workspaces/[slug]/workflows/[workflowId]/route";
import type { ResponseJson } from "@/app/api/workspaces/[slug]/workflows/createAndRun/route";
import type { InferResponse } from "@/lib/api";
import { fetcher } from "@/lib/fetcher";
import { useState } from "react";
import useSWR from "swr";

const getWorkflowRequestKey = (workspaceSlug: string, workflowId?: number) => {
	if (workflowId == null) {
		return false;
	}
	return `/api/workspaces/${workspaceSlug}/workflows/${workflowId}`;
};

export const useWorkflow = (workspaceSlug: string) => {
	const [workflowId, setWorkflowId] = useState<number | undefined>(undefined);
	const [optimisticData, setOptimisticData] = useState<
		InferResponse<typeof GET> | undefined
	>(undefined);
	const { data } = useSWR<InferResponse<typeof GET>>(
		getWorkflowRequestKey(workspaceSlug, workflowId),
		fetcher,
		{
			refreshInterval: (latestData) => {
				if (latestData != null) {
					return latestData.latestRun?.status === "success" ? 0 : 1000;
				}
				return 1000;
			},
		},
	);
	const createAndRunWorkflow = async () => {
		setOptimisticData({
			id: 0,
			workspaceId: 0,
			steps: [],
			latestRun: {
				id: 0,
				status: "creating",
				workflowId: 0,
				createdAt: new Date(),
				startedAt: null,
				finishedAt: null,
			},
			latestRunSteps: [],
			createdAt: new Date(),
		});
		const { id } = await fetch(
			`/api/workspaces/${workspaceSlug}/workflows/createAndRun`,
			{
				method: "POST",
				headers: {
					contentType: "application/json",
				},
			},
		).then((res) => res.json() as Promise<ResponseJson>);
		setWorkflowId(id);
	};
	return {
		runningWorkflow: data ?? optimisticData,
		createAndRunWorkflow,
	};
};
