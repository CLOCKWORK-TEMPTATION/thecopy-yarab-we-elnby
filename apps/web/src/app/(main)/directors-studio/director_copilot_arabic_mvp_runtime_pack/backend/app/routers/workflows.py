from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import DBSession
from app.models import WorkflowEvent, WorkflowRun
from app.schemas import WorkflowEventData, WorkflowEventsEnvelope, WorkflowStatusData, WorkflowStatusEnvelope

router = APIRouter(tags=["workflows"])


@router.get("/workflows/{workflow_id}", response_model=WorkflowStatusEnvelope)
def get_workflow(workflow_id: str, db: DBSession) -> WorkflowStatusEnvelope:
    workflow = db.execute(select(WorkflowRun).where(WorkflowRun.id == workflow_id)).scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowStatusEnvelope(data=WorkflowStatusData.model_validate(workflow))


@router.get("/workflows/{workflow_id}/events", response_model=WorkflowEventsEnvelope)
def get_workflow_events(workflow_id: str, db: DBSession) -> WorkflowEventsEnvelope:
    workflow = db.execute(select(WorkflowRun).where(WorkflowRun.id == workflow_id)).scalar_one_or_none()
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    events = db.execute(
        select(WorkflowEvent).where(WorkflowEvent.workflow_run_id == workflow_id).order_by(WorkflowEvent.created_at.asc())
    ).scalars().all()
    return WorkflowEventsEnvelope(data=[WorkflowEventData.model_validate(event) for event in events])
