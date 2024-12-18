"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

export function CreateAgentButton() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" disabled={pending} data-loading={pending}>
			New Agent +
		</Button>
	);
}
