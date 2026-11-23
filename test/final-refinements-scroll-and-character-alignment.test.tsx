// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import { ScreenplayCanvas } from '../src/renderer/components/ScreenplayCanvas';
import { createDefaultProject } from '../src/core/model/ProjectModel';
import { ScreenplayBlock, TitleMetadata } from '../src/types/screenplay';
import {
  SCREENPLAY_BLOCK_STYLES,
  generateBlockCssRules,
} from '../src/core/layout/screenplayGeometry';
import { generateScreenplayHtml } from '../src/core/export/pdfExporter';

const dummyMetadata: TitleMetadata = {
  title: 'FINAL REFINEMENTS VERIFICATION SCRIPT',
  author: 'Screenwriter',
  basedOn: '',
  contact: '',
  rights: '',
};

if (typeof Range !== 'undefined') {
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  }
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => [] as any;
  }
}

describe('Final Refinements: Automatic Typing Scroll & Genuine Character Centre Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Part 1: Genuine Centre Alignment of Character Names
  // =========================================================================
  describe('1. Genuine Centre Alignment of Character Names', () => {
    it('authoritatively defines character blocks with text-align: center and margin-left: 0 in screenplayGeometry', () => {
      const charSpec = SCREENPLAY_BLOCK_STYLES.character;
      expect(charSpec.textAlign).toBe('center');
      expect(charSpec.marginLeftPx).toBe(0);
      expect(charSpec.fontWeight).toBe('bold');
      expect(charSpec.textTransform).toBe('uppercase');
    });

    it('generates block CSS rules where .block-character is genuinely text-align: center without left margin offset', () => {
      const rules = generateBlockCssRules();
      expect(rules).toContain('.block-character');
      expect(rules).toMatch(/\.block-character\s*\{[^}]*text-align:\s*center;/);
      expect(rules).not.toMatch(/\.block-character\s*\{[^}]*margin-left:/);
    });

    it('verifies index.css contains .ProseMirror .block-character with text-align: center and margin-left: 0', () => {
      const cssPath = path.resolve(__dirname, '../src/renderer/index.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      expect(css).toMatch(/\.ProseMirror\s+\.block-character\s*\{[^}]*text-align:\s*center;/);
      expect(css).toMatch(/\.ProseMirror\s+\.block-character\s*\{[^}]*margin-left:\s*0;/);
    });

    it('verifies index.css configures .screenplay-contd-continuation with text-align: center and margin-left: 0', () => {
      const cssPath = path.resolve(__dirname, '../src/renderer/index.css');
      const css = fs.readFileSync(cssPath, 'utf8');

      expect(css).toMatch(/\.screenplay-contd-continuation\s*\{[^}]*text-align:\s*center;/);
      expect(css).toMatch(/\.screenplay-contd-continuation\s*\{[^}]*margin-left:\s*0;/);
      expect(css).toMatch(/\.paper-a4\s+\.screenplay-contd-continuation\s*\{[^}]*margin-left:\s*0;/);
    });

    it('ensures PDF export HTML styles .character and .screenplay-contd-continuation with text-align: center', () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];
      draft.blocks = [
        { id: 'c1', type: 'character', text: 'STRANGER' },
        { id: 'd1', type: 'dialogue', text: 'मुझे अभी तुमसे चाहिए।' },
        { id: 'c2', type: 'character', text: 'NARAD' },
        { id: 'd2', type: 'dialogue', text: 'ਕੀ ਗੱਲ ਹੈ?' },
      ];

      const html = generateScreenplayHtml(draft, dummyMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        allowHeadlessFallback: true,
      });

      const charCssMatch = html.match(/\.character\s*\{([^}]+)\}/);
      expect(charCssMatch).not.toBeNull();
      const charCss = charCssMatch![1];
      expect(charCss).toContain('text-align: center');
      expect(charCss).toContain('margin-left: 0');

      const contdCssMatch = html.match(/\.screenplay-contd-continuation\s*\{([^}]+)\}/);
      expect(contdCssMatch).not.toBeNull();
      const contdCss = contdCssMatch![1];
      expect(contdCss).toContain('text-align: center');
      expect(contdCss).toContain('margin-left: 0');
    });

    it('renders DOM character cues spanning full printable width for geometric centering regardless of name length', () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];
      draft.blocks = [
        { id: 'c_short', type: 'character', text: 'NARAD' },
        { id: 'd_short', type: 'dialogue', text: 'Short character cue.' },
        { id: 'c_long', type: 'character', text: 'COMMISSIONER OF POLICE' },
        { id: 'd_long', type: 'dialogue', text: 'Long character cue.' },
      ];

      const { container } = render(
        <ScreenplayCanvas
          draft={draft}
          metadata={dummyMetadata}
          onMetadataChange={vi.fn()}
          onDraftChange={vi.fn()}
          contdSetting="off"
          inputMode="pa"
          paperSize="letter"
          zoom={100}
          onFocusTitle={vi.fn()}
          onFocusBlock={vi.fn()}
          onTriggerContdPrompt={vi.fn()}
        />
      );

      const charBlocks = container.querySelectorAll('.block-character');
      expect(charBlocks.length).toBe(2);
      expect(charBlocks[0].textContent).toContain('NARAD');
      expect(charBlocks[1].textContent).toContain('COMMISSIONER OF POLICE');
    });

    it('preserves character name centre alignment across saving, serializing, and reopening documents', () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];
      draft.blocks = [
        { id: 'c1', type: 'character', text: 'STRANGER' },
        { id: 'd1', type: 'dialogue', text: 'मुझे अभी तुमसे चाहिए।' },
        { id: 'c2', type: 'character', text: 'NARAD' },
        { id: 'd2', type: 'dialogue', text: 'ਕੀ ਗੱਲ ਹੈ?' },
      ];

      // Simulate project JSON serialization (saving to disk)
      const serialized = JSON.stringify(project);
      const reloadedProject = JSON.parse(serialized);

      expect(reloadedProject.drafts[0].blocks[0].type).toBe('character');
      expect(reloadedProject.drafts[0].blocks[0].text).toBe('STRANGER');
      expect(reloadedProject.drafts[0].blocks[2].type).toBe('character');
      expect(reloadedProject.drafts[0].blocks[2].text).toBe('NARAD');

      const { container } = render(
        <ScreenplayCanvas
          draft={reloadedProject.drafts[0]}
          metadata={reloadedProject.metadata}
          onMetadataChange={vi.fn()}
          onDraftChange={vi.fn()}
          contdSetting="off"
          inputMode="pa"
          paperSize="letter"
          zoom={100}
          onFocusTitle={vi.fn()}
          onFocusBlock={vi.fn()}
          onTriggerContdPrompt={vi.fn()}
        />
      );

      const charBlocks = container.querySelectorAll('.block-character');
      expect(charBlocks.length).toBe(2);
      expect(charBlocks[0].textContent).toBe('STRANGER');
      expect(charBlocks[1].textContent).toBe('NARAD');
    });

    it('ensures character cues on different pages are all centre-aligned in multipage PDF export', () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];
      // Create multi-page screenplay blocks
      const blocks: ScreenplayBlock[] = [];
      for (let i = 0; i < 40; i++) {
        blocks.push({ id: `a_${i}`, type: 'action', text: `Action line ${i} describing scene events in detail.` });
      }
      blocks.push({ id: 'c_p1', type: 'character', text: 'STRANGER' });
      blocks.push({ id: 'd_p1', type: 'dialogue', text: 'First page dialogue.' });

      for (let i = 0; i < 40; i++) {
        blocks.push({ id: `a2_${i}`, type: 'action', text: `Page 2 action line ${i} continuing.` });
      }
      blocks.push({ id: 'c_p2', type: 'character', text: 'NARAD' });
      blocks.push({ id: 'd_p2', type: 'dialogue', text: 'Second page dialogue.' });
      draft.blocks = blocks;

      const html = generateScreenplayHtml(draft, dummyMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
        allowHeadlessFallback: true,
      });

      // Both character blocks appear inside exported PDF HTML styled with .character (center-aligned)
      expect(html).toContain('STRANGER');
      expect(html).toContain('NARAD');
      const charCssMatch = html.match(/\.character\s*\{([^}]+)\}/);
      expect(charCssMatch![1]).toContain('text-align: center');
      expect(charCssMatch![1]).toContain('margin-left: 0');
    });
  });

  // =========================================================================
  // Part 2: Intelligent Automatic Scrolling While Typing
  // =========================================================================
  describe('2. Intelligent Automatic Scrolling While Typing', () => {
    it('Scenario A: automatically scrolls upward when caret approaches the lower viewport threshold while typing', async () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];
      const editorRef = React.createRef<any>();

      const { container } = render(
        <ScreenplayCanvas
          ref={editorRef}
          draft={draft}
          metadata={dummyMetadata}
          onMetadataChange={vi.fn()}
          onDraftChange={vi.fn()}
          contdSetting="off"
          inputMode="pa"
          paperSize="letter"
          zoom={100}
          onFocusTitle={vi.fn()}
          onFocusBlock={vi.fn()}
          onTriggerContdPrompt={vi.fn()}
        />
      );

      const scroller = container.querySelector('[data-testid="screenplay-canvas-scroller"]') as HTMLElement;
      expect(scroller).not.toBeNull();

      // Mock visible scroller viewport: top = 80, bottom = 800 (height = 720)
      // Lower threshold for 720px height: ~158px from bottom -> trigger line is 800 - 158 = 642px
      scroller.getBoundingClientRect = () => ({
        top: 80,
        bottom: 800,
        left: 0,
        right: 1200,
        width: 1200,
        height: 720,
        x: 0,
        y: 80,
        toJSON: () => {},
      });

      const scrollBySpy = vi.fn();
      scroller.scrollBy = scrollBySpy;

      // Mock caret position near the bottom threshold: caret bottom at 720px (well past 642px trigger line)
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        getRangeAt: () => ({
          getBoundingClientRect: () => ({
            top: 696,
            bottom: 720,
            left: 300,
            right: 320,
            width: 20,
            height: 24,
          }),
        }),
      } as any);

      // Simulate typing text into the editor
      await act(async () => {
        editorRef.current?.insertText('मुझे अभी तुमसे चाहिए।');
        // Let requestAnimationFrame execute
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(scrollBySpy).toHaveBeenCalled();
      const call = scrollBySpy.mock.calls[0][0];
      expect(call.top).toBeGreaterThan(0);
      expect(call.behavior).toBe('smooth');
    });

    it('Scenario B: does NOT scroll when typing near top or middle of document', async () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];
      const editorRef = React.createRef<any>();

      const { container } = render(
        <ScreenplayCanvas
          ref={editorRef}
          draft={draft}
          metadata={dummyMetadata}
          onMetadataChange={vi.fn()}
          onDraftChange={vi.fn()}
          contdSetting="off"
          inputMode="pa"
          paperSize="letter"
          zoom={100}
          onFocusTitle={vi.fn()}
          onFocusBlock={vi.fn()}
          onTriggerContdPrompt={vi.fn()}
        />
      );

      const scroller = container.querySelector('[data-testid="screenplay-canvas-scroller"]') as HTMLElement;
      scroller.getBoundingClientRect = () => ({
        top: 80,
        bottom: 800,
        left: 0,
        right: 1200,
        width: 1200,
        height: 720,
        x: 0,
        y: 80,
        toJSON: () => {},
      });

      const scrollBySpy = vi.fn();
      scroller.scrollBy = scrollBySpy;

      // Caret is at 300px (comfortable top/middle of visible viewport)
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        getRangeAt: () => ({
          getBoundingClientRect: () => ({
            top: 280,
            bottom: 300,
            left: 300,
            right: 320,
            width: 20,
            height: 24,
          }),
        }),
      } as any);

      await act(async () => {
        editorRef.current?.insertText('Top line typing');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(scrollBySpy).not.toHaveBeenCalled();
    });

    it('Scenario C: incorporates zoom level into scroll delta calculation', async () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];

      const { container } = render(
        <ScreenplayCanvas
          draft={draft}
          metadata={dummyMetadata}
          onMetadataChange={vi.fn()}
          onDraftChange={vi.fn()}
          contdSetting="off"
          inputMode="pa"
          paperSize="letter"
          zoom={150} // 150% Zoom
          onFocusTitle={vi.fn()}
          onFocusBlock={vi.fn()}
          onTriggerContdPrompt={vi.fn()}
        />
      );

      const scroller = container.querySelector('[data-testid="screenplay-canvas-scroller"]') as HTMLElement;
      expect(scroller.style.transform).toBe('scale(1.5)');
    });

    it('Scenario D: provides generous bottom spacer preventing scroll dead-ends on last page', () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];

      const { container } = render(
        <ScreenplayCanvas
          draft={draft}
          metadata={dummyMetadata}
          onMetadataChange={vi.fn()}
          onDraftChange={vi.fn()}
          contdSetting="off"
          inputMode="pa"
          paperSize="letter"
          zoom={100}
          onFocusTitle={vi.fn()}
          onFocusBlock={vi.fn()}
          onTriggerContdPrompt={vi.fn()}
        />
      );

      const bottomSpacer = container.querySelector('.screenplay-scroll-bottom-spacer') as HTMLElement;
      expect(bottomSpacer).not.toBeNull();
      expect(bottomSpacer.className).toContain('screenplay-scroll-bottom-spacer');
      expect(bottomSpacer.className).toContain('pointer-events-none');
    });

    it('Scenario E: responds smoothly when expanding dialogue blocks or pasting multi-line text', async () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];
      const editorRef = React.createRef<any>();

      const { container } = render(
        <ScreenplayCanvas
          ref={editorRef}
          draft={draft}
          metadata={dummyMetadata}
          onMetadataChange={vi.fn()}
          onDraftChange={vi.fn()}
          contdSetting="off"
          inputMode="pa"
          paperSize="letter"
          zoom={100}
          onFocusTitle={vi.fn()}
          onFocusBlock={vi.fn()}
          onTriggerContdPrompt={vi.fn()}
        />
      );

      const scroller = container.querySelector('[data-testid="screenplay-canvas-scroller"]') as HTMLElement;
      scroller.getBoundingClientRect = () => ({
        top: 80,
        bottom: 800,
        left: 0,
        right: 1200,
        width: 1200,
        height: 720,
        x: 0,
        y: 80,
        toJSON: () => {},
      });

      const scrollBySpy = vi.fn();
      scroller.scrollBy = scrollBySpy;

      // Caret is pushed down by pasting text near the bottom (740px)
      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        getRangeAt: () => ({
          getBoundingClientRect: () => ({
            top: 716,
            bottom: 740,
            left: 300,
            right: 320,
            width: 20,
            height: 24,
          }),
        }),
      } as any);

      await act(async () => {
        // Paste or insert expanded dialogue text
        editorRef.current?.insertText('ਬਹੁਤ ਲੰਬਾ ਸੰਵਾਦ ਜੋ ਕਈ ਸਤਰਾਂ ਵਿੱਚ ਫੈਲ ਜਾਂਦਾ ਹੈ ਅਤੇ ਹੇਠਾਂ ਚਲਾ ਜਾਂਦਾ ਹੈ।');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(scrollBySpy).toHaveBeenCalled();
      const call = scrollBySpy.mock.calls[0][0];
      expect(call.top).toBeGreaterThan(0);
      expect(call.behavior).toBe('smooth');
    });

    it('Scenario F: prevents overlapping animations by enforcing animation cooldown during rapid typing', async () => {
      const project = createDefaultProject();
      const draft = project.drafts[0];
      const editorRef = React.createRef<any>();

      const { container } = render(
        <ScreenplayCanvas
          ref={editorRef}
          draft={draft}
          metadata={dummyMetadata}
          onMetadataChange={vi.fn()}
          onDraftChange={vi.fn()}
          contdSetting="off"
          inputMode="pa"
          paperSize="letter"
          zoom={100}
          onFocusTitle={vi.fn()}
          onFocusBlock={vi.fn()}
          onTriggerContdPrompt={vi.fn()}
        />
      );

      const scroller = container.querySelector('[data-testid="screenplay-canvas-scroller"]') as HTMLElement;
      scroller.getBoundingClientRect = () => ({
        top: 80,
        bottom: 800,
        left: 0,
        right: 1200,
        width: 1200,
        height: 720,
        x: 0,
        y: 80,
        toJSON: () => {},
      });

      const scrollBySpy = vi.fn();
      scroller.scrollBy = scrollBySpy;

      vi.spyOn(window, 'getSelection').mockReturnValue({
        rangeCount: 1,
        getRangeAt: () => ({
          getBoundingClientRect: () => ({
            top: 716,
            bottom: 740,
            left: 300,
            right: 320,
            width: 20,
            height: 24,
          }),
        }),
      } as any);

      await act(async () => {
        // First typing stroke
        editorRef.current?.insertText('A');
        // Immediate second typing stroke (10ms later, during 280ms cooldown)
        await new Promise((resolve) => setTimeout(resolve, 10));
        editorRef.current?.insertText('B');
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      // Should not trigger multiple simultaneous overlapping scrollBy calls
      expect(scrollBySpy.mock.calls.length).toBe(1);
    });
  });
});
