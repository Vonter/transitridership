<script lang="ts">
	import { lines } from '$lib/lineData';
	import type { Metadata } from './+page.server';
	import SearchableList from '$lib/components/SearchableList.svelte';
	import RidershipChart from '$lib/components/RidershipChart.svelte';
	import StatsDisplay from '$lib/components/StatsDisplay.svelte';
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
	import { formatDate, getLastMonthRange } from '$lib/utils/dateUtils';

	let { data }: { data: Metadata } = $props();

	// Date range setup
	const minDateStr = formatDate(new Date(data.minDate));
	const maxDateStr = formatDate(new Date(data.maxDate));
	const lastMonthRange = getLastMonthRange(maxDateStr);

	// State management
	let selectedDaysOfWeek = $state<Set<string>>(
		new Set(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
	);
	let selectedLines = $state<Set<number>>(new Set());
	let selectedStations = $state<Set<number>>(new Set());
	let searchQuery = $state('');
	let aggregationMode = $state<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
	let startDate = $state(lastMonthRange.start);
	let endDate = $state(lastMonthRange.end);
	let startHour = $state(0);
	let endHour = $state(24);

	// Data state
	let cachedAggregatedData: AggregatedData[] = $state([]);
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
				cachedAggregatedData = loadedData;
				isLoadingData = false;
				isFirstLoad = false;
			},
			() => {
				cachedAggregatedData = [];
				isLoadingData = false;
			}
		);

		return cleanup;
	});

	// Filtered data with memoization
	let lastFilterKey = '';
	let cachedFilteredData: AggregatedData[] = [];

	const filteredData = $derived.by(() => {
		const daysOfWeekKey = Array.from(selectedDaysOfWeek).sort().join(',');
		const filterKey = `${startDate}-${endDate}-${cachedAggregatedData.length}-${aggregationMode}-${daysOfWeekKey}-${startHour}-${endHour}`;

		if (filterKey === lastFilterKey) {
			return cachedFilteredData;
		}

		lastFilterKey = filterKey;
		cachedFilteredData = applyAllFilters(
			cachedAggregatedData,
			startDate,
			endDate,
			selectedDaysOfWeek,
			startHour,
			endHour,
			aggregationMode
		);
		return cachedFilteredData;
	});

	// Calculate statistics
	const stats = $derived(calculateAggregatedStats(filteredData));

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

	// Placeholder text
	const placeholderText = $derived(
		startDate && endDate && new Date(startDate) > new Date(endDate)
			? 'Please select a valid time range.'
			: 'Please select a line or station.'
	);
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
				/>

				<!-- Stats -->
				{#if filteredData.length > 0}
					<StatsDisplay
						avgRidership={stats.avgRidership}
						totalRidership={stats.totalRidership}
						{aggregationMode}
					/>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<footer class="bg-[#f5f1e8] p-4 text-xs text-gray-600">
		<div class="flex flex-col gap-1">
			<p>
				Explore the <a
					href="https://github.com/Vonter/transitridership"
					class="text-teal-600 hover:underline">Code</a
				>
				and
				<a
					href="https://github.com/Vonter/bmrcl-ridership-hourly"
					class="text-teal-600 hover:underline">Data</a
				>
			</p>
			<p>
				Inspired by the <a
					href="https://ridership.streetsforall.org/"
					class="text-teal-600 hover:underline">LA Metro Ridership App</a
				>
				from the
				<a href="https://streetsforall.org" class="text-teal-600 hover:underline"
					>Streets for All Data/Dev Team</a
				>
			</p>
		</div>
	</footer>
</div>
