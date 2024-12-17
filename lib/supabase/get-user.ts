import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { cache } from "react";
import { withRetry } from "../utils";
import { createClient } from "./server";

/**
 * Retrieves the currently authenticated user.
 *
 * @throws {Error} If the user is not authenticated or if there's an error during the authentication check.
 *
 * @remarks
 * IMPORTANT: This function will throw an error if executed while the user is not authenticated.
 * Make sure the user is logged in before calling this function.
 */
const getUser = async () => {
	const supabase = await createClient();

	const getUserFunc = async () => {
		const { data, error } = await supabase.auth.getUser();

		if (error != null) {
			throw error;
		}
		if (data.user == null) {
			throw new Error("No user returned");
		}
		return data.user;
	};

	const user = await withRetry(getUserFunc, {
		useExponentialBackoff: true,
		onRetry: (retryCount, error) => {
			console.error(`getUser failed, retrying (${retryCount})`, error);
		},
		shouldAbort: (error) => {
			// retry if the error is a retryable fetch error
			return !isAuthRetryableFetchError(error);
		},
	});

	return user;
};

const cachedGetUser = cache(getUser);

export { cachedGetUser as getUser };
