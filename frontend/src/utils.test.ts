import { describe, expect, it } from 'vitest'
import { formatTime, isWeekend, nextOpenDay, splitByPeriod, toIsoDate, validateBooking } from './utils'

describe('formatTime', () => {
  it("garde seulement l'heure et les minutes", () => {
    expect(formatTime('2026-11-23T09:30:00')).toBe('09:30')
  })
})

describe('toIsoDate', () => {
  it('formate une date locale en AAAA-MM-JJ', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('isWeekend', () => {
  it('reconnaît le samedi et le dimanche', () => {
    expect(isWeekend('2026-11-21')).toBe(true) // samedi
    expect(isWeekend('2026-11-22')).toBe(true) // dimanche
    expect(isWeekend('2026-11-23')).toBe(false) // lundi
  })
})

describe('nextOpenDay', () => {
  it('passe au lendemain en semaine', () => {
    expect(nextOpenDay(new Date(2026, 10, 18))).toBe('2026-11-19') // mercredi → jeudi
  })

  it('saute le week-end', () => {
    expect(nextOpenDay(new Date(2026, 10, 20))).toBe('2026-11-23') // vendredi → lundi
    expect(nextOpenDay(new Date(2026, 10, 21))).toBe('2026-11-23') // samedi → lundi
  })
})

describe('splitByPeriod', () => {
  it('sépare le matin et l’après-midi', () => {
    const slots = [
      { start: '2026-11-23T09:00:00', available: true },
      { start: '2026-11-23T11:30:00', available: false },
      { start: '2026-11-23T13:00:00', available: true },
    ]
    const { morning, afternoon } = splitByPeriod(slots)
    expect(morning.map((slot) => slot.start.slice(11, 16))).toEqual(['09:00', '11:30'])
    expect(afternoon.map((slot) => slot.start.slice(11, 16))).toEqual(['13:00'])
  })
})

describe('validateBooking', () => {
  it('accepte un formulaire correct', () => {
    expect(validateBooking('Lina Janssens', 'lina@example.com')).toBeNull()
  })

  it('refuse un nom trop court ou un e-mail invalide', () => {
    expect(validateBooking(' A ', 'lina@example.com')).toMatch(/nom/)
    expect(validateBooking('Lina', 'pas-un-email')).toMatch(/e-mail/)
  })
})
