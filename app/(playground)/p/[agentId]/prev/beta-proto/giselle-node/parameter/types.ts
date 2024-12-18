export type ParameterId = `prm_${string}`;

export type StringParameterBlueprint = {
	object: "stringParameterBlueprint";
	type: "string";
	label?: string;
};
export type StringParameter = {
	id: ParameterId;
	object: "stringParameter";
	type: "string";
	label?: string;
};
export type ObjectParameterBlueprint = {
	object: "objectParameterBlueprint";
	type: "object";
	label?: string;
	properties: Record<
		string,
		StringParameterBlueprint | ObjectParameterBlueprint
	>;
	required?: string[];
};

export type ObjectParameter = {
	id: ParameterId;
	object: "objectParameter";
	type: "object";
	label?: string;
	properties: Record<string, StringParameter | ObjectParameter>;
	required?: string[];
};

export type ParameterBlueprint =
	| StringParameterBlueprint
	| ObjectParameterBlueprint;
export type Parameter = StringParameter | ObjectParameter;
