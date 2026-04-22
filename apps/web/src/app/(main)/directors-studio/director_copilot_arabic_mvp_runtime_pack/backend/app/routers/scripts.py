from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select

from app.core.database import session_scope
from app.core.deps import DBSession
from app.models import Asset, AssetVersion, Project, Scene, Script, ScriptVersion
from app.schemas import (
    AsyncJobAccepted,
    AsyncJobData,
    EnvelopeScript,
    EnvelopeScriptVersion,
    ScriptData,
    ScriptParseRequest,
    ScriptVersionData,
)
from app.services.script_parser import normalize_text, split_into_scenes
from app.services.storage import read_text_from_path, save_upload_file
from app.services.workflow_service import create_workflow, log_event, update_workflow_status

router = APIRouter(tags=["scripts"])


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


def _parse_script_version_task(workflow_id: str, script_version_id: str, request_payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Parsing script version")
        script_version = db.execute(select(ScriptVersion).where(ScriptVersion.id == script_version_id)).scalar_one()
        existing_scenes = db.execute(select(Scene).where(Scene.script_version_id == script_version_id)).scalars().all()
        for scene in existing_scenes:
            db.delete(scene)
        db.flush()

        scenes = split_into_scenes(script_version.normalized_text or script_version.raw_text or "")
        created_ids: list[str] = []
        for parsed_scene in scenes:
            scene = Scene(
                project_id=db.execute(select(Script).where(Script.id == script_version.script_id)).scalar_one().project_id,
                script_version_id=script_version.id,
                stable_scene_key=parsed_scene.stable_scene_key,
                script_scene_number=parsed_scene.script_scene_number,
                order_index=parsed_scene.order_index,
                slugline=parsed_scene.slugline,
                int_ext=parsed_scene.int_ext,
                time_of_day=parsed_scene.time_of_day,
                primary_location=parsed_scene.primary_location,
                summary=parsed_scene.summary,
                scene_text=parsed_scene.scene_text,
                dialogue_text=parsed_scene.dialogue_text,
                metadata_json=parsed_scene.metadata_json,
            )
            db.add(scene)
            db.flush()
            created_ids.append(scene.id)

        script_version.parsed_json = {
            "scene_count": len(created_ids),
            "request": request_payload,
            "scene_ids": created_ids,
        }
        db.add(script_version)
        log_event(db, workflow_id, "script.parsed", "Scenes generated from script version", {"scene_count": len(created_ids)})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"script_version_id": script_version.id, "scene_count": len(created_ids), "scene_ids": created_ids},
            message="Script parsing completed successfully",
        )


@router.post("/projects/{project_id}/scripts:upload", response_model=AsyncJobAccepted, status_code=202)
async def upload_script(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: DBSession,
    file: UploadFile = File(...),
    episode_id: str | None = Form(None),
    label: str | None = Form(None),
    parse_now: bool = Form(True),
) -> AsyncJobAccepted:
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    file_meta = await save_upload_file(project_id, file)
    asset = Asset(
        project_id=project_id,
        storage_uri=str(file_meta["storage_uri"]),
        asset_media_type=str(file_meta["asset_media_type"]),
        mime_type=str(file_meta["mime_type"]),
        source_kind="uploaded",
        checksum_sha256=str(file_meta["checksum_sha256"]),
        byte_size=int(file_meta["byte_size"]),
    )
    db.add(asset)
    db.flush()

    asset_version = AssetVersion(
        asset_id=asset.id,
        version_no=1,
        storage_uri=asset.storage_uri,
        checksum_sha256=asset.checksum_sha256,
    )
    db.add(asset_version)
    db.flush()

    text = read_text_from_path(asset.storage_uri)
    normalized = normalize_text(text)

    script = Script(
        project_id=project_id,
        episode_id=episode_id,
        canonical_name=file.filename or "script",
    )
    db.add(script)
    db.flush()

    script_version = ScriptVersion(
        script_id=script.id,
        version_no=1,
        label=label,
        source_asset_id=asset.id,
        raw_text=text,
        normalized_text=normalized,
        hash_sha256=str(file_meta["checksum_sha256"]),
    )
    db.add(script_version)
    db.flush()

    script.current_version_id = script_version.id
    db.add(script)
    db.commit()
    db.refresh(script)
    db.refresh(script_version)

    workflow_type = "script_ingest_and_parse" if parse_now else "script_ingest"
    workflow = create_workflow(
        db,
        project_id=project_id,
        workflow_type=workflow_type,
        input_json={"script_id": script.id, "script_version_id": script_version.id, "filename": file.filename},
    )

    if parse_now:
        background_tasks.add_task(_parse_script_version_task, workflow.id, script_version.id, {"mode": "single_script"})
    else:
        update_workflow_status(
            db,
            workflow.id,
            status="succeeded",
            output_json={"script_id": script.id, "script_version_id": script_version.id},
            message="Script uploaded successfully",
        )

    return _accepted(workflow.id, workflow_type)


@router.post("/script-versions/{script_version_id}:parse", response_model=AsyncJobAccepted, status_code=202)
def parse_script_version(
    script_version_id: str,
    payload: ScriptParseRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    script_version = db.execute(select(ScriptVersion).where(ScriptVersion.id == script_version_id)).scalar_one_or_none()
    if script_version is None:
        raise HTTPException(status_code=404, detail="Script version not found")
    script = db.execute(select(Script).where(Script.id == script_version.script_id)).scalar_one()
    workflow = create_workflow(
        db,
        project_id=script.project_id,
        workflow_type="script_parse",
        input_json={"script_version_id": script_version_id, **payload.model_dump()},
    )
    background_tasks.add_task(_parse_script_version_task, workflow.id, script_version_id, payload.model_dump())
    return _accepted(workflow.id, "script_parse")


@router.get("/scripts/{script_id}", response_model=EnvelopeScript)
def get_script(script_id: str, db: DBSession) -> EnvelopeScript:
    script = db.execute(select(Script).where(Script.id == script_id)).scalar_one_or_none()
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return EnvelopeScript(data=ScriptData.model_validate(script))


@router.get("/script-versions/{script_version_id}", response_model=EnvelopeScriptVersion)
def get_script_version(script_version_id: str, db: DBSession) -> EnvelopeScriptVersion:
    version = db.execute(select(ScriptVersion).where(ScriptVersion.id == script_version_id)).scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="Script version not found")
    return EnvelopeScriptVersion(data=ScriptVersionData.model_validate(version))
