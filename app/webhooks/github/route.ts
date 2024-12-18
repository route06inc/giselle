import type { GenerateResult } from "@/app/(playground)/p/[agentId]/prev/beta-proto/flow/types";
import type { GiselleNodeId } from "@/app/(playground)/p/[agentId]/prev/beta-proto/giselle-node/types";
import { db, gitHubIntegrations } from "@/drizzle";
import {
	buildAppInstallationClient,
	needsAdditionalPermissions,
	webhooks,
} from "@/services/external/github";
import type { GitHubNextAction } from "@/services/external/github/types";
import type { EmitterWebhookEvent } from "@octokit/webhooks";
import type { WebhookEventName } from "@octokit/webhooks-types";
import { captureException } from "@sentry/nextjs";
import { waitUntil } from "@vercel/functions";
import type { NextRequest } from "next/server";
import {
	buildTextArtifact,
	generateArtifactObject,
} from "../../(playground)/p/[agentId]/prev/beta-proto/flow/server-actions/generate-text";
import {
	buildWebSearchArtifact,
	generateWebSearchArtifactObject,
} from "../../(playground)/p/[agentId]/prev/beta-proto/flow/server-actions/websearch";
import {
	buildFlow,
	buildGenerateResult,
	buildGeneratorNode,
} from "../../(playground)/p/[agentId]/prev/beta-proto/flow/utils";
import { parseCommand } from "./command";

function setupHandlers() {
	webhooks.on("issue_comment", issueCommentHandler);
}

setupHandlers();

export async function POST(request: NextRequest) {
	const { id, name, signature, body } = await parseWebhookRequest(request);

	const verifyOK = await webhooks.verify(body, signature);
	if (!verifyOK) {
		return new Response("Failed to verify webhook", { status: 400 });
	}

	try {
		const payload = JSON.parse(body);
		await webhooks.receive({ id, name, payload } as EmitterWebhookEvent);
		return new Response("OK");
	} catch (error) {
		if (requireAdditionalPermission(error)) {
			// TODO: notify the user that additional permissions are required
			throw new Error("Additional permissions required");
		}

		// TODO: consider filtering out expected errors
		captureException(error);
		return new Response("Failed to receive webhook", {
			status: 400,
		});
	}
}

async function parseWebhookRequest(request: NextRequest) {
	const id = request.headers.get("X-GitHub-Delivery") ?? "";
	const name = request.headers.get("X-GitHub-Event") as WebhookEventName;
	const signature = request.headers.get("X-Hub-Signature-256") ?? "";
	const body = await request.text();
	return { id, name, signature, body };
}

function requireAdditionalPermission(error: unknown) {
	if (error instanceof AggregateError) {
		for (const e of error.errors) {
			if (
				needsAdditionalPermissions(e) ||
				needsAdditionalPermissions(error.cause)
			) {
				return true;
			}
		}
	}
	return needsAdditionalPermissions(error);
}

async function retrieveIntegrations(
	repositoryFullName: string,
	callSign: string,
) {
	return await db.query.gitHubIntegrations.findMany({
		where: (gitHubIntegrations, { eq, and }) =>
			and(
				eq(gitHubIntegrations.repositoryFullName, repositoryFullName),
				eq(gitHubIntegrations.callSign, callSign),
			),
	});
}

async function issueCommentHandler(
	event: EmitterWebhookEvent<"issue_comment">,
) {
	const payload = event.payload;

	if (payload.installation === undefined) {
		return;
	}

	const issueNumber = payload.issue.number;
	const repo = payload.repository.name;
	const owner = payload.repository.owner.login;
	const repositoryFullName = payload.repository.full_name;
	const installationId = payload.installation.id;

	const command = parseCommand(payload.comment.body);
	if (command === null) {
		return;
	}
	const integrations = await retrieveIntegrations(
		repositoryFullName,
		command.callSign,
	);
	waitUntil(
		Promise.all(
			integrations.map(
				async (integration) =>
					await run({
						agentDbId: integration.agentDbId,
						startNodeId: integration.startNodeId,
						endNodeId: integration.endNodeId,
						prompt: command.content,
						gitHubAppInstallationId: installationId,
						nextAction: {
							type: integration.nextAction,
							issueNumber,
							repo,
							owner,
						},
					}),
			),
		),
	);
	return new Response("Accepted", { status: 202 });
}

interface NextActionBase {
	type: GitHubNextAction;
}
interface ReplyIssueCommentAction extends NextActionBase {
	type: "github.issue_comment.reply";
	owner: string;
	repo: string;
	issueNumber: number;
}
type NextAction = ReplyIssueCommentAction;
interface RunInput {
	agentDbId: number;
	startNodeId: GiselleNodeId;
	prompt: string;
	endNodeId: GiselleNodeId;
	gitHubAppInstallationId: number;
	nextAction: NextAction;
}
async function run(input: RunInput) {
	const agent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.dbId, input.agentDbId),
	});
	if (agent === undefined) {
		return;
	}
	const flow = await buildFlow({
		input: {
			agentId: agent.id,
			finalNodeId: input.endNodeId,
			graph: agent.graphv2,
		},
	});

	const generateResults: GenerateResult[] = [];
	for (const job of flow.jobs) {
		await Promise.all(
			job.steps.map(async (step) => {
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
						const prompt =
							input.startNodeId === step.node.id ? input.prompt : step.prompt;
						const artifactObject = await generateArtifactObject({
							input: {
								prompt,
								model: step.modelConfiguration,
								sources: [
									...step.sources,
									...relevanceResults.map((result) => result.artifact),
								],
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
			}),
		);
	}

	const output = generateResults.find(
		(generateResult) => generateResult.generator.nodeId === input.endNodeId,
	);
	if (output === undefined || output.artifact.object === "artifact.webSearch") {
		/** @todo log */
		return;
	}

	if (input.nextAction.type === "github.issue_comment.reply") {
		const commentBody = output.artifact.content;

		const octokit = await buildAppInstallationClient(
			input.gitHubAppInstallationId,
		);

		await octokit.request(
			"POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
			{
				owner: input.nextAction.owner,
				repo: input.nextAction.repo,
				issue_number: input.nextAction.issueNumber,
				body: commentBody,
			},
		);
	}
}
