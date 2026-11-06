/**
 * @vitest-environment jsdom
 * ui-ux-enhancements-themes.test.tsx
 * Comprehensive verification for UI/UX improvements and design enhancements:
 * 1. Popup Design Consistency (RemoveVersionModal)
 * 2. Improve Tooltip Responsiveness (Instant / Fast Tooltip component)
 * 3. Welcome Screen Visual Transformation & Animations
 * 4. Light, Dark, and Darker Appearance Modes (Theming architecture)
 * 5. Dedicated Settings Section in LeftSidebar
 * 6. Redesigned Bottom Section of Sidebar with hover expansion
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

import { RemoveVersionModal } from '../src/renderer/components/RemoveVersionModal';
import { Tooltip } from '../src/renderer/components/Tooltip';
import { WelcomeScreen } from '../src/renderer/components/WelcomeScreen';
import { LeftSidebar } from '../src/renderer/components/LeftSidebar';
import {
  getStoredTheme,
  setTheme,
  applyTheme,
  STORAGE_KEY,
} from '../src/renderer/utils/theme';
import { ScriptDraft } from '../src/types/screenplay';

describe('Akhar Studio — UI/UX Enhancements & Design Refinements', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.className = '';
  });

  afterEach(() => {
    cleanup();
  });

  const dummyDraft: ScriptDraft = {
    id: 'd-test-1',
    name: 'Version 2',
    isMain: false,
    createdAt: '2026-11-04T10:00:00Z',
    modifiedAt: '2026-11-04T10:30:00Z',
    blocks: [
      { id: 'b1', type: 'scene_heading', text: 'EXT. VILLAGE ROAD - DAY' },
      { id: 'b2', type: 'action', text: 'A tractor passes by.' },
    ],
  };

  /* -----------------------------------------------------------------------
   * 1. POPUP DESIGN CONSISTENCY: Close and Remove Version Modal
   * ----------------------------------------------------------------------- */
  describe('1. Popup Design Consistency (RemoveVersionModal)', () => {
    it('renders the RemoveVersionModal adhering to the design system', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <RemoveVersionModal
          isOpen={true}
          versionName="Version 2"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      // Verify title and version name matching design language
      expect(screen.getByText('Close and Remove Version')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to close and remove/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Version 2/i)).toBeInTheDocument();

      // Verify Cancel and Remove buttons exist
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      const removeBtn = screen.getByRole('button', { name: /Remove Version/i });
      expect(cancelBtn).toBeInTheDocument();
      expect(removeBtn).toBeInTheDocument();

      // Test cancel action
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalledTimes(1);

      // Test confirm action
      fireEvent.click(removeBtn);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard dismissal with Escape and confirmation with Enter', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <RemoveVersionModal
          isOpen={true}
          versionName="Draft Alternate"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCancel).toHaveBeenCalledTimes(1);

      // Press Enter
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  /* -----------------------------------------------------------------------
   * 2. TOOLTIP RESPONSIVENESS
   * ----------------------------------------------------------------------- */
  describe('2. Tooltip Responsiveness', () => {
    it('renders custom responsive tooltip on hover without long delays', async () => {
      render(
        <Tooltip content="Restore Database Backup..." delay={0}>
          <button type="button" aria-label="Restore">
            Icon
          </button>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Restore' });

      // Hover over trigger
      fireEvent.mouseEnter(trigger);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Restore Database Backup...')).toBeInTheDocument();
      });

      // Mouse leave collapses tooltip smoothly
      fireEvent.mouseLeave(trigger);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  /* -----------------------------------------------------------------------
   * 3. TRANSFORM THE WELCOME SCREEN
   * ----------------------------------------------------------------------- */
  describe('3. Welcome Screen Visual Transformation & Tooltip Integration', () => {
    it('renders the transformed welcome screen with ambient aura and fast tooltips on backup icons', async () => {
      const onExportBackup = vi.fn();
      const onRestoreBackup = vi.fn();
      const onNewDatabaseProject = vi.fn();

      render(
        <WelcomeScreen
          isOpen={true}
          logoMode="pa"
          recentProjects={[]}
          onNewDatabaseProject={onNewDatabaseProject}
          onOpenExternalFile={vi.fn()}
          onOpenRecent={vi.fn()}
          onRestoreBackup={onRestoreBackup}
          onExportBackup={onExportBackup}
        />
      );

      // Verify Welcome title
      expect(screen.getByText(/Welcome to Akhar Studio/i)).toBeInTheDocument();

      // Verify backup buttons exist
      const exportBtn = screen.getByRole('button', { name: /Export Database Backup/i });
      const restoreBtn = screen.getByRole('button', { name: /Restore Database Backup/i });

      expect(exportBtn).toBeInTheDocument();
      expect(restoreBtn).toBeInTheDocument();

      // Tooltips appear smoothly on hover
      fireEvent.mouseEnter(restoreBtn);
      await waitFor(() => {
        expect(screen.getByText('Restore Database Backup...')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(restoreBtn);

      // Verify exactly ONE primary action button
      const newBtns = screen.getAllByRole('button', { name: /New Screenplay/i });
      expect(newBtns).toHaveLength(1);
    });
  });

  /* -----------------------------------------------------------------------
   * 4. LIGHT, DARK, AND DARKER APPEARANCE MODES
   * ----------------------------------------------------------------------- */
  describe('4. Appearance Theming Architecture (Dark, Darker, Light)', () => {
    it('defaults to Dark mode when no preference is saved', () => {
      expect(getStoredTheme()).toBe('dark');
      applyTheme(getStoredTheme());
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('applies and saves Darker mode correctly', () => {
      setTheme('darker');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('darker');
      expect(document.documentElement.getAttribute('data-theme')).toBe('darker');
      expect(document.documentElement.classList.contains('darker')).toBe(true);
    });

    it('applies and saves Light mode correctly', () => {
      setTheme('light');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('dispatches themechange event on theme switch', () => {
      const listener = vi.fn();
      document.addEventListener('themechange', listener);

      setTheme('light');
      expect(listener).toHaveBeenCalled();

      const eventDetail = listener.mock.calls[0][0].detail;
      expect(eventDetail.theme).toBe('light');

      document.removeEventListener('themechange', listener);
    });
  });

  /* -----------------------------------------------------------------------
   * 5. DEDICATED SETTINGS SECTION IN SIDEBAR
   * ----------------------------------------------------------------------- */
  describe('5. Dedicated Settings Section in LeftSidebar', () => {
    it('provides a dedicated Settings entry with Appearance, Paper Format, Autosave, and Project Library', () => {
      const onPaperSizeChange = vi.fn();
      const onToggleAutosave = vi.fn();
      const onOpenLibrary = vi.fn();
      const onThemeChange = vi.fn();

      render(
        <LeftSidebar
          isOpen={true}
          onClose={vi.fn()}
          inputMode="pa"
          onToggleInputMode={vi.fn()}
          paperSize="letter"
          onPaperSizeChange={onPaperSizeChange}
          contdSetting="unasked"
          onContdSettingChange={vi.fn()}
          autosaveEnabled={true}
          onToggleAutosave={onToggleAutosave}
          onOpenCustomDictionary={vi.fn()}
          onOpenHelp={vi.fn()}
          onOpenDiagnostics={vi.fn()}
          onOpenLibrary={onOpenLibrary}
          draft={dummyDraft}
          theme="dark"
          onThemeChange={onThemeChange}
        />
      );

      // Tab list contains Scenes, Tools, and Settings
      const settingsTab = screen.getByRole('tab', { name: /Settings/i });
      expect(settingsTab).toBeInTheDocument();

      // Click Settings tab to switch into dedicated settings area
      fireEvent.click(settingsTab);
      expect(settingsTab.getAttribute('aria-selected')).toBe('true');

      // Verify Appearance controls (Dark, Darker, Light)
      const darkBtn = screen.getByRole('radio', { name: 'Dark' });
      const darkerBtn = screen.getByRole('radio', { name: 'Darker' });
      const lightBtn = screen.getByRole('radio', { name: 'Light' });

      expect(darkBtn).toBeInTheDocument();
      expect(darkerBtn).toBeInTheDocument();
      expect(lightBtn).toBeInTheDocument();

      // Click Darker mode
      fireEvent.click(darkerBtn);
      expect(onThemeChange).toHaveBeenCalledWith('darker');

      // Click Light mode
      fireEvent.click(lightBtn);
      expect(onThemeChange).toHaveBeenCalledWith('light');

      // Verify Paper Format controls (US Letter, A4)
      const a4Btn = screen.getByRole('radio', { name: 'A4' });
      expect(a4Btn).toBeInTheDocument();
      fireEvent.click(a4Btn);
      expect(onPaperSizeChange).toHaveBeenCalledWith('a4');

      // Verify Autosave toggle
      const autosaveSwitch = screen.getByRole('switch', { name: 'Autosave' });
      expect(autosaveSwitch).toBeInTheDocument();
      fireEvent.click(autosaveSwitch);
      expect(onToggleAutosave).toHaveBeenCalledWith(false);

      // Verify Project Library & Backups entry
      const libraryEntry = screen.getByRole('button', { name: /Project Library & Backups/i });
      expect(libraryEntry).toBeInTheDocument();
      fireEvent.click(libraryEntry);
      expect(onOpenLibrary).toHaveBeenCalledTimes(1);
    });
  });

  /* -----------------------------------------------------------------------
   * 6. REDESIGNED BOTTOM SECTION OF THE SIDEBAR
   * ----------------------------------------------------------------------- */
  describe('6. Redesigned Bottom Section of the Sidebar', () => {
    it('places Keyboard Shortcuts & Help, About, and Diagnostics at the bottom with expanding labels', () => {
      const onOpenHelp = vi.fn();
      const onOpenAbout = vi.fn();
      const onOpenDiagnostics = vi.fn();

      render(
        <LeftSidebar
          isOpen={true}
          onClose={vi.fn()}
          inputMode="pa"
          onToggleInputMode={vi.fn()}
          paperSize="letter"
          onPaperSizeChange={vi.fn()}
          contdSetting="unasked"
          onContdSettingChange={vi.fn()}
          onOpenCustomDictionary={vi.fn()}
          onOpenHelp={onOpenHelp}
          onOpenAbout={onOpenAbout}
          onOpenDiagnostics={onOpenDiagnostics}
          onOpenLibrary={vi.fn()}
          draft={dummyDraft}
        />
      );

      // Verify items are rendered in bottom section with accessible names
      const helpBtn = screen.getByRole('button', { name: 'Keyboard Shortcuts & Help' });
      const aboutBtn = screen.getByRole('button', { name: 'About Akhar Studio' });
      const diagBtn = screen.getByRole('button', { name: 'Diagnostics Console' });

      expect(helpBtn).toBeInTheDocument();
      expect(aboutBtn).toBeInTheDocument();
      expect(diagBtn).toBeInTheDocument();

      // Verify sidebar-bottom-item classes for hover expansion
      expect(helpBtn.classList.contains('sidebar-bottom-item')).toBe(true);
      expect(aboutBtn.classList.contains('sidebar-bottom-item')).toBe(true);
      expect(diagBtn.classList.contains('sidebar-bottom-item')).toBe(true);

      // Trigger actions
      fireEvent.click(helpBtn);
      expect(onOpenHelp).toHaveBeenCalledTimes(1);

      fireEvent.click(aboutBtn);
      expect(onOpenAbout).toHaveBeenCalledTimes(1);

      fireEvent.click(diagBtn);
      expect(onOpenDiagnostics).toHaveBeenCalledTimes(1);
    });
  });
});
