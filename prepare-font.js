const fs = require("node:fs").promises;

const fileNames = [
	"Rosart-Regular",
	"Rosart-RegularItalic",
	"Rosart-Medium",
	"Rosart-SemiBold",
	"Rosart-Bold",
];

const downloadFile = async (url, destination) => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
	}

	const buffer = await response.arrayBuffer();

	await fs.writeFile(destination, Buffer.from(buffer));
};

(async () => {
	if (
		// Check if the environment is production or force downloading fonts
		(process.env.NODE_ENV === "production" &&
			process.env.VERCEL_ENV === "production") ||
		process.env.FORCE_DOWNLOAD_FONTS
	) {
		const BLOB_URL = process.env.BLOB_URL;

		if (!BLOB_URL) {
			console.error("BLOB_URL is not defined");
			return;
		}

		const filesToDownload = fileNames.map((fileName) => ({
			url: `${BLOB_URL}/fonts/${fileName}.woff2`,
			destination: `./app/fonts/${fileName}.woff2`,
		}));
		fs.copyFile("./vendor/fonts/rosart.ts", "./app/fonts/index.ts");

		for (const file of filesToDownload) {
			try {
				const fileExists = await fs
					.access(file.destination)
					.then(() => true)
					.catch(() => false);
				if (!fileExists) {
					await downloadFile(file.url, file.destination);
					console.log(`Downloaded: ${file.destination}`);
				} else {
					console.log(`File already exists: ${file.destination}`);
				}
			} catch (error) {
				console.error(`Error downloading ${file.url}:`, error);
			}
		}
	} else {
		fs.copyFile("./vendor/fonts/alternative.ts", "./app/fonts/index.ts");
		console.log("Using an alternative font file in development mode.");
	}
})();
