"""Point d'entrée de l'API : les routes HTTP, qui délèguent le travail à services.py."""
from contextlib import asynccontextmanager
from datetime import date
from typing import Annotated

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import services
from .database import Base, SessionLocal, engine, get_db
from .schemas import AppointmentCreate, AppointmentOut, PractitionerOut, SlotOut
from .seed import seed_practitioners


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Au démarrage : crée les tables si besoin et ajoute les praticiens.
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_practitioners(db)
    yield


app = FastAPI(
    title="Clinic Booking API",
    description="API de prise de rendez-vous pour un cabinet médical fictif.",
    version="1.0.0",
    lifespan=lifespan,
)

# Autorise l'interface React (serveur de développement Vite) à appeler l'API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DbSession = Annotated[Session, Depends(get_db)]


@app.exception_handler(services.BookingError)
async def booking_error_handler(request: Request, exc: services.BookingError) -> JSONResponse:
    """Transforme une règle métier non respectée en réponse JSON claire."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.get("/api/practitioners", response_model=list[PractitionerOut])
def list_practitioners(db: DbSession):
    return services.list_practitioners(db)


@app.get("/api/practitioners/{practitioner_id}/slots", response_model=list[SlotOut])
def list_slots(practitioner_id: int, day: date, db: DbSession):
    return services.list_slots(db, practitioner_id, day)


@app.get("/api/appointments", response_model=list[AppointmentOut])
def list_appointments(practitioner_id: int, day: date, db: DbSession):
    return services.list_appointments(db, practitioner_id, day)


@app.post("/api/appointments", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(data: AppointmentCreate, db: DbSession):
    return services.book(db, data)


@app.delete("/api/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_appointment(appointment_id: int, db: DbSession):
    services.cancel(db, appointment_id)
