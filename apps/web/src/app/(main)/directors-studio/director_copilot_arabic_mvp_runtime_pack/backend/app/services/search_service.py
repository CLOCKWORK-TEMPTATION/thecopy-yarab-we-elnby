from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Note, Project, Recording, Scene, Transcript


TABLES = [
    ("scene", Scene, "scene_text", "مشهد"),
    ("transcript", Transcript, "full_text", "تفريغ"),
    ("note", Note, "body_text", "ملاحظة"),
]


def _snippet(text: str, query: str, window: int = 120) -> str:
    q = query.lower()
    lower = text.lower()
    idx = lower.find(q)
    if idx == -1:
        return text[:window] + ("…" if len(text) > window else "")
    start = max(0, idx - window // 2)
    end = min(len(text), idx + window // 2)
    snippet = text[start:end]
    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet += "…"
    return snippet


def search_project(db: Session, project_id: str, query: str, top_k: int = 10, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    filters = filters or {}
    allowed = set(filters.get("source_types") or [t[0] for t in TABLES])
    results: list[dict[str, Any]] = []
    q = query.strip().lower()

    if not q:
        return []

    if "project" in allowed:
        project = db.execute(select(Project).where(Project.id == project_id)).scalar_one_or_none()
        if project is not None:
            haystack = "\n".join(filter(None, [project.title_ar, project.title_en, project.logline, project.synopsis]))
            if q in haystack.lower():
                results.append({
                    "source_type": "project",
                    "source_id": project.id,
                    "snippet": _snippet(haystack, query),
                    "score": float(haystack.lower().count(q)) + 1.0,
                    "source_ref": f"عنوان المشروع:{project.id}",
                })

    for source_type, model, field_name, label in TABLES:
        if source_type not in allowed:
            continue
        if model is Transcript:
            rows = db.execute(
                select(Transcript).join(Recording, Transcript.recording_id == Recording.id).where(Recording.project_id == project_id)
            ).scalars().all()
        else:
            rows = db.execute(select(model).where(model.project_id == project_id)).scalars().all()
        for row in rows:
            haystack = getattr(row, field_name, "") or ""
            if q in haystack.lower():
                score = float(haystack.lower().count(q)) + 1.0
                results.append(
                    {
                        "source_type": source_type,
                        "source_id": row.id,
                        "snippet": _snippet(haystack, query),
                        "score": score,
                        "source_ref": f"{label}:{row.id}",
                    }
                )

    results.sort(key=lambda item: item["score"], reverse=True)
    return results[:top_k]
