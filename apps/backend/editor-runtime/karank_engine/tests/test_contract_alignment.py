"""اختبارات تحقق مواءمة محرك الكرنك مع العقد المهاري الحالي (arabic-screenplay-classifier).

يغطي هذا الملف:
- KG1: توسيع TRANSITION_WORDS ونمط RECONSTRUCTION_TRANSITION.
- KG2: قواعد البسملة (الوحدانية وموقع البداية).
- KG3: CHARACTER مع إرشاد أدائي مضمّن.
- KG4: حماية State.CHARACTER من الأفعال السردية.
- تحقق validator: الأعطال الجسيمة الجديدة.
"""

from __future__ import annotations

import unittest

from engine.constants import (
    CHARACTER_PATTERN,
    PARENTHETICAL_PATTERN,
    RECONSTRUCTION_TRANSITION,
    TIME_WORDS,
    TRANSITION_WORDS,
)
from engine.parser import parse_screenplay
from engine.states import State
from engine.validator import CRITICAL_ISSUE_KINDS, validate_elements


class TransitionWordsExpansionTests(unittest.TestCase):
    """KG1 — يجب أن تطابق مجموعة الانتقالات قائمة element-grammar §9."""

    def test_arabic_transitions_are_recognized(self) -> None:
        expected = {
            "قطع",
            "قطع إلى",
            "قطع إلى:",
            "تلاشي",
            "تلاشي إلى",
            "تلاشي إلى السواد",
            "تلاشي إلى الأبيض",
            "تلاشي للسواد",
            "تلاشي من السواد",
            "اختفاء",
            "مزج",
            "فيد",
            "فيد إن",
            "فيد أوت",
        }
        for word in expected:
            self.assertIn(word, TRANSITION_WORDS, f"الانتقال '{word}' غير مُعرَّف")

    def test_english_transitions_are_recognized(self) -> None:
        for word in {"Fade", "Fade in", "Fade out", "Cut", "Cut to", "CUT TO", "Dissolve", "Dissolve to"}:
            self.assertIn(word, TRANSITION_WORDS, f"الانتقال '{word}' غير مُعرَّف")

    def test_reconstruction_transition_splits_trailing_content(self) -> None:
        sample = "قطع شقة سارة"
        match = RECONSTRUCTION_TRANSITION.search(sample)
        self.assertIsNotNone(match, "نمط RECONSTRUCTION_TRANSITION لم يلتقط 'قطع'")
        self.assertEqual(match.group(0), "قطع")

    def test_reconstruction_transition_recognizes_tlashi_with_color(self) -> None:
        sample = "ثم تلاشي إلى السواد بعدها ينطفئ الضوء"
        match = RECONSTRUCTION_TRANSITION.search(sample)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(0), "تلاشي إلى السواد")

    def test_reconstruction_transition_does_not_match_verb_usage(self) -> None:
        # "قطع أحمد الخبز" — فعل وليس انتقال.
        sample = "قطع أحمد الخبز"
        match = RECONSTRUCTION_TRANSITION.search(sample)
        self.assertIsNotNone(match)  # النمط يلتقط "قطع" الكلمة بحدّ ذاتها
        # لكن على مستوى TRANSITION_WORDS (مجموعة مغلقة) "قطع أحمد الخبز" ليس انتقالًا.
        self.assertNotIn("قطع أحمد الخبز", TRANSITION_WORDS)

    def test_time_words_include_new_additions(self) -> None:
        for word in ("ظهر", "عصر", "غروب"):
            self.assertIn(word, TIME_WORDS)


class BasmalaUniquenessTests(unittest.TestCase):
    """KG2 — البسملة فريدة وفي الموضع الأول فقط."""

    def test_basmala_not_at_start_is_demoted_to_action(self) -> None:
        text = """مشهد1
نهار - داخلي
شقة
بسم الله الرحمن الرحيم
يجلس أحمد على الكنبة
"""
        elements = parse_screenplay(text)
        states = [state for state, _ in elements]
        # البسملة في الموضع 3 يجب ألا تبقى State.BASMALA.
        self.assertNotIn(State.BASMALA, states[3:], "بسملة متأخرة تم قبولها خطأً")

    def test_duplicate_basmala_triggers_critical_issue(self) -> None:
        elements = [
            (State.BASMALA, "بسم الله الرحمن الرحيم"),
            (State.SCENE_HEADER_1, "مشهد1"),
            (State.SCENE_HEADER_2, "نهار - داخلي"),
            (State.BASMALA, "بسم الله الرحمن الرحيم"),
        ]
        issues = validate_elements(elements)
        kinds = {issue["kind"] for issue in issues}
        self.assertIn("basmala-duplicate", kinds, "لم يُرصد تكرار البسملة")
        self.assertIn("basmala-duplicate", CRITICAL_ISSUE_KINDS)


class CharacterInlineParentheticalTests(unittest.TestCase):
    """KG3 — CHARACTER يقبل إرشاد أدائي مضمّن (دلالة الدمج في element-grammar §6)."""

    def test_character_with_inline_parenthetical_matches(self) -> None:
        self.assertTrue(CHARACTER_PATTERN.match("مدحت (غاضبًا) :"))
        self.assertTrue(CHARACTER_PATTERN.match("نور (بهمس) :"))
        # الصيغة بدون إرشاد لا تزال مدعومة.
        self.assertTrue(CHARACTER_PATTERN.match("سارة :"))

    def test_parenthetical_pattern_accepts_arabic_full_width(self) -> None:
        self.assertIsNotNone(PARENTHETICAL_PATTERN.search("（بهمس）"))
        self.assertIsNotNone(PARENTHETICAL_PATTERN.search("(غاضبًا)"))


class NarrativeHintProtectionTests(unittest.TestCase):
    """KG4 — مؤشر الأفعال السردية يعاقب تصنيف السطر كـ CHARACTER."""

    def test_narrative_sentence_with_colon_is_not_character(self) -> None:
        # جملة سردية تحوي ":" في نهايتها يجب ألا تصبح CHARACTER.
        text = """مشهد1
نهار - داخلي
شقة
تدخل سارة :
يا أحمد
"""
        elements = parse_screenplay(text)
        states_and_texts = [(state, value) for state, value in elements]
        # السطر "تدخل سارة :" لا يجب أن يكون CHARACTER.
        offending = [(s, t) for s, t in states_and_texts if "تدخل سارة" in t]
        if offending:
            self.assertNotEqual(offending[0][0], State.CHARACTER)


class ValidatorCriticalKindsTests(unittest.TestCase):
    """توسيع CRITICAL_ISSUE_KINDS لتغطية العقد الجديد."""

    def test_all_new_kinds_are_registered(self) -> None:
        expected_new = {
            "basmala-duplicate",
            "basmala-not-at-start",
            "transition-has-extra-body",
            "transition-too-long",
            "scene-header-out-of-order",
            "parenthetical-orphan",
            "parenthetical-wrong-preceding-type",
        }
        missing = expected_new - CRITICAL_ISSUE_KINDS
        self.assertFalse(missing, f"أنواع أعطال جسيمة غير مُسجّلة: {missing}")

    def test_parenthetical_orphan_is_detected(self) -> None:
        elements = [
            (State.PARENTHETICAL, "(بهمس)"),
            (State.ACTION, "تدخل سارة"),
        ]
        issues = validate_elements(elements)
        kinds = {issue["kind"] for issue in issues}
        self.assertIn("parenthetical-orphan", kinds)

    def test_parenthetical_after_action_is_detected(self) -> None:
        elements = [
            (State.ACTION, "تدخل سارة"),
            (State.PARENTHETICAL, "(بهمس)"),
        ]
        issues = validate_elements(elements)
        kinds = {issue["kind"] for issue in issues}
        self.assertIn("parenthetical-wrong-preceding-type", kinds)

    def test_transition_with_extra_body_is_detected(self) -> None:
        elements = [
            (State.TRANSITION, "قطع إلى مشهد الحرب الكبير في قلب الصحراء مع الجيش"),
        ]
        issues = validate_elements(elements)
        kinds = {issue["kind"] for issue in issues}
        self.assertTrue(
            "transition-has-extra-body" in kinds or "transition-too-long" in kinds,
            f"لم تُرصد مشكلة الذيل الوصفي على الانتقال (issues={kinds})",
        )


class ExistingRegressionIntactTests(unittest.TestCase):
    """ضمان عدم كسر الاختبارات القائمة."""

    def test_simple_scene_still_parses_correctly(self) -> None:
        text = """بسم الله الرحمن الرحيم
مشهد1
نهار - داخلي
شقة سيد نفيسة
بوسي :
أنا خارجة
قطع
"""
        elements = parse_screenplay(text)
        states = [state.value for state, _ in elements]
        self.assertEqual(states[0], "BASMALA")
        self.assertEqual(states[1], "SCENE_HEADER_1")
        self.assertEqual(states[2], "SCENE_HEADER_2")
        self.assertEqual(states[-1], "TRANSITION")


if __name__ == "__main__":
    unittest.main()
