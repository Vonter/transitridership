/**
 * Format number using browser's locale settings with compact notation
 * Examples: 1234 -> "1.2K", 1234567 -> "1.2M"
 */
export function formatCompactNumber(value: number): string {
	try {
		const locale = navigator.language || 'en-US';
		const formatter = new Intl.NumberFormat(locale, {
			notation: 'compact',
			compactDisplay: 'short',
			maximumFractionDigits: 2,
			minimumFractionDigits: 0
		});

		let formatted = formatter.format(value);

		// Replace "T" (thousand) with "K"
		formatted = formatted.replace(/T/g, 'K');

		return formatted;
	} catch (error) {
		return value.toLocaleString(navigator.language || 'en-US', {
			maximumFractionDigits: 0
		});
	}
}
