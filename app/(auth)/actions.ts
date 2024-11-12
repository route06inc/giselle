"use server";

import { getAuthCallbackUrl } from "@/app/(auth)/lib";
import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";

type OAuthProvider = "github" | "google";

async function authorizeOAuth(provider: OAuthProvider) {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: getAuthCallbackUrl(),
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

export async function authorizeGitHub() {
	return authorizeOAuth("github");
}

export async function authorizeGoogle() {
	return authorizeOAuth("google");
}
