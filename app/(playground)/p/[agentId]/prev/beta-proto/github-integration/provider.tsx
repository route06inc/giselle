import {
	GitHubIntegrationContext,
	type GitHubIntegrationSetting,
	type Repository,
} from "./context";

interface GitHubIntegrationProviderProps {
	children: React.ReactNode;
	repositories: Repository[];
	needsAuthorization: boolean;
	setting: GitHubIntegrationSetting | undefined;
}
export function GitHubIntegrationProvider({
	children,
	repositories,
	needsAuthorization,
	setting,
}: GitHubIntegrationProviderProps) {
	return (
		<GitHubIntegrationContext.Provider
			value={{
				repositories,
				needsAuthorization,
				setting,
			}}
		>
			{children}
		</GitHubIntegrationContext.Provider>
	);
}
