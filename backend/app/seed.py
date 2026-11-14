"""Données de départ : les praticiens (fictifs) du cabinet."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Practitioner

PRACTITIONERS = [
    ("Dr Claire Dumont", "Médecine générale"),
    ("Dr Karim Haddad", "Pédiatrie"),
    ("Sofia Peeters", "Kinésithérapie"),
]


def seed_practitioners(db: Session) -> None:
    """Ajoute les praticiens si la table est encore vide."""
    if db.scalar(select(func.count()).select_from(Practitioner)) == 0:
        db.add_all(Practitioner(name=name, specialty=specialty) for name, specialty in PRACTITIONERS)
        db.commit()
