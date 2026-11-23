# AkharStudio v1.8 Release Notes

Desktop-first, local-first Punjabi screenplay editor.

---

### What's New in v1.8:

#### 1. A4 as Default Paper Size
* **International Standard by Default**: Set A4 (`210 × 297 mm`) as the default page size across the application, aligning with standard international screenplay printing while keeping US Letter (`8.5 × 11 in`) readily available as an alternative option.
* **Unified Layout & Export Parity**: Projects, pagination engine profiles, DOM canvas page breaks, and PDF discrete-sheet exports now default to A4 with seamless dynamic switching between A4 and Letter.
* **Streamlined UI Selectors**: Updated segmented controls in Header Row 2, Left Sidebar, and Export Modal with A4 positioned as primary and US Letter as alternative.

#### 2. Transliteration Intelligence & Native Vocabulary
* **Expanded Runtime Lexicon**: Integrated native Punjabi runtime dictionary and vocabulary enhancements (`nativeDictionary.ts`, `vocabulary.ts`, `akhar_runtime_dictionary.json`) providing fast, accurate phonetic Roman-to-Gurmukhi suggestions.
* **Shorthand & Common Corrections**: Built-in shorthand expansions and smart spelling correction lookup (`shorthand.ts`, `spellingCorrections.ts`, `personalization.ts`) for fluent typing.
* **Transliterated Input Support**: Added reusable `TransliteratedInput` component for smooth Punjabi typing within modals, search fields, and character name dialogues.

#### 3. Left Formatting Toolbar & Tool Rail
* **Vertical Left Tool Rail**: Added dedicated left-side tool rail with quick element styling, navigation helpers, and unified design tokens (`toolrail.css`, `motion.css`).
* **Floating Undo/Redo Controls**: Introduced floating `UndoRedoPill` with responsive tooltips and tactile history operations.

#### 4. Find & Replace Hardening
* **Enhanced FindBar**: Added match index indicators, smooth active match scrolling, regex/case-sensitivity toggles, and robust batch replace operations.
* **Seamless Search Highlighting**: ProseMirror search plugin enhancements ensure accurate, performant highlight decorations across multi-page scripts.

#### 5. Editor Intelligence & UI Refinements
* **Smooth Typography & Character Alignment**: Refined character cue alignment, parenthetical styling, and dialogue line wrapping across both editor canvas and PDF exports.
* **Project Library & Welcome Screen**: Polished project creation flows, recent scripts view, and modal animations.

---

### Verification & Testing
* **100% Test Pass Rate**: 847 automated unit, integration, and UI component tests across 57 test suites passing cleanly with zero regressions.
* **Cross-Platform Installers**: Production-ready builds for macOS (Apple Silicon DMG & ZIP) and Windows (NSIS Installer & Portable EXE, x64).
