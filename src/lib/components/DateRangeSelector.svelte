<script lang="ts">
	import DayRangeSelector from './DayRangeSelector.svelte';
	import HourRangeSelector from './HourRangeSelector.svelte';

	let {
		startDate = $bindable(),
		endDate = $bindable(),
		aggregationMode = $bindable(),
		selectedDaysOfWeek = $bindable(),
		startHour = $bindable(),
		endHour = $bindable(),
		minDate,
		maxDate
	}: {
		startDate: string;
		endDate: string;
		aggregationMode: 'hourly' | 'daily' | 'weekly' | 'monthly';
		selectedDaysOfWeek: Set<string>;
		startHour: number;
		endHour: number;
		minDate: string;
		maxDate: string;
	} = $props();
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-row flex-wrap gap-2">
		<!-- Aggregation Mode -->
		<div class="flex items-center gap-2">
			<span class="text-xs">Aggregate</span>
			<select
				id="aggregation-select"
				bind:value={aggregationMode}
				class="rounded border border-gray-300 bg-white px-2 py-2 text-sm"
			>
				<option value="hourly">Hourly</option>
				<option value="daily">Daily</option>
				<option value="weekly">Weekly</option>
				<option value="monthly">Monthly</option>
			</select>
		</div>

		<!-- Date Range -->
		<div class="flex flex-row flex-wrap gap-2">
			<div class="flex items-center gap-2">
				<span class="text-xs">from</span>
				<input
					type="date"
					bind:value={startDate}
					min={minDate}
					max={maxDate}
					class="rounded border border-gray-300 bg-white px-2 py-2 text-sm"
				/>
			</div>

			<div class="flex items-center gap-2">
				<span class="text-xs">to</span>
				<input
					type="date"
					bind:value={endDate}
					min={minDate}
					max={maxDate}
					class="rounded border border-gray-300 bg-white px-2 py-2 text-sm"
				/>
			</div>
		</div>
	</div>

	<!-- Conditional Filters -->
	{#if aggregationMode === 'daily'}
		<DayRangeSelector bind:selectedDaysOfWeek />
	{/if}

	{#if aggregationMode === 'hourly'}
		<HourRangeSelector bind:startHour bind:endHour />
	{/if}
</div>
