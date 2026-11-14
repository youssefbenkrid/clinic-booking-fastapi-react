// Toutes les communications avec l'API passent par ce fichier.
import type { Appointment, NewAppointment, Practitioner, Slot } from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// Extrait un message lisible d'une réponse d'erreur de l'API.
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) {
      return body.detail.map((error: { msg: string }) => error.msg).join(' ')
    }
  } catch {
    // La réponse ne contient pas de JSON : on garde le message générique ci-dessous.
  }
  return `Erreur ${response.status}`
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const api = {
  practitioners: () => request<Practitioner[]>('/practitioners'),

  slots: (practitionerId: number, day: string) =>
    request<Slot[]>(`/practitioners/${practitionerId}/slots?day=${day}`),

  appointments: (practitionerId: number, day: string) =>
    request<Appointment[]>(`/appointments?practitioner_id=${practitionerId}&day=${day}`),

  book: (data: NewAppointment) =>
    request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),

  cancel: (appointmentId: number) =>
    request<void>(`/appointments/${appointmentId}`, { method: 'DELETE' }),
}
