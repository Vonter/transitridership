<script lang="ts">
	import { lines } from '$lib/lineData';
	import type { Metadata } from './+page.server';
	import SearchableList from '$lib/components/SearchableList.svelte';
	import StatsDisplay from '$lib/components/StatsDisplay.svelte';
	import RidershipChart from '$lib/components/RidershipChart.svelte';
	import Disclaimer from '$lib/components/Disclaimer.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { AggregatedData } from '$lib/utils/aggregation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// Services and utilities
	import { DebouncedDataLoader } from '$lib/services/dataLoader';
	import { loadStateFromUrl, generateShareableUrl } from '$lib/utils/urlParams';
	import { applyAllFilters } from '$lib/utils/filtering';
	import { calculateAggregatedStats } from '$lib/utils/stats';
	import { exportAggregatedData } from '$lib/utils/export';
	import { copyToClipboard } from '$lib/utils/clipboard';
	import {
		formatDate,
		getLastMonthRange,
		getWeekStart,
		formatMonth,
		parseDate
	} from '$lib/utils/dateUtils';

	let { data }: { data: Metadata } = $props();

	// Date range setup
	const minDateStr = formatDate(new Date(data.minDate));
	const maxDateStr = formatDate(new Date(data.maxDate));
	const lastMonthRange = getLastMonthRange(maxDateStr);

	// State management
	let selectedDaysOfWeek = $state<Set<string>>(
		new Set(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
	);
	let selectedLines = $state<Set<number>>(new Set([0, 1, 2]));
	let selectedStations = $state<Set<number>>(new Set());
	let searchQuery = $state('');
	let aggregationMode = $state<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
	let startDate = $state(lastMonthRange.start);
	let endDate = $state(lastMonthRange.end);
	let startHour = $state(0);
	let endHour = $state(24);

	// Data state
	let aggregatedData: AggregatedData[] = $state([]);
	let copyFeedback = $state('');
	let urlParamsLoaded = $state(false);
	let isLoadingData = $state(false);
	let isFirstLoad = $state(true);

	// Line name mapping for URLs
	const lineNameMap = ['green', 'purple', 'yellow'];

	// Data loader
	const dataLoader = new DebouncedDataLoader(200);

	// Load URL parameters on mount
	onMount(() => {
		const urlState = loadStateFromUrl($page.url.searchParams, lineNameMap, data.stations);

		if (urlState.aggregationMode) aggregationMode = urlState.aggregationMode;
		if (urlState.selectedLines) selectedLines = urlState.selectedLines;
		if (urlState.selectedStations) selectedStations = urlState.selectedStations;
		if (urlState.startDate) startDate = urlState.startDate;
		if (urlState.endDate) endDate = urlState.endDate;
		if (urlState.selectedDaysOfWeek) selectedDaysOfWeek = urlState.selectedDaysOfWeek;
		if (urlState.startHour !== undefined) startHour = urlState.startHour;
		if (urlState.endHour !== undefined) endHour = urlState.endHour;

		urlParamsLoaded = true;
	});

	// Load data when selection changes
	$effect(() => {
		if (!urlParamsLoaded) return;

		// Track Set sizes to ensure reactivity
		void selectedLines.size;
		void selectedStations.size;
		void aggregationMode;

		const cleanup = dataLoader.scheduleLoad(
			{
				selectedLines,
				selectedStations,
				aggregationMode,
				lines,
				lineNameMap,
				stations: data.stations
			},
			() => {
				isLoadingData = true;
			},
			(loadedData) => {
				aggregatedData = loadedData;
				isLoadingData = false;
				isFirstLoad = false;
			},
			() => {
				aggregatedData = [];
				isLoadingData = false;
			}
		);

		return cleanup;
	});

	// Filtered data
	const filteredData = $derived.by(() => {
		return applyAllFilters(
			aggregatedData,
			startDate,
			endDate,
			selectedDaysOfWeek,
			startHour,
			endHour,
			aggregationMode
		);
	});

	// Calculate statistics
	const stats = $derived(calculateAggregatedStats(filteredData));

	// Extract available dates from metadata (all dates between minDate and maxDate minus missingDates)
	const availableDates = $derived.by(() => {
		const dates = new Set<string>();
		const missingDatesSet = new Set(data.missingDates);
		const minDateObj = new Date(data.minDate);
		const maxDateObj = new Date(data.maxDate);

		// Generate all dates between minDate and maxDate
		const currentDate = new Date(minDateObj);
		while (currentDate <= maxDateObj) {
			const dateStr = formatDate(currentDate);
			// Only include dates that are not missing
			if (!missingDatesSet.has(dateStr)) {
				dates.add(dateStr);
			}
			currentDate.setDate(currentDate.getDate() + 1);
		}

		return dates;
	});

	// Export handler
	function handleExport() {
		exportAggregatedData(filteredData, aggregationMode);
	}

	// Share handler
	async function handleShare() {
		const urlString = generateShareableUrl(
			window.location.href,
			aggregationMode,
			selectedLines,
			selectedStations,
			startDate,
			endDate,
			lineNameMap,
			data.stations,
			selectedDaysOfWeek,
			startHour,
			endHour
		);

		const success = await copyToClipboard(urlString);
		copyFeedback = success ? 'Link copied!' : 'Failed to copy';

		setTimeout(() => {
			copyFeedback = '';
		}, 2000);
	}

	// Check if there's only one unique data point (one time period)
	// Checks for current aggregation mode and current date range, but not specific stations
	const hasOnlyOneDataPoint = $derived.by(() => {
		if (!startDate || !endDate) return false;

		const start = parseDate(startDate);
		const end = parseDate(endDate);

		switch (aggregationMode) {
			case 'daily':
				// Only 1 day is selected
				return startDate === endDate;

			case 'hourly':
				// Only 1 hour and 1 day is selected
				if (startDate !== endDate) return false;
				// Check if only 1 hour is selected (endHour is exclusive, so endHour - startHour === 1 means 1 hour)
				return endHour - startHour === 1;

			case 'weekly':
				// Only 1 week is selected (both dates fall in the same week)
				const startWeek = getWeekStart(start);
				const endWeek = getWeekStart(end);
				return startWeek.getTime() === endWeek.getTime();

			case 'monthly':
				// Only 1 month is selected (both dates fall in the same month)
				return formatMonth(start) === formatMonth(end);

			default:
				return false;
		}
	});

	// Placeholder text
	const placeholderText = $derived.by(() => {
		if (!startDate || !endDate) {
			return 'Please select a date range.';
		}
		if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
			return 'Please select a valid date range.';
		}
		if (hasOnlyOneDataPoint) {
			return 'Please select a longer date range.';
		}
		if (filteredData.length === 0) {
			return 'Please select a line or station.';
		}
		return '';
	});
</script>

<div class="flex min-h-screen flex-col bg-[#f5f1e8] font-mono">
	<!-- Header -->
	<header class="sticky top-0 z-10 flex items-center justify-between bg-[#f5f1e8] p-4">
		<h1 class="text-xs font-bold tracking-wide sm:text-sm">NAMMA METRO RIDERSHIP APP</h1>
	</header>

	<!-- Main Content -->
	<div class="flex flex-1 flex-col overflow-hidden lg:flex-row">
		<!-- Sidebar / Top Panel -->
		<div
			class="
			m-4
			flex
			h-[50vh]
			flex-col
			space-y-3
			overflow-y-auto
			rounded-lg
			border
			border-gray-200
			bg-[#f8f6f1]
			p-4
			shadow-sm
			lg:h-[80vh]
			lg:w-96
		"
		>
			<SearchableList
				bind:selectedLines
				bind:selectedStations
				bind:searchQuery
				bind:aggregationMode
				bind:startDate
				bind:endDate
				bind:selectedDaysOfWeek
				bind:startHour
				bind:endHour
				minDate={minDateStr}
				maxDate={maxDateStr}
				{lines}
				stations={data.stations}
				{availableDates}
			/>
		</div>

		<!-- Chart Area -->
		<div class="flex-1 overflow-y-auto p-4">
			{#if isLoadingData && isFirstLoad}
				<!-- Loading Indicator -->
				<div
					class="flex h-[350px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-[#f8f6f1] p-3 shadow-sm sm:h-[400px] sm:p-6 lg:h-[500px]"
				>
					<div class="flex flex-col items-center gap-3">
						<div class="relative h-12 w-12">
							<div class="absolute inset-0 rounded-full"></div>
							<div class="absolute inset-0 animate-spin rounded-full"></div>
						</div>
						<div class="font-mono text-sm text-gray-600">Loading chart data...</div>
					</div>
				</div>
			{:else}
				<!-- Stats -->
				{#if !placeholderText}
					<StatsDisplay
						avgRidership={stats.avgRidership}
						totalRidership={stats.totalRidership}
						{aggregationMode}
					/>
				{/if}

				<!-- Chart -->
				<RidershipChart
					data={filteredData}
					{aggregationMode}
					{placeholderText}
					onExport={handleExport}
					onShare={handleShare}
					{copyFeedback}
					{selectedDaysOfWeek}
					{startHour}
					{endHour}
					{startDate}
					{endDate}
				/>

				<!-- Disclaimer -->
				{#if !placeholderText}
					<Disclaimer />
				{/if}
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<Footer />
</div>
