import { ClickableText } from "@/components/ui/clicable-text";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { googleOauthFlag } from "@/flags";
import Link from "next/link";
import { Suspense } from "react";
import { Card } from "../components/card";
import { AccountDisplayNameForm } from "./account-display-name-form";
import { getAccountInfo } from "./actions";
import { GitHubAuthentication } from "./github-authentication";
import { GoogleAuthentication } from "./google-authentication";

export default async function AccountSettingPage() {
	const { displayName, email } = await getAccountInfo();
	const displayGoogleOauth = await googleOauthFlag();

	return (
		<div className="grid gap-[16px]">
			<h3
				className="text-[32px] text-black--30 font-rosart"
				style={{ textShadow: "0px 0px 20px hsla(207, 100%, 48%, 1)" }}
			>
				Account
			</h3>
			<Card title="Account Information">
				<div className="max-w-[600px] grid gap-[16px]">
					<div className="grid gap-[4px]">
						<Label>Display name</Label>
						<AccountDisplayNameForm displayName={displayName} />
					</div>

					<Field
						label="Email"
						name="email"
						type="email"
						value={email ?? "No email"}
						disabled
					/>
				</div>
			</Card>
			<Card
				title="Authentication"
				description="Connect your Giselle account to third-party services."
			>
				<Suspense
					fallback={
						<Skeleton className="rounded-md border border-black-70 w-full h-16" />
					}
				>
					<GitHubAuthentication />
				</Suspense>
				{displayGoogleOauth && (
					<Suspense
						fallback={
							<Skeleton className="rounded-md border border-black-70 w-full h-16" />
						}
					>
						<GoogleAuthentication />
					</Suspense>
				)}
			</Card>
			<Card
				title="Reset Password"
				action={{
					content: "Reset Password",
					href: "/password_reset/new_password",
				}}
			/>
			<Card title="Delete Account">
				<div className="w-[220px]">
					<ClickableText asChild>
						<Link href="mailto:support@giselles.ai?Subject=Please%20delete%20my%20giselle%20account">
							Contact Support
						</Link>
					</ClickableText>
				</div>
			</Card>
		</div>
	);
}
