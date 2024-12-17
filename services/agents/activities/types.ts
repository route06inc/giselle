import type { AgentId } from "../types";

export class AgentActivity {
	private actions: AgentActivityAction[] = [];
	public agentId: AgentId;
	public startedAt: Date;
	public endedAt: Date | null = null;

	constructor(agentId: AgentId, startedAt: Date) {
		this.agentId = agentId;
		this.startedAt = startedAt;
	}

	collectAction(action: string, startedAt: Date, completedAt: Date) {
		const record = new AgentActivityAction(action, startedAt, completedAt);
		this.actions.push(record);
	}

	end(endedAt: Date = new Date()) {
		this.endedAt = endedAt;
	}

	totalDurationMs() {
		return this.actions.reduce((acc, action) => acc + action.durationMs, 0);
	}
}

class AgentActivityAction {
	constructor(
		public action: string,
		public startedAt: Date,
		public completedAt: Date,
	) {}

	get durationMs() {
		return this.completedAt.getTime() - this.startedAt.getTime();
	}
}
