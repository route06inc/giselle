import { ClickableText } from "@/components/ui/clicable-text";
import Link from "next/link";
import { Suspense } from "react";
import { ActionPrompt } from "../components/action-prompt";
import { Divider } from "../components/divider";
import { OAuthProviders } from "../components/oauth-providers";
import { PageTitle } from "../components/page-title";
import { LoginForm } from "./login-form";

export default function Page() {
	return (
		<div className="min-h-screen flex items-center justify-center p-4 gap-16">
			<div className="flex items-center justify-center py-12">
				<div className="mx-auto grid w-[350px] gap-[24px]">
					<PageTitle>Log in to Giselle</PageTitle>
					<div className="grid gap-[16px]">
						<Suspense fallback={<div>Loading...</div>}>
							<OAuthProviders labelPrefix="Continue" />
						</Suspense>
						<Divider />
						<LoginForm />

						<div className="flex justify-center">
							<ActionPrompt
								prompt="Don&apos;t have an account?"
								action={
									<ClickableText asChild>
										<Link href="/signup">Sign up</Link>
									</ClickableText>
								}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
