from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Asset, AssetVersion, EditorialExport, Project, Scene, ScheduleEntry


def build_otio_like_payload(
    project: Project,
    *,
    scenes: list[Scene],
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "OTIO_SCHEMA": "Timeline.1",
        "name": project.title_ar,
        "metadata": metadata or {},
        "tracks": [
            {
                "OTIO_SCHEMA": "Track.1",
                "name": "Video Track",
                "children": [
                    {
                        "OTIO_SCHEMA": "Clip.2",
                        "name": scene.slugline,
                        "metadata": {
                            "scene_id": scene.id,
                            "summary": scene.summary,
                            "stable_scene_key": scene.stable_scene_key,
                        },
                    }
                    for scene in scenes
                ],
            }
        ],
    }


def create_editorial_export(
    db: Session,
    *,
    project_id: str,
    scope: str,
    shooting_day_id: str | None,
    scene_id: str | None,
    episode_id: str | None,
) -> EditorialExport:
    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one()
    scenes: list[Scene] = []

    if scene_id:
        scenes = db.execute(select(Scene).where(Scene.id == scene_id)).scalars().all()
    elif shooting_day_id:
        entries = db.execute(select(ScheduleEntry).where(ScheduleEntry.shooting_day_id == shooting_day_id)).scalars().all()
        scene_ids = [entry.scene_id for entry in entries]
        if scene_ids:
            scenes = db.execute(select(Scene).where(Scene.id.in_(scene_ids))).scalars().all()
    else:
        scenes = db.execute(select(Scene).where(Scene.project_id == project_id).order_by(Scene.order_index.asc())).scalars().all()

    payload = build_otio_like_payload(
        project,
        scenes=scenes,
        metadata={"scope": scope, "shooting_day_id": shooting_day_id, "scene_id": scene_id, "episode_id": episode_id},
    )

    export_path = Path(settings.export_dir) / f"editorial_export_{uuid4()}.otio.json"
    export_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    asset = Asset(
        id=str(uuid4()),
        project_id=project_id,
        storage_uri=str(export_path),
        asset_media_type="json",
        mime_type="application/json",
        source_kind="derived",
    )
    db.add(asset)
    db.flush()

    asset_version = AssetVersion(
        id=str(uuid4()),
        asset_id=asset.id,
        version_no=1,
        storage_uri=str(export_path),
    )
    db.add(asset_version)
    db.flush()

    export = EditorialExport(
        id=str(uuid4()),
        project_id=project_id,
        scope=scope,
        shooting_day_id=shooting_day_id,
        scene_id=scene_id,
        episode_id=episode_id,
        format="otio",
        asset_id=asset.id,
        metadata_json={"scene_count": len(scenes), "asset_version_id": asset_version.id},
    )
    db.add(export)
    db.flush()
    return export
