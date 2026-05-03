'use client'

import { useRouter } from 'next/navigation'
import { TOUR_GROUPS } from '@/lib/tourGroups'

interface TourFilterProps {
  selectedEra?: string
  selectedTour?: string
}

export default function TourFilter({ selectedEra, selectedTour }: TourFilterProps) {
  const router = useRouter()

  // The <select> value encodes both type and value
  const current = selectedTour
    ? `tour:${selectedTour}`
    : selectedEra
    ? `era:${selectedEra}`
    : ''

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (!val) {
      router.push('/')
      return
    }
    if (val.startsWith('era:')) {
      router.push(`/?era=${encodeURIComponent(val.slice(4))}`)
    } else if (val.startsWith('tour:')) {
      router.push(`/?tour=${encodeURIComponent(val.slice(5))}`)
    }
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-dim shrink-0">FILTER BY TOUR</span>
      <select
        value={current}
        onChange={handleChange}
        className="bg-background text-foreground border border-border px-2 py-1.5 text-xs font-mono flex-1 max-w-sm hover:border-border-bright focus:outline-none focus:border-green transition-colors"
      >
        <option value="">ALL TOURS (1988–2026)</option>
        {TOUR_GROUPS.map((group) => (
          <optgroup key={group.id} label={`── ${group.era} (${group.years})`}>
            <option value={`era:${group.id}`}>
              {group.era} — all {group.tours.length} legs
            </option>
            {group.tours.map((tour) => (
              <option key={tour.name} value={`tour:${tour.name}`}>
                &nbsp;&nbsp;{tour.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
