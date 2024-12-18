"use client";

export function LocalDateTime({
	date,
	format = {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZoneName: "short",
	},
}: {
	date: Date;
	format?: Intl.DateTimeFormatOptions;
}) {
	const formattedDate = new Intl.DateTimeFormat("en-US", format).format(date);

	return <time dateTime={date.toISOString()}>{formattedDate}</time>;
}
