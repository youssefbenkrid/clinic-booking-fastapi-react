// Petites fonctions sans effet de bord, faciles à tester (voir utils.test.ts).
import type { Slot } from './types'

/** "2026-11-23T09:30:00" → "09:30" */
export function formatTime(isoDateTime: string): string {
  return isoDateTime.slice(11, 16)
}

/** Date au format AAAA-MM-JJ, en heure locale (et non en UTC). */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** true si la date (AAAA-MM-JJ) tombe un samedi ou un dimanche. */
export function isWeekend(isoDate: string): boolean {
  const [year, month, day] = isoDate.split('-').map(Number)
  const weekday = new Date(year, month - 1, day).getDay()
  return weekday === 0 || weekday === 6
}

/** Premier jour d'ouverture (lundi au vendredi) à partir de demain. */
export function nextOpenDay(from: Date = new Date()): string {
  const day = new Date(from)
  do {
    day.setDate(day.getDate() + 1)
  } while (isWeekend(toIsoDate(day)))
  return toIsoDate(day)
}

/** "2026-11-23" → "lundi 23 novembre 2026" */
export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('fr-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Sépare les créneaux du matin et de l'après-midi. */
export function splitByPeriod(slots: Slot[]): { morning: Slot[]; afternoon: Slot[] } {
  const hour = (slot: Slot) => Number(slot.start.slice(11, 13))
  return {
    morning: slots.filter((slot) => hour(slot) < 12),
    afternoon: slots.filter((slot) => hour(slot) >= 12),
  }
}

/** Vérifie le formulaire avant l'envoi. Renvoie un message d'erreur, ou null si tout est correct. */
export function validateBooking(name: string, email: string): string | null {
  if (name.trim().length < 2) {
    return "Indiquez un nom d'au moins 2 caractères."
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return 'Indiquez une adresse e-mail valide.'
  }
  return null
}
