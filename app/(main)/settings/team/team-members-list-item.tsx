"use client";

import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { TeamRole } from "@/drizzle";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { updateTeamMemberRole } from "./actions";

type TeamMemberListItemProps = {
	userId: string;
	displayName: string | null;
	email: string | null;
	role: TeamRole;
	currentUserRoleState: [TeamRole, (role: TeamRole) => void];
};

export function TeamMemberListItem({
	userId,
	displayName,
	email,
	role: initialRole,
	currentUserRoleState,
}: TeamMemberListItemProps) {
	const [isEditingRole, setIsEditingRole] = useState(false);
	const [role, setRole] = useState<TeamRole>(initialRole);
	const [tempRole, setTempRole] = useState<TeamRole>(role);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string>("");

	const [currentUserRole, setCurrentUserRole] = currentUserRoleState;
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

			const { success, isUpdatingSelf } = await updateTeamMemberRole(formData);

			if (success) {
				setIsEditingRole(false);
				setRole(tempRole);

				if (isUpdatingSelf) {
					setCurrentUserRole(tempRole);
				}
			} else {
				setError("Failed to update role");
				console.error("Failed to update role");
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

	return (
		<div className="grid grid-cols-[1fr_1fr_200px] gap-4 p-4 items-center text-zinc-200">
			<div className="text-zinc-400">{displayName || "No display name"}</div>
			<div className="text-zinc-400">{email || "No email"}</div>
			<div className="flex items-center gap-2">
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
							<Button
								className="shrink-0 h-8 w-8 rounded-full p-0"
								onClick={() => setIsEditingRole(true)}
							>
								<Pencil className="h-4 w-4" />
							</Button>
						)}
					</>
				)}
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>
		</div>
	);
}
