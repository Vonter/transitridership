/**
 * Date utility functions with caching for performance
 */

const parsedDateCache = new Map<string, Date>();
const dayOfWeekCache = new Map<string, string>();

/**
 * Parse date from YYYY-MM-DD format with caching
 */
export function parseDate(dateStr: string): Date {
	if (parsedDateCache.has(dateStr)) {
		return parsedDateCache.get(dateStr)!;
	}

	const date = new Date(dateStr + 'T00:00:00');
	parsedDateCache.set(dateStr, date);
	return date;
}

/**
 * Get day of week from date string with caching
 */
export function getDayOfWeek(dateStr: string): string {
	if (dayOfWeekCache.has(dateStr)) {
		return dayOfWeekCache.get(dateStr)!;
	}

	const date = parseDate(dateStr);
	const day = date.getDay();
	const result = day === 0 ? 'Sunday' : day === 6 ? 'Saturday' : 'Weekday';

	dayOfWeekCache.set(dateStr, result);
	return result;
}

/**
 * Get start and end dates from month-year strings
 */
export function getDateRange(startMonthYear: string, endMonthYear: string) {
	const [startYear, startMonth] = startMonthYear.split('-').map(Number);
	const [endYear, endMonth] = endMonthYear.split('-').map(Number);

	const startDate = new Date(startYear, startMonth - 1, 1);
	const endDate = new Date(endYear, endMonth, 0);

	return { startDate, endDate };
}

/**
 * Get Monday of the week for a given date
 */
export function getWeekStart(date: Date): Date {
	const day = date.getDay();
	const diff = date.getDate() - day + (day === 0 ? -6 : 1);
	return new Date(date.getFullYear(), date.getMonth(), diff);
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Format date as YYYY-MM
 */
export function formatMonth(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get last month range from a max date string
 */
export function getLastMonthRange(maxDateStr: string): { start: string; end: string } {
	const maxDate = new Date(maxDateStr);
	const year = maxDate.getFullYear();
	const month = maxDate.getMonth(); // 0-indexed

	// First day of the month
	const firstDay = new Date(year, month, 1);

	// Last day of the month
	const lastDay = new Date(year, month + 1, 0);

	return {
		start: formatDate(firstDay),
		end: formatDate(lastDay)
	};
}

/**
 * Clear all caches (useful for testing or memory management)
 */
export function clearDateCaches(): void {
	parsedDateCache.clear();
	dayOfWeekCache.clear();
}
