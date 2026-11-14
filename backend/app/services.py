"""Règles métier du cabinet : heures d'ouverture, créneaux, réservation et annulation.

Ce fichier ne connaît rien du web : il reçoit des données, applique les règles
et lève une BookingError quand une règle n'est pas respectée.
"""
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import Appointment, Practitioner
from .schemas import AppointmentCreate

SLOT_MINUTES = 30
# Le cabinet est ouvert du lundi au vendredi, le matin et l'après-midi.
OPENING_PERIODS = [(time(9, 0), time(12, 0)), (time(13, 0), time(17, 0))]


class BookingError(Exception):
    """Règle métier non respectée, avec le code HTTP à renvoyer au client."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def is_open_day(day: date) -> bool:
    return day.weekday() < 5  # 0 = lundi, 4 = vendredi


def day_slots(day: date) -> list[datetime]:
    """Renvoie le début de chaque créneau de la journée, dans l'ordre."""
    if not is_open_day(day):
        return []
    slots = []
    for opening, closing in OPENING_PERIODS:
        current = datetime.combine(day, opening)
        end = datetime.combine(day, closing)
        while current + timedelta(minutes=SLOT_MINUTES) <= end:
            slots.append(current)
            current += timedelta(minutes=SLOT_MINUTES)
    return slots


def get_practitioner(db: Session, practitioner_id: int) -> Practitioner:
    practitioner = db.get(Practitioner, practitioner_id)
    if practitioner is None:
        raise BookingError("Praticien introuvable.", 404)
    return practitioner


def list_practitioners(db: Session) -> list[Practitioner]:
    return list(db.scalars(select(Practitioner).order_by(Practitioner.id)))


def booked_appointments(db: Session, practitioner_id: int, day: date) -> list[Appointment]:
    """Rendez-vous encore actifs d'un praticien pour une journée, triés par heure."""
    start_of_day = datetime.combine(day, time.min)
    end_of_day = start_of_day + timedelta(days=1)
    query = (
        select(Appointment)
        .where(
            Appointment.practitioner_id == practitioner_id,
            Appointment.status == "booked",
            Appointment.start >= start_of_day,
            Appointment.start < end_of_day,
        )
        .order_by(Appointment.start)
    )
    return list(db.scalars(query))


def list_slots(db: Session, practitioner_id: int, day: date) -> list[dict]:
    """Tous les créneaux de la journée, avec leur disponibilité."""
    get_practitioner(db, practitioner_id)
    taken = {appointment.start for appointment in booked_appointments(db, practitioner_id, day)}
    now = datetime.now()
    return [{"start": slot, "available": slot not in taken and slot > now} for slot in day_slots(day)]


def list_appointments(db: Session, practitioner_id: int, day: date) -> list[Appointment]:
    get_practitioner(db, practitioner_id)
    return booked_appointments(db, practitioner_id, day)


def book(db: Session, data: AppointmentCreate) -> Appointment:
    start = data.start
    if start.tzinfo is not None:
        # Heure envoyée avec un fuseau : on la convertit en heure locale du cabinet.
        start = start.astimezone().replace(tzinfo=None)

    get_practitioner(db, data.practitioner_id)

    if start not in day_slots(start.date()):
        raise BookingError(
            "Ce créneau ne correspond pas aux heures d'ouverture "
            "(du lundi au vendredi, de 9 h à 12 h et de 13 h à 17 h, par tranches de 30 minutes)."
        )
    if start <= datetime.now():
        raise BookingError("Impossible de réserver un créneau déjà passé.")
    taken = {appointment.start for appointment in booked_appointments(db, data.practitioner_id, start.date())}
    if start in taken:
        raise BookingError("Ce créneau est déjà réservé.", 409)

    appointment = Appointment(
        practitioner_id=data.practitioner_id,
        patient_name=data.patient_name,
        patient_email=str(data.patient_email),
        start=start,
    )
    db.add(appointment)
    try:
        db.commit()
    except IntegrityError:
        # Deux réservations simultanées : l'index unique de la base a refusé la seconde.
        db.rollback()
        raise BookingError("Ce créneau est déjà réservé.", 409) from None
    db.refresh(appointment)
    return appointment


def cancel(db: Session, appointment_id: int) -> None:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise BookingError("Rendez-vous introuvable.", 404)
    if appointment.status == "cancelled":
        raise BookingError("Ce rendez-vous est déjà annulé.", 409)
    appointment.status = "cancelled"
    db.commit()
