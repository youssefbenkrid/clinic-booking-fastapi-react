"""Connexion à la base SQLite et création des sessions SQLAlchemy."""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Par défaut, la base est un simple fichier clinic.db créé à côté du code.
# Les tests utilisent une autre base grâce à la variable d'environnement DATABASE_URL.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./clinic.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Classe mère de tous les modèles (tables) de l'application."""


def get_db():
    """Dépendance FastAPI : ouvre une session pour chaque requête, puis la referme."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
