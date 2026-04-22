from __future__ import annotations

from contextlib import contextmanager
from typing import Generator
from uuid import uuid4

from sqlalchemy import Engine, event, select
from sqlalchemy.engine import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _build_engine() -> Engine:
    connect_args: dict[str, object] = {}
    if settings.database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    engine = create_engine(settings.database_url, future=True, pool_pre_ping=True, connect_args=connect_args)

    if settings.database_url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore[no-redef]
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401
    from app.models import Organization, Workspace

    Base.metadata.create_all(bind=engine)

    with session_scope() as db:
        org = db.execute(
            select(Organization).where(Organization.slug == settings.default_organization_slug)
        ).scalar_one_or_none()
        if org is None:
            org = Organization(
                id=str(uuid4()),
                name=settings.default_organization_name,
                slug=settings.default_organization_slug,
            )
            db.add(org)
            db.flush()

        ws = db.execute(
            select(Workspace).where(
                Workspace.organization_id == org.id,
                Workspace.slug == settings.default_workspace_slug,
            )
        ).scalar_one_or_none()
        if ws is None:
            ws = Workspace(
                id=str(uuid4()),
                organization_id=org.id,
                name=settings.default_workspace_name,
                slug=settings.default_workspace_slug,
                default_locale=settings.default_locale,
                default_timezone=settings.default_timezone,
            )
            db.add(ws)
            db.flush()
