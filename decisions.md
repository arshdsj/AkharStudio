# decisions.md — Decision log

**Baseline:** V9.1. Statuses: **Accepted** (architecture review closed), **Proposed** (needs explicit approval), **Open** (decided by a Phase 0 result).
Template for new entries: ID · date · question · options · evidence and exact versions · acceptance criteria and results · licence implications · decision · trade-offs · reversal conditions · documents and feature IDs affected.

---

## DEC-001 — Consolidation baseline (Accepted)
V9.1 consolidates V7 and V8, with later review corrections taking precedence. It is authoritative; earlier revisions are historical, not inherited specifications. Project files must not be produced by concatenating older drafts. Apply focused edits to the existing project rather than rebuilding.
**Affects:** all documents.

## DEC-002 — Release split (Accepted)
V1.0 = all P0 work; V1.1 = all P1 work. This matches the Features document's "first usable release" (P0) and "full product" (P0+P1). Dual-priority IDs are split by acceptance criteria and counted once.
**Affects:** `plan.md` §2, `feature-crosswalk.md`.

## DEC-003 — Feature inventory (Accepted)
The source file contains **54** unique requirement IDs: 42 P0-only, 9 P1-only, 3 dual (`ORG-04`, `TOOL-01`, `I18N-01`). `A11Y-01` [P0] was missed by earlier counts and is included. Eight principle IDs are mapped but not counted. Counts were produced by extraction from the source and must be re-verified at sign-off.
**Affects:** `feature-crosswalk.md`.

## DEC-004 — Roman-to-Gurmukhi requirement (Proposed)
Add `I18N-02 — Roman Punjabi input to Gurmukhi` as a new P0 requirement (check for ID collision first; `I18N-01` exists, no `I18N-02` was found in the file). If accepted the inventory is 55. Specification lives in `features-amendments.md` §A1.
**Reversal:** if rejected, Roman input becomes unplanned scope and W3 (23–39 days) leaves the V1.0 plan.

## DEC-005 — Default input mode (Accepted)
Forgiving, candidate-based Roman Punjabi input. Ordinary Punjabi-mode input is case-insensitive. English mode is explicit and preserves case; capitalisation alone never switches mode. Writers must not need specialist markers for ordinary words (kitthe, putt, punjab, munda, kudi, zindagi).
**Trade-off:** ambiguity must be handled by ranked candidates and explicit selection; rules alone cannot infer every spelling.

## DEC-006 — Level 1A / 1B / 1C escalation (Accepted; outcome Open)
1A rules only (≤100 reviewed exceptions, no lexicon) is the Phase 0A1 baseline. 1B adds a small licensed static word list (filtering/ranking only). 1C is a bounded offline ranker needing a separate estimate. Phase 0A must record one outcome: A) accept 1A with evidence-based thresholds; B) adopt 1B; C) authorise 1C feasibility; D) no-go. Do not lower thresholds after a failure without a recorded decision and reviewer approval. Report correction rate and keystrokes per accepted word, not only top-5 coverage.
**Zero-tolerance rules (fixed):** no invalid/unassigned Unicode; no silent text loss; no unrecoverable composition; no corruption of committed text.
**Contingency:** +4–8 days if 1B is triggered.

## DEC-007 — Benchmark protocol (Accepted)
Three datasets: development (agent may tune), validation (independent diagnostics), sealed acceptance (reviewer-authored or reviewer-selected; ≥320 distinct cases, ≥40 scorable per category in eight categories). A failed sealed set never becomes development data; every retest uses a fresh frozen, hashed set; the agent receives category-level and aggregate results only. If reviewer-controlled retest sets cannot be provided, the benchmark must not be called blinded. Thresholds are provisional until the 1A baseline is measured and the reviewer approves the frozen protocol.

## DEC-008 — Explicit control tokens (Accepted; syntax pending reviewer approval)
Brace-delimited tokens, matched case-insensitively. Natural input remains default. Long form with short alias: `{ADDAK}` `{A}`, `{TIPPI}` `{TP}`, `{BINDI}` `{BD}`, `{PAIRIN-R}` `{PRR}`, `{PAIRIN-H}` `{PRH}`, `{DANDA}` `{DA}`, `{DOUBLE-DANDA}` `{DDA}`. Forced retroflex `{T}{TH}{D}{DH}{N}{R}{L}`; nukta `{KH-NUKTA}{GH-NUKTA}{J-NUKTA}{PH-NUKTA}`. No punctuation-suffixed markers (a sentence-final period must remain a period). No `{PH}` alias (avoids confusion with natural `ph`). Literal braces use a documented escape (doubled braces). Plain `q` is not mapped to ਕ਼ by default.

## DEC-009 — Third-party engines (Accepted)
- **Indic-Transliteration (Omzee15): rejected** as a typing engine; reference only. Findings in `libraries.md` §2.
- **Anvaad JS 1.5.1: excluded** from typing; possible future import/Romanization utility only after testing.
- External predictive engines: optional future improvement after independent evaluation against the same fixtures.

## DEC-010 — Editor framework (Open)
ProseMirror vs Lexical, identical Phase 0A2 spike; reject on data loss, composition corruption, broken undo, or failed performance gate; tie-break on fewer contenteditable hacks, then smaller dependency surface. Neither passes → one five-day remediation spike → no-go/revised architecture.

## DEC-011 — Keyboard contract (Accepted)
Enter with candidates shown accepts the candidate only; a second Enter performs the screenplay Enter. Space commits the candidate plus a literal space as one undo transaction. Tab with a popup open dismisses it and is consumed; the next Tab uses `EDIT-03` behaviour. Digits 1–6 are literal. Escape keeps the Roman buffer. Backspace immediately after a supported auto-commit restores the Roman buffer. Native IME composition is never transliterated mid-composition.
**Consequence:** `AC-01`/`EDIT-02`/`EDIT-03` wording is reconciled in `features-amendments.md` §A4.

## DEC-012 — Pending Roman buffer (Accepted)
At most one unresolved buffer per document. On blur it is preserved with its anchor, never committed, discarded or relocated implicitly. Invalid anchor → explicit resolution (accept candidate / keep as unresolved Roman draft / discard). Included in the transient recovery record, never serialised as committed text.

## DEC-013 — Platform boundary: Electron on macOS & Windows (Accepted; reversed from web-first)
The web-browser and website versions are removed from current scope entirely. The application will be built as native desktop applications for macOS and Windows using Electron with a pinned Chromium version. Bundling Chromium provides a uniform rendering engine with built-in HarfBuzz shaping across both platforms, avoiding WebKit/WebView2 line-breaking and shaping disparities. Bundled fonts (Noto Sans Gurmukhi and Courier Prime) and controlled font fallback are required, with pagination tested on both operating systems. All core writing, editing, transliteration, saving, and PDF generation work 100% offline with zero network dependency.

## DEC-014 — Paper sizes: US Letter and A4 in V1.0 (Accepted; promoted from P2)
Both US Letter (default, standard screenplay) and A4 (secondary selectable option, essential for writers in India) are included in V1.0. Both formats share the exact same screenplay formatting engine, using separate pagination profiles and automated export tests. A4 does not require a second editor implementation.

## DEC-015 — PDF route policy (Open)
Order: HappyPDF proof of concept → HappyPDF + controlled ActualText patch → custom HarfBuzz + PDF writer; pdfmake/pdf-lib/jsPDF only as targeted comparisons. First test is text extraction. Pinned fork or controlled patch with a rebase strategy for any patch. A failed Tier 1 gate means the specified release is not complete and triggers a product-level go/no-go; `window.print()` is a labelled convenience, never certified export.

## DEC-016 — PDF acceptance tiers and extractors (Accepted; tool choice Open)
Tier 1 (mandatory): shaping, embedding, logical extraction via two independent automated extractors, page dimensions, golden layout, offline generation, 120-page export, reviewer-approved visual goldens. Extractors: pinned Poppler `pdftotext` plus **MuPDF (provisional)** — Phase 0B must establish that it is genuinely independent of Poppler, its exact version, and its empirical correctness; if it fails, choose another independent engine (e.g. a specified PDF.js text API) and record why. Adobe Acrobat Reader is human-operated (version recorded), not a CI oracle. Tier 2: Chrome viewer, Firefox/PDF.js, Preview, Acrobat — status per behaviour: Supported / Supported with limitations / Unsupported / Release blocker.

## DEC-017 — Unicode policy (Accepted)
Canonical text is Unicode NFC, normalised at transaction boundaries including neighbouring clusters at the edit boundary; never during active IME composition; never glyph IDs. Normalisation is followed by validation on paste/import; problems yield recoverable warnings, not silent discard. NFC may leave decomposed base+nukta sequences for several Gurmukhi nukta letters (composition exclusions); this is expected.

## DEC-018 — Storage, backup and installed-app policy (Accepted)
Persistence requested once after the first explicit create/open, from the main thread, per storage context; result recorded; denial → warning plus backup action. Event-based backup prompts (not calendar-based). Safari tab and installed web app are separate storage contexts, tested independently, with backup before switching. The ITP exemption benefit for macOS Dock apps is **unverified** and must be tested.

## DEC-019 — Accessibility ownership (Accepted)
W3: popup combobox/listbox semantics, active-descendant, announcements. W1b and W5b: focus and keyboard checks of their dialogs and menus. W6: integrated regression and `A11Y-01` traceability.

## DEC-020 — Cross-cutting text requirements (Accepted)
Spellcheck off by default; `lang="pa"` / `pa-Guru` and document/PDF language metadata; Fountain forced element markers for Gurmukhi cues; generated labels follow a documented localisation setting.

## DEC-021 — Mobile (Accepted)
Separate release gate; not implied by desktop compatibility. Keep model and engine interfaces platform-independent.

## DEC-022 — Excluded scope (Accepted)
Romanization, generic legacy import (incl. AnmolLipi), and a "MORE" continuation feature are outside V1 and need new IDs. `CONT-01`/`CONT-02` are CONT'D only.

## DEC-023 — Reviewer and operator resources (Accepted)
Named primary and backup reviewer and operator before Phase 0A. Reviewer budget 42–68 h for acceptance plus one retest (separate from engineering). Operator budget 8–12 days. A test lacking its required hardware, viewer or operator is **blocked**, never passed.

## DEC-024 — Estimate policy (Accepted)
Estimates are planning ranges for one sequential agent. They are frozen only after requirements sign-off (crosswalk verified) and Phase 0 results. Extra P0 scope found by the crosswalk is estimated explicitly; no unbounded reserve.

## DEC-025 — CONT'D requirements (Accepted)
`CONT-01` = tri-state CONT'D setting with a once-per-project prompt. `CONT-02` = the rule for which repeated cues qualify. Neither concerns "MORE".

## DEC-026 — Dual-priority splits (Proposed; confirm at sign-off)
The source text does not itemise the P0/P1 parts of `TOOL-01` and `I18N-01`; proposed splits are in `features-amendments.md` §A3. `ORG-04` is explicit in the source (find = P0; replace, all-drafts, notes search = P1).

## DEC-027 — Wordlist pipeline correction and lexicon regeneration (Accepted)
Authorize correcting `build_wordlist.py` and regenerating the production lexicon. Requirements:
1. Restore legitimate single-character Punjabi words (`ਚ`, `ਆ`, `ਏ`, `ਜ`, etc.).
2. Correct Unicode validation without indiscriminately accepting malformed sequences; normalize and inspect rejected conjunct examples (`ਅੰਮਿ੍ਤਸਰ`, `ਉਨਾਂ੍ਹ`, `ਪਿ੍ਰੰਸੀਪਲ`).
3. Preserve original corpus and generation statistics (`out/stats.json`) for baseline comparison.
4. Add automated unit and regression tests before rebuilding.
5. Recalculate coverage curves (top-1k, 5k, 10k, 50k) and validate against independent Punjabi dialogue samples.

## DEC-028 — Transliteration validation protocol (Accepted)
Iterative human review on real Punjabi dialogue is the primary development workflow, paired with an automated regression dataset that continuously accumulates fixtures as mistakes are discovered. The 320-case blinded benchmark is retained as a pre-release acceptance gate rather than a blocker on every micro-iteration.

## DEC-029 — Early pagination and PDF prototype gate (Accepted)
Establish an early pagination and export prototype before building the complete editor. Validate HarfBuzz Gurmukhi shaping, dialogue wrapping, US Letter and A4 page boundaries, mixed Gurmukhi/Latin text, and automated Poppler `pdftotext` logical Unicode extraction.

## DEC-030 — Explicit keyboard priority state machine (Accepted)
Deterministically separate keyboard behaviors when the candidate popup is open versus closed:
- Space: Commits selected candidate + literal space (popup open) vs ordinary space (popup closed).
- Enter: Accepts candidate only without block creation (popup open) vs screenplay element transition (popup closed).
- Tab: Dismisses popup and consumes keystroke (popup open) vs element type picker (popup closed).
- Escape: Dismisses popup while preserving Roman buffer (popup open) vs normal UI cancel (popup closed).
- Up/Down: Navigates candidate list (popup open) vs navigates document caret (popup closed).
- Digits: Always literal input (never candidate selection shortcuts).

## DEC-031 — Phase 1 native desktop shell & atomic local storage architecture (Accepted)
Adopted modular desktop implementation:
1. Electron (v33.4.11 pinned) + TypeScript + React 18 + Vite bundler + Tailwind CSS.
2. Bundled local OFL fonts: `Noto Sans Gurmukhi` and `Courier Prime` located in `assets/fonts/` and `public/fonts/`.
3. Strict atomic `.scriptproject` file saving: JSON serialization staged into `.filename.tmp_<timestamp>` and renamed over target to eliminate any possibility of half-written file corruption (`STORE-01`, `SAFE-01`).
4. Dual-layer recovery system (`REL-01`): Debounced autosave with volatile recovery snapshots stored in app user directory, auto-detected and prompted on startup with non-destructive restore/discard options.
5. Strict UI specifications fulfilled for W1b: Two header rows (`UI-01`, `UI-02`, `UI-03`), centered paper canvas with US Letter and A4 support (`PAGE-01`, `PAGE-03`, `UI-05`, DEC-014), compact title card (`TITLE-01`, `TITLE-02`) with hover metadata drawer and toolbar element-selector lock, P0 bottom floating toolbar (`TOOL-01`) with exact button ordering and honest disabled states, and bottom-right status chip (`STAT-01`) with Unicode-aware word counting.

## DEC-032 — Phase 2 ProseMirror screenplay core, transitions & keyboard contract (Accepted)
Adopted ProseMirror as the production screenplay editor engine (closing DEC-010):
1. **Schema**: Strict semantic screenplay schema with 7 block types (`scene_heading`, `action`, `character`, `parenthetical`, `dialogue`, `transition`, `shot`), stable block IDs, and inline formatting marks (`bold`, `italic`, `underline`, `strikethrough`).
2. **Keyboard Transitions (`EDIT-02`, `T-03`)**: Deterministic Enter transitions for all 7 types, empty Dialogue -> Action conversion, and mid-block splitting.
3. **Element Picker (`EDIT-03`, `EDIT-04`)**: Tab on empty Action cycles element types; horizontal picker pill with S, A, C, P, D, T, SH badges and Mod+1..7 shortcuts.
4. **Autocomplete Engine (`AC-01..04`)**: Single-menu rule; Character suggestions in MRU order (Enter fills and transitions directly to Dialogue); Scene prefix suggestions (`INT.`, `EXT.`, `I/E.`); Transition suggestions (`CUT TO:`, `FADE IN:`, etc.).
5. **CONT'D Automation (`CONT-01`, `CONT-02`, `PAGE-02`, `T-05`, `T-06`)**: Deterministic speaker matching in same scene, prompt once per project, reversible display-level suffix without polluting raw document text.
6. **Scale & Performance Gate (`TM-09`, `PERF-01`)**: 3,000 blocks / 143 pages / 28,283 words tested with 2.69 ms conversion latency, 3.60 ms word/page counting, and 2.80 ms CONT'D scanning (well within the 50 ms budget).

## DEC-033 — Phase 3 Production Transliteration Engine & Keyboard Priority Integration (Accepted)
Formally accepted `I18N-02` (closing DEC-004) and Level 1B in-memory frequency trie architecture (closing DEC-006):
1. **Lexicon Architecture**: 100,000-word curated frequency trie compiled from Punjabi Wikipedia + IndicCorp v2 (741.5M tokens) bundled directly into local assets (`assets/data/punjabi_lexicon.json`).
2. **Dynamic User Dictionary (`W3`, `DEC-028`)**: Local storage-backed user dictionary that tracks explicitly selected candidates and boosts them to Rank 1 on subsequent typing.
3. **Sub-millisecond Latency (`TM-02`)**: Measured average lookup latency of 0.041 ms per query (well under the 30 ms threshold).
4. **Deterministic Keyboard Contract (`DEC-011`, `DEC-030`, `TM-03`)**: Space commits candidate + space as one transaction; Enter accepts candidate only without block transition; Escape/Tab dismisses popup; Backspace immediately after commit restores Roman buffer; Digits 1-9 are literal numbers.
5. **Native IME Immunity**: Native Gurmukhi IME composition takes precedence; transliteration engine stays dormant while OS composition is active.
6. **ARIA Accessibility (`TM-15`)**: Candidate popup exposes `role="listbox"` and `role="option"` with `aria-selected` and active-descendant keyboard navigation.

## DEC-034 — Phase 4 Certified Export, Dual-Profile PDF & Gurmukhi Fountain Interchange (Accepted)
Formally accepted the Phase 4 certified export architecture covering W4 & W5b:
1. **Dual-Profile PDF Generation (`PAGE-01`, `DEC-014`)**:
   - Separate, non-scaled geometry for US Letter (8.5 × 11 in, 1.5 in left margin, 1.0 in top/bottom/right) and A4 (210 × 297 mm, 38.1 mm left margin, 25.4 mm top/bottom/right).
   - Bundled offline OpenType fonts (`Noto Sans Gurmukhi` and `Courier Prime`) embedded as base64 in self-contained print templates.
   - Chromium headless `printToPDF` with `generateTaggedPDF: true` and CSS `@page` margins for 100% offline generation.
2. **Screenplay Layout & Anti-Orphan Engine (`PAGE-02`, `PAGE-03`, `ARCH-04`)**:
   - Running page headers on subsequent pages (`counter(page) "."`) with first-page header suppression (`PAGE-03`).
   - Anti-orphan rules (`ARCH-04`): `break-after: avoid` and `break-inside: avoid` on Character cues and Parentheticals; `break-inside: avoid` on Dialogue to prevent isolated character cues at page boundaries.
   - Separate title page card rendering (`EXPORT-01`).
3. **Plain Text Export (`EXPORT-01`, `PAGE-02`)**:
   - Industry-standard indentation metrics: Scene Heading (col 0), Action (col 0, wrap 60), Character (col 22), Parenthetical (col 16, wrap 30), Dialogue (col 10, wrap 35), Transition (col 45).
4. **Fountain with Gurmukhi Element Markers (`EXPORT-02`, `TM-16`)**:
   - Character cue forced with `@` prefix for Gurmukhi script names (addressing script lack of case).
   - Non-standard scene headings forced with `.` prefix; transitions forced with `>`.
   - Full semantic round-trip restoration of block types with strict Unicode NFC normalisation (`TM-14`).
5. **Native Project Bundle Interchange (`STORE-02`, `T-11`)**:
   - Atomic `.scriptproject` JSON bundle import/export with schema validation.
   - Clean fork into new project with fresh IDs when `asNewProject` is selected.
6. **Concurrency Safety (`EXPORT-01`)**:
   - Export processes operate exclusively on immutable project snapshots, ensuring live typing never corrupts an ongoing export.

## DEC-035 — Phase 5 In-Draft Search, Accessibility Hardening & Standalone Desktop Packaging (Accepted)
Formally accepted the Phase 5 release architecture covering W5, W6, and W7:
1. **In-Draft Search Engine (`ORG-04` P0, `T-12`, `TM-14`)**:
   - Keyboard-accessible find bar (`Cmd+F` / `Ctrl+F` and Header icon).
   - Non-destructive ProseMirror decoration overlays (`.search-match` and `.search-match-active`).
   - Match navigation (`findNextMatch` / `findPrevMatch`) with wrap-around and live count (`X of Y`).
   - Case-sensitivity and whole-word toggles with Unicode-aware boundary handling (`\p{P}|\s`).
   - Strict NFC normalization ensuring NFD search strings match NFC document text.
   - Transliteration buffer isolation: active composition buffers are never matched as committed text.
2. **Accessibility & Hardening (`A11Y-01`, `REL-01`, `ERR-01`)**:
   - Full ARIA 1.2 modal dialog compliance: `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` across all modals (`ExportModal`, `ProjectLibraryModal`, `RecoveryModal`, `HelpShortcutsModal`, `ContdPromptModal`).
   - Focus management: Escape dismisses dialogs and returns focus to active editor block.
   - Non-destructive crash recovery prompts and actionable save/backup error messages.
3. **Standalone Desktop Packaging (`W7`)**:
   - Production packaging with `electron-builder` targeting macOS (`dmg`, `zip`) and Windows (`nsis`, `portable`).
   - Native file associations registered for `.scriptproject` files.
   - 100% offline verification: fonts (`Noto Sans Gurmukhi`, `Courier Prime`) and 100k lexicon bundled locally with zero external network calls.

---

## Open decisions (owner / trigger)

| Decision | Trigger |
|---|---|
| DEC-004 `I18N-02` acceptance | Phase 0C (or earlier) |
| Convention freeze (`roman-input-convention.md`) | Reviewer approval, ≤5 working days from draft |
| DEC-006 Level 1 outcome | End of Phase 0A1 / Phase 0 prototype |
| DEC-010 Framework | End of Phase 0A2 (ProseMirror / TipTap) |
| DEC-015/016 PDF route and second extractor | End of Phase 0B prototype |
| DEC-026 dual-ID splits | Requirements sign-off |
| Print (P1) as separate package or within P1-10/15 | Requirements sign-off |
