#!/usr/bin/env python3
"""evaluate_dialogue_coverage.py - Evaluate wordlist coverage against independent Punjabi dialogue samples.

Tests representative conversational, colloquial, and screenplay dialogue to ensure
natural spoken Punjabi vocabulary is covered by the top-10k and top-50k lexicon cuts.
"""
import os
import re
import unicodedata

# Independent Punjabi dialogue test corpus (typical film/drama dialogue)
SAMPLE_DIALOGUES = [
    # Scene 1: Rural drama
    """
    ਸੂਰਜ ਸਿਰ 'ਤੇ ਚੜ੍ਹਿਆ ਹੋਇਆ ਹੈ। ਪਿੰਡ ਦੇ ਪਿੱਪਲ ਹੇਠ ਬਜ਼ੁਰਗ ਚੌਪਾਲ ਲਾਈ ਬੈਠੇ ਹਨ।
    ਕਿੱਥੇ ਰਹਿ ਗਿਆ ਮੁੰਡਾ? ਮੈਂ ਉਹਨੂੰ ਦਸ ਵਾਰ ਕਿਹਾ ਸੀ ਕਿ ਅੰਮ੍ਰਿਤਸਰ ਵਾਲੀ ਬੱਸ ਵੇਲੇ ਸਿਰ ਫੜਨੀ ਆਂ।
    ਚਾਚਾ ਜੀ, ਫ਼ਿਕਰ ਨਾ ਕਰੋ। ਉਹ ਆਪਣੀ ਪੁਰਾਣੀ ਜੀਪ ਚ ਗਿਆ ਏ। ਕਹਿੰਦਾ ਸੀ ਕਿ ਪ੍ਰਿੰਸੀਪਲ ਸਾਹਿਬ ਨਾਲ ਗੱਲ ਕਰਕੇ ਸਿੱਧਾ ਘਰ ਆਵੇਗਾ।
    ਉਨ੍ਹਾਂ ਦਾ ਕੋਈ ਭਰੋਸਾ ਨਹੀਂ। ਜ਼ਿੰਦਗੀ ਚ ਕਦੇ ਕੋਈ ਕੰਮ ਵੇਲੇ ਸਿਰ ਕੀਤਾ ਏ ਉਹਨੇ?
    ਬਾਪੂ ਜੀ, ਤੁਸੀਂ ਐਵੇਂ ਗੁੱਸਾ ਕਰਦੇ ਓ। ਉਹ ਮਿਹਨਤ ਕਰ ਰਿਹਾ ਹੈ।
    """,
    # Scene 2: Emotional family dialogue
    """
    ਤੂੰ ਮੈਨੂੰ ਕਦੇ ਦੱਸਿਆ ਹੀ ਨਹੀਂ ਕਿ ਤੇਰੇ ਦਿਲ ਚ ਕੀ ਚੱਲ ਰਿਹਾ ਹੈ।
    ਕੀ ਦੱਸਦਾ ਬੇਬੇ? ਜਦੋਂ ਬਾਪੂ ਜੀ ਨੇ ਮੇਰੀ ਸੁਣੀ ਹੀ ਨਹੀਂ, ਤਾਂ ਮੈਂ ਕੀ ਕਹਿੰਦਾ?
    ਪੁੱਤ, ਮਾਪੇ ਕਦੇ ਔਲਾਦ ਦਾ ਮਾੜਾ ਨਹੀਂ ਸੋਚਦੇ। ਜੇ ਉਹਨਾਂ ਤੈਨੂੰ ਡਾਂਟਿਆ ਸੀ ਤਾਂ ਤੇਰੇ ਭਲੇ ਲਈ ਹੀ ਸੀ।
    ਪਰ ਬੇਬੇ, ਮੇਰੇ ਸੁਪਨੇ ਵੱਖਰੇ ਨੇ। ਮੈਂ ਖੇਤੀ ਨਹੀਂ ਕਰਨੀ, ਮੈਂ ਸ਼ਹਿਰ ਜਾ ਕੇ ਆਪਣਾ ਕੰਮ ਸ਼ੁਰੂ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ।
    ਰੱਬ ਰਾਖਾ ਤੇਰਾ, ਜਿੱਥੇ ਵੀ ਜਾਵੇਂ ਖ਼ੁਸ਼ ਰਹੇਂ।
    """,
    # Scene 3: Fast-paced urban conflict
    """
    ਤੂੰ ਸਮਝਦਾ ਕੀ ਏ ਆਪਣੇ ਆਪ ਨੂੰ? ਇੱਥੇ ਕੋਈ ਤੇਰਾ ਗੁਲਾਮ ਨਹੀਂ ਬੈਠਾ।
    ਆਵਾਜ਼ ਨੀਵੀਂ ਰੱਖ ਕੇ ਗੱਲ ਕਰ। ਜੇ ਮੈਂ ਮੂੰਹ ਖੋਲ੍ਹਿਆ ਤਾਂ ਸਾਰੀ ਹਕੀਕਤ ਸਾਹਮਣੇ ਆ ਜਾਵੇਗੀ।
    ਜਾਹ, ਜੋ ਕਰਨਾ ਏ ਕਰ ਲੈ! ਮੈਂ ਕਿਸੇ ਤੋਂ ਨਹੀਂ ਡਰਦਾ।
    ਪੁਲਿਸ ਥਾਣੇ ਜਾ ਕੇ ਦੱਸੀਂ ਕਿ ਪੈਸੇ ਕਿੱਥੇ ਲੁਕਾਏ ਨੇ।
    ਕੋਈ ਸਬੂਤ ਹੈ ਤੇਰੇ ਕੋਲ? ਬਿਨਾਂ ਸਬੂਤ ਤੋਂ ਇਲਜ਼ਾਮ ਨਾ ਲਾ।
    """
]


def load_lexicon(tsv_path):
    words = {}
    with open(tsv_path, "r", encoding="utf-8") as f:
        header = f.readline()
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 3:
                rank = int(parts[0])
                word = parts[1]
                count = int(parts[2])
                words[word] = (rank, count)
    return words


def evaluate():
    tsv_path = "Punjabi/out/wordlist.tsv"
    if not os.path.exists(tsv_path):
        print(f"Error: {tsv_path} not found.")
        return

    print(f"Loading lexicon from {tsv_path}...")
    lexicon = load_lexicon(tsv_path)
    total_lexicon_size = len(lexicon)
    print(f"Total words in lexicon: {total_lexicon_size:,}\n")

    # Tokenize dialogue
    token_re = re.compile(r"[\u0A00-\u0A7F]+")
    all_tokens = []
    for d in SAMPLE_DIALOGUES:
        cleaned = unicodedata.normalize("NFC", d)
        tokens = token_re.findall(cleaned)
        all_tokens.extend(tokens)

    total_tokens = len(all_tokens)
    distinct_tokens = set(all_tokens)

    in_top_1k = 0
    in_top_5k = 0
    in_top_10k = 0
    in_top_50k = 0
    in_lexicon = 0
    missing = []

    for t in all_tokens:
        if t in lexicon:
            rank, _ = lexicon[t]
            in_lexicon += 1
            if rank <= 50_000:
                in_top_50k += 1
            if rank <= 10_000:
                in_top_10k += 1
            if rank <= 5_000:
                in_top_5k += 1
            if rank <= 1_000:
                in_top_1k += 1
        else:
            missing.append(t)

    print("=" * 60)
    print(f"Independent Punjabi Dialogue Coverage Report")
    print("=" * 60)
    print(f"Total dialogue tokens tested : {total_tokens}")
    print(f"Distinct dialogue words       : {len(distinct_tokens)}")
    print("-" * 60)
    print(f"Top 1,000 words coverage     : {in_top_1k / total_tokens * 100:.2f}% ({in_top_1k}/{total_tokens})")
    print(f"Top 5,000 words coverage     : {in_top_5k / total_tokens * 100:.2f}% ({in_top_5k}/{total_tokens})")
    print(f"Top 10,000 words coverage    : {in_top_10k / total_tokens * 100:.2f}% ({in_top_10k}/{total_tokens})")
    print(f"Top 50,000 words coverage    : {in_top_50k / total_tokens * 100:.2f}% ({in_top_50k}/{total_tokens})")
    print(f"Full lexicon coverage        : {in_lexicon / total_tokens * 100:.2f}% ({in_lexicon}/{total_tokens})")
    print("-" * 60)

    if missing:
        print(f"Missing tokens ({len(missing)}): {set(missing)}")
    else:
        print("Missing tokens: None (100% of tested dialogue words present in lexicon!)")
    print("=" * 60)


if __name__ == "__main__":
    evaluate()
