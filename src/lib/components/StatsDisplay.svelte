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

<div class="mb-6 grid grid-cols-2 gap-4">
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
