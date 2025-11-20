/**
 * URL parameter utilities for saving and loading state
 */

type AggregationMode = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface UrlState {
	aggregationMode?: AggregationMode;
	selectedLines?: Set<number>;
	selectedStations?: Set<number>;
	startDate?: string;
	endDate?: string;
	selectedDaysOfWeek?: Set<string>;
	startHour?: number;
	endHour?: number;
}

/**
 * Load state from URL search parameters
 */
export function loadStateFromUrl(
	searchParams: URLSearchParams,
	lineNameMap: string[],
	stations: string[]
): UrlState {
	const state: UrlState = {};

	// Read aggregation mode
	const aggMode = searchParams.get('agg');
	if (
		aggMode === 'hourly' ||
		aggMode === 'daily' ||
		aggMode === 'weekly' ||
		aggMode === 'monthly'
	) {
		state.aggregationMode = aggMode;
	}

	// Read selected lines (by name)
	const linesParam = searchParams.get('lines');
	if (linesParam) {
		const lineNames = linesParam.split(',').map((s) => decodeURIComponent(s.trim()));
		const lineIndices = lineNames
			.map((name) => lineNameMap.indexOf(name))
			.filter((idx) => idx !== -1);
		state.selectedLines = new Set(lineIndices);
	}

	// Read selected stations (by name)
	const stationsParam = searchParams.get('stations');
	if (stationsParam) {
		const stationNames = stationsParam.split(',').map((s) => decodeURIComponent(s.trim()));
		const stationIndices = stationNames
			.map((name) => stations.indexOf(name))
			.filter((idx) => idx !== -1);
		state.selectedStations = new Set(stationIndices);
	}

	// Read date range
	const startParam = searchParams.get('start');
	if (startParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam)) {
		state.startDate = startParam;
	}

	const endParam = searchParams.get('end');
	if (endParam && /^\d{4}-\d{2}-\d{2}$/.test(endParam)) {
		state.endDate = endParam;
	}

	// Read day of week filters
	const daysParam = searchParams.get('days');
	if (daysParam) {
		const validDays = [
			'Sunday',
			'Monday',
			'Tuesday',
			'Wednesday',
			'Thursday',
			'Friday',
			'Saturday'
		];
		const days = daysParam.split(',').map((s) => decodeURIComponent(s.trim()));
		const filteredDays = days.filter((day) => validDays.includes(day));
		if (filteredDays.length > 0) {
			state.selectedDaysOfWeek = new Set(filteredDays);
		}
	}

	// Read hour range
	const startHourParam = searchParams.get('startHour');
	if (startHourParam !== null) {
		const hour = parseInt(startHourParam, 10);
		if (!isNaN(hour) && hour >= 0 && hour <= 23) {
			state.startHour = hour;
		}
	}

	const endHourParam = searchParams.get('endHour');
	if (endHourParam !== null) {
		const hour = parseInt(endHourParam, 10);
		if (!isNaN(hour) && hour >= 0 && hour <= 24) {
			state.endHour = hour;
		}
	}

	return state;
}

/**
 * Generate shareable URL with current state
 */
export function generateShareableUrl(
	baseUrl: string,
	aggregationMode: AggregationMode,
	selectedLines: Set<number>,
	selectedStations: Set<number>,
	startDate: string,
	endDate: string,
	lineNameMap: string[],
	stations: string[],
	selectedDaysOfWeek?: Set<string>,
	startHour?: number,
	endHour?: number
): string {
	const url = new URL(baseUrl);
	url.search = ''; // Clear existing params

	// Add aggregation mode
	url.searchParams.set('agg', aggregationMode);

	// Add selected lines (by name)
	if (selectedLines.size > 0) {
		const lineNames = Array.from(selectedLines)
			.sort((a, b) => a - b)
			.map((idx) => encodeURIComponent(lineNameMap[idx]));
		url.searchParams.set('lines', lineNames.join(','));
	}

	// Add selected stations (by name)
	if (selectedStations.size > 0) {
		const stationNames = Array.from(selectedStations)
			.sort((a, b) => a - b)
			.map((idx) => encodeURIComponent(stations[idx]));
		url.searchParams.set('stations', stationNames.join(','));
	}

	// Add date range
	if (startDate) {
		url.searchParams.set('start', startDate);
	}
	if (endDate) {
		url.searchParams.set('end', endDate);
	}

	// Add day of week filters (only if not all days are selected)
	const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	if (selectedDaysOfWeek && selectedDaysOfWeek.size > 0 && selectedDaysOfWeek.size < 7) {
		const days = Array.from(selectedDaysOfWeek)
			.sort((a, b) => allDays.indexOf(a) - allDays.indexOf(b))
			.map((day) => encodeURIComponent(day));
		url.searchParams.set('days', days.join(','));
	}

	// Add hour range (only if not the default 0-24)
	if (startHour !== undefined && startHour !== 0) {
		url.searchParams.set('startHour', startHour.toString());
	}
	if (endHour !== undefined && endHour !== 24) {
		url.searchParams.set('endHour', endHour.toString());
	}

	return url.toString();
}
