# roman-input-convention.md — Roman Punjabi input convention

**Version:** `roman-input-convention-v0.1` · **Status: DRAFT — NOT FROZEN**
**Baseline:** V9.1 · **Requirement:** proposed `I18N-02` (see `features-amendments.md` §A1)

Every mapping below is a **proposal for the fluent reviewer** to approve, amend or reject. Nothing here is a claim that a Roman spelling has one correct Gurmukhi spelling. Expected outputs are the plan authors' reading of standard Gurmukhi and are **pending reviewer approval**.

## 1. Principles

1. **Forgiving, candidate-based input** is the default. Writers type natural Roman Punjabi (*kitthe*, *putt*, *punjab*, *munda*, *kudi*, *zindagi*); the engine proposes ranked Gurmukhi candidates and keeps the Roman buffer until commitment.
2. **Ambiguity is shown, not hidden.** The engine never silently picks one reading of an ambiguous sequence and never swaps one nasal mark for another to look plausible.
3. **Explicit tokens are an escape hatch,** not the daily workflow.
4. **Case-insensitive in Punjabi mode.** `PUNJAB`, `Punjab`, `punjab` are the same input. English mode is explicit, visible, and preserves English capitalisation and punctuation; capitalisation alone never switches mode.
5. **Output is valid NFC Unicode.** For several nukta letters NFC yields base + nukta (e.g. ਸ਼ is emitted as U+0A38 U+0A3C, not precomposed U+0A36). Never emit unassigned code points; never emit glyph-specific forms.
6. **No universal schwa-deletion or final-vowel rule** unless defined, reviewed and tested.
7. Periods and ordinary punctuation are **never** control markers.

## 2. Vowels

| Roman | Output (independent / sign) |
|---|---|
| `a` | ਅ, or contextual inherent vowel |
| `aa` | ਆ / ਾ |
| `i` | ਇ / ਿ |
| `ee` | ਈ / ੀ |
| `u` | ਉ / ੁ |
| `oo` | ਊ / ੂ |
| `e` | ਏ / ੇ |
| `ai` | ਐ / ੈ |
| `o` | ਓ / ੋ |
| `au` | ਔ / ੌ |

Reviewer to specify: use of the carriers ੳ and ੲ versus the precomposed independent vowels; word-initial vs medial behaviour; short-vs-long ambiguity (`i`/`ee`, `u`/`oo`); final-vowel handling; alternative spellings accepted for each token (e.g. `ii`, `uu`).

## 3. Basic consonants

| Roman | Gurmukhi | Roman | Gurmukhi |
|---|---|---|---|
| `k` | ਕ | `t` | ਤ |
| `kh` | ਖ | `th` | ਥ |
| `g` | ਗ | `d` | ਦ |
| `gh` | ਘ | `dh` | ਧ |
| `ng` | ਙ (contextual) | `n` | ਨ |
| `ch` | ਚ | `p` | ਪ |
| `chh` | ਛ | `ph` | ਫ |
| `j` | ਜ | `b` | ਬ |
| `jh` | ਝ | `bh` | ਭ |
| `ny` | ਞ | `m` | ਮ |
| `y` | ਯ | `r` | ਰ |
| `l` | ਲ | `v`, `w` | ਵ |
| `s` | ਸ | `sh` | ਸ਼ |
| `h` | ਹ | | |

Tokenisation: longest valid token first, but alternative parses are kept where the sequence is ambiguous (e.g. `kh` vs `k`+`h`, `ph` vs `p`+`h`, pairin-ha vs aspirate).

## 4. Natural alternatives (candidate generation)

The generator applies tokenisation and orthographic constraints **before** ranking. It must not build an unbounded Cartesian product and truncate it to five items.

| Input | Candidate readings |
|---|---|
| `t` | ਤ / ਟ |
| `th` | ਥ / ਠ |
| `d` | ਦ / ਡ |
| `dh` | ਧ / ਢ |
| `n` | ਨ / ਣ (+ nasalisation, §5) |
| `r` | ਰ / ੜ |
| `l` | ਲ / ਲ਼ |
| `z` | ਜ਼ |
| `f` | ਫ਼ / ਫ (reviewer to decide) |
| `x` | ਖ਼ (primary natural reading) |
| `sh` | ਸ਼ |
| `kh` | ਖ / contextually ਖ਼ |
| `gh` | ਘ / contextually ਗ਼ |
| `j` | ਜ / contextually ਜ਼ |

Plain `q` is **not** mapped to ਕ਼ by default (not one of the usual Gurmukhi nukta letters); add only with a reviewed entry and fixtures.

## 5. Nasalisation, addak and doubled consonants

**Pre-consonant nasals.** `n` or `m` before a consonant yields, where orthographically valid: tippi (ੰ), bindi (ਂ), and the plain nasal consonant. Surrounding vowels constrain which marks are valid. Required fixtures: *punjab* → ਪੰਜਾਬ, *munda* → ਮੁੰਡਾ.

**Word-final nasals.** Final `n`, `ng`, `m` after a vowel yields bindi/tippi and plain-nasal alternatives where valid. There is **no** rule that every final nasal becomes a nasal mark.

**Doubled consonants.** Natural doubling (`tt`, `dd`, `nn`, `ll`, `kk`…) generates addak/gemination candidates where Punjabi orthography allows (*putt* → ਪੁੱਤ, *kitthe* → ਕਿੱਥੇ) and, separately, retroflex or literal readings where valid. Doubled letters are not assigned one fixed meaning.

Every nasal/doubling rule needs: reviewer-approved positive cases, reviewer-approved counter-examples, ranking tests, and Unicode-correctness tests.

## 6. Pairin forms

`{PAIRIN-R}` / `{PRR}` after a consonant emits consonant + virama (U+0A4D) + ਰ, e.g. `p{PRR}` → ਪ੍ਰ. `{PAIRIN-H}` / `{PRH}` emits virama + ਹ. Natural input (e.g. `pr`) may offer pairin candidates; aspirate digraphs (`kh`, `gh`, `th`, `ph`) are never silently confused with pairin-ha. Reviewer to supply and approve each supported pairin example (e.g. a word containing ੍ਹ such as in ਚੜ੍ਹ) before any Roman spelling is hard-coded.

## 7. Explicit control tokens

Brace-delimited, matched case-insensitively, recognised only as complete tokens. Control tokens are consumed and never appear in the document.

| Canonical | Alias | Effect |
|---|---|---|
| `{ADDAK}` | `{A}` | addak before the **following** consonant token (consonant written once: `pu{A}t` → ਪੁੱਤ, `ki{A}the` → ਕਿੱਥੇ) |
| `{TIPPI}` | `{TP}` | ੰ |
| `{BINDI}` | `{BD}` | ਂ |
| `{PAIRIN-R}` | `{PRR}` | virama + ਰ |
| `{PAIRIN-H}` | `{PRH}` | virama + ਹ |
| `{DANDA}` | `{DA}` | । |
| `{DOUBLE-DANDA}` | `{DDA}` | ॥ |
| `{T}` `{TH}` `{D}` `{DH}` `{N}` | — | ਟ ਠ ਡ ਢ ਣ |
| `{R}` | — | ੜ |
| `{L}` | — | ਲ਼ |
| `{KH-NUKTA}` `{GH-NUKTA}` `{J-NUKTA}` `{PH-NUKTA}` | — | ਖ਼ ਗ਼ ਜ਼ ਫ਼ |

- There is **no `{PH}` alias** (confusable with natural `ph`).
- `sh` already yields ਸ਼; there is no duplicate forced token.
- **Literal braces:** doubled braces `{{` and `}}` produce literal `{` and `}` (to be tested).
- Reviewer to test practicality on target keyboard layouts and may replace the syntax before freeze.

## 8. Punctuation, digits, mode

- Ordinary punctuation passes through literally; a sentence-final period after any word is just a period.
- Digits are literal ASCII by default (Gurmukhi digits optional, later preference). Digits 1–6 are **not** candidate shortcuts.
- Danda only via `{DANDA}`/`{DA}`/`{DDA}` unless a separate automatic rule is reviewed and tested.
- English mode and a per-word literal escape keep English words untransliterated; Punjabi/English mode is visible in the interface.

## 9. Candidate presentation

- Bounded list (default five), deduplicated, ranked by: valid-orthography constraints → deterministic heuristics (→ lexicon in 1B) → user dictionary.
- The original Roman buffer stays visible and recoverable until commitment.
- Candidates never include invalid or unassigned code points.

## 10. Mandatory seed fixtures (expected outputs PENDING reviewer approval)

Roman input and expected output are separate fields; none is "approved" yet.

| Roman input | Required behaviour | Rank requirement | Reviewer status |
|---|---|---|---|
| `kitthe` | candidates include ਕਿੱਥੇ | top-5 | pending |
| `putt` | include ਪੁੱਤ | top-5 | pending |
| `punjab` | include ਪੰਜਾਬ | top-5 | pending |
| `munda` | include ਮੁੰਡਾ | top-5 | pending |
| `kudi` | include ਕੁੜੀ | top-5 | pending |
| `zindagi` | include ਜ਼ਿੰਦਗੀ | top-5 | pending |
| `farak` | reviewer-approved ਫ਼/ਫ spelling set | top-5 | pending |
| `challa` | context-dependent set; reviewer to decide between ਛੱਲਾ and ਚੱਲਾ (as far as the authors know, *challa* commonly refers to ਛੱਲਾ, "ring") | context-ranked | pending |
| `pu{A}t` | ਪੁੱਤ exactly | exact | pending |
| `ki{A}the` | ਕਿੱਥੇ exactly | exact | pending |
| `p{PRR}` | ਪ੍ਰ exactly | exact | pending |
| `{J-NUKTA}` | ਜ਼ | exact | pending |
| `{KH-NUKTA}` `{GH-NUKTA}` `{PH-NUKTA}` `{L}` | ਖ਼ ਗ਼ ਫ਼ ਲ਼ | exact | pending |
| `{TIPPI}` `{BINDI}` in several positions | ੰ ਂ | exact | pending |
| `{DA}` `{DDA}` | । ॥ | exact | pending |
| `nahin.` (Punjabi mode) | final period preserved as ordinary punctuation | exact | pending |
| `{{` `}}` | literal braces | exact | pending |
| English-mode text with capitals/digits | preserved unchanged | exact | pending |

## 11. Fixture record schema (`test-matrix.md` §2)

`id`, `version`, `dataset` (dev / validation / sealed), `roman_input` (exactly as typed), `mode`, `context`, `expected_outputs[]` (accepted spellings), `rank_requirement` (`rank1_required` | `top5` | `exact_output_required`), `categories[]` (1–8), `reviewer`, `review_date`, `notes`.

## 12. Approval workflow

1. Agent writes this draft and **160–200 candidate fixture pairs** (development set).
2. Reviewer returns comments within **3 working days**; the agent continues on the draft meanwhile (blockers recorded).
3. By **5 working days** the reviewer approves, or the named backup reviewer decides.
4. The convention cannot be **frozen** or pass its release gate without human approval.
5. Post-freeze changes require a new convention version and a regression run.

## 13. Open questions for the reviewer

1. Forgiving default confirmed? Which sequences are inherently ambiguous?
2. Carriers ੳ / ੲ / ਅ and independent-vowel policy.
3. Tippi vs bindi rules by vowel context; when to offer both.
4. Which of `f`, `x`, `kh`/`gh`/`j` nukta readings are natural vs token-only.
5. `w`, `ng`, `ny`, `rr`: keep, rename or remove.
6. Pairin-ha and pairin-ra natural input patterns.
7. Final `a`/`aa` and schwa behaviour.
8. Practicality of brace tokens/aliases on real keyboards.
9. Accepted spelling-variant sets per fixture; names policy.
