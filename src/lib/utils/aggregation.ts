/**
 * Data aggregation utilities
 */

import { parseDate, getWeekStart, formatDate, formatMonth } from './dateUtils';

export interface AggregatedData {
	period: Date;
	avgRidership: number;
	name?: string; // Name of the line or station
	color?: string; // Color for the line
}

// Legacy types for backward compatibility (not currently used)
interface RidershipRecord {
	Date: string;
	Hour: number;
	Ridership: number;
}

type KeyGenerator = (row: RidershipRecord) => string;
type PeriodParser = (key: string) => Date;

/**
 * Generic aggregation function to reduce code duplication
 */
function aggregateData(
	filteredData: RidershipRecord[],
	keyGenerator: KeyGenerator,
	periodParser: PeriodParser
): AggregatedData[] {
	const aggregationMap = new Map<string, [number, number]>(); // [ridership, count]

	for (const row of filteredData) {
		const key = keyGenerator(row);
		const existing = aggregationMap.get(key);

		if (existing) {
			existing[0] += row.Ridership;
			existing[1] += 1;
		} else {
			aggregationMap.set(key, [row.Ridership, 1]);
		}
	}

	const result: AggregatedData[] = [];
	aggregationMap.forEach(([ridership, count], periodStr) => {
		result.push({
			period: periodParser(periodStr),
			avgRidership: ridership / count
		});
	});

	return result.sort((a, b) => a.period.getTime() - b.period.getTime());
}

/**
 * Aggregate data by hour
 */
export function aggregateByHour(filteredData: RidershipRecord[]): AggregatedData[] {
	return aggregateData(
		filteredData,
		(row) => `${row.Date} ${String(row.Hour).padStart(2, '0')}:00`,
		(key) => new Date(key.replace(' ', 'T') + ':00')
	);
}

/**
 * Aggregate data by day
 */
export function aggregateByDay(filteredData: RidershipRecord[]): AggregatedData[] {
	return aggregateData(
		filteredData,
		(row) => row.Date,
		(key) => new Date(key + 'T00:00:00')
	);
}

/**
 * Aggregate data by week
 */
export function aggregateByWeek(filteredData: RidershipRecord[]): AggregatedData[] {
	return aggregateData(
		filteredData,
		(row) => {
			const date = parseDate(row.Date);
			const monday = getWeekStart(date);
			return formatDate(monday);
		},
		(key) => new Date(key + 'T00:00:00')
	);
}

/**
 * Aggregate data by month
 */
export function aggregateByMonth(filteredData: RidershipRecord[]): AggregatedData[] {
	return aggregateData(
		filteredData,
		(row) => formatMonth(parseDate(row.Date)),
		(key) => new Date(key + '-01T00:00:00')
	);
}

/**
 * Calculate statistics from aggregated data
 */
export function calculateStats(aggregatedData: AggregatedData[], filteredData: RidershipRecord[]) {
	if (aggregatedData.length === 0) {
		return { avgRidership: 0, totalRidership: 0 };
	}

	const totalAggregatedRidership = aggregatedData.reduce((sum, item) => sum + item.avgRidership, 0);
	const avgRidership = Math.round(totalAggregatedRidership / aggregatedData.length);

	const totalRidership = filteredData.reduce((sum, row) => sum + row.Ridership, 0);

	return { avgRidership, totalRidership };
}
