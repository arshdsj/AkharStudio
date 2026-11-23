/**
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { LeftFormattingToolbar } from '../src/renderer/components/LeftFormattingToolbar';
import { UndoRedoPill } from '../src/renderer/components/UndoRedoPill';
import { ScreenplayBlock } from '../src/types/screenplay';

describe('Left Formatting Toolbar & Standalone Undo/Redo Layout (Relocation Spec)', () => {
  afterEach(() => {
    cleanup();
  });

  const dummyBlock: ScreenplayBlock = {
    id: 'b-1',
    type: 'action',
    text: 'EXT. PUNJAB HIGHWAY - DAY',
  };

  describe('1. LeftFormattingToolbar Structure & Styling', () => {
    it('renders exactly 13 formatting tools across 3 groups with 2 dividers', () => {
      const onApplyFormat = vi.fn();
      const onToggleCase = vi.fn();
      const onCopy = vi.fn();
      const onHighlight = vi.fn();
      const onFormatPainter = vi.fn();
      const onLink = vi.fn();
      const onAddAnnotationLayer = vi.fn();
      const onComment = vi.fn();
      const onToggleKeyboard = vi.fn();

      render(
        <LeftFormattingToolbar
          activeBlock={dummyBlock}
          isTitleEditing={false}
          onApplyFormat={onApplyFormat}
          onToggleCase={onToggleCase}
          onCopy={onCopy}
          onHighlight={onHighlight}
          onFormatPainter={onFormatPainter}
          onLink={onLink}
          onAddAnnotationLayer={onAddAnnotationLayer}
          onComment={onComment}
          isKeyboardOpen={false}
          onToggleKeyboard={onToggleKeyboard}
        />
      );

      // Verify toolbar attributes
      const toolbar = screen.getByRole('toolbar', { name: /Text Formatting/i });
      expect(toolbar).toBeInTheDocument();
      expect(toolbar).toHaveClass('left-formatting-toolbar');

      // Group 1 tools: Align, Bold, Italic, Underline, Strikethrough, Font (Aa)
      expect(screen.getByTitle(/Screenplay Element Indentation/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Bold/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Italic/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Underline/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Strikethrough/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Toggle Case/i)).toBeInTheDocument();

      // Group 2 tools: Highlight, Brush, Link, Keyboard, Copy
      expect(screen.getByTitle(/Highlight Selected Text/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Format Painter/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Insert or Edit Link/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Virtual Gurmukhi Keyboard/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Copy Selected Text/i)).toBeInTheDocument();

      // Group 3 tools: Layers, Comment
      expect(screen.getByTitle(/Annotation & Revision Layer/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Script Notes & Comments/i)).toBeInTheDocument();

      // Exactly 13 buttons
      const buttons = toolbar.querySelectorAll('button');
      expect(buttons).toHaveLength(13);

      // 2 dividers between the 3 groups
      const separators = toolbar.querySelectorAll('[role="separator"]');
      expect(separators).toHaveLength(2);

      // Action figure/button must NOT exist in this toolbar
      expect(screen.queryByTitle(/Current Screenplay Element/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Action/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Undo/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Redo/i)).not.toBeInTheDocument();
    });

    it('disables alignment when editing title card (TITLE-02)', () => {
      render(
        <LeftFormattingToolbar
          activeBlock={dummyBlock}
          isTitleEditing={true}
          onApplyFormat={vi.fn()}
          onToggleCase={vi.fn()}
          onCopy={vi.fn()}
        />
      );

      const alignBtn = screen.getByTitle(/Alignment controls disabled in Title Card/i);
      expect(alignBtn).toBeDisabled();
    });

    it('opens popovers to the right of the strip with proper inputs', () => {
      const onLink = vi.fn();
      render(
        <LeftFormattingToolbar
          activeBlock={dummyBlock}
          isTitleEditing={false}
          onApplyFormat={vi.fn()}
          onToggleCase={vi.fn()}
          onCopy={vi.fn()}
          onLink={onLink}
        />
      );

      const linkBtn = screen.getByTitle(/Insert or Edit Link/i);
      fireEvent.click(linkBtn);

      const linkDialog = screen.getByRole('dialog', { name: /Insert Link Dialog/i });
      expect(linkDialog).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/https:\/\/example\.com or #scene/i);
      fireEvent.change(input, { target: { value: 'https://screenplay.example' } });
      fireEvent.click(screen.getByText('Apply'));

      expect(onLink).toHaveBeenCalledWith('https://screenplay.example');
      expect(screen.queryByRole('dialog', { name: /Insert Link Dialog/i })).not.toBeInTheDocument();
    });
  });

  describe('2. Standalone UndoRedoPill', () => {
    it('renders undo and redo buttons with 1px divider and handles actions', () => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();

      render(
        <UndoRedoPill
          canUndo={true}
          canRedo={false}
          onUndo={onUndo}
          onRedo={onRedo}
        />
      );

      const undoBtn = screen.getByTitle(/Undo \(Cmd\/Ctrl\+Z\)/i);
      const redoBtn = screen.getByTitle(/Redo \(Cmd\/Ctrl\+Shift\+Z\)/i);

      expect(undoBtn).not.toBeDisabled();
      expect(redoBtn).toBeDisabled();

      fireEvent.click(undoBtn);
      expect(onUndo).toHaveBeenCalledTimes(1);

      fireEvent.click(redoBtn);
      expect(onRedo).not.toHaveBeenCalled();
    });

    it('has pill geometry matching StatusChip baseline and dimensions', () => {
      const { container } = render(
        <UndoRedoPill
          canUndo={true}
          canRedo={true}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
        />
      );

      const pill = container.querySelector('.undo-redo-pill') as HTMLElement;
      expect(pill).toBeInTheDocument();
      expect(pill.style.width).toBe('92px');
      expect(pill.style.height).toBe('32px');
      expect(pill.style.borderRadius).toBe('9999px');
      expect(pill.style.bottom).toBe('22px');
      expect(pill.style.left).toContain('calc(var(--left-panel-width, 0px) + 21px)');
    });
  });

  describe('3. Dynamic Left Panel Offset Integration', () => {
    it('applies --left-panel-width offset and synchronizes transition', () => {
      const { container: closedContainer } = render(
        <div style={{ '--left-panel-width': '0px' } as React.CSSProperties}>
          <LeftFormattingToolbar
            activeBlock={dummyBlock}
            isTitleEditing={false}
            onApplyFormat={vi.fn()}
            onToggleCase={vi.fn()}
            onCopy={vi.fn()}
          />
          <UndoRedoPill
            canUndo={true}
            canRedo={true}
            onUndo={vi.fn()}
            onRedo={vi.fn()}
          />
        </div>
      );

      const toolbar = closedContainer.querySelector('.left-formatting-toolbar') as HTMLElement;
      const pill = closedContainer.querySelector('.undo-redo-pill') as HTMLElement;

      expect(toolbar.style.left).toContain('calc(var(--left-panel-width, 0px) + 13px)');
      expect(toolbar.style.top).toBe('50%');
      expect(toolbar.style.transform).toBe('translateY(-50%)');
      expect(toolbar.style.transition).toContain('240ms cubic-bezier(0.16, 1, 0.3, 1)');

      expect(pill.style.left).toContain('calc(var(--left-panel-width, 0px) + 21px)');
      expect(pill.style.transition).toContain('240ms cubic-bezier(0.16, 1, 0.3, 1)');
    });
  });
});
