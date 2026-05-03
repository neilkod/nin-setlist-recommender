import type { ShowIndex } from './types'

export interface TourEntry {
  name: string   // exact tour name as it appears in the data
  label: string  // abbreviated display name
}

export interface TourGroup {
  id: string
  era: string
  years: string
  tours: TourEntry[]
}

export const TOUR_GROUPS: TourGroup[] = [
  {
    id: 'phm',
    era: 'PRETTY HATE MACHINE',
    years: '1988–1991',
    tours: [
      { name: "Skinny Puppy's VIVIsectVI Tour",                      label: 'Support: Skinny Puppy' },
      { name: 'Pretty Hate Machine Promotional Tour',                  label: 'PHM Promo' },
      { name: "The Jesus and Mary Chain's Automatic Tour",            label: 'Support: JAMC' },
      { name: "Peter Murphy's Deep + A Strange Kind of Love Tour",    label: 'Support: Peter Murphy' },
      { name: 'Hate',                                                  label: 'Hate' },
      { name: 'Sin',                                                   label: 'Sin' },
      { name: 'Lollapalooza (Warm Up)',                                label: 'Lollapalooza (Warm Up)' },
      { name: 'Lollapalooza',                                          label: 'Lollapalooza' },
      { name: 'Europe - 1991',                                         label: 'Europe 1991' },
    ],
  },
  {
    id: 'tds',
    era: 'BROKEN / THE DOWNWARD SPIRAL',
    years: '1992–1996',
    tours: [
      { name: 'Self Destruct (Warm Up)',                                       label: 'Self Destruct (Warm Up)' },
      { name: 'Self Destruct (Part 1)',                                         label: 'Self Destruct I' },
      { name: 'Further Down The Spiral + Self Destruct (Part 2)',              label: 'Self Destruct II' },
      { name: 'Alternative Nation Festival',                                    label: 'Alternative Nation' },
      { name: 'Outside Tour',                                                   label: 'Outside Tour' },
      { name: 'Club Tour (with Helmet)',                                        label: 'Club Tour w/ Helmet' },
      { name: 'Night Of Nothing (Nothing Records Showcase)',                    label: 'Night of Nothing' },
      { name: 'MTV Video Music Awards',                                         label: 'MTV VMAs' },
    ],
  },
  {
    id: 'fragile',
    era: 'THE FRAGILE',
    years: '1999–2001',
    tours: [
      { name: 'Fragility Tour 1.0', label: 'Fragility 1.0' },
      { name: 'Fragility Tour 2.0', label: 'Fragility 2.0' },
    ],
  },
  {
    id: 'teeth',
    era: 'WITH TEETH',
    years: '2005–2007',
    tours: [
      { name: 'Live: With Teeth Club Tour - Spring',              label: 'Club Tour (Spring)' },
      { name: 'Live: With Teeth Tour - Summer (International)',   label: 'Summer Intl' },
      { name: 'Live With Teeth Tour - Summer (North America)',    label: 'Summer NA' },
      { name: 'Live With Teeth Tour - Fall',                      label: 'Fall' },
      { name: 'Live With Teeth Tour - Winter',                    label: 'Winter' },
      { name: 'Trent Reznor at ReAct Now: Music & Relief',       label: 'ReAct Now Benefit' },
      { name: 'Trent Reznor at the Bridge School Benefit',        label: 'Bridge School Benefit' },
    ],
  },
  {
    id: 'lights',
    era: 'YEAR ZERO / GHOSTS / THE SLIP',
    years: '2007–2009',
    tours: [
      { name: 'European Tour - Winter',                    label: 'European Winter' },
      { name: 'Open Source Resistance Meeting',            label: 'Open Source Resistance' },
      { name: 'Performance 2007 - Australia Japan',        label: 'Australia / Japan 2007' },
      { name: 'European Tour - European Festivals',        label: 'European Festivals' },
      { name: 'European Tour - Pacific Rim',               label: 'Pacific Rim' },
      { name: 'Lights In The Sky Over North America (1st Leg)', label: 'Lights in the Sky I' },
      { name: 'Lights In The Sky Over South America',      label: 'Lights in the Sky (South America)' },
      { name: 'Lights In The Sky Over North America (2nd Leg)', label: 'Lights in the Sky II' },
      { name: 'Australia Tour',                            label: 'Australia Tour' },
      { name: 'NIN|JA Tour',                               label: 'NIN|JA' },
      { name: 'European + Pacific Festivals',              label: 'Euro + Pacific Festivals' },
      { name: 'Wave Goodbye',                              label: 'Wave Goodbye' },
      { name: 'Festival Dates',                            label: 'Festival Dates' },
    ],
  },
  {
    id: 'hm',
    era: 'HESITATION MARKS',
    years: '2013–2014',
    tours: [
      { name: 'Tension',                                                label: 'Tension' },
      { name: '56th Annual Grammy Music Awards',                        label: 'Grammy Awards' },
      { name: 'Japan',                                                  label: 'Japan' },
      { name: 'NIN + Queens Of The Stone Age (Australia New Zealand)',  label: 'Co-headline w/ QOTSA' },
      { name: 'Latin America',                                          label: 'Latin America' },
      { name: 'Europe - 2014',                                          label: 'Europe 2014' },
    ],
  },
  {
    id: 'avbw',
    era: 'ADD VIOLENCE / BAD WITCH',
    years: '2016–2018',
    tours: [
      { name: 'NIN + Soundgarden (USA+Canada)',       label: 'Co-headline w/ Soundgarden' },
      { name: "I Can't Seem To Wake Up",              label: "I Can't Seem To Wake Up" },
      { name: 'Las Vegas',                            label: 'Las Vegas Residency' },
      { name: 'Europe + Asia + Pacific 2018',         label: 'Europe / Asia / Pacific 2018' },
      { name: 'Cold and Black and Infinite - 2018',   label: 'Cold and Black and Infinite' },
    ],
  },
  {
    id: 'covid',
    era: 'POST-COVID',
    years: '2022',
    tours: [
      { name: 'US Spring 2022',  label: 'US Spring 2022' },
      { name: 'UK Summer 2022',  label: 'UK Summer 2022' },
      { name: 'US Fall 2022',    label: 'US Fall 2022' },
      { name: 'VetsAid 2022',    label: 'VetsAid' },
    ],
  },
  {
    id: 'peel',
    era: 'PEEL IT BACK',
    years: '2025–2026',
    tours: [
      { name: 'Peel It Back - Summer Tour 2025 Europe',              label: 'Peel It Back (Europe)' },
      { name: 'Peel It Back - Fall Arena Tour 2025 North America',   label: 'Peel It Back (Fall NA)' },
      { name: 'Peel It Back - Spring Arena Tour 2026 North America', label: 'Peel It Back (Spring NA)' },
    ],
  },
]

// Quick lookup: tour name → abbreviated label
const TOUR_LABEL_MAP = new Map<string, string>(
  TOUR_GROUPS.flatMap((g) => g.tours.map((t) => [t.name, t.label]))
)

export function getTourLabel(name: string): string {
  return TOUR_LABEL_MAP.get(name) ?? name
}

// Filter shows by era ID, specific tour name, or return all
export function filterShowsByTour(
  shows: ShowIndex[],
  era?: string,
  tour?: string,
): ShowIndex[] {
  if (tour) {
    return shows.filter((s) => s.tour === tour)
  }
  if (era) {
    const group = TOUR_GROUPS.find((g) => g.id === era)
    if (!group) return shows
    const tourNames = new Set(group.tours.map((t) => t.name))
    return shows.filter((s) => tourNames.has(s.tour))
  }
  return shows
}

// Human-readable description of the current filter selection
export function filterLabel(era?: string, tour?: string): string | null {
  if (tour) return getTourLabel(tour)
  if (era) {
    const group = TOUR_GROUPS.find((g) => g.id === era)
    return group ? `${group.era} ERA (${group.years})` : null
  }
  return null
}
