/**
 * custom-dictionary.test.ts - Automated Tests for Custom Dictionary
 * Covers: CRUD, aliases, exact-match Rank 1 prioritization, Space-commit,
 * duplicate prevention, TSV import/export with error reporting, and persistence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CustomDictionary } from '../src/core/transliteration/customDictionary';
import { GurmukhiLexicon, UserDictionary } from '../src/core/transliteration/lexicon';
import { GurmukhiTransliterator } from '../src/core/transliteration/engine';

describe('Custom Dictionary Feature', () => {
  let customDict: CustomDictionary;
  let lexicon: GurmukhiLexicon;
  let transliterator: GurmukhiTransliterator;

  // Mock localStorage for node environment
  const mockStorage: Record<string, string> = {};
  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }

    // Set up global localStorage mock if not available
    if (typeof globalThis.localStorage === 'undefined') {
      (globalThis as any).localStorage = {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          for (const key in mockStorage) delete mockStorage[key];
        },
      };
    } else {
      localStorage.clear();
    }

    customDict = new CustomDictionary();
    lexicon = new GurmukhiLexicon();
    // Seed general lexicon with words
    lexicon.insert('ਜੈਲਲਾ', 100);
    lexicon.insert('ਜੈੱਲ', 500);
    lexicon.insert('ਜੈੱਲਾਂ', 1200);

    transliterator = new GurmukhiTransliterator(lexicon, new UserDictionary(), customDict);
  });

  describe('CRUD Operations & Aliases', () => {
    it('creates a custom entry with multiple aliases and retrieves exact match', () => {
      const entry = customDict.addEntry('ਜੈੱਲਾ', ['jailla', 'jaila'], 'Character Name');
      expect(entry.id).toBeDefined();
      expect(entry.gurmukhi).toBe('ਜੈੱਲਾ');
      expect(entry.aliases).toEqual(['jailla', 'jaila']);
      expect(entry.notes).toBe('Character Name');

      expect(customDict.getExactMatches('jailla')).toEqual(['ਜੈੱਲਾ']);
      expect(customDict.getExactMatches('JAILLA')).toEqual(['ਜੈੱਲਾ']); // Case insensitive
      expect(customDict.getExactMatches('jaila')).toEqual(['ਜੈੱਲਾ']);
      expect(customDict.getExactMatches('unknown')).toEqual([]);
    });

    it('edits an existing entry', () => {
      const entry = customDict.addEntry('ਜੈੱਲਾ', ['jailla']);
      const updated = customDict.updateEntry(entry.id, 'ਜੈੱਲਾ', ['jailla', 'jailaa'], 'Updated note');

      expect(updated.aliases).toEqual(['jailla', 'jailaa']);
      expect(customDict.getExactMatches('jailaa')).toEqual(['ਜੈੱਲਾ']);
    });

    it('deletes an entry and removes all its alias lookups', () => {
      const entry = customDict.addEntry('ਜੈੱਲਾ', ['jailla', 'jaila']);
      expect(customDict.getExactMatches('jailla')).toEqual(['ਜੈੱਲਾ']);

      const deleted = customDict.deleteEntry(entry.id);
      expect(deleted).toBe(true);
      expect(customDict.getExactMatches('jailla')).toEqual([]);
      expect(customDict.getExactMatches('jaila')).toEqual([]);
    });
  });

  describe('Duplicate Trigger Handling', () => {
    it('detects duplicate triggers and prevents silent overwriting', () => {
      customDict.addEntry('ਜੈੱਲਾ', ['jailla']);

      // Trying to add another word with the same trigger should fail by default
      expect(() => {
        customDict.addEntry('ਜੈਲ', ['jailla'], undefined, false);
      }).toThrow(/already assigned/);

      // Verify original mapping was not corrupted
      expect(customDict.getExactMatches('jailla')).toEqual(['ਜੈੱਲਾ']);
    });

    it('allows explicit overwrite when allowOverwrite is true', () => {
      customDict.addEntry('ਜੈੱਲਾ', ['jailla']);
      const overwritten = customDict.addEntry('ਜੈਲ', ['jailla'], undefined, true);

      expect(overwritten.gurmukhi).toBe('ਜੈਲ');
      expect(customDict.getExactMatches('jailla')).toEqual(['ਜੈਲ']);
    });
  });

  describe('Exact Match Ranking (jailla -> ਜੈੱਲਾ fixture)', () => {
    it('ranks custom entry above automatically generated candidates at Rank 1', () => {
      // Before custom entry: general transliteration produces alternatives
      const before = transliterator.suggest('jailla', 5);
      expect(before[0]).not.toBe('ਜੈੱਲਾ');

      // Add custom entry
      customDict.addEntry('ਜੈੱਲਾ', ['jailla']);

      // After custom entry: exact match must be Rank 1
      const after = transliterator.suggest('jailla', 5);
      expect(after[0]).toBe('ਜੈੱਲਾ');
      // Subsequent candidates should still contain generated words (without duplicate)
      expect(after.length).toBeGreaterThan(1);
      expect(after.filter((w) => w === 'ਜੈੱਲਾ').length).toBe(1);
    });

    it('keeps custom entries separate from base lexicon frequency counts', () => {
      customDict.addEntry('ਜੈੱਲਾ', ['jailla']);
      // Base lexicon frequency of ਜੈੱਲਾ is 0 because it was not in base lexicon
      expect(lexicon.getFrequency('ਜੈੱਲਾ')).toBe(0);

      // But suggest() prioritizes it at Rank 1 via custom dictionary
      const candidates = transliterator.suggest('jailla', 5);
      expect(candidates[0]).toBe('ਜੈੱਲਾ');
    });
  });

  describe('Persistence across restarts', () => {
    it('persists entries across new CustomDictionary instances', () => {
      customDict.addEntry('ਜੈੱਲਾ', ['jailla']);

      // Instantiate a new CustomDictionary (simulating app restart)
      const freshDict = new CustomDictionary();
      expect(freshDict.getExactMatches('jailla')).toEqual(['ਜੈੱਲਾ']);
      expect(freshDict.getAllEntries().length).toBe(1);
    });
  });

  describe('Unicode & NFC Normalization', () => {
    it('enforces canonical NFC on Gurmukhi inputs', () => {
      // Decomposed Gurmukhi NFD vs NFC
      const decomposed = 'ਜ' + '\u0A48' + '\u0A71' + 'ਲ' + '\u0A3E';
      const entry = customDict.addEntry(decomposed, ['jailla']);
      expect(entry.gurmukhi).toBe(entry.gurmukhi.normalize('NFC'));
    });
  });

  describe('TSV Import & Export', () => {
    it('exports entries to UTF-8 TSV format', () => {
      customDict.addEntry('ਜੈੱਲਾ', ['jailla', 'jaila'], 'Hero');
      customDict.addEntry('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', ['ssa'], 'Greeting');

      const tsv = customDict.exportTSV();
      expect(tsv).toContain('triggers\tgurmukhi\tnotes');
      expect(tsv).toContain('jailla, jaila\tਜੈੱਲਾ\tHero');
      expect(tsv).toContain('ssa\tਸਤਿ ਸ੍ਰੀ ਅਕਾਲ\tGreeting');
    });

    it('imports TSV, validates rows, and reports errors without losing valid entries', () => {
      const tsvData = [
        'triggers\tgurmukhi\tnotes',
        'jailla, jaila\tਜੈੱਲਾ\tProtagonist',
        'invalid_row_without_tab',
        'gurp\tਗੁਰਪ੍ਰੀਤ\tFriend',
        '\tਬਿਨਾਂ_ਟ੍ਰਿਗਰ\tError row',
      ].join('\n');

      const result = customDict.importTSV(tsvData);
      expect(result.totalRows).toBe(4); // 4 data rows
      expect(result.added).toBe(2); // jailla and gurp
      expect(result.errors.length).toBe(2); // 2 malformed rows

      expect(customDict.getExactMatches('jailla')).toEqual(['ਜੈੱਲਾ']);
      expect(customDict.getExactMatches('jaila')).toEqual(['ਜੈੱਲਾ']);
      expect(customDict.getExactMatches('gurp')).toEqual(['ਗੁਰਪ੍ਰੀਤ']);
    });
  });
});
