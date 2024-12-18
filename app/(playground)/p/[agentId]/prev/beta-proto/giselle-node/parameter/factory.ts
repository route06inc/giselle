import { createId } from "@paralleldrive/cuid2";
import type {
	ObjectParameter,
	ObjectParameterBlueprint,
	ParameterId,
	StringParameter,
	StringParameterBlueprint,
} from "./types";

export function createStringParameterBlueprint(
	parameter: Omit<StringParameterBlueprint, "object">,
) {
	return { ...parameter, object: "stringParameterBlueprint" as const };
}

export function createObjectParameterBlueprint(
	parameter: Omit<ObjectParameterBlueprint, "object">,
) {
	return { ...parameter, object: "objectParameterBlueprint" as const };
}

export function createParameterId(): ParameterId {
	return `prm_${createId()}`;
}

type StringParameterInput = Pick<StringParameter, "label">;
export function createStringParameter(
	blueprint: StringParameterBlueprint,
): StringParameter;
export function createStringParameter(
	input: StringParameterInput,
): StringParameter;
export function createStringParameter(
	args: StringParameterInput | StringParameterBlueprint,
): StringParameter {
	return {
		object: "stringParameter",
		id: createParameterId(),
		type: "string",
		label: args.label,
	};
}

export function createObjectParameter(
	objectParameterBlueprint: ObjectParameterBlueprint,
): ObjectParameter {
	const properties: Record<string, StringParameter | ObjectParameter> = {};
	for (const [key, value] of Object.entries(
		objectParameterBlueprint.properties,
	)) {
		properties[key] =
			value.object === "stringParameterBlueprint"
				? createStringParameter(value)
				: createObjectParameter(value);
	}
	return {
		object: "objectParameter",
		id: createParameterId(),
		type: "object",
		label: objectParameterBlueprint.label,
		properties,
		required: objectParameterBlueprint.required,
	};
}
