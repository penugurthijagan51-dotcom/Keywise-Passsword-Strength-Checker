import unittest

from password_checker import evaluate_password, format_report


class EvaluatePasswordTests(unittest.TestCase):
    def test_empty_password_is_weak_and_has_length_feedback(self):
        assessment = evaluate_password("")

        self.assertEqual(assessment.strength, "Weak")
        self.assertEqual(assessment.score, 5)
        self.assertTrue(any("12 characters" in tip for tip in assessment.suggestions))

    def test_long_diverse_password_scores_strong(self):
        assessment = evaluate_password("Violet!Canoe7_Meteor")

        self.assertEqual(assessment.strength, "Strong")
        self.assertGreaterEqual(assessment.score, 80)

    def test_common_password_is_penalized(self):
        assessment = evaluate_password("Password")

        self.assertEqual(assessment.strength, "Weak")
        self.assertTrue(any("commonly used" in tip for tip in assessment.suggestions))

    def test_short_diverse_password_cannot_score_good_or_strong(self):
        assessment = evaluate_password("A1!bcdeF")

        self.assertEqual(assessment.strength, "Weak")
        self.assertLess(assessment.score, 40)

    def test_sequence_and_repeated_pattern_are_reported(self):
        assessment = evaluate_password("abcabcabcabcabcabc")
        failed_checks = {label for label, passed in assessment.checks if not passed}

        self.assertIn("Avoids obvious sequences", failed_checks)
        self.assertIn("Avoids repeated patterns", failed_checks)

    def test_report_does_not_include_password(self):
        secret = "Unlisted!Secret9_Violet"
        report = format_report(evaluate_password(secret))

        self.assertNotIn(secret, report)
        self.assertIn("Score:", report)
        self.assertIn("Checks:", report)

    def test_non_string_input_is_rejected(self):
        with self.assertRaises(TypeError):
            evaluate_password(None)


if __name__ == "__main__":
    unittest.main()
