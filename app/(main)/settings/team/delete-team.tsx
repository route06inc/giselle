"use client";

import { Card } from "@/app/(main)/settings/components/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useActionState, useState } from "react";
import { deleteTeam } from "./actions";

export function DeleteTeam() {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [state, action, pending] = useActionState(deleteTeam, {
		error: "",
	});

	const handleOpenChange = (open: boolean) => {
		setShowDeleteConfirm(open);
	};

	return (
		<Card
			title="Delete Team"
			description="This team will be permanently deleted. This action is irreversible and cannot be undone."
		>
			<Dialog open={showDeleteConfirm} onOpenChange={handleOpenChange}>
				<DialogTrigger asChild>
					<Button variant="destructive" className="w-fit">
						Delete Team
					</Button>
				</DialogTrigger>
				<DialogContent className="bg-zinc-950 border-zinc-800">
					<DialogHeader>
						<DialogTitle className="text-zinc-200">Delete Team</DialogTitle>
					</DialogHeader>
					<Alert
						variant="destructive"
						className="bg-rose-500/10 border-rose-500/20"
					>
						<AlertDescription>
							This action cannot be undone. This will permanently delete the
							team and remove all members.
						</AlertDescription>
					</Alert>
					{state.error !== "" && (
						<Alert
							variant="destructive"
							className="mt-2 bg-rose-500/10 border-rose-500/20"
						>
							<AlertDescription className="text-rose-400">
								{state.error}
							</AlertDescription>
						</Alert>
					)}
					<form action={action} className="flex justify-end space-x-2">
						<Button
							type="button"
							onClick={() => setShowDeleteConfirm(false)}
							className="bg-transparent border-zinc-800 text-zinc-200 hover:bg-zinc-900"
							disabled={pending}
						>
							Cancel
						</Button>
						<Button type="submit" variant="destructive" disabled={pending}>
							{pending ? "Deleting..." : "Delete Team"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>
		</Card>
	);
}
