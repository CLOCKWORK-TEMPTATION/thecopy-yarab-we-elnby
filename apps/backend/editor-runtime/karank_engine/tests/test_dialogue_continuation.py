import unittest

from engine.parser import parse_screenplay


class DialogueContinuationTests(unittest.TestCase):
    def test_broken_dialogue_continuation_merges_with_previous_dialogue(self) -> None:
        text = """مشهد1
نهار - داخلي
شقة سيد نفيسة
بوسي :
الدكتور محذرني ان ابرة الجلوكوز تفضل طول الوقت متعلقة ... ولا من شاف ولا من
دري ... مع واحد في سنه ولا حد هيسأل .. ولا حدى هيعتني
صبري :
انتي هتكوني حطب جهنم
"""

        elements = parse_screenplay(text)

        self.assertEqual(
            [(state.value, value) for state, value in elements],
            [
                ("SCENE_HEADER_1", "مشهد1"),
                ("SCENE_HEADER_2", "نهار - داخلي"),
                ("scene_header_3", "شقة سيد نفيسة"),
                ("CHARACTER", "بوسي :"),
                (
                    "DIALOGUE",
                    "الدكتور محذرني ان ابرة الجلوكوز تفضل طول الوقت متعلقة ... ولا من شاف ولا من دري ... مع واحد في سنه ولا حد هيسأل .. ولا حدى هيعتني",
                ),
                ("CHARACTER", "صبري :"),
                ("DIALOGUE", "انتي هتكوني حطب جهنم"),
            ],
        )

    def test_real_action_after_dialogue_is_not_merged(self) -> None:
        text = """مشهد1
نهار - داخلي
شقة سيد نفيسة
بوسي :
انا خارجة من
تنهض وتتجه نحو الباب
صبري :
استني
"""

        elements = parse_screenplay(text)

        self.assertEqual(
            [(state.value, value) for state, value in elements],
            [
                ("SCENE_HEADER_1", "مشهد1"),
                ("SCENE_HEADER_2", "نهار - داخلي"),
                ("scene_header_3", "شقة سيد نفيسة"),
                ("CHARACTER", "بوسي :"),
                ("DIALOGUE", "انا خارجة من"),
                ("ACTION", "تنهض وتتجه نحو الباب"),
                ("CHARACTER", "صبري :"),
                ("DIALOGUE", "استني"),
            ],
        )


if __name__ == "__main__":
    unittest.main()