/**
 * pagination-preview.test.ts - Development Preview Harness & Deterministic Fixtures (M2A)
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2A
 */

import { describe, it, expect } from 'vitest';
import { generatePaginationPreview } from '../src/core/layout/paginationPreview';
import { draftToProseMirrorDoc } from '../src/core/editor/documentAdapter';
import { ScriptDraft } from '../src/types/screenplay';

describe('Milestone M2A: Development Preview Harness & Deterministic Fixtures', () => {
  // ===========================================================================
  // 1. Fixture: Short Screenplay (1 page)
  // ===========================================================================
  it('1. previews a short screenplay fitting cleanly on 1 page', () => {
    const draft: ScriptDraft = {
      id: 'short-script',
      name: 'Short Script',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        { id: 'sc1', type: 'scene_heading', text: 'EXT. VILLAGE ROAD - MORNING' },
        { id: 'act1', type: 'action', text: 'A tractor rumbles along the dirt road kicking up golden dust.' },
        { id: 'char1', type: 'character', text: 'GURPREET' },
        { id: 'dial1', type: 'dialogue', text: 'Chalo, jaldi karo!' },
      ],
    };

    const preview = generatePaginationPreview(draft, { paperSize: 'letter' });

    expect(preview.totalPages).toBe(1);
    expect(preview.pages.length).toBe(1);
    expect(preview.pages[0].pageNumber).toBe(1);
    expect(preview.pages[0].hasHeader).toBe(false); // First page suppresses running header
    expect(preview.pages[0].usedSlots).toBeLessThanOrEqual(36);
    expect(preview.diagnostics.hasOverflow).toBe(false);

    // Formatted text inspection
    const formatted = preview.toFormattedText();
    expect(formatted).toContain('AKHARSTUDIO SCREENPLAY PAGINATION PREVIEW (LETTER)');
    expect(formatted).toContain('Total Pages: 1');
    expect(formatted).toContain('GURPREET');
  });

  // ===========================================================================
  // 2. Fixture: Long Action Spanning Pages
  // ===========================================================================
  it('2. previews long multi-line action block spanning across multiple pages', () => {
    const longActionLines = Array.from(
      { length: 45 },
      (_, i) => `Action sequence movement ${i + 1}: camera tracks actor through the crowded bazaar.`
    ).join('\n');

    const draft: ScriptDraft = {
      id: 'long-action-script',
      name: 'Long Action',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        { id: 'sc1', type: 'scene_heading', text: 'EXT. BAZAAR - DAY' },
        { id: 'act1', type: 'action', text: longActionLines },
      ],
    };

    const doc = draftToProseMirrorDoc(draft);
    const preview = generatePaginationPreview(doc, { paperSize: 'letter' });

    expect(preview.totalPages).toBeGreaterThanOrEqual(2);
    expect(preview.pages[0].usedSlots).toBe(36);
    expect(preview.pages[1].usedSlots).toBeGreaterThan(0);
    expect(preview.pages[1].hasHeader).toBe(true);
    expect(preview.pages[1].headerText).toBe('2.');

    // Page break decoration target should exist for the split
    expect(preview.pageBreakTargets.length).toBeGreaterThan(0);
  });

  // ===========================================================================
  // 3. Fixture: Long Dialogue Continuation
  // ===========================================================================
  it('3. previews long dialogue continuation with presentation (MORE) and (CONT\'D)', () => {
    // 28 lines of action fill slots 0..27 on page 1
    // Character cue takes slot 29 (slot 28 is blank line above). 6 slots remain.
    // 8 lines of dialogue split: 5 lines on page 1 + (MORE) on slot 35. 3 lines on page 2.
    const dialogueLines = Array.from(
      { length: 8 },
      (_, i) => `Surjit speaks solemnly line ${i + 1} explaining the ancestral heritage.`
    ).join('\n');

    const draft: ScriptDraft = {
      id: 'dialogue-cont-script',
      name: 'Dialogue Continuation',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        {
          id: 'filler',
          type: 'action',
          text: Array.from({ length: 28 }, (_, i) => `Preceding action line ${i + 1}`).join('\n'),
        },
        { id: 'c1', type: 'character', text: 'SURJIT' },
        { id: 'd1', type: 'dialogue', text: dialogueLines },
      ],
    };

    const doc = draftToProseMirrorDoc(draft);
    const preview = generatePaginationPreview(doc, { paperSize: 'letter' });

    expect(preview.totalPages).toBe(2);
    expect(preview.diagnostics.dialogueSplitsCount).toBe(1);

    // Page 1 ends with (MORE)
    const p1Slots = preview.pages[0].slots;
    const lastSlotP1 = p1Slots[p1Slots.length - 1];
    expect(lastSlotP1.isPresentationOnly).toBe(true);
    expect(lastSlotP1.kind).toBe('more');
    expect(lastSlotP1.presentationText).toBe('(MORE)');

    // Page 2 starts with (CONT'D)
    const p2Slots = preview.pages[1].slots;
    const firstSlotP2 = p2Slots[0];
    expect(firstSlotP2.isPresentationOnly).toBe(true);
    expect(firstSlotP2.kind).toBe('contd');
    expect(firstSlotP2.presentationText).toContain("SURJIT (CONT'D)");

    // Page break target captures (MORE) and (CONT'D) metadata
    expect(preview.pageBreakTargets.length).toBe(1);
    expect(preview.pageBreakTargets[0].moreText).toBe('(MORE)');
    expect(preview.pageBreakTargets[0].contdText).toContain("SURJIT (CONT'D)");
  });

  // ===========================================================================
  // 4. Fixture: Character Cue Near Page Bottom (Anti-Orphan Protection)
  // ===========================================================================
  it('4. prevents character cue from being stranded alone on the last slot', () => {
    // 34 lines of action fill slots 0..33. 2 slots remain on 36-slot page.
    // Character cue requires 1 cue line + at least 1 dialogue line.
    // When fewer than 2 slots remain for speech, Character cue must move to next page!
    const draft: ScriptDraft = {
      id: 'char-orphan-script',
      name: 'Character Anti-Orphan',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        {
          id: 'filler',
          type: 'action',
          text: Array.from({ length: 34 }, (_, i) => `Filler line ${i + 1}`).join('\n'),
        },
        { id: 'c1', type: 'character', text: 'HARPREET' },
        { id: 'd1', type: 'dialogue', text: 'We must go now before sunset.' },
      ],
    };

    const preview = generatePaginationPreview(draft, { paperSize: 'letter' });

    expect(preview.totalPages).toBe(2);
    expect(preview.diagnostics.orphanPreventedCount).toBeGreaterThan(0);

    // Page 1 should contain filler
    expect(preview.pages[0].usedSlots).toBe(34);
    // Page 2 must begin with Character cue on slot 0
    expect(preview.pages[1].slots[0].blockId).toBe('c1');
    expect(preview.pages[1].slots[0].kind).toBe('text');
  });

  // ===========================================================================
  // 5. Fixture: Scene Heading Near Page Bottom (Anti-Orphan Protection)
  // ===========================================================================
  it('5. prevents scene heading from being stranded on the last 2 slots without following content', () => {
    // 34 lines of action fill slots 0..33. 2 slots remain.
    // Scene heading requires 1 heading line + at least 2 following lines on same page.
    // When < 3 slots remain, Scene Heading moves to slot 0 of next page!
    const draft: ScriptDraft = {
      id: 'heading-orphan-script',
      name: 'Heading Anti-Orphan',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        {
          id: 'filler',
          type: 'action',
          text: Array.from({ length: 34 }, (_, i) => `Filler line ${i + 1}`).join('\n'),
        },
        { id: 'sc2', type: 'scene_heading', text: 'INT. HAVELI - NIGHT' },
        { id: 'act2', type: 'action', text: 'Shadows dance across the mud walls as candle flickers.' },
      ],
    };

    const preview = generatePaginationPreview(draft, { paperSize: 'letter' });

    expect(preview.totalPages).toBe(2);
    expect(preview.diagnostics.orphanPreventedCount).toBeGreaterThan(0);

    // Page 1 holds filler
    expect(preview.pages[0].usedSlots).toBe(34);
    // Page 2 starts with Scene Heading on slot 0
    expect(preview.pages[1].slots[0].blockId).toBe('sc2');
    expect(preview.pages[1].slots[0].kind).toBe('text');
  });

  // ===========================================================================
  // 6. Fixture: Complex Gurmukhi Stacked Matras & Conjuncts
  // ===========================================================================
  it('6. previews screenplay with complex Gurmukhi conjuncts and stacked matras', () => {
    const complexGurmukhiText =
      'ਉਸ ਉੱਤੇ ਗੁਰੂ ਦੀ ਅਪਾਰ ਕ੍ਰਿੱਪਾ ਹੋਈ। ਸਾਰੇ ਨਵੇਂ ਪ੍ਰੋਗਰਾਮਾਂ ਦੀ ਸੂਚੀ ਕੰਪਿਊਟਰ ਉੱਤੇ ਦਰਜ ਕਰੋ। ' +
      'ਇਹ ਮਸਲਾ ਬਹੁਤ ਗੁੰਝਲ਼ਦਾਰ ਅਤੇ ਪੇਚੀਦਾ ਬਣ ਚੁੱਕਾ ਹੈ। ਸ੍ਰੀ ਅੰਮ੍ਰਿਤਸਰ ਸਾਹਿਬ ਦੀ ਪਵਿੱਤਰ ਧਰਤੀ ਨੂੰ ਪ੍ਰਣਾਮ।';

    const draft: ScriptDraft = {
      id: 'gurmukhi-script',
      name: 'Gurmukhi Script',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        { id: 'sc1', type: 'scene_heading', text: 'ਦ੍ਰਿਸ਼ 1. ਅੰਦਰ. ਹਵੇਲੀ - ਰਾਤ' },
        { id: 'act1', type: 'action', text: complexGurmukhiText },
        { id: 'c1', type: 'character', text: 'ਸੁਰਜੀਤ ਸਿੰਘ' },
        { id: 'd1', type: 'dialogue', text: 'ਕਿਉਂਕਿ ਉਸ ਨੇ ਵੇਲੇ ਸਿਰ ਸੱਚ ਨਹੀਂ ਬੋਲਿਆ, ਇਸ ਲਈ ਸਭ ਉਲਝ ਗਿਆ।' },
      ],
    };

    const preview = generatePaginationPreview(draft, { paperSize: 'letter' });

    expect(preview.totalPages).toBe(1);
    expect(preview.pages[0].usedSlots).toBeGreaterThan(0);

    // Ensure no broken marks or NaN widths occurred
    expect(preview.diagnostics.hasOverflow).toBe(false);

    const json = preview.toJSON();
    expect(json.totalPages).toBe(1);
    expect(json.paperSize).toBe('letter');
  });

  // ===========================================================================
  // 7. Fixture: Mixed Punjabi & English Code-Switching
  // ===========================================================================
  it('7. previews mixed Punjabi-English code-switching screenplay flawlessly', () => {
    const draft: ScriptDraft = {
      id: 'bilingual-script',
      name: 'Bilingual Script',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        { id: 'sc1', type: 'scene_heading', text: 'INT. OFFICE - DAY' },
        { id: 'act1', type: 'action', text: 'ਡਾਇਰੈਕਟਰ ਸਾਹਿਬ ਨੇ ਕਿਹਾ ਕਿ Scene 4 ਬਹੁਤ Emotional ਹੈ ਅਤੇ ₹500 ਦੀ Payment ਬਾਕੀ ਹੈ।' },
        { id: 'c1', type: 'character', text: 'DIRECTOR SAHIB' },
        { id: 'd1', type: 'dialogue', text: 'Script ਦੇ ਵਿੱਚ Dialogue Delivery ਬਿਲਕੁਲ Natural ਹੋਣੀ ਚਾਹੀਦੀ ਹੈ।' },
      ],
    };

    const preview = generatePaginationPreview(draft, { paperSize: 'letter' });

    expect(preview.totalPages).toBe(1);
    expect(preview.diagnostics.hasOverflow).toBe(false);
  });

  // ===========================================================================
  // 8. Fixture: Inline Bold, Italic & Formatted Text
  // ===========================================================================
  it('8. previews screenplay with inline bold, italic, and colored text', () => {
    const draft: ScriptDraft = {
      id: 'formatted-script',
      name: 'Formatted Script',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        { id: 'sc1', type: 'scene_heading', text: 'EXT. FOREST - NIGHT' },
        {
          id: 'act1',
          type: 'action',
          text: 'The shadow moves quickly, silently, and vanishes.',
          formats: [
            { from: 4, to: 10, type: 'bold' },
            { from: 17, to: 24, type: 'italic' },
            { from: 26, to: 34, type: 'color', color: '#ff0000' },
          ],
        },
      ],
    };

    const doc = draftToProseMirrorDoc(draft);
    const preview = generatePaginationPreview(doc, { paperSize: 'letter' });

    expect(preview.totalPages).toBe(1);
    expect(preview.pages[0].slots.length).toBeGreaterThan(0);
  });

  // ===========================================================================
  // 9. Comparison: US Letter (36 slots) vs ISO A4 (38 slots)
  // ===========================================================================
  describe('9. Dual-Profile Comparison: US Letter vs ISO A4', () => {
    it('9.1 demonstrates capacity difference between Letter (36) and A4 (38) on identical screenplay', () => {
      // 37 lines of action:
      // On Letter (36 slots): takes 2 pages (36 slots on p1, 1 slot on p2)
      // On A4 (38 slots): takes exactly 1 page (37 slots on p1, 1 slot free)
      const actionText = Array.from({ length: 37 }, (_, i) => `Line ${i + 1}`).join('\n');
      const draft: ScriptDraft = {
        id: 'capacity-test',
        name: 'Capacity Test',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: [{ id: 'act1', type: 'action', text: actionText }],
      };

      const letterPreview = generatePaginationPreview(draft, { paperSize: 'letter' });
      const a4Preview = generatePaginationPreview(draft, { paperSize: 'a4' });

      // Exact capacity proof!
      expect(letterPreview.profile.slotCapacity).toBe(36);
      expect(letterPreview.totalPages).toBe(2);
      expect(letterPreview.pages[0].usedSlots).toBe(36);
      expect(letterPreview.pages[1].usedSlots).toBe(1);

      expect(a4Preview.profile.slotCapacity).toBe(38);
      expect(a4Preview.totalPages).toBe(1);
      expect(a4Preview.pages[0].usedSlots).toBe(37);
      expect(a4Preview.pages[0].remainingSlots).toBe(1);
      expect(a4Preview.profile.bottomSafetyBufferPt).toBe(13.89);
    });
  });

  // ===========================================================================
  // 10. Requirement 5: Unsupported Block Types Mark Preview Incomplete
  // ===========================================================================
  it('10. explicitly marks preview incomplete and identifies unsupported block types with diagnostics', () => {
    const draft: any = {
      id: 'unsupported-block-script',
      name: 'Unsupported Block Test',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        { id: 'sc1', type: 'scene_heading', text: 'EXT. STREET - DAY' },
        { id: 'unsupp1', type: 'custom_musical_interlude', text: 'Singers enter dancing in circle.' },
        { id: 'act1', type: 'action', text: 'The crowd watches with admiration.' },
      ],
    };

    const preview = generatePaginationPreview(draft, { paperSize: 'letter' });

    // Preview must NOT silently appear complete while omitting content!
    expect(preview.diagnostics.isIncomplete).toBe(true);
    expect(preview.diagnostics.unsupportedBlockIds).toContain('unsupp1');
    expect(preview.diagnostics.adapterDiagnostics.length).toBeGreaterThan(0);

    const diag = preview.diagnostics.adapterDiagnostics.find((d) => d.blockId === 'unsupp1');
    expect(diag).toBeDefined();
    expect(diag?.level).toBe('error');
    expect(diag?.rawType).toBe('custom_musical_interlude');

    // toFormattedText must contain clear warning banner
    const formatted = preview.toFormattedText();
    expect(formatted).toContain('WARNING: PREVIEW INCOMPLETE');
    expect(formatted).toContain('unsupp1');
  });
});
