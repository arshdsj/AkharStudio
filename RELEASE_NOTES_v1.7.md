# AkharStudio v1.7 Release Notes

Desktop-first, local-first Punjabi screenplay editor.

---

### What's New in v1.7:

#### 1. Contextual Right-Side Formatting Toolbar
* **Quick-Access Element Formatting**: Added a floating, dockable vertical formatting toolbar along the right side of the editor canvas, providing instant one-click switching for screenplay elements:
  * Scene Heading (`Ctrl/Cmd + 1`)
  * Action (`Ctrl/Cmd + 2`)
  * Character (`Ctrl/Cmd + 3`)
  * Parenthetical (`Ctrl/Cmd + 4`)
  * Dialogue (`Ctrl/Cmd + 5`)
  * Transition (`Ctrl/Cmd + 6`)
* **Live Element Status**: Active element detection highlights the current block's type in real-time as the cursor navigates through scenes.
* **Smart Focus Retention**: Selecting a formatting tool immediately updates the current block or selection and returns focus smoothly to the editor canvas without losing cursor position.
* **Collapsible Docking**: Quick collapse toggle button allows writers to minimize the toolbar into a compact badge when maximum screen real estate is desired.
* **Informative Tooltips**: Hover tooltips detail each element's screenplay purpose along with corresponding keyboard shortcuts.

#### 2. Hardened Roman-to-Gurmukhi Engine & Paste Conversion
* **Resilient Input Validation**: `convertRomanPunjabiToGurmukhi` and `GurmukhiTransliterator.suggestWithDetails` now strictly validate inputs, safeguarding against null, undefined, non-string, or malformed data.
* **Robust Paste Conversion**: Improved `PasteConvertModal` to handle variable clipboard payloads cleanly without unexpected UI crashes.

#### 3. Header Navigation Streamlining
* **Decluttered Top Bar**: Removed the redundant Roman Converter button from the top navigation header bar (`HeaderRow1`), keeping the toolbar clean and focused on essential project and file controls. Direct paste and modal workflows seamlessly handle script conversion contextually.

#### 4. Design System Compliance
* **Complete Component Tokens**: Integrated `.ds-right-toolbar` styling adhering to Akhar Studio design tokens across both `new_design_language/components.css` and `src/renderer/styles/components.css`.

---

### Verification & Testing
* **Zero Regressions**: 100% test pass rate across all 49 test suites (650 automated unit, integration, and UI component tests).
* **Dedicated Test Suites**: Added comprehensive tests for the Right Formatting Toolbar (`test/right-formatting-toolbar.test.tsx`), Roman-to-Gurmukhi conversion and header streamlining (`test/roman-to-gurmukhi-conversion.test.tsx`), and conversion engine safety (`test/stage3-paste-convert.test.ts`).
* **Cross-Platform Installers**: Verified production-ready packages for macOS (Apple Silicon DMG & ZIP) and Windows (NSIS Installer & Portable EXE, x64).
