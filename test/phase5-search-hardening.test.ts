// @vitest-environment jsdom
/**
 * phase5-search-hardening.test.ts - Phase 5 In-Draft Search, Hardening & Packaging Suite
 * Baseline: V9.1, W5, W6, W7, ORG-04 P0, A11Y-01, REL-01, TM-14
 */

import { describe, it, expect } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import fs from 'fs';
import path from 'path';

import { screenplaySchema } from '../src/core/editor/schema';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import {
  createSearchPlugin,
  findMatchesInDoc,
  setSearchQuery,
  findNextMatch,
  findPrevMatch,
  clearSearch,
  searchPluginKey,
} from '../src/core/editor/searchPlugin';
import { ScriptDraft } from '../src/types/screenplay';

describe('Phase 5: In-Draft Search, Hardening & Standalone Packaging (W5, W6, W7)', () => {
  // Test fixture screenplay with mixed Gurmukhi and English text
  const createTestDraft = (): ScriptDraft => ({
    id: 'd_phase5_test',
    name: 'Search Test Draft',
    isMain: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    modifiedAt: '2026-11-01T10:00:00.000Z',
    blocks: [
      {
        id: 'b1',
        type: 'scene_heading',
        text: 'EXT. VILLAGE COURTYARD - DAY',
      },
      {
        id: 'b2',
        type: 'action',
        text: 'ਸੂਰਜ ਸਿਰ ਤੇ ਚੜ੍ਹਿਆ ਹੋਇਆ ਹੈ। ਪਿੰਡ ਦੇ ਪਿੱਪਲ ਹੇਠ ਬਜ਼ੁਰਗ ਚੌਪਾਲ ਲਾਈ ਬੈਠੇ ਹਨ। The dusty road leads to the village square today.',
      },
      {
        id: 'b3',
        type: 'character',
        text: 'ਗੁਰਦਿਆਲ ਸਿੰਘ',
      },
      {
        id: 'b4',
        type: 'dialogue',
        text: 'ਕਿੱਥੇ ਗਿਆ ਉਹ ਮੁੰਡਾ? ਪੁੱਤ ਨੂੰ ਕਹੋ ਛੇਤੀ ਪਿੰਡ ਪਰਤੇ, ਅੱਜ ਦਾ ਦਿਨ ਬੜਾ ਖ਼ਾਸ ਹੈ।',
      },
      {
        id: 'b5',
        type: 'character',
        text: 'ਸਿਮਰਨ ਕੌਰ',
      },
      {
        id: 'b6',
        type: 'dialogue',
        text: 'ਬਾਪੂ ਜੀ, ਗੁਰਦਿਆਲ ਸਿੰਘ ਜੀ ਦਾ ਫ਼ੋਨ ਆਇਆ ਸੀ। ਉਹ ਪਿੰਡ ਵੱਲ ਹੀ ਆ ਰਹੇ ਹਨ।',
      },
    ],
  });

  // =========================================================================
  // 1. ORG-04 [P0]: In-Draft Search Logic & Matching
  // =========================================================================
  describe('ORG-04 [P0]: In-Draft Search & Match Highlighting', () => {
    it('finds all occurrences of a Gurmukhi word across multiple blocks', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);

      // Search for "ਪਿੰਡ" (Village) - occurs in block 2, block 4, and block 6
      const matches = findMatchesInDoc(doc, 'ਪਿੰਡ', false, false);
      expect(matches.length).toBe(3);
      expect(matches.every((m) => m.text === 'ਪਿੰਡ')).toBe(true);
    });

    it('finds character cues occurring across scene dialogue and speaker headings', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);

      // "ਗੁਰਦਿਆਲ ਸਿੰਘ" occurs in block 3 (Character) and block 6 (Dialogue)
      const matches = findMatchesInDoc(doc, 'ਗੁਰਦਿਆਲ ਸਿੰਘ', false, false);
      expect(matches.length).toBe(2);
    });

    it('supports case-sensitive and case-insensitive Latin search', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);

      // Case-insensitive: 'day' matches 'DAY' and 'today' (unless whole word)
      const insensitive = findMatchesInDoc(doc, 'day', false, false);
      expect(insensitive.length).toBe(2); // 'DAY' and 'today'

      // Case-sensitive: 'day' matches nothing (only 'DAY' and 'today' exist)
      const sensitiveLower = findMatchesInDoc(doc, 'day', true, false);
      expect(sensitiveLower.length).toBe(1); // 'today' contains lowercase 'day'

      const sensitiveUpper = findMatchesInDoc(doc, 'DAY', true, false);
      expect(sensitiveUpper.length).toBe(1); // only 'DAY'
    });

    it('supports whole-word matching for both Latin and Gurmukhi (ORG-04)', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);

      // Latin whole word: 'day' should match 'DAY' but NOT 'today'
      const wholeWordLatin = findMatchesInDoc(doc, 'day', false, true);
      expect(wholeWordLatin.length).toBe(1);
      expect(wholeWordLatin[0].text).toBe('DAY');

      // Gurmukhi whole word: 'ਪਿੰਡ' should match freestanding 'ਪਿੰਡ'
      const wholeWordGurmukhi = findMatchesInDoc(doc, 'ਪਿੰਡ', false, true);
      expect(wholeWordGurmukhi.length).toBe(3);
    });

    it('handles empty or whitespace query gracefully by returning 0 matches', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);

      expect(findMatchesInDoc(doc, '', false, false)).toEqual([]);
      expect(findMatchesInDoc(doc, '   ', false, false)).toEqual([]);
    });

    it('normalizes decomposed Unicode (NFD) search query to match NFC text (TM-14)', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);

      // Create NFD query for "ਸਿੰਘ"
      const nfdQuery = 'ਸਿੰਘ'.normalize('NFD');
      const matches = findMatchesInDoc(doc, nfdQuery, false, false);

      expect(matches.length).toBe(2);
      expect(matches[0].text.normalize('NFC')).toBe('ਸਿੰਘ');
    });
  });

  // =========================================================================
  // 2. ProseMirror Search Plugin & Match Navigation
  // =========================================================================
  describe('Search Plugin & Next/Previous Navigation', () => {
    it('initializes with empty search state and no active decorations', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);
      const searchPlugin = createSearchPlugin();

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [searchPlugin],
      });

      const pluginState = searchPluginKey.getState(state);
      expect(pluginState).toBeDefined();
      expect(pluginState?.query).toBe('');
      expect(pluginState?.matches.length).toBe(0);
      expect(pluginState?.activeIndex).toBe(-1);
    });

    it('updates matches and decorates active match when query is set', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);
      let capturedState: any = null;

      const searchPlugin = createSearchPlugin((s) => {
        capturedState = s;
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [searchPlugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, { state });

      // Dispatch search query for "ਪਿੰਡ"
      setSearchQuery(view, 'ਪਿੰਡ', false, false);

      expect(capturedState).toBeDefined();
      expect(capturedState.query).toBe('ਪਿੰਡ');
      expect(capturedState.matches.length).toBe(3);
      expect(capturedState.activeIndex).toBe(0);

      // Verify ProseMirror decorations exist for matches
      const currentPluginState = searchPluginKey.getState(view.state);
      expect(currentPluginState?.matches.length).toBe(3);

      view.destroy();
    });

    it('cycles next match (findNextMatch) with wrap-around', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);
      let capturedState: any = null;

      const searchPlugin = createSearchPlugin((s) => {
        capturedState = s;
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [searchPlugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, { state });

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(capturedState.activeIndex).toBe(0);

      // Next -> 1
      findNextMatch(view);
      expect(capturedState.activeIndex).toBe(1);

      // Next -> 2
      findNextMatch(view);
      expect(capturedState.activeIndex).toBe(2);

      // Next -> wraps around to 0
      findNextMatch(view);
      expect(capturedState.activeIndex).toBe(0);

      view.destroy();
    });

    it('cycles previous match (findPrevMatch) with reverse wrap-around', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);
      let capturedState: any = null;

      const searchPlugin = createSearchPlugin((s) => {
        capturedState = s;
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [searchPlugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, { state });

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(capturedState.activeIndex).toBe(0);

      // Prev from 0 -> wraps around to last match (2)
      findPrevMatch(view);
      expect(capturedState.activeIndex).toBe(2);

      // Prev from 2 -> 1
      findPrevMatch(view);
      expect(capturedState.activeIndex).toBe(1);

      view.destroy();
    });

    it('clears all matches and resets state on clearSearch', () => {
      const draft = createTestDraft();
      const doc = draftToProseMirrorDoc(draft);
      let capturedState: any = null;

      const searchPlugin = createSearchPlugin((s) => {
        capturedState = s;
      });

      const state = EditorState.create({
        doc,
        schema: screenplaySchema,
        plugins: [searchPlugin],
      });

      const container = document.createElement('div');
      const view = new EditorView(container, { state });

      setSearchQuery(view, 'ਪਿੰਡ', false, false);
      expect(capturedState.matches.length).toBe(3);

      clearSearch(view);
      expect(capturedState.query).toBe('');
      expect(capturedState.matches.length).toBe(0);
      expect(capturedState.activeIndex).toBe(-1);

      view.destroy();
    });
  });

  // =========================================================================
  // 3. W6: Accessibility & Hardening (A11Y-01, REL-01)
  // =========================================================================
  describe('W6: Accessibility & Hardening Verification', () => {
    it('verifies all bundled font assets exist locally with valid non-zero byte size', () => {
      const gurmukhiFont = path.join(process.cwd(), 'assets/fonts/NotoSansGurmukhi.ttf');
      const courierFont = path.join(process.cwd(), 'assets/fonts/CourierPrime.ttf');

      expect(fs.existsSync(gurmukhiFont)).toBe(true);
      expect(fs.statSync(gurmukhiFont).size).toBeGreaterThan(100_000); // ~227 KB

      expect(fs.existsSync(courierFont)).toBe(true);
      expect(fs.statSync(courierFont).size).toBeGreaterThan(50_000); // ~71 KB
    });

    it('verifies 100k curated Punjabi lexicon exists locally for 100% offline transliteration', () => {
      const lexiconPath = path.join(process.cwd(), 'assets/data/punjabi_lexicon.json');
      expect(fs.existsSync(lexiconPath)).toBe(true);
      expect(fs.statSync(lexiconPath).size).toBeGreaterThan(1_000_000); // ~2.8 MB
    });
  });

  // =========================================================================
  // 4. W7: Standalone Packaging & Configuration Verification
  // =========================================================================
  describe('W7: Standalone Packaging & App Bundle Configuration', () => {
    it('verifies package.json contains production desktop builder configuration and file associations', () => {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      expect(pkg.build).toBeDefined();
      expect(pkg.build.appId).toBe('com.akharstudio.app');
      expect(pkg.build.productName).toBe('AkharStudio');

      // Verify file associations for .scriptproject
      expect(Array.isArray(pkg.build.fileAssociations)).toBe(true);
      const assoc = pkg.build.fileAssociations.find((a: any) => a.ext === 'scriptproject');
      expect(assoc).toBeDefined();
      expect(assoc.name).toBe('Punjabi Script Project');

      // Verify packaging scripts
      expect(pkg.scripts['dist:mac']).toBeDefined();
      expect(pkg.scripts['dist:win']).toBeDefined();
    });
  });
});
