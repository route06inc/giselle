import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import invariant from "tiny-invariant";

const SEPARATOR = ".";

function sign(value: string): string {
	const SECRET = process.env.COOKIE_SECRET;
	invariant(SECRET, "COOKIE_SECRET is not set");

	const signature = createHmac("sha256", SECRET).update(value).digest("hex");
	return `${value}${SEPARATOR}${signature}`;
}

function verify(signed: string): string | null {
	const SECRET = process.env.COOKIE_SECRET;
	invariant(SECRET, "COOKIE_SECRET is not set");

	const [value, signature] = signed.split(SEPARATOR);
	const expectedSignature = createHmac("sha256", SECRET)
		.update(value)
		.digest("hex");

	return signature === expectedSignature ? value : null;
}

type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export async function setCookie<T extends JsonValue>(
	cookieName: string,
	values: T,
) {
	const value = JSON.stringify(values);
	const signed = sign(value);
	const cookieStore = await cookies();

	cookieStore.set(cookieName, signed, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 24 * 60 * 60, // 24 hours
	});
}

export async function getCookie(cookieName: string) {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(cookieName);
	if (!cookie) return null;

	const value = verify(cookie.value);
	return value ? JSON.parse(value) : null;
}
