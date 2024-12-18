"use server";

import { agents, db } from "@/drizzle";
import { createId } from "@paralleldrive/cuid2";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import type { FileId } from "../files/types";
import type { AgentId } from "../types";
import { elementsToMarkdown } from "../utils/unstructured";
import type { Graph } from "./types";

export async function setGraphToDb(agentId: AgentId, graph: Graph) {
	await db
		.update(agents)
		.set({ graphv2: graph, graphHash: createId() })
		.where(eq(agents.id, agentId));
}

type UploadFileArgs = {
	fileId: FileId;
	file: File;
};
export async function uploadFile(args: UploadFileArgs) {
	const blob = await put(`files/${args.fileId}/${args.file.name}`, args.file, {
		access: "public",
		contentType: args.file.type,
	});
	return blob;
}

type ParseFileArgs = {
	id: FileId;
	name: string;
	blobUrl: string;
};
export async function parseFile(args: ParseFileArgs) {
	if (process.env.UNSTRUCTURED_API_KEY === undefined) {
		throw new Error("UNSTRUCTURED_API_KEY is not set");
	}
	const client = new UnstructuredClient({
		security: {
			apiKeyAuth: process.env.UNSTRUCTURED_API_KEY,
		},
	});
	const response = await fetch(args.blobUrl);
	const content = await response.blob();
	const partitionResponse = await client.general.partition({
		partitionParameters: {
			files: {
				fileName: args.name,
				content,
			},
			strategy: Strategy.Fast,
			splitPdfPage: false,
			splitPdfConcurrencyLevel: 1,
		},
	});
	if (partitionResponse.statusCode !== 200) {
		console.error(partitionResponse.rawResponse);
		throw new Error(`Failed to parse file: ${partitionResponse.statusCode}`);
	}
	const jsonString = JSON.stringify(partitionResponse.elements, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });

	await put(`files/${args.id}/partition.json`, blob, {
		access: "public",
		contentType: blob.type,
	});

	const markdown = elementsToMarkdown(partitionResponse.elements ?? []);
	const markdownBlob = new Blob([markdown], { type: "text/markdown" });
	const vercelBlob = await put(`files/${args.id}/markdown.md`, markdownBlob, {
		access: "public",
		contentType: markdownBlob.type,
	});

	return vercelBlob;
}
