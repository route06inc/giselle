import type { GitHubUserClient } from "@/services/external/github";
import type {
	GitHubNextAction,
	GitHubTriggerEvent,
} from "@/services/external/github/types";
import { createContext, useContext } from "react";
import type { GiselleNodeId } from "../giselle-node/types";
import type { GitHubIntegrationId } from "./types";

export type Repository = Awaited<
	ReturnType<GitHubUserClient["getRepositories"]>
>["repositories"][number];

export interface GitHubIntegrationSetting {
	id: GitHubIntegrationId;
	repositoryFullName: string;
	callSign: string;
	event: GitHubTriggerEvent;
	nextAction: GitHubNextAction;
	startNodeId: GiselleNodeId;
	endNodeId: GiselleNodeId;
}

interface GitHubIntegrationState {
	repositories: Repository[];
	needsAuthorization: boolean;
	setting: GitHubIntegrationSetting | undefined;
}

export const GitHubIntegrationContext =
	createContext<GitHubIntegrationState | null>(null);

export function useGitHubIntegration() {
	const context = useContext(GitHubIntegrationContext);
	if (!context) {
		throw new Error(
			"useGitHubIntegration must be used within a GitHubIntegrationProvider",
		);
	}
	return context;
}
