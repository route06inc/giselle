"use server";

import { getAuthCallbackUrl } from "@/app/(auth)/lib";
import { createClient } from "@/lib/supabase";
import { redirect } from "next/navigation";

export async function authorizeGitHub() {
	const supabase = await createClient();

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: "github",
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

export async function authorizeGoogle() {
	const supabase = await createClient();

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: "google",
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
