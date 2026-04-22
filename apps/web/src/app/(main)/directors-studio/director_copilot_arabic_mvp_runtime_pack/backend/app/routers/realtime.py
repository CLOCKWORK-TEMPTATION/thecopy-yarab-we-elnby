from __future__ import annotations

from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import DBSession
from app.models import Project, RealtimeSession
from app.schemas import RealtimeSessionCreateRequest, RealtimeSessionData, RealtimeSessionEnvelope

router = APIRouter(tags=["realtime"])


@router.post("/realtime/sessions", response_model=RealtimeSessionEnvelope, status_code=201)
def create_realtime_session(payload: RealtimeSessionCreateRequest, db: DBSession) -> RealtimeSessionEnvelope:
    project = db.execute(select(Project).where(Project.id == str(payload.project_id))).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
    session = RealtimeSession(
        project_id=str(payload.project_id),
        scene_id=str(payload.scene_id) if payload.scene_id else None,
        mode=payload.mode,
        language_code=payload.language_code,
        input_modalities_json=payload.input_modalities,
        output_modalities_json=payload.output_modalities,
        provider_preference=payload.provider_preference,
        client_token=token_urlsafe(24),
        transport="ws",
        expires_at=expires_at,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    data = RealtimeSessionData(
        id=session.id,
        project_id=session.project_id,
        scene_id=session.scene_id,
        mode=session.mode,
        language_code=session.language_code,
        provider_preference=session.provider_preference,
        transport="ws",
        client_token=session.client_token,
        session_url=f"/api/v1/realtime/connect/{session.id}",
        expires_at=session.expires_at,
    )
    return RealtimeSessionEnvelope(data=data)
