/**
 * database-ui-welcome.test.tsx - Verification test suite for Welcome Screen & Database-First Flow
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { WelcomeScreen } from '../src/renderer/components/WelcomeScreen';
import { AkharStudioLogo } from '../src/renderer/components/AkharStudioLogo';
import { RecentProject } from '../src/types/screenplay';

describe('Database-First Project Management & Welcome Screen', () => {
  afterEach(() => {
    cleanup();
  });
  const mockRecentProjects: RecentProject[] = [
    {
      id: 'db_proj_1',
      source: 'database',
      title: 'ਅੰਮ੍ਰਿਤ ਵੇਲਾ (Amrit Vela)',
      modifiedAt: '2026-10-31T10:00:00.000Z',
      lastOpenedAt: '2026-10-31T10:00:00.000Z',
      wordCount: 15400,
      pageCount: 92,
      sceneCount: 45,
    },
    {
      id: 'ext_file_1',
      source: 'external',
      title: 'Legacy Exported Script',
      filePath: '/Users/writer/Documents/LegacyExport.scriptproject',
      modifiedAt: '2026-10-25T14:30:00.000Z',
      lastOpenedAt: '2026-10-25T14:30:00.000Z',
    },
  ];

  describe('Welcome Screen Rendering & Actions', () => {
    it('renders Welcome Screen with primary actions: New Screenplay, Open File, Restore Backup, Export Backup', () => {
      const onNewDatabaseProject = vi.fn();
      const onOpenExternalFile = vi.fn();
      const onOpenRecent = vi.fn();
      const onRestoreBackup = vi.fn();
      const onExportBackup = vi.fn();

      render(
        <WelcomeScreen
          logoMode="pa"
          recentProjects={mockRecentProjects}
          onNewDatabaseProject={onNewDatabaseProject}
          onOpenExternalFile={onOpenExternalFile}
          onOpenRecent={onOpenRecent}
          onRestoreBackup={onRestoreBackup}
          onExportBackup={onExportBackup}
        />
      );

      // Verify New Screenplay has exactly ONE instance (no duplicates)
      const newButtons = screen.getAllByRole('button', { name: /New Screenplay/i });
      expect(newButtons).toHaveLength(1);
      const newBtn = newButtons[0];

      // Verify Open File, Restore Backup, and Export Database exist
      const openBtn = screen.getByRole('button', { name: /Open File/i });
      const restoreBtn = screen.getByRole('button', { name: /Restore Database Backup/i });
      const exportBtn = screen.getByRole('button', { name: /Export Database Backup/i });

      expect(newBtn).toBeInTheDocument();
      expect(openBtn).toBeInTheDocument();
      expect(restoreBtn).toBeInTheDocument();
      expect(exportBtn).toBeInTheDocument();

      // Click New Screenplay
      fireEvent.click(newBtn);
      expect(onNewDatabaseProject).toHaveBeenCalledTimes(1);

      // Click Open File
      fireEvent.click(openBtn);
      expect(onOpenExternalFile).toHaveBeenCalledTimes(1);

      // Click Restore Backup
      fireEvent.click(restoreBtn);
      expect(onRestoreBackup).toHaveBeenCalledTimes(1);

      // Click Export Backup
      fireEvent.click(exportBtn);
      expect(onExportBackup).toHaveBeenCalledTimes(1);
    });

    it('visually distinguishes internal database projects from external files (Requirement 7)', () => {
      const onOpenRecent = vi.fn();

      render(
        <WelcomeScreen
          logoMode="en"
          recentProjects={mockRecentProjects}
          onNewDatabaseProject={vi.fn()}
          onOpenExternalFile={vi.fn()}
          onOpenRecent={onOpenRecent}
          onRestoreBackup={vi.fn()}
        />
      );

      // Both projects rendered
      expect(screen.getByText('ਅੰਮ੍ਰਿਤ ਵੇਲਾ (Amrit Vela)')).toBeInTheDocument();
      expect(screen.getByText('Legacy Exported Script')).toBeInTheDocument();

      // Check badges
      const dbBadges = screen.getAllByText('Database');
      const extBadges = screen.getAllByText('External File');

      expect(dbBadges.length).toBeGreaterThanOrEqual(1);
      expect(extBadges.length).toBeGreaterThanOrEqual(1);

      // Check database stats
      expect(screen.getByText(/92 pages · 15400 words/i)).toBeInTheDocument();

      // Check external file path display
      expect(screen.getByText('/Users/writer/Documents/LegacyExport.scriptproject')).toBeInTheDocument();

      // Click recent project
      const dbRow = screen.getByText('ਅੰਮ੍ਰਿਤ ਵੇਲਾ (Amrit Vela)').closest('button');
      expect(dbRow).not.toBeNull();
      fireEvent.click(dbRow!);
      expect(onOpenRecent).toHaveBeenCalledWith(mockRecentProjects[0]);
    });
  });

  describe('Official Alternating Brand Logo (Requirement 8)', () => {
    it('renders the Gurmukhi variant (ਅੱਖਰStudio) when logoMode is "pa"', () => {
      render(<AkharStudioLogo mode="pa" size="lg" />);
      expect(screen.getByText('ਅੱਖਰ')).toBeInTheDocument();
      expect(screen.getByText('Studio')).toBeInTheDocument();
    });

    it('renders the English variant (AkharStudio) when logoMode is "en"', () => {
      render(<AkharStudioLogo mode="en" size="lg" />);
      expect(screen.getByText('Akhar')).toBeInTheDocument();
      expect(screen.getByText('Studio')).toBeInTheDocument();
    });
  });
});
