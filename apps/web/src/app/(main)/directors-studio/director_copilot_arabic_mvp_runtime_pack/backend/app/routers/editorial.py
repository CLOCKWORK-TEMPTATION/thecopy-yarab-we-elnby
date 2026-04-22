from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import select

from app.core.database import session_scope
from app.core.deps import DBSession
from app.models import Asset, AssetVersion, Project, ProvenanceRecord
from app.schemas import (
    AsyncJobAccepted,
    AsyncJobData,
    EditorialExportRequest,
    ProvenanceData,
    ProvenanceEnvelope,
    ProvenanceVerifyRequest,
)
from app.services.editorial_service import create_editorial_export
from app.services.workflow_service import create_workflow, log_event, update_workflow_status

router = APIRouter(tags=["editorial"])


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



def _editorial_export_task(workflow_id: str, project_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Generating editorial export")
        export = create_editorial_export(
            db,
            project_id=project_id,
            scope=payload.get("scope", "project"),
            shooting_day_id=payload.get("shooting_day_id"),
            scene_id=payload.get("scene_id"),
            episode_id=payload.get("episode_id"),
        )
        log_event(db, workflow_id, "editorial.ready", "Editorial export generated", {"editorial_export_id": export.id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"editorial_export_id": export.id, "asset_id": export.asset_id},
            message="Editorial export completed",
        )


@router.post("/projects/{project_id}/editorial-exports:otio", response_model=AsyncJobAccepted, status_code=202)
def create_editorial_export_endpoint(
    project_id: str,
    payload: EditorialExportRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    workflow = create_workflow(db, project_id=project_id, workflow_type="editorial_export", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_editorial_export_task, workflow.id, project_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "editorial_export")


@router.post("/assets/{asset_id}:verify-provenance", response_model=ProvenanceEnvelope)
def verify_provenance(asset_id: str, payload: ProvenanceVerifyRequest, db: DBSession) -> ProvenanceEnvelope:
    asset = db.execute(select(Asset).where(Asset.id == asset_id)).scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset_version = db.execute(select(AssetVersion).where(AssetVersion.id == str(payload.asset_version_id))).scalar_one_or_none()
    if asset_version is None:
        raise HTTPException(status_code=404, detail="Asset version not found")

    provenance = db.execute(
        select(ProvenanceRecord).where(ProvenanceRecord.asset_version_id == asset_version.id)
    ).scalar_one_or_none()
    if provenance is None:
        provenance = ProvenanceRecord(
            asset_version_id=asset_version.id,
            manifest_uri=None,
            provenance_json={"strict": payload.strict, "note": "No external manifest linked in MVP."},
            verification_status="not_available",
            verified_at=datetime.now(timezone.utc),
        )
        db.add(provenance)
        db.commit()
        db.refresh(provenance)

    return ProvenanceEnvelope(
        data=ProvenanceData(
            asset_version_id=asset_version.id,
            verification_status=provenance.verification_status,
            manifest_uri=provenance.manifest_uri,
        )
    )
