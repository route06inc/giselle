"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { users } from "@/drizzle";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import {
	type InferInput,
	maxLength,
	minLength,
	parse,
	pipe,
	string,
} from "valibot";
import { updateDisplayName } from "./actions";

const DisplayNameSchema = pipe(
	string(),
	minLength(1, "Display name is required"),
	maxLength(256, "Display name must be 256 characters or less"),
);

export function AccountDisplayNameForm({
	displayName: _displayName,
}: { displayName: typeof users.$inferSelect.displayName }) {
	const [isEditingName, setIsEditingName] = useState(false);
	const [displayName, setDisplayName] = useState(
		_displayName ?? "No display name",
	);
	const [tempDisplayName, setTempDisplayName] = useState(displayName);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string>("");

	const handleSaveDisplayName = async () => {
		setError("");

		try {
			const validatedDisplayName = parse(DisplayNameSchema, tempDisplayName);

			setIsLoading(true);

			const formData = new FormData();
			formData.append("displayName", validatedDisplayName);

			const result = await updateDisplayName(formData);

			if (result.success) {
				setDisplayName(validatedDisplayName);
				setIsEditingName(false);
			} else {
				setError("Failed to update display name");
				console.error("Failed to update display name");
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

	const handleCancelDislayName = () => {
		setTempDisplayName(displayName);
		setIsEditingName(false);
		setError("");
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setError("");
		setTempDisplayName(e.target.value);
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				{isEditingName ? (
					<>
						<Input
							value={tempDisplayName}
							onChange={handleChange}
							className="w-full"
							disabled={isLoading}
						/>
						<Button
							className="shrink-0 h-8 w-8 rounded-full p-0"
							onClick={handleSaveDisplayName}
							disabled={isLoading || !!error}
						>
							<Check className="h-4 w-4" />
						</Button>
						<Button
							className="shrink-0 h-8 w-8 rounded-full p-0"
							onClick={handleCancelDislayName}
							disabled={isLoading}
						>
							<X className="h-4 w-4" />
						</Button>
					</>
				) : (
					<>
						<span className="text-lg">{displayName}</span>
						<Button
							className="shrink-0 h-8 w-8 rounded-full p-0"
							onClick={() => setIsEditingName(true)}
						>
							<Pencil className="h-4 w-4" />
						</Button>
					</>
				)}
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
