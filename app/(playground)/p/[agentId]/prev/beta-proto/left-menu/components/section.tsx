import type { ReactNode } from "react";

interface SectionHeaderProps {
	title: string;
}
export function SectionHeader(props: SectionHeaderProps) {
	return (
		<div className="flex items-center">
			<span className="flex-shrink text-black-30 text-[16px] font-rosart font-[500]">
				{props.title}
			</span>
			<div className="ml-[16px] flex-grow border-t border-black-80" />
		</div>
	);
}

interface SectionProps {
	children: ReactNode;
}
export function Section(props: SectionProps) {
	return <div className="grid gap-[8px]">{props.children}</div>;
}

interface SectionFormFieldProps {
	children: ReactNode;
}
export function SectionFormField(props: SectionFormFieldProps) {
	return <div className="grid gap-[2px]">{props.children}</div>;
}
