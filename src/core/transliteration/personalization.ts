/**
 * personalization.ts - Personalised Suggestion Ranking Engine
 *
 * Implements a gradual, privacy-preserving, local-first learning model:
 * - Tracks user suggestion selections keyed per Roman input.
 * - Multi-factor scoring combining:
 *   - Frequency (logarithmic growth)
 *   - Recency (exponential time decay)
 *   - Confidence (selection ratio among alternatives for that Roman input)
 * - Safe: Never overrides hard spelling exclusions or introduces invalid words.
 * - Isolated: Different Roman inputs do not incorrectly share preferences.
 * - Persistent & resettable via LocalStorage.
 */

import { isValidGurmukhiWord } from './lexicon';
import { isExcludedSpelling } from './spellingCorrections';

export interface SelectionRecord {
  count: number;
  lastSelectedAt: number;
}

export type PersonalizationData = Record<string, Record<string, SelectionRecord>>;

export class PersonalizationEngine {
  private static STORAGE_KEY = 'punjabi_personalization_v2';
  private data: Map<string, Map<string, SelectionRecord>> = new Map();

  constructor() {
    this.load();
  }

  /**
   * Normalize Roman input: trimmed, lowercased.
   */
  public static normalizeRoman(roman: string): string {
    return roman ? roman.trim().toLowerCase() : '';
  }

  /**
   * Load personalized selection history from localStorage.
   */
  public load(): void {
    this.data.clear();
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(PersonalizationEngine.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PersonalizationData;
          for (const [roman, wordMap] of Object.entries(parsed)) {
            const innerMap = new Map<string, SelectionRecord>();
            for (const [word, record] of Object.entries(wordMap)) {
              if (isValidGurmukhiWord(word) && record && typeof record.count === 'number') {
                innerMap.set(word, {
                  count: record.count,
                  lastSelectedAt: record.lastSelectedAt || Date.now(),
                });
              }
            }
            if (innerMap.size > 0) {
              this.data.set(roman, innerMap);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load personalization data:', err);
      }
    }
  }

  /**
   * Persist current state to localStorage.
   */
  public save(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const serialized: PersonalizationData = {};
        this.data.forEach((innerMap, roman) => {
          serialized[roman] = {};
          innerMap.forEach((record, word) => {
            serialized[roman][word] = record;
          });
        });
        localStorage.setItem(PersonalizationEngine.STORAGE_KEY, JSON.stringify(serialized));
      } catch (err) {
        console.warn('Failed to save personalization data:', err);
      }
    }
  }

  /**
   * Record that a user selected a specific Gurmukhi word for a Roman input.
   */
  public recordSelection(word: string, romanInput?: string): void {
    if (!word || !isValidGurmukhiWord(word)) return;
    const roman = PersonalizationEngine.normalizeRoman(romanInput || '');
    if (!roman) return;

    // Never record or boost hard-excluded spellings
    if (isExcludedSpelling(roman, word)) return;

    let innerMap = this.data.get(roman);
    if (!innerMap) {
      innerMap = new Map();
      this.data.set(roman, innerMap);
    }

    const current = innerMap.get(word) || { count: 0, lastSelectedAt: Date.now() };
    innerMap.set(word, {
      count: current.count + 1,
      lastSelectedAt: Date.now(),
    });

    this.save();
  }

  /**
   * Calculate personalized boost for a candidate word given the Roman input.
   *
   * Features:
   * - Frequency: Logarithmic scaling ensures multiple selections gradually elevate
   *   a word without an accidental single click causing an immediate erratic jump.
   * - Recency: Exponential decay with a 14-day half-life favors recently preferred words.
   * - Confidence: Ratio of selections for this word against total selections for this Roman input.
   */
  public getBoost(word: string, romanInput?: string): number {
    if (!word || !isValidGurmukhiWord(word)) return 0;
    const roman = PersonalizationEngine.normalizeRoman(romanInput || '');
    if (!roman) return 0;

    // Hard exclusions receive zero boost
    if (isExcludedSpelling(roman, word)) return 0;

    const innerMap = this.data.get(roman);
    if (!innerMap) return 0;

    const record = innerMap.get(word);
    if (!record || record.count <= 0) return 0;

    // Total selections for this Roman input
    let totalSelections = 0;
    innerMap.forEach((rec) => {
      totalSelections += rec.count;
    });

    const confidence = totalSelections > 0 ? record.count / totalSelections : 1;

    // Recency decay: 14 days half-life
    const daysSince = Math.max(0, (Date.now() - record.lastSelectedAt) / (1000 * 60 * 60 * 24));
    const recencyFactor = Math.pow(0.5, daysSince / 14);

    // Gradual score components
    // 1 selection  -> log2(2) = 1.00  -> ~35k bonus
    // 2 selections -> log2(3) = 1.58  -> ~55k bonus
    // 3 selections -> log2(4) = 2.00  -> ~70k bonus
    // 5 selections -> log2(6) = 2.58  -> ~90k bonus
    // 8 selections -> log2(9) = 3.17  -> ~110k bonus
    const freqBonus = Math.log2(1 + record.count) * 25_000;
    const recencyBonus = 15_000 * recencyFactor;

    const totalBoost = (freqBonus + recencyBonus) * (0.5 + 0.5 * confidence);
    return Math.round(totalBoost);
  }

  /**
   * Get all selection records for testing or diagnostics.
   */
  public getHistory(romanInput: string): Record<string, SelectionRecord> {
    const roman = PersonalizationEngine.normalizeRoman(romanInput);
    const innerMap = this.data.get(roman);
    if (!innerMap) return {};
    const result: Record<string, SelectionRecord> = {};
    innerMap.forEach((rec, w) => {
      result[w] = { ...rec };
    });
    return result;
  }

  /**
   * Clear all personalized learning data.
   */
  public reset(): void {
    this.data.clear();
    this.save();
  }
}
