/**
 * Statistics calculation utilities
 */

export interface AggregatedData {
	period: Date;
	avgRidership: number;
	name?: string;
	color?: string;
}

export interface Stats {
	avgRidership: number;
	totalRidership: number;
	periodCount: number;
}

/**
 * Calculate statistics from filtered aggregated data
 * Uses single-pass algorithm with object-based grouping
 */
export function calculateAggregatedStats(filteredData: AggregatedData[]): Stats {
	if (filteredData.length === 0) {
		return { avgRidership: 0, totalRidership: 0, periodCount: 0 };
	}

	// Single pass with object-based grouping (faster than Map for small datasets)
	const periodMap: Record<string, number> = {};
	let periodCount = 0;

	for (const item of filteredData) {
		// Use timestamp as key (faster than ISO string)
		const key = item.period.getTime();
		if (!(key in periodMap)) {
			periodMap[key] = item.avgRidership;
			periodCount++;
		} else {
			periodMap[key] += item.avgRidership;
		}
	}

	// Calculate total and average in a single pass
	let totalRidership = 0;
	for (const key in periodMap) {
		totalRidership += periodMap[key];
	}

	const avgRidership = periodCount > 0 ? Math.round(totalRidership / periodCount) : 0;

	return {
		avgRidership,
		totalRidership: Math.round(totalRidership),
		periodCount
	};
}
