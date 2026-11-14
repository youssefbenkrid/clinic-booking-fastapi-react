import { useEffect, useState } from 'react'
import { api, ApiError } from './api'
import { Agenda } from './components/Agenda'
import { BookingForm } from './components/BookingForm'
import { PractitionerPicker } from './components/PractitionerPicker'
import { SlotPicker } from './components/SlotPicker'
import type { Appointment, Practitioner, Slot } from './types'
import { formatLongDate, formatTime, nextOpenDay, toIsoDate } from './utils'

type Notice = { type: 'success' | 'error'; text: string }

const API_UNREACHABLE = "Impossible de joindre l'API. Vérifiez qu'elle tourne sur le port 8000."

function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : API_UNREACHABLE
}

export default function App() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([])
  const [practitionerId, setPractitionerId] = useState<number | null>(null)
  const [today] = useState(() => toIsoDate(new Date()))
  const [day, setDay] = useState(() => nextOpenDay())
  const [slots, setSlots] = useState<Slot[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  // Incrémenté après une réservation ou une annulation pour recharger les données.
  const [reloadKey, setReloadKey] = useState(0)

  const practitioner = practitioners.find((p) => p.id === practitionerId) ?? null

  // Au chargement de la page : liste des praticiens.
  useEffect(() => {
    api
      .practitioners()
      .then((list) => {
        setPractitioners(list)
        if (list.length > 0) setPractitionerId(list[0].id)
      })
      .catch((error) => setNotice({ type: 'error', text: messageOf(error) }))
  }, [])

  // À chaque changement de praticien, de date ou après une modification : créneaux et agenda.
  useEffect(() => {
    if (practitionerId === null) return
    let ignore = false // évite d'afficher une réponse arrivée après un autre choix
    Promise.all([api.slots(practitionerId, day), api.appointments(practitionerId, day)])
      .then(([newSlots, newAppointments]) => {
        if (ignore) return
        setSlots(newSlots)
        setAppointments(newAppointments)
      })
      .catch((error) => {
        if (!ignore) setNotice({ type: 'error', text: messageOf(error) })
      })
    return () => {
      ignore = true
    }
  }, [practitionerId, day, reloadKey])

  function choosePractitioner(id: number) {
    setPractitionerId(id)
    setSelectedSlot(null)
    setNotice(null)
  }

  function chooseDay(newDay: string) {
    if (!newDay) return
    setDay(newDay)
    setSelectedSlot(null)
    setNotice(null)
  }

  function chooseSlot(start: string) {
    setSelectedSlot(start)
    setNotice(null)
  }

  function handleBooked(appointment: Appointment) {
    setNotice({
      type: 'success',
      text: `Rendez-vous confirmé le ${formatLongDate(day)} à ${formatTime(appointment.start)} avec ${practitioner?.name}.`,
    })
    setSelectedSlot(null)
    setReloadKey((key) => key + 1)
  }

  async function handleCancel(appointment: Appointment) {
    const question = `Annuler le rendez-vous de ${appointment.patient_name} à ${formatTime(appointment.start)} ?`
    if (!window.confirm(question)) return
    try {
      await api.cancel(appointment.id)
      setNotice({ type: 'success', text: 'Rendez-vous annulé : le créneau est de nouveau libre.' })
      setReloadKey((key) => key + 1)
    } catch (error) {
      setNotice({ type: 'error', text: messageOf(error) })
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <div>
            <h1>Cabinet Santé Plus</h1>
            <p>Prise de rendez-vous en ligne</p>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          {notice && (
            <div className={`notice ${notice.type}`} role="status">
              <span>{notice.text}</span>
              <button type="button" className="close" aria-label="Fermer" onClick={() => setNotice(null)}>
                ×
              </button>
            </div>
          )}

          <h2>
            <span className="step">1</span> Choisissez un praticien
          </h2>
          <PractitionerPicker practitioners={practitioners} selectedId={practitionerId} onSelect={choosePractitioner} />

          <h2>
            <span className="step">2</span> Choisissez une date et un créneau
          </h2>
          <div className="date-field">
            <label>
              Date
              <input type="date" value={day} min={today} onChange={(event) => chooseDay(event.target.value)} />
            </label>
            <span className="muted">{formatLongDate(day)}</span>
          </div>
          <SlotPicker slots={slots} selected={selectedSlot} onSelect={chooseSlot} />

          {selectedSlot && practitioner && (
            <>
              <h2>
                <span className="step">3</span> Vos coordonnées
              </h2>
              <BookingForm key={selectedSlot} practitioner={practitioner} start={selectedSlot} onBooked={handleBooked} />
            </>
          )}
        </section>

        <aside className="panel agenda-panel">
          <h2>Agenda du jour</h2>
          <p className="muted">
            {practitioner ? practitioner.name : '…'} · {formatLongDate(day)}
          </p>
          <Agenda appointments={appointments} onCancel={handleCancel} />
          <p className="hint">Vue du secrétariat : elle permet d'annuler un rendez-vous et de libérer le créneau.</p>
        </aside>
      </main>

      <footer className="site-footer">
        Projet de démonstration · données fictives · API Python (FastAPI) et interface TypeScript (React)
      </footer>
    </>
  )
}
