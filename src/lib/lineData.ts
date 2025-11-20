// BMRCL Metro Lines and Stations mapping
export interface Line {
	name: string;
	color: string;
	stations: string[];
}

export const lines: Line[] = [
	{
		name: 'Green Line',
		color: '#22c55e',
		stations: [
			'Madavara',
			'Chikkabidarakallu',
			'Manjunathanagara',
			'Nagasandra',
			'Dasarahalli',
			'Jalahalli',
			'Peenya Industry',
			'Peenya',
			'Goraguntepalya',
			'Yeshwantpur',
			'Sandal Soap Factory',
			'Mahalakshmi',
			'Rajajinagar',
			'Mahakavi Kuvempu Road',
			'Srirampura',
			'Mantri Square Sampige Road',
			'Nadaprabhu Kempegowda Station, Majestic',
			'Chickpete',
			'Krishna Rajendra Market',
			'National College',
			'Lalbagh',
			'South End Circle',
			'Jayanagar',
			'Rashtreeya Vidyalaya Road',
			'Banashankari',
			'Jaya Prakash Nagar',
			'Yelachenahalli',
			'Konanakunte Cross',
			'Doddakallasandra',
			'Vajarahalli',
			'Thalaghattapura',
			'Silk Institute'
		]
	},
	{
		name: 'Purple Line',
		color: '#a855f7',
		stations: [
			'Challaghatta',
			'Kengeri',
			'Kengeri Bus Terminal',
			'Pattanagere',
			'Jnanabharathi',
			'Rajarajeshwari Nagar',
			'Pantharapalya - Nayandahalli',
			'Mysore Road',
			'Deepanjali Nagar',
			'Attiguppe',
			'Vijayanagar',
			'Sri Balagangadharanatha Swamiji Station, Hosahalli',
			'Magadi Road',
			'Krantivira Sangolli Rayanna Railway Station',
			'Nadaprabhu Kempegowda Station, Majestic',
			'Sir M. Visvesvaraya Stn., Central College',
			'Dr. B. R. Ambedkar Station, Vidhana Soudha',
			'Cubbon Park',
			'Mahatma Gandhi Road',
			'Trinity',
			'Halasuru',
			'Indiranagar',
			'Swami Vivekananda Road',
			'Baiyappanahalli',
			'Benniganahalli',
			'Krishnarajapura',
			'Singayyanapalya',
			'Garudacharpalya',
			'Hoodi',
			'Seetharampalya',
			'Kundalahalli',
			'Nallurahalli',
			'Sri Sathya Sai Hospital',
			'Pattandur Agrahara',
			'Kadugodi Tree Park',
			'Hopefarm Channasandra',
			'Whitefield (Kadugodi)'
		]
	},
	{
		name: 'Yellow Line',
		color: '#eab308',
		stations: [
			'Rashtreeya Vidyalaya Road',
			'Ragigudda',
			'Jayadeva Hospital',
			'BTM Layout',
			'Central Silk Board',
			'Bommanahalli',
			'Hongasandra',
			'Kudlu Gate',
			'Singasandra',
			'Hosa Road',
			'Beratena Agrahara',
			'Electronic City',
			'Infosys Foundation Konappana Agrahara',
			'Huskur Road',
			'Biocon Hebbagodi',
			'Delta Electronics Bommasandra'
		]
	}
];

// Create a map of station to lines
export function getStationLines(): Map<string, string[]> {
	const stationLines = new Map<string, string[]>();

	lines.forEach((line) => {
		line.stations.forEach((station) => {
			if (!stationLines.has(station)) {
				stationLines.set(station, []);
			}
			stationLines.get(station)!.push(line.name);
		});
	});

	return stationLines;
}

// Get all unique stations across all lines
export function getAllStations(): string[] {
	const allStations = new Set<string>();
	lines.forEach((line) => {
		line.stations.forEach((station) => allStations.add(station));
	});
	return Array.from(allStations).sort();
}

// Get color for a line
export function getLineColor(lineName: string): string {
	const line = lines.find((l) => l.name === lineName);
	return line?.color || '#000000';
}
