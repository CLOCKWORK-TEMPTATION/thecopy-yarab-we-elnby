from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models import Workspace

DBSession = Annotated[Session, Depends(get_db)]


def get_workspace_id(
    db: DBSession,
    x_workspace_id: Annotated[str | None, Header(alias="X-Workspace-Id")] = None,
) -> str:
    if x_workspace_id:
        workspace = db.execute(select(Workspace).where(Workspace.id == x_workspace_id)).scalar_one_or_none()
        if workspace is None:
            raise HTTPException(status_code=404, detail="Workspace not found")
        return workspace.id

    workspace = db.execute(select(Workspace).where(Workspace.slug == settings.default_workspace_slug)).scalar_one_or_none()
    if workspace is None:
        raise HTTPException(status_code=500, detail="Default workspace bootstrap failed")
    return workspace.id


WorkspaceId = Annotated[str, Depends(get_workspace_id)]
