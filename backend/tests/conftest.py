"""Préparation des tests : une base SQLite séparée, remise à zéro avant chaque test."""
import os
import tempfile

# À faire AVANT d'importer l'application : les tests ne doivent jamais toucher clinic.db.
os.environ["DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.mkdtemp(), "test.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_practitioners  # noqa: E402


@pytest.fixture
def client():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_practitioners(db)
    with TestClient(app) as test_client:
        yield test_client
