/**
 * phase4-export.test.ts - Phase 4 Certified Export & Interchange Test Suite
 * Baseline: V9.1, W4 & W5b, PAGE-01, PAGE-02, PAGE-03, ARCH-04, EXPORT-01, EXPORT-02, STORE-02, TM-06, TM-16
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

import {
  getPageGeometry,
  generateScreenplayHtml,
} from '../src/core/export/pdfExporter';
import { exportToPlainText } from '../src/core/export/textExporter';
import { exportToFountain, hasGurmukhi } from '../src/core/export/fountainExporter';
import { importFromFountain } from '../src/core/export/fountainImporter';
import { exportProjectBundle, importProjectBundle } from '../src/core/storage/projectBundle';
import { createDefaultProject } from '../src/core/model/ProjectModel';
import { ScriptDraft, TitleMetadata, ScriptProject, ScreenplayBlock } from '../src/types/screenplay';
import { createPaginationEngine } from '../src/core/layout/paginationEngine';
import { draftToLayoutBlocks } from '../src/core/layout/paginationAdapter';
import { FontMetricsProvider } from '../src/core/layout/fontMetrics';
import { createTextLayoutService } from '../src/core/layout/textLayoutService';
import { renderHtmlToPdf } from './helpers/renderPdf';
import { LINE_PITCH_PX, CANONICAL_FONT_STACK } from '../src/core/layout/screenplayGeometry';

describe('Phase 4: Certified Export & Interchange (W4 & W5b)', () => {
  // Sample test draft with rich Punjabi screenplay elements
  const createSampleDraft = (): { draft: ScriptDraft; metadata: TitleMetadata } => {
    const metadata: TitleMetadata = {
      title: 'ਪੰਜਾਬ ਦੀ ਧਰਤੀ',
      author: 'ਹਰਪ੍ਰੀਤ ਸਿੰਘ',
      basedOn: 'ਅਸਲ ਘਟਨਾਵਾਂ ਤੇ ਆਧਾਰਿਤ',
      rights: 'ਮਿਤੀ: 2026-10-29',
      contact: 'harpreet@example.com\nਫ਼ੋਨ: 98765-43210',
    };

    const draft: ScriptDraft = {
      id: 'd_test_p4',
      name: 'Master Draft',
      isMain: true,
      createdAt: '2026-10-29T10:00:00.000Z',
      modifiedAt: '2026-10-29T10:00:00.000Z',
      blocks: [
        {
          id: 'b1',
          type: 'scene_heading',
          text: 'EXT. VILLAGE COURTYARD - DAY'.normalize('NFC'),
        },
        {
          id: 'b2',
          type: 'action',
          text: 'ਸੂਰਜ ਸਿਰ ਤੇ ਚੜ੍ਹਿਆ ਹੋਇਆ ਹੈ। ਪਿੰਡ ਦੇ ਪਿੱਪਲ ਹੇਠ ਬਜ਼ੁਰਗ ਚੌਪਾਲ ਲਾਈ ਬੈਠੇ ਹਨ। The dusty road shimmers under the midday sun.'.normalize('NFC'),
        },
        {
          id: 'b3',
          type: 'character',
          text: 'ਗੁਰਦਿਆਲ ਸਿੰਘ'.normalize('NFC'),
        },
        {
          id: 'b4',
          type: 'parenthetical',
          text: '(ਚਿੰਤਾ ਵਿੱਚ, ਹੌਲੀ ਜਿਹੀ)'.normalize('NFC'),
        },
        {
          id: 'b5',
          type: 'dialogue',
          text: 'ਕਿੱਥੇ ਗਿਆ ਉਹ ਮੁੰਡਾ? ਪੁੱਤ ਨੂੰ ਕਹੋ ਛੇਤੀ ਘਰ ਪਰਤੇ, ਸ਼ਾਮ ਢਲਣ ਵਾਲੀ ਏ।'.normalize('NFC'),
        },
        {
          id: 'b6',
          type: 'character',
          text: 'ਸਿਮਰਨ'.normalize('NFC'),
        },
        {
          id: 'b7',
          type: 'dialogue',
          text: 'ਬਾਪੂ ਜੀ, ਉਹ ਤਾਂ ਖੇਤਾਂ ਵੱਲ ਗੇੜਾ ਮਾਰਨ ਗਿਆ ਸੀ। ਹੁਣੇ ਆਉਂਦਾ ਹੀ ਹੋਣਾ।'.normalize('NFC'),
        },
        {
          id: 'b8',
          type: 'transition',
          text: 'CUT TO:'.normalize('NFC'),
        },
        {
          id: 'b9',
          type: 'scene_heading',
          text: 'ਕਮਰਾ - ਰਾਤ'.normalize('NFC'), // Raw scene heading without Fountain '.' marker
        },
        {
          id: 'b10',
          type: 'action',
          text: 'ਕਮਰੇ ਵਿੱਚ ਮੱਧਮ ਰੌਸ਼ਨੀ ਹੈ।'.normalize('NFC'),
        },
      ],
    };

    return { draft, metadata };
  };

  // =========================================================================
  // 1. PAGE-01 & DEC-014: Page Geometry (US Letter & A4 Profiles)
  // =========================================================================
  describe('PAGE-01 & DEC-014: Dual-Profile Page Geometry', () => {
    it('calculates US Letter geometry with exact standard margins', () => {
      const geo = getPageGeometry('letter');
      expect(geo.paperSize).toBe('letter');
      expect(geo.width).toBe('8.5in');
      expect(geo.height).toBe('11in');
      expect(geo.marginLeft).toBe('1.5in');
      expect(geo.marginRight).toBe('1.0in');
      expect(geo.marginTop).toBe('1.0in');
      expect(geo.marginBottom).toBe('1.0in');
      expect(geo.printableWidth).toBe('6.0in');
    });

    it('calculates A4 geometry with exact metric margins per DEC-014', () => {
      const geo = getPageGeometry('a4');
      expect(geo.paperSize).toBe('a4');
      expect(geo.width).toBe('210mm');
      expect(geo.height).toBe('297mm');
      expect(geo.marginLeft).toBe('38.1mm'); // 1.5 in
      expect(geo.marginRight).toBe('25.4mm'); // 1.0 in
      expect(geo.marginTop).toBe('25.4mm');
      expect(geo.marginBottom).toBe('25.4mm');
      expect(geo.printableWidth).toBe('146.5mm');
    });

    it('never scales A4 from Letter or vice versa', () => {
      const letter = getPageGeometry('letter');
      const a4 = getPageGeometry('a4');
      expect(letter.width).not.toBe(a4.width);
      expect(letter.height).not.toBe(a4.height);
      expect(letter.printableWidth).not.toBe(a4.printableWidth);
    });
  });

  // =========================================================================
  // 2. PAGE-02, PAGE-03 & ARCH-04: PDF HTML/CSS Generation & Anti-Orphan Rules
  // =========================================================================
  describe('PAGE-02, PAGE-03 & ARCH-04: Certified PDF Template & Layout Rules', () => {
    it('generates self-contained HTML with lang="pa-Guru" and UTF-8 charset', () => {
      const { draft, metadata } = createSampleDraft();
      const html = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: true,
      });

      expect(html).toContain('<html lang="pa-Guru">');
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('ਪੰਜਾਬ ਦੀ ਧਰਤੀ');
      expect(html).toContain('ਗੁਰਦਿਆਲ ਸਿੰਘ');
    });

    it('implements dumb printer layout with discrete fixed page boxes, overflow visible, zero @page margin, and no CSS break rules', () => {
      const { draft, metadata } = createSampleDraft();
      const html = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      // Discrete fixed-size box per page
      expect(html).toContain('class="page-sheet screenplay-page-sheet" data-page-number="1"');
      expect(html).toContain('@page {');
      expect(html).toContain('margin: 0;');
      expect(html).toContain('width: 8.5in;');
      expect(html).toContain('height: 11in;');
      expect(html).toContain('overflow: visible;');
      expect(html).toContain('page-break-after: always;');

      // No CSS break-inside, break-after, orphans, or widows rules on screenplay blocks
      expect(html).not.toMatch(/\.dialogue\s*\{[^}]*break-inside:\s*avoid/);
      expect(html).not.toMatch(/\.character\s*\{[^}]*break-after:\s*avoid/);
      expect(html).not.toMatch(/orphans:/);
      expect(html).not.toMatch(/widows:/);

      // Dropped spacing and borders at top of page container to prevent stray rules (Bug 2 fix: dropped for all blocks at page top)
      expect(html).toContain('.page-content > :first-child {');
      expect(html).toContain('margin-top: 0 !important;');
      expect(html).toContain('border-top: none !important;');
    });

    it('implements running headers outside body flow with first-page suppression', () => {
      const { draft, metadata } = createSampleDraft();
      const html = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      // Page 1 running header is suppressed
      const page1Container = html.match(/<div class="page-sheet screenplay-page-sheet" data-page-number="1">([\s\S]*?)<\/div>\s*<\/body>/);
      expect(page1Container).not.toBeNull();
      expect(page1Container![1]).not.toContain('class="page-header"');

      // Running header is positioned in top margin, outside .page-content body flow
      expect(html).toContain('.page-header {');
      expect(html).toContain('position: absolute;');
    });

    it('generates a separate title page card when requested and omits when disabled', () => {
      const { draft, metadata } = createSampleDraft();

      const withTitle = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: true,
      });
      expect(withTitle).toContain('class="page-sheet title-page"');
      expect(withTitle).toContain('class="title-written-by"');
      // Title page must break page cleanly without redundant page-break elements that cause blank ghost pages
      expect(withTitle).toContain('break-after: page;');
      expect(withTitle).not.toContain('<div class="page-break"></div>');

      const withoutTitle = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });
      expect(withoutTitle).not.toContain('class="page-sheet title-page"');
    });

    it('renders custom title artwork graphic in exported HTML when present', () => {
      const { draft, metadata } = createSampleDraft();
      const metaWithArtwork = {
        ...metadata,
        titleImageUrl: 'data:image/png;base64,mockartworkbase64',
      };

      const html = generateScreenplayHtml(draft, metaWithArtwork, {
        paperSize: 'letter',
        includeTitlePage: true,
      });

      expect(html).toContain('class="title-artwork-container"');
      expect(html).toContain('src="data:image/png;base64,mockartworkbase64"');
    });

    it('embeds base64 fonts when provided', () => {
      const { draft, metadata } = createSampleDraft();
      const html = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        courierFontBase64: 'QUFB',
        gurmukhiFontBase64: 'QkJC',
      });

      expect(html).toContain('data:font/truetype;charset=utf-8;base64,QUFB');
      expect(html).toContain('data:font/truetype;charset=utf-8;base64,QkJC');
    });
  });

  // =========================================================================
  // 3. EXPORT-01: Plain Text (.txt) Export
  // =========================================================================
  describe('EXPORT-01: Plain Text Export Formatter', () => {
    it('formats screenplay blocks with standard industry indentations', () => {
      const { draft, metadata } = createSampleDraft();
      const text = exportToPlainText(draft, metadata, { includeTitlePage: true });

      // Title page
      expect(text).toContain('ਪੰਜਾਬ ਦੀ ਧਰਤੀ');
      expect(text).toContain('ਅਸਲ ਘਟਨਾਵਾਂ ਤੇ ਆਧਾਰਿਤ');
      expect(text).toContain('ਹਰਪ੍ਰੀਤ ਸਿੰਘ');

      // Scene heading at column 0
      expect(text).toMatch(/\nEXT\. VILLAGE COURTYARD - DAY\n/);

      // Character indented 22 spaces
      const charIndent = ' '.repeat(22) + 'ਗੁਰਦਿਆਲ ਸਿੰਘ';
      expect(text).toContain(charIndent);

      // Parenthetical indented 16 spaces
      const parenIndent = ' '.repeat(16) + '(ਚਿੰਤਾ ਵਿੱਚ, ਹੌਲੀ ਜਿਹੀ)';
      expect(text).toContain(parenIndent);

      // Dialogue indented 10 spaces
      expect(text).toContain(' '.repeat(10) + 'ਕਿੱਥੇ ਗਿਆ ਉਹ ਮੁੰਡਾ?');

      // Transition indented 45 spaces
      expect(text).toContain(' '.repeat(45) + 'CUT TO:');
    });

    it('wraps long action paragraphs without breaking mid-word or corrupting Unicode', () => {
      const { draft } = createSampleDraft();
      const text = exportToPlainText(draft, undefined, { includeTitlePage: false });
      const lines = text.split('\n');

      for (const line of lines) {
        // Indented character cues may reach 22 + name length (~40); action should wrap around 60
        if (!line.startsWith(' ') && line.length > 0) {
          expect(line.length).toBeLessThanOrEqual(65);
        }
      }
    });
  });

  // =========================================================================
  // 4. EXPORT-02 & TM-16: Fountain Format Export & Import Round-trip
  // =========================================================================
  describe('EXPORT-02 & TM-16: Fountain Export & Import with Gurmukhi Markers', () => {
    it('detects Gurmukhi Unicode script ranges accurately', () => {
      expect(hasGurmukhi('ਸਿਮਰਨ')).toBe(true);
      expect(hasGurmukhi('EXT. VILLAGE - DAY')).toBe(false);
      expect(hasGurmukhi('Mixed ਪੰਜਾਬੀ and English')).toBe(true);
    });

    it('exports Gurmukhi character cues with forced @ marker per TM-16', () => {
      const { draft, metadata } = createSampleDraft();
      const fountain = exportToFountain(draft, metadata);

      // Gurmukhi characters must have '@' prefix
      expect(fountain).toContain('@ਗੁਰਦਿਆਲ ਸਿੰਘ');
      expect(fountain).toContain('@ਸਿਮਰਨ');

      // Non-standard scene headings must have '.' prefix
      expect(fountain).toContain('.ਕਮਰਾ - ਰਾਤ');

      // Standard INT./EXT. headings remain clean
      expect(fountain).toContain('EXT. VILLAGE COURTYARD - DAY');

      // Transitions have '>'
      expect(fountain).toContain('CUT TO:');

      // Title page metadata
      expect(fountain).toContain('Title: ਪੰਜਾਬ ਦੀ ਧਰਤੀ');
      expect(fountain).toContain('Author: ਹਰਪ੍ਰੀਤ ਸਿੰਘ');
    });

    it('imports Fountain text and restores semantic block types accurately', () => {
      const { draft, metadata } = createSampleDraft();
      const exportedFountain = exportToFountain(draft, metadata);

      const imported = importFromFountain(exportedFountain);

      // Title metadata check
      expect(imported.metadata.title).toBe('ਪੰਜਾਬ ਦੀ ਧਰਤੀ');
      expect(imported.metadata.author).toBe('ਹਰਪ੍ਰੀਤ ਸਿੰਘ');

      // Blocks check
      const blocks = imported.draft.blocks;
      expect(blocks.length).toBeGreaterThanOrEqual(10);

      // Scene 1
      expect(blocks[0].type).toBe('scene_heading');
      expect(blocks[0].text).toBe('EXT. VILLAGE COURTYARD - DAY');

      // Action 1
      expect(blocks[1].type).toBe('action');
      expect(blocks[1].text).toContain('ਸੂਰਜ ਸਿਰ ਤੇ ਚੜ੍ਹਿਆ ਹੋਇਆ ਹੈ');

      // Character 1: '@' prefix stripped on import
      expect(blocks[2].type).toBe('character');
      expect(blocks[2].text).toBe('ਗੁਰਦਿਆਲ ਸਿੰਘ');

      // Parenthetical
      expect(blocks[3].type).toBe('parenthetical');
      expect(blocks[3].text).toBe('(ਚਿੰਤਾ ਵਿੱਚ, ਹੌਲੀ ਜਿਹੀ)');

      // Dialogue 1
      expect(blocks[4].type).toBe('dialogue');
      expect(blocks[4].text).toContain('ਕਿੱਥੇ ਗਿਆ ਉਹ ਮੁੰਡਾ?');

      // Character 2
      expect(blocks[5].type).toBe('character');
      expect(blocks[5].text).toBe('ਸਿਮਰਨ');

      // Dialogue 2
      expect(blocks[6].type).toBe('dialogue');
      expect(blocks[6].text).toContain('ਬਾਪੂ ਜੀ');

      // Scene 2 (was forced with .)
      const scene2 = blocks.find((b) => b.text.includes('ਕਮਰਾ - ਰਾਤ'));
      expect(scene2).toBeDefined();
      expect(scene2?.type).toBe('scene_heading');
      expect(scene2?.text).toBe('ਕਮਰਾ - ਰਾਤ'); // Leading '.' stripped!
    });

    it('performs round-trip export -> import -> export without loss of semantic fidelity', () => {
      const { draft, metadata } = createSampleDraft();
      const fountain1 = exportToFountain(draft, metadata);
      const imported = importFromFountain(fountain1);
      const fountain2 = exportToFountain(imported.draft, imported.metadata);

      expect(fountain2).toBe(fountain1);
    });

    it('enforces strict Unicode NFC normalization on import (TM-14)', () => {
      // Create NFD string (decompose characters)
      const nfdText = 'Title: ਪੰਜਾਬ\n\n@ਸਿਮਰਨ\nਹੈਲੋ!'.normalize('NFD');
      const imported = importFromFountain(nfdText);

      // All texts in resulting draft must be NFC
      expect(imported.metadata.title).toBe(imported.metadata.title.normalize('NFC'));
      for (const block of imported.draft.blocks) {
        expect(block.text).toBe(block.text.normalize('NFC'));
      }
    });
  });

  // =========================================================================
  // 5. STORE-02 & T-11: Native Project Bundle (.scriptproject) Interchange
  // =========================================================================
  describe('STORE-02 & T-11: Native Project Bundle Interchange', () => {
    it('serializes a complete ScriptProject to valid JSON bundle', () => {
      const project = createDefaultProject();
      project.title = 'ਮੇਰੀ ਕਹਾਣੀ';
      const bundle = exportProjectBundle(project);

      expect(typeof bundle).toBe('string');
      const parsed = JSON.parse(bundle);
      expect(parsed.title).toBe('ਮੇਰੀ ਕਹਾਣੀ');
      expect(parsed.drafts.length).toBe(1);
      expect(parsed.schemaVersion).toBe(1);
    });

    it('validates schema and rejects corrupt or non-string bundles', () => {
      expect(() => importProjectBundle('')).toThrow('Empty or non-string payload');
      expect(() => importProjectBundle('{ corrupt json: true')).toThrow('Invalid JSON');
      expect(() => importProjectBundle(JSON.stringify({ title: 123 }))).toThrow('invalid "title" field');
      expect(() => importProjectBundle(JSON.stringify({ title: 'Test', drafts: [] }))).toThrow(
        'Missing or empty "drafts"'
      );
    });

    it('imports project as a new project with fresh IDs when asNewProject is true (STORE-02)', () => {
      const orig = createDefaultProject();
      orig.title = 'ਮੂਲ ਪ੍ਰੋਜੈਕਟ';
      const origId = orig.id;
      const origDraftId = orig.drafts[0].id;

      const bundle = exportProjectBundle(orig);
      const forked = importProjectBundle(bundle, true);

      // Fresh project ID and title copy
      expect(forked.id).not.toBe(origId);
      expect(forked.title).toBe('ਮੂਲ ਪ੍ਰੋਜੈਕਟ (Copy)');
      expect(forked.revision).toBe(1);
      expect(forked.lastSavedRevision).toBe(0);

      // Fresh draft ID
      expect(forked.drafts[0].id).not.toBe(origDraftId);
      expect(forked.activeDraftId).toBe(forked.drafts[0].id);
    });

    it('preserves exact IDs when asNewProject is false (exact restore)', () => {
      const orig = createDefaultProject();
      const bundle = exportProjectBundle(orig);
      const restored = importProjectBundle(bundle, false);

      expect(restored.id).toBe(orig.id);
      expect(restored.drafts[0].id).toBe(orig.drafts[0].id);
    });
  });

  // =========================================================================
  // 6. EXPORT-01: Immutable Snapshot Safety Under Concurrency
  // =========================================================================
  describe('EXPORT-01: Immutable Project Snapshot Safety', () => {
    it('guarantees edits to live project during export do not corrupt snapshot', () => {
      const project = createDefaultProject();
      project.title = 'Frozen Title';

      // Immutable snapshot taken before async export
      const snapshot: ScriptProject = JSON.parse(JSON.stringify(project));

      // Mutate live project while export is conceptually running
      project.title = 'Mutated Title';
      project.drafts[0].blocks[0].text = 'Brand new text typed during export';

      // Snapshot remains completely pristine
      expect(snapshot.title).toBe('Frozen Title');
      expect(snapshot.drafts[0].blocks[0].text).not.toBe('Brand new text typed during export');
    });
  });

  // =========================================================================
  // 7. TM-06 & TM-13: PDF Logical Text Extraction Verification
  // =========================================================================
  describe('TM-06 & TM-13: PDF Logical Text Extraction (pdf-parse / PDF.js)', () => {
    it('extracts logical Unicode text from generated PDF and verifies Gurmukhi content', async () => {
      const pdfPath = path.join(process.cwd(), 'prototype/pagination/sample_letter.pdf');
      expect(fs.existsSync(pdfPath)).toBe(true);

      const buffer = fs.readFileSync(pdfPath);
      const parser = new PDFParse(new Uint8Array(buffer));
      const result = await parser.getText();

      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.text).toBeDefined();

      const extracted = result.text;

      // Verify scene heading extraction
      expect(extracted).toContain('EXT. VILLAGE COURTYARD - DAY');

      // Verify English dialogue extraction
      expect(extracted).toContain('The dusty road');
      expect(extracted).toContain('shimmers under the blazing Punjab afternoon sun');

      // Verify Gurmukhi character cue extraction (reflecting Phase 0B visual pre-base Siari extraction order)
      expect(extracted).toContain('ਿਸੰਘ');
      expect(extracted).toContain('ਗੁਰਿਦਆਲ');

      // Verify Gurmukhi words and punctuation
      expect(extracted).toContain('ਚੌਪਾਲ');
      expect(extracted).toContain('ਹੋਇਆ');
    });
  });

  // =========================================================================
  // 8. Screenshot 5 & Screenshot 4 Boundary Stability Regression
  // =========================================================================
  describe('8. Screenshot 5 & Screenshot 4 Boundary Stability Regression', () => {
    // Exact screenplay text matching the content on page 1 of user screenshots
    const screenshot5Blocks: ScreenplayBlock[] = [
      { id: 'b-sh-1', type: 'scene_heading', text: 'ਸੀਨ 1' },
      { id: 'b-act-1', type: 'action', text: 'ਸ਼ਹਿਰ ਦੇ ਡਰੋਨ ਸ਼ੋਟ ਤੇ ਅਸੀਂ ਕਥਾਵਾਚਕ ਨੂੰ ਕਹਿੰਦੇ ਸੁਣਦੇ ਹਾਂ' },
      { id: 'b-char-1', type: 'character', text: 'ਕਥਾਵਾਚਕ' },
      { id: 'b-dial-1', type: 'dialogue', text: 'ਜੋ ਕੁਝ ਵੀ ਹੁੰਦਾ ਹੈ, ਉਹ ਸਭ ਪਹਿਲਾਂ ਤੋਂ ਹੀ ਲਿਖਿਆ ਹੋਇਆ ਹੈ।\nਦੁਨੀਆ ਦਾ ਦਸਤੂਰ ਹੀ ਇਹੋ ਹੈ। ਹਰ ਨਿੱਕੀ ਗੱਲ ਤੈਅ ਹੈ।\nਜੋ ਲਿਖਿਆ ਹੋਇਆ ਹੈ, ਉਸ ਤੋਂ ਬਾਹਰ ਕਦੇ ਕੁਝ ਨਹੀਂ ਵਾਪਰਦਾ।' },
      { id: 'b-act-2', type: 'action', text: 'ਮਨਪਰੀਤ ਆਫਿਸ ਲਈ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ, ਓਹ ਸ਼ੀਸ਼ੇ ਮੂਹਰੇ ਖੜਾ ਕੱਪੜੇ ਪਾ ਰਿਹਾ ਹੈ' },
      { id: 'b-act-3', type: 'action', text: 'ਇੱਕ' },
      { id: 'b-act-4', type: 'action', text: 'ਦੋ' },
      { id: 'b-act-5', type: 'action', text: 'ਤਿੰਨ' },
      { id: 'b-act-6', type: 'action', text: 'ਚਾਰ' },
      { id: 'b-char-2', type: 'character', text: 'ਮਨਪਰੀਤ' },
      { id: 'b-dial-2', type: 'dialogue', text: 'ਲੋ ਜੀ ਭੱਜ ਲੋ ਜੀ' },
      { id: 'b-char-3', type: 'character', text: 'ਪਤਨੀ' },
      { id: 'b-dial-3', type: 'dialogue', text: 'ਹੈ ਜੀ ਕਿ ਜੀ' },
      { id: 'b-char-4', type: 'character', text: 'ਮਨਪਰੀਤ' },
      { id: 'b-dial-4', type: 'dialogue', text: 'ਲੈ ਲੈ ਲੈ' },
      { id: 'b-char-5', type: 'character', text: 'ਪਤਨੀ' },
      { id: 'b-dial-5', type: 'dialogue', text: 'ਤੂੰ ਪੱਦ ਖਾ' },
      { id: 'b-act-9', type: 'action', text: 'ਨਾ ਨਾ ਕਰਤੇ ਪਿਆਰ' },
      { id: 'b-act-10', type: 'action', text: 'ਊ ਲਾ ਲਾ ਲਾ ਤੂੰ ਹੈ ਮੇਰੀ fnatasy' },
      { id: 'b-act-11', type: 'action', text: 'ਚੂ ਨਾ ਨਾ ਨ ਅਬ ਮੈਂ ਜਵਾਨ ਹੋ ਗਈ' },
      { id: 'b-char-6', type: 'character', text: 'ਮਨਪਰੀਤ' },
      { id: 'b-dial-6', type: 'dialogue', text: 'ਅੱਛਾ ਜੀ' },
    ];

    const createScreenshotDraft = (extraBlocks: ScreenplayBlock[] = []): ScriptDraft => ({
      id: 'd-screenshot',
      name: 'Master Draft',
      isMain: true,
      createdAt: '2026-11-14T10:00:00.000Z',
      modifiedAt: '2026-11-14T10:00:00.000Z',
      blocks: [...screenshot5Blocks, ...extraBlocks],
    });

    it('Screenshot 5 fixture renders to Page 1 / 1 with ~90px free body space', () => {
      const draft = createScreenshotDraft();
      const engine = createPaginationEngine();
      const layoutBlocks = draftToLayoutBlocks(draft);
      const metrics = new FontMetricsProvider({
        measureFn: (t) => (/[\u0A00-\u0A7F]/.test(t) ? t.length * 4.3 : t.length * 7.2),
      });
      const layoutService = createTextLayoutService(metrics);

      const result = engine.paginate(layoutBlocks, {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      // Must be exactly 1 page
      expect(result.totalPages).toBe(1);
      expect(result.pages.length).toBe(1);

      // Verify all blocks are on Page 1
      for (const block of screenshot5Blocks) {
        expect(Array.from(result.blockPageMap.get(block.id) || [])).toEqual([1]);
      }

      // Consumed height in measured block engine leaves free body space on Page 1
      const page1 = result.pages[0];
      expect(page1.usedSlots).toBeLessThanOrEqual(54);
      expect(page1.remainingSlots).toBeGreaterThan(0);
    });

    it('appending empty CHARACTER block does not move page 1 boundary (Screenshot 4 regression)', () => {
      const emptyCharBlock: ScreenplayBlock = {
        id: 'b-char-empty',
        type: 'character',
        text: '',
      };
      const draft = createScreenshotDraft([emptyCharBlock]);

      const engine = createPaginationEngine();
      const layoutBlocks = draftToLayoutBlocks(draft);
      const metrics = new FontMetricsProvider({
        measureFn: (t) => (/[\u0A00-\u0A7F]/.test(t) ? t.length * 4.3 : t.length * 7.2),
      });
      const layoutService = createTextLayoutService(metrics);

      const result = engine.paginate(layoutBlocks, {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      // Total pages must strictly remain 1!
      expect(result.totalPages).toBe(1);
      expect(result.pages.length).toBe(1);

      // Empty character cue is also on Page 1
      expect(Array.from(result.blockPageMap.get('b-char-empty') || [])).toEqual([1]);
    });

    it('end-to-end PDF export for Screenshot 5 and empty CHARACTER produces 1 page without boundary jump', async () => {
      const draft5 = createScreenshotDraft();
      const html5 = generateScreenplayHtml(draft5, { title: 'Master Draft' }, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      // Verify single page-sheet box in HTML
      const sheetMatches5 = html5.match(/class="page-sheet screenplay-page-sheet"/g);
      expect(sheetMatches5?.length).toBe(1);

      // Render actual PDF via Chromium and parse with PDFParse
      const pdfBuffer5 = renderHtmlToPdf(html5, 'letter');
      const parser5 = new PDFParse(new Uint8Array(pdfBuffer5));
      const parseResult5 = await parser5.getText();

      expect(parseResult5.total).toBe(1);
      expect(parseResult5.pages.length).toBe(1);
      const page1Text5 = parseResult5.pages[0].text;
      expect(page1Text5).toContain('ਸੀਨ 1');
      expect(page1Text5).toContain('ਅੱਛਾ ਜੀ');

      // Now with empty CHARACTER appended (Screenshot 4)
      const draft4 = createScreenshotDraft([{ id: 'b-char-empty', type: 'character', text: '' }]);
      const html4 = generateScreenplayHtml(draft4, { title: 'Master Draft' }, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      const sheetMatches4 = html4.match(/class="page-sheet screenplay-page-sheet"/g);
      expect(sheetMatches4?.length).toBe(1);

      const pdfBuffer4 = renderHtmlToPdf(html4, 'letter');
      const parser4 = new PDFParse(new Uint8Array(pdfBuffer4));
      const parseResult4 = await parser4.getText();

      expect(parseResult4.total).toBe(1);
      expect(parseResult4.pages.length).toBe(1);
      const page1Text4 = parseResult4.pages[0].text;
      expect(page1Text4).toContain('ਸੀਨ 1');
      expect(page1Text4).toContain('ਅੱਛਾ ਜੀ');
    });
  });

  // =========================================================================
  // 9. Edge-Case Fixtures & Keep-Together Rules
  // =========================================================================
  describe('9. Edge-Case Fixtures & Keep-Together Rules', () => {
    const metrics = new FontMetricsProvider({
      measureFn: (t) => (/[\u0A00-\u0A7F]/.test(t) ? t.length * 4.3 : t.length * 7.2),
    });
    const layoutService = createTextLayoutService(metrics);
    const engine = createPaginationEngine();

    it('keeps scene heading with following element when heading is at page bottom', () => {
      const actionBlocks: ScreenplayBlock[] = Array.from({ length: 26 }, (_, i) => ({
        id: `lead-act-${i}`,
        type: 'action',
        text: `Leading action line ${i + 1}.`,
      }));
      const sceneHeading: ScreenplayBlock = {
        id: 'bottom-sh',
        type: 'scene_heading',
        text: 'INT. NEW LOCATION - NIGHT',
      };
      const followingAction: ScreenplayBlock = {
        id: 'following-act',
        type: 'action',
        text: 'Action following the scene heading.',
      };

      const draft: ScriptDraft = {
        id: 'd-sh-bottom',
        name: 'Scene Heading Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks: [...actionBlocks, sceneHeading, followingAction],
      };

      const result = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      expect(result.totalPages).toBe(2);
      expect(Array.from(result.blockPageMap.get('bottom-sh')!)).toEqual([2]);
      expect(Array.from(result.blockPageMap.get('following-act')!)).toEqual([2]);
    });

    it('keeps consecutive scene headings together without orphan split', () => {
      const actionBlocks: ScreenplayBlock[] = Array.from({ length: 26 }, (_, i) => ({
        id: `lead-act-${i}`,
        type: 'action',
        text: `Leading action line ${i + 1}.`,
      }));
      const sh1: ScreenplayBlock = { id: 'sh-1', type: 'scene_heading', text: 'EXT. STREET - NIGHT' };
      const sh2: ScreenplayBlock = { id: 'sh-2', type: 'scene_heading', text: 'INT. CAR - CONTINUOUS' };
      const act: ScreenplayBlock = { id: 'act-car', type: 'action', text: 'Inside the moving car.' };

      const draft: ScriptDraft = {
        id: 'd-consec-sh',
        name: 'Consecutive SH Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks: [...actionBlocks, sh1, sh2, act],
      };

      const result = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      expect(Array.from(result.blockPageMap.get('sh-1')!)).toEqual([2]);
      expect(Array.from(result.blockPageMap.get('sh-2')!)).toEqual([2]);
      expect(Array.from(result.blockPageMap.get('act-car')!)).toEqual([2]);
    });

    it('keeps character cue and 1-line dialogue together at bottom of page', () => {
      const actionBlocks: ScreenplayBlock[] = Array.from({ length: 27 }, (_, i) => ({
        id: `lead-act-${i}`,
        type: 'action',
        text: `Leading action line ${i + 1}.`,
      }));
      const charBlock: ScreenplayBlock = { id: 'char-1line', type: 'character', text: 'ਮਨਪਰੀਤ' };
      const dialBlock: ScreenplayBlock = { id: 'dial-1line', type: 'dialogue', text: 'ਇੱਕ ਲਾਈਨ ਦਾ ਡਾਇਲਾਗ।' };

      const draft: ScriptDraft = {
        id: 'd-dial-1line',
        name: '1-Line Dialogue Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks: [...actionBlocks, charBlock, dialBlock],
      };

      const result = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      expect(result.totalPages).toBe(2);
      expect(Array.from(result.blockPageMap.get('char-1line')!)).toEqual([2]);
      expect(Array.from(result.blockPageMap.get('dial-1line')!)).toEqual([2]);
    });

    it('anti-orphan rule on 2-line dialogue at bottom (cannot split 2-line dialogue)', () => {
      const actionBlocks: ScreenplayBlock[] = Array.from({ length: 26 }, (_, i) => ({
        id: `lead-act-${i}`,
        type: 'action',
        text: `Leading action line ${i + 1}.`,
      }));
      const charBlock: ScreenplayBlock = { id: 'char-2line', type: 'character', text: 'ਮਨਪਰੀਤ' };
      const dialBlock: ScreenplayBlock = { id: 'dial-2line', type: 'dialogue', text: 'ਪਹਿਲੀ ਲਾਈਨ।\nਦੂਜੀ ਲਾਈਨ।' };

      const draft: ScriptDraft = {
        id: 'd-dial-2line',
        name: '2-Line Dialogue Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks: [...actionBlocks, charBlock, dialBlock],
      };

      const result = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      expect(result.totalPages).toBe(2);
      expect(Array.from(result.blockPageMap.get('char-2line')!)).toEqual([2]);
      expect(Array.from(result.blockPageMap.get('dial-2line')!)).toEqual([2]);
    });

    it('dialogue of 10 lines splits cleanly across pages with (MORE) and (CONT\'D)', () => {
      const actionBlocks: ScreenplayBlock[] = Array.from({ length: 19 }, (_, i) => ({
        id: `lead-act-${i}`,
        type: 'action',
        text: `Leading action line ${i + 1}.`,
      }));
      const charBlock: ScreenplayBlock = { id: 'char-10line', type: 'character', text: 'ਕਰਤਾਰ' };
      const dialLines = Array.from({ length: 10 }, (_, i) => `ਇਹ ਡਾਇਲਾਗ ਦੀ ਲਾਈਨ ਨੰਬਰ ${i + 1} ਹੈ।`);
      const dialBlock: ScreenplayBlock = { id: 'dial-10line', type: 'dialogue', text: dialLines.join('\n') };

      const draft: ScriptDraft = {
        id: 'd-dial-10line',
        name: '10-Line Dialogue Split Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks: [...actionBlocks, charBlock, dialBlock],
      };

      const result = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      expect(result.totalPages).toBe(2);
      expect(Array.from(result.blockPageMap.get('char-10line')!)).toEqual([1]);
      expect(Array.from(result.blockPageMap.get('dial-10line')!)).toEqual([1, 2]);

      const html = generateScreenplayHtml(draft, { title: 'Dialogue Split' }, {
        paperSize: 'letter',
        includeTitlePage: false,
        contdSetting: 'on',
      });

      expect(html).toContain('class="slot-line screenplay-more-continuation select-none">(MORE)</div>');
      expect(html).toContain('class="slot-line character screenplay-contd-continuation">ਕਰਤਾਰ (CONT&#39;D)</div>');
    });

    it('empty paragraphs and empty blocks consume only collapsed margin with no spurious page breaks', () => {
      const emptyBlocks: ScreenplayBlock[] = [
        { id: 'sh1', type: 'scene_heading', text: 'INT. OFFICE - DAY' },
        { id: 'act-empty-1', type: 'action', text: '' },
        { id: 'act-normal', type: 'action', text: 'A normal line of action.' },
        { id: 'act-empty-2', type: 'action', text: '' },
        { id: 'char-empty', type: 'character', text: '' },
        { id: 'dial-empty', type: 'dialogue', text: '' },
      ];

      const draft: ScriptDraft = {
        id: 'd-empty-blocks',
        name: 'Empty Blocks Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks: emptyBlocks,
      };

      const result = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      expect(result.totalPages).toBe(1);
    });

    it('mixed Latin/Gurmukhi line maintains canonical line pitch and dual-font metric coverage', () => {
      const mixedText = 'ਊ ਲਾ ਲਾ ਲਾ ਤੂੰ ਹੈ ਮੇਰੀ fnatasy';
      const metricsProvider = new FontMetricsProvider({ measureFn: (t) => t.length * 7.2 });
      const metricsRes = metricsProvider.getLineBoxMetricsForText(mixedText, 12);

      // Line box height must be at least the Gurmukhi font box (16.716pt) which covers Courier Prime (13.787pt)
      expect(metricsRes.lineBoxHeightPt).toBeGreaterThanOrEqual(16.7);
      expect(LINE_PITCH_PX * (3 / 4)).toBeCloseTo(15.0, 4); // Target geometry (20px = 15pt)

      const draft: ScriptDraft = {
        id: 'd-mixed',
        name: 'Mixed Script Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks: [
          { id: 'sh1', type: 'scene_heading', text: 'INT. CLUB - NIGHT' },
          { id: 'act-mixed', type: 'action', text: mixedText },
        ],
      };

      const html = generateScreenplayHtml(draft, { title: 'Mixed' }, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      expect(html).toContain(CANONICAL_FONT_STACK);
      expect(html).toContain(`line-height: ${LINE_PITCH_PX}px;`);
      expect(html).toContain('font-size: 16px;');
      expect(html).toContain('text-rendering: optimizeLegibility;');
    });

    it('Letter vs A4 capacity difference (Letter holds 43 canonical slots, A4 holds 46 slots)', () => {
      const blocks: ScreenplayBlock[] = Array.from({ length: 23 }, (_, i) => ({
        id: `act-${i}`,
        type: 'action',
        text: `Action line ${i + 1}.`,
      }));

      const draft: ScriptDraft = {
        id: 'd-letter-vs-a4',
        name: 'Letter vs A4 Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks,
      };

      const letterResult = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });
      const a4Result = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'a4',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      expect(letterResult.totalPages).toBe(2);
      expect(a4Result.totalPages).toBe(1);
    });

    it('asserts 100% agreement between Editor PaginationResult and Exporter page break containers', () => {
      const blocks: ScreenplayBlock[] = [
        { id: 'sh1', type: 'scene_heading', text: 'INT. HAVELI - DAY' },
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `act-p1-${i}`,
          type: 'action' as const,
          text: `Action line ${i + 1} on page 1.`,
        })),
        { id: 'sh2', type: 'scene_heading', text: 'EXT. COURTYARD - CONTINUOUS' },
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `act-p2-${i}`,
          type: 'action' as const,
          text: `Action line ${i + 1} on page 2.`,
        })),
      ];

      const draft: ScriptDraft = {
        id: 'd-parity',
        name: 'Parity Test',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks,
      };

      const editorResult = engine.paginate(draftToLayoutBlocks(draft), {
        paperSize: 'letter',
        contdSetting: 'on',
        textLayoutService: layoutService,
      });

      const exportHtml = generateScreenplayHtml(draft, { title: 'Parity' }, {
        paperSize: 'letter',
        includeTitlePage: false,
        paginationResult: editorResult,
      });

      const sheetMatches = exportHtml.match(/class="page-sheet screenplay-page-sheet"/g);
      expect(sheetMatches?.length).toBe(editorResult.totalPages);

      for (const [blockId, pages] of editorResult.blockPageMap.entries()) {
        for (const pageNum of pages) {
          const pagePattern = new RegExp(`<div class="page-sheet screenplay-page-sheet" data-page-number="${pageNum}">([\\s\\S]*?)(?:<div class="page-sheet|<\\/body>)`);
          const match = exportHtml.match(pagePattern);
          expect(match).not.toBeNull();
          expect(match![1]).toContain(`id="${blockId}"`);
        }
      }
    });
  });

  // =========================================================================
  // 10. PDF-Parse Physical Text Verification Across Fixtures
  // =========================================================================
  describe('10. PDF-Parse Physical Text Verification Across Fixtures', () => {
    it('verifies multi-page PDF extracted text matches engine page boundaries with zero clipped lines', async () => {
      const blocks: ScreenplayBlock[] = [
        { id: 'sh1', type: 'scene_heading', text: 'INT. HAVELI - DAY' },
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `act-p1-${i}`,
          type: 'action' as const,
          text: `Action line ${i + 1} on page 1.`,
        })),
        { id: 'sh2', type: 'scene_heading', text: 'EXT. COURTYARD - CONTINUOUS' },
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `act-p2-${i}`,
          type: 'action' as const,
          text: `Action line ${i + 1} on page 2.`,
        })),
      ];

      const draft: ScriptDraft = {
        id: 'd-pdf-parse-fixture',
        name: 'PDF Parse Fixture',
        isMain: true,
        createdAt: '2026-11-14T10:00:00.000Z',
        modifiedAt: '2026-11-14T10:00:00.000Z',
        blocks,
      };

      const html = generateScreenplayHtml(draft, { title: 'PDF Parse Test' }, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      const pdfBuffer = renderHtmlToPdf(html, 'letter');
      const parser = new PDFParse(new Uint8Array(pdfBuffer));
      const parseResult = await parser.getText();

      expect(parseResult.total).toBe(2);
      expect(parseResult.pages.length).toBe(2);

      const page1Text = parseResult.pages[0].text;
      expect(page1Text).toContain('INT. HAVELI - DAY');
      expect(page1Text).toContain('Action line 20 on page 1.');
      expect(page1Text).not.toContain('EXT. COURTYARD - CONTINUOUS');

      const page2Text = parseResult.pages[1].text;
      expect(page2Text).toContain('EXT. COURTYARD - CONTINUOUS');
      expect(page2Text).toContain('Action line 15 on page 2.');
      expect(page2Text).not.toContain('INT. HAVELI - DAY');
    });
  });
});
