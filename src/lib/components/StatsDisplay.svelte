<script lang="ts">
	import { formatCompactNumber } from '../utils/formatting';

	let {
		avgRidership,
		totalRidership,
		aggregationMode
	}: {
		avgRidership: number;
		totalRidership: number;
		aggregationMode: string;
	} = $props();
</script>

<div class="mt-6 grid grid-cols-2 gap-4">
	<div
		class="flex flex-col justify-between rounded-lg border border-gray-200 bg-[#f8f6f1] p-4 shadow-sm"
	>
		<div class="mb-2 text-xs font-semibold text-gray-500">
			AVERAGE {aggregationMode.toUpperCase()} RIDERSHIP
		</div>
		<div class="text-3xl font-bold sm:text-4xl">{formatCompactNumber(avgRidership)}</div>
	</div>
	<div
		class="flex flex-col justify-between rounded-lg border border-gray-200 bg-[#f8f6f1] p-4 shadow-sm"
	>
		<div class="mb-2 text-xs font-semibold text-gray-500">TOTAL RIDERSHIP</div>
		<div class="text-3xl font-bold sm:text-4xl">{formatCompactNumber(totalRidership)}</div>
	</div>
</div>

<div
	class="mt-6 flex flex-row items-start gap-4 rounded-lg border border-gray-200 bg-[#f8f6f1] p-3 text-xs text-gray-600 shadow-sm"
>
	<svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
		<path
			fill-rule="evenodd"
			d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
			clip-rule="evenodd"
		/>
	</svg>
	<div class="flex flex-col items-start gap-2">
		<p class="leading-relaxed">
			Ridership refers to the number of people entering or exiting a station. Interchanging between
			lines does not count towards additional ridership. However, official BMRCL ridership numbers
			consider interchanges as additional ridership.
		</p>
		<p class="leading-relaxed">
			Station ridership is the sum of entry and exit counts at the station. Line ridership is the
			sum of station entry counts for all stations on the line.
		</p>
		<p class="leading-relaxed">
			Averages and totals are calculated over the selected time period for the selected lines and
			stations.
		</p>
	</div>
</div>
