import { Button } from "@/components/ui/button";
import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import type { FC } from "react";
import { authorizeGitHub, authorizeGoogle } from "../actions";

type OauthProvidersProps = {
	labelPrefix: string;
};

export const OAuthProviders: FC<OauthProvidersProps> = ({ labelPrefix }) => (
	<div className="space-y-2">
		<Button asChild variant="link">
			<form>
				<SiGoogle className="h-[20px] w-[20px]" />
				<button type="submit" formAction={authorizeGoogle}>
					{labelPrefix} with Google
				</button>
			</form>
		</Button>
		{/**<button
							className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
							type="button"
						>
							<Microsoft className="h-5 w-5 mr-2" /> Sign up with Microsoft
						</button>**/}

		<Button asChild variant="link">
			<form>
				<SiGithub className="h-[20px] w-[20px]" />
				<button type="submit" formAction={authorizeGitHub}>
					{labelPrefix} with GitHub
				</button>
			</form>
		</Button>
	</div>
);
