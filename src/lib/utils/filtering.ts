/**
 * Data filtering utilities
 */

import { parseDate, getDayOfWeek, getDateRange } from './dateUtils';
import { lines } from '../lineData';

// Legacy interface for backward compatibility
interface RidershipRecord {
	Date: string;
	Hour: number;
	Ridership: number;
	Station: string;
}

export interface FilterOptions {
	startMonthYear: string;
	endMonthYear: string;
	selectedDaysOfWeek: Set<string>;
	selectedLineOrStation: 'lines' | 'stations';
	selectedLines: Set<number>;
	selectedStations: Set<number>;
	startHour: number;
	endHour: number;
}

/**
 * Build caches for faster lookups
 */
export function buildCaches(stations: string[]) {
	// Station index cache
	const stationIndexCache = new Map<string, number>();
	stations.forEach((station, index) => {
		stationIndexCache.set(station, index);
	});

	// Line index cache
	const lineIndexCache = new Map<string, number>();
	lines.forEach((line, index) => {
		lineIndexCache.set(line.name, index);
	});

	return { stationIndexCache, lineIndexCache };
}

/**
 * Build line to stations mapping
 */
export function buildLineToStationsMap(
	stationLinesMap: Map<string, string[]>,
	lineIndexCache: Map<string, number>
): Map<number, Set<string>> {
	const lineToStationsMap = new Map<number, Set<string>>();

	stationLinesMap.forEach((lineNames, stationName) => {
		lineNames.forEach((lineName) => {
			const lineIdx = lineIndexCache.get(lineName);
			if (lineIdx !== undefined) {
				if (!lineToStationsMap.has(lineIdx)) {
					lineToStationsMap.set(lineIdx, new Set());
				}
				lineToStationsMap.get(lineIdx)!.add(stationName);
			}
		});
	});

	return lineToStationsMap;
}

/**
 * Filter data based on options
 */
export function filterData(
	data: RidershipRecord[],
	options: FilterOptions,
	stationIndexCache: Map<string, number>,
	lineToStationsMap: Map<number, Set<string>>
): RidershipRecord[] {
	const { startDate, endDate } = getDateRange(options.startMonthYear, options.endMonthYear);
	const startTime = startDate.getTime();
	const endTime = endDate.getTime();

	// Pre-compute valid stations for line selections
	let validStationsForLines: Set<string> | null = null;
	if (options.selectedLineOrStation === 'lines' && options.selectedLines.size > 0) {
		validStationsForLines = new Set<string>();
		options.selectedLines.forEach((lineIdx) => {
			const stations = lineToStationsMap.get(lineIdx);
			if (stations) {
				stations.forEach((s) => validStationsForLines!.add(s));
			}
		});
	}

	return data.filter((row) => {
		// Hour filter (fastest check first)
		if (row.Hour < options.startHour || row.Hour > options.endHour) {
			return false;
		}

		// Date filter
		const rowDate = parseDate(row.Date);
		const rowTime = rowDate.getTime();
		if (rowTime < startTime || rowTime > endTime) {
			return false;
		}

		// Day of week filter
		if (!options.selectedDaysOfWeek.has(getDayOfWeek(row.Date))) {
			return false;
		}

		// Station/Line filter
		if (options.selectedLineOrStation === 'lines') {
			return validStationsForLines !== null && validStationsForLines.has(row.Station);
		} else {
			if (options.selectedStations.size === 0) return false;
			const stationIndex = stationIndexCache.get(row.Station);
			return stationIndex !== undefined && options.selectedStations.has(stationIndex);
		}
	});
}

// Additional filter functions for aggregated data

export interface AggregatedData {
	period: Date;
	avgRidership: number;
	name?: string;
	color?: string;
}

/**
 * Cache for date range boundaries
 */
let cachedDateRange: { start: number; end: number; key: string } | null = null;

/**
 * Filter aggregated data by date range
 */
export function filterByDateRange(
	data: AggregatedData[],
	startDate: string,
	endDate: string
): AggregatedData[] {
	if (!startDate || !endDate || data.length === 0) {
		return data;
	}

	// Cache the date range calculations
	const rangeKey = `${startDate}-${endDate}`;
	if (!cachedDateRange || cachedDateRange.key !== rangeKey) {
		const start = new Date(startDate + 'T00:00:00Z');
		const end = new Date(endDate + 'T23:59:59.999Z');

		// If start is after end, return empty data
		if (start > end) {
			return [];
		}

		cachedDateRange = {
			start: start.getTime(),
			end: end.getTime(),
			key: rangeKey
		};
	}

	const startTime = cachedDateRange.start;
	const endTime = cachedDateRange.end;

	const result: AggregatedData[] = [];
	for (let i = 0; i < data.length; i++) {
		const itemTime = data[i].period.getTime();
		if (itemTime >= startTime && itemTime <= endTime) {
			result.push(data[i]);
		}
	}

	return result;
}

/**
 * Filter by day of week (for daily aggregation)
 */
export function filterByDayOfWeek(
	data: AggregatedData[],
	selectedDaysOfWeek: Set<string>,
	aggregationMode: string
): AggregatedData[] {
	if (aggregationMode !== 'daily' || data.length === 0 || selectedDaysOfWeek.size === 0) {
		return aggregationMode !== 'daily' ? data : [];
	}

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const result: AggregatedData[] = [];
	for (let i = 0; i < data.length; i++) {
		const date = data[i].period;
		const dayOfWeek = date.getUTCDay();
		const dayName = dayNames[dayOfWeek];

		if (selectedDaysOfWeek.has(dayName)) {
			result.push(data[i]);
		}
	}

	return result;
}

/**
 * Filter by hour range (for hourly aggregation)
 */
export function filterByHourRange(
	data: AggregatedData[],
	startHour: number,
	endHour: number,
	aggregationMode: string
): AggregatedData[] {
	if (aggregationMode !== 'hourly' || data.length === 0) {
		return data;
	}

	const result: AggregatedData[] = [];

	for (let i = 0; i < data.length; i++) {
		const date = data[i].period;
		const hour = date.getUTCHours();

		// Check if hour is within range (start inclusive, end exclusive)
		if (hour >= startHour && hour < endHour) {
			result.push(data[i]);
		}
	}

	return result;
}

/**
 * Apply all filters in sequence
 */
export function applyAllFilters(
	data: AggregatedData[],
	startDate: string,
	endDate: string,
	selectedDaysOfWeek: Set<string>,
	startHour: number,
	endHour: number,
	aggregationMode: string
): AggregatedData[] {
	let filtered = filterByDateRange(data, startDate, endDate);
	filtered = filterByDayOfWeek(filtered, selectedDaysOfWeek, aggregationMode);
	filtered = filterByHourRange(filtered, startHour, endHour, aggregationMode);
	return filtered;
}
