<script lang="ts">
	import type { Line } from '../lineData';
	import DateRangeSelector from './DateRangeSelector.svelte';

	let {
		selectedLines = $bindable(),
		selectedStations = $bindable(),
		searchQuery = $bindable(),
		aggregationMode = $bindable(),
		startDate = $bindable(),
		endDate = $bindable(),
		selectedDaysOfWeek = $bindable(),
		startHour = $bindable(),
		endHour = $bindable(),
		minDate,
		maxDate,
		lines,
		stations,
		availableDates = new Set<string>()
	}: {
		selectedLines: Set<number>;
		selectedStations: Set<number>;
		searchQuery: string;
		aggregationMode: 'hourly' | 'daily' | 'weekly' | 'monthly';
		startDate: string;
		endDate: string;
		selectedDaysOfWeek: Set<string>;
		startHour: number;
		endHour: number;
		minDate: string;
		maxDate: string;
		lines: Line[];
		stations: string[];
		availableDates?: Set<string>;
	} = $props();

	// Collapsed state for tree sections
	let linesCollapsed = $state(false);
	let stationsCollapsed = $state(false);

	function toggleLineSelection(index: number) {
		const newSet = new Set(selectedLines);
		if (newSet.has(index)) {
			newSet.delete(index);
		} else {
			newSet.add(index);
		}
		selectedLines = newSet;
	}

	function toggleStationSelection(index: number) {
		const newSet = new Set(selectedStations);
		if (newSet.has(index)) {
			newSet.delete(index);
		} else {
			newSet.add(index);
		}
		selectedStations = newSet;
	}

	// Filter lines
	const filteredLines = $derived(
		lines
			.map((line, idx) => ({ line, idx }))
			.filter(({ line }) => line.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	// Create a map of station names to their line colors
	const stationToLines = (() => {
		const stationLineMap = new Map<string, Array<{ name: string; color: string }>>();

		lines.forEach((line) => {
			line.stations.forEach((stationName) => {
				if (!stationLineMap.has(stationName)) {
					stationLineMap.set(stationName, []);
				}
				stationLineMap.get(stationName)!.push({ name: line.name, color: line.color });
			});
		});

		return stationLineMap;
	})();

	// Filter stations alphabetically
	const filteredStations = $derived.by(() => {
		const query = searchQuery.toLowerCase();
		return stations
			.map((stationName, idx) => ({ name: stationName, idx }))
			.filter(({ name }) => name.toLowerCase().includes(query))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	// Check if we should show lines section
	const showLinesSection = $derived(filteredLines.length > 0);

	// Check if we should show stations section
	const showStationsSection = $derived(filteredStations.length > 0);
</script>

<!-- Date Range Selector -->
<div class="pb-2">
	<DateRangeSelector
		bind:startDate
		bind:endDate
		bind:aggregationMode
		bind:selectedDaysOfWeek
		bind:startHour
		bind:endHour
		{minDate}
		{maxDate}
		{availableDates}
	/>
</div>

<div class="space-y-3">
	<div class="relative">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search"
			class="w-full rounded border border-gray-300 px-3 py-2 pl-9 text-sm"
		/>
		<svg
			class="absolute top-2.5 left-3 h-4 w-4 text-gray-400"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
	</div>
</div>

<!-- Tree View -->
<div class="-mx-2 mt-3 flex-1 overflow-y-auto px-2">
	<!-- Lines Section -->
	{#if showLinesSection}
		<div class="mb-2">
			<button
				onclick={() => (linesCollapsed = !linesCollapsed)}
				class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
			>
				<svg
					class="h-4 w-4 text-gray-500 transition-transform {linesCollapsed ? '' : 'rotate-90'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				<span class="text-sm font-semibold text-gray-700">Lines</span>
				<span class="text-xs text-gray-500">({filteredLines.length})</span>
			</button>

			{#if !linesCollapsed}
				<div class="mt-1 ml-6 space-y-0.5">
					{#each filteredLines as { line, idx }}
						<label
							class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors hover:bg-gray-50"
						>
							<input
								type="checkbox"
								checked={selectedLines.has(idx)}
								onchange={() => toggleLineSelection(idx)}
								class="h-4 w-4 rounded text-[#2563eb]"
							/>
							<div class="flex flex-1 items-center gap-2">
								<div class="h-3 w-3 rounded-full" style="background-color: {line.color};"></div>
								<span class="text-sm">{line.name}</span>
							</div>
						</label>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Stations Section -->
	{#if showStationsSection}
		<div class="mb-2">
			<button
				onclick={() => (stationsCollapsed = !stationsCollapsed)}
				class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
			>
				<svg
					class="h-4 w-4 text-gray-500 transition-transform {stationsCollapsed ? '' : 'rotate-90'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				<span class="text-sm font-semibold text-gray-700">Stations</span>
				<span class="text-xs text-gray-500">({filteredStations.length})</span>
			</button>

			{#if !stationsCollapsed}
				<div class="mt-1 ml-6 space-y-0.5">
					{#each filteredStations as { name, idx }}
						{@const stationLines = stationToLines.get(name) || []}
						<label
							class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors hover:bg-gray-50"
						>
							<input
								type="checkbox"
								checked={selectedStations.has(idx)}
								onchange={() => toggleStationSelection(idx)}
								class="h-4 w-4 rounded text-[#2563eb]"
							/>
							<div class="flex items-center gap-1.5">
								{#each stationLines as stationLine}
									<div
										class="h-2.5 w-2.5 rounded-full"
										style="background-color: {stationLine.color};"
										title={stationLine.name}
									></div>
								{/each}
							</div>
							<span class="flex-1 text-sm">{name}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{#if !showLinesSection && !showStationsSection}
		<div class="py-8 text-center text-sm text-gray-400">No results found</div>
	{/if}
</div>
