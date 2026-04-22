from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import WorkflowEvent, WorkflowRun


def create_workflow(
    db: Session,
    *,
    project_id: str,
    workflow_type: str,
    input_json: dict[str, Any] | None = None,
    started_by_user_id: str | None = None,
) -> WorkflowRun:
    workflow = WorkflowRun(
        id=str(uuid4()),
        project_id=project_id,
        workflow_type=workflow_type,
        status="queued",
        input_json=input_json or {},
        output_json={},
        error_json={},
        started_by_user_id=started_by_user_id,
    )
    db.add(workflow)
    db.flush()
    log_event(db, workflow.id, "workflow.queued", f"Workflow {workflow_type} queued", workflow.input_json)
    db.commit()
    db.refresh(workflow)
    return workflow


def log_event(db: Session, workflow_id: str, event_type: str, message: str, payload: dict[str, Any] | None = None) -> None:
    event = WorkflowEvent(
        id=str(uuid4()),
        workflow_run_id=workflow_id,
        event_type=event_type,
        message=message,
        payload_json=payload or {},
    )
    db.add(event)
    db.flush()


def update_workflow_status(
    db: Session,
    workflow_id: str,
    *,
    status: str,
    output_json: dict[str, Any] | None = None,
    error_json: dict[str, Any] | None = None,
    message: str | None = None,
) -> WorkflowRun:
    workflow = db.execute(select(WorkflowRun).where(WorkflowRun.id == workflow_id)).scalar_one()
    workflow.status = status
    if output_json is not None:
        workflow.output_json = output_json
    if error_json is not None:
        workflow.error_json = error_json
    if status in {"succeeded", "failed", "cancelled"}:
        workflow.finished_at = datetime.now(timezone.utc)
    log_event(
        db,
        workflow_id,
        f"workflow.{status}",
        message or f"Workflow status updated to {status}",
        output_json or error_json or {},
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow
