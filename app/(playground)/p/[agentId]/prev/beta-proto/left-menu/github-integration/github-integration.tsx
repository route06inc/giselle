import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type {
	GitHubNextAction,
	GitHubTriggerEvent,
} from "../../../../../../../../services/external/github/types";
import { Label } from "../../components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../components/select";
import { allFlowEdges } from "../../flow/utils";
import type { GiselleNode, GiselleNodeId } from "../../giselle-node/types";
import { useGitHubIntegration } from "../../github-integration/context";
import { useGraph } from "../../graph/context";
import {
	Section,
	SectionFormField,
	SectionHeader,
} from "../components/section";
import { save } from "./server-actions";

interface GitHubTriggerEventItem {
	label: string;
	type: GitHubTriggerEvent;
}
const mockEvents: GitHubTriggerEventItem[] = [
	{
		type: "github.issue_comment.created",
		label: "Comment on Issue",
	},
];

interface NextActionItem {
	label: string;
	type: GitHubNextAction;
}
const mockNextActions: NextActionItem[] = [
	{
		type: "github.issue_comment.reply",
		label: "Comment on trigger issue",
	},
];
interface GitHubIntegrationProps {
	setTabValue: (value: string) => void;
}
export function GitHubIntegration(props: GitHubIntegrationProps) {
	const { needsAuthorization, repositories } = useGitHubIntegration();

	return (
		<div className="grid gap-[24px] px-[24px] py-[24px]">
			<header className="flex justify-between">
				<p
					className="text-[22px] font-rosart text-black--30"
					style={{ textShadow: "0px 0px 20px hsla(207, 100%, 48%, 1)" }}
				>
					GitHub Integration
				</p>
				<button type="button">
					<XIcon
						className="w-[16px] h-[16px] text-black-30"
						onClick={() => props.setTabValue("")}
					/>
				</button>
			</header>
			{needsAuthorization
				? GoToAccountSettings()
				: GithubIntegrationForm({ repositories })}
		</div>
	);
}

function GoToAccountSettings() {
	return (
		<div className="grid gap-[16px]">
			<div className="text-sm text-gray-600">
				Please connect your GitHub account to get started
			</div>
			<Button asChild>
				<Link href="/settings/account">Connect GitHub</Link>
			</Button>
		</div>
	);
}

interface GitHubIntegrationFormProps {
	repositories: Array<{
		id: number;
		full_name: string;
	}>;
}
function GithubIntegrationForm({ repositories }: GitHubIntegrationFormProps) {
	interface Flow {
		start: Pick<GiselleNode, "id" | "name">;
		end: Pick<GiselleNode, "id" | "name">;
	}
	const { state } = useGraph();
	const flows = useMemo(() => {
		const edges = allFlowEdges(state.graph.nodes, state.graph.connectors);
		const tmpFlows: Flow[] = [];
		for (const edge of edges) {
			const start = state.graph.nodes.find((node) => node.id === edge.start);
			const end = state.graph.nodes.find((node) => node.id === edge.end);
			if (start && end) {
				tmpFlows.push({
					start: {
						id: start.id as GiselleNodeId,
						name: start.name,
					},
					end: {
						id: end.id as GiselleNodeId,
						name: end.name,
					},
				});
			}
		}
		return tmpFlows;
	}, [state.graph]);

	const { setting } = useGitHubIntegration();
	const [callSign, setCallSign] = useState(setting?.callSign ?? "");
	const [_, action, isPending] = useActionState(
		async (prevState: unknown, formData: FormData) => {
			const repositoryFullName = formData.get("repository") as string;
			const event = formData.get("event") as GitHubTriggerEvent;
			const nextAction = formData.get("nextAction") as GitHubNextAction;
			const flow = formData.get("flow") as string;
			const { start, end } = JSON.parse(flow) as Flow;
			await save({
				id: setting?.id,
				agentId: state.graph.agentId,
				repositoryFullName,
				event,
				callSign,
				nextAction,
				startNodeId: start.id,
				endNodeId: end.id,
			});
		},
		null,
	);

	return (
		<form className="grid gap-[16px]" action={action}>
			<Section>
				<SectionHeader title="Repository" />
				<Select name="repository" defaultValue={setting?.repositoryFullName}>
					<SelectTrigger>
						<SelectValue placeholder="Choose repository" />
					</SelectTrigger>
					<SelectContent>
						{repositories.map((repository) => (
							<SelectItem value={repository.full_name} key={repository.id}>
								{repository.full_name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Section>
			<Section>
				<SectionHeader title="Trigger" />
				<SectionFormField>
					<Label htmlFor="event">Event</Label>
					<Select name="event" defaultValue={setting?.event}>
						<SelectTrigger>
							<SelectValue placeholder="Choose event" />
						</SelectTrigger>
						<SelectContent>
							{mockEvents.map((event) => (
								<SelectItem value={event.type} key={event.type}>
									{event.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SectionFormField>
				<SectionFormField>
					<Label htmlFor="callSign">Call sign</Label>
					<Input
						type="text"
						name="callSign"
						id="callSign"
						placeholder="Enter call sign"
						className="w-full"
						value={callSign}
						onChange={(e) => setCallSign(e.target.value)}
					/>
					<span className="text-black-70 text-[12px]">
						You can call this agent by commenting{" "}
						<span className="py-[0px] px-[4px] text-black--30 bg-black-70 rounded-[2px]">
							/giselle {callSign === "" ? "[call sign]" : callSign}
						</span>{" "}
						in the issue route06inc/giselle.
					</span>
				</SectionFormField>
			</Section>
			<Section>
				<SectionHeader title="Action" />
				<SectionFormField>
					<Label>Run flow</Label>
					<Select
						name="flow"
						defaultValue={JSON.stringify(
							flows.find(
								(flow) =>
									flow.start.id === setting?.startNodeId &&
									flow.end.id === setting?.endNodeId,
							),
						)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Choose flow" />
						</SelectTrigger>
						<SelectContent>
							{flows.map((flow) => (
								<SelectItem
									value={JSON.stringify(flow)}
									key={`${flow.start.id}-${flow.end.id}`}
								>
									{flow.start.name} → {flow.end.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SectionFormField>
				<SectionFormField>
					<Label>Then</Label>
					<Select name="nextAction" defaultValue={setting?.nextAction}>
						<SelectTrigger>
							<SelectValue placeholder="Choose next action" />
						</SelectTrigger>
						<SelectContent>
							{mockNextActions.map((nextAction) => (
								<SelectItem value={nextAction.type} key={nextAction.type}>
									{nextAction.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SectionFormField>
			</Section>
			<div>
				<input type="hidden" name="agentId" value={state.graph.agentId} />
				<Button type="submit" disabled={isPending} data-loading={isPending}>
					Save
				</Button>
			</div>
		</form>
	);
}
