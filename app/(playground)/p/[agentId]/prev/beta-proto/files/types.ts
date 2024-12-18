export type FileId = `fld_${string}`;

export const fileStatuses = {
	uploading: "uploading",
	processing: "processing",
	processed: "processed",
} as const;

export type FileStatus = (typeof fileStatuses)[keyof typeof fileStatuses];

type DraftFile = {
	id: FileId;
	object: "file";
	name: string;
	file: File;
	status: Extract<FileStatus, "uploading">;
};
export type UploadedFile = {
	id: FileId;
	blobUrl: string;
	object: "file";
	name: string;
	status: Extract<FileStatus, "processing">;
};
export type ProcessedFile = {
	id: FileId;
	blobUrl: string;
	structuredDataBlobUrl: string;
	name: string;
	object: "file";
	status: Extract<FileStatus, "processed">;
};
export type StructuredData = {
	id: FileId;
	title: string;
	object: "file";
	content: string;
};

export type GiselleFile = DraftFile | UploadedFile | ProcessedFile;
