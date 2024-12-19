import { Card } from "@/app/(main)/settings/components/card";
import { DeleteTeam } from "./delete-team";

export function DangerZone() {
	return (
		<Card title="Danger Zone" className="border-destructive">
			<DeleteTeam />
		</Card>
	);
}
