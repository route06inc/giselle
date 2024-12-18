import { Button } from "@/components/ui/button";
import * as Tabs from "@radix-ui/react-tabs";
import clsx from "clsx/lite";
import { ArrowUpFromLineIcon, PaperclipIcon } from "lucide-react";
import { useCallback, useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "../../../components/dialog";
import { DocumentIcon } from "../../../components/icons/document";
import { useFeatureFlags } from "../../../feature-flags/context";
import { createFileId } from "../../../files/utils";
import { useGraph } from "../../../graph/context";
import { addSource } from "../../../graph/v2/composition/add-source";
import { createTextContentId } from "../../../text-content/factory";
import type { GiselleNode } from "../../types";

type AddSourceDialogProps = {
	node: GiselleNode;
};
export function AddSourceDialog(props: AddSourceDialogProps) {
	const { dispatch } = useGraph();
	const handleSubmit = useCallback<React.FormEventHandler<HTMLFormElement>>(
		(e) => {
			e.preventDefault();
			const formData = new FormData(e.currentTarget);
			const title = formData.get("title") as string;
			const content = formData.get("content") as string;
			dispatch(
				addSource({
					input: {
						nodeId: props.node.id,
						source: {
							object: "textContent",
							id: createTextContentId(),
							title,
							content,
						},
					},
				}),
			);
			setOpen(false);
		},
		[dispatch, props.node.id],
	);
	const [open, setOpen] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const [isDragging, setIsDragging] = useState(false);

	const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const addFilesToPromptNode = useCallback(
		(files: File[]) => {
			for (const file of files) {
				dispatch(
					addSource({
						input: {
							nodeId: props.node.id,
							source: {
								object: "file",
								name: file.name,
								id: createFileId(),
								status: "uploading",
								file,
							},
						},
					}),
				);
			}
			setFiles((prevFiles) => [...prevFiles, ...files]);
		},
		[dispatch, props.node.id],
	);

	const onDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(false);
			const droppedFiles = Array.from(e.dataTransfer.files);
			addFilesToPromptNode(droppedFiles);
			setOpen(false);
		},
		[addFilesToPromptNode],
	);

	const onFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files) {
				const selectedFiles = Array.from(e.target.files);
				addFilesToPromptNode(selectedFiles);
				setOpen(false);
			}
		},
		[addFilesToPromptNode],
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger>
				<PaperclipIcon size={18} className="stroke-black-30" />
			</DialogTrigger>
			<DialogContent className="h-auto w-[500px]">
				<div className="flex flex-col h-full overflow-hidden z-10">
					<DialogTitle className="sr-only">
						Are you absolutely sure?
					</DialogTitle>
					<DialogDescription className="sr-only">
						This action cannot be undone. This will permanently delete your
						account and remove your data from our servers.
					</DialogDescription>
					<Tabs.Root className="p-[40px] font-rosart text-[14px] text-black-30 drop-shadow-[0px_0px_20px_0px_hsla(207,_100%,_48%,_1)] gap-[24px] flex flex-col">
						<Tabs.List className="border-b border-black-70 pb-[4px] flex text-black-70">
							<Tabs.Trigger
								value="file"
								className="flex-1 data-[state=active]:text-black-30"
							>
								Add files
							</Tabs.Trigger>
							<Tabs.Trigger
								value="text-content"
								className="flex-1 data-[state=active]:text-black-30"
							>
								Add text content
							</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="file">
							<div
								className={clsx(
									"h-[300px] flex flex-col gap-[16px] justify-center items-center rounded-[8px] border border-dashed text-black-70 px-[18px]",
									isDragging
										? "bg-black-80/20 border-black-50"
										: "border-black-70",
								)}
								onDragOver={onDragOver}
								onDragLeave={onDragLeave}
								onDrop={onDrop}
							>
								{isDragging ? (
									<>
										<DocumentIcon className="w-[30px] h-[30px] fill-black-70" />
										<p className="text-center">Drop to upload your files</p>
									</>
								) : (
									<div className="flex flex-col gap-[16px] justify-center items-center">
										<ArrowUpFromLineIcon
											size={38}
											className="stroke-black-70"
										/>
										<div className="text-center flex flex-col gap-[16px]">
											<p>
												No contents added yet. Click to upload or drag and drop
												files here (supports images, documents, and more; max
												4.5MB per file).
											</p>
											<div className="flex gap-[8px] justify-center items-center">
												<span>or</span>
												<label
													htmlFor="file"
													className="font-bold text-black--50 text-[14px] underline cursor-pointer"
												>
													Select files
													<input
														id="file"
														type="file"
														onChange={onFileChange}
														className="hidden"
													/>
												</label>
											</div>
										</div>
									</div>
								)}
							</div>
						</Tabs.Content>
						<Tabs.Content value="text-content">
							<form
								className="gap-[24px] flex flex-col h-[300px]"
								onSubmit={handleSubmit}
							>
								<div className="flex flex-col gap-[4px]">
									<input
										type="text"
										className="bg-[hsla(0,0%,100%,0.29)] rounded-[4px] p-[12px] text-white placeholder:text-[hsla(207,43%,91%,0.6)] focus:outline focus:outline-[1px] focus:outline-black--50 font-avenir text-[12px]"
										placeholder="Title"
										name="title"
										data-1p-ignore
									/>
									<textarea
										placeholder="Content"
										name="content"
										rows={8}
										className="bg-[hsla(0,0%,100%,0.29)] rounded-[4px] p-[12px] text-white placeholder:text-[hsla(207,43%,91%,0.6)] focus:outline focus:outline-[1px] focus:outline-black--50 font-avenir text-[12px] resize-none"
									/>
								</div>
								<div className="flex items-center gap-[18px]">
									<DialogClose asChild>
										<Button
											type="button"
											variant="link"
											className="justify-center"
										>
											Cancel
										</Button>
									</DialogClose>
									<Button type="submit" className="font-[400]">
										Complete
									</Button>
								</div>
							</form>
						</Tabs.Content>
					</Tabs.Root>
				</div>
			</DialogContent>
		</Dialog>
	);
}
