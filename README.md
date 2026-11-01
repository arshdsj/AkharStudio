# AkharStudio (ਅੱਖਰStudio)

<div align="center">

**A Desktop-First, Local-First Screenplay Editor for Writing Punjabi in Gurmukhi Unicode.**

[![Tests](https://img.shields.io/badge/tests-254%20passed-brightgreen.svg?style=flat-square)](./test)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33.2-47848F.svg?style=flat-square)](https://www.electronjs.org/)
[![ProseMirror](https://img.shields.io/badge/Editor-ProseMirror-orange.svg?style=flat-square)](https://prosemirror.net/)
[![Storage](https://img.shields.io/badge/Storage-SQLite%20(Offline)-003B57.svg?style=flat-square)](https://github.com/WiseLibs/better-sqlite3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

[Features](#features) • [Quickstart](#quickstart) • [Architecture](#architecture) • [Keyboard Shortcuts](#keyboard-shortcuts) • [Windows Beta](#packaging--windows-beta) • [Documentation](#governing-documents)

</div>

---

## Overview

Writing Punjabi screenplays has historically required awkward workarounds: clumsy ASCII-encoded fonts (AnmolLipi), external web transliterators, or generic word processors lacking cinematic formatting conventions.

**AkharStudio** is an offline-first desktop application engineered specifically for Punjabi screenwriters. It pairs natural, forgiving Roman-to-Gurmukhi transliteration with strict screenplay formatting rules, ensuring that your scripts conform to international production standards while respecting the linguistic nuances of Gurmukhi typography.

Everything runs **100% locally** on your computer. No accounts, no subscriptions, no telemetry, and no network connections required.

---

## Features

### 1. Natural Roman-to-Gurmukhi Transliteration
- **Forgiving Phonetic Input**: Type Punjabi naturally using standard Latin keys (e.g., `punjab` → **ਪੰਜਾਬ**, `kitthe` → **ਕਿੱਥੇ**, `zindagi` → **ਜ਼ਿੰਦਗੀ**, `munda` → **ਮੁੰਡਾ**).
- **Sub-Millisecond Candidate Ranking**: Instant suggestion popover ranked by lexical frequency (< 0.2ms latency). Select candidates using digits `1`–`6`, `Enter`, or `Space`.
- **Explicit Control Tokens**: Type precise diacritics directly without switching layouts:
  - `{ADDAK}` or `{A}` → ੱ
  - `{TIPPI}` or `{TP}` → ੰ
  - `{BINDI}` or `{BD}` → ਂ
  - `{PAIRIN-R}` or `{PRR}` → ੍ਰ
  - `{PAIRIN-H}` or `{PRH}` → ੍ਹ
  - `{DANDA}` or `{DA}` → ।
  - `{DOUBLE-DANDA}` or `{DDA}` → ॥
- **Custom Vocabulary**: Learn new slang, names, and regional idioms on the fly with the built-in Custom Dictionary manager.

### 2. Multi-Mode Keyboard Architecture
- **Phonetic Transliteration Mode**: Natural English typing converted on the fly to Gurmukhi.
- **Direct English Mode**: Toggle with `F12` or the header switch to write English action lines, character names, or scene headings without transliteration.
- **Hardware Layout Support**: Seamless coexistence with native OS Punjabi keyboard layouts (Inscript, Phonetic, and Anvaad).
- **On-Screen Visual Keyboard**: Interactive visual Gurmukhi keyboard with real-time `Shift` and `Alt` modifier visualization.

### 3. Professional Screenplay Formatting
- **Standard Screenplay Elements**: Scene Heading, Action, Character, Dialogue, Parenthetical, Transition, and Shot.
- **Context-Aware Autocomplete**:
  - Automatically suggests previous character names when typing in `Character` blocks.
  - Scene heading autocompletion (`INT.`, `EXT.`, `DAY`, `NIGHT`).
- **Automatic `(CONT'D)` Handling**: Detects character interruptions and offers smart `(CONT'D)` placement across scenes and pages.
- **Paper Sizes**: Supports both standard **US Letter** (8.5 × 11 in) and **A4** (210 × 297 mm) formats with exact margin and pagination calculations.

### 4. 100% Local-First & Resilient Persistence
- **Embedded SQLite Storage**: Built on `better-sqlite3` for rock-solid local storage. Scripts are saved automatically on every keystroke.
- **Versioned Drafts & Revisions**: Maintain multiple drafts, revision histories, and project notes without cluttering your filesystem.
- **Portable Backups (`.akharbackup`)**: Export complete project bundles with fonts, revision metadata, and custom dictionaries into a single portable file.
- **Zero Cloud Leaks**: Your intellectual property never leaves your machine.

### 5. Certified Screenplay Export
- **PDF Export with Embedded Fonts**: Offline generation bundling full TrueType typography (`Noto Sans Gurmukhi` and `Courier Prime`) with precise HarfBuzz complex-text shaping.
- **Fountain Format Support**: Full two-way compatibility with industry-standard [Fountain](https://fountain.io/) plain text syntax.
- **Plain Text & Dialogue Extracts**: Generate actor-specific dialogue cue sheets and scene outlines.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Desktop Shell** | [Electron 33](https://www.electronjs.org/) (pinned Chromium + HarfBuzz engine) |
| **Editor Core** | [ProseMirror](https://prosemirror.net/) (custom screenplay schema, transaction pipeline) |
| **User Interface** | [React 18](https://react.dev/), [TypeScript 5.6](https://www.typescriptlang.org/), [Tailwind CSS 3.4](https://tailwindcss.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Database** | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (embedded local database) |
| **Bundling & Build** | [Vite 5](https://vitejs.dev/), [esbuild](https://esbuild.github.io/), [electron-builder](https://www.electron.build/) |
| **Testing** | [Vitest 2.1](https://vitest.dev/), [Testing Library](https://testing-library.com/) (254 unit and integration tests) |

---

## Quickstart

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **C/C++ build tools**: Xcode Command Line Tools on macOS (`xcode-select --install`) or Visual Studio C++ Build Tools on Windows (required for building native SQLite bindings).

### Installation & Launch

```bash
# 1. Clone repository
git clone https://github.com/arshdsj/AkharStudio.git
cd AkharStudio

# 2. Install dependencies (automatically compiles SQLite bindings)
npm install

# 3. Launch in desktop development mode (Vite HMR + Electron)
npm run dev:electron
```

### Running Tests

AkharStudio includes an extensive suite of 254 automated unit, integration, and performance benchmarks:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

---

## Keyboard Shortcuts

### Screenplay Elements
| Shortcut | Element |
|---|---|
| <kbd>Cmd/Ctrl</kbd> + <kbd>1</kbd> | Scene Heading |
| <kbd>Cmd/Ctrl</kbd> + <kbd>2</kbd> | Action |
| <kbd>Cmd/Ctrl</kbd> + <kbd>3</kbd> | Character |
| <kbd>Cmd/Ctrl</kbd> + <kbd>4</kbd> | Dialogue |
| <kbd>Cmd/Ctrl</kbd> + <kbd>5</kbd> | Parenthetical |
| <kbd>Cmd/Ctrl</kbd> + <kbd>6</kbd> | Transition |
| <kbd>Cmd/Ctrl</kbd> + <kbd>7</kbd> | Shot |

### Transliteration & Navigation
| Key | Action |
|---|---|
| <kbd>F12</kbd> | Toggle between Punjabi transliteration and English direct mode |
| <kbd>Space</kbd> | Accept top ranked Gurmukhi candidate and insert space |
| <kbd>1</kbd> – <kbd>6</kbd> | Select candidate by index from the transliteration popover |
| <kbd>Enter</kbd> | Accept candidate (first press); insert screenplay newline (second press) |
| <kbd>Tab</kbd> | Advance to next screenplay element (e.g., Character → Dialogue) |
| <kbd>Esc</kbd> | Dismiss candidate popover while keeping current Roman text |
| <kbd>Cmd/Ctrl</kbd> + <kbd>E</kbd> | Open Export dialogue (PDF / Fountain / Text) |
| <kbd>Cmd/Ctrl</kbd> + <kbd>S</kbd> | Save snapshot / backup |

---

## Packaging & Windows Beta

AkharStudio can be packaged into native stand-alone installers or portable executables for both macOS and Windows using `electron-builder`.

### Cross-Platform Packaging via GitHub Actions (Recommended)
Because `better-sqlite3` is a compiled C++ native addon, building Windows binaries from macOS directly can lead to mismatched native bindings. 

This repository includes a pre-configured **GitHub Actions workflow** (`.github/workflows/build-windows.yml`):
1. Push your changes or trigger the workflow manually in GitHub under the **Actions** tab.
2. The workflow spins up a native Windows VM (`windows-latest`), compiles SQLite natively, and generates:
   - **`AkharStudio-Setup-<version>.exe`** (Standard NSIS Windows Installer)
   - **`AkharStudio-<version>.exe`** (Single-file Portable executable)
3. Download the built `.exe` from workflow **Artifacts** or the **Releases** page to share with Windows testers.

### Building Locally on Windows
On a Windows machine:
```bash
npm install
npm run dist:win
```
The compiled executables will be output to the `release/` directory.

---

## Project Structure

```
AkharStudio/
├── src/
│   ├── core/                  # Pure TypeScript business logic & engine
│   │   ├── editor/            # ProseMirror schema, keymaps, commands, autocomplete
│   │   ├── export/            # Certified PDF, Fountain, and text exporters
│   │   ├── model/             # Screenplay project models & draft schemas
│   │   ├── storage/           # Local filesystem manager & .akharbackup bundles
│   │   └── transliteration/   # Phonetic engine, lexicon ranking, custom dictionary
│   ├── main/                  # Electron main process & IPC handlers
│   │   └── database/          # SQLite schema & DatabaseManager (better-sqlite3)
│   ├── preload/               # Electron contextBridge preload scripts
│   └── renderer/              # React UI, components, modals, and design tokens
├── assets/                    # Bundled offline fonts (Noto Sans Gurmukhi, Courier Prime)
├── scripts/                   # Build helpers & SQLite binding automations
├── test/                      # Comprehensive Vitest test suites (254 tests)
├── .github/workflows/         # CI/CD and Windows packaging automation
├── plan.md                    # Release plan & engineering specifications
├── decisions.md               # Authoritative architectural decision record (DEC-001 - DEC-020)
└── package.json
```

---

## Governing Documents

The project architecture is strictly documented and governed by the following specifications:
- [`plan.md`](./plan.md) — Release phases, work packages, definitions of done, and verification gates.
- [`decisions.md`](./decisions.md) — 20+ architectural decisions detailing Unicode NFC policy, native platform boundaries, and PDF acceptance tiers.
- [`roman-input-convention.md`](./roman-input-convention.md) — Phonetic mapping rules, ambiguity resolution, and explicit diacritic control tokens.

---

## License

AkharStudio is open-source software licensed under the [MIT License](./LICENSE).

Copyright (c) 2026 **Arsh DSJ**.
