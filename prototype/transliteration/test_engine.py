#!/usr/bin/env python3
"""test_engine.py - Automated test suite for the phonetic transliteration prototype."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import GurmukhiTransliterator, GurmukhiLexicon


class TestGurmukhiTransliterator(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Path to wordlist
        tsv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../Punjabi/out/wordlist.tsv")
        if not os.path.exists(tsv_path):
            tsv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../Punjabi/out/wordlist_v1.1_baseline.tsv")
        print(f"Loading lexicon from: {tsv_path}")
        cls.lexicon = GurmukhiLexicon.load_from_tsv(tsv_path, max_words=100_000)
        cls.engine = GurmukhiTransliterator(cls.lexicon)
        print(f"Loaded {cls.lexicon.total_words:,} words into trie.")

    def test_seed_fixtures(self):
        """Test the mandatory seed fixtures from roman-input-convention.md."""
        fixtures = [
            ("kitthe", "ਕਿੱਥੇ"),
            ("putt", "ਪੁੱਤ"),
            ("punjab", "ਪੰਜਾਬ"),
            ("munda", "ਮੁੰਡਾ"),
            ("kudi", "ਕੁੜੀ"),
            ("zindagi", "ਜ਼ਿੰਦਗੀ"),
            ("ch", "ਚ"),
        ]

        for roman, expected in fixtures:
            with self.subTest(roman=roman, expected=expected):
                candidates = self.engine.suggest(roman, max_candidates=5)
                self.assertIn(expected, candidates, 
                    f"For '{roman}', expected '{expected}' in top 5 candidates, but got: {candidates}")
                print(f"PASS: {roman} -> {candidates} (includes {expected})")

    def test_explicit_tokens(self):
        """Test explicit escape hatch tokens."""
        tokens = [
            ("{ADDAK}", "\u0A71"),
            ("{A}", "\u0A71"),
            ("{TIPPI}", "\u0A70"),
            ("{TP}", "\u0A70"),
            ("{BINDI}", "\u0A02"),
            ("{BD}", "\u0A02"),
            ("{DANDA}", "।"),
            ("{DA}", "।"),
            ("{DOUBLE-DANDA}", "॥"),
            ("{DDA}", "॥"),
        ]

        for token, expected in tokens:
            with self.subTest(token=token):
                candidates = self.engine.suggest(token)
                self.assertEqual(candidates, [expected])


if __name__ == "__main__":
    unittest.main()
