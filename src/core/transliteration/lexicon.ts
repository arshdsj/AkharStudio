/**
 * lexicon.ts - High-Performance In-Memory Gurmukhi Lexicon & Prefix Trie
 * Baseline: V9.1 (DEC-006, DEC-027, TM-02)
 */

export const BUNDLED_LEXICON_METADATA = {
  version: 'v9.1-100k',
  hash: '0f35788d3f253f647b516e48209d1717',
  wordCount: 100000,
  corpus: 'IndicCorp v2 + Punjabi Wikipedia (741.5M tokens)',
  governingDecisions: ['DEC-006', 'DEC-027'],
};

export class TrieNode {
  children: Map<string, TrieNode> = new Map();
  frequency: number = 0;
  isWord: boolean = false;
}

export class GurmukhiLexicon {
  private root: TrieNode = new TrieNode();
  public totalWords: number = 0;

  /**
   * Insert a Gurmukhi word with its frequency into the prefix trie
   */
  insert(word: string, frequency: number): void {
    let node = this.root;
    for (const char of word) {
      let child = node.children.get(char);
      if (!child) {
        child = new TrieNode();
        node.children.set(char, child);
      }
      node = child;
    }
    node.isWord = true;
    node.frequency = Math.max(node.frequency, frequency);
    this.totalWords++;
  }

  /**
   * Get frequency of a word (returns 0 if not a valid word)
   */
  getFrequency(word: string): number {
    let node = this.root;
    for (const char of word) {
      const child = node.children.get(char);
      if (!child) return 0;
      node = child;
    }
    return node.isWord ? node.frequency : 0;
  }

  /**
   * Check if prefix exists in the trie
   */
  isValidPrefix(prefix: string): boolean {
    let node = this.root;
    for (const char of prefix) {
      const child = node.children.get(char);
      if (!child) return false;
      node = child;
    }
    return true;
  }

  /**
   * Populate trie from array of [word, count] tuples
   */
  loadEntries(entries: [string, number][]): void {
    for (const [word, count] of entries) {
      this.insert(word, count);
    }
  }
}

export const INVALID_GURMUKHI_VOWEL_REGEX = /([\u0A05-\u0A14][\u0A3E-\u0A4C])|([\u0A3E-\u0A4C]{2,})/;

export function isValidGurmukhiWord(word: string): boolean {
  if (!word || typeof word !== 'string') return false;
  // Must contain Gurmukhi characters
  if (!/[\u0A00-\u0A7F]/.test(word)) return false;
  // Cannot contain Latin letters
  if (/[a-zA-Z]/.test(word)) return false;
  // Cannot contain invalid vowel combinations
  if (INVALID_GURMUKHI_VOWEL_REGEX.test(word)) return false;
  // Disallow known malformed interjections like 'ਓਯੇ'
  if (word === 'ਓਯੇ') return false;
  return true;
}

/**
 * Local User Dictionary for personal words and dynamic learning (W3, REL-01)
 */
export class UserDictionary {
  private static STORAGE_KEY = 'punjabi_user_dict';
  private words: Map<string, number> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(UserDictionary.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, number>;
          for (const [w, count] of Object.entries(parsed)) {
            if (isValidGurmukhiWord(w)) {
              this.words.set(w, count);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load user dictionary:', err);
      }
    }
  }

  private save(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const obj: Record<string, number> = {};
        this.words.forEach((count, word) => {
          obj[word] = count;
        });
        localStorage.setItem(UserDictionary.STORAGE_KEY, JSON.stringify(obj));
      } catch (err) {
        console.warn('Failed to save user dictionary:', err);
      }
    }
  }

  getBoost(word: string): number {
    if (!isValidGurmukhiWord(word)) return 0;
    return (this.words.get(word) || 0) * 10_000_000;
  }

  recordSelection(word: string): void {
    if (!isValidGurmukhiWord(word)) return;
    const current = this.words.get(word) || 0;
    this.words.set(word, current + 1);
    this.save();
  }

  getAllPreferences(): Record<string, number> {
    const obj: Record<string, number> = {};
    this.words.forEach((count, word) => {
      obj[word] = count;
    });
    return obj;
  }

  setPreference(word: string, count: number): void {
    if (count <= 0) {
      this.words.delete(word);
    } else {
      this.words.set(word, count);
    }
    this.save();
  }

  reset(): void {
    this.words.clear();
    this.save();
  }
}
