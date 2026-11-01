# plan.md — Punjabi Screenplay Editor

**Baseline:** V9.1 (consolidates V3–V9; V9.1 applies five amendments to V9)
**Authority:** releases, phases, work packages, dependencies, estimates, gates, definition of done.
**Estimate unit:** engineering person-days for one sequential implementation agent. Reviewer hours and human-operator days are separate (§12).

## Sign-off status

| Item | Status |
|---|---|
| Architecture review | **CLOSED** (V9.1) |
| Requirements sign-off | **OPEN** — reserved until `feature-crosswalk.md` has been checked against the actual `Features_and__beheaviour.md` |
| Roman-input requirement (proposed `I18N-02`) | **PROPOSED** — needs ID-collision check and formal acceptance |
| A4 paper size (promotion from P2) | **PROPOSED** — see `decisions.md` DEC-014 |
| Roman-input convention | **DRAFT v0.1** — not frozen; needs reviewer approval |

Nothing in this plan is "airtight". Each remaining technical risk is attached to a named gate (§9, §13) so a failure stops the affected work instead of being absorbed silently.

---

## 1. Product definition

A desktop-first, browser-based, local-first screenplay editor for writing Punjabi in Gurmukhi Unicode, with natural Roman Punjabi input, screenplay formatting, reliable local persistence and certified client-side PDF export.

It must:

- work locally with no account and no server for core editing, recovery and PDF export;
- store canonical screenplay content as Unicode (NFC), never Roman input or font glyph data;
- offer candidate-based Roman-to-Gurmukhi typing that coexists with native Gurmukhi keyboards and IMEs;
- preserve screenplay structure, selection and undo/redo;
- provide the layout, typography and export behaviour of the Features specification;
- work offline once required assets are cached;
- provide explicit backup, recovery and storage-risk handling;
- stay usable with about 120 pages and 3,000 blocks.

**Not baseline dependencies:** Electron/Tauri, cloud sync, accounts, external AI or transliteration services. Mobile has a separate release gate (§10.6).

## 2. Scope and releases

### 2.1 Feature inventory (verified by extraction from the source file)

| Classification | Count |
|---|---:|
| P0-only | 42 |
| P1-only | 9 |
| Dual P0/P1 (`ORG-04`, `TOOL-01`, `I18N-01`) | 3 |
| **Total existing IDs** | **54** |

Plus 8 principle IDs (`VIS-01`, `UX-01`, `DOC-01`, `SAFE-01`, `PERF-01`, `EXT-01`, `NAI-01`, `COMP-01`) mapped in the crosswalk but not counted as features. The proposed `I18N-02` is not in the 54; if accepted the inventory becomes 55.

### 2.2 V1.0 — first usable release (P0)

All 42 P0-only IDs; the P0 criteria of the three dual IDs; Roman-to-Gurmukhi typing (`I18N-02`, if accepted); all supporting architecture, accessibility, reliability, security and regression work.

### 2.3 V1.1 — P1 feature-complete release

All nine P1-only IDs; the P1 criteria of the three dual IDs. Dual IDs are split by acceptance criteria and never counted twice. P1 includes `EXPORT-02` (Fountain **import and export**, preview, limitations report), `ORG-04` replace/all-drafts/notes search, `NOTICE-01` share, `UI-04` help/profile, Beats/Outline, sidebar/right panel/scene navigator, comments and layers, History and Changes, notifications, highlight, format painter, links.

### 2.4 Outside V1 unless separately approved and given IDs

Gurmukhi-to-Roman Romanization; generic legacy-font/document import (including AnmolLipi conversion); a "MORE" continuation feature (not specified by any existing ID); corpus-trained predictive ranking beyond the approved Level 1 system; mobile editing; P2 items in Features §1.1 (other interchange formats, alternate templates, backup destinations, desktop packaging, etc.).

## 3. Governing documents

| Document | Owns |
|---|---|
| `plan.md` | releases, phases, packages, estimates, gates |
| `Features_and__beheaviour.md` | existing IDs, priorities, user-visible wording and acceptance criteria (read-only source; amended only via `features-amendments.md` after approval) |
| `features-amendments.md` | proposed patches to the Features document |
| `feature-crosswalk.md` | every ID → release → package → tests |
| `libraries.md` | candidate dependencies, versions, licences, reference register, investigation findings |
| `decisions.md` | accepted/proposed decisions and rationale |
| `roman-input-convention.md` | Roman input rules and approved examples |
| `test-matrix.md` | fixtures, thresholds, hardware, tests, release evidence |

If two documents disagree, edit the owning document. Features' original Phase 0–9 roadmap is **superseded** by §11 (mapping in §14); its IDs and acceptance criteria are retained unchanged.

## 4. Architecture principles

- Browser-first, local-first; IndexedDB for documents and recovery data; Cache Storage and the service worker hold assets only.
- Typed semantic blocks are the source of truth (`DOC-01`); layout is derived (`ARCH-04`).
- All edits are transactions through a typed command pipeline (`ARCH-03`, `MODEL-03`).
- The uncommitted Roman buffer lives outside the canonical document.
- The input subsystem produces committed Unicode; the document model owns screenplay structure; neither depends on the PDF exporter.
- No external service is needed for typing, editing, recovery or PDF export.

## 5. Roman Punjabi input

Details: `roman-input-convention.md`, `decisions.md` DEC-005 to DEC-008, `test-matrix.md` §2–3.

- **Default:** forgiving, candidate-based input (case-insensitive in Punjabi mode); English mode is explicit and preserves case.
- **Level 1A (baseline):** rules only — tokenizer, candidate generation, orthographic constraints, ranking heuristics, ≤100 reviewed exceptions, no lexicon.
- **Level 1B (conditional):** small, licensed, redistributable static word list, used for filtering/ranking only.
- **Level 1C (conditional, separately estimated):** bounded offline ranker promoted from Level 2.
- **Phase 0A decision:** A) accept 1A with evidence-based thresholds; B) adopt 1B; C) authorise a 1C feasibility phase; D) no-go. Thresholds are never lowered after a failure without a recorded decision and reviewer approval.
- **Zero-tolerance rules:** no invalid/unassigned Unicode; no silent text loss; no unrecoverable composition; no corruption of committed text.
- **Optional Level 2 (future, not in V1):** an offline ranking layer, only with documented corpus provenance, a licence permitting redistribution of derived data, a frozen evaluation set, bundle ≤2 MiB compressed, and no network or AI-service dependency.

### 5.1 Engine interface

`initialize()`, `suggest(input, context, requestId, signal)`, `recordSelection(candidate, context)`, `addUserEntry(entry)`, `dispose()`. Stale results are discarded on any input/caret/document change. Heavy work moves to a worker if needed for latency. Candidate generation prunes with orthographic constraints before ranking; never truncate an unbounded Cartesian product.

## 6. Editor framework and keyboard contract

**Framework:** ProseMirror vs Lexical, identical Phase 0A2 spike (buffer isolation, candidates, native IME, selection/undo, grapheme-safe Backspace/arrows, paste, screenplay commands, popup accessibility, offline start, 120-page/3,000-block document). Reject any framework that loses text, corrupts composition, breaks undo or fails the performance gate. If both pass, prefer fewer custom contenteditable hacks, then smaller dependency surface. If neither passes: one five-day remediation spike, then stop and record a no-go/revised architecture.

**Keyboard contract (authoritative; amends AC-01/EDIT-02/EDIT-03 interplay):**

| Input | Behaviour |
|---|---|
| Space, popup shown | commit selected candidate + literal space as one undo transaction |
| Enter, popup shown | accept candidate only; no block creation from the same keypress |
| Enter, no popup | screenplay Enter rule (EDIT-02) |
| Escape | dismiss popup; keep Roman buffer |
| Up/Down | change highlighted candidate only |
| Backspace right after supported auto-commit | restore Roman buffer and caret |
| Tab, popup shown | dismiss popup and consume the key |
| next Tab | normal focus/element-picker behaviour (EDIT-03) |
| Digits 1–6 | literal input |
| Native IME composing | never transliterate intermediate composition text |

**Pending buffer:** at most one unresolved buffer per document. On blur it is preserved with its anchor — never committed, discarded or relocated implicitly. If the anchor becomes invalid the user must resolve it (accept a candidate / keep as unresolved Roman draft / discard). It is included in transient crash-recovery records but never serialised as committed text.

## 7. Unicode, storage, recovery, offline

- Canonical text is Unicode; commit spans are NFC-normalised at transaction boundaries (including neighbouring clusters at the edit boundary); active IME composition is never rewritten.
- Test matras, addak, bindi, tippi, virama, nukta forms; never store glyph IDs as text.
- **Recovery:** IndexedDB plus a separate transient recovery record; transactional writes; never silently replace a saved document; preserve the last known good copy on failed write/migration; explicit restore/discard; multi-tab single-writer coordination per `STORE-01`.
- **Persistence request:** after the user's first explicit create/open action, if supported and not already granted, call `navigator.storage.persist()` from the **main thread** (not available in Workers; HTTPS only). Record the result per storage context. Do not re-request at every startup.
- **Safari reality (documentation-verified, see `libraries.md` §4):** best-effort storage can be evicted; WebKit's tracking-prevention page describes deletion of script-writable storage after seven days without user interaction with the site; a persistence request is granted by heuristics (e.g. use as a home-screen web app). Plan on a denied request in ordinary tabs. Eviction deletes an origin's data as a whole.
- **Backups:** export offered after first successful save; one non-modal reminder per session after meaningful edits not yet in a backup; always-available export; portable versioned format; validate before import; never overwrite without an explicit action; accurate failure messages.
- **Installed web app (macOS Add to Dock, Sonoma 14+):** separate website data from Safari. Offer backup before switching contexts, provide import, request persistence per context, and test both contexts independently. The ITP-exemption benefit for Dock apps is **not yet empirically verified**.
- **Offline:** service worker with content-hashed assets and a versioned manifest; declare offline-ready only after all required assets are verified; do not delete assets an active session needs; updates only at safe boundaries; migrations transactional. Budgets: core assets ≤10 MiB compressed; offline cold start P95 ≤2 s on reference hardware (targets, not measurements).

## 8. Layout, typography and PDF

### 8.1 Page and typography
US Letter (612 × 792 pt) is the default (`PAGE-01`). A4 (≈595.276 × 841.890 pt) is a separately selected format and a **proposed promotion from P2** (DEC-014). Never silently scale one into the other. Both typography profiles are Gurmukhi-safe. Candidate fonts: Noto Sans Gurmukhi and Courier Prime, subject to coverage tests and licence review. Editor measurement and PDF drawing share a script/font run model: split runs at valid script/font boundaries without breaking grapheme or shaping clusters, pick the font before shaping, keep the logical-text mapping, measure with the fonts actually used, never stretch or clip glyphs.

### 8.2 PDF route policy
Order: (1) HappyPDF proof of concept; (2) HappyPDF with a controlled ActualText patch if warranted; (3) custom HarfBuzz + PDF writer; pdfmake/pdf-lib/jsPDF are targeted comparison candidates only. **Extraction-first:** the first test is text extraction on a minimal Gurmukhi/mixed-script PDF, before any visual polishing.

**Tier 1 — normative conformance (all mandatory):** correct Gurmukhi shaping; font embedding; logical-Unicode extraction through two independent automated extractors (pinned Poppler `pdftotext`, and provisionally **MuPDF**, whose independence, exact version and empirical correctness Phase 0B must establish); correct page dimensions; golden layout/line/page breaks; offline generation; 120-page/3,000-block export; reviewer-approved visual goldens from a named, pinned renderer.

**Tier 2 — viewer compatibility (recorded separately):** Chrome PDF viewer, Firefox/PDF.js, macOS Preview, Adobe Acrobat Reader (human-operated, version recorded). Each viewer gets: Supported / Supported with documented limitations / Unsupported for named behaviour / Release blocker. A failing viewer is never advertised as supported for that behaviour.

`window.print()` may be offered as a separate convenience feature, never as a substitute for certified export. A failed Tier 1 gate means the specified release is **not complete**; it triggers a product-level go/no-go decision, not a silent downgrade.

## 9. Cross-cutting requirements (V9.1 restored)

1. **Spellcheck:** off by default (set `spellcheck=false`) until a Gurmukhi dictionary is independently validated.
2. **Language metadata:** `lang="pa"` (Gurmukhi script: `pa-Guru`) on Punjabi spans, `en` on English; document-level language and PDF `/Lang` metadata where the exporter supports it.
3. **Accessibility is cross-cutting:**
   - **W3** owns candidate-popup ARIA combobox/listbox semantics, active-descendant handling and candidate announcements (announce count/active option/selection without reading every keystroke; fully keyboard-operable; no focus trap).
   - **W1b and W5b** own the focus-management and keyboard checks of their dialogs, menus, headers and export dialog.
   - **W6** owns integrated accessibility regression and `A11Y-01` traceability.
4. **Recoverable paste/import validation:** normalise to NFC, then validate (invalid scalar values, replacement characters, unassigned code points in script ranges, suspicious combining sequences). Problems produce a recoverable warning or preview, never silent discard (aligns with `SEC-01`, `ERR-01`, `T-16`).
5. **Fountain element markers:** Gurmukhi has no case, so uppercase-based Character detection fails. Export uses explicit forced markers (e.g. `@` for Character cues, `.` for Scene headings where needed); import recognises them and restores element types; round-trip tests compare semantic structure, not just visible text.
6. **Mobile:** separate release gate (virtual-keyboard composition, candidate strip, touch selection, viewport resizing). Desktop acceptance never implies mobile support; keep the document model and engine interface platform-independent.
7. **Generated labels** (CONT'D, scene prefixes) follow a documented localisation setting; screenplay syntax is never silently translated.
8. **No telemetry without explicit consent** (`SEC-01`).

## 10. Phase 0 — feasibility and reconciliation

Runs sequentially: 0A1 → 0A2 → 0A3 → (0A4 if triggered) → 0B → 0C.

| Phase | Scope | Days |
|---|---|---:|
| 0A1 | Convention draft; dev fixtures; reviewer feedback; rules prototype; harness; category baseline and latency; Level 1A sufficiency decision | 7–10 |
| 0A2 | ProseMirror vs Lexical spike; framework selection or no-go | 5–7 |
| 0A3 | Real macOS/Windows native IME tests; key conflicts, blur, composition; popup accessibility; offline start and asset size | 5–8 |
| 0A4 | **Conditional** Level 1B feasibility (word-list discovery, licence/provenance, proof of concept, re-baseline, decision) | 4–8 |
| 0B | Extraction-first HappyPDF test; targeted comparisons; visual/Unicode oracle setup; ActualText feasibility; route selection and budget | 10–14 |
| 0C | Full crosswalk verification; accept/reject `I18N-02`; release split; convention and keyboard decisions; PDF tiers; PAGE-01/A4; update all documents | 2–3 |

**Phase 0 total:** 29–42 days (0A1+0A2+0A3 = 17–25; +0B 10–14; +0C 2–3). With 0A4: 33–50. Level 1C requires a separate change estimate.

**Before 0A:** named primary and backup reviewer; named human operator (and backup); access to real macOS and Windows Gurmukhi input; draft convention and fixture structure; corrected scope classification.
**Before production Level 1:** approved convention; measured 1A baseline; explicit 1A/1B/1C decision; approved thresholds; reviewer-owned sealed benchmark; recorded reviewer-hour budget.
**Before production PDF:** extraction-first result; pinned extractors and renderer; viewer policy; ActualText decision; route budget and go/no-go.

## 11. Production work packages (V1.0) and exit gates

Order: W1 → W1b → W2 → W3 → W4 → W5 → W5b → W6 → W7 (PDF engine integrated at W4/W5b). Each package ends with a runnable vertical slice; no later package starts on an unverified data model.

| Pkg | Scope (IDs) | Days |
|---|---|---:|
| W1 | `PROJ-01`, `DRAFT-01`, `TITLE-01`, `TITLE-02`, `MODEL-02`, `STORE-01`, `SAVE-01` (state machine), `ERR-01`, `REL-01`, `SEC-01`, `ARCH-01/02/03/05` foundations, autosave, transient recovery, multi-tab writer coordination | 10–16 |
| W1b | `UI-01`, `UI-02`, `UI-03`, `UI-05`, `TOOL-01` (P0), `TOOL-02`, `STAT-01`, `UX-02`, `SAVE-01` chip presentation | 8–14 |
| W2 | `MODEL-01/03/04`, `EDIT-01..05`, `AC-01..04`, `CONT-01`, `CONT-02`, `I18N-01` (P0 editing), `PAGE-02` display transforms/semantics, selection/caret/undo, remaining P0 editor IDs | 18–28 |
| W3 | Production Level 1 input per `I18N-02`; natural candidates; nasal/doubled-consonant rules; ranking; buffer lifecycle; popup ARIA; benchmark/latency regression | 23–39 |
| W4 | `PAGE-01`, `PAGE-02` (layout spec), `PAGE-03`, `ARCH-04` verification; US Letter default; A4 (if approved); both profiles; run splitting; editor↔PDF measurement consistency | 10–15 |
| W5 | `ORG-04` P0: find only | 2–4 |
| W5b | `EXPORT-01` (dialog, TXT, immutable snapshot), `STORE-02` (native `.scriptproject` export/import to a new project), export routing to the certified engine, failure handling | 5–9 |
| W6 | Service worker/manifest, persistence request, backups, quota handling, installed-app contexts, `A11Y-01`, integrated a11y regression, `REL-01`/`ERR-01` integration | 7–12 |
| W7 | Full P0 regression, packaging, licence audit, evidence | 8–13 |

**Exit gates**

- **W1:** project/draft/title lifecycle tests pass (T-01, T-09, T-10 P0 parts, T-16); no silent overwrite or false save-success; multi-tab conflict shows read-only/transfer/fork; every assigned ID has recorded evidence.
- **W1b:** shell and both header rows match the Features criteria; P0 toolbar order and honest disabled states; status chip accurate; menus behave (Escape/click-outside/viewport); responsive tests pass; dialogs/menus pass focus-management checks; no keyboard conflicts with editing or transliteration. `TOOL-02` operational behaviour is verified when W2 exits.
- **W2:** T-02–T-06 pass; `CONT-01/02` pass their real acceptance criteria; AC menus follow single-menu rule with the keyboard contract; 120-page/3,000-block performance case passes or has a documented blocker; keyboard/IME regression passes.
- **W3:** approved thresholds pass on a fresh sealed set; popup ARIA/announcement checks (TM-15) pass; native-input regression passes; zero-tolerance Unicode/recovery tests pass; latency targets met on reference hardware.
- **W4:** T-07 passes; `PAGE-01/02/03` and `ARCH-04` verified; correct page geometry; no grapheme/cluster splitting in runs; 120-page layout case passes.
- **W5:** find meets `ORG-04` P0; does not corrupt Unicode or structure; pending buffers never searched as committed text.
- **W5b:** T-13 passes; export dialog focus/keyboard checks pass; TXT fixtures pass; revision snapshot provably stable; `.scriptproject` round-trips to a new project; failed/cancelled export never mutates project data; PDF routing invokes the certified engine.
- **W6:** offline-ready status accurate; offline editing and PDF export work in airplane mode; backup/restore pass; persistence denial and quota failure recoverable; T-15 and TM-15 pass; `A11Y-01` criteria pass.
- **W7:** all 42 P0-only IDs and the P0 portions of the 3 dual IDs pass; `I18N-02` passes; Tier 1 PDF gate and Tier 2 policy recorded; human IME/platform results recorded; release build, licence audit, documentation complete. No P1-only item is required.

## 12. PDF engine estimates, V1.0 totals, V1.1

| PDF route (alternatives, never summed) | Days |
|---|---:|
| Unmodified HappyPDF passes | 8–12 |
| HappyPDF + controlled ActualText patch | 16–27 |
| Custom HarfBuzz + PDF writer | 25–45 |

**V1.0 = Phase 0 (29–42) + W1–W7 (91–150) + PDF route.** (W-package sums: low 10+8+18+23+10+2+5+7+8 = 91; high 16+14+28+39+15+4+9+12+13 = 150.)

| PDF route | V1.0 | with 0A4 (+4–8) |
|---|---:|---:|
| Unmodified HappyPDF | **128–204** | 132–212 |
| Patched HappyPDF | **136–219** | 140–227 |
| Custom writer | **145–237** | 149–245 |

### V1.1 — P1 packages (days)

| ID | Package | IDs | Days |
|---|---|---|---:|
| P1-01 | Beats and Outline boards | `ORG-01`, `ORG-02` | 5–8 |
| P1-02 | Sidebar, right panel, scene navigator | `ORG-03` | 4–7 |
| P1-03 | Comments and annotation layers | `COMMENT-01`, `TOOL-01` (layer/comment) | 6–10 |
| P1-04 | History checkpoints | `HIST-01` | 4–6 |
| P1-05 | Changes diff view | `CHANGE-01` | 5–8 |
| P1-06 | Notifications (bell/local alerts, excluding share) | `UI-04` bell, `NOTICE-01` bell | 2–3 |
| P1-07 | Highlight | `TOOL-01` | 2–3 |
| P1-08 | Format painter | `TOOL-01` | 2–4 |
| P1-09 | Links | `TOOL-01` | 2–3 |
| P1-10 | Cross-module integration, accessibility, P1 regression | `I18N-01` P1, `COMP-01` | 6–10 |
| P1-11 | Fountain import/export, preview, limitations report | `EXPORT-02` | 6–11 |
| P1-12 | Replace, all-drafts scope, notes search | `ORG-04` P1 | 5–9 |
| P1-13 | Share behaviour | `NOTICE-01` share | 2–4 |
| P1-14 | Help and profile | `UI-04` help/profile | 3–5 |
| P1-15 | Cross-feature integration for restored P1 work | — | 3–5 |
| | **Total P1 expansion** | | **57–96** |

| PDF route | V1.1 cumulative |
|---|---:|
| Unmodified HappyPDF | **185–300** |
| Patched HappyPDF | **193–315** |
| Custom writer | **202–333** |

Add 4–8 days if 0A4 is triggered. Level 1C, Romanization, legacy import and mobile are excluded. **Estimate freeze rule:** these are planning ranges, not commitments, until requirements sign-off (crosswalk verification) and the Phase 0 results are in.

### Human and reviewer budgets (separate from engineering)

- **Human operator:** 8–12 person-days (real macOS/Windows Gurmukhi IME 3–4; Preview/Acrobat/browser viewer checks 2–3; cross-platform regression and sign-off 3–5). Name a primary and backup before Phase 0A. A physical-platform test is never "passed" from simulation or screenshots.
- **Reviewer:** initial 320-case sealed set 18–28 h; each fresh retest set 18–28 h; 30-case pilot 2–4 h; convention review and adjudication 4–8 h. **Initial acceptance plus one retest: 42–68 h.** A reserve bank is budgeted when authored, not when selected. Convention review: 3 working days for feedback (agent continues on the draft); 5 working days to approval or escalation to the backup reviewer.

## 13. Risk and gate register

| Risk | Gate / mitigation |
|---|---|
| Lexicon-free rules cannot reach usable candidate quality | Phase 0A1 baseline → 1A/1B/1C/no-go decision |
| HappyPDF extraction defect (source review predicts per-glyph ToUnicode problems for reordered clusters) | Extraction-first test; ActualText patch scenario; custom route |
| Viewer disagreement on ActualText | Two-tier PDF policy with explicit supported/unsupported decisions |
| Neither editor framework passes IME/performance | Five-day remediation spike, then no-go |
| Safari storage eviction / persist denied | Backup UX, warnings, per-context persistence, PWA tests |
| Reviewer unavailable or slow | Dated deadlines, backup reviewer, agent continues on draft |
| Human operator or hardware unavailable | Test marked **blocked**, never passed |
| Unlisted P0 scope discovered by crosswalk | Estimate explicitly; no hidden reserve |
| A4 not approved | Remove A4 from W4/W7 gates and re-estimate (DEC-014) |

## 14. Mapping of the Features document's old phases

| Features phase | Superseded by |
|---|---|
| 0 Foundation & design contract | Phase 0 (0A–0C) |
| 1 Project shell & storage | W1, W1b |
| 2 Core screenplay editor | W2 |
| 3 Suggestions and continuation | W2 (`AC`, `CONT`), W3 (input popup interplay) |
| 4 Rich editing, title, local workflows | W1 (title, drafts), W1b (toolbar), W2 (marks, undo), W5 (find) |
| 5 Pagination, printing, export, hardening | W4, W5b, W6, W7 |
| 6 Story planning and navigation (P1) | P1-01, P1-02, P1-12 |
| 7 Professional editing & review (P1) | P1-03 to P1-09 |
| 8 Interoperability, polish, full release (P1) | P1-10 to P1-15 |
| 9 Optional extensions (P2) | Outside V1 |

Print (P1 in Features §1.1) is covered under P1-10/P1-15 integration unless split into its own package at sign-off.

## 15. Definition of done

**Phase 0:** crosswalk complete and verified; convention approved; Level 1A baseline measured and the 1A/1B/1C/no-go decision recorded; framework selected or no-go recorded; extraction-first PDF results recorded; normative extractors and visual renderer pinned; reviewer/operator availability agreed; documents reconciled.

**V1.0:** every P0 requirement passes (including `A11Y-01`); project/draft/title/shell/menu/toolbar pass; `AC-01..04` and `CONT-01/02` pass per their real wording; export dialog, TXT, immutable snapshot and `.scriptproject` pass; approved Roman input passes; `PAGE-01` and pagination pass; PDF Tier 1 gate passes and Tier 2 decisions are documented; offline, storage, backup and recovery gates pass; human IME tests pass; nothing mandatory silently deferred.

**V1.1:** all nine P1-only IDs and the P1 portions of the three dual IDs pass, including Fountain import/export with preview and limitations report, replace/expanded search, share, help/profile, boards and panels, comments/layers, checkpoints and Changes, notifications and formatting tools; full P1 regression and accessibility pass. A requirement is never complete merely because its UI exists; behaviour, persistence, undo/recovery and regression tests must pass.

**Release rule:** V1.0 is not complete while any mandatory P0 test, native-IME run, PDF gate, persistence/recovery gate or crosswalk mapping is unverified.

## 16. Rules for the implementation agent

1. Inspect the existing project first; make focused edits; do not rebuild.
2. Preserve all 54 IDs and their original wording; do not invent IDs.
3. Do not concatenate or follow earlier drafts; this baseline governs.
4. Record every decision in `decisions.md`; every dependency in `libraries.md`; every result in `test-matrix.md`.
5. Do not start a phase on an unverified prerequisite; do not declare a blocked test passed.
