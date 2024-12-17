import { unstable_flag as flag } from "@vercel/flags/next";

function takeLocalEnv(localEnvironemntKey: string) {
	if (process.env.NODE_ENV !== "development") {
		return false;
	}
	if (
		process.env[localEnvironemntKey] === undefined ||
		process.env[localEnvironemntKey] === "false"
	) {
		return false;
	}
	return true;
}

export const debugFlag = flag<boolean>({
	key: "debug",
	async decide() {
		return takeLocalEnv("DEBUG_FLAG");
	},
	description: "Enable debug mode",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const viewFlag = flag<boolean>({
	key: "view",
	async decide() {
		return takeLocalEnv("VIEW_FLAG");
	},
	description: "Enable view mode",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const githubIntegrationFlag = flag<boolean>({
	key: "github-integration",
	async decide() {
		return takeLocalEnv("GITHUB_INTEGRATION_FLAG");
	},
	description: "Enable GitHub Integration",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const freePlanFlag = flag<boolean>({
	key: "free-plan",
	async decide() {
		return takeLocalEnv("FREE_PLAN_FLAG");
	},
	description: "Enable Free Plan",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const playgroundV2Flag = flag<boolean>({
	key: "playground-v2",
	async decide() {
		return takeLocalEnv("PLAYGROUND_V2_FLAG");
	},
	description: "Enable Playground V2",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const googleOauthFlag = flag<boolean>({
	key: "google-oauth",
	async decide() {
		return takeLocalEnv("GOOGLE_OAUTH_FLAG");
	},
	description: "Enable Google OAuth",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const proTeamPlanFlag = flag<boolean>({
	key: "pro-team-plan",
	async decide() {
		return takeLocalEnv("PRO_TEAM_PLAN_FLAG");
	},
	description: "Enable Pro Team Plan",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const teamCreationFlag = flag<boolean>({
	key: "team-creation",
	async decide() {
		return takeLocalEnv("TEAM_CREATION_FLAG");
	},
	description: "Enable Team Creation",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const developerFlag = flag<boolean>({
	key: "developer",
	async decide() {
		return takeLocalEnv("DEVELOPER_FLAG");
	},
	description: "Enable Developer",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});
