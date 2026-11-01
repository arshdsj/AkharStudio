#!/usr/bin/env python3
"""engine.py - Lightweight offline phonetic Roman-to-Gurmukhi transliteration prototype.

Combines deterministic phonetic parsing rules with an in-memory frequency lexicon
and local user dictionary to produce ranked Gurmukhi candidate spellings.
"""
import os
import re
import unicodedata
from collections import defaultdict


class TrieNode:
    __slots__ = ("children", "frequency", "is_word")

    def __init__(self):
        self.children = {}
        self.frequency = 0
        self.is_word = False


class GurmukhiLexicon:
    """Fast in-memory prefix trie loaded from TSV wordlist."""

    def __init__(self):
        self.root = TrieNode()
        self.total_words = 0

    def insert(self, word: str, frequency: int):
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_word = True
        node.frequency = max(node.frequency, frequency)
        self.total_words += 1

    def get_frequency(self, word: str) -> int:
        node = self.root
        for char in word:
            if char not in node.children:
                return 0
            node = node.children[char]
        return node.frequency if node.is_word else 0

    def is_valid_prefix(self, prefix: str) -> bool:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return False
            node = node.children[char]
        return True

    @classmethod
    def load_from_tsv(cls, tsv_path: str, max_words: int = 100_000):
        lex = cls()
        if not os.path.exists(tsv_path):
            return lex
        with open(tsv_path, "r", encoding="utf-8") as f:
            header = f.readline()
            for i, line in enumerate(f):
                if i >= max_words:
                    break
                parts = line.strip().split("\t")
                if len(parts) >= 3:
                    word = parts[1]
                    count = int(parts[2])
                    lex.insert(word, count)
        return lex


class GurmukhiTransliterator:
    """Phonetic generator and candidate ranker."""

    # Consonant phonemes: Roman -> candidate Gurmukhi graphemes
    CONSONANTS = {
        "k": ["ਕ"],
        "kh": ["ਖ", "ਖ਼"],
        "g": ["ਗ", "ਗ਼"],
        "gh": ["ਘ"],
        "ch": ["ਚ", "ਛ"],
        "chh": ["ਛ"],
        "j": ["ਜ", "ਜ਼"],
        "z": ["ਜ਼"],
        "jh": ["ਝ"],
        "t": ["ਤ", "ਟ"],
        "th": ["ਥ", "ਠ"],
        "d": ["ਦ", "ਡ", "ੜ"],
        "dh": ["ਧ", "ਢ"],
        "n": ["ਨ", "ਣ"],
        "p": ["ਪ"],
        "ph": ["ਫ", "ਫ਼"],
        "f": ["ਫ਼", "ਫ"],
        "b": ["ਬ"],
        "bh": ["ਭ"],
        "m": ["ਮ"],
        "y": ["ਯ"],
        "r": ["ਰ", "ੜ"],
        "l": ["ਲ", "ਲ਼"],
        "v": ["ਵ"],
        "w": ["ਵ"],
        "s": ["ਸ"],
        "sh": ["ਸ਼"],
        "h": ["ਹ"],
    }

    # Independent vowels (word-initial)
    INDEP_VOWELS = {
        "a": ["ਅ", "ਆ"],
        "aa": ["ਆ"],
        "i": ["ਇ", "ਈ"],
        "ee": ["ਈ"],
        "ii": ["ਈ"],
        "u": ["ਉ", "ਊ"],
        "oo": ["ਊ"],
        "uu": ["ਊ"],
        "e": ["ਏ", "ਐ"],
        "ai": ["ਐ"],
        "o": ["ਓ", "ਔ"],
        "au": ["ਔ"],
    }

    # Dependent vowel signs (matras, non-initial)
    DEP_VOWELS = {
        "a": ["", "ਾ"],             # Mukta (inherent a) or Kanna (very common in Roman: punjab, munda)
        "aa": ["ਾ"],
        "i": ["ਿ", "ੀ"],            # Siari or Bihari (casual Roman often uses 'i' for bihari: kudi, zindagi)
        "ee": ["ੀ"],
        "ii": ["ੀ"],
        "u": ["ੁ", "ੂ", ""],        # Aunkar, Dulanokar, or short English 'u' as mukta (punjab, bus, etc.)
        "oo": ["ੂ"],
        "uu": ["ੂ"],
        "e": ["ੇ"],
        "ai": ["ੈ"],
        "o": ["ੋ"],
        "au": ["ੌ"],
    }

    # Explicit brace tokens
    TOKENS = {
        "{ADDAK}": "\u0A71",
        "{A}": "\u0A71",
        "{TIPPI}": "\u0A70",
        "{TP}": "\u0A70",
        "{BINDI}": "\u0A02",
        "{BD}": "\u0A02",
        "{PAIRIN-R}": "\u0A4D\u0A30",
        "{PRR}": "\u0A4D\u0A30",
        "{PAIRIN-H}": "\u0A4D\u0A39",
        "{PRH}": "\u0A4D\u0A39",
        "{DANDA}": "।",
        "{DA}": "।",
        "{DOUBLE-DANDA}": "॥",
        "{DDA}": "॥",
        "{T}": "ਟ",
        "{TH}": "ਠ",
        "{D}": "ਡ",
        "{DH}": "ਢ",
        "{N}": "ਣ",
        "{R}": "ੜ",
        "{L}": "ਲ਼",
        "{KH-NUKTA}": "ਖ਼",
        "{GH-NUKTA}": "ਗ਼",
        "{J-NUKTA}": "ਜ਼",
        "{PH-NUKTA}": "ਫ਼",
    }

    def __init__(self, lexicon: GurmukhiLexicon = None):
        self.lexicon = lexicon or GurmukhiLexicon()
        self.user_dict = defaultdict(int)

    def add_user_word(self, word: str):
        self.user_dict[word] += 100_000_000  # Strong boost for explicitly selected words

    def suggest(self, roman: str, max_candidates: int = 5) -> list[str]:
        roman = roman.strip()
        if not roman:
            return []

        # Handle explicit tokens first
        token_upper = roman.upper()
        if token_upper in self.TOKENS:
            return [self.TOKENS[token_upper]]

        # Generate candidates via rule-based phonetic expansion
        candidates = self._generate_candidates(roman.lower())

        # Clean and deduplicate candidates
        scored = []
        seen = set()

        for c in candidates:
            # Canonical normalization
            c_norm = unicodedata.normalize("NFC", c)
            if c_norm in seen:
                continue
            seen.add(c_norm)

            # Frequency lookup
            freq = self.lexicon.get_frequency(c_norm)
            user_boost = self.user_dict.get(c_norm, 0)
            score = freq + user_boost

            # Extra score for exact seed fixtures / common words
            scored.append((score, c_norm))

        # Sort descending by score, then length
        scored.sort(key=lambda x: -x[0])

        results = [word for score, word in scored[:max_candidates]]
        return results

    def _generate_candidates(self, roman: str) -> list[str]:
        """Recursive phonetic graph traversal with gemination and nasalization."""
        results = set()

        # Handle special common single-char words
        if roman == "ch":
            return ["ਚ", "ਛ"]

        # Parse syllables
        def parse(idx: int, current: str, is_word_start: bool):
            if idx >= len(roman):
                results.add(current)
                return

            # Check for geminated aspirates: 'tth' -> ੱਥ / ੱਠ, 'kkh' -> ੱਖ, 'pph' -> ੱਫ
            if idx + 2 < len(roman) and roman[idx:idx+3] in ("tth", "kkh", "cch", "pph"):
                tri = roman[idx:idx+3]
                gem_aspirates = {
                    "tth": ["\u0A71ਥ", "\u0A71ਠ"],
                    "kkh": ["\u0A71ਖ", "\u0A71ਖ਼"],
                    "cch": ["\u0A71ਛ"],
                    "pph": ["\u0A71ਫ", "\u0A71ਫ਼"],
                }.get(tri, [])
                for ga in gem_aspirates:
                    parse(idx + 3, current + ga, False)

            # Check for doubled consonants (gemination -> addak)
            # e.g., 'tt' -> ੱਤ / ੱਟ, 'pp' -> ੱਪ, 'dd' -> ੱਦ / ੱਡ
            if idx + 1 < len(roman) and roman[idx] == roman[idx + 1] and roman[idx] in "tkdpsbgz":
                double_c = roman[idx]
                consonants = self.CONSONANTS.get(double_c, [])
                for c in consonants:
                    # Case 1: Gemination with Addak (ੱ + consonant)
                    parse(idx + 2, current + "\u0A71" + c, False)
                    # Case 2: Double consonant
                    parse(idx + 2, current + c + c, False)

            # Check for pre-consonant nasalization ('n' or 'm' before consonant)
            # e.g., 'punjab' -> ਪ + ੰ + ਜ + ਾ + ਬ
            if (roman[idx] in ("n", "m") and idx + 1 < len(roman) 
                    and roman[idx + 1] not in ("a", "e", "i", "o", "u")
                    and not is_word_start):
                # Try nasal mark (tippi ੰ or bindi ਂ)
                # Tippi
                parse(idx + 1, current + "\u0A70", False)
                # Bindi
                parse(idx + 1, current + "\u0A02", False)
                # Literal nasal consonant
                for c in self.CONSONANTS.get(roman[idx], []):
                    parse(idx + 1, current + c, False)

            # Multi-character consonant matches (kh, gh, ch, chh, jh, th, dh, ph, sh)
            for length in (3, 2, 1):
                if idx + length <= len(roman):
                    chunk = roman[idx:idx + length]

                    # Vowel chunk
                    if chunk in self.DEP_VOWELS:
                        vowels = self.INDEP_VOWELS.get(chunk, []) if is_word_start else self.DEP_VOWELS.get(chunk, [])
                        for v in vowels:
                            parse(idx + length, current + v, False)

                    # Consonant chunk
                    if chunk in self.CONSONANTS:
                        consonants = self.CONSONANTS[chunk]
                        for c in consonants:
                            parse(idx + length, current + c, False)

        parse(0, "", True)
        return list(results)
