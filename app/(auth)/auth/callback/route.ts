// The client you created from the Server-Side Auth instructions
import { db, oauthCredentials, supabaseUserMappings, users } from "@/drizzle";
import { createClient } from "@/lib/supabase";
import { initializeAccount } from "@/services/accounts";
import type { Session, User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { OAuthProvider } from "../../lib";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const errorMessage = checkError(searchParams);
	if (errorMessage) {
		return new Response(errorMessage, {
			status: 400,
		});
	}

	const code = searchParams.get("code");
	// if "next" is in param, use it as the redirect URL
	const next = searchParams.get("next") ?? "/";
	if (!code) {
		return new Response("No code provided", { status: 400 });
	}

	const supabase = await createClient();
	const { data, error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		const { code, message, name, status } = error;
		return new Response(`${name} occurred: ${code} (${status}): ${message}`, {
			status: 500,
		});
	}

	try {
		const { user, session } = data;
		await initializeUserIfNeeded(user);
		await storeProviderTokens(user, session);
	} catch (error) {
		if (error instanceof Error) {
			return new Response(error.message, { status: 500 });
		}
		throw new Error("Unknown error occurred", { cause: error });
	}

	// original origin before load balancer
	const forwardedHost = request.headers.get("x-forwarded-host");
	if (forwardedHost) {
		// fallback to https if x-forwarded-proto is not set
		const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
		return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
	}
	return NextResponse.redirect(`${origin}${next}`);
}

function checkError(searchParams: URLSearchParams) {
	const error = searchParams.get("error");
	if (error) {
		// if error is in param, return an error response
		const errorDescription = searchParams.get("error_description");
		const errorCode = searchParams.get("error_code");
		return `Error occurred: ${errorCode} - ${errorDescription}`;
	}
	return "";
}

async function initializeUserIfNeeded(user: User) {
	const dbUser = await db.query.supabaseUserMappings.findFirst({
		where: eq(supabaseUserMappings.supabaseUserId, user.id),
	});
	if (!dbUser) {
		await initializeAccount(user.id);
	}
}

interface ProviderConfig {
	name: OAuthProvider;
	isMatch: (session: Session) => boolean;
}

const oauth_providers: ProviderConfig[] = [
	{
		name: "github",
		isMatch: (session) =>
			session.user.app_metadata.providers.includes("github"),
	},
	{
		name: "google",
		isMatch: (session) =>
			session.user.app_metadata.providers.includes("google"),
	},
] as const;

// store accessToken and refreshToken
async function storeProviderTokens(user: User, session: Session) {
	const { provider_token, provider_refresh_token } = session;
	if (!provider_token) {
		throw new Error("No provider token found");
	}

	const matchedProvider = oauth_providers.find((p) => p.isMatch(session));
	if (!matchedProvider) {
		throw new Error("No supported provider found in session");
	}

	const provider = matchedProvider.name;
	const identity = user.identities?.find((identity) => {
		return identity.provider === provider;
	});
	if (!identity) {
		throw new Error(`No identity found for provider: ${provider}`);
	}
	const providerAccountId = identity.id;

	const [dbUser] = await db
		.select({ dbid: users.dbId })
		.from(users)
		.innerJoin(
			supabaseUserMappings,
			eq(users.dbId, supabaseUserMappings.userDbId),
		)
		.where(eq(supabaseUserMappings.supabaseUserId, user.id));
	await db
		.insert(oauthCredentials)
		.values({
			userId: dbUser.dbid,
			provider,
			providerAccountId,
			accessToken: provider_token,
			refreshToken: provider_refresh_token,
		})
		.onConflictDoUpdate({
			target: [
				oauthCredentials.userId,
				oauthCredentials.provider,
				oauthCredentials.providerAccountId,
			],
			set: {
				accessToken: provider_token,
				refreshToken: provider_refresh_token,
				updatedAt: new Date(),
			},
		});
}
