"use server";

import {
	ExternalServiceName,
	VercelBlobOperation,
	createLogger,
	wrappedPartition as partition,
	waitForTelemetryExport,
	withCountMeasurement,
} from "@/lib/opentelemetry";
import { type ListBlobResult, del, list, put } from "@vercel/blob";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import { vercelBlobFileFolder } from "./constants";

import {
	buildFileFolderPath,
	buildGraphPath,
	elementsToMarkdown,
	pathJoin,
} from "./lib/utils";
import type { FileData, FileId, Graph } from "./types";

export async function parse(id: FileId, name: string, blobUrl: string) {
	const logger = createLogger("parse");

	const measureParameters = {
		startTime: Date.now(),
		logger,
	};
	if (process.env.UNSTRUCTURED_API_KEY === undefined) {
		throw new Error("UNSTRUCTURED_API_KEY is not set");
	}
	const partitionResponse = await partition(
		new UnstructuredClient({
			security: {
				apiKeyAuth: process.env.UNSTRUCTURED_API_KEY,
			},
		}),
		blobUrl,
		{
			fileName: name,
			strategy: Strategy.Fast,
			splitPdfPage: false,
			splitPdfConcurrencyLevel: 1,
		},
		measureParameters,
	);
	const startTime = Date.now();
	if (partitionResponse.statusCode !== 200) {
		console.error(partitionResponse.rawResponse);
		throw new Error(`Failed to parse file: ${partitionResponse.statusCode}`);
	}
	const jsonString = JSON.stringify(partitionResponse.elements, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });

	await withCountMeasurement(
		logger,
		async () => {
			const result = await put(
				pathJoin(vercelBlobFileFolder, id, "partition.json"),
				blob,
				{ access: "public", contentType: blob.type },
			);
			return {
				blob: result,
				size: blob.size,
			};
		},
		ExternalServiceName.VercelBlob,
		startTime,
		VercelBlobOperation.Put,
	);

	const startTimeConvertMarkdown = Date.now();
	const markdown = elementsToMarkdown(partitionResponse.elements ?? []);
	const markdownBlob = new Blob([markdown], { type: "text/markdown" });
	const result = await withCountMeasurement(
		logger,
		async () => {
			const result = await put(
				pathJoin(vercelBlobFileFolder, id, "markdown.md"),
				markdownBlob,
				{
					access: "public",
					contentType: markdownBlob.type,
				},
			);
			return {
				vercelBlob: result,
				size: markdownBlob.size,
			};
		},
		ExternalServiceName.VercelBlob,
		startTimeConvertMarkdown,
		VercelBlobOperation.Put,
	);

	waitForTelemetryExport();
	return result.vercelBlob;
}

export async function putGraph(graph: Graph) {
	const startTime = Date.now();
	const stringifiedGraph = JSON.stringify(graph);
	const result = await withCountMeasurement(
		createLogger("put-graph"),
		async () => {
			const result = await put(buildGraphPath(graph.id), stringifiedGraph, {
				access: "public",
			});

			return {
				blob: result,
				size: new TextEncoder().encode(stringifiedGraph).length,
			};
		},
		ExternalServiceName.VercelBlob,
		startTime,
		VercelBlobOperation.Put,
	);
	waitForTelemetryExport();
	return result.blob;
}

export async function remove(fileData: FileData) {
	const startTime = Date.now();
	function calcTotalSize(blobList: ListBlobResult): number {
		return blobList.blobs.reduce((sum, blob) => sum + blob.size, 0);
	}
	const { blobList } = await withCountMeasurement(
		createLogger("remove"),
		async () => {
			const result = await list({
				prefix: buildFileFolderPath(fileData.id),
			});
			return {
				blobList: result,
				size: calcTotalSize(result),
			};
		},
		ExternalServiceName.VercelBlob,
		startTime,
		VercelBlobOperation.List,
	);

	const startTimeDel = Date.now();
	if (blobList.blobs.length > 0) {
		await withCountMeasurement(
			createLogger("remove"),
			async () => {
				await del(blobList.blobs.map((blob) => blob.url));

				return {
					size: calcTotalSize(blobList),
				};
			},
			ExternalServiceName.VercelBlob,
			startTimeDel,
			VercelBlobOperation.Del,
		);
		waitForTelemetryExport();
	}
}
