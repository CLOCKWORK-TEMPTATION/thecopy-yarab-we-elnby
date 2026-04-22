from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import select

from app.core.database import session_scope
from app.core.deps import DBSession
from app.models import Scene, ShootingDay
from app.schemas import AsyncJobAccepted, AsyncJobData, ContinuityReportRequest, DailiesQARequest
from app.services.continuity_service import build_continuity_report, build_dailies_report
from app.services.workflow_service import create_workflow, log_event, update_workflow_status

router = APIRouter(tags=["continuity"])


def _accepted(workflow_id: str, job_type: str) -> AsyncJobAccepted:
    return AsyncJobAccepted(
        data=AsyncJobData(
            workflow_id=workflow_id,
            job_type=job_type,
            status="queued",
            status_url=f"/api/v1/workflows/{workflow_id}",
            events_url=f"/api/v1/workflows/{workflow_id}/events",
        )
    )



def _continuity_task(workflow_id: str, scene_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Building continuity report")
        report = build_continuity_report(db, scene_id, include_resolution_hints=payload.get("include_resolution_hints", True))
        log_event(db, workflow_id, "continuity.ready", "Continuity report generated", {"scene_id": scene_id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json=report,
            message="Continuity report completed",
        )



def _dailies_task(workflow_id: str, shooting_day_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Building dailies report")
        report = build_dailies_report(db, shooting_day_id, mode=payload.get("mode", "coverage"))
        log_event(db, workflow_id, "dailies.ready", "Dailies QA report generated", {"shooting_day_id": shooting_day_id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json=report,
            message="Dailies QA completed",
        )


@router.post("/scenes/{scene_id}:continuity-report", response_model=AsyncJobAccepted, status_code=202)
def create_continuity_report(
    scene_id: str,
    payload: ContinuityReportRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one_or_none()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    workflow = create_workflow(db, project_id=scene.project_id, workflow_type="continuity_report", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_continuity_task, workflow.id, scene_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "continuity_report")


@router.post("/shooting-days/{shooting_day_id}:dailies-qa", response_model=AsyncJobAccepted, status_code=202)
def create_dailies_report(
    shooting_day_id: str,
    payload: DailiesQARequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    day = db.execute(select(ShootingDay).where(ShootingDay.id == shooting_day_id)).scalar_one_or_none()
    if day is None:
        raise HTTPException(status_code=404, detail="Shooting day not found")
    workflow = create_workflow(db, project_id=day.project_id, workflow_type="dailies_qa", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_dailies_task, workflow.id, shooting_day_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "dailies_qa")
