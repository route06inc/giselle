"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { TeamRole } from "@/drizzle";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deleteTeamMember, updateTeamMemberRole } from "./actions";

type TeamMemberListItemProps = {
	userId: string;
	displayName: string | null;
	email: string | null;
	role: TeamRole;
	currentUserRole: TeamRole;
};

export function TeamMemberListItem({
	userId,
	displayName,
	email,
	role: initialRole,
	currentUserRole,
}: TeamMemberListItemProps) {
	const [isEditingRole, setIsEditingRole] = useState(false);
	const [role, setRole] = useState<TeamRole>(initialRole);
	const [tempRole, setTempRole] = useState<TeamRole>(role);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string>("");

	const canEditRole = currentUserRole === "admin";
	const handleRoleChange = (value: TeamRole) => {
		setTempRole(value);
	};

	const handleSaveRole = async () => {
		setError("");

		try {
			setIsLoading(true);

			const formData = new FormData();
			formData.append("userId", userId);
			formData.append("role", tempRole);

			const { success, error } = await updateTeamMemberRole(formData);

			if (success) {
				setIsEditingRole(false);
				setRole(tempRole);
			} else {
				const errorMsg = error || "Failed to update role";
				setError(errorMsg);
				console.error(errorMsg);
			}
		} catch (error) {
			if (error instanceof Error) {
				setError(error.message);
			}
			console.error("Error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancelRole = () => {
		setTempRole(role);
		setIsEditingRole(false);
		setError("");
	};

	const handleDelete = async () => {
		setError("");

		try {
			setIsLoading(true);

			const formData = new FormData();
			formData.append("userId", userId);
			formData.append("role", role);

			const { success, error } = await deleteTeamMember(formData);

			if (!success) {
				const errorMsg = error || "Failed to delete member";
				setError(errorMsg);
				console.error(errorMsg);
			}
		} catch (error) {
			if (error instanceof Error) {
				setError(error.message);
			}
			console.error("Error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="grid grid-cols-[1fr_1fr_200px] gap-4 p-4 items-center text-zinc-200">
			<div className="text-zinc-400">{displayName || "No display name"}</div>
			<div className="text-zinc-400">{email || "No email"}</div>
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-3">
					{isEditingRole ? (
						<>
							<Select
								value={tempRole}
								onValueChange={handleRoleChange}
								disabled={isLoading}
							>
								<SelectTrigger className="w-[100px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="member">Member</SelectItem>
								</SelectContent>
							</Select>
							<Button
								className="shrink-0 h-8 w-8 rounded-full p-0"
								onClick={handleSaveRole}
								disabled={isLoading || !!error}
							>
								<Check className="h-4 w-4" />
							</Button>
							<Button
								className="shrink-0 h-8 w-8 rounded-full p-0"
								onClick={handleCancelRole}
								disabled={isLoading}
							>
								<X className="h-4 w-4" />
							</Button>
						</>
					) : (
						<>
							<span className="text-zinc-400 capitalize w-[100px]">{role}</span>
							{canEditRole && (
								<>
									<Button
										className="shrink-0 h-8 w-8 rounded-full p-0"
										onClick={() => setIsEditingRole(true)}
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												className="shrink-0 h-8 w-8 rounded-full p-0"
												disabled={isLoading}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Remove team member</AlertDialogTitle>
												<AlertDialogDescription>
													Are you sure you want to remove {displayName || email}{" "}
													from the team? This action cannot be undone.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={handleDelete}
													className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:text-white"
												>
													Remove
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</>
							)}
						</>
					)}
				</div>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>
		</div>
	);
}
