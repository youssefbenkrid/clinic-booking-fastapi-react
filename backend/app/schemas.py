"""Schémas Pydantic : la forme des données qui entrent dans l'API et qui en sortent."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PractitionerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    specialty: str


class SlotOut(BaseModel):
    start: datetime
    available: bool


class AppointmentCreate(BaseModel):
    # Supprime les espaces en trop au début et à la fin des textes envoyés.
    model_config = ConfigDict(str_strip_whitespace=True)

    practitioner_id: int
    patient_name: str = Field(min_length=2, max_length=80)
    patient_email: EmailStr
    start: datetime


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    practitioner_id: int
    patient_name: str
    patient_email: str
    start: datetime
    status: str
