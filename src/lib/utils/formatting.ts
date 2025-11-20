/**
 * Format number using browser's locale settings with compact notation
 * Examples: 1234 -> "1.2K", 1234567 -> "1.2M"
 */
export function formatCompactNumber(value: number): string {
	try {
		const formatter = new Intl.NumberFormat(undefined, {
			notation: 'compact',
			compactDisplay: 'short',
			maximumFractionDigits: 2,
			minimumFractionDigits: 0
		});

		return formatter.format(value);
	} catch (error) {
		return value.toLocaleString(undefined, {
			maximumFractionDigits: 0
		});
	}
}
