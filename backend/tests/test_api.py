"""Tests de l'API : chaque règle métier du cabinet est vérifiée automatiquement."""
from datetime import date, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models import Appointment


def next_monday() -> date:
    """Un lundi dans le futur (au moins une semaine plus tard), pour des tests stables."""
    day = date.today() + timedelta(days=7)
    return day + timedelta(days=(7 - day.weekday()) % 7)


def booking(start: str, practitioner_id: int = 1, **extra) -> dict:
    data = {
        "practitioner_id": practitioner_id,
        "patient_name": "Lina Janssens",
        "patient_email": "lina@example.com",
        "start": start,
    }
    data.update(extra)
    return data


def test_lists_the_practitioners(client):
    response = client.get("/api/practitioners")
    assert response.status_code == 200
    assert [p["name"] for p in response.json()] == ["Dr Claire Dumont", "Dr Karim Haddad", "Sofia Peeters"]


def test_an_open_day_has_14_slots_of_30_minutes(client):
    slots = client.get(f"/api/practitioners/1/slots?day={next_monday()}").json()
    starts = [slot["start"][11:16] for slot in slots]
    assert len(slots) == 14
    assert starts[:2] == ["09:00", "09:30"]
    assert "12:00" not in starts and "12:30" not in starts  # pause de midi
    assert starts[-1] == "16:30"
    assert all(slot["available"] for slot in slots)


def test_no_slots_on_weekends(client):
    saturday = next_monday() + timedelta(days=5)
    assert client.get(f"/api/practitioners/1/slots?day={saturday}").json() == []


def test_booking_a_slot_makes_it_unavailable(client):
    day = next_monday()
    response = client.post("/api/appointments", json=booking(f"{day}T09:30:00"))
    assert response.status_code == 201
    assert response.json()["status"] == "booked"

    slots = client.get(f"/api/practitioners/1/slots?day={day}").json()
    taken = [slot["start"][11:16] for slot in slots if not slot["available"]]
    assert taken == ["09:30"]


def test_the_same_slot_cannot_be_booked_twice(client):
    start = f"{next_monday()}T10:00:00"
    client.post("/api/appointments", json=booking(start))
    response = client.post("/api/appointments", json=booking(start, patient_name="Autre patient"))
    assert response.status_code == 409
    assert response.json()["detail"] == "Ce créneau est déjà réservé."


def test_two_practitioners_can_have_the_same_time(client):
    start = f"{next_monday()}T10:00:00"
    assert client.post("/api/appointments", json=booking(start, practitioner_id=1)).status_code == 201
    assert client.post("/api/appointments", json=booking(start, practitioner_id=2)).status_code == 201


@pytest.mark.parametrize("hour", ["08:30", "12:00", "12:30", "17:00", "09:15"])
def test_outside_opening_hours_is_refused(client, hour):
    response = client.post("/api/appointments", json=booking(f"{next_monday()}T{hour}:00"))
    assert response.status_code == 400
    assert "heures d'ouverture" in response.json()["detail"]


def test_weekends_are_refused(client):
    sunday = next_monday() + timedelta(days=6)
    response = client.post("/api/appointments", json=booking(f"{sunday}T10:00:00"))
    assert response.status_code == 400


def test_past_slots_are_refused(client):
    response = client.post("/api/appointments", json=booking("2020-01-06T09:00:00"))  # un lundi passé
    assert response.status_code == 400
    assert "passé" in response.json()["detail"]


def test_invalid_email_is_refused(client):
    response = client.post("/api/appointments", json=booking(f"{next_monday()}T09:00:00", patient_email="pas-un-email"))
    assert response.status_code == 422


def test_too_short_name_is_refused(client):
    response = client.post("/api/appointments", json=booking(f"{next_monday()}T09:00:00", patient_name=" A "))
    assert response.status_code == 422


def test_unknown_practitioner(client):
    assert client.get(f"/api/practitioners/99/slots?day={next_monday()}").status_code == 404
    response = client.post("/api/appointments", json=booking(f"{next_monday()}T09:00:00", practitioner_id=99))
    assert response.status_code == 404


def test_cancelling_frees_the_slot(client):
    start = f"{next_monday()}T11:00:00"
    appointment_id = client.post("/api/appointments", json=booking(start)).json()["id"]

    assert client.delete(f"/api/appointments/{appointment_id}").status_code == 204
    # Le créneau est de nouveau libre et peut être réservé par quelqu'un d'autre.
    assert client.post("/api/appointments", json=booking(start, patient_name="Nouveau patient")).status_code == 201


def test_cancelling_twice_or_unknown_appointment(client):
    appointment_id = client.post("/api/appointments", json=booking(f"{next_monday()}T11:30:00")).json()["id"]
    client.delete(f"/api/appointments/{appointment_id}")
    assert client.delete(f"/api/appointments/{appointment_id}").status_code == 409
    assert client.delete("/api/appointments/999").status_code == 404


def test_list_shows_only_active_appointments_of_the_day(client):
    day = next_monday()
    first = client.post("/api/appointments", json=booking(f"{day}T14:00:00")).json()
    client.post("/api/appointments", json=booking(f"{day}T13:00:00"))
    client.post("/api/appointments", json=booking(f"{day + timedelta(days=1)}T13:00:00"))  # autre jour
    client.delete(f"/api/appointments/{first['id']}")

    appointments = client.get(f"/api/appointments?practitioner_id=1&day={day}").json()
    assert [a["start"][11:16] for a in appointments] == ["13:00"]


def test_the_database_itself_blocks_double_booking(client):
    """Même en contournant l'API, l'index unique empêche deux rendez-vous actifs sur un créneau."""
    start = datetime.combine(next_monday(), datetime.min.time()).replace(hour=15)
    with SessionLocal() as db:
        db.add(Appointment(practitioner_id=1, patient_name="A", patient_email="a@example.com", start=start))
        db.commit()
        db.add(Appointment(practitioner_id=1, patient_name="B", patient_email="b@example.com", start=start))
        with pytest.raises(IntegrityError):
            db.commit()
