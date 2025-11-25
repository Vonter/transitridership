<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import AirDatepicker from 'air-datepicker';
	import localeEn from 'air-datepicker/locale/en';
	import 'air-datepicker/air-datepicker.css';
	import { formatDate, parseDate } from '$lib/utils/dateUtils';

	let {
		startDate = $bindable(),
		endDate = $bindable(),
		minDate,
		maxDate,
		availableDates = new Set<string>()
	}: {
		startDate: string;
		endDate: string;
		minDate: string;
		maxDate: string;
		availableDates?: Set<string>;
	} = $props();

	let inputElement: HTMLInputElement | undefined = $state();
	let datepickerInstance: AirDatepicker | null = $state(null);
	let showInfoTooltip = $state(false);
	let tooltipElement: HTMLDivElement | undefined = $state();
	let tooltipStyle = $state({ top: '0px', left: '0px' });
	let isInternalUpdate = $state(false);
	let lastSyncedStart = $state<string | null>(null);
	let lastSyncedEnd = $state<string | null>(null);

	const userLocale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
	const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

	const formatDateForDisplay = (date: Date): string => {
		return date.toLocaleString(userLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
	};

	const isDateAvailable = (date: Date): boolean => {
		return availableDates.size === 0 || availableDates.has(formatDate(date));
	};

	const renderCell = ({ date, cellType }: { date: Date; cellType: string }) => {
		if (cellType === 'day' && date && !isDateAvailable(date)) {
			return {
				html: `${date.getDate()}`,
				classes: '-disabled- -other-month- -no-data-',
				attrs: { title: 'No data available for this date' }
			};
		}
		return {};
	};

	const updateInputValue = (start: string, end: string) => {
		if (!inputElement) return;
		if (start && end) {
			const startFormatted = formatDateForDisplay(parseDate(start));
			const endFormatted = formatDateForDisplay(parseDate(end));
			inputElement.value = `${startFormatted} and ${endFormatted}`;
		} else {
			inputElement.value = '';
		}
	};

	const positionTooltip = () => {
		const datepickerEl = document.querySelector('.air-datepicker');
		const buttonsContainer = datepickerEl?.querySelector('.air-datepicker--buttons');
		const infoButton = Array.from(buttonsContainer?.querySelectorAll('button') || []).find(
			(btn) => btn.querySelector('svg') !== null
		);

		if (!infoButton) return;

		const rect = infoButton.getBoundingClientRect();
		const tooltipWidth = isMobile ? Math.min(320, window.innerWidth - 32) : 320;
		const leftPos = Math.max(
			16,
			Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)
		);

		const spaceBelow = window.innerHeight - rect.bottom;
		const tooltipHeight = 140;
		const topPos =
			isMobile && spaceBelow < tooltipHeight + 16 && rect.top > spaceBelow
				? Math.max(16, rect.top - tooltipHeight - 8)
				: rect.bottom + 8;

		tooltipStyle = { top: `${topPos}px`, left: `${leftPos}px` };
	};

	const handleMoreInfoClick = () => {
		showInfoTooltip = !showInfoTooltip;
		if (showInfoTooltip) {
			setTimeout(positionTooltip, 0);
		}
	};

	const handleClickOutside = (event: MouseEvent) => {
		const target = event.target as Node;
		const datepickerEl = document.querySelector('.air-datepicker');
		if (
			showInfoTooltip &&
			!tooltipElement?.contains(target) &&
			!inputElement?.contains(target) &&
			!datepickerEl?.contains(target)
		) {
			showInfoTooltip = false;
		}
	};

	$effect(() => {
		if (showInfoTooltip) {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') showInfoTooltip = false;
			});
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});

	$effect(() => {
		if (!datepickerInstance || !inputElement || isInternalUpdate) return;
		if (
			lastSyncedStart !== null &&
			lastSyncedEnd !== null &&
			startDate === lastSyncedStart &&
			endDate === lastSyncedEnd
		)
			return;

		lastSyncedStart = startDate;
		lastSyncedEnd = endDate;

		if (startDate && endDate) {
			datepickerInstance.selectDate([parseDate(startDate), parseDate(endDate)]);
			updateInputValue(startDate, endDate);
		} else {
			datepickerInstance.clear();
			updateInputValue('', '');
		}
	});

	onMount(() => {
		if (!inputElement) return;

		const selectedDates = startDate && endDate ? [parseDate(startDate), parseDate(endDate)] : [];

		datepickerInstance = new AirDatepicker(inputElement, {
			range: true,
			multipleDatesSeparator: ' and ',
			minDate: parseDate(minDate),
			maxDate: parseDate(maxDate),
			selectedDates,
			dateFormat: formatDateForDisplay,
			locale: localeEn,
			isMobile,
			onHide: () => {
				if (isMobile) showInfoTooltip = false;
				// Ensure input shows both dates with "and" separator after datepicker hides
				if (startDate && endDate) {
					updateInputValue(startDate, endDate);
				}
			},
			onSelect: ({ date }) => {
				isInternalUpdate = true;

				if (!date || !Array.isArray(date) || date.length === 0) {
					startDate = '';
					endDate = '';
					updateInputValue('', '');
					lastSyncedStart = '';
					lastSyncedEnd = '';
				} else {
					const formatted = date.map(formatDate);

					if (date.length === 2) {
						[startDate, endDate] = formatted;
						lastSyncedStart = formatted[0];
						lastSyncedEnd = formatted[1];
						updateInputValue(formatted[0], formatted[1]);
						datepickerInstance?.hide();
					} else {
						startDate = endDate = formatted[0];
						lastSyncedStart = formatted[0];
						lastSyncedEnd = formatted[0];
						updateInputValue(formatted[0], formatted[0]);
					}
				}

				setTimeout(() => {
					isInternalUpdate = false;
				}, 0);
			},
			onRenderCell: renderCell,
			buttons: [
				{
					content: `<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>`,
					onClick: handleMoreInfoClick
				}
			]
		});

		setTimeout(() => {
			updateInputValue(startDate, endDate);
		}, 0);
	});

	onDestroy(() => {
		datepickerInstance?.destroy();
	});
</script>

<div class="relative w-full">
	<input
		bind:this={inputElement}
		type="text"
		readonly
		class="w-full min-w-[240px] cursor-pointer rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
	/>

	{#if showInfoTooltip}
		<div
			bind:this={tooltipElement}
			class="fixed z-[100] w-[calc(100vw-2rem)] max-w-80 rounded-lg border border-gray-300 bg-[#f8f6f1] p-3 text-xs text-gray-600 shadow-lg sm:w-80"
			role="tooltip"
			style="top: {tooltipStyle.top}; left: {tooltipStyle.left};"
		>
			<p class="leading-relaxed">
				Data was obtained by filing RTIs and is available for <strong
					class="font-semibold text-gray-700">{availableDates.size} days</strong
				>
				between <strong class="font-semibold text-gray-700">{minDate}</strong> and
				<strong class="font-semibold text-gray-700">{maxDate}</strong>.
			</p>
			<p class="mt-2 leading-relaxed">
				The source data can be found on the
				<a
					href="https://github.com/Vonter/bmrcl-ridership-hourly"
					target="_blank"
					rel="noopener noreferrer"
					class="text-blue-600 hover:text-blue-800 hover:underline"
				>
					bmrcl-ridership-hourly
				</a>
				GitHub repository.
			</p>
		</div>
	{/if}
</div>

<style>
	:global(.air-datepicker) {
		font-family:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
		background-color: #f8f6f1;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}

	:global(.air-datepicker--navigation) {
		background-color: transparent;
	}

	:global(.air-datepicker--nav-title) {
		color: #1f2937;
		font-weight: 500;
	}

	:global(.air-datepicker--nav-action) {
		color: #6b7280;
	}

	:global(.air-datepicker--nav-action:hover) {
		color: #1f2937;
		background-color: #f5f1e8;
	}

	:global(.air-datepicker--pointer::after) {
		background-color: #f8f6f1;
	}

	:global(.air-datepicker-body--day-name) {
		color: #6b7280;
		font-weight: 500;
	}

	:global(.air-datepicker-body--day) {
		color: #1f2937;
	}

	:global(.air-datepicker-body--day:hover:not(.-disabled-):not(.-no-data-)) {
		background-color: #f5f1e8;
	}

	:global(.air-datepicker-body--day.-selected-),
	:global(.air-datepicker-body--day.-selected-.-current-),
	:global(.air-datepicker-body--day.-range-from-),
	:global(.air-datepicker-body--day.-range-to-) {
		background-color: #2563eb;
		color: white;
	}

	:global(.air-datepicker-body--day.-in-range-) {
		background-color: #dbeafe;
		color: #1f2937;
	}

	:global(.air-datepicker-body--day.-no-data-) {
		opacity: 0.4;
		cursor: not-allowed;
		pointer-events: none;
		color: #9ca3af;
	}

	:global(.air-datepicker-body--day.-disabled-) {
		opacity: 0.3;
		color: #d1d5db;
	}

	:global(.air-datepicker--mobile) {
		z-index: 50;
	}

	:global(.air-datepicker--buttons) {
		display: flex;
		justify-content: flex-end;
	}

	:global(.air-datepicker--buttons button) {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #6b7280;
		transition: color 0.2s;
	}

	:global(.air-datepicker--buttons button:hover) {
		color: #1f2937;
	}

	:global(.air-datepicker--buttons button svg) {
		width: 1rem;
		height: 1rem;
	}
</style>
