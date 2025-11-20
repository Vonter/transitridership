/**
 * Data fetching and caching service
 */

import type { AggregatedData } from '$lib/utils/aggregation';

export interface PreAggregatedData {
	hourly: Array<{ p: string; r: number }>;
	daily: Array<{ p: string; r: number }>;
	weekly: Array<{ p: string; r: number }>;
	monthly: Array<{ p: string; r: number }>;
}

// Cache for fetched data
const dataCache = new Map<string, PreAggregatedData>();

// Cache for date conversions
const dateConversionCache = new Map<string, Date>();
const MAX_CACHE_SIZE = 10000;

/**
 * Sanitize station names for filenames
 */
function sanitizeFilename(name: string): string {
	return name
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.toLowerCase();
}

/**
 * Parse date string with optimized caching
 */
function parseOptimizedDate(dateStr: string): Date {
	if (dateConversionCache.has(dateStr)) {
		return dateConversionCache.get(dateStr)!;
	}

	let parsedDateStr = dateStr;

	// Handle different date formats and ensure UTC timezone
	if (dateStr.includes(':')) {
		// Hourly: "2025-08-01 14:00" → "2025-08-01T14:00:00Z"
		parsedDateStr = dateStr.replace(' ', 'T') + ':00Z';
	} else if (dateStr.match(/^\d{4}-\d{2}$/)) {
		// Monthly: "2025-08" → "2025-08-01T00:00:00Z"
		parsedDateStr = dateStr + '-01T00:00:00Z';
	} else {
		// Daily/Weekly: "2025-08-01" → "2025-08-01T00:00:00Z"
		parsedDateStr = dateStr + 'T00:00:00Z';
	}

	const date = new Date(parsedDateStr);

	// Clear cache if it gets too large
	if (dateConversionCache.size >= MAX_CACHE_SIZE) {
		dateConversionCache.clear();
	}

	dateConversionCache.set(dateStr, date);
	return date;
}

/**
 * Fetch data for a station or line
 */
export async function fetchData(
	type: 'station' | 'line',
	identifier: string
): Promise<PreAggregatedData | null> {
	const cacheKey = `${type}-${identifier}`;

	if (dataCache.has(cacheKey)) {
		return dataCache.get(cacheKey)!;
	}

	try {
		const filename =
			type === 'station'
				? `station-${sanitizeFilename(identifier)}.json`
				: `line-${identifier}.json`;

		const response = await fetch(`/data/${type}s/${filename}`);
		if (!response.ok) {
			console.error(`Failed to fetch ${type} data for ${identifier}`);
			return null;
		}

		const jsonData = await response.json();
		dataCache.set(cacheKey, jsonData);
		return jsonData;
	} catch (error) {
		console.error(`Error fetching ${type} data:`, error);
		return null;
	}
}

/**
 * Convert pre-aggregated data to AggregatedData format
 */
export function convertToAggregatedData(
	preAgg: Array<{ p: string; r: number }>,
	name?: string,
	color?: string
): AggregatedData[] {
	// Pre-allocate array with known size
	const result = new Array<AggregatedData>(preAgg.length);

	for (let i = 0; i < preAgg.length; i++) {
		const item = preAgg[i];
		result[i] = {
			period: parseOptimizedDate(item.p),
			avgRidership: item.r,
			name,
			color
		};
	}

	return result;
}

/**
 * Clear all caches (useful for testing or memory management)
 */
export function clearDataCaches(): void {
	dataCache.clear();
	dateConversionCache.clear();
}
