from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import DBSession, WorkspaceId
from app.models import Project
from app.schemas import EnvelopeProject, EnvelopeProjects, Project as ProjectSchema, ProjectCreateRequest

router = APIRouter(tags=["projects"])


@router.post("/projects", response_model=EnvelopeProject, status_code=201)
def create_project(payload: ProjectCreateRequest, db: DBSession, workspace_id: WorkspaceId) -> EnvelopeProject:
    existing = db.execute(
        select(Project).where(Project.workspace_id == workspace_id, Project.slug == payload.slug)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Project slug already exists in this workspace")

    project = Project(
        workspace_id=workspace_id,
        project_type=payload.project_type,
        title_ar=payload.title_ar,
        title_en=payload.title_en,
        slug=payload.slug,
        default_language_code=payload.default_language_code,
        default_dialect_code=payload.default_dialect_code,
        logline=payload.logline,
        synopsis=payload.synopsis,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return EnvelopeProject(data=ProjectSchema.model_validate(project))


@router.get("/projects", response_model=EnvelopeProjects)
def list_projects(db: DBSession, workspace_id: WorkspaceId) -> EnvelopeProjects:
    projects = db.execute(select(Project).where(Project.workspace_id == workspace_id).order_by(Project.created_at.desc())).scalars().all()
    return EnvelopeProjects(data=[ProjectSchema.model_validate(project) for project in projects])


@router.get("/projects/{project_id}", response_model=EnvelopeProject)
def get_project(project_id: str, db: DBSession, workspace_id: WorkspaceId) -> EnvelopeProject:
    project = db.execute(
        select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id)
    ).scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return EnvelopeProject(data=ProjectSchema.model_validate(project))
