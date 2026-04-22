from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Scene, SceneBreakdown

CONTINUITY_TERMS = {
    "wardrobe": ["قميص", "جاكيت", "فستان", "عباية", "بدلة", "حجاب"],
    "injury": ["دم", "جرح", "كدمة", "نزيف"],
    "vehicle": ["سيارة", "عربية", "أتوبيس", "موتوسيكل", "دراجة"],
    "weather": ["مطر", "ضباب", "عاصفة", "ريح"],
    "prop": ["مسدس", "هاتف", "موبايل", "حقيبة", "سكين", "مفتاح"],
}


def build_continuity_report(db: Session, scene_id: str, include_resolution_hints: bool = True) -> dict[str, Any]:
    scene = db.execute(select(Scene).where(Scene.id == scene_id)).scalar_one()
    breakdown = db.execute(select(SceneBreakdown).where(SceneBreakdown.scene_id == scene_id)).scalar_one_or_none()

    text = f"{scene.slugline}\n{scene.scene_text or ''}\n{scene.summary or ''}".lower()
    issues: list[dict[str, Any]] = []
    for category, terms in CONTINUITY_TERMS.items():
        if any(term in text for term in terms):
            item = {
                "category": category,
                "severity": "medium",
                "message": f"المشهد يحتوي على عناصر حساسة للاستمرارية من نوع {category}.",
            }
            if include_resolution_hints:
                hints = {
                    "wardrobe": "ثبّت مرجعًا بصريًا للملابس قبل وبعد كل تيك.",
                    "injury": "سجّل مستوى الإصابة أو آثار الدم بالتفصيل قبل الانتقال للزاوية التالية.",
                    "vehicle": "ثبّت موضع المركبة واتجاهها والمسافة إلى الكاميرا.",
                    "weather": "طابق مستوى البلل أو الضباب أو الرياح بين اللقطات.",
                    "prop": "التقط صورة مرجعية لموضع الإكسسوار في اليد أو داخل الكادر.",
                }
                item["resolution_hint"] = hints.get(category)
            issues.append(item)

    if breakdown and breakdown.risk_level == "high":
        issues.append(
            {
                "category": "risk",
                "severity": "high",
                "message": "المشهد مصنف عالي المخاطر ويستحق مراجعة استمرارية مضاعفة.",
                "resolution_hint": "اعتمد مشرف استمرارية نقطة تحقق قبل كل setup جديد." if include_resolution_hints else None,
            }
        )

    return {
        "scene_id": scene.id,
        "issues": issues,
        "issue_count": len(issues),
        "summary": scene.summary,
    }


def build_dailies_report(db: Session, shooting_day_id: str, mode: str = "coverage") -> dict[str, Any]:
    from app.models import CallSheet, ScheduleEntry, ShootingDay

    day = db.execute(select(ShootingDay).where(ShootingDay.id == shooting_day_id)).scalar_one()
    scheduled_entries = db.execute(select(ScheduleEntry).where(ScheduleEntry.shooting_day_id == shooting_day_id)).scalars().all()
    call_sheet = db.execute(select(CallSheet).where(CallSheet.shooting_day_id == shooting_day_id)).scalar_one_or_none()

    return {
        "shooting_day_id": day.id,
        "mode": mode,
        "base_location": day.base_location,
        "scheduled_scene_count": len(scheduled_entries),
        "call_sheet_ready": call_sheet is not None,
        "missing_items": [] if call_sheet else ["لا توجد Call Sheet معتمدة لهذا اليوم حتى الآن."],
        "editor_notes": ["تقرير أولي: يحتاج ربط التيكات الفعلية عندما تتوفر بيانات التسجيل أو الميديا."],
    }
