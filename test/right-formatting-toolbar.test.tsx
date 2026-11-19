/**
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  RightFormattingToolbar,
  FORMATTING_TOOLBAR_OPTIONS,
} from '../src/renderer/components/RightFormattingToolbar';
import { ScreenplayBlock } from '../src/types/screenplay';

describe('RightFormattingToolbar - Contextual Right-Side Formatting Toolbar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  const mockActionBlock: ScreenplayBlock = {
    id: 'block-1',
    type: 'action',
    text: 'A foggy morning in Amritsar.',
  };

  const mockDialogueBlock: ScreenplayBlock = {
    id: 'block-2',
    type: 'dialogue',
    text: 'ਜੋ ਕੁਝ ਵੀ ਹੁੰਦਾ ਹੈ, ਉਹ ਸਭ ਕੁਝ ਪਹਿਲਾਂ ਤੋਂ ਹੀ ਲਿਖਿਆ ਹੋਇਆ ਹੈ।',
  };

  it('renders expanded toolbar with header, collapse button, and all 7 screenplay tools by default', () => {
    const onSelectBlockType = vi.fn();
    const onKeepFocus = vi.fn();

    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={onSelectBlockType}
        onKeepFocus={onKeepFocus}
      />
    );

    const toolbar = screen.getByRole('toolbar', { name: /Screenplay Formatting/i });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveClass('ds-right-toolbar');

    // Header label
    expect(screen.getByText('FORMAT')).toBeInTheDocument();

    // Collapse button
    const collapseBtn = screen.getByRole('button', { name: /Collapse formatting toolbar/i });
    expect(collapseBtn).toBeInTheDocument();
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

    // Check all 7 tools
    FORMATTING_TOOLBAR_OPTIONS.forEach((opt) => {
      const btn = screen.getByRole('button', { name: new RegExp(opt.label, 'i') });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('data-tool-type', opt.type);
    });

    // Action button should have active state because activeBlock is action
    const actionBtn = screen.getByRole('button', { name: /Action/i });
    expect(actionBtn).toHaveAttribute('data-active', 'true');
    expect(actionBtn).toHaveAttribute('aria-pressed', 'true');
    expect(actionBtn).toHaveClass('is-active');

    // Dialogue button should not be active
    const dialogueBtn = screen.getByRole('button', { name: /Dialogue/i });
    expect(dialogueBtn).toHaveAttribute('data-active', 'false');
    expect(dialogueBtn).toHaveAttribute('aria-pressed', 'false');
    expect(dialogueBtn).not.toHaveClass('is-active');
  });

  it('updates active state dynamically when activeBlock changes', () => {
    const { rerender } = render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Action/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('button', { name: /Dialogue/i })).toHaveAttribute('data-active', 'false');

    // Change to dialogue block
    rerender(
      <RightFormattingToolbar
        activeBlock={mockDialogueBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Action/i })).toHaveAttribute('data-active', 'false');
    expect(screen.getByRole('button', { name: /Dialogue/i })).toHaveAttribute('data-active', 'true');
  });

  it('calls onSelectBlockType and onKeepFocus when clicking a tool button', () => {
    const onSelectBlockType = vi.fn();
    const onKeepFocus = vi.fn();

    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={onSelectBlockType}
        onKeepFocus={onKeepFocus}
      />
    );

    const characterBtn = screen.getByRole('button', { name: /Character/i });
    fireEvent.click(characterBtn);

    expect(onSelectBlockType).toHaveBeenCalledWith('character');
    expect(onKeepFocus).toHaveBeenCalled();
  });

  it('prevents default on mousedown and pointerdown to preserve editor focus and selection', () => {
    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    const dialogueBtn = screen.getByRole('button', { name: /Dialogue/i });
    const mouseDownEvent = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    dialogueBtn.dispatchEvent(mouseDownEvent);
    expect(mouseDownEvent.defaultPrevented).toBe(true);

    const pointerDownEvent = new PointerEvent('pointerdown', { cancelable: true, bubbles: true });
    dialogueBtn.dispatchEvent(pointerDownEvent);
    expect(pointerDownEvent.defaultPrevented).toBe(true);
  });

  it('displays contextual tooltip on hover with tool name, shortcut, and description', () => {
    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    const dialogueBtn = screen.getByRole('button', { name: /Dialogue/i });

    // Hover
    fireEvent.mouseEnter(dialogueBtn);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Dialogue');
    expect(tooltip).toHaveTextContent('Spoken lines. Applies to the selection or the line at your cursor.');

    // Mouse leave
    fireEvent.mouseLeave(dialogueBtn);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('displays tooltip on keyboard focus and dismisses on blur', () => {
    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    const sceneBtn = screen.getByRole('button', { name: /Scene Heading/i });

    fireEvent.focus(sceneBtn);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Scene Heading');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Location and time of day');

    fireEvent.blur(sceneBtn);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('collapses when collapse button is clicked, persists to localStorage, and shows expand toggle', () => {
    const onCollapseChange = vi.fn();

    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
        onCollapseChange={onCollapseChange}
      />
    );

    const collapseBtn = screen.getByRole('button', { name: /Collapse formatting toolbar/i });
    fireEvent.click(collapseBtn);

    expect(onCollapseChange).toHaveBeenCalledWith(true);
    expect(localStorage.getItem('akhar_format_toolbar_collapsed')).toBe('true');

    // Expanded toolbar should be gone
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();

    // Subtle expand toggle button should now be visible
    const expandBtn = screen.getByRole('button', { name: /Expand formatting toolbar/i });
    expect(expandBtn).toBeInTheDocument();
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');

    // Hover on expand toggle shows expand tooltip
    fireEvent.mouseEnter(expandBtn);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Expand formatting toolbar');

    // Click expand button to restore
    fireEvent.click(expandBtn);
    expect(onCollapseChange).toHaveBeenCalledWith(false);
    expect(localStorage.getItem('akhar_format_toolbar_collapsed')).toBe('false');

    // Expanded toolbar is restored
    expect(screen.getByRole('toolbar', { name: /Screenplay Formatting/i })).toBeInTheDocument();
  });

  it('initializes in collapsed state when localStorage has akhar_format_toolbar_collapsed=true', () => {
    localStorage.setItem('akhar_format_toolbar_collapsed', 'true');

    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Expand formatting toolbar/i })).toBeInTheDocument();
  });

  it('supports keyboard navigation with ArrowDown, ArrowUp, Home, End, and Escape', () => {
    const onKeepFocus = vi.fn();

    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
        onKeepFocus={onKeepFocus}
      />
    );

    const buttons = FORMATTING_TOOLBAR_OPTIONS.map((opt) =>
      screen.getByRole('button', { name: new RegExp(opt.label, 'i') })
    );

    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    // ArrowDown to move to second button (Action)
    fireEvent.keyDown(buttons[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[1]);

    // ArrowDown again to move to third button (Character)
    fireEvent.keyDown(buttons[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[2]);

    // ArrowUp back to Action
    fireEvent.keyDown(buttons[2], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(buttons[1]);

    // End to go to last button (Transition)
    fireEvent.keyDown(buttons[1], { key: 'End' });
    expect(document.activeElement).toBe(buttons[6]);

    // Home to go to first button (Scene Heading)
    fireEvent.keyDown(buttons[6], { key: 'Home' });
    expect(document.activeElement).toBe(buttons[0]);

    // Escape restores focus to editor
    fireEvent.keyDown(buttons[0], { key: 'Escape' });
    expect(onKeepFocus).toHaveBeenCalled();
  });

  it('disables all formatting buttons when isTitleEditing is true', () => {
    const onSelectBlockType = vi.fn();

    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={true}
        onSelectBlockType={onSelectBlockType}
      />
    );

    const actionBtn = screen.getByRole('button', { name: /Action/i });
    expect(actionBtn).toBeDisabled();
    expect(actionBtn).toHaveAttribute('aria-disabled', 'true');

    // Click does not trigger formatting change
    fireEvent.click(actionBtn);
    expect(onSelectBlockType).not.toHaveBeenCalled();

    // Active state is not shown when editing title
    expect(actionBtn).toHaveAttribute('data-active', 'false');
  });
});
