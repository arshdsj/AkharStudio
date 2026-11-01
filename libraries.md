# libraries.md — Dependencies, findings and reference register

**Baseline:** V9.1 · **Register date:** 2026-10-28

## 1. Policy and evidence levels

No dependency is approved until its exact version/commit, licence, transitive licences, bundle size and actual behaviour are recorded. Every finding carries one of these evidence levels — **do not promote a lower level to a higher one**:

| Level | Meaning |
|---|---|
| **D** | Documentation read (page or README) |
| **S** | Source code inspected (not executed) |
| **E** | Executed in a scratch environment on sample inputs |
| **T** | Tested against the project's frozen fixtures/gates on the pinned version |

Nothing in this file is at level **T** yet. Platform behaviour (Safari, PWA, viewers, IME) is separate from documentation findings and needs its own tests (`test-matrix.md`).

## 2. Indic-Transliteration (Omzee15) — REJECTED as typing engine

Source: `Indic-Transliteration-main.zip` supplied by the project owner (branch snapshot; commit hash unknown — record it if retained as reference).

| Finding | Level |
|---|---|
| `.suggest()` exists (up to six variants) with a dropdown widget, as the plan assumed | S, E |
| Pipeline is Roman → Devanagari (Hindi-style rules) → code-point offset shift into the Gurmukhi block; it is not a Punjabi engine | S |
| Cannot emit tippi (U+0A70), addak (U+0A71), ੳ/ੲ (U+0A72/0A73), ੜ (U+0A5C) or ਲ਼ (U+0A33) | S (table scan) |
| Can emit unassigned code points: U+0A37 (from "Sh"/"ksh"/"x"), U+0A64 and U+0A65 (from `|` and `||`) | S, E |
| `sh` yields precomposed ਸ਼ (U+0A36, a composition exclusion that NFC rewrites) while `f`/`z` yield base+nukta — mixed forms in one output | E |
| Consonant clusters get a visible virama (the README's own *namaste* → ਨਮਸ੍ਤੇ); examples *pind* → ਪਿਨ੍ਦ, *punjab* → ਪੁਨ੍ਜਬ, *munda* → ਮੁਨ੍ਦ, *kudi* → ਕੁਦਿ, *tusi* → ਤੁਸਿ, *kitthe* → ਕਿਤ੍ਥੇ (expected spellings are the author's reading, not reviewer-approved) | E |
| About 5 of ~30 everyday words had the expected spelling at rank 1 (ghar, sat, dil, farak, chalo) — informal sample, not a benchmark | E |
| `M` modifier gives bindi (U+0A02), not tippi | E |
| No lexicon or ranking; candidates are blind vowel substitutions; last candidate is the raw Roman input | S |
| Widget binds to `<textarea>`/`<input>` (`.value`, `selectionStart`); Tab accepts first suggestion, digits 1–6 pick candidates, Enter commits and inserts a space — conflicts with the keyboard contract | S |
| `transliterate()` converts ASCII digits to Gurmukhi digits | S |
| Licence: MIT declared in README/headers; **no LICENSE file and no package.json** in the archive (declaration only) | S |
| No network calls in the library files read | S |

**Permitted use:** reference for suggestion-API shape and interaction ideas only. Do not wrap and patch it.

## 3. Anvaad JS 1.5.1 — EXCLUDED from typing

Source: `anvaad-js-master.zip` (Khalis Foundation). Licence **MIT** (`LICENSE.md` and `package.json`). Dependencies `lodash.unescape` and `string.prototype.padstart` — licences **not checked**.

- Provides `unicode`, `ascii`, `translit` (English, Devanagari, IPA, Shahmukhi), `firstLetters`, `mainLetters`, `alphabetize` (S).
- `unicode()` is a key-layout mapping for ASCII-font Gurbani text (including Gurbani symbols), and `translit()` takes that encoded text — it has no phonetic Roman-to-Gurmukhi path (S).
- Not executed (dependencies not installed offline). Suitability for common legacy writer fonts (e.g. AnmolLipi) is **unverified**; its Roman output follows Gurbani conventions, not colloquial spelling.
- Possible future role only: legacy import or Romanization after testing; both are outside V1 (DEC-022).

## 4. Reference register (documentation, level D)

Verified 2026-10-28 by fetching each page. These confirm what the documentation says; they are **not** platform tests.

| # | URL | Title / publisher | Dated | Supports | Status |
|---|---|---|---|---|---|
| R1 | https://webkit.org/tracking-prevention/ | Tracking Prevention in WebKit — WebKit | page metadata modified 2023-04-27 | ITP deletes all script-writeable storage (IndexedDB, LocalStorage, media keys, SessionStorage, Service Worker registrations and cache) after **7 days of no user interaction with the website**; home-screen web applications are exempt from that cap and isolated from Safari | Accessible; D |
| R2 | https://webkit.org/blog/14403/updates-to-storage-policy/ | Updates to Storage Policy — WebKit blog | 2023-08-10 | Storage API fully supported from Safari 17; origin quota ~60% of disk for browser apps (15% for other apps); a web app added to the Dock/Home Screen gets the same quotas as in the browser; default best-effort mode can be evicted, persistent mode can be requested; `persist()` is granted by heuristics such as use as a Home Screen web app; LRU eviction ordering; handle `QuotaExceededError` | Accessible; D |
| R3 | https://support.apple.com/en-au/104996 | Use Safari web apps on Mac — Apple Support (AU) | published 2026-06-02 | Add to Dock requires macOS Sonoma 14+; a web app shares no cookies, website data or settings with Safari | Accessible; D |
| R4 | https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist | StorageManager: persist() — MDN | modified 2026-10-12 | Secure contexts (HTTPS) only; **not available in Web Workers**; the browser may or may not honour the request | Accessible; D |
| R5 | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | Storage quotas and eviction criteria — MDN | modified 2026-01-05 | Best-effort is the default; Safari/Chromium approve or deny `persist()` without a prompt based on interaction history (Firefox prompts); Safari proactively evicts script-created data for origins with no user interaction in the last seven days **of browser use**; eviction removes an origin's data as a whole; persistent origins are skipped by storage-pressure eviction | Accessible; D |
| R6 | https://github.com/seanghay/happypdf | HappyPDF repository | — | Candidate PDF library | **GitHub blocked automated access during verification**; contents verified from the supplied archive `happypdf-main.zip` (see §5), not from the web page |

**Wording note:** R1 says "7 days of no user interaction with the website"; R5 says "seven days of browser use". Use R1's wording in specifications and treat the precise clock semantics as a platform-test item.

**Not established by documentation (requires platform testing):**
- Whether macOS Dock web apps are exempt from the 7-day cap — R1 names *home-screen web applications*; R2/R3 cover quotas/isolation only. **Not yet empirically verified.**
- Whether `persist()` is granted in an ordinary Safari tab, in the installed Dock app, and in current Chrome/Edge/Firefox.
- Real eviction behaviour over time in each context.

**Implementation constraints from R4:** call `persist()` from the main thread over HTTPS; never from a Worker.

## 5. HappyPDF — first PDF proof-of-concept candidate (NOT approved)

Source: `happypdf-main.zip` (branch snapshot; commit hash unknown — **pin exact version and commit in Phase 0B**). v0.1.0; MIT; pdf-lib fork replacing fontkit with HarfBuzz compiled to WebAssembly (WASM inlined in the bundle; base64 sources of roughly 0.53 MB and 0.85 MB, i.e. about 0.4 MB and 0.6 MB decoded — measure the real compressed size).

**Investigation findings (level S — source reading, NOT a generated-PDF result):**

1. The README lists Devanagari and other Indic scripts, but the demos/smoke test inspected use Khmer, Thai and Arabic; no Gurmukhi fixture was seen.
2. It builds the extraction map (ToUnicode CMap) with one entry per glyph, taking the code points of the glyph's cluster. When several glyphs share a cluster (e.g. a reordered pre-base vowel sign plus consonant) each receives the same full code-point list, and when a glyph appears in different clusters only the last assignment is kept. **Prediction:** extraction of reordered Gurmukhi syllables (e.g. ਕਿ) may duplicate or misorder text.
3. No ActualText / marked-content emission was found in the files searched.
4. Text is shaped as a whole string with guessed script/language properties, so mixed Gurmukhi/Latin text needs run splitting (script and font) in application code.

**These are predictions to be confirmed or refuted by the Phase 0B extraction-first test on a generated PDF.** Until then the extraction concern must not be reported as a test result, and HappyPDF must not be reported as failing or passing.

Pinned, reproducible build required; any patch (ActualText) lives in a pinned fork with a rebase strategy. Audit dependency and font licences; do not copy the repository's demo fonts into the product.

## 6. Other candidates and tools (all level — none evaluated)

| Item | Role | Notes to verify |
|---|---|---|
| pdfmake https://github.com/bpampuch/pdfmake | comparison control | custom fonts ≠ correct Gurmukhi shaping |
| pdf-lib https://github.com/Hopding/pdf-lib | comparison control | embedding via fontkit does not establish shaping |
| jsPDF https://github.com/parallax/jsPDF | comparison control | not default; test shaping/extraction first |
| HarfBuzz (WASM) | shaping for the custom route | shaping only; not a PDF writer |
| Poppler `pdftotext` | normative extractor #1 (CI) | pin build; as far as I know GPL — dev/CI use, not shipped; verify |
| MuPDF | normative extractor #2 (provisional) | prove independence from Poppler, pin version, test empirically; as far as I know AGPL/commercial dual licence — dev/CI use, not shipped; verify |
| Noto Sans Gurmukhi | Gurmukhi font candidate | confirm coverage, Latin/punctuation coverage, variable vs static, OFL terms for embedding; bundle locally (no CDN) |
| Courier Prime | Latin screenplay font candidate | confirm licence and embedding rights |
| ProseMirror, Lexical | editor spike candidates | confirm licences, versions at spike time |
| Reference PDF renderer for visual goldens | TBD (Phase 0B) | name, pin version, reproduce in CI |

## 7. Pinned Phase 1 Desktop Dependencies (Level T — Tested in CI)

| Package / Asset | Exact Version | Licence | Role | Status |
|---|---|---|---|---|
| `electron` | 33.4.11 | MIT | Pinned desktop Chromium & Node.js host | **T** — Verified build & launch |
| `react` / `react-dom` | 18.3.1 | MIT | Application shell & UI rendering | **T** — Component tests pass |
| `lucide-react` | 0.454.0 | ISC | Semantic screenplay & application icons | **T** — Verified |
| `tailwindcss` | 3.4.14 | MIT | Screenplay typography & UI styles | **T** — CSS compiled |
| `vite` | 5.4.21 | MIT | Renderer bundler & dev server | **T** — Production bundle built |
| `esbuild` | 0.24.0 | MIT | Main process & preload compiler | **T** — 15ms compile time |
| `vitest` | 2.1.9 | MIT | Automated unit & interaction test runner | **T** — 15/15 tests pass |
| `Noto Sans Gurmukhi` | Variable | SIL Open Font License (OFL) | Bundled offline Gurmukhi font | **T** — Local in `assets/fonts/` |
| `Courier Prime` | Regular (v1.0) | SIL Open Font License (OFL) | Bundled Latin screenplay font | **T** — Local in `assets/fonts/` |
| `prosemirror-model` | 1.25.12 | MIT | Semantic screenplay schema & document tree | **T** — 37 tests pass |
| `prosemirror-state` | 1.4.4 | MIT | Transactional state & selection machine | **T** — 37 tests pass |
| `prosemirror-view` | 1.42.8 | MIT | Screenplay canvas rendering & DOM events | **T** — 37 tests pass |
| `prosemirror-history` | 1.4.1 | MIT | Undo/redo transaction history stack | **T** — 37 tests pass |
| `prosemirror-keymap` | 1.2.3 | MIT | Screenplay key bindings (Enter, Tab, Mod+1..7) | **T** — 37 tests pass |
| `prosemirror-commands` | 1.7.1 | MIT | Standard text & mark commands | **T** — 37 tests pass |
| `prosemirror-transform` | 1.10.3 | MIT | Document step transformations | **T** — 37 tests pass |
| `pdf-parse` | 2.4.5 | MIT | PDF.js-based logical Unicode text extraction in CI (`TM-06`) | **T** — 21 Phase 4 tests pass |

## 8. Required follow-ups

1. Pin exact versions/commits and record licences and transitive licences for every shipped dependency (SBOM).
2. Record the real compressed size of every shipped asset against the 10 MiB core budget.
3. Replace each "verify" above with a dated result and its evidence level.
4. Record any Level 1B word-list source: exact name/version/URL/retrieval date, licence text, redistribution and share-alike obligations, integrity hash.
5. Re-fetch R1–R5 at release time; documentation changes.
