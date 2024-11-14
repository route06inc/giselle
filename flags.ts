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
