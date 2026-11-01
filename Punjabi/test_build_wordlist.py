#!/usr/bin/env python3
"""test_build_wordlist.py - Regression test suite for Punjabi wordlist normalization and filtering.

Tests:
1. Legitimate single-character words (ਚ, ਆ, ਏ, etc.) are accepted.
2. Isolated matras and malformed single characters are rejected.
3. Pre-vocalic conjuncts with misplaced siari/vowels are normalized canonically.
4. Post-vocalic pairin-ha sequences (ਉਨਾਂ੍ਹ, ਤਰਾਂ੍ਹ) are normalized to canonical spelling (ਉਨ੍ਹਾਂ, ਤਰ੍ਹਾਂ).
5. Combining-mark order (addak/tippi/bindi before vowel sign) is corrected.
6. Malformed and illegal Gurmukhi syllable structures are rejected.
"""
import os
import sys
import unittest
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_wordlist as bw


class TestBuildWordlist(unittest.TestCase):

    def test_legitimate_single_character_words(self):
        """Verify that genuine single-character Punjabi morphemes are accepted."""
        legitimate = ["ਚ", "ਆ", "ਏ", "ਈ", "ਜ", "ਓ", "ਐ", "ੴ"]
        for w in legitimate:
            with self.subTest(word=w):
                reason = bw.validate_word(w, min_count=1, count=100)
                self.assertIsNone(reason, f"Expected '{w}' to be accepted, but got rejection: {reason}")

    def test_rejected_single_characters(self):
        """Verify that isolated vowel signs, diacritics, and arbitrary consonants are rejected."""
        # Isolated vowel signs and diacritics
        isolated_marks = ["ੀ", "ੋ", "ਾ", "ਿ", "ੇ", "ੈ", "ੁ", "ੂ", "ੌ", "ੰ", "ਂ", "ੱ", "਼", "੍"]
        for m in isolated_marks:
            with self.subTest(mark=m):
                reason = bw.validate_word(m, min_count=1, count=100)
                self.assertIsNotNone(reason, f"Isolated mark '{m}' should be rejected")

        # Isolated consonants (from broken abbreviations or typos)
        isolated_consonants = ["ਪ", "ਸ", "ਦ", "ਬ", "ਨ", "ਕ", "ਗ", "ਰ", "ਤ", "ਮ"]
        for c in isolated_consonants:
            with self.subTest(consonant=c):
                reason = bw.validate_word(c, min_count=1, count=100)
                self.assertEqual(reason, "bad_length", f"Isolated consonant '{c}' should be rejected as bad_length")

    def test_conjunct_normalization(self):
        """Verify that legacy-font / typing artifacts placing vowels before virama+consonant are reordered."""
        cases = [
            ("ਪਿ੍ਰੰਸੀਪਲ", "ਪ੍ਰਿੰਸੀਪਲ"),
            ("ਗਿ੍ਰਫ਼ਤਾਰ", "ਗ੍ਰਿਫ਼ਤਾਰ"),
            ("ਅੰਮਿ੍ਰਤਸਰ", "ਅੰਮ੍ਰਿਤਸਰ"),
            ("ਮਿ੍ਰਤਕ", "ਮ੍ਰਿਤਕ"),
            ("ਪੇ੍ਰਰਕ", "ਪ੍ਰੇਰਕ"),
            ("ਸ਼ੋ੍ਰਮਣੀ", "ਸ਼੍ਰੋਮਣੀ"),
            ("ਜ਼ਿਲਿ੍ਹਆਂ", "ਜ਼ਿਲ੍ਹਿਆਂ"),
        ]
        for raw, expected in cases:
            with self.subTest(raw=raw):
                normalized = bw.normalize_gurmukhi(raw)
                self.assertEqual(normalized, expected)
                self.assertIsNone(bw.validate_word(normalized, min_count=1, count=10))

    def test_post_vocalic_pairin_ha(self):
        """Verify that tonal pairin-ha typed after vowel+bindi is normalized to the base consonant."""
        cases = [
            ("ਉਨਾਂ੍ਹ", "ਉਨ੍ਹਾਂ"),
            ("ਤਰਾਂ੍ਹ", "ਤਰ੍ਹਾਂ"),
            ("ਇਨਾਂ੍ਹ", "ਇਨ੍ਹਾਂ"),
            ("ਜਿਨਾਂ੍ਹ", "ਜਿਨ੍ਹਾਂ"),
            ("ਜ਼ਿਲੇ੍ਹ", "ਜ਼ਿਲ੍ਹੇ"),
        ]
        for raw, expected in cases:
            with self.subTest(raw=raw):
                normalized = bw.normalize_gurmukhi(raw)
                self.assertEqual(normalized, expected)
                self.assertIsNone(bw.validate_word(normalized, min_count=1, count=10))

    def test_diacritic_vowel_reordering(self):
        """Verify that addak/tippi/bindi placed before a vowel matra is placed after it."""
        cases = [
            # addak before kanna -> kanna + addak
            ("\u0A2A\u0A71\u0A3E", "\u0A2A\u0A3E\u0A71"),
            # tippi before kanna -> kanna + bindi/tippi
            ("\u0A2A\u0A70\u0A3E", "\u0A2A\u0A3E\u0A70"),
        ]
        for raw, expected in cases:
            with self.subTest(raw=raw):
                normalized = bw.normalize_gurmukhi(raw)
                self.assertEqual(normalized, expected)

    def test_malformed_syllables_rejected(self):
        """Verify that illegal Gurmukhi syllable combinations are rejected as invalid_structure."""
        malformed = [
            "ਕੀੋ",    # multiple vowel signs
            "ਕੱੱ",    # multiple addaks
            "ਕੰਂ",    # multiple nasals
            "੍ਕ",     # leading virama with no base consonant
            "ਕਿੀ",    # conflicting vowel signs
        ]
        for m in malformed:
            with self.subTest(malformed=m):
                reason = bw.validate_word(m, min_count=1, count=10)
                self.assertEqual(reason, "invalid_structure", f"'{m}' should be rejected as invalid_structure")

    def test_standard_vocabulary_accepted(self):
        """Verify that common everyday Punjabi words pass normalization and validation."""
        words = [
            "ਕਿੱਥੇ", "ਪੁੱਤ", "ਪੰਜਾਬ", "ਮੁੰਡਾ", "ਕੁੜੀ", "ਜ਼ਿੰਦਗੀ",
            "ਸਿੰਘ", "ਕਰਨ", "ਕੀਤਾ", "ਵਿੱਚ", "ਵਿਚ", "ਲਈ", "ਨਾਲ",
            "ਦਰਬਾਰ", "ਸਾਹਿਬ", "ਸਕੂਲ", "ਸਟੇਸ਼ਨ", "ਗੁਰਮੁਖੀ"
        ]
        for w in words:
            with self.subTest(word=w):
                normalized = bw.normalize_gurmukhi(w)
                self.assertIsNone(bw.validate_word(normalized, min_count=1, count=10))


if __name__ == "__main__":
    unittest.main()
