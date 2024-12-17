"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
	type InferInput,
	email,
	maxLength,
	minLength,
	object,
	parse,
	picklist,
	pipe,
	string,
} from "valibot";
import { Card } from "../components/card";
import { addTeamMember } from "./actions";

const TeamMemberSchema = object({
	email: pipe(
		string(),
		minLength(1, "Email is required"),
		maxLength(256, "Email must be 256 characters or less"),
		email("Please enter a valid email address"),
	),
	role: picklist(["admin", "member"] as const),
});

type TeamMemberSchema = InferInput<typeof TeamMemberSchema>;

export function TeamMembersForm() {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("member");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string>("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		try {
			const validated = parse(TeamMemberSchema, { email, role });

			setIsLoading(true);

			const formData = new FormData();
			formData.append("email", validated.email);
			formData.append("role", validated.role);

			const result = await addTeamMember(formData);

			if (result.success) {
				setEmail("");
				setRole("member");
			} else {
				setError(result.error ?? "Failed to add team member");
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
		<Card
			title="Add new member"
			description="Invite a new team member by entering their email address"
		>
			<div className="flex flex-col gap-2">
				<form onSubmit={handleSubmit} className="flex gap-3" noValidate>
					<Input
						type="email"
						placeholder="member@example.com"
						value={email}
						onChange={(e) => {
							setError("");
							setEmail(e.target.value);
						}}
						className="flex-1"
						disabled={isLoading}
					/>
					<Select
						value={role}
						onValueChange={(value) => {
							setError("");
							setRole(value);
						}}
						disabled={isLoading}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="admin">Admin</SelectItem>
							<SelectItem value="member">Member</SelectItem>
						</SelectContent>
					</Select>
					<Button type="submit" disabled={isLoading} className="w-fit">
						Add member
					</Button>
				</form>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>
		</Card>
	);
}
