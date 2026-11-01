/**
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingToolbar } from '../src/renderer/components/FloatingToolbar';
import { HeaderRow1 } from '../src/renderer/components/HeaderRow1';
import { ExportModal } from '../src/renderer/components/ExportModal';
import { ScreenplayElementMenu } from '../src/renderer/components/ScreenplayElementMenu';
import { createDefaultProject } from '../src/core/model/ProjectModel';
import { generateScreenplayHtml } from '../src/core/export/pdfExporter';
import { PDFDocument } from '@cantoo/pdf-lib';
import { ScriptDraft } from '../src/types/screenplay';

describe('Akhar Studio – Required Improvements and Directives Verification', () => {
  // -------------------------------------------------------------
  // 1. Database-First Project Management
  // -------------------------------------------------------------
  describe('Directive 1: Database-First Project Management', () => {
    it('creates fresh projects with Master Draft directly in database schema format', () => {
      const project = createDefaultProject();
      expect(project.drafts[0].name).toBe('Master Draft');
      expect(project.drafts[0].isMain).toBe(true);
      expect(project.schemaVersion).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // 2. Consistent Application-Wide Design Language
  // -------------------------------------------------------------
  describe('Directive 2: Consistent Application-Wide Design Language', () => {
    it('renders ScreenplayElementMenu using design system dark surface tokens instead of light colors', () => {
      render(
        <ScreenplayElementMenu
          isOpen={true}
          activeType="action"
          onSelectType={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const menu = screen.getByRole('menu', { name: /Screenplay Elements/i });
      expect(menu).toHaveStyle({
        backgroundColor: 'var(--surface-overlay)',
        color: 'var(--text-primary)',
      });

      const actionItem = screen.getAllByRole('menuitem')[1];
      expect(actionItem).toHaveStyle({
        backgroundColor: 'var(--surface-selected)',
        color: 'var(--text-accent)',
      });
    });
  });

  // -------------------------------------------------------------
  // 3. Implement All Features Currently Marked "Coming in v1.1"
  // -------------------------------------------------------------
  describe('Directive 3: Implement All Features Currently Marked "Coming in v1.1"', () => {
    it('renders Highlight, Format Painter, Link, Layers, and Comments as active, fully-functional buttons', () => {
      const onHighlight = vi.fn();
      const onFormatPainter = vi.fn();
      const onLink = vi.fn();
      const onAddAnnotationLayer = vi.fn();
      const onComment = vi.fn();

      render(
        <FloatingToolbar
          activeBlock={{ id: 'b1', type: 'action', text: 'Some text' }}
          isTitleEditing={false}
          canUndo={true}
          canRedo={true}
          onUndo={vi.fn()}
          onRedo={vi.fn()}
          onApplyFormat={vi.fn()}
          onToggleCase={vi.fn()}
          onCopy={vi.fn()}
          onSelectBlockType={vi.fn()}
          onHighlight={onHighlight}
          onFormatPainter={onFormatPainter}
          isFormatPainterActive={false}
          onLink={onLink}
          onAddAnnotationLayer={onAddAnnotationLayer}
          onComment={onComment}
        />
      );

      // Verify no "Coming in V1.1" title exists in any button
      expect(screen.queryByTitle(/Coming in V1\.1/i)).not.toBeInTheDocument();

      // Highlight button
      const highlightBtn = screen.getByTitle('Highlight Selected Text');
      expect(highlightBtn).not.toBeDisabled();
      fireEvent.click(highlightBtn);
      expect(onHighlight).toHaveBeenCalledTimes(1);

      // Format Painter button
      const painterBtn = screen.getByTitle('Format Painter (Copy text formatting)');
      expect(painterBtn).not.toBeDisabled();
      fireEvent.click(painterBtn);
      expect(onFormatPainter).toHaveBeenCalledTimes(1);

      // Link button & popover
      const linkBtn = screen.getByTitle('Insert or Edit Link');
      expect(linkBtn).not.toBeDisabled();
      fireEvent.click(linkBtn);
      expect(screen.getByText('Insert Link')).toBeInTheDocument();

      const linkInput = screen.getByPlaceholderText(/https:\/\/example\.com or #scene/i);
      fireEvent.change(linkInput, { target: { value: 'https://akharstudio.app' } });
      const applyBtn = screen.getByText('Apply');
      fireEvent.click(applyBtn);
      expect(onLink).toHaveBeenCalledWith('https://akharstudio.app');

      // Layers button & popover
      const layerBtn = screen.getByTitle('Annotation & Revision Layer');
      expect(layerBtn).not.toBeDisabled();
      fireEvent.click(layerBtn);
      expect(screen.getByText('Layer Tag')).toBeInTheDocument();
      const directorNoteOption = screen.getByText('Director Note');
      fireEvent.click(directorNoteOption);
      expect(onAddAnnotationLayer).toHaveBeenCalledWith('Director Note');

      // Comment button & popover
      const commentBtn = screen.getByTitle('Script Notes & Comments');
      expect(commentBtn).not.toBeDisabled();
      fireEvent.click(commentBtn);
      expect(screen.getByText(/Script Note \/ ਟਿੱਪਣੀ/i)).toBeInTheDocument();
      const commentInput = screen.getByPlaceholderText(/Write a screenplay note/i);
      fireEvent.change(commentInput, { target: { value: 'Important scene note' } });
      const saveNoteBtn = screen.getByText('Save Note');
      fireEvent.click(saveNoteBtn);
      expect(onComment).toHaveBeenCalledWith('Important scene note');
    });
  });

  // -------------------------------------------------------------
  // 4. Preserve Selected Highlight Characters in PDF Exports
  // -------------------------------------------------------------
  describe('Directive 4: Preserve Selected Highlight Characters in PDF Exports', () => {
    it('generates HTML with .character-highlight spans for character cues and their dialogue/parenthetical lines', () => {
      const draft: ScriptDraft = {
        id: 'draft_hl',
        name: 'Master Draft',
        isMain: true,
        createdAt: '',
        modifiedAt: '',
        blocks: [
          { id: 'b1', type: 'scene_heading', text: 'INT. HAVELI - DAY' },
          { id: 'b2', type: 'character', text: 'ਗੁਰਮੀਤ ਸਿੰਘ' },
          { id: 'b3', type: 'dialogue', text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ।' },
          { id: 'b4', type: 'character', text: 'ਜਸਵੀਰ' },
          { id: 'b5', type: 'dialogue', text: 'ਕੀ ਹਾਲ ਹੈ?' },
        ],
      };

      const htmlWithHighlights = generateScreenplayHtml(
        draft,
        { title: 'Test Script', author: 'Arsh', basedOn: '', contact: '', rights: '' },
        {
          paperSize: 'letter',
          includeTitlePage: false,
          highlightCharacters: {
            enabled: true,
            color: 'rgba(234, 179, 8, 0.4)',
            selectedCharacters: ['ਗੁਰਮੀਤ ਸਿੰਘ'],
          },
          preserveCharacterHighlights: true,
        }
      );

      // Gurmeet Singh and dialogue must have character-highlight class
      expect(htmlWithHighlights).toContain('character-highlight');
      expect(htmlWithHighlights).toContain('ਗੁਰਮੀਤ ਸਿੰਘ');
      expect(htmlWithHighlights).toContain('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਜੀ।');
      // Jasveer is NOT highlighted
      expect(htmlWithHighlights).toContain('<div class="character" id="b4">ਜਸਵੀਰ</div>');
      expect(htmlWithHighlights).toContain('<div class="dialogue" id="b5">ਕੀ ਹਾਲ ਹੈ?</div>');
    });
  });

  // -------------------------------------------------------------
  // 5. Password-Protected PDF Export
  // -------------------------------------------------------------
  describe('Directive 5: Password-Protected PDF Export', () => {
    it('creates an encrypted PDF that fails without password and opens successfully with correct password', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([500, 700]);
      page.drawText('Confidential Screenplay Draft');
      pdfDoc.encrypt({
        userPassword: 'SecureScriptPassword123!',
        ownerPassword: 'SecureScriptPassword123!',
      });
      const encryptedBytes = await pdfDoc.save();

      // Opening without password must fail
      let threwWithoutPassword = false;
      try {
        await PDFDocument.load(encryptedBytes);
      } catch (err: any) {
        threwWithoutPassword = true;
        expect(err.message).toMatch(/encrypted/i);
      }
      expect(threwWithoutPassword).toBe(true);

      // Opening with correct password must succeed
      const decrypted = await PDFDocument.load(encryptedBytes, {
        password: 'SecureScriptPassword123!',
      });
      expect(decrypted.getPageCount()).toBe(1);
    });

    it('renders password protection controls in ExportModal and validates matching passwords', () => {
      const onExportPdf = vi.fn();
      const project = createDefaultProject();

      render(
        <ExportModal
          isOpen={true}
          onClose={vi.fn()}
          project={project}
          currentPaperSize="letter"
          totalPages={5}
          onExportPdf={onExportPdf}
          onExportText={vi.fn()}
          onExportFountain={vi.fn()}
          onExportNativeProject={vi.fn()}
        />
      );

      const passwordCheckbox = screen.getByLabelText(/Password-protect this PDF/i);
      expect(passwordCheckbox).toBeInTheDocument();
      expect(passwordCheckbox).not.toBeChecked();

      // Check the checkbox to enable password protection
      fireEvent.click(passwordCheckbox);
      expect(passwordCheckbox).toBeChecked();

      // Set password fields
      const passwordInput = screen.getByPlaceholderText('Enter password...');
      const confirmInput = screen.getByPlaceholderText('Confirm password...');

      fireEvent.change(passwordInput, { target: { value: 'ScriptPass' } });
      fireEvent.change(confirmInput, { target: { value: 'DifferentPass' } });

      // Passwords do not match -> Export button is disabled
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
      const exportBtn = screen.getByRole('button', { name: 'Export PDF' });
      expect(exportBtn).toBeDisabled();

      // Fix confirm password
      fireEvent.change(confirmInput, { target: { value: 'ScriptPass' } });
      expect(screen.queryByText('Passwords do not match.')).not.toBeInTheDocument();
      expect(exportBtn).not.toBeDisabled();

      fireEvent.click(exportBtn);
      expect(onExportPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'ScriptPass',
        })
      );
    });
  });

  // -------------------------------------------------------------
  // 6. Replace "Main Draft" with "Master Draft"
  // -------------------------------------------------------------
  describe('Directive 6: Terminology Consistency (Master Draft)', () => {
    it('names the initial default draft Master Draft', () => {
      const project = createDefaultProject();
      expect(project.drafts[0].name).toBe('Master Draft');
    });
  });

  // -------------------------------------------------------------
  // 7. Remove Legacy Application Name
  // -------------------------------------------------------------
  describe('Directive 7: Remove Legacy Application Name', () => {
    it('identifies the application as AkharStudio', async () => {
      const pkg = await import('../package.json');
      expect(pkg.name).toBe('akhar-studio');
      expect(pkg.build.productName).toBe('AkharStudio');
    });
  });

  // -------------------------------------------------------------
  // 8. Remove Non-Functional Notification Bell
  // -------------------------------------------------------------
  describe('Directive 8: Remove Non-Functional Notification Bell', () => {
    it('completely removes the notification bell from HeaderRow1', () => {
      render(
        <HeaderRow1
          title="My Script"
          onTitleChange={vi.fn()}
          saveStatus="clean"
          currentFilePath={null}
          projectSource="database"
          onOpenLibrary={vi.fn()}
          onOpenSearch={vi.fn()}
          onRetrySave={vi.fn()}
        />
      );

      // Notification bell icon and title should not exist
      expect(screen.queryByTitle(/Notifications/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Notifications/i)).not.toBeInTheDocument();
    });
  });
});
