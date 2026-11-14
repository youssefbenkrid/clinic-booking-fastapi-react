import type { Practitioner } from '../types'

interface Props {
  practitioners: Practitioner[]
  selectedId: number | null
  onSelect: (practitionerId: number) => void
}

export function PractitionerPicker({ practitioners, selectedId, onSelect }: Props) {
  return (
    <div className="practitioners">
      {practitioners.map((practitioner) => {
        const isSelected = practitioner.id === selectedId
        return (
          <button
            key={practitioner.id}
            type="button"
            className={`card${isSelected ? ' selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(practitioner.id)}
          >
            <span className="card-name">{practitioner.name}</span>
            <span className="card-specialty">{practitioner.specialty}</span>
          </button>
        )
      })}
    </div>
  )
}
