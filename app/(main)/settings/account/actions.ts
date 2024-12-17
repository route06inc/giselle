"use server";

import type { Provider } from "@/app/(auth)/lib";
import { deleteOauthCredential, getAuthCallbackUrl } from "@/app/(auth)/lib";
import { db, supabaseUserMappings, users } from "@/drizzle";
import { logger } from "@/lib/logger";
import { createClient, getUser } from "@/lib/supabase";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function connectIdentity(provider: Provider) {
	const supabase = await createClient();

	// Manual linking allows the user to link multiple same-provider identities.
	// But it introduces additional complexity, and not suitable for most use cases.
	// We should check if the user already has the given provider identity here.
	// https://supabase.com/docs/guides/auth/auth-identity-linking#manual-linking-beta
	const supabaseUser = await getUser();
	if (supabaseUser.identities) {
		const existingIdentity = supabaseUser.identities.find(
			(it) => it.provider === provider,
		);
		if (existingIdentity) {
			throw new Error(`Already linked to ${provider}`);
		}
	}

	const { data, error } = await supabase.auth.linkIdentity({
		provider,
		options: {
			redirectTo: getAuthCallbackUrl({ next: "/settings/account", provider }),
		},
	});

	if (error != null) {
		const { code, message, name, status } = error;
		throw new Error(`${name} occurred: ${code} (${status}): ${message}`);
	}
	if (data.url) {
		redirect(data.url);
	}
}

async function reconnectIdentity(provider: Provider) {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: getAuthCallbackUrl({ next: "/settings/account", provider }),
		},
	});

	if (error != null) {
		const { code, message, name, status } = error;
		throw new Error(`${name} occurred: ${code} (${status}): ${message}`);
	}
	if (data.url) {
		redirect(data.url);
	}
}

async function disconnectIdentity(provider: Provider) {
	const supabaseUser = await getUser();
	const supabase = await createClient();
	if (!supabaseUser.identities) {
		throw new Error("No identities");
	}
	if (supabaseUser.identities.length === 1) {
		throw new Error("Cannot unlink last identity");
	}
	const identity = supabaseUser.identities.find(
		(it) => it.provider === provider,
	);
	if (!identity) {
		throw new Error(`No ${provider} identity`);
	}
	const { error } = await supabase.auth.unlinkIdentity(identity);
	if (error) {
		throw new Error("Failed to unlink identity", { cause: error });
	}

	await deleteOauthCredential(provider);
}

export async function connectGoogleIdentity() {
	return connectIdentity("google");
}

export async function connectGitHubIdentity() {
	return connectIdentity("github");
}

export async function reconnectGoogleIdentity() {
	return reconnectIdentity("google");
}

export async function reconnectGitHubIdentity() {
	return reconnectIdentity("github");
}

export async function disconnectGoogleIdentity() {
	return disconnectIdentity("google");
}

export async function disconnectGitHubIdentity() {
	return disconnectIdentity("github");
}

export async function getAccountInfo() {
	try {
		const supabaseUser = await getUser();

		const _users = await db
			.select({ displayName: users.displayName, email: users.email })
			.from(users)
			.innerJoin(
				supabaseUserMappings,
				eq(users.dbId, supabaseUserMappings.userDbId),
			)
			.where(eq(supabaseUserMappings.supabaseUserId, supabaseUser.id));

		return _users[0];
	} catch (error) {
		logger.error("Failed to get account info:", error);
		throw error;
	}
}

export async function updateDisplayName(formData: FormData) {
	try {
		const supabaseUser = await getUser();

		if (!supabaseUser) {
			throw new Error("User not found");
		}

		const displayName = formData.get("displayName") as string;

		const userDbIdSubquery = db
			.select({ userDbId: supabaseUserMappings.userDbId })
			.from(supabaseUserMappings)
			.where(eq(supabaseUserMappings.supabaseUserId, supabaseUser.id));

		await db
			.update(users)
			.set({ displayName })
			.where(eq(users.dbId, userDbIdSubquery));

		revalidatePath("/settings/account");

		return { success: true };
	} catch (error) {
		logger.error("Failed to update display name:", error);
		return { success: false, error };
	}
}
