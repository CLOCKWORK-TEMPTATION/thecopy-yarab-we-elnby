from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import select

from app.core.database import session_scope
from app.core.deps import DBSession
from app.models import (
    Project,
    Scene,
    SceneBreakdown,
    Shot,
    Shotlist,
    Storyboard,
    StoryboardFrame,
    VisualBible,
)
from app.schemas import (
    AsyncJobAccepted,
    AsyncJobData,
    EnvelopeScene,
    EnvelopeSceneBreakdown,
    EnvelopeScenes,
    SceneBreakdownData,
    SceneBreakdownRequest,
    SceneData,
    ShotlistGenerateRequest,
    StoryboardGenerateRequest,
    VisualBibleGenerateRequest,
    PrevisGenerateRequest,
)
from app.services.continuity_service import build_continuity_report
from app.services.creative_service import generate_previs_plan, generate_shotlist, generate_storyboard, generate_visual_bible
from app.services.script_parser import generate_breakdown
from app.services.workflow_service import create_workflow, log_event, update_workflow_status

router = APIRouter(tags=["scenes"])


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


def _scene_breakdown_task(workflow_id: str, scene_id: str, request_payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Generating scene breakdown")
        scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one()
        breakdown_payload = generate_breakdown(scene.scene_text or "", scene.summary)
        breakdown = db.execute(select(SceneBreakdown).where(SceneBreakdown.scene_id == scene_id)).scalar_one_or_none()
        if breakdown is None:
            breakdown = SceneBreakdown(scene_id=scene_id, **breakdown_payload)
            db.add(breakdown)
        else:
            for key, value in breakdown_payload.items():
                setattr(breakdown, key, value)
            db.add(breakdown)
        db.flush()
        log_event(db, workflow_id, "scene.breakdown_ready", "Scene breakdown created", {"scene_id": scene_id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"scene_id": scene_id, "breakdown_id": breakdown.id, "request": request_payload},
            message="Scene breakdown completed",
        )


def _visual_bible_task(workflow_id: str, project_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Generating visual bible")
        visual_bible = generate_visual_bible(
            db,
            project_id=project_id,
            episode_id=payload.get("episode_id"),
            style_intent=payload.get("style_intent"),
            output_depth=payload.get("output_depth", "standard"),
        )
        log_event(db, workflow_id, "visual_bible.ready", "Visual bible generated", {"visual_bible_id": visual_bible.id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"visual_bible_id": visual_bible.id, "project_id": project_id},
            message="Visual bible generation completed",
        )


def _storyboard_task(workflow_id: str, scene_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Generating storyboard")
        storyboard = generate_storyboard(
            db,
            scene_id=scene_id,
            source_visual_bible_id=payload.get("source_visual_bible_id"),
            frame_count_hint=payload.get("frame_count_hint", 8),
        )
        frame_count = len(db.execute(select(StoryboardFrame).where(StoryboardFrame.storyboard_id == storyboard.id)).scalars().all())
        log_event(db, workflow_id, "storyboard.ready", "Storyboard generated", {"storyboard_id": storyboard.id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"storyboard_id": storyboard.id, "scene_id": scene_id, "frame_count_hint": payload.get("frame_count_hint", 8), "frame_count": frame_count},
            message="Storyboard generation completed",
        )


def _shotlist_task(workflow_id: str, scene_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Generating shot list")
        shotlist = generate_shotlist(
            db,
            scene_id=scene_id,
            coverage_goal=payload.get("coverage_goal", "balanced"),
            camera_style=payload.get("camera_style"),
            blocking_intent=payload.get("blocking_intent"),
        )
        shot_count = len(db.execute(select(Shot).where(Shot.shotlist_id == shotlist.id)).scalars().all())
        log_event(db, workflow_id, "shotlist.ready", "Shot list generated", {"shotlist_id": shotlist.id, "shot_count": shot_count})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"shotlist_id": shotlist.id, "scene_id": scene_id, "shot_count": shot_count},
            message="Shot list generation completed",
        )


def _previs_task(workflow_id: str, scene_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Generating previs plan")
        previs_path = generate_previs_plan(
            db,
            scene_id=scene_id,
            source_storyboard_id=payload["source_storyboard_id"],
            source_shotlist_id=payload["source_shotlist_id"],
            duration_sec=payload.get("duration_sec", 20),
            aspect_ratio=payload.get("aspect_ratio", "16:9"),
            quality_profile=payload.get("quality_profile", "preview"),
        )
        log_event(db, workflow_id, "previs.ready", "Previs plan generated", {"path": previs_path})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"scene_id": scene_id, "previs_path": previs_path},
            message="Previs plan generation completed",
        )


@router.get("/projects/{project_id}/scenes", response_model=EnvelopeScenes)
def list_project_scenes(project_id: str, db: DBSession) -> EnvelopeScenes:
    scenes = db.execute(select(Scene).where(Scene.project_id == project_id).order_by(Scene.order_index.asc())).scalars().all()
    return EnvelopeScenes(data=[SceneData.model_validate(scene) for scene in scenes])


@router.get("/scenes/{scene_id}", response_model=EnvelopeScene)
def get_scene(scene_id: str, db: DBSession) -> EnvelopeScene:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one_or_none()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return EnvelopeScene(data=SceneData.model_validate(scene))


@router.get("/scenes/{scene_id}/breakdown", response_model=EnvelopeSceneBreakdown)
def get_scene_breakdown(scene_id: str, db: DBSession) -> EnvelopeSceneBreakdown:
    breakdown = db.execute(select(SceneBreakdown).where(SceneBreakdown.scene_id == scene_id)).scalar_one_or_none()
    if breakdown is None:
        raise HTTPException(status_code=404, detail="Scene breakdown not found")
    return EnvelopeSceneBreakdown(data=SceneBreakdownData.model_validate(breakdown))


@router.post("/scenes/{scene_id}:breakdown", response_model=AsyncJobAccepted, status_code=202)
def create_scene_breakdown(
    scene_id: str,
    payload: SceneBreakdownRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one_or_none()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    workflow = create_workflow(db, project_id=scene.project_id, workflow_type="scene_breakdown", input_json=payload.model_dump())
    background_tasks.add_task(_scene_breakdown_task, workflow.id, scene_id, payload.model_dump())
    return _accepted(workflow.id, "scene_breakdown")


@router.post("/projects/{project_id}/visual-bibles:generate", response_model=AsyncJobAccepted, status_code=202)
def create_visual_bible(
    project_id: str,
    payload: VisualBibleGenerateRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    workflow = create_workflow(db, project_id=project_id, workflow_type="visual_bible_generate", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_visual_bible_task, workflow.id, project_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "visual_bible_generate")


@router.post("/scenes/{scene_id}/storyboards:generate", response_model=AsyncJobAccepted, status_code=202)
def create_storyboard(
    scene_id: str,
    payload: StoryboardGenerateRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one_or_none()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    workflow = create_workflow(db, project_id=scene.project_id, workflow_type="storyboard_generate", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_storyboard_task, workflow.id, scene_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "storyboard_generate")


@router.post("/scenes/{scene_id}/shotlists:generate", response_model=AsyncJobAccepted, status_code=202)
def create_shotlist(
    scene_id: str,
    payload: ShotlistGenerateRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one_or_none()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    workflow = create_workflow(db, project_id=scene.project_id, workflow_type="shotlist_generate", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_shotlist_task, workflow.id, scene_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "shotlist_generate")


@router.post("/scenes/{scene_id}/previs:generate", response_model=AsyncJobAccepted, status_code=202)
def create_previs(
    scene_id: str,
    payload: PrevisGenerateRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one_or_none()
    if scene is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    workflow = create_workflow(db, project_id=scene.project_id, workflow_type="previs_generate", input_json=payload.model_dump(mode="json"))
    background_tasks.add_task(_previs_task, workflow.id, scene_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "previs_generate")
