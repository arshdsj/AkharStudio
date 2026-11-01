#!/usr/bin/env python3
"""build_wordlist.py - build a Gurmukhi word-frequency list from Punjabi text.

Inputs (any mix, each counted separately so you can see which sources agree):
  * Wikipedia dump   pawiki-latest-pages-articles.xml.bz2   (or an unpacked .xml)
  * plain text       e.g. IndicCorp v2 pa.txt (.txt, .gz and .bz2 also work)

Outputs (in --out):
  wordlist.tsv       rank, word, count, n_sources, one count column per input
                     (+ in_aksharantar if --aksharantar is given)
  review_sample.tsv  random words from each frequency band, for the reviewer
  stats.json         everything needed for the libraries.md register

Text is normalised to NFC, the Gurmukhi mark-order quirk is fixed (addak,
tippi, bindi go AFTER the vowel sign; NFC does not do this), words are checked
against Gurmukhi spelling structure, and rare words are dropped.

Examples
  python build_wordlist.py pawiki-latest-pages-articles.xml.bz2 pa.txt -o out
  python build_wordlist.py pa.txt -o out --chunks 8 --chunk-mb 150   # sample
  python build_wordlist.py pa.txt -o out --aksharantar path/to/pan_folder
"""
import argparse, bz2, collections, gzip, hashlib, json, os, random, re, sys, time
import unicodedata
import xml.etree.ElementTree as ET

VERSION = "1.2"

# Assigned Gurmukhi letters/marks only (no digits, no unassigned code points).
GURM = ("ਁ-ਃਅ-ਊਏਐਓ-ਨਪ-ਰ"
        "ਲਲ਼ਵਸ਼ਸਹ਼ਾ-ੂੇੈ"
        "ੋ-੍ੑਖ਼-ੜਫ਼ੰ-ੵ")
TOKEN = re.compile(f"[{GURM}]+")

# Legitimate standalone single-character words in Punjabi:
# ਚ (in/inside), ਆ (come), ਏ (this/is), ਈ (itself), ਜ (if/or), ਓ (vocative O), ਐ (is), ੴ (Ek Onkar)
LEGITIMATE_SINGLE_CHAR_WORDS = frozenset({"ਚ", "ਆ", "ਏ", "ਈ", "ਜ", "ਓ", "ਐ", "ੴ"})

CONS = "[ਕ-ਨਪ-ਰਲਵਸਹੜਖ਼-ਜ਼ਫ਼ਸ਼ਲ਼]"
INDEP = "[ਅ-ਊਏਐਓਔੲੳੴ]"
VSIGN = "[ਾ-ੂੇੈੋੌ]"
SYLLABLE = (f"(?:{CONS}਼?(?:੍{CONS}਼?)*|{INDEP})"
            f"{VSIGN}?ੱ?[ੰਂਁ]?")
VALID = re.compile(f"^(?:{SYLLABLE})+$")

MAX_LEN = 25

# Combining mark and conjunct reordering regexes:
# 1. addak/tippi/bindi/candrabindu written before a vowel sign -> move after it.
REORDER_DIACRITIC = re.compile("([ੰੱਂਁ]+)([ਾ-ੂੇੈੋੌ])")
# 2. post-vocalic pairin-ha (e.g. ਉਨਾਂ੍ਹ, ਤਰਾਂ੍ਹ) -> move ha back to the base consonant (ਉਨ੍ਹਾਂ, ਤਰ੍ਹਾਂ).
REORDER_POST_HA = re.compile(r"([ਕ-ਨਪ-ਰਲਵਸਹੜਖ਼-ਜ਼ਫ਼ਸ਼ਲ਼]਼?)([ਾ-ੂੇੈੋੌ])([ੰਂਁ]?)(੍[ਹ])")
# 3. vowel sign typed before virama+consonant (e.g. ਪਿ੍ਰੰਸੀਪਲ) -> reorder to canonical (ਪ੍ਰਿੰਸੀਪਲ).
REORDER_CONJUNCT = re.compile(r"([ਾ-ੂੇੈੋੌ])(੍[ਕ-ਨਪ-ਰਲਵਸਹੜਖ਼-ਜ਼ਫ਼ਸ਼ਲ਼])")


def normalize_gurmukhi(text):
    """Normalize Gurmukhi text canonically: NFC + correct non-canonical mark orders."""
    text = unicodedata.normalize("NFC", text)
    text = REORDER_DIACRITIC.sub(r"\2\1", text)
    text = REORDER_POST_HA.sub(r"\1\4\2\3", text)
    text = REORDER_CONJUNCT.sub(r"\2\1", text)
    return text


def validate_word(w, min_count=1, count=1):
    """Validate Gurmukhi word structure and frequency. Returns None if valid, or rejection reason."""
    if count < min_count:
        return "below_min_count"
    if len(w) == 1:
        if w not in LEGITIMATE_SINGLE_CHAR_WORDS:
            return "bad_length"
    elif len(w) < 1 or len(w) > MAX_LEN:
        return "bad_length"
    if not VALID.match(w):
        return "invalid_structure"
    return None

# --- Wikipedia markup (approximate; only Gurmukhi tokens are kept anyway) ----
RE_COMMENT = re.compile(r"<!--.*?-->", re.S)
RE_REF = re.compile(r"<ref[^>/]*>.*?</ref>|<ref[^>]*/>", re.S)
RE_TAG = re.compile(r"<[^>]+>")
RE_URL = re.compile(r"https?://\S+")
RE_TEMPLATE = re.compile(r"\{\{[^{}]*\}\}")
RE_NSLINK = re.compile(r"\[\[[^\[\]|:]{1,30}:[^\[\]]*\]\]")
RE_LINK = re.compile(r"\[\[(?:[^\[\]|]*\|)?([^\[\]]*)\]\]")


def clean_wiki(text):
    text = RE_COMMENT.sub(" ", text)
    text = RE_REF.sub(" ", text)
    for _ in range(10):
        new = RE_TEMPLATE.sub(" ", text)
        if new == text:
            break
        text = new
    text = RE_NSLINK.sub(" ", text)
    text = RE_LINK.sub(r"\1", text)
    text = RE_URL.sub(" ", text)
    return RE_TAG.sub(" ", text)


class Counter(collections.Counter):
    pruned = 0

    def prune(self, max_entries):
        """Bound memory: drop the rarest entries when the table gets too big."""
        floor = 1
        while len(self) > max_entries and floor < 50:
            for w in [w for w, c in self.items() if c <= floor]:
                del self[w]
                self.pruned += 1
            floor += 1


def count_text(text, counter):
    text = normalize_gurmukhi(text)
    toks = TOKEN.findall(text)
    counter.update(toks)
    return len(toks)


def open_binary(path):
    if path.endswith(".bz2"):
        return bz2.open(path, "rb")
    if path.endswith(".gz"):
        return gzip.open(path, "rb")
    return open(path, "rb", buffering=1 << 20)


def is_wiki(path):
    return path.endswith(".xml") or path.endswith(".xml.bz2")


def iter_wiki_pages(path):
    with open_binary(path) as f:
        for _, elem in ET.iterparse(f, events=("end",)):
            if elem.tag.rsplit("}", 1)[-1] != "page":
                continue
            ns, text, redirect = None, "", False
            for ch in elem.iter():
                name = ch.tag.rsplit("}", 1)[-1]
                if name == "ns":
                    ns = (ch.text or "").strip()
                elif name == "redirect":
                    redirect = True
                elif name == "text":
                    text = ch.text or ""
            elem.clear()
            if ns == "0" and not redirect and text:
                yield text


def iter_lines(path, chunks=0, chunk_mb=0):
    """Yield decoded lines. With chunks>0, read evenly spaced slices of a plain file."""
    if chunks and not path.endswith((".gz", ".bz2")):
        size = os.path.getsize(path)
        want = chunk_mb * 1024 * 1024
        if want * chunks >= size:
            chunks = 0
    if not chunks or path.endswith((".gz", ".bz2")):
        with open_binary(path) as f:
            for line in f:
                yield line.decode("utf-8", "ignore"), len(line)
        return
    step = (size - want) / max(chunks - 1, 1)
    with open(path, "rb", buffering=1 << 20) as f:
        for i in range(chunks):
            f.seek(int(i * step))
            if i:
                f.readline()  # skip the partial line we landed in
            read = 0
            while read < want:
                line = f.readline()
                if not line:
                    break
                read += len(line)
                yield line.decode("utf-8", "ignore"), len(line)


def count_source(path, args, label):
    counter, tokens, nbytes = Counter(), 0, 0
    t0, next_report = time.time(), 256 * 1024 * 1024
    if is_wiki(path):
        pages = 0
        for text in iter_wiki_pages(path):
            tokens += count_text(clean_wiki(text), counter)
            pages += 1
            if pages % 5000 == 0:
                counter.prune(args.max_entries)
                print(f"  [{label}] {pages:,} pages, {len(counter):,} distinct", flush=True)
        nbytes = os.path.getsize(path)
        print(f"  [{label}] {pages:,} pages read")
    else:
        for line, n in iter_lines(path, args.chunks, args.chunk_mb):
            tokens += count_text(line, counter)
            nbytes += n
            if nbytes >= next_report:
                counter.prune(args.max_entries)
                mb = nbytes / 1e6
                print(f"  [{label}] {mb:,.0f} MB read, {len(counter):,} distinct, "
                      f"{mb / (time.time() - t0):.1f} MB/s", flush=True)
                next_report += 256 * 1024 * 1024
        counter.prune(args.max_entries)
    return counter, tokens, nbytes, time.time() - t0


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 24), b""):
            h.update(block)
    return h.hexdigest()


def load_aksharantar(folder):
    words = set()
    for name in ("train", "valid", "test"):
        p = os.path.join(folder, f"pan_{name}.json")
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        w = json.loads(line)["native word"]
                        words.add(normalize_gurmukhi(w))
    return words


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("-o", "--out", default="wordlist_out")
    ap.add_argument("--min-count", type=int, default=3, help="drop words seen fewer times in total (default 3)")
    ap.add_argument("--chunks", type=int, default=0, help="plain-text files: read this many evenly spaced slices")
    ap.add_argument("--chunk-mb", type=int, default=150, help="size of each slice in MB (default 150)")
    ap.add_argument("--max-entries", type=int, default=6_000_000, help="memory bound per source (default 6M words)")
    ap.add_argument("--aksharantar", help="folder with pan_train/valid/test.json, adds an in_aksharantar column")
    ap.add_argument("--hash", action="store_true", help="record SHA-256 of each input (slow on a 9 GB file)")
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    ak = None
    if args.aksharantar:  # load first so a wrong folder fails now, not after a long run
        ak = load_aksharantar(args.aksharantar)
        if not ak:
            sys.exit(f"No pan_train.json / pan_valid.json / pan_test.json found in "
                     f"{args.aksharantar!r}. Point --aksharantar at the folder that "
                     f"contains those files (check for an extra sub-folder after unzipping).")
        print(f"Loaded {len(ak):,} Aksharantar words", flush=True)

    sources, per_source, info = [], [], []
    for path in args.inputs:
        label = os.path.basename(path)
        print(f"Counting {path}", flush=True)
        counter, tokens, nbytes, secs = count_source(path, args, label)
        sources.append(label)
        per_source.append(counter)
        rec = {"path": os.path.abspath(path), "file_size": os.path.getsize(path),
               "mtime": time.strftime("%Y-%m-%d", time.localtime(os.path.getmtime(path))),
               "bytes_read": nbytes, "gurmukhi_tokens": tokens, "distinct_raw": len(counter),
               "pruned_entries": counter.pruned, "seconds": round(secs, 1),
               "sampled": bool(args.chunks and not is_wiki(path))}
        if args.hash:
            rec["sha256"] = sha256_of(path)
        info.append(rec)

    print("Merging and filtering", flush=True)
    total = collections.Counter()
    for c in per_source:
        total.update(c)
    all_tokens = sum(total.values())
    reasons, reason_tokens = collections.Counter(), collections.Counter()
    kept, rejected = [], []
    for w, n in total.items():
        reason = validate_word(w, min_count=args.min_count, count=n)
        if reason is not None:
            reasons[reason] += 1
            reason_tokens[reason] += n
            if reason != "below_min_count":
                rejected.append((n, w, reason))
        else:
            kept.append((w, n))
    kept.sort(key=lambda x: (-x[1], x[0]))
    rejected.sort(key=lambda x: (-x[0], x[1]))
    # Most frequent rejected words: check here that real words are not being thrown out.
    with open(os.path.join(args.out, "rejected.tsv"), "w", encoding="utf-8", newline="\n") as f:
        f.write("count\tword\treason\tcodepoints\n")
        for n, w, reason in rejected[:3000]:
            f.write(f"{n}\t{w}\t{reason}\t{' '.join(f'{ord(c):04X}' for c in w)}\n")

    header = ["rank", "word", "count", "n_sources"] + [f"count_{s}" for s in sources]
    if ak is not None:
        header.append("in_aksharantar")
    kept_tokens = 0
    with open(os.path.join(args.out, "wordlist.tsv"), "w", encoding="utf-8", newline="\n") as f:
        f.write("\t".join(header) + "\n")
        for rank, (w, n) in enumerate(kept, 1):
            cs = [c.get(w, 0) for c in per_source]
            row = [str(rank), w, str(n), str(sum(1 for x in cs if x))] + [str(x) for x in cs]
            if ak is not None:
                row.append("1" if w in ak else "0")
            f.write("\t".join(row) + "\n")
            kept_tokens += n

    bands = [(1, 1000), (1001, 10000), (10001, 50000), (50001, 200000), (200001, 10**9)]
    rng = random.Random(args.seed)
    with open(os.path.join(args.out, "review_sample.tsv"), "w", encoding="utf-8", newline="\n") as f:
        f.write("band\trank\tword\tcount\treviewer_ok(Y/N/?)\tnotes\n")
        for lo, hi in bands:
            pool = kept[lo - 1:hi]
            for i in sorted(rng.sample(range(len(pool)), min(40, len(pool)))):
                w, n = pool[i]
                f.write(f"{lo}-{hi if hi < 10**9 else 'end'}\t{lo + i}\t{w}\t{n}\t\t\n")

    cover, run, marks = {}, 0, {100, 500, 1000, 5000, 10000, 50000, 100000, 200000}
    for rank, (_, n) in enumerate(kept, 1):
        run += n
        if rank in marks:
            cover[f"top_{rank}"] = round(100 * run / all_tokens, 2)
    stats = {
        "script_version": VERSION, "run_date": time.strftime("%Y-%m-%d"),
        "inputs": info, "min_count": args.min_count,
        "total_tokens": all_tokens, "distinct_raw_merged": len(total),
        "words_kept": len(kept), "tokens_in_kept_words_pct": round(100 * kept_tokens / max(all_tokens, 1), 2),
        "dropped_distinct": dict(reasons),
        "dropped_tokens": {k: v for k, v in reason_tokens.items()},
        "dropped_tokens_pct": {k: round(100 * v / max(all_tokens, 1), 3) for k, v in reason_tokens.items()},
        "words_at_min_count": {
            str(t): {"words": sum(1 for _, n in kept if n >= t),
                     "tokens_pct": round(100 * sum(n for _, n in kept if n >= t) / max(all_tokens, 1), 2)}
            for t in (3, 5, 10, 20, 50, 100, 500) if t >= args.min_count},
        "token_coverage_pct": cover,
        "multi_source_words": sum(1 for w, _ in kept if sum(1 for c in per_source if w in c) > 1),
    }
    if ak is not None:
        stats["aksharantar_words"] = len(ak)
        stats["kept_in_aksharantar_pct"] = round(100 * sum(1 for w, _ in kept if w in ak) / max(len(kept), 1), 2)
        stats["top10000_in_aksharantar_pct"] = round(100 * sum(1 for w, _ in kept[:10000] if w in ak) / max(min(len(kept), 10000), 1), 2)
    with open(os.path.join(args.out, "stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(json.dumps(stats, ensure_ascii=False, indent=2))
    print(f"\nDone. Files in {args.out}/")


if __name__ == "__main__":
    sys.exit(main())
