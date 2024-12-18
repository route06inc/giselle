import { GithubIcon } from "lucide-react";
import { useState } from "react";
import { LayersIcon } from "../components/icons/layers";
import { useFeatureFlags } from "../feature-flags/context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/tabs";
import { GitHubIntegration } from "./github-integration/github-integration";
import { Overview } from "./overview/overview";

export function LeftMenu() {
	const [tabValue, setTabValue] = useState("");
	const { gitHubIntegrationFlag } = useFeatureFlags();
	return (
		<Tabs
			orientation="vertical"
			value={tabValue}
			onValueChange={(value) => setTabValue(value)}
		>
			<TabsList>
				<TabsTrigger value="overview">
					<LayersIcon className="w-[18px] h-[18px] fill-black-30" />
				</TabsTrigger>
				{gitHubIntegrationFlag && (
					<TabsTrigger value="github">
						<GithubIcon className="w-[18px] h-[18px] stroke-black-30" />
					</TabsTrigger>
				)}
			</TabsList>
			<TabsContent value="overview">
				<Overview setTabValue={setTabValue} />
			</TabsContent>
			<TabsContent value="github">
				<GitHubIntegration setTabValue={setTabValue} />
			</TabsContent>
		</Tabs>
	);
}
