// Types qui correspondent exactement aux données renvoyées par l'API Python.

export interface Practitioner {
  id: number
  name: string
  specialty: string
}

export interface Slot {
  start: string // ex. "2026-11-23T09:30:00"
  available: boolean
}

export interface Appointment {
  id: number
  practitioner_id: number
  patient_name: string
  patient_email: string
  start: string
  status: 'booked' | 'cancelled'
}

export interface NewAppointment {
  practitioner_id: number
  patient_name: string
  patient_email: string
  start: string
}
