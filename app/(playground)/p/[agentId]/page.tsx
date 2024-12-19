import { getTeamMembershipByAgentId } from "@/app/(auth)/lib/get-team-membership-by-agent-id";
import { agents, db } from "@/drizzle";
import { developerFlag } from "@/flags";
import { toUTCDate } from "@/lib/date";
import {
	ExternalServiceName,
	VercelBlobOperation,
	createLogger,
	waitForTelemetryExport,
	withCountMeasurement,
} from "@/lib/opentelemetry";
import { getUser } from "@/lib/supabase";
import { saveAgentActivity } from "@/services/agents/activities";
import { reportAgentTimeUsage } from "@/services/usage-based-billing/report-agent-time-usage";
import { del, list, put } from "@vercel/blob";
import { ReactFlowProvider } from "@xyflow/react";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { putGraph } from "./actions";
import { Playground } from "./components/playground";
import { AgentNameProvider } from "./contexts/agent-name";
import { DeveloperModeProvider } from "./contexts/developer-mode";
import { ExecutionProvider } from "./contexts/execution";
import { GraphContextProvider } from "./contexts/graph";
import { MousePositionProvider } from "./contexts/mouse-position";
import { PlaygroundModeProvider } from "./contexts/playground-mode";
import { PropertiesPanelProvider } from "./contexts/properties-panel";
import { ToastProvider } from "./contexts/toast";
import { ToolbarContextProvider } from "./contexts/toolbar";
import { executeNode, executeStep, retryStep } from "./lib/execution";
import { isLatestVersion, migrateGraph } from "./lib/graph";
import { buildGraphExecutionPath, buildGraphFolderPath } from "./lib/utils";
import type {
	AgentId,
	Artifact,
	ExecutionId,
	ExecutionSnapshot,
	FlowId,
	Graph,
	NodeId,
	StepId,
} from "./types";

// Extend the max duration of the server actions from this page to 5 minutes
// https://vercel.com/docs/functions/runtimes#max-duration
export const maxDuration = 300;

export default async function Page({
	params,
}: {
	params: Promise<{ agentId: AgentId }>;
}) {
	const [developerMode, { agentId }, user] = await Promise.all([
		developerFlag(),
		params,
		getUser(),
	]);

	const [agent, teamMembership] = await Promise.all([
		db.query.agents.findFirst({
			where: (agents, { eq }) => eq(agents.id, agentId),
		}),
		getTeamMembershipByAgentId(agentId, user.id),
	]);
	// TODO: Remove graphUrl null check when add notNull constrain to graphUrl column
	if (agent === undefined || agent.graphUrl === null || !teamMembership) {
		notFound();
	}
	// TODO: Add schema validation to verify parsed graph matches expected shape
	let graph = await fetch(agent.graphUrl).then(
		(res) => res.json() as unknown as Graph,
	);

	async function persistGraph(graph: Graph) {
		"use server";
		const startTime = Date.now();
		const logger = createLogger("persistGraph");
		const { url } = await putGraph(graph);
		await db
			.update(agents)
			.set({
				graphUrl: url,
			})
			.where(eq(agents.id, agentId));
		const { blobList } = await withCountMeasurement(
			logger,
			async () => {
				const result = await list({
					prefix: buildGraphFolderPath(graph.id),
					mode: "folded",
				});
				const size = result.blobs.reduce((sum, blob) => sum + blob.size, 0);
				return {
					blobList: result,
					size,
				};
			},
			ExternalServiceName.VercelBlob,
			startTime,
			VercelBlobOperation.List,
		);

		const oldBlobs = blobList.blobs
			.filter((blob) => blob.url !== url)
			.map((blob) => ({
				url: blob.url,
				size: blob.size,
			}));
		if (oldBlobs.length > 0) {
			await withCountMeasurement(
				logger,
				async () => {
					await del(oldBlobs.map((blob) => blob.url));
					const totalSize = oldBlobs.reduce((sum, blob) => sum + blob.size, 0);
					return {
						size: totalSize,
					};
				},
				ExternalServiceName.VercelBlob,
				startTime,
				VercelBlobOperation.Del,
			);
			waitForTelemetryExport();
		}
		return url;
	}

	let graphUrl = agent.graphUrl;
	if (!isLatestVersion(graph)) {
		graph = migrateGraph(graph);
		graphUrl = await persistGraph(graph);
	}

	async function updateAgentName(agentName: string) {
		"use server";
		await db
			.update(agents)
			.set({
				name: agentName,
			})
			.where(eq(agents.id, agentId));
		return agentName;
	}

	async function executeStepAction(
		flowId: FlowId,
		executionId: ExecutionId,
		stepId: StepId,
		artifacts: Artifact[],
	) {
		"use server";
		return await executeStep(agentId, flowId, executionId, stepId, artifacts);
	}
	async function putExecutionAction(executionSnapshot: ExecutionSnapshot) {
		"use server";
		const startTime = Date.now();
		const result = await withCountMeasurement(
			createLogger("putExecutionAction"),
			async () => {
				const stringifiedExecution = JSON.stringify(executionSnapshot);
				const result = await put(
					buildGraphExecutionPath(graph.id, executionSnapshot.execution.id),
					stringifiedExecution,
					{
						access: "public",
					},
				);
				return {
					url: result.url,
					size: new TextEncoder().encode(stringifiedExecution).length,
				};
			},
			ExternalServiceName.VercelBlob,
			startTime,
			VercelBlobOperation.Put,
		);
		waitForTelemetryExport();
		return { blobUrl: result.url };
	}

	async function retryStepAction(
		retryExecutionSnapshotUrl: string,
		executionId: ExecutionId,
		stepId: StepId,
		artifacts: Artifact[],
	) {
		"use server";
		return await retryStep(
			agentId,
			retryExecutionSnapshotUrl,
			executionId,
			stepId,
			artifacts,
		);
	}

	async function executeNodeAction(executionId: ExecutionId, nodeId: NodeId) {
		"use server";
		return await executeNode(agentId, executionId, nodeId);
	}

	async function onFinishPerformExecutionAction(
		startedAt: number,
		endedAt: number,
		totalDurationMs: number,
	) {
		"use server";

		const startedAtDateUTC = toUTCDate(new Date(startedAt));
		const endedAtDateUTC = toUTCDate(new Date(endedAt));
		await saveAgentActivity(
			agentId,
			startedAtDateUTC,
			endedAtDateUTC,
			totalDurationMs,
		);
		await reportAgentTimeUsage(endedAtDateUTC);
	}

	return (
		<DeveloperModeProvider developerMode={developerMode}>
			<GraphContextProvider
				defaultGraph={graph}
				onPersistAction={persistGraph}
				defaultGraphUrl={graphUrl}
			>
				<PropertiesPanelProvider>
					<ReactFlowProvider>
						<ToolbarContextProvider>
							<MousePositionProvider>
								<ToastProvider>
									<AgentNameProvider
										defaultValue={agent.name ?? "Unnamed Agent"}
										updateAgentNameAction={updateAgentName}
									>
										<PlaygroundModeProvider>
											<ExecutionProvider
												executeStepAction={executeStepAction}
												putExecutionAction={putExecutionAction}
												retryStepAction={retryStepAction}
												executeNodeAction={executeNodeAction}
												onFinishPerformExecutionAction={
													onFinishPerformExecutionAction
												}
											>
												<Playground />
											</ExecutionProvider>
										</PlaygroundModeProvider>
									</AgentNameProvider>
								</ToastProvider>
							</MousePositionProvider>
						</ToolbarContextProvider>
					</ReactFlowProvider>
				</PropertiesPanelProvider>
			</GraphContextProvider>
		</DeveloperModeProvider>
	);
}
