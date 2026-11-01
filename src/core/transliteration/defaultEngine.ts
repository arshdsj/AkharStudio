/**
 * defaultEngine.ts - Preloaded Singleton Transliteration Engine
 * Loads the 100k curated Gurmukhi lexicon for sub-millisecond offline suggestions.
 */

import { GurmukhiLexicon, UserDictionary } from './lexicon';
import { CustomDictionary } from './customDictionary';
import { GurmukhiTransliterator } from './engine';
import rawLexiconData from '../../../assets/data/punjabi_lexicon.json';

const globalLexicon = new GurmukhiLexicon();
globalLexicon.loadEntries(rawLexiconData as [string, number][]);

export const globalUserDict = new UserDictionary();
export const globalCustomDict = new CustomDictionary();

export const defaultTransliterator = new GurmukhiTransliterator(
  globalLexicon,
  globalUserDict,
  globalCustomDict
);
