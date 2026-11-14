import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from '../api'
import type { Appointment, Practitioner } from '../types'
import { formatLongDate, formatTime, validateBooking } from '../utils'

interface Props {
  practitioner: Practitioner
  start: string
  onBooked: (appointment: Appointment) => void
}

export function BookingForm({ practitioner, start, onBooked }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // 1. Vérification rapide dans le navigateur, avant même d'appeler l'API.
    const problem = validateBooking(name, email)
    if (problem) {
      setError(problem)
      return
    }

    // 2. Envoi à l'API, qui applique toutes les règles du cabinet.
    setSending(true)
    setError(null)
    try {
      const appointment = await api.book({
        practitioner_id: practitioner.id,
        patient_name: name.trim(),
        patient_email: email.trim(),
        start,
      })
      onBooked(appointment)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Impossible de joindre le serveur.')
    } finally {
      setSending(false)
    }
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      <p className="recap">
        <strong>{practitioner.name}</strong> · {formatLongDate(start.slice(0, 10))} à {formatTime(start)}
      </p>
      <label>
        Nom et prénom
        <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
      </label>
      <label>
        Adresse e-mail
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary" disabled={sending}>
        {sending ? 'Réservation…' : 'Confirmer le rendez-vous'}
      </button>
    </form>
  )
}
