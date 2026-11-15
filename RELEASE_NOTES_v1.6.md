# AkharStudio v1.6 Release Notes

Desktop-first, local-first Punjabi screenplay editor.

---

### What's New in v1.6:

#### 1. Enhanced Punjabi Transliteration Recognition
* **Diphthong Recognition**: Added native phonetic recognition and dictionary mappings for complex Punjabi diphthongs (`-oi`, `-oyi`, `-oee`, `-oyee`) correctly mapping to Gurmukhi independent vowel combinations (`\u0A4B\u0A08` / `ੋਈ` and `\u0A13\u0A08` / `ਓਈ`).
* **Common Spelling Variations**: Words such as `rasoi` and `rasoyi` now reliably transliterate directly to **ਰਸੋਈ** at Rank 1.
* **Expanded Phonetic Typo Rules**: Added automatic bidirectional phonological substitutions (`oi <-> oyi`, `ai <-> ayi`, `oe <-> oye`) and vowel-matra boundary expansion to smoothly handle non-initial independent vowels across colloquial spelling variants.

#### 2. Intuitive Esc Key Behaviour & Mixed-Language English Support
* **Non-Destructive Esc Key**: Pressing <kbd>Esc</kbd> now closes the transliteration suggestion dropdown while safely preserving the typed English text in the script document rather than discarding it.
* **Seamless English Word Retention**: Entering English terms such as **"OK"** or **"INT."** within Punjabi transliteration mode is now effortless:
  * Raw English text is explicitly included as a selectable candidate in the suggestion menu with an `[English]` badge.
  * Pressing <kbd>Esc</kbd> commits the typed English text directly to the script without having to switch the primary keyboard language to English via the left sidebar.

#### 3. Standard Text Selection & Replacement
* **Text Selection Overwriting**: Typing after selecting text (via mouse selection or <kbd>Shift</kbd> + arrow navigation) now replaces the selected text entirely, adhering to standard desktop word processor conventions.
* **Selection State Management**: Prevents text insertion before selections while leaving old text highlighted.

#### 4. Header Layout Stability on Logo Switch
* **Zero Layout Shifting**: Encapsulated the dual-language `AkharStudioLogo` in a fixed-width container (`w-[160px] shrink-0`) with fixed prefix alignment (`w-[44px] shrink-0`).
* Alternating between English ("AkharStudio") and Gurmukhi ("ਅੱਖਰ ਸਟੂਡੀਓ") logos now occurs smoothly with zero horizontal or vertical movement of adjacent menu options, buttons, and tools.

#### 5. Interface Streamlining
* **Removed Redundant "Local Database" Badge**: Cleaned up the application top header by removing the legacy "Local Database" badge, keeping the file indicator and minimal diagnostic triggers neatly aligned.

---

### Verification & Testing
* **Zero Regressions**: 100% test pass rate across all 47 test suites (625 automated unit, integration, and UI component tests).
* **Cross-Platform Installers**: Production-ready builds verified for macOS (DMG & ZIP, Apple Silicon) and Windows (NSIS Installer & Portable EXE, x64).
