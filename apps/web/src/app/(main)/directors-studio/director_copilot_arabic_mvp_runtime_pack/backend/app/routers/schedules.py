from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import select

from app.core.database import session_scope
from app.core.deps import DBSession
from app.models import CallSheet, Project, ScheduleVersion, ShootingDay
from app.schemas import (
    AsyncJobAccepted,
    AsyncJobData,
    CallSheetGenerateRequest,
    CallSheetData,
    EnvelopeCallSheet,
    EnvelopeScheduleVersion,
    ScheduleGenerateRequest,
    ScheduleVersionData,
)
from app.services.schedule_service import generate_call_sheet, generate_schedule
from app.services.workflow_service import create_workflow, log_event, update_workflow_status

router = APIRouter(tags=["schedules"])


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


def _schedule_task(workflow_id: str, project_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Generating schedule version")
        schedule, shooting_days, entries = generate_schedule(db, project_id, payload.get("constraints"))
        log_event(db, workflow_id, "schedule.ready", "Schedule generated", {"schedule_version_id": schedule.id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={
                "schedule_version_id": schedule.id,
                "shooting_day_ids": [day.id for day in shooting_days],
                "entry_count": len(entries),
            },
            message="Schedule generation completed",
        )



def _call_sheet_task(workflow_id: str, project_id: str, shooting_day_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Generating call sheet")
        call_sheet, items = generate_call_sheet(db, project_id, shooting_day_id, payload["schedule_version_id"])
        log_event(db, workflow_id, "callsheet.ready", "Call sheet generated", {"call_sheet_id": call_sheet.id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"call_sheet_id": call_sheet.id, "item_count": len(items)},
            message="Call sheet generation completed",
        )


@router.post("/projects/{project_id}/schedules:generate", response_model=AsyncJobAccepted, status_code=202)
def create_schedule(
    project_id: str,
    payload: ScheduleGenerateRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    workflow = create_workflow(db, project_id=project_id, workflow_type="schedule_generate", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_schedule_task, workflow.id, project_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "schedule_generate")


@router.post("/shooting-days/{shooting_day_id}/call-sheets:generate", response_model=AsyncJobAccepted, status_code=202)
def create_call_sheet(
    shooting_day_id: str,
    payload: CallSheetGenerateRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    shooting_day = db.execute(select(ShootingDay).where(ShootingDay.id == shooting_day_id)).scalar_one_or_none()
    if shooting_day is None:
        raise HTTPException(status_code=404, detail="Shooting day not found")
    workflow = create_workflow(db, project_id=shooting_day.project_id, workflow_type="call_sheet_generate", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_call_sheet_task, workflow.id, shooting_day.project_id, shooting_day_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "call_sheet_generate")


@router.get("/schedule-versions/{schedule_version_id}", response_model=EnvelopeScheduleVersion)
def get_schedule_version(schedule_version_id: str, db: DBSession) -> EnvelopeScheduleVersion:
    schedule = db.execute(select(ScheduleVersion).where(ScheduleVersion.id == schedule_version_id)).scalar_one_or_none()
    if schedule is None:
        raise HTTPException(status_code=404, detail="Schedule version not found")
    return EnvelopeScheduleVersion(data=ScheduleVersionData.model_validate(schedule))


@router.get("/call-sheets/{call_sheet_id}", response_model=EnvelopeCallSheet)
def get_call_sheet(call_sheet_id: str, db: DBSession) -> EnvelopeCallSheet:
    call_sheet = db.execute(select(CallSheet).where(CallSheet.id == call_sheet_id)).scalar_one_or_none()
    if call_sheet is None:
        raise HTTPException(status_code=404, detail="Call sheet not found")
    return EnvelopeCallSheet(data=CallSheetData.model_validate(call_sheet))
