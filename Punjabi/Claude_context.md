# Offline-first app plan review

**Created:** 10/29/2026 14:30:18  
**Updated:** 10/29/2026 20:47:49  
**Exported:** 10/29/2026 21:59:35  
**Link:** [https://claude.ai/chat/e0afed64-4f31-4a6e-97d9-d1003eaef3f8](https://claude.ai/chat/e0afed64-4f31-4a6e-97d9-d1003eaef3f8)  

## User:

> 10/29/2026 14:30:19

> File: brief-traceability.md

> File: brief.md

> File: features-amendments.md

> File: libraries.md

> File: roman-input-convention.md

> File: START-HERE.md

> File: feature-crosswalk.md

> File: plan.md

> File: test-matrix.md

> File: decisions.md

is this plan sound to execute?

also explain to me in simple terms what the plan is and how ity works

## Assistant:

> 10/29/2026 14:30:54

> Weighing the architecture alternatives and PDF options.
>
> - Weighing the architecture alternatives and PDF options.
> - **Done**

## Is it sound to execute?

**As a plan, yes. As something to start building tomorrow, not yet.**

**What's strong**
- **The risky parts are tested first.** Phase 0 checks whether Roman-to-Gurmukhi typing quality is achievable, whether the PDF tool can output correct Gurmukhi, and which editor framework survives real keyboards. If any of these fails, you find out in the first 40-60 days, not after 200.
- **Honest evidence.** `libraries.md` separates "I read the docs" from "I ran it" from "I tested it against our fixtures." Nothing is claimed as tested yet, and the plan says so.
- **Good technical calls.** Rejecting both engines from your brief was justified, since neither is a Punjabi typing engine. The extraction-first PDF test is the right first test. Storing committed text as NFC Unicode and keeping the half-typed Roman buffer out of the document are both correct.
- **Traceability.** Every line of your brief maps to an ID, package and test, and the two deviations from your brief (one engine instead of two, print as a non-certified convenience path) are recorded and reversible.
- **The numbers are consistent.** I re-added Phase 0 (38-60), the package totals (141-242) and the patched-PDF route (16-27) to reach 195-329 days, and they match.

**What worries me**
1. **Nothing can start yet.** Every item on the readiness checklist is OPEN: a fluent Gurmukhi reviewer (78-134 hours), a platform tester (15-23 days), a Mac and Windows machine, and the missing `Features_and__beheaviour.md` file. The plan's own sign-off, Gate G0, depends on that Features file, and I could not check its counts (54 IDs, no "typography profiles") because it isn't in what you sent me. If you don't have a Gurmukhi reviewer, the Roman-input work cannot be validated at all.
2. **The scope is large.** 195-329 engineering days is a lot for one agent and one owner. A big share goes to a pixel-faithful screenplay-app shell, offline and installable-app machinery, and Safari data-eviction handling. Your brief says Punjabi support takes priority over everything else, but the plan still treats the Punjabi Core milestone as only internal. I'd make Punjabi Core the first real, usable release and let the rest follow.
3. **The browser-first choice causes much of the pain.** Safari can delete stored data, the Dock app and the browser tab keep separate storage, and the plan needs backup banners, persistence requests and a signed risk acceptance to cope. A desktop wrapper such as Tauri or Electron would avoid most of this and allow real file saves. The plan rules that out (DEC-013), which is your call, but I'd re-confirm it now, because it is expensive to reverse later.
4. **The core feature may not be achievable the way planned.** If no redistributable Punjabi word list exists, the plan falls back to a reviewer-built seed list, relaxed thresholds, or Outcome D, where the app ships with no Roman typing at all. That would remove the feature you built the project around. Phase 0A4 checks this early, which is good, but be aware the product's value rests on it.
5. **Unmeasured estimates, and AI-made decisions.** The estimates are the plan's own guesses until Phase 0 produces measurements. Decisions DEC-027 to DEC-051 were made by the planning assistant under your delegation, so please read the table in START-HERE.md and veto anything you disagree with.
6. **PDF candidates may be incomplete.** The route list is HappyPDF, then a patched HappyPDF, then a custom HarfBuzz writer. As far as I know, other options such as Typst compiled to WASM also shape Indic scripts, and they might be worth adding to the Phase 0B comparison. I haven't tested that.

**What I'd do first:**
- Complete Part A of START-HERE (the reviewer, the hardware, the Features file and Gate G0).
- Start the PDF extraction-first test (0B) in parallel, since it needs no reviewer. It is cheap and answers the biggest technical unknown.
- Decide whether Punjabi Core should be the first release.

## The plan in simple terms

**What you're building:** a screenplay writing app that runs in the browser and works offline. You type Punjabi in ordinary English letters, such as *kitthe*, and a popup offers Gurmukhi spellings like ਕਿੱਥੇ. You pick one, and the text is saved on your own computer. The app exports a PDF that shows Punjabi correctly even on a machine without the fonts installed. You can mix English, Gurmukhi and Roman Punjabi in one script.

**How the plan works, like building a house:**

1. **Stage 0, prove the risky bits.** Before building, test the unknowns: how good Roman-to-Gurmukhi typing can be, which text-editor framework handles Gurmukhi keyboards, and whether a PDF tool can shape Gurmukhi and still let you copy and search the text. Each test ends in a decision, and a bad result stops the work instead of being ignored.
2. **Stage 1, build in order of risk.** The order is the data and saving foundation, then the editor, then Roman typing, then page layout, then find/replace and PDF export. The polished screenplay-app look comes later.
3. **Checkpoint: Punjabi Core.** A test screenplay with Punjabi dialogue, a Punjabi title page and long wrapped speeches goes through the whole cycle: type, save, reopen, export to PDF, open on a clean machine, and check every page. This is your brief's definition of done.
4. **Stage 2, finish V1.0.** Add the full interface, offline mode, backups and accessibility, then run a full regression.
5. **V1.1 afterwards.** Extras such as outlines, comments, version history and Fountain import/export come later.

**Safeguards built in:**
- **Gates and tests.** Every stage has a gate and tests (28 project tests plus 16 from the Features file). A test that lacks its hardware, reviewer or tester counts as "blocked," never "passed."
- **A sealed benchmark.** A native-speaker reviewer holds back a hidden set of Roman-typing cases, so the agent can't tune its work to the exam.
- **Stop rules.** After two failed retests, you decide whether to change approach, shrink scope, or stop.
- **A document map.** `brief.md` is your original requirements, `plan.md` is the schedule, `decisions.md` is the log, `test-matrix.md` holds the tests, and START-HERE.md is the checklist.

I can turn this into a one-page owner checklist, or draft a trimmed "Punjabi Core first" release plan, if either would help.

## User:

> 10/29/2026 14:34:39

so if i abandon the browser/website version, and keep it limited to macOS/windows or even android apps with local only storage, would that be a more realistic goal? but keep the website versions and online storages/backups as a future possibility!

## Assistant:

> 10/29/2026 14:35:06

> Weighing a move to Electron on Windows and macOS.
>
> - Weighing a move to Electron on Windows and macOS.
> - **Done**

Yes, desktop (macOS and Windows) is more realistic, but mainly because it removes the most annoying risks. It doesn't shrink the hardest work. Android I'd leave out of the first version.

## What a desktop app fixes

Most of the plan's browser-specific pain disappears:

- **Safari data loss.** Safari can delete stored data after inactivity, and the plan needs backup banners, persistence requests and a signed risk acceptance to cope. A desktop app saves real files on disk, so none of that is needed.
- **Offline and installable-app machinery.** `STORE-03`, most of `STORE-04`, the service-worker update tests (TM-10, TM-12, TM-13, TM-28), the hosting origin and the Dock-versus-tab storage question all go away.
- **Engine differences.** If you ship with Electron, which bundles one fixed Chromium, you test one rendering engine on both operating systems instead of Safari, Chrome and Firefox. As far as I know, Chromium uses HarfBuzz for text shaping on every platform. That would make the plan's "editor and PDF disagree on line breaks" problem (Safari's text engine versus HarfBuzz) much smaller, but it needs checking in Phase 0.
- **Real file saves.** The `.scriptproject` file becomes the actual project, which users can see, copy and back up themselves.

I'd choose Electron over Tauri here. Tauri uses each system's own web view, which brings Safari's engine back on macOS and recreates the problem you're trying to escape.

## What it doesn't fix

- **Roman-to-Gurmukhi typing quality (W3, 41-72 days).** This is the biggest and riskiest block, and it depends on a Gurmukhi reviewer and a word list.
- **PDF shaping, embedding and text extraction.** Electron's built-in print-to-PDF uses Chromium, and the plan already suspects Chromium PDFs extract Indic text poorly. Phase 0B still has to be run.
- **Real IME testing on Mac and Windows.**
- **Everything on the readiness checklist.** You still need the reviewer, the operator and the Features file.

## What it adds

- Installers, plus an Apple Developer account (about $99 a year, as far as I know) and notarization on Mac.
- A Windows code-signing certificate.
- An auto-update mechanism.
- Testing the packaged app on both operating systems.

My rough guess, not a measurement, is a net saving of 15-25 days out of 195-329, and a large drop in risk, mostly from losing the Safari data-eviction problem. Treat that as a hypothesis for Phase 0C to confirm.

## Why not Android yet

The plan already treats mobile as a separate gate (TM-17), for good reason. Touch screens need a different screenplay interface, and virtual keyboards behave differently from desktop typing. Android keyboards such as Gboard already offer their own Roman-to-Gurmukhi suggestions, which would collide with yours. A phone is also an awkward place to write screenplays. I'd keep the engine and document model platform-independent, which the plan already requires, and revisit Android after the desktop version works.

## How to keep the web and cloud options open

- Keep the app written in web technology (TypeScript and a web editor), and put storage behind the repository interface the plan already requires (`ARCH-01/02`). Desktop uses files or SQLite today. A browser version using IndexedDB, or a sync layer, can be added later without rewriting the editor.
- Keep `.scriptproject` as the portable format, so cloud backup later is just "upload the file."
- Record the choice as a decision that reverses DEC-013, so it's clear web is deferred, not dropped.

## Plan changes this would need

1. Reverse DEC-013 and record "desktop first, web deferred."
2. Amend `STORE-01` (browser first), `STORE-03` and `STORE-04`. Your Features file lists desktop packaging as P2, so promoting it is a scope decision for you.
3. Replace W6 and W-OPS with packaging, signing, auto-update and per-OS testing.
4. Add one Phase 0 check: confirm Electron's Chromium passes the same IME, shaping and PDF-extraction tests.

I can draft those amendments and a revised work-package table if you'd like.

## User:

> 10/29/2026 14:37:50

https://punjabi.indiatyping.com/

how do they do it

## Assistant:

> 10/29/2026 14:38:06

> Weighing whether typed text is sent to a server.
>
> - Read a page
> - Weighing whether typed text is sent to a server.
> - **Done**

I can only see what the page says about itself, not its code, so the "how" below is partly inference.

## What the page says

- **It's a transliteration API service.** The FAQ calls it that, and the page shows "Loading Punjabi Transliteration..." while a script loads. The conversion likely comes from a backend or a loaded engine, not simple letter-swapping in the page.
- **Space converts the word.** You type English letters, press Space, and the word turns into Gurmukhi.
- **Reopening a word.** Backspace after a converted word, or clicking on it, opens a list of alternative spellings. This is the "correct a word after committing" feature from your brief, and they do it with no stored history.
- **Autocomplete.** The page says suggestions appear as you type, with an auto-complete feature.
- **Typing modes.** There are four options: Word by Word, Character by Character, Passage by Passage, and Simple Mode.
- **Switching languages.** Ctrl+G toggles between Punjabi and English.
- **A fallback keyboard.** An on-screen Gurmukhi keyboard covers anything the phonetic typing can't produce.
- **Output is plain Unicode.** It exports .txt and .docx, and copying and pasting works anywhere.
- **Privacy claim.** They say typed text isn't saved on their server. That sits oddly with calling it an API service, so I can't tell whether each word is sent out for conversion.

## What I'd infer, not confirmed

Tools like this have commonly used a lexicon-based or statistical engine, a large dictionary of real Punjabi words with frequencies, rather than rules alone. As far as I know, many Indian-language typing sites used Google's old transliteration API, which was later shut down. I don't know what this site uses now. Opening the browser's network tab while typing would show whether words go to a server, and which one.

## What it means for your plan

- **It supports the plan's 1B assumption.** Good suggestions probably come from a real word list with frequencies, which matches DEC-037. Rules alone wouldn't give ਕਿੱਥੇ or ਪੁੱਤ reliably. It also raises the stakes on Phase 0A4, finding a legally usable word list.
- **Their interaction is simpler than yours.** Space commits, and Backspace or a click reopens alternatives. That is a lighter version of your keyboard contract, so consider whether your Enter, Tab and Backspace-asymmetry rules are more complicated than writers need. A reviewer test would settle it.
- **A server-based design doesn't fit your offline requirement.** If they call an API, you can't copy that part. You need the engine and word list shipped inside the app.
- **Don't reuse their service or scrape it.** Using their conversion in your product would break their terms and your offline goal. As a benchmark to compare your results against, it's fine.

I could write the network-tab steps so you can see what it sends, or turn this into a short "UX lessons" note for the plan.

## User:

> 10/29/2026 14:39:47

is it not possible to have this ability offline?

## Assistant:

> 10/29/2026 14:39:54

Yes, it's possible offline, and the plan already assumes it (I18N-02 says "local and offline; no network or AI service"). A server isn't needed for this kind of typing. The data just has to ship inside the app.

## What the server would be doing

Converting *kitthe* into ਕਿੱਥੇ needs two things:

1. **Rules** that turn Roman letters into possible Gurmukhi spellings.
2. **A word list**, ideally with how common each word is, to pick the likely spellings and rank them.

The word list is the big part. A list of tens or hundreds of thousands of Punjabi words is a few megabytes, which is small. It can be stored in the app, loaded into memory, and searched in a millisecond or two. The plan's 10 MiB budget for core assets allows for this.

## How an offline version works

1. Generate candidate spellings from the typed letters using the rules.
2. Check each against the word list and drop the invalid ones.
3. Rank the rest by how frequent the word is, and boost words you've chosen before (your user dictionary).
4. Show the top five.

This is the plan's Level 1B. Auto-complete works the same way: look up words that start with what you've typed. A future Level 1C could add a small offline ranking model for context-aware choices, still without a server.

## What offline can't do

- **Cover every word and name.** A server can have a bigger, constantly updated dictionary. Offline, unusual names and new slang won't be in the list, which is why the plan has a user dictionary that learns your words.
- **Context-aware guessing.** Large language models running on a server can read the whole sentence. Offline, you get word-level ranking, or a small bounded model at best.
- **Updates.** The word list is fixed until you ship an update.

## The real obstacle

The technology isn't the problem. The word list is. You need a Punjabi word list, with usage frequency, that you're legally allowed to bundle in a product. That's exactly what Phase 0A4 searches for. If none exists, the plan's fallback is a reviewer-built seed list, which is slower and covers fewer words. So offline typing is achievable, but how good it feels depends on getting a good list.

I can sketch what sources to check in 0A4 (open corpora, Wikipedia and Wiktionary dumps, licensed lexicons) and what each licence would mean for your product.

## User:

> 10/29/2026 14:40:34

how big can the data even be? its just text right?

## Assistant:

> 10/29/2026 14:40:42

> Estimating compressed sizes for the word list.
>
> - Estimating compressed sizes for the word list.
> - **Done**

Yes, it's just text, and text is small. Rough numbers (my estimates, not measurements):

- **Storage per word.** Gurmukhi letters take 3 bytes each in UTF-8, and an average word is about 5 characters, so roughly 15 bytes. Add a frequency number and you're near 20 bytes per word.
- **100,000 words:** about 2 MB raw, under 1 MB compressed.
- **500,000 words:** about 10 MB raw, roughly 3 MB compressed.
- **A million forms:** a few tens of MB raw, still only single-digit MB compressed. Punjabi inflections multiply the count, but it stays small.

Specialised formats shrink it further. A trie or finite-state structure shares the beginnings and endings of words, which often cuts size by half or more. Smaller still, you can store only the words and derive the rest.

For comparison, the plan's budget for the whole app is 10 MiB compressed, and a reasonable Punjabi word list would take a small slice of that. Memory isn't a concern either, since a few MB loads instantly and lookups take microseconds.

**Fonts are the bigger asset.** Noto Sans Gurmukhi is probably larger than the word list, and you'd embed it in PDFs too. The plan's 2 MiB limit for a future ranking model is also generous.

A model that understands context (Level 1C) is what would grow the data, to tens of MB. That's still fine for a desktop app, which is one more reason the offline route is easier outside the browser.

So storage and speed aren't the obstacle. The hard part is finding a good Punjabi word list with frequencies that you may legally ship, or building one with a reviewer's help. That's what 0A4 is for.

## User:

> 10/29/2026 14:41:36

what would be the best way to get that how can i even to begin looking it up

## Assistant:

> 10/29/2026 14:45:27

> Looking for legally shareable Punjabi frequency lists.
>
> - Looking for legally shareable Punjabi frequency lists.
> - **Done**

Let me check what's actually available now rather than rely on memory.

> Drafting the reply with cited sources and a next-steps plan.
>
> - Punjabi Gurmukhi word frequency list open licence corpus
> - Punjabi Wikipedia dump pawiki Wiktionary Punjabi licence CC BY-SA
> - Aksharantar OR IndicCorp OR Samanantar Punjabi transliteration dataset licence
> - Drafting the reply with cited sources and a next-steps plan.
> - **Done**

There are a few realistic places to start. I only read search snippets and downloaded nothing, so every licence below needs checking at the official source before you rely on it.

## The two things you need

1. **A Gurmukhi word list with how common each word is.** This is the lookup table the engine filters and ranks against.
2. **Real Roman spellings of Punjabi words** (how people actually type *kitthe*). This helps you tune and test the rules.

## Where to look, best first

| Source | What it gives | Licence situation | Catch |
|---|---|---|---|
| **Aksharantar (AI4Bharat)** | Millions of Roman-to-native word pairs, and Punjabi is among its languages. | The manually collected part is CC-BY, and the part mined from Samanantar and IndicCorp is CC0. That is very permissive. | The mined Roman spellings are not guaranteed to match the way your reviewer wants words spelled. Check the official repo (github.com/AI4Bharat/IndicXlit), because one mirror's dataset card says only "cc". |
| **Punjabi Wikipedia (Gurmukhi)** | Raw text you can count words in to get your own frequencies. | Wikipedia content is CC BY-SA 3.0 and GFDL. Share-alike may or may not reach a frequency list derived from it. | That is a legal question for a lawyer, not me. The text is encyclopedic and has few colloquial words. |
| **Wiktionary (Punjabi)** | Dictionary headwords. | Same wiki family, so likely CC BY-SA as well. | Coverage unknown. |
| **IndicCorp (AI4Bharat)** | A large Punjabi text corpus you could count words in. | Aksharantar's mined pairs came from it under CC0, which is encouraging, but check the corpus's own licence. | Large download. |
| **Punjabi University, Patiala (learnpunjabi.org)** | The project selected the 25,000 most frequent Shahmukhi-Gurmukhi terms from corpus analysis. | The site carries a university copyright notice, so you'd need permission. | Email them. A university may well say yes for a non-commercial or credited use. |
| **LDC-IL (Central Institute of Indian Languages)** | Punjabi language data sets, but the page I found was for speech data and sits behind a login with a price. | Unknown. | I didn't find a text word list there. Worth an enquiry. |

Sketch Engine appeared in my search too, but the corpus it listed was Shahmukhi script, which is the wrong script for you.

## A practical way to begin

1. **Make a shortlist and check each licence in plain text.** The plan already has a register for this (`libraries.md` §8). For every candidate, record the source, version, retrieval date, licence text and any share-alike obligation.
2. **Start with Aksharantar's Punjabi subset.** It's the cheapest to try, and the licence is the friendliest. Look at how many words it has and how they're spelled.
3. **Count words in Punjabi Wikipedia.** Download the pa dump from dumps.wikimedia.org, keep only Gurmukhi-script words, normalise to NFC, and count. This is a weekend of work. The Gurmukhi edition had about 54,000 articles when that page was written, which is enough for a decent common-word list but not for slang or dialogue.
4. **Email Punjabi University, Patiala** and ask about reuse of their frequency list.
5. **Get your reviewer to clean the top few thousand words** and add colloquial and screenplay words (and loanwords like *school*) that web text lacks. This hybrid is the plan's fallback anyway, and I expect it ends up as your real answer.

## Things to watch

- **Colloquial gap.** Written sources undercount spoken dialogue. Your reviewer's seed list covers that.
- **Spelling noise.** Web text has inconsistent nukta marks and typos, which cleaning and NFC normalisation reduce.
- **Share-alike.** If a source's licence forces you to share your derived list under the same terms, decide that deliberately.
- **Offline model option.** Aksharantar's authors also trained a transliteration model, IndicXlit, which could become your Level 1C. I haven't checked its size or licence.

Next, I can set up the register entries and try fetching the Aksharantar Punjabi data here. My workspace's network access is limited, so it may not be able to reach Hugging Face. If not, I can write the exact steps for you to run.

Sources:
- [Aksharantar dataset card (Hugging Face)](https://huggingface.co/datasets/ai4bharat/Aksharantar/blob/e1968d41423440bdb83263675f4ae93686257af8/README.md?code=true)
- [Aksharantar paper (arXiv)](https://arxiv.org/pdf/2205.03018)
- [Punjabi Wikipedia (Western edition licence note)](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Punjabi_Wikipedia_(Western))
- [Punjabi Wikipedia (article counts)](https://Www.Wikipedia.org/wiki/Punjabi_Wikipedia)
- [Punjabi University Shahmukhi-Gurmukhi project progress](https://learnpunjabi.org/s2g_final/progress.htm)
- [LDC-IL Punjabi Raw Speech Corpus](https://data.ldcil.org/punjabi-raw-speech-corpus)
- [word-corpus scripts (GitHub)](https://github.com/wipfli/word-corpus)

> Used tool
>
> - Set up for this session
> - **Done**

---

**Sources:**

- [ltrc.iiit.ac.in](https://ltrc.iiit.ac.in/corpus/corpus.html)
- [www.sketchengine.eu](https://www.sketchengine.eu/?p=36746)
- [Punjabi Raw Speech Corpus](https://data.ldcil.org/punjabi-raw-speech-corpus)
- [Punjabi Raw Speech Corpus](https://data.ldcil.org/speech/punjabi-raw-speech-corpus)
- [learnpunjabi.org](https://learnpunjabi.org/s2g_final/progress.htm)
- [www.learnpunjabi.org](https://www.learnpunjabi.org/statistics.html)
- [Stopword list for Punjabi Gurmukhi published](https://medium.com/norch/stopword-list-for-punjabi-gurmukhi-published-a4e6c9b5f30e)
- [Punjabi Raw Speech Corpus](https://data.ldcil.org/speech/speech-raw-corpus/punjabi-raw-speech-corpus)
- [learnpunjabi.org](https://www.learnpunjabi.org/s2g_final/obj.htm)
- [word corpus](https://github.com/wipfli/word-corpus)
- [Punjabi Wikipedia](https://en.wikipedia.org/wiki/Punjabi_Wikipedia)
- [Wiktionary:About Punjabi](https://www.wiktionary.com/wiki/Wiktionary:About_Punjabi)
- [Punjabi Wikipedia](https://Www.Wikipedia.org/wiki/Punjabi_Wikipedia)
- [Category:Punjabi language](https://en.wiktionary.com/wiki/Category:Punjabi_language)
- [Punjabi Wikipedia](https://Wikipedia.com/wiki/Punjabi_Wikipedia)
- [Punjabi Wikipedia](https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.4everland.io/wiki/Panjabi_Wikipedia.html)
- [Punjabi Wikipedia](https://www.mdwiki.org/wiki/Punjabi_Wikipedia)
- [Punjabi Wikipedia](https://simple.wikipedia.com/wiki/Punjabi_Wikipedia)
- [Punjabi Wikipedia](https://cavac.at/cavacopedia/Punjabi%20Wikipedia)
- [language: pa](https://huggingface.co/wikilangs/pa/blob/main/README.md)
- [Punjabi Wikipedia](https://worddisk.com/wiki/Punjabi_Wikipedia)
- [Punjabi Wikipedia](https://bafybeiaysi4s6lnjev27ln5icwm6tueaw2vdykrtjkwiphwekaywqhcjze.ipfs.ipfs.hypha.coop/wiki/Punjabi_Wikipedia_(Eastern))
- [ਸਮੱਗਰੀ 'ਤੇ ਜਾਓ](https://pa.wikipedia.com/wiki/%E0%A8%A4%E0%A8%B8%E0%A8%B5%E0%A9%80%E0%A8%B0:How_to_type_in_Punjabi_Wikipedia.pdf)
- [Jump to content](https://wiki.riteme.site/wiki/Punjabi_Wikipedia)
- [Punjabi Wikipedia (Western)](https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Punjabi_Wikipedia_(Western))
- [Jump to content](https://wiki.riteme.site/wiki/Panjabi_Wikipedia)
- [Punjabi Wikipedia](https://en.wikipedia-on-ipfs.org/wiki/Punjabi_Wikipedia_(Eastern))
- [Punjabi Wikipedia](https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.dweb.link/wiki/Panjabi_Wikipedia.html)
- [huggingface.co](https://huggingface.co/datasets/ai4bharat/Aksharantar/blob/e1968d41423440bdb83263675f4ae93686257af8/README.md?code=true)
- [Aksharantar: Open Indic-language Transliteration datasets and models for the Next Billion Users](https://arxiv.org/pdf/2205.03018)
- [aclanthology.org](https://aclanthology.org/people/gokul-nc/unverified/)
- [Aksharantar: Open Indic-language Transliteration datasets and models for the Next Billion Users](https://cs.paperswithcode.com/paper/aksharantar-towards-building-open)
- [Aksharantar: Open Indic-language Transliteration datasets and models for the Next Billion Users](https://aitopics.org/doc/arxivorg:4A6655BF)
- [annotations_creators: []](https://huggingface.co/datasets/pmdon123/Aksharantar/blob/main/README.md)
- [Aksharantar: Open Indic-language Transliteration datasets and models for the Next Billion Users](https://sotaverified.org/papers/aksharantar-towards-building-open)

## User:

> 10/29/2026 14:45:30

> File: pan.zip

## Assistant:

> 10/29/2026 14:48:24

> Checking the attached archive's contents.
>
> - Checking the attached archive's contents.
> - **Done**

You've attached `pan.zip`, which looks like the Punjabi subset from the Aksharantar dataset we just discussed. I'll unpack it into its own folder and inspect it.

> - Added a task
> - Added a task
> - Ran a command
> - **Done**

It's the Aksharantar Punjabi split (train, valid and test JSON). I'll extract it and profile it.

> Checking a Gurmukhi word's character ordering.
>
> - Ran a command
> - Ran a command
> - Checking a Gurmukhi word's character ordering.
> - **Done**

The Unicode is clean in all three splits: NFC, no stray characters, no unassigned code points. Next I'll check it against the plan's fixture words and see how usable the Roman spellings are.

> ਇਹ ਡੇਟਾਸੈੱਟ ਦੀ ਵਰਤੋਂ ਲਈ
>
> - Ran a command
> - ਇਹ ਡੇਟਾਸੈੱਟ ਦੀ ਵਰਤੋਂ ਲਈ
> - **Done**

Many everyday words are present, but some mappings are noisy: `teaches` maps to ਤੁਸੀਂ and `ghar` maps to ਘੜ. I'll measure that properly and check how well this works as a word list.

> Filing project notes for the Punjabi screenplay app in memory.
>
> - Ran a command
> - Searched the web
> - Couldn't read the page
> - Checking Gurmukhi character order across the romanized word pairs.
> - Quantifying unusual Punjabi combining-mark order and checking licences
> - Ran a command
> - Read a page
> - Couldn't read the page
> - Filing project notes for the Punjabi screenplay app in memory.
> - **Done**

One check before I summarise. I want to confirm whether Unicode normalisation (NFC) would fix those odd mark orders, because that decides whether it matters for the plan's text policy.

> Used 4 tools
>
> - Ran a command
> - Updated memory
> - Updated a task
> - Updated a task
> - **Done**

`pan.zip` is the Aksharantar Punjabi data. It's useful, but it is not the word list your plan needs, and it can't tell us how much of everyday Punjabi a list would cover.

## What's in it
Three JSON-lines files with 534,841 pairs in total, each pair being a Gurmukhi word and a Roman spelling:

| File | Rows | Sources |
|---|---|---|
| `pan_train.json` | 514,724 | IndicCorp 399k, Samanantar 55k, Dakshina 50k, Wikidata 6k, Existing 4k |
| `pan_valid.json` | 8,880 | mostly Dakshina and IndicCorp |
| `pan_test.json` | 11,237 | Dakshina, plus AK-Freq (2,194 frequent words), AK-NEI and AK-NEF (names) |

The Gurmukhi text is clean in all three files. Every word is already NFC, uses only Gurmukhi characters, and has no unassigned code points. The unique Gurmukhi vocabulary is 474,540 words, about 10 MB raw and 1.7 MB gzipped, which fits easily in your size budget.

## Why it isn't a word list
- **No frequencies.** It's a set of word pairs with no counts, so it can filter candidates but can't rank them. Your Level 1B design wants ranking.
- **Most of it is noise.**
  - About 88% of the training rows are mined (IndicCorp and Samanantar) and are mostly rare words, names and English-origin words.
  - Examples are ਹੈਪਬਿਨ ("hapbin") and ਸਬਮਿਲੀਮੀਟਰ ("submillimeter").
  - Some mined Roman spellings are plain wrong: ਤੁਸੀਂ appears with "teaches", and ਘਰ appears as "gharr" while "ghar" maps to ਘੜ.
- **The human-typed part is small but valuable.** Only the Dakshina rows (62,392) were typed by native speakers, averaging 2.5 Roman spellings per word. Everything else averages about one. That's the evidence of how people actually spell Punjabi in Roman letters.
- **Everyday words are mostly there.** 18 of 21 words I picked by hand were present, including ਕਿੱਥੇ, ਪੁੱਤ, ਪੰਜਾਬ, ਮੁੰਡਾ, ਕੁੜੀ and ਜ਼ਿੰਦਗੀ. ਸਟੇਸ਼ਨ, ਫ਼ਰਕ and ਫਰਕ were missing. That is a small hand-picked sample, not a measurement.

## One measurement you can't use
The three files share no Gurmukhi words at all, because the authors split them that way. My attempt to check coverage of the test words against the training vocabulary therefore showed about 0.2%. That says nothing about the vocabulary. To measure real coverage you need independent text, such as Punjabi Wikipedia or text your reviewer writes.

## Licence
The zip has no licence file, so the register entry has to come from upstream. These are the facts:
- **Dakshina rows:** I fetched Google's page, which says CC BY-SA 4.0. That is share-alike. These are the rows with the human spellings.
- **Mined rows (IndicCorp, Samanantar):** the earlier search result for the Aksharantar card said CC0. I couldn't re-fetch the card to confirm it.
- **Manually collected rows:** the same card said CC-BY.
- **Wikidata and "Existing" rows:** I haven't checked these.

The card as I saw it didn't say how the Dakshina-derived rows are licensed inside Aksharantar. Whether share-alike would reach a product that bundles a list built from them is a legal question I can't answer. You can avoid it by filtering out `source == Dakshina`, but then you lose the human spellings.

For `libraries.md` §8, the zip's SHA-256 is `d4d13450866a02974fd887f124ec73bcd5afe71d3c2c859bb0e9faab2d95b48d`. The file dates are 2022-06-13, so it's an older snapshot.

## One finding for your Unicode policy
A few words use a different order for the same marks. For example, ਪੁੱਤ is U+0A41 then U+0A71, while ਪੱੁਤ has them reversed. NFC does not merge these, because both marks have combining class 0. I counted 11 rows with addak before a vowel sign (8 of them in AK-Freq), 54 with tippi first and 11 with bindi first. Reordering would merge 42 of the 474,540 words. It's rare, but DEC-017 assumes NFC makes equivalent text identical, and here it doesn't. A Gurmukhi-specific reordering step at input and search time would handle it.

## What I'd do with it
1. **Use it as raw material, not the list.** Build the real list from Punjabi Wikipedia word counts, which give frequencies, and use this vocabulary to fill gaps after your reviewer samples it.
2. **Use the Dakshina rows to tune Roman-spelling rules and ranking.** The deciding questions are the licence and whether the owner accepts share-alike.
3. **Take AK-Freq as a candidate source for your reviewer's validation set.** It's public, so it can't be the sealed set.

Next, I can write the `libraries.md` §8 register entry with these facts, or build a first frequency list from the Punjabi Wikipedia dump if the workspace can reach it.

Sources:
- [Dakshina dataset (Google Research, GitHub)](https://www.github.com/google-research-datasets/dakshina)
- [Aksharantar dataset card (Hugging Face)](https://huggingface.co/datasets/ai4bharat/Aksharantar/blob/e1968d41423440bdb83263675f4ae93686257af8/README.md?code=true)

## User:

> 10/29/2026 14:49:24

the software size may even go to a gb, that isnt a problem once its set, but how do we get it

## Assistant:

> 10/29/2026 14:50:01

> Listing candidate Punjabi corpora and a transliteration model.
>
> - Listing candidate Punjabi corpora and a transliteration model.
> - **Done**

With a gigabyte of room, the sources I'd rule out for size become realistic. I'll check what exists and under what licences.

> Checking search results for dataset details.
>
> - Searched the web
> - Searched the web
> - Searched the web
> - Checking search results for dataset details.
> - **Done**

The searches returned only links, so I'll read the key pages for sizes and licences.

> ਪੰਜਾਬੀ ਸਰੋਤਾਂ ਤੋਂ ਸ਼ਬਦ
>
> - Read a page
> - Read a page
> - Read a page
> - ਪੰਜਾਬੀ ਸਰੋਤਾਂ ਤੋਂ ਸ਼ਬਦ
> - **Done**

Size no longer limits you, so the aim is to get the best data, not the smallest. You need two kinds of data, from different places.

## 1. Which Gurmukhi words exist and how common they are
Large Punjabi text, counted into a frequency list. The three realistic sources:

| Source | What it is | Licence | Notes |
|---|---|---|---|
| **IndicCorp v2** (AI4Bharat) | Large Indian-language news and web text | The card says CC-0 | Punjabi is `data/pa.txt`. The card gives no Punjabi size, and the download call it shows is untested for Punjabi. |
| **FineWeb-2**, subset `pan_Guru` | Filtered web text | ODC-By 1.0 | 864,180 documents, 1.34 GB. It comes from Common Crawl, so the underlying web content has its own rights. Whether a word-count list counts as derived data is a question for a lawyer. |
| **Punjabi Wikipedia dump** | Encyclopedia text | CC BY-SA | A clean, smaller cross-check. The dump is at `dumps.wikimedia.org/pawiki`. |

Counting words in these gives the frequency ranking that the Aksharantar file lacked. Any of them can be downloaded and counted on your machine.

## 2. How people type those words in Roman letters
A corpus has no Roman spellings, so this needs different data:
- **Aksharantar**, which you already have, supplies human-typed spellings, with the share-alike question on the Dakshina rows.
- **IndicXlit**, AI4Bharat's Roman-to-Indic transliteration model, is about 11 million parameters with MIT-licensed code and model. The page doesn't say it runs offline, but it is a downloadable model, so I'd expect it to. That makes it a candidate for the plan's Level 1C, a small offline ranker. I haven't tested its quality on Punjabi.

## How I'd combine them
1. Download one or two corpora from step 1.
2. Normalise to NFC and fix the mark order I found earlier.
3. Keep only Gurmukhi words, count them, and drop very rare ones. Web text has typos, mixed scripts and garbled legacy-font text.
4. Have your reviewer check a sample from the top, middle and bottom of the list.
5. Join the result to the Roman spellings and rank candidates with both.

## What this changes in the plan
The 10 MiB limit in `STORE-03` and the 2 MiB ranker limit came from running in a browser. A desktop app lifts both, so a bigger list, IndicXlit and word-pair context ranking become possible. Record that as a decision before relying on it.

The workspace can't reach Hugging Face from the shell, so the downloads would run on your computer. I can write the counting and cleaning script now and test it on the Aksharantar words I already have, so it's ready for the real corpus. Say if you want that.

Sources:
- [IndicCorp v2 dataset card](https://huggingface.co/datasets/ai4bharat/IndicCorpV2/blob/main/README.md)
- [IndicXlit (AI4Bharat)](https://indicnlp.ai4bharat.org/indic-xlit/)
- [FineWeb-2 dataset card](https://huggingface.co/datasets/HuggingFaceFW/fineweb-2/blob/cab26bb3cab1ca7c26bb13a48f80fc3d2def4620/README.md)

## User:

> 10/29/2026 14:55:02

IndicCorp v2 (AI4Bharat) data/pa.txt is 9.4GB, 1gig wouldve been fine, but 10 is a bit too big id say

pawiki has too many files and too many folders, it would take me quite some time to download em all but i dont understand the foint in the first lace

## Assistant:

> 10/29/2026 14:55:18

> Separating the build-time corpus from the shipped software.
>
> - Separating the build-time corpus from the shipped software.
> - **Done**

Both problems come from something I didn't make clear. The big files are only raw material, and none of it ships in your app.

## Why we need this text at all
When someone types *kitthe*, the rules produce many possible Gurmukhi spellings, and most of them are not real words. The app needs a list of real Punjabi words, ordered by how common they are, so it can throw out nonsense and put the likely spelling first. It works like the dictionary behind phone autocomplete.

To build that list, you count the words in a lot of real Punjabi text. The 9.4 GB file is only the reading material for counting. The finished list is a few MB, and that is the only part that goes into the app. So the 1 GB budget applies to what you ship, not to what you download.

## IndicCorp at 9.4 GB
You don't need all of it. Word frequencies settle quickly, and a few hundred MB of text gives nearly the same top words as the full file. There are two ways to avoid the full download:
- **Fetch a few slices.** Hugging Face allows partial downloads, so you can grab, say, three 300 MB pieces from different places in the file. Taking pieces from different positions matters, because one stretch of the file may be all one topic.
- **Stream and discard.** A script reads the file while downloading, updates the counts, and throws the text away. Nothing big stays on your disk.

Either way you end with a small list, and the raw text can be deleted.

## Punjabi Wikipedia
It's a single file, not a folder tree. The folder you saw is the dump site listing many variants. As far as I know, the one you need is `pawiki-latest-pages-articles.xml.bz2`, which should be a modest size, since Punjabi Wikipedia is small. It's optional. If the IndicCorp slices work, skip Wikipedia, or use it later as a cross-check.

## What I'd do
Use two or three IndicCorp slices and ignore Wikipedia for now. I can write the script that does the counting and cleaning in one go, either on slices or streaming, and test it on the Aksharantar words I already have, so it works the first time on your machine. Want me to build it?

## User:

> 10/29/2026 14:57:12

pawiki-latest-pages-articles.xml.bz2 is only 92mb, downloading that rn

i will also download the 9.4gb pa.txt

then what

## Assistant:

> 10/29/2026 15:00:08

> Writing the test files and timing runs.
>
> - Writing the test files and timing runs.
> - **Done**

The next step is to build the counting tool, so I'll write the script now and test it with synthetic data here. You can then run it on both downloads.

> Building a test corpus with valid words and markup noise.
>
> - Added a task
> - Added a task
> - Created a file
> - Building a test corpus with valid words and markup noise.
> - **Done**

Before testing, I'll fix one sloppy line I noticed in my own code, the counter for dropped rare words.

> Checking why the cache stops at its limit.
>
> - Edited a file
> - Ran a command
> - Ran a command
> - Checking which test words were kept or dropped.
> - Checking each word's count against the known truth next
> - Ran a command
> - Adding a test for the length check.
> - Checking word counts, then testing the over-length case properly
> - Edited a file
> - Ran a command
> - Weighing how real text with many words would slow the estimate.
> - Exercising the memory-limiting path before sending the script
> - Ran a command
> - Updated a task
> - Updated a task
> - Checking why the cache stops at its limit.
> - Shared files
> - **Done**

I've built `build_wordlist.py`, which turns your two downloads into the frequency list. It needs only Python 3, no extra packages. I tested it on synthetic data here, since I have no real Punjabi corpus in this workspace.

## How to run it
Put the script, the Wikipedia file and `pa.txt` in one folder, then:

```
python build_wordlist.py pawiki-latest-pages-articles.xml.bz2 pa.txt -o out --aksharantar path\to\pan_folder
```

Don't unzip the Wikipedia file. The script reads it compressed.

For a faster first run on `pa.txt`, add `--chunks 8 --chunk-mb 150`. That reads eight 150 MB slices spread across the file instead of all 9.4 GB.

## What it produces in `out/`
- **`wordlist.tsv`** is the list. Each word has a rank, its total count, how many sources contained it, and its count per source. The `--aksharantar` flag adds a column showing whether the word is also in the Aksharantar data you gave me.
- **`review_sample.tsv`** has 40 random words from each frequency band, with blank columns for your reviewer to mark Y/N. This feeds your validation process.
- **`stats.json`** has input sizes and dates, token counts, how much text the list covers, and what was dropped and why. These are the facts `libraries.md` §8 asks for. Add `--hash` to record file checksums, which is slow on a 9 GB file.

It cleans as it goes. It normalises the text, fixes the mark-order problem I found earlier, drops Wikipedia markup, and rejects strings that aren't valid Gurmukhi spelling. It also drops words seen fewer than 3 times, which you can change with `--min-count`.

## What I tested, and what I can't promise
On synthetic data with known answers, every word's count matched exactly. Markup, redirects and non-article pages were ignored, and the wrong-order word merged correctly. Slice sampling never cut a word in half. The speed was about 24 MB/s, which would put a full pass over 9.4 GB at roughly 7 minutes. Real text has far more distinct words than my test, so expect that to be slower.

I couldn't test two things:
- **Real Wikipedia markup is messier** than my fake pages, so the cleaning is approximate. Stray Latin text is harmless, because only Gurmukhi is kept.
- **Memory on the full file.** By default the script keeps at most 6 million distinct words per source, about 1 GB of RAM. If your machine is short on memory, add `--max-entries 3000000`. The limit drops the rarest words first, so it can slightly undercount rare ones.

## What to do with the result
1. Open `stats.json`. The `token_coverage_pct` figures show how much real text the top 10,000 words cover, and `kept_in_aksharantar_pct` shows how well the corpus words agree with Aksharantar.
2. Give `review_sample.tsv` to your Gurmukhi reviewer. Their judgement of the low-frequency bands decides where to cut the list.
3. Send me `stats.json` and the first few hundred lines of `wordlist.tsv`, and I'll help you read them and write the register entry. I'd also join the list to the Aksharantar Roman spellings.

## User:

> 10/29/2026 20:47:10

> File: stats.json

## Assistant:

> 10/29/2026 20:47:49

> Checking which rejected words the structure filter discards.
>
> - Checking which rejected words the structure filter discards.
> - **Done**

Both runs completed, and the results are healthy. Two things in your file need follow-up, and one of them is a flaw in my script, so I'll fix it first. The Aksharantar check reported 0 words, which means it silently found nothing instead of telling you. I'll make the script fail loudly, and also make it list the words its spelling filter rejects so I can check the filter isn't throwing out real words.

> - Couldn't edit the file
> - Couldn't edit the file
> - Couldn't edit the file
> - Edited a file
> - **Done**

Three of the edits didn't match, because the file differs slightly from what I assumed. I'll read the exact text before changing it.

> Tracing why the file differs from my edits.
>
> - Searched files
> - Tracing why the file differs from my edits.
> - **Done**

The file already contains changes I didn't make in this session, such as `reason_tokens` and an early Aksharantar load. I'll read the whole file to see its actual state before touching anything.

> Used tool
>
> - Read a file
> - **Done**

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
