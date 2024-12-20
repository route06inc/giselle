// TODO: Upload to Cloud Storage
export async function putCSV(path: string, header: string, content: string) {
	console.log(`Writing to ${path}`);
	const fileContent = header + content;
	console.log(fileContent);
}
