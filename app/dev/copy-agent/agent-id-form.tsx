"use client";

import { CheckIcon, CopyCheckIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Spinner } from "../tabui/components/spinner";
import { copyAgentAction } from "./action";

export default function AgentIdForm() {
	const [state, formAction, isPending] = useActionState(copyAgentAction, null);
	return (
		<form action={formAction} data-pending={isPending}>
			<div className="text-black--30">
				<div>
					<span>{">"} </span>
					<input
						type="text"
						name="agentId"
						className="outline-0"
						ref={(ref) => {
							ref?.focus();
							function submitAgentId() {
								if (/agnt_[a-z0-9]{24}/.test(ref?.value ?? "")) {
									ref?.form?.requestSubmit();
								}
							}
							ref?.addEventListener("input", submitAgentId);
							return () => {
								ref?.removeEventListener("input", submitAgentId);
							};
						}}
					/>
				</div>
				{isPending && <Spinner />}
				{!isPending && state?.result === "error" ? (
					<p>{state.message}</p>
				) : state?.result === "success" ? (
					<div>
						<div className="flex items-center gap-[4px]">
							<CheckIcon size={16} className="text-green" /> <p>Success</p>
						</div>
						<a
							className="underline"
							href={`/p/${state.agentId}`}
							rel="noopener noreferrer"
							target="_blank"
						>
							Open in a new tab
						</a>
					</div>
				) : null}
			</div>
		</form>
	);
}
