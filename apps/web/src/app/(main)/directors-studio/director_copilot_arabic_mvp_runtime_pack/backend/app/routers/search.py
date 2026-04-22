from __future__ import annotations

from fastapi import APIRouter

from app.core.deps import DBSession
from app.schemas import ProjectSearchRequest, SearchEnvelope, SearchHit
from app.services.search_service import search_project

router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchEnvelope)
def search(payload: ProjectSearchRequest, db: DBSession) -> SearchEnvelope:
    hits = search_project(db, str(payload.project_id), payload.query, payload.top_k, payload.filters)
    return SearchEnvelope(
        data=[
            SearchHit(
                rank=index,
                source_type=hit["source_type"],
                source_id=hit["source_id"],
                snippet=hit["snippet"],
                score=hit["score"],
                source_ref=hit.get("source_ref"),
            )
            for index, hit in enumerate(hits, start=1)
        ]
    )
