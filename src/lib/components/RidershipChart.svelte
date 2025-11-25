<script lang="ts">
	import { Plot, Line } from 'svelteplot';
	import type { AggregatedData } from '../utils/aggregation';
	import { formatCompactNumber } from '../utils/formatting';
	import { onMount } from 'svelte';

	// Constants
	const BREAKPOINTS = { mobile: 640, tablet: 1024 } as const;
	const TOTAL_COLOR = '#1f2937';
	const HOVER_OPACITY = { active: 1, dimmed: 0.2, legend: 0.3 };
	const LINE_WIDTH = { default: 2, hovered: 4 };

	type SeriesData = { name: string; data: AggregatedData[]; color: string };
	type DataSegment = { data: AggregatedData[] };
	type Tooltip = { x: number; y: number; name: string; date: Date; value: number };

	let {
		data,
		aggregationMode,
		placeholderText,
		onExport,
		onShare,
		copyFeedback,
		selectedDaysOfWeek,
		startHour,
		endHour,
		startDate,
		endDate
	}: {
		data: AggregatedData[];
		aggregationMode: 'hourly' | 'daily' | 'weekly' | 'monthly';
		placeholderText: string;
		onExport?: () => void;
		onShare?: () => void;
		copyFeedback?: string;
		selectedDaysOfWeek?: Set<string>;
		startHour?: number;
		endHour?: number;
		startDate?: string;
		endDate?: string;
	} = $props();

	let windowWidth = $state(0);
	let hoveredSeries = $state<string | null>(null);
	let tooltip = $state<Tooltip | null>(null);
	let chartContainer: HTMLDivElement | undefined = $state();
	let showTotal = $state(false);

	onMount(() => {
		const updateWidth = () => (windowWidth = window.innerWidth);
		updateWidth();
		window.addEventListener('resize', updateWidth);
		return () => window.removeEventListener('resize', updateWidth);
	});

	// Helper: Get week number from date
	const getWeekNumber = (date: Date): number => {
		const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
		const days = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
		return Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
	};

	// Helper: Detect gaps and split data into segments to avoid interpolation
	const splitDataIntoSegments = (data: AggregatedData[]): DataSegment[] => {
		if (data.length === 0) return [];

		const sorted = [...data].sort((a, b) => a.period.getTime() - b.period.getTime());

		// Check if day-of-week or hour filtering is active
		const isDayFiltered =
			selectedDaysOfWeek &&
			selectedDaysOfWeek.size > 0 &&
			selectedDaysOfWeek.size < 7 &&
			aggregationMode === 'daily';
		const isHourFiltered =
			startHour !== undefined &&
			endHour !== undefined &&
			(startHour > 0 || endHour < 23) &&
			aggregationMode === 'hourly';

		// If filtering is active, don't split into segments - connect all points
		if (isDayFiltered || isHourFiltered) {
			return [{ data: sorted }];
		}

		const expectedIncrement = {
			hourly: 3600000, // 1 hour
			daily: 86400000, // 1 day
			weekly: 604800000, // 1 week
			monthly: 2419200000 // ~28 days (minimum)
		}[aggregationMode];
		const gapThreshold = expectedIncrement * 1.5;

		const segments: DataSegment[] = [];
		let currentSegment: AggregatedData[] = [sorted[0]];

		for (let i = 1; i < sorted.length; i++) {
			const timeDiff = sorted[i].period.getTime() - sorted[i - 1].period.getTime();

			if (timeDiff > gapThreshold) {
				segments.push({ data: currentSegment });
				currentSegment = [sorted[i]];
			} else {
				currentSegment.push(sorted[i]);
			}
		}

		if (currentSegment.length > 0) {
			segments.push({ data: currentSegment });
		}

		return segments;
	};

	// Format date for display
	const formatDate = (date: Date, fullFormat = false): string => {
		const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
		const day = date.getUTCDate();
		const year = date.getUTCFullYear();
		const hour = String(date.getUTCHours()).padStart(2, '0');
		const dayName = date.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' });

		const formats = {
			hourly: fullFormat ? `${month} ${day}, ${year} at ${hour}:00` : `${month} ${day}, ${hour}:00`,
			daily: fullFormat ? `${dayName}, ${month} ${day}, ${year}` : `${dayName}, ${month} ${day}`,
			weekly: fullFormat ? `Week ${getWeekNumber(date)}, ${year}` : `Week ${getWeekNumber(date)}`,
			monthly: `${month} ${year}`
		};

		return formats[aggregationMode];
	};

	// Global time range for accurate mouse-to-time mapping
	const timeRange = $derived.by(() => {
		if (!data.length) return { min: 0, max: 0 };
		const times = data.map((d) => d.period.getTime());
		return { min: Math.min(...times), max: Math.max(...times) };
	});

	// Find closest data point to mouse position
	const findClosestPoint = (event: MouseEvent, seriesData: AggregatedData[]) => {
		if (!chartContainer || !seriesData.length) return null;

		const rect = chartContainer.getBoundingClientRect();
		const { marginLeft, marginRight } = chartDimensions;
		const chartWidth = rect.width - marginLeft - marginRight;
		const relativeX = event.clientX - rect.left - marginLeft;

		// Map mouse X to time value using GLOBAL time range (not series-specific)
		const mouseTime = timeRange.min + (relativeX / chartWidth) * (timeRange.max - timeRange.min);

		// Find nearest point in this series
		return seriesData.reduce((closest, point) => {
			const distance = Math.abs(point.period.getTime() - mouseTime);
			const closestDistance = Math.abs(closest.period.getTime() - mouseTime);
			return distance < closestDistance ? point : closest;
		});
	};

	// Interaction handlers
	const handleHover = (seriesName: string) => (hoveredSeries = seriesName);
	const handleLeave = () => ((hoveredSeries = null), (tooltip = null));
	const handleMove = (e: MouseEvent, name: string) => {
		const series = seriesMap.get(name);
		if (!series) return;
		const point = findClosestPoint(e, series.data);
		if (point) {
			tooltip = { x: e.clientX, y: e.clientY, name, date: point.period, value: point.avgRidership };
		}
	};

	// Process and group data by series with stable reference
	const series = $derived.by((): SeriesData[] => {
		if (!data.length) return [];

		const grouped = new Map<string, AggregatedData[]>();
		const totals = new Map<string, number>();

		for (const item of data) {
			const name = item.name || 'Unknown';
			const items = grouped.get(name) ?? [];
			if (!grouped.has(name)) grouped.set(name, items);
			items.push(item);

			const key = item.period.toISOString();
			totals.set(key, (totals.get(key) || 0) + item.avgRidership);
		}

		const result: SeriesData[] = Array.from(grouped, ([name, data]) => ({
			name,
			data,
			color: data[0]?.color || '#3b82f6'
		}));

		// Add Total series if multiple series exist
		if (grouped.size > 1) {
			result.push({
				name: 'Total',
				color: TOTAL_COLOR,
				data: Array.from(totals, ([periodStr, avgRidership]) => ({
					period: new Date(periodStr),
					avgRidership,
					name: 'Total',
					color: TOTAL_COLOR
				})).sort((a, b) => a.period.getTime() - b.period.getTime())
			});
		}

		return result;
	});

	// Pre-compute segments for all series (including Total) once
	const allSeriesWithSegments = $derived.by(() => {
		return series.map((s) => ({
			...s,
			segments: splitDataIntoSegments(s.data)
		}));
	});

	// Filter visible series (affects both rendering and axis scaling)
	const visibleSeries = $derived(
		showTotal ? allSeriesWithSegments : allSeriesWithSegments.filter((s) => s.name !== 'Total')
	);

	// Map for quick series lookup in tooltip (use all series)
	const seriesMap = $derived(new Map(allSeriesWithSegments.map((s) => [s.name, s])));

	// Responsive dimensions
	const isMobile = $derived(windowWidth > 0 && windowWidth < BREAKPOINTS.mobile);
	const isTablet = $derived(windowWidth >= BREAKPOINTS.mobile && windowWidth < BREAKPOINTS.tablet);
	const chartDimensions = $derived({
		height: isMobile ? 300 : isTablet ? 350 : 450,
		marginLeft: isMobile ? 50 : 60,
		marginBottom: isMobile ? 70 : 80,
		marginRight: 40,
		marginTop: 20
	});

	// Axis configuration
	const axisLabels = {
		hourly: 'DAY & HOUR',
		daily: 'DAY',
		weekly: 'WEEK',
		monthly: 'MONTH'
	} as const;
	const xTicks = $derived.by((): Date[] | undefined => {
		if (!data.length) return undefined;

		const periods = [...new Set(data.map((d) => d.period.getTime()))].sort((a, b) => a - b);
		const maxTicks = isMobile ? 8 : isTablet ? 12 : 15;

		if (periods.length <= maxTicks) return periods.map((t) => new Date(t));

		const step = Math.ceil(periods.length / maxTicks);
		const ticks = periods.filter((_, i) => i % step === 0).map((t) => new Date(t));
		const last = new Date(periods[periods.length - 1]);
		if (ticks[ticks.length - 1]?.getTime() !== last.getTime()) ticks.push(last);

		return ticks;
	});
</script>

{#if placeholderText}
	<div
		class="flex h-[350px] items-center justify-center rounded-lg border border-gray-200 bg-[#f8f6f1] p-3 shadow-sm sm:h-[400px] sm:p-6 lg:h-[500px]"
	>
		<div class="px-4 text-center text-sm text-gray-400 sm:text-base lg:text-lg">
			{placeholderText}
		</div>
	</div>
{:else}
	<div class="space-y-4 rounded-lg border border-gray-200 bg-[#f8f6f1] p-3 shadow-sm sm:p-6">
		<div class="flex items-start justify-between gap-2 px-2 py-2">
			<!-- Action Buttons -->
			{#if onExport || onShare}
				<div class="flex items-center gap-1.5">
					{#if onExport}
						<button
							onclick={onExport}
							title="Download CSV"
							class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
							aria-label="Download CSV"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
								/>
							</svg>
						</button>
					{/if}
					{#if onShare}
						<button
							onclick={onShare}
							title={copyFeedback || 'Share Chart'}
							class="relative rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
							aria-label="Share Chart"
						>
							<svg
								class="h-4 w-4 {copyFeedback ? 'text-green-600' : ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d={copyFeedback
										? 'M5 13l4 4L19 7'
										: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z'}
								/>
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<!-- Total Toggle Button -->
			{#if series.some((s) => s.name === 'Total')}
				<button
					onclick={() => (showTotal = !showTotal)}
					title={showTotal ? 'Hide Total' : 'Show Total'}
					class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					aria-label={showTotal ? 'Hide Total' : 'Show Total'}
				>
					<svg
						class="h-4 w-4 transition-opacity"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						style:opacity={showTotal ? '1' : '0.3'}
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M7 4h10M7 4L12 12M7 4v0M12 12L7 20M12 12l0 0M7 20h10"
						/>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Chart -->
		<div
			bind:this={chartContainer}
			class="relative"
			style:height="{chartDimensions.height}px"
			role="presentation"
		>
			{#key showTotal}
				<Plot
					{...chartDimensions}
					x={{
						type: 'time',
						label: axisLabels[aggregationMode],
						tickRotate: -45,
						tickFormat: (d: any) => formatDate(d instanceof Date ? d : new Date(d)),
						ticks: xTicks
					}}
					y={{
						label: `${aggregationMode.toUpperCase()} RIDERSHIP`,
						grid: true,
						zero: true,
						tickFormat: (d: any) => formatCompactNumber(d)
					}}
				>
					{#each visibleSeries as { name, color, segments } (name)}
						{@const isActive = hoveredSeries === name}
						{@const lineOpacity =
							hoveredSeries === null || isActive ? HOVER_OPACITY.active : HOVER_OPACITY.dimmed}
						{@const lineWidth = isActive ? LINE_WIDTH.hovered : LINE_WIDTH.default}
						{#each segments as segment, segIdx (`${name}-seg-${segIdx}`)}
							<Line
								data={segment.data as any}
								x="period"
								y="avgRidership"
								stroke={color}
								strokeWidth={lineWidth}
								opacity={lineOpacity}
								onmouseenter={() => handleHover(name)}
								onmousemove={(e: MouseEvent) => handleMove(e, name)}
								onmouseleave={handleLeave}
								style="cursor: pointer; transition: stroke-width 0.2s, opacity 0.2s;"
							/>
						{/each}
					{/each}
				</Plot>
			{/key}

			<!-- Tooltip -->
			{#if tooltip}
				{@const color = seriesMap.get(tooltip.name)?.color || 'white'}
				<div
					class="pointer-events-none fixed z-50 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg"
					style:left="{tooltip.x + 15}px"
					style:top="{tooltip.y - 15}px"
					role="tooltip"
				>
					<div class="font-semibold">{tooltip.name}</div>
					<div class="mt-0.5 text-xs text-gray-300">{formatDate(tooltip.date, true)}</div>
					<div class="mt-1">{formatCompactNumber(Math.round(tooltip.value))} riders</div>
				</div>
			{/if}
		</div>

		<!-- Legend -->
		{#if visibleSeries.length > 1}
			{@const hasHover = hoveredSeries !== null}
			<div class="flex flex-wrap justify-center gap-3 border-t border-gray-200 px-2 pt-2">
				{#each visibleSeries as { name, color } (name)}
					{@const isHovered = hoveredSeries === name}
					{@const legendOpacity =
						hasHover && !isHovered ? HOVER_OPACITY.legend : HOVER_OPACITY.active}
					{@const lineLength = isHovered ? '40px' : '32px'}
					{@const textColor = isHovered ? color : '#374151'}
					{@const fontWeight = isHovered ? 600 : 400}
					<button
						class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition-all hover:bg-gray-50"
						onmouseenter={() => handleHover(name)}
						onmouseleave={handleLeave}
						style:opacity={legendOpacity}
					>
						<div
							class="h-0.5 rounded transition-all"
							style:background-color={color}
							style:width={lineLength}
						></div>
						<span class="transition-all" style:color={textColor} style:font-weight={fontWeight}>
							{name}
						</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
