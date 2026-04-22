from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CallSheet, CallSheetItem, Scene, ScheduleEntry, ScheduleVersion, ShootingDay


MAX_SCENES_PER_DAY = 6


def generate_schedule(db: Session, project_id: str, constraints: dict[str, Any] | None = None) -> tuple[ScheduleVersion, list[ShootingDay], list[ScheduleEntry]]:
    current_max_version = db.execute(
        select(func.max(ScheduleVersion.version_no)).where(ScheduleVersion.project_id == project_id)
    ).scalar()
    version_no = int(current_max_version or 0) + 1

    schedule = ScheduleVersion(
        id=str(uuid4()),
        project_id=project_id,
        version_no=version_no,
        constraints_json=constraints or {},
        optimization_summary="تم التجميع مبدئيًا حسب الموقع والفترة الزمنية مع حد أقصى 6 مشاهد يوميًا.",
        status="draft",
    )
    db.add(schedule)
    db.flush()

    scenes = db.execute(
        select(Scene).where(Scene.project_id == project_id).order_by(Scene.order_index.asc())
    ).scalars().all()

    grouped: dict[tuple[str, str], list[Scene]] = defaultdict(list)
    for scene in scenes:
        key = ((scene.primary_location or "بدون موقع محدد"), (scene.time_of_day or "unknown"))
        grouped[key].append(scene)

    shooting_days: list[ShootingDay] = []
    entries: list[ScheduleEntry] = []
    day_cursor = date.today()
    group_index = 0

    for (location, time_of_day), group_scenes in grouped.items():
        for offset in range(0, len(group_scenes), MAX_SCENES_PER_DAY):
            chunk = group_scenes[offset : offset + MAX_SCENES_PER_DAY]
            group_index += 1
            day = ShootingDay(
                id=str(uuid4()),
                project_id=project_id,
                shoot_date=day_cursor + timedelta(days=group_index - 1),
                unit_no=1,
                base_location=location,
                status="draft",
                notes_json={"time_of_day": time_of_day, "scene_count": len(chunk)},
            )
            db.add(day)
            db.flush()
            shooting_days.append(day)

            start_hour = 7
            for index, scene in enumerate(chunk, start=1):
                start = f"{start_hour + (index - 1):02d}:00"
                end = f"{start_hour + index:02d}:00"
                entry = ScheduleEntry(
                    id=str(uuid4()),
                    schedule_version_id=schedule.id,
                    shooting_day_id=day.id,
                    scene_id=scene.id,
                    order_index=index,
                    planned_start_at=start,
                    planned_end_at=end,
                    cast_requirements_json={"scene_summary": scene.summary},
                    crew_requirements_json={"camera": True, "sound": True},
                    logistics_json={"location": location, "time_of_day": time_of_day},
                )
                db.add(entry)
                entries.append(entry)
    db.flush()
    return schedule, shooting_days, entries


def generate_call_sheet(db: Session, project_id: str, shooting_day_id: str, schedule_version_id: str) -> tuple[CallSheet, list[CallSheetItem]]:
    current_max_version = db.execute(
        select(func.max(CallSheet.version_no)).where(CallSheet.shooting_day_id == shooting_day_id)
    ).scalar()
    version_no = int(current_max_version or 0) + 1

    shooting_day = db.execute(select(ShootingDay).where(ShootingDay.id == shooting_day_id)).scalar_one()
    entries = db.execute(
        select(ScheduleEntry).where(ScheduleEntry.shooting_day_id == shooting_day_id).order_by(ScheduleEntry.order_index.asc())
    ).scalars().all()

    call_sheet = CallSheet(
        id=str(uuid4()),
        project_id=project_id,
        shooting_day_id=shooting_day_id,
        version_no=version_no,
        status="draft",
        summary_json={
            "shoot_date": str(shooting_day.shoot_date),
            "base_location": shooting_day.base_location,
            "scene_count": len(entries),
            "schedule_version_id": schedule_version_id,
        },
    )
    db.add(call_sheet)
    db.flush()

    items: list[CallSheetItem] = []
    items.append(
        CallSheetItem(
            id=str(uuid4()),
            call_sheet_id=call_sheet.id,
            item_type="crew_call",
            ref_entity_type="crew",
            call_time="06:30",
            notes="نداء فريق التصوير والصوت.",
        )
    )
    for entry in entries:
        items.append(
            CallSheetItem(
                id=str(uuid4()),
                call_sheet_id=call_sheet.id,
                item_type="scene",
                ref_entity_type="scene",
                ref_entity_id=entry.scene_id,
                call_time=entry.planned_start_at,
                notes=f"مشهد مجدول من {entry.planned_start_at} إلى {entry.planned_end_at}",
            )
        )
    for item in items:
        db.add(item)
    db.flush()
    return call_sheet, items
