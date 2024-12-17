import { agents, db } from "@/drizzle";
import { developerFlag, playgroundV2Flag } from "@/flags";
import { del, list, put } from "@vercel/blob";
import { ReactFlowProvider } from "@xyflow/react";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { action, putGraph } from "./actions";
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
import { executeStep } from "./lib/execution";
import { isLatestVersion, migrateGraph } from "./lib/graph";
import { buildGraphExecutionPath, buildGraphFolderPath } from "./lib/utils";
import type {
	AgentId,
	Artifact,
	ArtifactId,
	Execution,
	ExecutionId,
	FlowId,
	Graph,
	NodeId,
	StepId,
} from "./types";

// Extend the max duration of the server actions from this page to 5 minutes
// https://vercel.com/docs/functions/runtimes#max-duration
export const maxDuration = 300;

// This page is experimental. it requires PlaygroundV2Flag to show this page
export default async function Page({
	params,
}: {
	params: Promise<{ agentId: AgentId }>;
}) {
	const [playgroundV2, developerMode, { agentId }] = await Promise.all([
		playgroundV2Flag(),
		developerFlag(),
		params,
	]);
	if (!playgroundV2) {
		return notFound();
	}
	const agent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.id, agentId),
	});
	// TODO: Remove graphUrl null check when add notNull constrain to graphUrl column
	if (agent === undefined || agent.graphUrl === null) {
		throw new Error("Agent not found");
	}
	// TODO: Add schema validation to verify parsed graph matches expected shape
	let graph = await fetch(agent.graphUrl).then(
		(res) => res.json() as unknown as Graph,
	);

	async function persistGraph(graph: Graph) {
		"use server";
		const { url } = await putGraph(graph);
		await db
			.update(agents)
			.set({
				graphUrl: url,
			})
			.where(eq(agents.id, agentId));
		const blobList = await list({
			prefix: buildGraphFolderPath(graph.id),
		});

		const oldBlobUrls = blobList.blobs
			.filter((blob) => blob.url !== url)
			.map((blob) => blob.url);
		if (oldBlobUrls.length > 0) {
			await del(oldBlobUrls);
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

	async function execute(artifactId: ArtifactId, nodeId: NodeId) {
		"use server";
		return await action(artifactId, agentId, nodeId);
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
	async function putExecutionAction(execution: Execution) {
		"use server";
		const result = await put(
			buildGraphExecutionPath(graph.id, execution.id),
			JSON.stringify(execution),
			{
				access: "public",
			},
		);
		return { blobUrl: result.url };
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
												executeAction={execute}
												executeStepAction={executeStepAction}
												putExecutionAction={putExecutionAction}
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
