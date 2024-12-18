import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { type AgentActivity, AgentUsageTable } from "./agent-usage-table";

type AgentUsageDialogProps = {
	activities: AgentActivity[];
};

export function AgentUsageDialog({ activities }: AgentUsageDialogProps) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="link">View all logs</Button>
			</DialogTrigger>
			<DialogContent className="max-w-7xl">
				<DialogHeader>
					<DialogTitle>Agent Usage Logs</DialogTitle>
				</DialogHeader>
				<AgentUsageTable
					activities={activities}
					containerClassName="max-h-[60vh] overflow-y-auto"
				/>
			</DialogContent>
		</Dialog>
	);
}
