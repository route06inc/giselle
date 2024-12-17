"use server";

import { agents, db } from "@/drizzle";
import { fetchCurrentUser } from "@/services/accounts";
import { fetchCurrentTeam } from "@/services/teams";
import { createId } from "@paralleldrive/cuid2";
import { copy, list } from "@vercel/blob";
import { putGraph } from "../../(playground)/p/[agentId]/canary/actions";
import {
	buildFileFolderPath,
	createFileId,
	createGraphId,
	pathJoin,
	pathnameToFilename,
} from "../../(playground)/p/[agentId]/canary/lib/utils";
import type {
	AgentId,
	Graph,
	Node,
} from "../../(playground)/p/[agentId]/canary/types";

interface AgentDuplicationSuccess {
	result: "success";
	agentId: AgentId;
}
interface AgentDuplicationError {
	result: "error";
	message: string;
}
type AgentDuplicationResult = AgentDuplicationSuccess | AgentDuplicationError;

export async function copyAgentAction(
	prev: AgentDuplicationResult | null,
	formData: FormData,
): Promise<AgentDuplicationResult> {
	const agentId = formData.get("agentId");
	if (typeof agentId !== "string" || agentId.length === 0) {
		return { result: "error", message: "Please fill in the agent id" };
	}
	const agent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.id, agentId as AgentId),
	});
	if (agent === undefined || agent.graphUrl === null) {
		return { result: "error", message: `${agentId} is not found.` };
	}
	const [user, team, graph] = await Promise.all([
		fetchCurrentUser(),
		fetchCurrentTeam(),
		fetch(agent.graphUrl).then((res) => res.json() as unknown as Graph),
	]);
	const newNodes = await Promise.all(
		graph.nodes.map(async (node) => {
			if (node.content.type !== "files") {
				return node;
			}
			const newData = await Promise.all(
				node.content.data.map(async (fileData) => {
					if (fileData.status !== "completed") {
						return null;
					}
					const newFileId = createFileId();
					const blobList = await list({
						prefix: buildFileFolderPath(fileData.id),
					});
					let newFileBlobUrl = "";
					let newTextDataUrl = "";
					await Promise.all(
						blobList.blobs.map(async (blob) => {
							const copyResult = await copy(
								blob.url,
								pathJoin(
									buildFileFolderPath(newFileId),
									pathnameToFilename(blob.pathname),
								),
								{
									addRandomSuffix: true,
									access: "public",
								},
							);
							if (blob.url === fileData.fileBlobUrl) {
								newFileBlobUrl = copyResult.url;
							}
							if (blob.url === fileData.textDataUrl) {
								newTextDataUrl = copyResult.url;
							}
						}),
					);
					return {
						...fileData,
						id: newFileId,
						fileBlobUrl: newFileBlobUrl,
						textDataUrl: newTextDataUrl,
					};
				}),
			).then((data) => data.filter((d) => d !== null));
			return {
				...node,
				content: {
					...node.content,
					data: newData,
				},
			} as Node;
		}),
	);
	const newGraphId = createGraphId();
	const { url } = await putGraph({ ...graph, id: newGraphId, nodes: newNodes });
	const newAgentId = `agnt_${createId()}` as AgentId;
	const newAgent = await db.insert(agents).values({
		id: newAgentId,
		name: `Copy of ${agent.name ?? agentId}`,
		teamDbId: team.dbId,
		creatorDbId: user.dbId,
		graphUrl: url,
		graphv2: {
			agentId: newAgentId,
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
	return { result: "success", agentId: newAgentId };
}
