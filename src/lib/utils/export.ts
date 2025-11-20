/**
 * Export utilities
 */

import Papa from 'papaparse';

/**
 * Export data to CSV file
 */
export function exportToCSV(data: any[], filename: string = 'ridership-data.csv'): void {
	const csv = Papa.unparse(data);
	const blob = new Blob([csv], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

interface AggregatedData {
	period: Date;
	avgRidership: number;
	name?: string;
	color?: string;
}

/**
 * Export aggregated data with separate columns for each stop/line
 */
export function exportAggregatedData(
	filteredData: AggregatedData[],
	aggregationMode: string
): void {
	if (filteredData.length === 0) {
		return;
	}

	// Group data by period and collect all unique names
	const periodMap = new Map<string, Map<string, number>>();
	const allNames = new Set<string>();

	for (const item of filteredData) {
		const periodKey = item.period.toISOString();
		const itemName = item.name || 'Ridership';

		allNames.add(itemName);

		if (!periodMap.has(periodKey)) {
			periodMap.set(periodKey, new Map());
		}

		const periodData = periodMap.get(periodKey)!;
		periodData.set(itemName, item.avgRidership);
	}

	// Sort names for consistent column ordering
	const sortedNames = Array.from(allNames).sort();

	// Build CSV rows
	const headers = ['Period', ...sortedNames];
	const csvRows: string[] = [headers.join(',')];

	// Sort periods chronologically
	const sortedPeriods = Array.from(periodMap.keys()).sort();

	for (const period of sortedPeriods) {
		const periodData = periodMap.get(period)!;
		const row = [period, ...sortedNames.map((name) => periodData.get(name)?.toString() || '0')];
		csvRows.push(row.join(','));
	}

	const csvContent = csvRows.join('\n');

	const blob = new Blob([csvContent], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `ridership-${aggregationMode}-${new Date().toISOString().split('T')[0]}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}
