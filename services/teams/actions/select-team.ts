"use server";

import * as v from "valibot";
import { setCurrentTeam } from "../";

export async function selectTeam(data: FormData) {
	const schema = v.pipe(
		v.string(),
		v.transform((input) => Number.parseInt(input, 10)),
	);
	const teamId = v.parse(schema, data.get("team"));
	await setCurrentTeam(teamId);
}
