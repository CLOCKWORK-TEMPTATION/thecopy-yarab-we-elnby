from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

SLUGLINE_RE = re.compile(
    r"^\s*(?:INT\.?|EXT\.?|INT/EXT\.?|EXT/INT\.?|داخلي|خارجي|داخلي/خارجي|خارجي/داخلي|مشهد\s*\d+)" ,
    re.IGNORECASE,
)

DIALOGUE_NAME_RE = re.compile(r"^[\u0600-\u06FFA-Z][\u0600-\u06FFA-Z\s\-]{1,40}$")


@dataclass
class ParsedScene:
    stable_scene_key: str
    script_scene_number: int
    order_index: int
    slugline: str
    int_ext: str
    time_of_day: str
    primary_location: str | None
    summary: str
    scene_text: str
    dialogue_text: str
    metadata_json: dict


ARABIC_REPLACEMENTS = {
    "\u200f": "",
    "\u200e": "",
    "\xa0": " ",
}


def normalize_text(text: str) -> str:
    for old, new in ARABIC_REPLACEMENTS.items():
        text = text.replace(old, new)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.strip() for line in text.split("\n")]
    compact_lines: list[str] = []
    for line in lines:
        if line == "" and compact_lines and compact_lines[-1] == "":
            continue
        compact_lines.append(line)
    return "\n".join(compact_lines).strip()


def is_slugline(line: str) -> bool:
    if not line:
        return False
    if SLUGLINE_RE.match(line):
        return True
    upper = line.upper()
    return upper.startswith(("INT", "EXT")) and ("-" in upper or "/" in upper)


def parse_slugline(line: str) -> tuple[str, str, str | None]:
    source = line.strip()
    normalized = source.lower()
    if "داخلي" in normalized and "خارجي" not in normalized:
        int_ext = "int"
    elif "خارجي" in normalized and "داخلي" not in normalized:
        int_ext = "ext"
    elif "داخلي" in normalized and "خارجي" in normalized:
        int_ext = "mixed"
    elif "int" in normalized and "ext" not in normalized:
        int_ext = "int"
    elif "ext" in normalized and "int" not in normalized:
        int_ext = "ext"
    elif "int" in normalized and "ext" in normalized:
        int_ext = "mixed"
    else:
        int_ext = "unknown"

    if any(token in normalized for token in ["نهار", "day"]):
        time_of_day = "day"
    elif any(token in normalized for token in ["ليل", "night"]):
        time_of_day = "night"
    elif any(token in normalized for token in ["فجر", "dawn"]):
        time_of_day = "dawn"
    elif any(token in normalized for token in ["غروب", "dusk", "sunset"]):
        time_of_day = "dusk"
    else:
        time_of_day = "unknown"

    cleaned = re.sub(r"^(INT\.?|EXT\.?|INT/EXT\.?|EXT/INT\.?|داخلي|خارجي|داخلي/خارجي|خارجي/داخلي)", "", source, flags=re.IGNORECASE).strip()
    cleaned = cleaned.replace(".", " ").replace("—", "-").replace("–", "-")
    parts = [p.strip(" -/|") for p in re.split(r"[-/|]", cleaned) if p.strip(" -/|")]
    location = None
    for part in parts:
        lower = part.lower()
        if lower in {"day", "night", "dawn", "dusk", "نهار", "ليل", "فجر", "غروب"}:
            continue
        if not part.startswith("مشهد"):
            location = part
            break
    return int_ext, time_of_day, location


def _collect_dialogue_text(scene_text: str) -> str:
    dialogue_lines: list[str] = []
    prev_was_name = False
    for raw_line in scene_text.split("\n"):
        line = raw_line.strip()
        if not line:
            prev_was_name = False
            continue
        if DIALOGUE_NAME_RE.match(line) and len(line.split()) <= 4:
            prev_was_name = True
            continue
        if prev_was_name:
            dialogue_lines.append(line)
        prev_was_name = False
    return "\n".join(dialogue_lines)


def split_into_scenes(text: str) -> list[ParsedScene]:
    normalized = normalize_text(text)
    if not normalized:
        return []

    lines = normalized.split("\n")
    scenes_raw: list[tuple[str, list[str]]] = []
    current_slugline = "مشهد 1"
    current_body: list[str] = []

    for line in lines:
        if is_slugline(line):
            if current_body or scenes_raw:
                scenes_raw.append((current_slugline, current_body))
            current_slugline = line
            current_body = []
        else:
            current_body.append(line)

    scenes_raw.append((current_slugline, current_body))

    parsed: list[ParsedScene] = []
    for idx, (slugline, body_lines) in enumerate(scenes_raw, start=1):
        scene_text = "\n".join(body_lines).strip() or slugline
        summary_source = scene_text.replace("\n", " ").strip()
        summary = summary_source[:240] + ("…" if len(summary_source) > 240 else "")
        int_ext, time_of_day, location = parse_slugline(slugline)
        stable_key = hashlib.sha1(f"{slugline}|{summary_source[:120]}".encode("utf-8")).hexdigest()[:20]
        parsed.append(
            ParsedScene(
                stable_scene_key=stable_key,
                script_scene_number=idx,
                order_index=idx,
                slugline=slugline,
                int_ext=int_ext,
                time_of_day=time_of_day,
                primary_location=location,
                summary=summary,
                scene_text=scene_text,
                dialogue_text=_collect_dialogue_text(scene_text),
                metadata_json={"line_count": len(body_lines)},
            )
        )
    return parsed


RISK_KEYWORDS = {
    "vfx": ["انفجار", "explosion", "انفج", "مؤثر", "vfx", "طلق", "fire", "حريق", "دم", "رصاص"],
    "crowd": ["جمهور", "جموع", "زحام", "crowd", "متظاهر", "حفلة"],
    "minors": ["طفل", "طفلة", "أطفال", "قاصر", "طالب"],
    "animals": ["حصان", "كلب", "قطة", "حمار", "animal", "حصان"],
    "vehicles": ["سيارة", "عربية", "أتوبيس", "تاكسي", "van", "truck", "car", "bike", "دراجة", "موتوسيكل"],
    "weather": ["مطر", "عاصفة", "ريح", "ضباب", "storm", "rain", "fog"],
    "sfx": ["صوت", "انفجار", "إطلاق", "مكبر", "طلق", "sirens", "sfx"],
    "wardrobe": ["قميص", "جاكيت", "فستان", "بدلة", "ملابس", "عباية", "حجاب"],
    "makeup": ["دم", "جرح", "كدمة", "ماكياج", "مكياج", "عرق"],
}


def generate_breakdown(scene_text: str, scene_summary: str | None = None) -> dict:
    text = f"{scene_summary or ''}\n{scene_text or ''}".lower()
    counts = {}
    for key, terms in RISK_KEYWORDS.items():
        counts[key] = sum(text.count(term.lower()) for term in terms)

    risk_points = counts["vfx"] + counts["crowd"] + counts["minors"] + counts["animals"] + counts["vehicles"]
    if risk_points >= 5:
        risk_level = "high"
    elif risk_points >= 2:
        risk_level = "medium"
    else:
        risk_level = "low"

    notes: list[str] = []
    if counts["weather"]:
        notes.append("المشهد يحتوي على عناصر طقس يجب تثبيت مرجعيتها بين اللقطات.")
    if counts["wardrobe"]:
        notes.append("يحتمل وجود استمرارية ملابس تحتاج تتبعًا يدويًا.")
    if counts["makeup"]:
        notes.append("هناك مؤشرات إلى استمرارية مكياج أو إصابات ظاهرية.")
    if counts["vehicles"]:
        notes.append("يلزم تثبيت مواضع المركبات واتجاهاتها بين التيكات.")

    return {
        "risk_level": risk_level,
        "vfx_required": counts["vfx"] > 0,
        "sfx_required": counts["sfx"] > 0,
        "crowd_count": counts["crowd"],
        "minors_count": counts["minors"],
        "animals_count": counts["animals"],
        "vehicle_count": counts["vehicles"],
        "weather_notes": " ".join(notes) if notes else None,
        "special_notes": None,
        "breakdown_json": {
            "signals": counts,
            "continuity_hints": notes,
        },
    }
