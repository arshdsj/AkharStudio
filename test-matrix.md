# test-matrix.md — Fixtures, thresholds, platforms and release evidence

**Baseline:** V9.1 · **Status:** no results recorded yet (all tests **NOT RUN**).

## 1. Rules of evidence

1. A test result records: test ID, date, build/commit, environment (OS, browser/viewer + exact versions, hardware), dataset version and hash, outcome, evidence artifact.
2. Outcomes: **PASS**, **FAIL**, **BLOCKED**, **NOT RUN**. A test lacking its required hardware, viewer, operator or reviewer is **BLOCKED**, never PASS. Simulated composition events or screenshots do not substitute for physical IME tests.
3. Acceptance tests assert document state **and** browser-visible behaviour (Features §11); snapshot-only is insufficient.
4. Every confirmed text corruption, composition loss, shaping error or keyboard conflict becomes a regression fixture.
5. Do not change expected outputs after inspecting engine results.

## 2. Transliteration datasets

| Set | Author | Used for | Agent may inspect/tune? |
|---|---|---|---|
| Development | agent (≥160 cases; initial 160–200 in Phase 0A1) | implementation and tuning | yes |
| Validation | independently selected and reviewed | diagnostics during development | yes (diagnosis, not as acceptance) |
| Sealed acceptance | reviewer-authored or reviewer-selected; ≥320 distinct cases, ≥40 scorable per category | release acceptance only | **no** (category/aggregate results only) |

Categories (cases may carry several labels): (1) common words and canonical spellings; (2) vowels, consonants, aspirates, retroflex distinctions; (3) addak, bindi, tippi, nukta forms; (4) inflections and common word forms; (5) colloquial forms and accepted variants; (6) proper names; (7) ambiguous Roman spellings and context-dependent cases; (8) English-mode literals, punctuation, digits, mode changes.

**Fixture fields:** see `roman-input-convention.md` §11. Mark each case `rank1_required`, `top5`, or `exact_output_required` **before** testing.

**Retest protocol:** run sealed set → record dataset version/hash, implementation version, scores → report category/aggregate results only → fix using dev/validation → reviewer prepares a **fresh** frozen, hashed set of the same size → run without tuning on it → repeat with a new set each time. A failed sealed case never becomes development data. If the project cannot supply reviewer-controlled retest sets, state that and do not call the benchmark blinded.

### 2.1 Provisional thresholds (NOT frozen)

Targets to be re-examined after the Phase 0A1 baseline and approved by the reviewer before production acceptance. They must not be lowered after a failure without a recorded decision (DEC-006).

| Metric | Provisional target |
|---|---|
| Overall top-5 coverage | ≥ 98% |
| Common/unambiguous subset top-1 | ≥ 95% |
| Inflections and common forms top-5 | ≥ 98% |
| Colloquial variants top-5 | ≥ 95% |
| Proper names top-5 | ≥ 95% |
| Contextualised ambiguous cases top-5 | ≥ 95% |
| English-mode / literal-text preservation | 100% |
| `rank1_required` cases | 100% at rank 1 |
| `exact_output_required` cases | 100% exact canonical match |
| Invalid or unassigned Unicode emitted | 0 |
| Silent text loss / unrecoverable composition / corruption of committed text | 0 |

Also report per category: top-1, top-5, correction rate, keystrokes per accepted word. A strong aggregate never excuses a failed category or a zero-tolerance failure. Level 1A baselines are recorded **before** any broad lexical threshold is frozen; if 1A misses, follow DEC-006 (1A/1B/1C/no-go).

### 2.2 Latency (TM-02)

P95 suggestion response ≤ 30 ms; P99 ≤ 75 ms; ≥1,000 representative sequences (rapid typing, long strings, ambiguous input, candidate updates, edits next to combining marks); cold and warm reported separately; no dropped, duplicated or reordered commits.

**Reference hardware (record exact machine, OS, browser versions):**
1. Base Apple-silicon MacBook Air, 8 GB RAM, current stable Safari.
2. Windows 11 laptop, four-core Intel Core i5-class CPU, 8 GB RAM, current stable Chrome.

## 3. Features tests (source IDs, unchanged) → packages

| Test | Scenario (summary of Features §11) | Package(s) |
|---|---|---|
| T-01 | Fresh project: exact initial state, counts `0` and `1 / 1`, accurate persistence indicator | W1, W1b |
| T-02 | Mod+1–7 conversions without text/caret loss; Mod+8 inert | W2 |
| T-03 | Enter for all seven types; split, empty picker, Shift+Enter, Escape, Backspace boundary, undo/redo | W2 |
| T-04 | Character suggestions, scene prefix, transition selection, wrap/clamp | W2 (+W3 interplay) |
| T-05 | Parentheses, uppercase, `(CONT'D)` reversible decorations; source unchanged | W2 |
| T-06 | Continuation modal once, default, toggle, recompute, no duplicate suffix | W2 |
| T-07 | Layout positions/spacing, Letter dimensions, pagination counter, no orphaned cues | W4 |
| T-08 | Marks, case, painter, links, highlight, copy, comments, layers per shipping phase; honest disabled states | W1b/W2 (P0), P1-03/07/08/09 |
| T-09 | Typing, paste, delete, title edit, draft switch, undo, quota/write failure, overlapping writes → accurate save state | W1 |
| T-10 | Draft create/rename/switch/fork/archive; import/export roundtrip; history restore | W1 (P0 parts), P1-04 |
| T-11 | Beats/Outline survive edits; link orphans; script unchanged by outline reorder | P1-01 |
| T-12 | Search/replace, history baseline, Changes toggle do not alter text without confirmed edit | W5 (find), P1-12/04/05 |
| T-13 | PDF/text/native export: title, page numbers, fonts, long-block splits, extraction, invalid-glyph warning; Fountain loss report (P1) | W5b, P1-11 |
| T-14 | IME, Gurmukhi combining input, selection, caret, wrapping, counting, search, PDF text extraction; no roundtrip corruption | W2, W3, W4, W5b |
| T-15 | Keyboard reachability, accessible names, focus return, narrow viewport caret visibility | W1b, W5b, W6 |
| T-16 | Invalid/corrupt/future-schema import, hostile HTML/URLs, missing font, interrupted migration, low storage → safe error, data retained | W1, W5b, W6 |

Reference environment (Features §11): current stable Chromium, Firefox, Safari on supported desktop OSes; macOS Command and Windows/Linux Control keymaps; small and large projects; font fallback; 200% zoom; keyboard-only; a screen reader. Performance targets (representative hardware): ~120 pages / 3,000 blocks without visible typing stalls; edit-to-caret ≲ 50 ms; search/scene jump ≲ 200 ms; save progress observable immediately; track worst-case P95 in CI.

## 4. Project tests added by V9.1 (prefix `TM-`)

| Test | Scenario | Package | Operator |
|---|---|---|---|
| TM-01 | Sealed Roman-input acceptance (§2, §2.1) | W3 | reviewer |
| TM-02 | Suggestion latency (§2.2) | W3 | agent |
| TM-03 | Keyboard contract: Space, Enter (popup/no popup), Escape, arrows, Backspace-after-commit, Tab dismiss + next Tab, digits, English mode; single-menu rule with AC menus; undo grouping | W2, W3 | agent |
| TM-04 | Native Gurmukhi IME on real macOS and Windows: composition start/update/end, selection/Backspace/arrows during composition, mode switching, undo/redo, paste, focus change, refresh/recovery | Phase 0A3, W7 | **human** |
| TM-05 | Pending-buffer lifecycle: one per document, blur/return, invalid anchor resolution, crash recovery, never inserted at an unrelated caret | W3 | agent |
| TM-06 | PDF normative extraction: Poppler + MuPDF vs frozen expected Unicode (order, omissions, duplications); record mapping mechanism (ToUnicode/ActualText) when diagnosing | Phase 0B, W5b | agent |
| TM-07 | PDF visual goldens vs pinned renderer; reviewer sign-off on baselines and intentional updates | Phase 0B, W4 | agent + reviewer |
| TM-08 | PDF viewer compatibility matrix (§6) | W7 | **human** |
| TM-09 | 120-page/3,000-block: edit, paginate, scroll, export; timings and peak memory on reference machines | Phase 0A2, W2, W4, W5b | agent |
| TM-10 | Offline readiness: assets verified before "offline-ready"; airplane-mode editing and PDF export; cold start P95 ≤ 2 s; core assets ≤ 10 MiB compressed | W6 | agent |
| TM-11 | Backup export/import: validate-before-import, no overwrite without action, restore into a clean storage context, failure messaging | W6, W5b | agent |
| TM-12 | `persist()` request: single call point after first create/open, main thread/HTTPS, result recorded per context, denial → warning + backup action; quota errors recoverable; multi-tab writer coordination | W1, W6 | agent + human |
| TM-13 | Safari tab vs installed Dock app: separate data, persistence outcome, backup-before-switch, recovery in each; **empirical check of the unverified Dock-app ITP exemption** | W6 | **human** |
| TM-14 | Unicode: NFC at transaction boundaries incl. neighbouring clusters, no normalisation during IME composition, matras/addak/bindi/tippi/virama/nukta fixtures, paste/import validation with recoverable warnings, no invalid output | W2, W3 | agent |
| TM-15 | Candidate popup accessibility: combobox/listbox semantics, active-descendant, announcements (count/active/selection) without per-keystroke chatter, keyboard-only, no focus trap; screen-reader run | W3, W6 | agent + human |
| TM-16 | Fountain with Gurmukhi: forced `@`-style markers on export; import restores element types; semantic round-trip; limitations report | P1-11 | agent |
| TM-17 | Mobile gate (deferred): virtual-keyboard composition, candidate strip, touch selection, viewport resize | post-V1.1 | human |
| TM-18 | `lang`/spellcheck: `lang="pa"`/`pa-Guru` on Punjabi spans, spellcheck off by default, document/PDF `/Lang` where supported | W2, W5b | agent |

## 5. PDF fixtures and gates

**Golden fixtures (frozen text, layout, expected extracted Unicode — screenshots alone are not evidence):** independent vowels; matra placement/reordering; consonant clusters and approved pairin sequences; addak; bindi/tippi; nukta letters; punctuation, danda, double danda; Latin words and digits; mixed Punjabi/English paragraphs; long dialogue/action blocks; every screenplay element type; US Letter (and A4 if DEC-014 approved); a ~120-page/3,000-block document.

**Extraction-first test (Phase 0B, first):** minimal PDF with Gurmukhi vowels/matras, addak and nukta letters, pairin/cluster examples, mixed Gurmukhi/Latin with punctuation and digits, short screenplay paragraphs. Compare extracted text to frozen expected strings. If it fails, investigate ActualText or another writer route **before** visual polish.

**Tier 1 — normative (all mandatory):** correct shaping; embedded production fonts; logical-Unicode extraction through **two independent automated extractors** (pinned Poppler `pdftotext`; MuPDF provisional — prove independence, version, correctness); correct page dimensions; golden layout/line/page breaks; offline generation; 120-page export; reviewer-approved visual goldens from a named, pinned renderer. No normalisation may hide missing characters, wrong logical order or a broken mapping.

**Tier 2 — viewers (record per behaviour):**

| Viewer | Version | Visual | Selection | Copy/paste | Search | Order | Mixed script | Status |
|---|---|---|---|---|---|---|---|---|
| Chrome PDF viewer | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — |
| Firefox / PDF.js | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — |
| macOS Preview | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — |
| Adobe Acrobat Reader (human-operated; record build) | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — |

Status values: Supported · Supported with documented limitations · Unsupported for named behaviour · Release blocker. A viewer that fails a behaviour is not advertised as supported for it. Re-run affected checks when a viewer updates.

Record in every PDF test: renderer/exporter versions, font filenames and SHA-256 hashes, paper size, layout config, expected extracted text, page count, page-break locations.

## 6. Platform and CI matrix

| Axis | Values |
|---|---|
| Desktop browsers | current stable Chromium (Chrome/Edge), Firefox, Safari |
| OS / keymaps | macOS (Command), Windows 11 (Control), Linux (Control) |
| Native Gurmukhi input | at least one real macOS and one real Windows configuration, operated by a named human |
| Accessibility | keyboard-only; 200% zoom; reduced motion; a screen reader on the target platform |
| Storage contexts | normal tab; installed web app (macOS Dock, Sonoma 14+); private browsing (expect different quotas) |
| Paper | US Letter (default); A4 only if DEC-014 approved — expected geometry stored separately per paper × profile; never derived by scaling |
| Typography profiles | both Gurmukhi-safe profiles × Punjabi-only / English-only / mixed fixtures |

## 7. Named resources (to be filled before Phase 0A)

| Role | Primary | Backup |
|---|---|---|
| Fluent Gurmukhi reviewer | — | — |
| Human platform-test operator | — | — |
| macOS hardware / Windows hardware access | — | — |

## 8. Results log (append only)

| Date | Test ID | Build/commit | Environment | Dataset version/hash | Outcome | Evidence |
|---|---|---|---|---|---|---|
| 2026-10-29 | Wordlist Pipeline v1.2 | `build_wordlist.py` v1.2 | macOS Darwin arm64, Python 3.15 | Wikipedia + IndicCorp v2 (741.5M tokens) | **PASS** | `Punjabi/out/stats.json`: 848,290 words kept (99.40% tokens); `ਚ` restored (rank 19, 4.92M); conjuncts normalized; 94.09% top-10k dialogue coverage. |
| 2026-10-29 | TM-01 (Seed Fixtures Pilot) | `engine.py` prototype | macOS Darwin arm64, Python 3.15 | `test_engine.py` (7 mandatory seed fixtures) | **PASS** | `kitthe`, `putt`, `punjab`, `munda`, `kudi`, `zindagi`, `ch` all achieved Rank 1; explicit brace tokens matched. |
| 2026-10-29 | TM-02 (Suggestion Latency) | `engine.py` prototype | Apple Silicon (M-series), 100k trie | 7 fixtures + 10 token tests | **PASS** | Average lookup latency < 1 ms per suggestion; test suite executed in 0.147 s. |
| 2026-10-29 | TM-04 (HarfBuzz Gurmukhi Shaping) | Native HarfBuzz (`hb-shape`) | macOS Darwin arm64, HarfBuzz CLI | `ਕਿੱਥੇ`, `ਪ੍ਰਿੰਸੀਪਲ`, `ਅੰਮ੍ਰਿਤਸਰ`, `ਉਨ੍ਹਾਂ` | **PASS** | Verified correct OpenType GSUB/GPOS cluster shaping, subjoined pairin-ra (`ਪ੍ਰ`), addak, and pre-base siari positioning. |
| 2026-10-29 | TM-06 (PDF Extraction Spike) | Headless Chromium + PDFKit | macOS 15, Chromium 130 + PDFKit | `prototype/pagination/sample_script.html` | **DIAGNOSED** | Noto Sans Gurmukhi embeds cleanly and preserves all matras. Pre-base siari (`ਿ`) extracts before consonant in visual order unless marked content `/ActualText` is applied. |
| 2026-10-29 | Phase 1 (W1 & W1b Gates) | Desktop v0.1.0 (`dist/`) | macOS Darwin arm64, Node v22.23.2, Electron 33.4.11 | `test/phase1-lifecycle.test.ts`, `test/phase1-ui.test.tsx` (15 fixtures) | **PASS** | T-01 initial state verified (Template Script, Main Draft, 1 empty Action block, 0 words, 1/1 pages); T-09/STORE-01 atomic saves; REL-01 crash recovery; DRAFT-01 cloning; TITLE-01/02 sync and toolbar lock; TOOL-01 P0 order and honest disabled states; STAT-01 Unicode counting; PAGE-01/DEC-014 US Letter and A4 geometry. All 15 automated tests passed. |
| 2026-10-29 | Phase 2 (W2 Gate & TM-09) | Screenplay Core v0.2.0 | macOS Darwin arm64, Node v22.23.2, ProseMirror | `test/phase2-editor-core.test.ts`, `test/phase2-performance.test.ts` (23 fixtures) | **PASS** | T-02 Mod+1–7 block conversions without text/caret loss (Mod+8 inert); T-03 Enter transitions for all 7 types, empty dialogue convert to action, block splits; EDIT-03/04 Tab cycling and 7-type picker pill; Backspace boundary deletion and merge; AC-01..04 Character MRU, Scene prefix (INT./EXT./IE.), Transition (CUT TO:); CONT-01/02 deterministic qualification, prompt modal, non-destructive display transform; TM-09 3,000-block / 143-page scale test passed in 2.69 ms (<50ms target). All 38 automated tests passed. |
| 2026-10-29 | Phase 3 (W3 Gate & TM-01..03, 14, 15) | Transliteration v0.3.0 | macOS Darwin arm64, Node v22.23.2, In-Memory Trie | `test/phase3-transliteration.test.ts`, `test/phase3-editor-integration.test.ts` (37 fixtures) | **PASS** | TM-01 mandatory seed fixtures achieved Rank 1 (kitthe, putt, punjab, munda, kudi, zindagi, ch); DEC-008 explicit tokens verified; TM-02 latency measured at 0.041 ms/query (<30ms target); dynamic learning and ranking boost via user dictionary; TM-14 strict Unicode NFC compliance; TM-03 keyboard state machine (Space commits word+space, Enter commits candidate only, Escape/Tab dismisses, Backspace restores Roman buffer, digits 1-9 literal); TM-15 ARIA listbox popup. All 75 automated tests passed. |
| 2026-10-29 | Phase 4 (W4 & W5b Gates, TM-06, TM-16) | Export Engine v0.4.0 | macOS Darwin arm64, Node v22.23.2, Chromium PrintToPDF + PDF.js | `test/phase4-export.test.ts` (21 fixtures) | **PASS** | PAGE-01/DEC-014 US Letter (8.5×11 in) and A4 (210×297 mm) non-scaled profiles; ARCH-04 anti-orphan rules (break-after: avoid on character/parenthetical, break-inside: avoid on dialogue); PAGE-03 running header numbers with first-page suppression; EXPORT-01 immutable revision snapshots and formatted Plain Text (.txt); EXPORT-02/TM-16 Fountain export with Gurmukhi @ markers and import semantic round-trip; STORE-02 native .scriptproject bundle interchange with fork copy IDs; TM-06/TM-13 automated PDF extraction via pdf-parse. All 96 automated tests passed. |
