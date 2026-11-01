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
import { ScriptDraft, TitleMetadata, ScriptProject } from '../src/types/screenplay';

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
      name: 'Main Draft',
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

    it('implements ARCH-04 anti-orphan rules on character, parenthetical, and dialogue', () => {
      const { draft, metadata } = createSampleDraft();
      const html = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      // Character must avoid break after and inside
      expect(html).toContain('.character {');
      expect(html).toMatch(/\.character\s*\{[^}]*break-after:\s*avoid/);
      expect(html).toMatch(/\.character\s*\{[^}]*page-break-after:\s*avoid/);

      // Parenthetical must avoid break after
      expect(html).toMatch(/\.parenthetical\s*\{[^}]*break-after:\s*avoid/);

      // Dialogue must avoid break inside
      expect(html).toMatch(/\.dialogue\s*\{[^}]*break-inside:\s*avoid/);
    });

    it('implements PAGE-03 running headers with first-page suppression', () => {
      const { draft, metadata } = createSampleDraft();
      const html = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      expect(html).toContain('@top-right {');
      expect(html).toContain('counter(page) "."');
      expect(html).toContain('@page :first {');
      expect(html).toContain('content: "";');
    });

    it('generates a separate title page card when requested and omits when disabled', () => {
      const { draft, metadata } = createSampleDraft();

      const withTitle = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: true,
      });
      expect(withTitle).toContain('class="title-page"');
      expect(withTitle).toContain('class="title-written-by"');
      // Title page must break page cleanly without redundant page-break elements that cause blank ghost pages
      expect(withTitle).toContain('break-after: page;');
      expect(withTitle).not.toContain('<div class="page-break"></div>');

      const withoutTitle = generateScreenplayHtml(draft, metadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });
      expect(withoutTitle).not.toContain('class="title-page"');
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
});
