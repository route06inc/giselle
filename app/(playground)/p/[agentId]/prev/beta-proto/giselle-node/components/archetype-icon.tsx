import type { FC, SVGProps } from "react";
import { GlobeIcon } from "../../components/icons/globe";
import { PromptIcon } from "../../components/icons/prompt";
import { TextGenerationIcon } from "../../components/icons/text-generation";
import {
	type GiselleNodeArchetype,
	giselleNodeArchetypes,
} from "../../giselle-node/blueprints";

type ArchetypeIconProps = SVGProps<SVGSVGElement> & {
	archetype: GiselleNodeArchetype;
};
export const ArchetypeIcon: FC<ArchetypeIconProps> = ({
	archetype,
	...props
}) =>
	archetype === giselleNodeArchetypes.textGenerator ? (
		<TextGenerationIcon {...props} />
	) : archetype === giselleNodeArchetypes.webSearch ? (
		<GlobeIcon {...props} />
	) : archetype === giselleNodeArchetypes.prompt ? (
		<PromptIcon {...props} />
	) : (
		<></>
	);
