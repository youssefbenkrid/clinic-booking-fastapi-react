"""Modèles SQLAlchemy : chaque classe correspond à une table de la base."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Practitioner(Base):
    __tablename__ = "practitioners"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    specialty: Mapped[str] = mapped_column(String(80))

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="practitioner")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    practitioner_id: Mapped[int] = mapped_column(ForeignKey("practitioners.id"))
    patient_name: Mapped[str] = mapped_column(String(80))
    patient_email: Mapped[str] = mapped_column(String(120))
    start: Mapped[datetime] = mapped_column(DateTime)
    # "booked" (réservé) ou "cancelled" (annulé) : on garde l'historique au lieu de supprimer.
    status: Mapped[str] = mapped_column(String(10), default="booked")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    practitioner: Mapped[Practitioner] = relationship(back_populates="appointments")

    __table_args__ = (
        # Garde-fou dans la base elle-même : un seul rendez-vous actif par praticien et par créneau,
        # même si deux personnes réservent exactement au même moment.
        Index(
            "uq_active_slot",
            "practitioner_id",
            "start",
            unique=True,
            sqlite_where=text("status = 'booked'"),
        ),
    )
