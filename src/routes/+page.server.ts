export const prerender = true;

export interface Metadata {
	stations: string[];
	lines: string[];
	minDate: string;
	maxDate: string;
	missingDates: string[];
}

export const load = async ({ fetch }) => {
	// Load only metadata on initial page load
	const response = await fetch('/data/metadata.json');
	const metadata: Metadata = await response.json();

	return metadata;
};
