<script lang="ts">
	let {
		startHour = $bindable(),
		endHour = $bindable()
	}: {
		startHour: number;
		endHour: number;
	} = $props();

	// Format hour as 12AM, 1AM, etc.
	function formatHour(hour: number): string {
		if (hour === 0 || hour === 24) return '12AM';
		if (hour < 12) return `${hour}AM`;
		if (hour === 12) return '12PM';
		return `${hour - 12}PM`;
	}

	// Generate hours for start (0-23: 12AM to 11PM)
	const startHours = Array.from({ length: 24 }, (_, i) => i);

	// Generate hours for end (1-24: 1AM to 12AM next day, exclusive)
	const endHours = Array.from({ length: 24 }, (_, i) => i + 1);
</script>

<div class="flex flex-row flex-wrap items-center gap-2">
	<div class="flex items-center gap-2">
		<span class="text-xs">from</span>
		<select
			bind:value={startHour}
			class="h-9 rounded border border-gray-300 bg-white px-2 py-2 text-sm"
		>
			{#each startHours as hour}
				<option value={hour}>{formatHour(hour)}</option>
			{/each}
		</select>
	</div>

	<div class="flex items-center gap-2">
		<span class="text-xs">to</span>
		<select
			bind:value={endHour}
			class="h-9 rounded border border-gray-300 bg-white px-2 py-2 text-sm"
		>
			{#each endHours as hour}
				<option value={hour}>{formatHour(hour)}</option>
			{/each}
		</select>
	</div>
</div>
