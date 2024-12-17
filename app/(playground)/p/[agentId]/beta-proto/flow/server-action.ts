"use server";

import { agents, db } from "@/drizzle";
import {
	AgentActivity,
	hasEnoughAgentTimeCharge,
} from "@/services/agents/activities";
import { stripe } from "@/services/external/stripe";
import { fetchCurrentTeam, isProPlan } from "@/services/teams";
import { processUnreportedActivities } from "@/services/usage-based-billing";
import { AgentTimeUsageDAO } from "@/services/usage-based-billing/agent-time-usage-dao";
import { captureException } from "@sentry/nextjs";
import { put } from "@vercel/blob";
import { createStreamableValue } from "ai/rsc";
import { eq } from "drizzle-orm";
import type { GiselleNodeId } from "../giselle-node/types";
import type { AgentId } from "../types";
import { type V2FlowAction, setFlow, updateStep } from "./action";
import { saveAgentActivity } from "./save-agent-activity";
import {
	buildTextArtifact,
	generateArtifactObject,
} from "./server-actions/generate-text";
import {
	buildWebSearchArtifact,
	generateWebSearchArtifactObject,
} from "./server-actions/websearch";
import {
	type Flow,
	type GenerateResult,
	flowStatuses,
	stepStatuses,
} from "./types";
import { buildFlow, buildGenerateResult, buildGeneratorNode } from "./utils";

export async function executeFlow(
	agentId: AgentId,
	finalNodeId: GiselleNodeId,
) {
	const canExecute = await hasEnoughAgentTimeCharge();
	if (!canExecute) {
		throw new Error(
			"Your agent time has been depleted. Please upgrade your plan to continue using this feature.",
		);
	}
	const agentActivity = new AgentActivity(agentId, new Date());
	const stream = createStreamableValue<V2FlowAction>();
	(async () => {
		const agent = await db.query.agents.findFirst({
			where: eq(agents.id, agentId),
		});
		if (agent === undefined) {
			throw new Error(`Agent with id ${agentId} not found`);
		}
		const graph = agent.graphv2;
		const flow = await buildFlow({
			input: {
				agentId: graph.agentId,
				finalNodeId: finalNodeId,
				graph: graph,
			},
		});
		const flowBlob = await putFlow({ input: { flow } });
		stream.update(
			setFlow({
				input: {
					flow: {
						...flow,
						status: flowStatuses.queued,
						dataUrl: flowBlob.url,
					},
				},
			}),
		);
		const generateResults: GenerateResult[] = [];
		for (const job of flow.jobs) {
			await Promise.all(
				job.steps.map(async (step) => {
					const startTime = new Date();

					stream.update(
						updateStep({
							input: { stepId: step.id, status: stepStatuses.running },
						}),
					);
					const relevanceResults = step.sourceNodeIds
						.map((sourceNodeId) => {
							const sourceArtifact = generateResults.find(
								(generateResult) =>
									generateResult.generator.nodeId === sourceNodeId,
							);
							/** @todo log warning */
							if (sourceArtifact === undefined) {
								return null;
							}
							return sourceArtifact;
						})
						.filter((sourceArtifact) => sourceArtifact !== null);
					switch (step.action) {
						case "generate-text": {
							const artifactObject = await generateArtifactObject({
								input: {
									prompt: step.prompt,
									model: step.modelConfiguration,
									sources: [
										...step.sources,
										...relevanceResults.map((result) => result.artifact),
									],
								},
								options: {
									onStreamPartialObject: (object) => {
										stream.update(
											updateStep({
												input: {
													stepId: step.id,
													status: stepStatuses.streaming,
													output: buildTextArtifact({
														title: object.title ?? "",
														content: object.content ?? "",
													}),
												},
											}),
										);
									},
								},
							});
							generateResults.push(
								buildGenerateResult({
									generator: buildGeneratorNode({
										nodeId: step.node.id,
										archetype: step.node.archetype,
										name: step.node.name,
									}),
									artifact: buildTextArtifact({
										title: artifactObject.artifact.title,
										content: artifactObject.artifact.content,
									}),
								}),
							);
							break;
						}
						case "search-web": {
							const webSearchArtifact = await generateWebSearchArtifactObject({
								input: {
									prompt: step.prompt,
									sources: [
										...step.sources,
										...relevanceResults.map((result) => result.artifact),
									],
								},
								options: {
									onStreamPartialObject: (object) => {
										stream.update(
											updateStep({
												input: {
													stepId: step.id,
													status: stepStatuses.streaming,
													output: buildWebSearchArtifact({
														keywords: object.keywords ?? [],
														scrapingTasks: object.scrapingTasks ?? [],
													}),
												},
											}),
										);
									},
								},
							});
							generateResults.push(
								buildGenerateResult({
									generator: buildGeneratorNode({
										nodeId: step.node.id,
										archetype: step.node.archetype,
										name: step.node.name,
									}),
									artifact: buildWebSearchArtifact({
										keywords: webSearchArtifact.keywords,
										scrapingTasks: webSearchArtifact.scrapingTasks,
									}),
								}),
							);
							break;
						}
					}

					agentActivity.collectAction(step.action, startTime, new Date());

					stream.update(
						updateStep({
							input: { stepId: step.id, status: stepStatuses.completed },
						}),
					);
				}),
			);
		}

		stream.done();
		agentActivity.end();
		await saveAgentActivity(agentActivity);
		if (agentActivity.endedAt == null) {
			throw new Error("Activity must be ended before reporting");
		}
		await reportActivityToStripe(agentActivity.endedAt);
	})().catch((error) => {
		console.error(error);
		captureException(error);
	});

	return { streamableValue: stream.value };
}

async function reportActivityToStripe(targetDate: Date) {
	const currentTeam = await fetchCurrentTeam();
	if (!isProPlan(currentTeam)) {
		return;
	}
	return processUnreportedActivities(
		{
			teamDbId: currentTeam.dbId,
			targetDate: targetDate,
		},
		{
			dao: new AgentTimeUsageDAO(db),
			stripe: stripe,
		},
	);
}

interface PutFlowInput {
	flow: Flow;
}
export async function putFlow({ input }: { input: PutFlowInput }) {
	const blob = await put(
		`/flows/${input.flow.id}/flow.json`,
		JSON.stringify(input.flow),
		{
			access: "public",
			contentType: "application/json",
		},
	);
	return blob;
}
