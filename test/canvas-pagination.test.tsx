// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ScreenplayCanvas } from '../src/renderer/components/ScreenplayCanvas';
import { createDefaultProject } from '../src/core/model/ProjectModel';
import { ScreenplayBlock, TitleMetadata } from '../src/types/screenplay';

const dummyMetadata: TitleMetadata = {
  title: 'Test Script',
  author: 'Author',
  basedOn: '',
  contact: '',
  rights: '',
};

describe('ScreenplayCanvas Pagination Diagnostics', () => {
  it('renders ScreenplayCanvas with 104 blocks and inspects paper structure', () => {
    const project = createDefaultProject();
    const draft = project.drafts[0];
    const blocks: ScreenplayBlock[] = Array.from({ length: 104 }, (_, i) => ({
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

    const paper = container.querySelector('.screenplay-paper');
    expect(paper).not.toBeNull();
    const pm = container.querySelector('.ProseMirror');
    expect(pm).not.toBeNull();

    const pageBreaks = container.querySelectorAll('.screenplay-page-break');
    console.log('Page break elements count:', pageBreaks.length);
    pageBreaks.forEach((pb, idx) => {
      console.log(`Page Break ${idx + 1}:`, pb.getAttribute('data-page-break'), pb.querySelector('.screenplay-page-break__badge')?.textContent);
    });

    expect(pageBreaks.length).toBeGreaterThan(0);
    // Verify each page break contains running page number
    pageBreaks.forEach((pb) => {
      const num = pb.querySelector('.screenplay-page-break__number')?.textContent;
      expect(num).toMatch(/^\d+\.$/);
    });
  });

  it('updates pagination when paperSize changes between letter and a4', () => {
    const project = createDefaultProject();
    const draft = project.drafts[0];
    const blocks: ScreenplayBlock[] = Array.from({ length: 110 }, (_, i) => ({
      id: `block-${i}`,
      type: 'action',
      text: 'Action line for pagination testing across multiple pages in script editor.',
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
      />
    );

    const letterBreaks = container.querySelectorAll('.screenplay-page-break.paper-letter');
    expect(letterBreaks.length).toBeGreaterThan(0);

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
      />
    );

    const a4Breaks = container.querySelectorAll('.screenplay-page-break.paper-a4');
    expect(a4Breaks.length).toBeGreaterThan(0);
  });
});
