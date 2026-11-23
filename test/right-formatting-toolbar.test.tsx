/**
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import {
  RightFormattingToolbar,
  FORMATTING_TOOLBAR_OPTIONS,
} from '../src/renderer/components/RightFormattingToolbar';
import { ScreenplayBlock } from '../src/types/screenplay';

describe('RightFormattingToolbar - Claude Element Rail Redesign', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
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

  it('renders expanded palette surface with radiogroup, no FORMAT header, collapse control at bottom, and all 7 screenplay tools', () => {
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

    // Palette & Rail container
    const nav = screen.getByRole('toolbar', { name: /Screenplay Formatting/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('ds-palette');
    expect(nav).toHaveClass('ds-rail');

    // No FORMAT heading (per redesign spec)
    expect(screen.queryByText('FORMAT')).not.toBeInTheDocument();

    // Radiogroup semantics
    const radiogroup = screen.getByRole('radiogroup', { name: /Element type/i });
    expect(radiogroup).toBeInTheDocument();

    // Collapse button at bottom
    const collapseBtn = screen.getByRole('button', { name: /Hide element types/i });
    expect(collapseBtn).toBeInTheDocument();
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    expect(collapseBtn).toHaveAttribute('data-rail-collapse');

    // Check all 7 tools with role="radio"
    FORMATTING_TOOLBAR_OPTIONS.forEach((opt) => {
      const radio = screen.getByRole('radio', { name: new RegExp(opt.label, 'i') });
      expect(radio).toBeInTheDocument();
      expect(radio).toHaveAttribute('data-tool-type', opt.type);
      expect(radio).toHaveAttribute('data-el', opt.type);
    });

    // Action radio button should have active state because activeBlock is action
    const actionRadio = screen.getByRole('radio', { name: /Action/i });
    expect(actionRadio).toHaveAttribute('data-active', 'true');
    expect(actionRadio).toHaveAttribute('aria-checked', 'true');
    expect(actionRadio).toHaveClass('is-active');

    // Dialogue button should not be active
    const dialogueRadio = screen.getByRole('radio', { name: /Dialogue/i });
    expect(dialogueRadio).toHaveAttribute('data-active', 'false');
    expect(dialogueRadio).toHaveAttribute('aria-checked', 'false');
    expect(dialogueRadio).not.toHaveClass('is-active');
  });

  it('updates active state dynamically and smoothly when activeBlock changes', () => {
    const { rerender } = render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    expect(screen.getByRole('radio', { name: /Action/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Dialogue/i })).toHaveAttribute('aria-checked', 'false');

    // Change to dialogue block
    rerender(
      <RightFormattingToolbar
        activeBlock={mockDialogueBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    expect(screen.getByRole('radio', { name: /Action/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /Dialogue/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('clears active state across all individual tools when isMixedSelection is true', () => {
    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isMixedSelection={true}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    // No radio button should be checked
    FORMATTING_TOOLBAR_OPTIONS.forEach((opt) => {
      const radio = screen.getByRole('radio', { name: new RegExp(opt.label, 'i') });
      expect(radio).toHaveAttribute('aria-checked', 'false');
      expect(radio).toHaveAttribute('data-active', 'false');
      expect(radio).not.toHaveClass('is-active');
    });
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

    const characterRadio = screen.getByRole('radio', { name: /Character/i });
    fireEvent.click(characterRadio);

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

    const dialogueRadio = screen.getByRole('radio', { name: /Dialogue/i });
    const mouseDownEvent = new MouseEvent('mousedown', { cancelable: true, bubbles: true });
    dialogueRadio.dispatchEvent(mouseDownEvent);
    expect(mouseDownEvent.defaultPrevented).toBe(true);

    const pointerDownEvent = new PointerEvent('pointerdown', { cancelable: true, bubbles: true });
    dialogueRadio.dispatchEvent(pointerDownEvent);
    expect(pointerDownEvent.defaultPrevented).toBe(true);
  });

  it('displays compact one-line tooltip on hover with name and shortcut, revealing description after 900ms', () => {
    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    const dialogueRadio = screen.getByRole('radio', { name: /Dialogue/i });

    // Pointer enter (400ms delay)
    fireEvent.pointerEnter(dialogueRadio);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Advance 400ms: tooltip appears with name and shortcut
    act(() => {
      vi.advanceTimersByTime(400);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Dialogue');
    expect(tooltip).not.toHaveClass('is-detail');

    // Verify expander container is ready for progressive disclosure
    const expander = tooltip.querySelector('.ds-tip__expander');
    expect(expander).toBeInTheDocument();

    // Advance to 900ms: description is revealed within the EXACT SAME DOM element
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const detailedTooltip = screen.getByRole('tooltip');
    expect(detailedTooltip).toBe(tooltip); // Must remain the same mounted element
    expect(detailedTooltip).toHaveClass('is-detail');
    expect(detailedTooltip).toHaveTextContent('What the character says.');
    expect(detailedTooltip.querySelector('.ds-tip__desc')).toHaveTextContent('What the character says.');

    // Pointer leave dismisses tooltip immediately
    fireEvent.pointerLeave(dialogueRadio);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('displays tooltip on keyboard focus immediately and dismisses on blur', () => {
    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    const sceneRadio = screen.getByRole('radio', { name: /Scene Heading/i });

    // Mock :focus-visible match
    sceneRadio.matches = vi.fn().mockImplementation((sel) => sel === ':focus-visible');

    fireEvent.focus(sceneRadio);
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent('Scene Heading');

    fireEvent.blur(sceneRadio);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('collapses to a single chip showing current active element, persists to localStorage, and expands on click', () => {
    const onCollapseChange = vi.fn();

    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
        onCollapseChange={onCollapseChange}
      />
    );

    const collapseBtn = screen.getByRole('button', { name: /Hide element types/i });
    fireEvent.click(collapseBtn);

    // Fast-forward animation timeout (140ms pop-out)
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onCollapseChange).toHaveBeenCalledWith(true);
    expect(localStorage.getItem('akhar_format_toolbar_collapsed')).toBe('true');

    // Expanded radiogroup should be gone
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();

    // Collapsed chip button should be visible displaying the active element info
    const chipBtn = screen.getByRole('button', { name: /Show element types/i });
    expect(chipBtn).toBeInTheDocument();
    expect(chipBtn).toHaveAttribute('aria-expanded', 'false');
    expect(chipBtn.getAttribute('aria-label')).toContain('Action');

    // Click chip button to expand and restore
    fireEvent.click(chipBtn);
    expect(onCollapseChange).toHaveBeenCalledWith(false);
    expect(localStorage.getItem('akhar_format_toolbar_collapsed')).toBe('false');

    // Expanded rail is restored
    expect(screen.getByRole('radiogroup', { name: /Element type/i })).toBeInTheDocument();
  });

  it('displays mixed selection icon on collapsed chip when isMixedSelection is true', () => {
    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isMixedSelection={true}
        defaultCollapsed={true}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
      />
    );

    const chipBtn = screen.getByRole('button', { name: /Show element types/i });
    expect(chipBtn).toBeInTheDocument();
    expect(chipBtn.getAttribute('aria-label')).toContain('Mixed');
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

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show element types/i })).toBeInTheDocument();
  });

  it('supports roving tabindex and keyboard navigation with ArrowDown, ArrowUp, Home, End, and Escape', () => {
    const onKeepFocus = vi.fn();

    render(
      <RightFormattingToolbar
        activeBlock={mockActionBlock}
        isTitleEditing={false}
        onSelectBlockType={vi.fn()}
        onKeepFocus={onKeepFocus}
      />
    );

    const radios = FORMATTING_TOOLBAR_OPTIONS.map((opt) =>
      screen.getByRole('radio', { name: new RegExp(opt.label, 'i') })
    );

    // Initial roving tabindex: Action is active (index 1), so it has tabIndex=0, others -1
    expect(radios[1]).toHaveAttribute('tabindex', '0');
    expect(radios[0]).toHaveAttribute('tabindex', '-1');

    radios[1].focus();

    // ArrowDown to move to Character (index 2)
    fireEvent.keyDown(radios[1], { key: 'ArrowDown' });
    expect(radios[2]).toHaveAttribute('tabindex', '0');

    // ArrowDown again to move to Parenthetical (index 3)
    fireEvent.keyDown(radios[2], { key: 'ArrowDown' });
    expect(radios[3]).toHaveAttribute('tabindex', '0');

    // ArrowUp back to Character (index 2)
    fireEvent.keyDown(radios[3], { key: 'ArrowUp' });
    expect(radios[2]).toHaveAttribute('tabindex', '0');

    // End to move to Transition (last item, index 6)
    fireEvent.keyDown(radios[2], { key: 'End' });
    expect(radios[6]).toHaveAttribute('tabindex', '0');

    // Home to move to Scene Heading (first item, index 0)
    fireEvent.keyDown(radios[6], { key: 'Home' });
    expect(radios[0]).toHaveAttribute('tabindex', '0');

    // Escape returns focus to editor
    fireEvent.keyDown(radios[0], { key: 'Escape' });
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

    const actionRadio = screen.getByRole('radio', { name: /Action/i });
    expect(actionRadio).toBeDisabled();
    expect(actionRadio).toHaveAttribute('aria-disabled', 'true');

    // Click does not trigger formatting change
    fireEvent.click(actionRadio);
    expect(onSelectBlockType).not.toHaveBeenCalled();

    // Active state is not shown when editing title
    expect(actionRadio).toHaveAttribute('data-active', 'false');
    expect(actionRadio).toHaveAttribute('aria-checked', 'false');
  });
});
