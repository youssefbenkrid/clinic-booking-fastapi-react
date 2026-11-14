import type { Slot } from '../types'
import { formatTime, splitByPeriod } from '../utils'

interface Props {
  slots: Slot[]
  selected: string | null
  onSelect: (start: string) => void
}

export function SlotPicker({ slots, selected, onSelect }: Props) {
  if (slots.length === 0) {
    return <p className="muted">Le cabinet est fermé ce jour-là. Il est ouvert du lundi au vendredi.</p>
  }

  const { morning, afternoon } = splitByPeriod(slots)
  const hasFreeSlot = slots.some((slot) => slot.available)

  return (
    <div className="slot-picker">
      {!hasFreeSlot && <p className="muted">Plus aucun créneau libre ce jour-là. Essayez une autre date.</p>}
      <SlotRow label="Matin" slots={morning} selected={selected} onSelect={onSelect} />
      <SlotRow label="Après-midi" slots={afternoon} selected={selected} onSelect={onSelect} />
    </div>
  )
}

function SlotRow({ label, slots, selected, onSelect }: Props & { label: string }) {
  return (
    <div className="slot-row">
      <span className="slot-label">{label}</span>
      <div className="slots">
        {slots.map((slot) => (
          <button
            key={slot.start}
            type="button"
            className={`slot${slot.start === selected ? ' selected' : ''}`}
            disabled={!slot.available}
            aria-pressed={slot.start === selected}
            title={slot.available ? 'Créneau libre' : 'Créneau indisponible'}
            onClick={() => onSelect(slot.start)}
          >
            {formatTime(slot.start)}
          </button>
        ))}
      </div>
    </div>
  )
}
