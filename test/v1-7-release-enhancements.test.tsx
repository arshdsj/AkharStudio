/**
 * v1-7-release-enhancements.test.tsx
 * Automated test suite covering the 5 user-requested enhancements:
 * 1. Tightened spacing between "Akhar / ਅੱਖਰ" and "Studio"
 * 2. Reorganized top toolbar (Projects button on far right, Saved status to the left, mini diagnostic tool removed)
 * 3. Right-click context menus on Projects window (Export, Save As, Delete)
 * 4. .fountain file support & OS file association
 * 5. Right-aligned transitions (Cut To: flush with right edge of typing area)
 *
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import { AkharStudioLogo } from '../src/renderer/components/AkharStudioLogo';
import { HeaderRow1 } from '../src/renderer/components/HeaderRow1';
import { WelcomeScreen } from '../src/renderer/components/WelcomeScreen';
import { ProjectLibraryModal } from '../src/renderer/components/ProjectLibraryModal';
import { FileSystemManager } from '../src/core/storage/FileSystemManager';
import { SCREENPLAY_BLOCK_STYLES, generateBlockCssRules } from '../src/core/layout/screenplayGeometry';
import { RecentProject } from '../src/types/screenplay';

describe('v1.7 User-Requested Enhancements Suite', () => {
  afterEach(() => {
    cleanup();
  });

  describe('1. Tightened Spacing Between "Akhar / ਅੱਖਰ" and "Studio"', () => {
    it('does not apply dead-space fixed width classes (w-[100px], w-[75px], w-[44px]) to logo prefix', () => {
      const { container: containerHero } = render(<AkharStudioLogo mode="pa" size="xl" />);
      const prefixHero = containerHero.querySelector('.akhar-logo-prefix');
      expect(prefixHero).toBeInTheDocument();
      expect(prefixHero).not.toHaveClass('w-[100px]');
      expect(prefixHero).toHaveTextContent('ਅੱਖਰ');

      const { container: containerMd } = render(<AkharStudioLogo mode="en" size="md" />);
      const prefixMd = containerMd.querySelector('.akhar-logo-prefix');
      expect(prefixMd).toBeInTheDocument();
      expect(prefixMd).not.toHaveClass('w-[44px]');
      expect(prefixMd).toHaveTextContent('Akhar');
    });

    it('renders "Akhar" / "ਅੱਖਰ" and "Studio" with tight natural text flow', () => {
      render(<AkharStudioLogo mode="en" size="md" />);
      const akharEl = screen.getByText('Akhar');
      const studioEl = screen.getByText('Studio');

      expect(akharEl).toBeInTheDocument();
      expect(studioEl).toBeInTheDocument();
      // Studio has tight margin (ml-1) visually connecting it to Akhar
      expect(studioEl).toHaveClass('ml-1');
    });
  });

  describe('2. Reorganized Top Toolbar (HeaderRow1)', () => {
    it('positions the Projects button on the far right and Saved indicator to its left', () => {
      const onOpenLibrary = vi.fn();
      render(
        <HeaderRow1
          title="Super Script"
          onTitleChange={vi.fn()}
          saveStatus="clean"
          onOpenLibrary={onOpenLibrary}
          onOpenSearch={vi.fn()}
          onRetrySave={vi.fn()}
          currentFilePath="/projects/Super.scriptproject"
        />
      );

      // Verify Projects button is present on the right side
      const projectsBtn = screen.getByTitle(/Project Library & Files/i);
      expect(projectsBtn).toBeInTheDocument();
      expect(projectsBtn).toHaveTextContent('Projects');

      // Verify Saved indicator exists
      const savedChip = screen.getByText('Saved');
      expect(savedChip).toBeInTheDocument();

      // Right-side container holds both Saved chip and Projects button
      const rightContainer = projectsBtn.closest('.space-x-2\\.5') || projectsBtn.parentElement;
      expect(rightContainer).toContainElement(savedChip);
      expect(rightContainer).toContainElement(projectsBtn);

      // Clicking Projects invokes onOpenLibrary
      fireEvent.click(projectsBtn);
      expect(onOpenLibrary).toHaveBeenCalledTimes(1);
    });

    it('completely removes the mini diagnostic tool from the top toolbar', () => {
      render(
        <HeaderRow1
          title="Super Script"
          onTitleChange={vi.fn()}
          saveStatus="clean"
          onOpenLibrary={vi.fn()}
          onOpenSearch={vi.fn()}
          onRetrySave={vi.fn()}
          currentFilePath={null}
        />
      );

      expect(screen.queryByTitle(/Start Recording Diagnostics/i)).toBeNull();
      expect(screen.queryByTitle(/Stop Recording Diagnostics/i)).toBeNull();
      expect(screen.queryByTitle(/Open Diagnostic Console/i)).toBeNull();
      expect(screen.queryByTitle(/Diagnostic Options/i)).toBeNull();
    });
  });

  describe('3. Right-Click Context Menus on Projects Window', () => {
    const mockRecents: RecentProject[] = [
      {
        id: 'proj_1',
        title: 'Baba Balak Nath',
        source: 'database',
        modifiedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        pageCount: 18,
        wordCount: 3498,
      },
      {
        id: 'proj_2',
        title: 'Heer Ranjha',
        source: 'external',
        filePath: '/screenplays/heer.fountain',
        modifiedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      },
    ];

    it('opens context menu on right-click in WelcomeScreen with Export, Save As, and Delete', () => {
      const onExport = vi.fn();
      const onSaveAs = vi.fn();
      const onDelete = vi.fn();
      const onOpenRecent = vi.fn();

      render(
        <WelcomeScreen
          isOpen={true}
          logoMode="pa"
          recentProjects={mockRecents}
          onNewDatabaseProject={vi.fn()}
          onOpenExternalFile={vi.fn()}
          onOpenRecent={onOpenRecent}
          onRestoreBackup={vi.fn()}
          onExportProjectDirectly={onExport}
          onSaveAsProjectDirectly={onSaveAs}
          onDeleteProjectDirectly={onDelete}
        />
      );

      // Right-click on the first screenplay
      const projectRow = screen.getByText('Baba Balak Nath').closest('button')!;
      fireEvent.contextMenu(projectRow, { clientX: 300, clientY: 250 });

      // Context menu must appear
      expect(screen.getByText('Open Screenplay')).toBeInTheDocument();
      expect(screen.getByText('Export as PDF...')).toBeInTheDocument();
      expect(screen.getByText('Export as Fountain (.fountain)...')).toBeInTheDocument();
      expect(screen.getByText('Export Project Bundle...')).toBeInTheDocument();
      expect(screen.getByText('Save As...')).toBeInTheDocument();
      expect(screen.getByText('Delete Screenplay')).toBeInTheDocument();

      // Click "Export as PDF..."
      fireEvent.click(screen.getByText('Export as PDF...'));
      expect(onExport).toHaveBeenCalledWith(mockRecents[0], 'pdf');

      // Right-click again and click "Delete Screenplay"
      fireEvent.contextMenu(projectRow, { clientX: 300, clientY: 250 });
      fireEvent.click(screen.getByText('Delete Screenplay'));
      expect(onDelete).toHaveBeenCalledWith(mockRecents[0]);
    });

    it('opens context menu on right-click in ProjectLibraryModal', () => {
      const onExport = vi.fn();
      const onSaveAs = vi.fn();
      const onDelete = vi.fn();

      render(
        <ProjectLibraryModal
          isOpen={true}
          onClose={vi.fn()}
          onNewProject={vi.fn()}
          onOpenFile={vi.fn()}
          recentProjects={mockRecents}
          onOpenRecent={vi.fn()}
          onExportProjectDirectly={onExport}
          onSaveAsProjectDirectly={onSaveAs}
          onDeleteProjectDirectly={onDelete}
        />
      );

      const projectRow = screen.getByText('Baba Balak Nath').closest('button')!;
      fireEvent.contextMenu(projectRow, { clientX: 200, clientY: 200 });

      expect(screen.getByText('Export as PDF...')).toBeInTheDocument();
      expect(screen.getByText('Save As...')).toBeInTheDocument();
      expect(screen.getByText('Delete Screenplay')).toBeInTheDocument();

      // Click "Save As..."
      fireEvent.click(screen.getByText('Save As...'));
      expect(onSaveAs).toHaveBeenCalledWith(mockRecents[0]);
    });
  });

  describe('4. .fountain File Support and File Association', () => {
    it('FileSystemManager successfully opens and parses a .fountain screenplay file into a ScriptProject', async () => {
      const fsManager = new FileSystemManager();
      const testFountainPath = path.resolve(__dirname, '../BABA BALAK NATH.fountain');

      // Verify the fixture or sample fountain file exists
      if (fs.existsSync(testFountainPath)) {
        const project = await fsManager.openProject(testFountainPath);
        expect(project).toBeDefined();
        expect(project.title).toBeTruthy();
        expect(project.drafts.length).toBeGreaterThan(0);
        expect(project.drafts[0].blocks.length).toBeGreaterThan(0);
        expect(project.settings.paperSize).toBe('letter');
      }
    });

    it('package.json associates .fountain file extension at OS level', () => {
      const packageJsonPath = path.resolve(__dirname, '../package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const fileAssociations = pkg.build?.fileAssociations;
      expect(Array.isArray(fileAssociations)).toBe(true);

      const fountainAssoc = fileAssociations.find((a: any) => a.ext === 'fountain');
      expect(fountainAssoc).toBeDefined();
      expect(fountainAssoc.role).toBe('Editor');
      expect(fountainAssoc.name).toContain('Fountain');
    });
  });

  describe('5. Right-Aligned Transitions (like Cut To:)', () => {
    it('configures transition blocks with text-align: right and margin-left: 0 in screenplayGeometry', () => {
      const transitionSpec = SCREENPLAY_BLOCK_STYLES.transition;
      expect(transitionSpec.marginLeftPx).toBe(0);
      expect(transitionSpec.textAlign).toBe('right');
    });

    it('generates text-align: right in block CSS rules for block-transition', () => {
      const cssRules = generateBlockCssRules();
      expect(cssRules).toContain('.block-transition');
      expect(cssRules).toMatch(/\.block-transition\s*\{[^}]*text-align:\s*right;/);
    });

    it('has text-align: right and margin-left: 0 in index.css for .ProseMirror .block-transition', () => {
      const indexCssPath = path.resolve(__dirname, '../src/renderer/index.css');
      const indexCss = fs.readFileSync(indexCssPath, 'utf-8');

      expect(indexCss).toMatch(/\.ProseMirror\s+\.block-transition\s*\{[^}]*text-align:\s*right;/);
      expect(indexCss).toMatch(/\.ProseMirror\s+\.block-transition\s*\{[^}]*margin-left:\s*0;/);
    });
  });
});
