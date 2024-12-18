"use server";

import {
	ExternalServiceName,
	createLogger,
	waitForTelemetryExport,
	withCountMeasurement,
} from "@/lib/opentelemetry";
import { put } from "@vercel/blob";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import { elementsToMarkdown } from "../utils/unstructured";
import type { FileId } from "./types";

type UploadFileInput = {
	fileId: FileId;
	file: File;
};
export async function uploadFile({ input }: { input: UploadFileInput }) {
	const startTime = performance.now();
	const logger = createLogger("files");
	const result = await withCountMeasurement(
		logger,
		async () => {
			const result = await put(
				`files/${input.fileId}/${input.file.name}`,
				input.file,
				{
					access: "public",
					contentType: input.file.type,
				},
			);
			return {
				blob: result,
				size: input.file.size,
			};
		},
		ExternalServiceName.VercelBlob,
		startTime,
		"put",
	);
	waitForTelemetryExport();

	return result.blob;
}

type ParseFileInput = {
	id: FileId;
	name: string;
	blobUrl: string;
};
export async function parseFile(args: ParseFileInput) {
	const startTime = performance.now();
	const logger = createLogger("files");
	if (process.env.UNSTRUCTURED_API_KEY === undefined) {
		throw new Error("UNSTRUCTURED_API_KEY is not set");
	}
	const client = new UnstructuredClient({
		security: {
			apiKeyAuth: process.env.UNSTRUCTURED_API_KEY,
		},
	});
	const response = await withCountMeasurement(
		logger,
		async () => {
			const response = await fetch(args.blobUrl);
			const blob = await response.blob();
			return {
				blob,
				size: blob.size,
			};
		},
		ExternalServiceName.VercelBlob,
		startTime,
		"fetch",
	);

	const content = await response.blob;
	const strategy = Strategy.Fast;
	const partitionResponse = await withCountMeasurement(
		logger,
		() =>
			client.general.partition({
				partitionParameters: {
					files: {
						fileName: args.name,
						content,
					},
					strategy,
					splitPdfPage: false,
					splitPdfConcurrencyLevel: 1,
				},
			}),
		ExternalServiceName.Unstructured,
		startTime,
		strategy,
	);
	if (partitionResponse.statusCode !== 200) {
		console.error(partitionResponse.rawResponse);
		throw new Error(`Failed to parse file: ${partitionResponse.statusCode}`);
	}

	const jsonString = JSON.stringify(partitionResponse.elements, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });

	await withCountMeasurement(
		logger,
		() =>
			put(`files/${args.id}/partition.json`, blob, {
				access: "public",
				contentType: blob.type,
			}),
		ExternalServiceName.VercelBlob,
		startTime,
		"put",
	);

	const markdown = elementsToMarkdown(partitionResponse.elements ?? []);
	const markdownBlob = new Blob([markdown], { type: "text/markdown" });
	const vercelBlob = await put(`files/${args.id}/markdown.md`, markdownBlob, {
		access: "public",
		contentType: markdownBlob.type,
	});

	waitForTelemetryExport();

	return vercelBlob;
}
