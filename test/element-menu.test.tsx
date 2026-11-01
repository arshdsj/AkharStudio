/**
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ScreenplayElementMenu } from '../src/renderer/components/ScreenplayElementMenu';
import { FloatingToolbar } from '../src/renderer/components/FloatingToolbar';
import { ScreenplayBlock } from '../src/types/screenplay';

describe('ScreenplayElementMenu & FloatingToolbar Element Selector', () => {
  afterEach(() => {
    cleanup();
  });
  const dummyBlock: ScreenplayBlock = {
    id: 'block-1',
    type: 'action',
    text: 'A dark corridor in the haveli.',
  };

  it('renders all 7 screenplay element options with labels and shortcuts when open', () => {
    const onSelectType = vi.fn();
    const onClose = vi.fn();

    render(
      <ScreenplayElementMenu
        isOpen={true}
        activeType="action"
        onSelectType={onSelectType}
        onClose={onClose}
      />
    );

    const menu = screen.getByRole('menu', { name: /Screenplay Elements/i });
    expect(menu).toBeInTheDocument();

    const expectedItems = [
      { label: 'Scene Heading', shortcut: '1' },
      { label: 'Action', shortcut: '2' },
      { label: 'Character', shortcut: '3' },
      { label: 'Parenthetical', shortcut: '4' },
      { label: 'Dialogue', shortcut: '5' },
      { label: 'Shot', shortcut: '6' },
      { label: 'Transition', shortcut: '7' },
    ];

    expectedItems.forEach(({ label }) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(7);

    // Action should be selected
    const actionItem = menuItems[1];
    expect(actionItem).toHaveAttribute('aria-selected', 'true');

    // Dialogue item should not be selected
    const dialogueItem = menuItems[4];
    expect(dialogueItem).toHaveAttribute('aria-selected', 'false');
  });

  it('selects an element and closes menu when clicked', () => {
    const onSelectType = vi.fn();
    const onClose = vi.fn();
    const onKeepFocus = vi.fn();

    render(
      <ScreenplayElementMenu
        isOpen={true}
        activeType="dialogue"
        onSelectType={onSelectType}
        onClose={onClose}
        onKeepFocus={onKeepFocus}
      />
    );

    const actionButton = screen.getByText('Action');
    fireEvent.click(actionButton);

    expect(onSelectType).toHaveBeenCalledWith('action');
    expect(onClose).toHaveBeenCalled();
    expect(onKeepFocus).toHaveBeenCalled();
  });

  it('closes menu when Escape key is pressed', () => {
    const onClose = vi.fn();

    render(
      <ScreenplayElementMenu
        isOpen={true}
        activeType="action"
        onSelectType={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('selects element when numeric key is pressed while menu is open', () => {
    const onSelectType = vi.fn();
    const onClose = vi.fn();

    render(
      <ScreenplayElementMenu
        isOpen={true}
        activeType="action"
        onSelectType={onSelectType}
        onClose={onClose}
      />
    );

    // Press '5' for Dialogue
    fireEvent.keyDown(window, { key: '5' });
    expect(onSelectType).toHaveBeenCalledWith('dialogue');
    expect(onClose).toHaveBeenCalled();
  });

  it('toggles menu open and closed when clicking the element button in FloatingToolbar', () => {
    const onSelectBlockType = vi.fn();

    render(
      <FloatingToolbar
        activeBlock={dummyBlock}
        isTitleEditing={false}
        canUndo={true}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onApplyFormat={vi.fn()}
        onToggleCase={vi.fn()}
        onCopy={vi.fn()}
        onSelectBlockType={onSelectBlockType}
      />
    );

    // Button shows current element label
    const elementButton = screen.getByTitle(/Current Screenplay Element: Action/i);
    expect(elementButton).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Click button to open menu
    fireEvent.click(elementButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click 'Dialogue' from the popup
    const dialogueOption = screen.getByText('Dialogue');
    fireEvent.click(dialogueOption);

    expect(onSelectBlockType).toHaveBeenCalledWith('dialogue');
    // Menu should be closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('disables element button and forbids opening menu during title editing', () => {
    render(
      <FloatingToolbar
        activeBlock={dummyBlock}
        isTitleEditing={true}
        canUndo={true}
        canRedo={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onApplyFormat={vi.fn()}
        onToggleCase={vi.fn()}
        onCopy={vi.fn()}
        onSelectBlockType={vi.fn()}
      />
    );

    const titleSelector = screen.getByTitle(/Element selector disabled in Title Card/i);
    expect(titleSelector).toBeDisabled();

    fireEvent.click(titleSelector);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
