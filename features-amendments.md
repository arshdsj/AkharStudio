# features-amendments.md — Proposed amendments to `Features_and__beheaviour.md`

**Baseline:** V9.1 · **Status:** every amendment below is **PROPOSED**. The source Features file has **not** been modified (it is read-only in the project uploads). Apply only after approval, preserving all 54 existing IDs and their original wording except where a patch below says otherwise.

Format per amendment: target · what the source says now · proposed change · approval needed.

---

## A1. New requirement `I18N-02 [P0]` — Roman Punjabi input to Gurmukhi

**Collision check:** the source contains `I18N-01` and, in the extraction performed for this baseline, no `I18N-02`. Re-check before adopting; if the ID is taken, use another and update every document consistently.

**Proposed text:**

> **I18N-02 [P0].** Natural Roman Punjabi input to Gurmukhi with ranked candidates. Local and offline; no network or AI service. Default mode is forgiving, case-insensitive candidate-based input per `roman-input-convention.md`; English mode and a per-word literal escape keep English text untransliterated, and the active mode is visible. The uncommitted Roman buffer is held outside the canonical document; only committed Unicode (NFC) is stored, counted, searched, exported and autosaved. At most one unresolved buffer per document. Native Gurmukhi keyboards/IME composition take priority and intermediate composition text is never transliterated. Keyboard behaviour: Space commits the selected candidate plus a space as one undo transaction; Enter with the popup open accepts the candidate only; Escape dismisses and keeps the buffer; Backspace immediately after a supported auto-commit restores the Roman buffer; Tab with the popup open dismisses it. The popup exposes combobox/listbox semantics and announces candidate count, active option and selection. Zero tolerance: no invalid or unassigned code points, no silent text loss, no unrecoverable composition state. Acceptance: reviewer-owned sealed benchmark with category thresholds and latency P95 ≤ 30 ms / P99 ≤ 75 ms on named reference hardware; real macOS and Windows IME tests.

**Approval:** product owner; reviewer for the convention. **If accepted the inventory is 55 IDs.**

## A2. Inventory and metadata corrections (documentation only)

- State the inventory as **54 IDs**: 42 P0-only, 9 P1-only, 3 dual (`ORG-04`, `TOOL-01`, `I18N-01`). `A11Y-01` is P0.
- Principle IDs (`VIS-01`, `UX-01`, `DOC-01`, `SAFE-01`, `PERF-01`, `EXT-01`, `NAI-01`, `COMP-01`) remain principles; each is mapped to packages and tests in `feature-crosswalk.md` but is not a countable feature.

## A3. Dual-priority splits

### A3.1 `ORG-04 [P0/P1]` — already explicit in the source
P0: find in selected draft, next/previous, case/whole-word options, no decoration matching. P1: replace-one/all with preview; current vs all drafts; search across notes/Beats/Outline with result-type labels. No amendment needed beyond recording the split in the crosswalk.

### A3.2 `TOOL-01 [P0/P1]` — proposed split
The source does not itemise the split. Proposed (consistent with Features §1.1 and Phases 4/7):
- **P0:** the bottom-centre bar with the exact default ordering (Undo, Redo, element icon, alignment/indentation, Bold, Italic, Underline, Strikethrough, `Aa`, Highlight, paint roller, Link, Copy, Add layer, Comment); overflow of *later* actions; tooltips, accessible names, shortcuts; element icon tracks focus; correct enabled/disabled/pressed state; **honest disabled states for deferred actions**; no no-op control clickable.
- **P1:** working Highlight, format painter, Link, Add layer, Comment.

### A3.3 `I18N-01 [P0/P1]` — proposed split
The source does not itemise the split. Proposed:
- **P0:** UTF-8 data model; correct composition, combining marks, caret movement, line breaks, search and paste for Latin and Gurmukhi; uppercase transforms and word counting never corrupt non-Latin text; licensed Unicode fallback font with measured line heights if the main face lacks Gurmukhi; Unicode fallback and PDF font-coverage audit before promising Punjabi export; explicit export diagnostic if a glyph is unavailable.
- **P1:** mixed-direction/BiDi tests; the full multilingual audit; export font-bundling licence review at release scale.
- **P2 (unchanged):** UI localisation.

**Approval:** confirm at requirements sign-off (DEC-026).

## A4. Menu, keyboard and popup reconciliation

| Target | Source says now | Proposed change |
|---|---|---|
| `AC-01` | One suggestion menu active at a time; Enter accepts highlighted item before any new-block rule; accessible combobox/listbox | The transliteration candidate popup **is** a suggestion menu for the single-menu rule. While a transliteration composition is active, contextual screenplay menus (character/scene/transition) are suppressed until the word is committed. Precedence: native IME composition → explicit editor command → transliteration composition → contextual screenplay suggestions. Enter on the transliteration popup accepts the candidate only. |
| `AC-02` | Enter on a character suggestion fills the cue and creates/focuses Dialogue | Unchanged for the character-name menu. Add: Gurmukhi names use an NFC-normalised comparison key for duplicate detection while the raw spelling is retained. |
| `EDIT-02` | Enter at end of a nonempty block, absent an open picker/menu, inserts the following type | Add: an open transliteration popup counts as an open menu, so Enter accepts the candidate and a second Enter applies the screenplay rule. |
| `EDIT-03` | Tab on nonempty text opens the type picker | Add: when a transliteration popup is open, the first Tab dismisses it (keeping the Roman buffer) and is consumed; the next Tab applies the existing behaviour. |
| `A11Y-01` | Autocomplete announces count, active option and selection | No wording change. Ownership: W3 owns the transliteration popup; W6 owns integrated regression. |
| `T-03`, `T-04` | Enter/Tab scenarios | Reference `TM-03` for the transliteration-specific cases. |

## A5. `PAGE-01` and A4 (depends on DEC-014)

`PAGE-01` makes US Letter the default and `EXPORT-01` offers "US Letter"; Features §1.1 lists alternate paper sizes as P2.
- **If A4 is approved for V1.0:** keep US Letter as the default; in `EXPORT-01` and page setup add a separately selected A4 (≈595.276 × 841.890 pt); never scale one size into the other; store expected geometry and page breaks per paper × profile; update `T-07`.
- **If not approved:** leave A4 in P2, and remove A4 from the W4/W7 gates and fixtures.

## A6. Roadmap supersession (Features §12)

Add a note at the top of §12: "The phase sequence below is superseded by `plan.md` §11. Feature IDs and acceptance criteria are unchanged. Traceability: `plan.md` §14 and `feature-crosswalk.md`."

## A7. CONT'D clarifications (`CONT-01`, `CONT-02`)

Wording unchanged. Add a sentence recording that these concern CONT'D only; no "MORE" behaviour is specified, and none is to be implemented without a new ID. Add a note that the generated label follows a documented localisation setting and syntax is never silently translated.

## A8. Export and interchange

- `EXPORT-01`: define "verify PDFs visually and by text extraction" as the two-tier gate in `plan.md` §8.2 (two independent automated extractors plus reviewer-approved visual goldens; viewer compatibility recorded per behaviour). Keep US Letter default (see A5). Keep the immutable revision snapshot and failure/retry behaviour unchanged.
- `EXPORT-02`: add that Gurmukhi Character cues and other uppercase-dependent elements are exported with explicit forced markers (e.g. `@` for Character cues, `.` for Scene headings where needed) and recognised on import; round-trip tests compare semantic structure. Keep **import and export**, preview and the limitations report (V9.1 budgets all of these).

## A9. Storage, backup and Unicode additions

- `STORE-01`: add that persistence is requested once after the first explicit create/open action from the main thread over HTTPS, the result is recorded per storage context, and a denial produces a warning plus a direct backup action; backup prompts are event-based (after the first successful save, and one non-modal reminder per session after meaningful edits not yet backed up). Browser tab and installed web app are separate storage contexts. Add the statement already implied by the source: never claim browser data is a permanent backup.
- `I18N-01` / `SEC-01` / `ERR-01` (paste and import): normalise to NFC then validate (invalid scalar values, replacement characters, unassigned code points in script ranges, suspicious combining sequences); problems produce a recoverable warning or preview, never silent discard.
- `I18N-01`: spellcheck off by default for Punjabi until a Gurmukhi dictionary is validated; `lang="pa"` (script `pa-Guru`) on Punjabi spans, `en` on English; document-level language and PDF `/Lang` where supported.

## A10. Tests

Add to Features §11 a reference to `test-matrix.md` tests `TM-01` to `TM-18`. Source tests `T-01` to `T-16` are unchanged.

## A11. Explicitly not amended

No Romanization, no generic legacy-font import (including AnmolLipi), no "MORE" feature, no mobile editing, and no P2 item is promoted except A4 under DEC-014. Features §1.2 non-goals remain.
