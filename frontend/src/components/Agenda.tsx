import type { Appointment } from '../types'
import { formatTime } from '../utils'

interface Props {
  appointments: Appointment[]
  onCancel: (appointment: Appointment) => void
}

export function Agenda({ appointments, onCancel }: Props) {
  if (appointments.length === 0) {
    return <p className="muted">Aucun rendez-vous ce jour-là.</p>
  }

  return (
    <ul className="agenda">
      {appointments.map((appointment) => (
        <li key={appointment.id}>
          <span className="agenda-time">{formatTime(appointment.start)}</span>
          <span className="agenda-patient">
            {appointment.patient_name}
            <small>{appointment.patient_email}</small>
          </span>
          <button type="button" className="link-button" onClick={() => onCancel(appointment)}>
            Annuler
          </button>
        </li>
      ))}
    </ul>
  )
}
