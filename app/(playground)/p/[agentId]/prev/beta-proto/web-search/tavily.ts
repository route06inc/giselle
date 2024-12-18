interface Image {
	url: string;
	description: string;
}

export interface WebSearchResult {
	title: string;
	url: string;
	content: string;
	score: number;
	raw_content: null;
}

interface QueryResponse {
	query: string;
	images: Image[];
	results: WebSearchResult[];
	response_time: number;
}

function isQueryResponse(obj: unknown): obj is QueryResponse {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}

	// Type assertion to narrow down to QueryResponse
	const queryResponse = obj as QueryResponse;

	// Check main properties
	if (
		typeof queryResponse.query !== "string" ||
		typeof queryResponse.images !== "object" ||
		!Array.isArray(queryResponse.images) ||
		typeof queryResponse.results !== "object" ||
		!Array.isArray(queryResponse.results) ||
		typeof queryResponse.response_time !== "number"
	) {
		return false;
	}

	// Check images
	if (
		!queryResponse.images.every(
			(img): img is Image =>
				typeof img === "object" &&
				img !== null &&
				typeof img.url === "string" &&
				typeof img.description === "string",
		)
	) {
		return false;
	}

	// Check results
	if (
		!queryResponse.results.every(
			(result): result is WebSearchResult =>
				typeof result === "object" &&
				result !== null &&
				typeof result.title === "string" &&
				typeof result.url === "string" &&
				typeof result.content === "string" &&
				typeof result.score === "number",
		)
	) {
		return false;
	}

	return true;
}

export async function search(query: string): Promise<WebSearchResult[]> {
	if (process.env.TAVILY_API_KEY === undefined) {
		throw new Error("TAVILY_API_KEY is not defined");
	}
	const params = {
		api_key: process.env.TAVILY_API_KEY,
		query,
		search_depth: "basic",
		include_answer: false,
		include_images: false,
		include_image_descriptions: false,
		include_raw_content: false,
		max_results: 3,
		include_domains: [],
		exclude_domains: [],
	};
	const response = await fetch("https://api.tavily.com/search", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(params),
	}).then((res) => res.json());
	if (isQueryResponse(response)) {
		return response.results;
	}
	return [];
}
