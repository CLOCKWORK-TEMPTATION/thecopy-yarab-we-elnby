from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def reset_db() -> None:
    if settings.database_url.startswith("sqlite:///"):
        db_path = Path(settings.database_url.replace("sqlite:///", ""))
        if db_path.exists():
            db_path.unlink()


def test_mvp_flow() -> None:
    reset_db()
    with TestClient(app) as client:
        project_resp = client.post(
            "/api/v1/projects",
            json={
                "project_type": "film",
                "title_ar": "مشروع اختبار",
                "title_en": "Smoke Test Project",
                "slug": "smoke-test-project",
                "default_language_code": "ar",
                "default_dialect_code": "ar-EG",
            },
        )
        assert project_resp.status_code == 201
        project_id = project_resp.json()["data"]["id"]

        script_text = (
            "داخلي - شقة - نهار\n"
            "كريم يجلس أمام المكتب ويحمل هاتفًا.\n\n"
            "خارجي - شارع - ليل\n"
            "سيارة سوداء تتوقف بينما المطر يهطل."
        )
        upload_resp = client.post(
            f"/api/v1/projects/{project_id}/scripts:upload",
            files={"file": ("script.txt", script_text.encode("utf-8"), "text/plain")},
            data={"parse_now": "true"},
        )
        assert upload_resp.status_code == 202
        workflow_id = upload_resp.json()["data"]["workflow_id"]

        workflow_resp = client.get(f"/api/v1/workflows/{workflow_id}")
        assert workflow_resp.status_code == 200
        assert workflow_resp.json()["data"]["status"] == "succeeded"

        scenes_resp = client.get(f"/api/v1/projects/{project_id}/scenes")
        assert scenes_resp.status_code == 200
        assert len(scenes_resp.json()["data"]) == 2
        scene_id = scenes_resp.json()["data"][0]["id"]

        breakdown_resp = client.post(
            f"/api/v1/scenes/{scene_id}:breakdown",
            json={"include_entities": True, "include_risks": True, "approval_mode": "draft"},
        )
        assert breakdown_resp.status_code == 202

        search_resp = client.post(
            "/api/v1/search",
            json={"query": "كريم", "project_id": project_id, "filters": {}, "top_k": 10},
        )
        assert search_resp.status_code == 200
        assert len(search_resp.json()["data"]) >= 1
