"""طبقة التحقق النهائي من سلامة البنية بعد المعالجة."""

from typing import Any, Dict, List, Tuple, TypedDict

from .constants import BASMALA_PATTERN
from .features import extract_all_features
from .predicates import (
    count_action_split_candidates,
    extract_action_character_rebalance,
    split_character_prefix,
    split_dialogue_action,
    split_action_line,
    split_scene_header_action,
    split_scene_number_tail,
)
from .states import State


class ValidationIssue(TypedDict):
    lineIndex: int
    kind: str
    text: str


# قائمة الأعطال الجسيمة التي تُسقط الجاهزية التشغيلية وتستدعي إعادة المعالجة.
# كل نوع هنا يعكس قاعدة في element-grammar أو edge-cases في المهارة.
CRITICAL_ISSUE_KINDS = {
    "invalid-scene_header_2",
    "scene-number-tail-combined",
    "scene_header_3-contains-action",
    "scene-header-action-combined",
    "dialogue-without-speaker",
    "dialogue-contains-action",
    "fragmented-character-label",
    "invalid-character-prefix",
    "character-without-followup",
    # قواعد جديدة مواكبة للعقد المهاري الحالي
    "basmala-duplicate",
    "basmala-not-at-start",
    "transition-has-extra-body",
    "transition-too-long",
    "scene-header-out-of-order",
    "parenthetical-orphan",
    "parenthetical-wrong-preceding-type",
}


def validate_elements(elements: List[Tuple[State, str]]) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []
    lines = [text for _, text in elements]
    features = extract_all_features(lines)

    # عدّاد البسملة لرصد التكرار — أي ظهور ثانٍ أو ظهور خارج الموضع 0 يكسر العقد.
    basmala_seen_count = 0
    scene_header_sequence_state = None  # يتتبع آخر رأس مشهد لرصد الترتيب
    # الرتب: SCENE_HEADER_1 (1), SCENE_HEADER_2 (2), SCENE_HEADER_3 (3)
    _scene_header_rank = {
        State.SCENE_HEADER_1: 1,
        State.SCENE_HEADER_2: 2,
        State.SCENE_HEADER_3: 3,
    }

    for i, (state, text) in enumerate(elements):
        feature_map = features[i]
        stripped = text.strip()

        # --- قواعد البسملة (element-grammar §1) ---
        if BASMALA_PATTERN.fullmatch(stripped):
            basmala_seen_count += 1
            if basmala_seen_count > 1:
                issues.append({"lineIndex": i, "kind": "basmala-duplicate", "text": stripped})
            elif i != 0:
                # أول ظهور لكن ليس في بداية النص.
                issues.append({"lineIndex": i, "kind": "basmala-not-at-start", "text": stripped})

        # --- قواعد رأس المشهد (element-grammar §2-§4) ---
        if state == State.SCENE_HEADER_2 and feature_map["word_count"] <= 4 and not feature_map["time_location"]:
            issues.append({"lineIndex": i, "kind": "invalid-scene_header_2", "text": stripped})

        # ترتيب رؤوس المشاهد: SH2 لا يأتي قبل SH1، وSH3 لا يأتي قبل SH2.
        if state in _scene_header_rank:
            current_rank = _scene_header_rank[state]
            if current_rank > 1:
                expected_prev_rank = current_rank - 1
                prev_state = elements[i - 1][0] if i > 0 else None
                prev_rank = _scene_header_rank.get(prev_state) if prev_state else None
                if prev_rank != expected_prev_rank:
                    issues.append({"lineIndex": i, "kind": "scene-header-out-of-order", "text": stripped})
            scene_header_sequence_state = state

        if split_scene_number_tail(stripped):
            issues.append({"lineIndex": i, "kind": "scene-number-tail-combined", "text": stripped})

        if split_scene_header_action(stripped):
            kind = "scene_header_3-contains-action" if state == State.SCENE_HEADER_3 else "scene-header-action-combined"
            issues.append({"lineIndex": i, "kind": kind, "text": stripped})

        # --- قواعد الانتقال (element-grammar §9) ---
        # الانتقال يجب أن يكون سطرًا نظيفًا دون ذيل وصفي ودون طول مفرط.
        if state == State.TRANSITION:
            word_count = feature_map["word_count"]
            # عتبة معقولة: "تلاشي من السواد إلى:" = 4 كلمات كحد أقصى عربي،
            # و"FADE IN:" = كلمتين إنجليزية. نمنع أي انتقال يتجاوز 6 كلمات.
            if word_count > 6:
                issues.append({"lineIndex": i, "kind": "transition-too-long", "text": stripped})
            # طول نصي مفرط = ذيل وصفي مدمج (مثل "قطع شقة سارة").
            if len(stripped) > 40:
                issues.append({"lineIndex": i, "kind": "transition-has-extra-body", "text": stripped})

        if split_dialogue_action(stripped):
            issues.append({"lineIndex": i, "kind": "dialogue-contains-action", "text": stripped})

        if state == State.ACTION and (split_action_line(stripped) or count_action_split_candidates(stripped) > 1):
            issues.append({"lineIndex": i, "kind": "overlong-action-multi-clause", "text": stripped})

        if state == State.DIALOGUE and (
            i == 0 or elements[i - 1][0] not in (State.CHARACTER, State.PARENTHETICAL, State.DIALOGUE)
        ):
            issues.append({"lineIndex": i, "kind": "dialogue-without-speaker", "text": stripped})

        # --- قواعد PARENTHETICAL (element-grammar §7) ---
        # الإرشاد الأدائي يجب أن يسبقه CHARACTER أو DIALOGUE بنفس المتكلم.
        if state == State.PARENTHETICAL:
            if i == 0:
                issues.append({"lineIndex": i, "kind": "parenthetical-orphan", "text": stripped})
            else:
                prev_state = elements[i - 1][0]
                if prev_state not in (State.CHARACTER, State.DIALOGUE):
                    issues.append(
                        {"lineIndex": i, "kind": "parenthetical-wrong-preceding-type", "text": stripped}
                    )

        if state == State.CHARACTER and i + 1 < len(elements):
            if elements[i + 1][0] not in (State.DIALOGUE, State.PARENTHETICAL, State.CHARACTER, State.ACTION):
                issues.append({"lineIndex": i, "kind": "character-without-followup", "text": stripped})

        if (
            state == State.CHARACTER
            and i > 0
            and elements[i - 1][0] == State.ACTION
            and extract_action_character_rebalance(elements[i - 1][1], stripped)
        ):
            issues.append({"lineIndex": i, "kind": "fragmented-character-label", "text": stripped})

        if state == State.CHARACTER and split_character_prefix(stripped):
            issues.append({"lineIndex": i, "kind": "invalid-character-prefix", "text": stripped})

    return issues


def has_critical_issues(issues: List[Dict[str, Any]]) -> bool:
    return count_critical_issues(issues) > 0


def count_critical_issues(issues: List[Dict[str, Any]]) -> int:
    return sum(1 for issue in issues if issue.get("kind") in CRITICAL_ISSUE_KINDS)
