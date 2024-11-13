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
export const uploadFileToPromptNodeFlag = flag<boolean>({
	key: "upload-file-to-prompt-node",
	async decide() {
		return takeLocalEnv("UPLOAD_FILE_TO_PROMPT_NODE_FLAG");
	},
	description: "User can upload a file to the prompt node",
	defaultValue: true,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const webSearchNodeFlag = flag<boolean>({
	key: "web-search-node",
	async decide() {
		return takeLocalEnv("WEB_SEARCH_NODE_FLAG");
	},
	description: "User can use a web search node",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

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

export const chooseModelFlag = flag<boolean>({
	key: "choose-model",
	async decide() {
		return takeLocalEnv("CHOOSE_MODEL_FLAG");
	},
	description: "Enable choose model",
	defaultValue: false,
	options: [
		{ value: false, label: "disable" },
		{ value: true, label: "Enable" },
	],
});

export const anthropicFlag = flag<boolean>({
	key: "anthropic",
	async decide() {
		return takeLocalEnv("ANTHROPIC_FLAG");
	},
	description: "Enable anthropic",
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
