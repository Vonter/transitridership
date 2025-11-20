<script lang="ts">
	let {
		selectedDaysOfWeek = $bindable()
	}: {
		selectedDaysOfWeek: Set<string>;
	} = $props();

	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	function toggleDay(day: string) {
		const newSet = new Set(selectedDaysOfWeek);
		if (newSet.has(day)) {
			newSet.delete(day);
		} else {
			newSet.add(day);
		}
		selectedDaysOfWeek = newSet;
	}
</script>

<div class="flex flex-row flex-wrap items-center gap-2">
	<span class="text-xs">for</span>
	<div class="flex flex-wrap gap-0.5">
		{#each days as day}
			<button
				onclick={() => toggleDay(day)}
				class="h-9 rounded border px-2 py-2 text-sm {selectedDaysOfWeek.has(day)
					? 'border-gray-300 bg-white'
					: 'border-gray-300 bg-gray-200'}"
			>
				{day.substring(0, 2)}
			</button>
		{/each}
	</div>
</div>
