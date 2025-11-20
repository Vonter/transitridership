/**
 * Clipboard utilities for copying text
 */

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		// Try modern Clipboard API first
		if (navigator.clipboard && navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}

		// Fallback for browsers that don't support Clipboard API
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.left = '-999999px';
		textarea.style.top = '-999999px';
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();

		try {
			const successful = document.execCommand('copy');
			return successful;
		} catch (execErr) {
			console.error('Fallback copy failed:', execErr);
			return false;
		} finally {
			document.body.removeChild(textarea);
		}
	} catch (err) {
		console.error('Failed to copy to clipboard:', err);
		return false;
	}
}
