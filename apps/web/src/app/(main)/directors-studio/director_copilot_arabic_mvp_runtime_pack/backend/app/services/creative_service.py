from __future__ import annotations

from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Asset,
    AssetVersion,
    Project,
    Scene,
    Shot,
    Shotlist,
    Storyboard,
    StoryboardFrame,
    VisualBible,
)
from app.services.storage import write_json_artifact, write_storyboard_svg


def generate_visual_bible(
    db: Session,
    *,
    project_id: str,
    episode_id: str | None = None,
    style_intent: str | None = None,
    output_depth: str = "standard",
) -> VisualBible:
    current_max_version = db.execute(
        select(func.max(VisualBible.version_no)).where(
            VisualBible.project_id == project_id,
            VisualBible.episode_id.is_(episode_id) if episode_id is None else VisualBible.episode_id == episode_id,
        )
    ).scalar()
    version_no = int(current_max_version or 0) + 1

    project = db.execute(select(Project).where(Project.id == project_id)).scalar_one()
    palette = ["shadow black", "dust beige", "sodium amber"]
    if output_depth == "deep":
        palette.extend(["muted cyan", "sickly green"])
    if style_intent and "كوميديا" in style_intent:
        palette = ["warm tungsten", "faded pastel", "smoke gray"]

    style_manifest = {
        "intent": style_intent or "واقعية شاعرية مع حس تشغيلي واضح للكاميرا",
        "palette": palette,
        "camera_language": "توازن بين اللقطات المتوسطة والـclose-ups مع حركة محسوبة",
        "light_language": "مصادر ضوء عملية مع تباين متوسط إلى عالٍ",
        "reference_notes": [project.logline, project.synopsis],
    }
    reference_pack = {
        "depth": output_depth,
        "character_visual_anchors": ["تفاصيل يدين", "مسافات داخل الكادر", "خامات المكان"],
        "set_texture": ["غبار", "دهانات قديمة", "عتمة مشوبة بلون دافئ"],
    }

    artifact_path = write_json_artifact(project_id, "visual_bible", {"style_manifest": style_manifest, "reference_pack": reference_pack})
    asset = Asset(
        id=str(uuid4()),
        project_id=project_id,
        storage_uri=artifact_path,
        asset_media_type="json",
        mime_type="application/json",
        source_kind="generated",
    )
    db.add(asset)
    db.flush()

    asset_version = AssetVersion(
        id=str(uuid4()),
        asset_id=asset.id,
        version_no=1,
        storage_uri=artifact_path,
        generation_provider="internal_mvp",
        generation_model="template_visual_bible_v1",
        prompt_text=style_intent,
        parameters_json={"output_depth": output_depth},
    )
    db.add(asset_version)
    db.flush()

    visual_bible = VisualBible(
        id=str(uuid4()),
        project_id=project_id,
        episode_id=episode_id,
        version_no=version_no,
        style_manifest_json=style_manifest,
        reference_pack_json={**reference_pack, "asset_version_id": asset_version.id},
        status="draft",
    )
    db.add(visual_bible)
    db.flush()
    return visual_bible


def generate_storyboard(
    db: Session,
    *,
    scene_id: str,
    source_visual_bible_id: str | None = None,
    frame_count_hint: int = 8,
) -> Storyboard:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one()
    current_max_version = db.execute(select(func.max(Storyboard.version_no)).where(Storyboard.scene_id == scene_id)).scalar()
    version_no = int(current_max_version or 0) + 1

    storyboard = Storyboard(
        id=str(uuid4()),
        project_id=scene.project_id,
        scene_id=scene_id,
        version_no=version_no,
        source_visual_bible_id=source_visual_bible_id,
        prompt_pack_json={"frame_count_hint": frame_count_hint, "scene_summary": scene.summary},
        status="draft",
    )
    db.add(storyboard)
    db.flush()

    scene_sentences = [segment.strip() for segment in (scene.scene_text or "").replace("\n", ". ").split(".") if segment.strip()]
    if not scene_sentences:
        scene_sentences = [scene.summary or scene.slugline]

    for index in range(1, frame_count_hint + 1):
        line = scene_sentences[(index - 1) % len(scene_sentences)]
        caption = f"Frame {index}: {line[:140]}"
        svg_path = write_storyboard_svg(scene.project_id, scene.slugline, caption)
        asset = Asset(
            id=str(uuid4()),
            project_id=scene.project_id,
            storage_uri=svg_path,
            asset_media_type="image",
            mime_type="image/svg+xml",
            source_kind="generated",
        )
        db.add(asset)
        db.flush()

        asset_version = AssetVersion(
            id=str(uuid4()),
            asset_id=asset.id,
            version_no=1,
            storage_uri=svg_path,
            generation_provider="internal_mvp",
            generation_model="svg_storyboard_v1",
            prompt_text=caption,
        )
        db.add(asset_version)
        db.flush()

        frame = StoryboardFrame(
            id=str(uuid4()),
            storyboard_id=storyboard.id,
            frame_no=index,
            asset_version_id=asset_version.id,
            caption=caption,
            prompt_text=line,
        )
        db.add(frame)
    db.flush()
    return storyboard


SHOT_TEMPLATES = {
    "minimal": [
        ("EST", "wide", "eye_level", "static", 8),
        ("MID", "medium", "eye_level", "static", 12),
        ("CU", "close_up", "eye_level", "static", 6),
    ],
    "balanced": [
        ("EST", "wide", "high", "static", 8),
        ("MS_A", "medium", "eye_level", "push_in", 10),
        ("MS_B", "medium", "eye_level", "reverse", 10),
        ("CU_A", "close_up", "eye_level", "static", 6),
        ("CU_B", "close_up", "eye_level", "static", 6),
    ],
    "full": [
        ("EST", "wide", "high", "static", 8),
        ("WS_MOVE", "wide", "eye_level", "track", 12),
        ("MS_A", "medium", "eye_level", "push_in", 10),
        ("MS_B", "medium", "eye_level", "reverse", 10),
        ("OTS_A", "over_shoulder", "eye_level", "static", 8),
        ("OTS_B", "over_shoulder", "eye_level", "static", 8),
        ("CU_A", "close_up", "eye_level", "static", 6),
        ("INSERT", "insert", "low", "static", 4),
    ],
}


def generate_shotlist(
    db: Session,
    *,
    scene_id: str,
    coverage_goal: str = "balanced",
    camera_style: str | None = None,
    blocking_intent: str | None = None,
) -> Shotlist:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one()
    current_max_version = db.execute(select(func.max(Shotlist.version_no)).where(Shotlist.scene_id == scene_id)).scalar()
    version_no = int(current_max_version or 0) + 1

    templates = SHOT_TEMPLATES.get(coverage_goal, SHOT_TEMPLATES["balanced"])
    shotlist = Shotlist(
        id=str(uuid4()),
        project_id=scene.project_id,
        scene_id=scene_id,
        version_no=version_no,
        status="draft",
        coverage_matrix_json={
            "goal": coverage_goal,
            "camera_style": camera_style,
            "blocking_intent": blocking_intent,
            "template_count": len(templates),
        },
    )
    db.add(shotlist)
    db.flush()

    for idx, (code, framing, angle, movement, duration) in enumerate(templates, start=1):
        shot = Shot(
            id=str(uuid4()),
            shotlist_id=shotlist.id,
            stable_shot_key=f"{scene.stable_scene_key}_{idx}",
            order_index=idx,
            shot_code=code,
            framing=framing,
            camera_angle=angle,
            movement=movement,
            lens_hint="35mm" if framing in {"wide", "medium"} else "85mm",
            duration_estimate_sec=duration,
            audio_plan="Boom + lav where applicable",
            blocking_notes=blocking_intent or "حركة الممثلين تُبنى حول مركز الانفعال داخل المشهد.",
            continuity_notes="الرجوع إلى بطاقة الاستمرارية قبل تغيير محور الكاميرا.",
            schema_json={
                "scene_slugline": scene.slugline,
                "camera_style": camera_style,
            },
        )
        db.add(shot)
    db.flush()
    return shotlist


def generate_previs_plan(
    db: Session,
    *,
    scene_id: str,
    source_storyboard_id: str,
    source_shotlist_id: str,
    duration_sec: int,
    aspect_ratio: str,
    quality_profile: str,
) -> str:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one()
    payload = {
        "scene_id": scene.id,
        "slugline": scene.slugline,
        "summary": scene.summary,
        "source_storyboard_id": source_storyboard_id,
        "source_shotlist_id": source_shotlist_id,
        "duration_sec": duration_sec,
        "aspect_ratio": aspect_ratio,
        "quality_profile": quality_profile,
        "note": "هذه معاينة previs نصية/هيكلية في نسخة MVP إلى حين دمج مولد الفيديو الحقيقي.",
    }
    return write_json_artifact(scene.project_id, "previs_plan", payload)
