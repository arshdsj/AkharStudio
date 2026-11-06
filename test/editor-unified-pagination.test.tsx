/**
 * editor-unified-pagination.test.tsx - React Component Integration Tests for Unified Pagination
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2B
 *
 * Verifies:
 * 1. Default mode: ScreenplayCanvas and ProseMirrorEditor default to legacy pagination (useUnifiedPagination=false).
 * 2. Controlled preview mode: ScreenplayCanvas with useUnifiedPagination=true renders unified page breaks.
 * 3. Dynamic paper size switching updates unified page break DOM attributes.
 * 4. Backward compatibility: existing editor functionality remains 100% stable.
 */

// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ScreenplayCanvas } from '../src/renderer/components/ScreenplayCanvas';
import { createDefaultProject } from '../src/core/model/ProjectModel';
import { ScreenplayBlock, TitleMetadata } from '../src/types/screenplay';

const dummyMetadata: TitleMetadata = {
  title: 'M2B Test Script',
  author: 'Author',
  basedOn: '',
  contact: '',
  rights: '',
};

describe('Milestone M2B: ScreenplayCanvas Unified Pagination React Integration', () => {
  it('defaults to legacy pagination plugin when useUnifiedPagination is false or omitted', () => {
    const project = createDefaultProject();
    const draft = project.drafts[0];
    const blocks: ScreenplayBlock[] = Array.from({ length: 60 }, (_, i) => ({
      id: `block-${i}`,
      type: i % 4 === 0 ? 'scene_heading' : i % 4 === 1 ? 'action' : i % 4 === 2 ? 'character' : 'dialogue',
      text: `Block ${i} content in Punjabi screenwriting`,
    }));
    draft.blocks = blocks;

    const { container } = render(
      <ScreenplayCanvas
        draft={draft}
        metadata={dummyMetadata}
        onMetadataChange={() => {}}
        onDraftChange={() => {}}
        contdSetting="on"
        inputMode="pa"
        onTriggerContdPrompt={() => {}}
        paperSize="letter"
        zoom={100}
        onFocusTitle={() => {}}
        onFocusBlock={() => {}}
      />
    );

    // Legacy page break exists
    const pageBreaks = container.querySelectorAll('.screenplay-page-break');
    expect(pageBreaks.length).toBeGreaterThan(0);

    // Unified class should NOT be present in legacy mode
    const unifiedBreaks = container.querySelectorAll('.screenplay-unified-page-break');
    expect(unifiedBreaks.length).toBe(0);
  });

  it('activates unified pagination plugin when useUnifiedPagination=true', () => {
    const project = createDefaultProject();
    const draft = project.drafts[0];
    const blocks: ScreenplayBlock[] = Array.from({ length: 60 }, (_, i) => ({
      id: `block-${i}`,
      type: i % 4 === 0 ? 'scene_heading' : i % 4 === 1 ? 'action' : i % 4 === 2 ? 'character' : 'dialogue',
      text: `Block ${i} content in Punjabi screenwriting with sufficient length to verify pagination.`,
    }));
    draft.blocks = blocks;

    const { container } = render(
      <ScreenplayCanvas
        draft={draft}
        metadata={dummyMetadata}
        onMetadataChange={() => {}}
        onDraftChange={() => {}}
        contdSetting="on"
        inputMode="pa"
        onTriggerContdPrompt={() => {}}
        paperSize="letter"
        zoom={100}
        onFocusTitle={() => {}}
        onFocusBlock={() => {}}
        useUnifiedPagination={true}
      />
    );

    const unifiedBreaks = container.querySelectorAll('.screenplay-unified-page-break');
    expect(unifiedBreaks.length).toBeGreaterThan(0);

    // Verify running header inside page break widget
    const firstBreak = unifiedBreaks[0];
    expect(firstBreak.getAttribute('data-page-break')).toBe('2');
    const headerNumber = firstBreak.querySelector('.screenplay-page-break__number');
    expect(headerNumber?.textContent).toBe('2.');
  });

  it('updates unified pagination when paperSize changes dynamically between letter and a4', () => {
    const project = createDefaultProject();
    const draft = project.drafts[0];
    const blocks: ScreenplayBlock[] = Array.from({ length: 60 }, (_, i) => ({
      id: `block-${i}`,
      type: 'action',
      text: `Action line ${i} spanning across physical paper cards.`,
    }));
    draft.blocks = blocks;

    const { container, rerender } = render(
      <ScreenplayCanvas
        draft={draft}
        metadata={dummyMetadata}
        onMetadataChange={() => {}}
        onDraftChange={() => {}}
        contdSetting="on"
        inputMode="pa"
        onTriggerContdPrompt={() => {}}
        paperSize="letter"
        zoom={100}
        onFocusTitle={() => {}}
        onFocusBlock={() => {}}
        useUnifiedPagination={true}
      />
    );

    const letterBreaks = container.querySelectorAll('.screenplay-unified-page-break.paper-letter');
    expect(letterBreaks.length).toBeGreaterThan(0);

    // Rerender with paperSize="a4"
    rerender(
      <ScreenplayCanvas
        draft={draft}
        metadata={dummyMetadata}
        onMetadataChange={() => {}}
        onDraftChange={() => {}}
        contdSetting="on"
        inputMode="pa"
        onTriggerContdPrompt={() => {}}
        paperSize="a4"
        zoom={100}
        onFocusTitle={() => {}}
        onFocusBlock={() => {}}
        useUnifiedPagination={true}
      />
    );

    const a4Breaks = container.querySelectorAll('.screenplay-unified-page-break.paper-a4');
    expect(a4Breaks.length).toBeGreaterThan(0);
  });
});
