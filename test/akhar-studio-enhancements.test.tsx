/**
 * akhar-studio-enhancements.test.tsx - Verification test suite for AkharStudio Enhancements:
 * 1. PDF Export Formatting (Bold Character Names & Scene Separators)
 * 2. About Section and Version Numbering (Centralized 1.0, Created By Arsh DSJ)
 * 3. Export Settings — Export Area (Entire Script, Selected Pages, Highlighted Text, Character Sheet)
 * 4. Word Count Setting (ON/OFF toggle, Unicode word counting, persistent setting)
 * 5. Highlight Characters Feature (Cue/dialogue/parenthetical highlighting, action exclusion, persistence)
 * @vitest-environment jsdom
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Core modules
import { APP_VERSION, APP_AUTHOR } from '../src/core/version';
import {
  generateScreenplayHtml,
  generateCharacterSheetHtml,
  extractCharacterSheetData,
} from '../src/core/export/pdfExporter';
import {
  calculateScreenplayStats,
  createDefaultProject,
} from '../src/core/model/ProjectModel';
import { ScriptDraft, TitleMetadata } from '../src/types/screenplay';

// UI Components
import { StatusChip } from '../src/renderer/components/StatusChip';
import { AboutModal } from '../src/renderer/components/AboutModal';
import { HelpShortcutsModal } from '../src/renderer/components/HelpShortcutsModal';
import { ExportModal } from '../src/renderer/components/ExportModal';
import {
  HighlightCharactersModal,
  HIGHLIGHT_COLORS,
} from '../src/renderer/components/HighlightCharactersModal';

describe('AkharStudio Enhancements Test Suite', () => {
  afterEach(() => {
    cleanup();
  });

  const sampleMetadata: TitleMetadata = {
    title: 'ਜੱਟ ਦਾ ਸੁਪਨਾ',
    author: 'ਅਰਸ਼ਦੀਪ',
    basedOn: 'ਅਸਲ ਕਹਾਣੀ',
    rights: 'ਸਾਰੇ ਹੱਕ ਰਾਖਵੇਂ ਹਨ',
    contact: 'contact@example.com',
  };

  const sampleDraft: ScriptDraft = {
    id: 'draft_enhancement_test',
    name: 'Master Draft',
    isMain: true,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    blocks: [
      {
        id: 'b1',
        type: 'scene_heading',
        text: 'EXT. PUNJAB FARM - MORNING',
      },
      {
        id: 'b2',
        type: 'action',
        text: 'GEJA walks into the lush mustard field looking at the tractor. The morning mist rises.',
      },
      {
        id: 'b3',
        type: 'character',
        text: 'GEJA',
      },
      {
        id: 'b4',
        type: 'parenthetical',
        text: '(smiling)',
      },
      {
        id: 'b5',
        type: 'dialogue',
        text: 'ਅੱਜ ਦਾ ਦਿਨ ਚੰਗਾ ਚੜ੍ਹਿਆ ਏ। ਲੱਗਦਾ ਕਣਕ ਦੀ ਵਾਢੀ ਵਧੀਆ ਰਹੇਗੀ।',
      },
      {
        id: 'b6',
        type: 'character',
        text: 'PRANJAL',
      },
      {
        id: 'b7',
        type: 'dialogue',
        text: 'Good morning! Have you seen the tractor keys?',
      },
      {
        id: 'b8',
        type: 'character',
        text: 'GEJA (CONT\'D)',
      },
      {
        id: 'b9',
        type: 'dialogue',
        text: 'ਹਾਂ, ਉਹ ਮੇਰੀ ਜੇਬ ਵਿੱਚ ਹੀ ਨੇ।',
      },
      {
        id: 'b10',
        type: 'scene_heading',
        text: 'INT. HAVELI - NIGHT',
      },
      {
        id: 'b11',
        type: 'character',
        text: 'BOY',
      },
      {
        id: 'b12',
        type: 'dialogue',
        text: 'ਬਾਪੂ ਜੀ, ਰੋਟੀ ਤਿਆਰ ਹੈ।',
      },
      {
        id: 'b13',
        type: 'character',
        text: 'RANO',
      },
      {
        id: 'b14',
        type: 'dialogue',
        text: 'ਛੇਤੀ ਆ ਜਾਓ ਸਾਰੇ।',
      },
    ],
  };

  // =========================================================================
  // 1. PDF EXPORT FORMATTING
  // =========================================================================
  describe('1. PDF Export Formatting (Bold Character Names & Scene Separators)', () => {
    it('ensures character dialogue cues appear in bold in exported PDF HTML', () => {
      const html = generateScreenplayHtml(sampleDraft, sampleMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      // Verify .character CSS class contains font-weight: bold
      expect(html).toContain('.character {');
      const characterCssMatch = html.match(/\.character\s*\{([^}]+)\}/);
      expect(characterCssMatch).not.toBeNull();
      const characterCss = characterCssMatch![1];
      expect(characterCss).toContain('font-weight: bold');

      // Verify character indentation and alignment is preserved
      expect(characterCss).toContain('margin-left: 2.2in');
      expect(characterCss).toContain('text-transform: uppercase');

      // Verify dialogue body does NOT have font-weight: bold
      const dialogueCssMatch = html.match(/\.dialogue\s*\{([^}]+)\}/);
      expect(dialogueCssMatch).not.toBeNull();
      expect(dialogueCssMatch![1]).not.toContain('font-weight: bold');
    });

    it('adds a subtle horizontal separator line immediately before every scene heading', () => {
      const html = generateScreenplayHtml(sampleDraft, sampleMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      // Verify .scene-heading has border-top separator styling
      const sceneHeadingCssMatch = html.match(/\.scene-heading\s*\{([^}]+)\}/);
      expect(sceneHeadingCssMatch).not.toBeNull();
      const sceneHeadingCss = sceneHeadingCssMatch![1];

      // Thin, understated light-grey line
      expect(sceneHeadingCss).toMatch(/border-top:\s*0\.5pt\s+solid/i);
      // Vertical spacing so line does not touch heading text
      expect(sceneHeadingCss).toContain('padding-top: 8pt');
      expect(sceneHeadingCss).toContain('margin-top: 18pt');
      // Non-orphaning guarantees
      expect(sceneHeadingCss).toContain('page-break-after: avoid');
      expect(sceneHeadingCss).toContain('page-break-inside: avoid');

      // Verify both scene headings in the sample draft are rendered with scene-heading class
      expect(html).toContain('<div class="scene-heading" id="b1">EXT. PUNJAB FARM - MORNING</div>');
      expect(html).toContain('<div class="scene-heading" id="b10">INT. HAVELI - NIGHT</div>');
    });
  });

  // =========================================================================
  // 2. ABOUT SECTION AND VERSION NUMBERING
  // =========================================================================
  describe('2. About Section & Version Numbering', () => {
    it('centralizes version as 1.4 and author as Arsh DSJ', () => {
      expect(APP_VERSION).toBe('1.4');
      expect(APP_AUTHOR).toBe('Arsh DSJ');
    });

    it('renders About modal displaying Version 1.4 and Created By Arsh DSJ', () => {
      const onClose = vi.fn();
      render(<AboutModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText(/About/i)).toBeInTheDocument();
      expect(screen.getByText(/Version 1\.4/i)).toBeInTheDocument();
      expect(screen.getByText(/Created By/i)).toBeInTheDocument();
      expect(screen.getByText('Arsh DSJ')).toBeInTheDocument();
    });

    it('renders About section in Help & Shortcuts modal displaying Version and Created By Arsh DSJ', () => {
      const onClose = vi.fn();
      render(<HelpShortcutsModal isOpen={true} onClose={onClose} />);

      expect(screen.getByText(APP_VERSION)).toBeInTheDocument();
      expect(screen.getByText('Arsh DSJ')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. EXPORT SETTINGS — EXPORT AREA
  // =========================================================================
  describe('3. Export Settings — Export Area', () => {
    const project = createDefaultProject();

    it('has Entire Script as the first and default export area option', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={vi.fn()}
          project={project}
          currentPaperSize="letter"
          totalPages={10}
          onExportPdf={vi.fn()}
          onExportText={vi.fn()}
          onExportFountain={vi.fn()}
          onExportNativeProject={vi.fn()}
        />
      );

      const select = screen.getByLabelText(/Export Area/i) as HTMLSelectElement;
      expect(select.value).toBe('entire_script');
      expect(select.options[0].text).toBe('Entire Script');
      expect(select.options[1].text).toBe('Selected Pages');
      expect(select.options[2].text).toBe('Highlighted Text');
      expect(select.options[3].text).toBe('Character Sheet');
    });

    it('validates Selected Pages and rejects invalid ranges', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={vi.fn()}
          project={project}
          currentPaperSize="letter"
          totalPages={10}
          onExportPdf={vi.fn()}
          onExportText={vi.fn()}
          onExportFountain={vi.fn()}
          onExportNativeProject={vi.fn()}
        />
      );

      const select = screen.getByLabelText(/Export Area/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'selected_pages' } });

      const fromInput = screen.getByLabelText(/From Page/i) as HTMLInputElement;
      const toInput = screen.getByLabelText(/To Page/i) as HTMLInputElement;
      const exportBtn = screen.getByRole('button', { name: /Export PDF/i });

      // Valid range 2 to 5
      fireEvent.change(fromInput, { target: { value: '2' } });
      fireEvent.change(toInput, { target: { value: '5' } });
      expect(exportBtn).not.toBeDisabled();

      // Invalid range: from > to (7 > 5)
      fireEvent.change(fromInput, { target: { value: '7' } });
      fireEvent.change(toInput, { target: { value: '5' } });
      expect(screen.getByText(/cannot be greater than ending page/i)).toBeInTheDocument();
      expect(exportBtn).toBeDisabled();

      // Invalid range: to > totalPages (12 > 10)
      fireEvent.change(fromInput, { target: { value: '1' } });
      fireEvent.change(toInput, { target: { value: '15' } });
      expect(screen.getByText(/cannot exceed total script pages/i)).toBeInTheDocument();
      expect(exportBtn).toBeDisabled();
    });

    it('displays prominent RED warning when Highlighted Text is selected without editor selection', () => {
      render(
        <ExportModal
          isOpen={true}
          onClose={vi.fn()}
          project={project}
          currentPaperSize="letter"
          totalPages={10}
          highlightedBlocks={null} // No selection
          onExportPdf={vi.fn()}
          onExportText={vi.fn()}
          onExportFountain={vi.fn()}
          onExportNativeProject={vi.fn()}
        />
      );

      const select = screen.getByLabelText(/Export Area/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'highlighted_text' } });

      const warning = screen.getByText(
        'No text selected! Please go back to the editor and select the text you want to export.'
      );
      expect(warning).toBeInTheDocument();

      const exportBtn = screen.getByRole('button', { name: /Export PDF/i });
      expect(exportBtn).toBeDisabled();
    });

    it('enables export when valid Highlighted Text exists', () => {
      const onExportPdf = vi.fn();
      render(
        <ExportModal
          isOpen={true}
          onClose={vi.fn()}
          project={project}
          currentPaperSize="letter"
          totalPages={10}
          highlightedBlocks={[sampleDraft.blocks[2], sampleDraft.blocks[4]]}
          onExportPdf={onExportPdf}
          onExportText={vi.fn()}
          onExportFountain={vi.fn()}
          onExportNativeProject={vi.fn()}
        />
      );

      const select = screen.getByLabelText(/Export Area/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'highlighted_text' } });

      const exportBtn = screen.getByRole('button', { name: /Export PDF/i });
      expect(exportBtn).not.toBeDisabled();
      fireEvent.click(exportBtn);

      expect(onExportPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          exportArea: 'highlighted_text',
          includeTitlePage: false,
          highlightedBlocks: expect.arrayContaining([
            expect.objectContaining({ text: 'GEJA' }),
          ]),
        })
      );
    });

    it('extracts unique characters in first-appearance order for Character Sheet', () => {
      const data = extractCharacterSheetData(sampleDraft);

      // Verify unique characters and first-appearance order
      expect(data.length).toBe(4);
      expect(data[0].name).toBe('GEJA');
      expect(data[1].name).toBe('PRANJAL');
      expect(data[2].name).toBe('BOY');
      expect(data[3].name).toBe('RANO');

      // GEJA spoke twice (GEJA + GEJA (CONT'D))
      expect(data[0].dialogueCount).toBe(2);
      expect(data[0].firstAppearanceScene).toBe('EXT. PUNJAB FARM - MORNING');
      expect(data[0].wordCount).toBeGreaterThan(0);

      // BOY first appearance
      expect(data[2].firstAppearanceScene).toBe('INT. HAVELI - NIGHT');
      expect(data[2].dialogueCount).toBe(1);

      // Verify HTML generation for character sheet
      const sheetHtml = generateCharacterSheetHtml(sampleDraft, sampleMetadata, {
        paperSize: 'letter',
        includeTitlePage: false,
      });

      expect(sheetHtml).toContain('Character Reference Sheet');
      expect(sheetHtml).toContain('GEJA');
      expect(sheetHtml).toContain('PRANJAL');
      expect(sheetHtml).toContain('BOY');
      expect(sheetHtml).toContain('RANO');
      expect(sheetHtml).toContain('EXT. PUNJAB FARM - MORNING');
    });
  });

  // =========================================================================
  // 4. WORD COUNT SETTING
  // =========================================================================
  describe('4. Word Count Setting', () => {
    it('correctly counts Unicode Gurmukhi and English words across screenplay', () => {
      const stats = calculateScreenplayStats(sampleDraft);
      expect(stats.wordCount).toBeGreaterThan(30);
      expect(stats.sceneCount).toBe(2);
    });

    it('displays word count and page count when showWordCount is true', () => {
      render(
        <StatusChip
          stats={{
            wordCount: 1245,
            pageCount: 12,
            characterCount: 6000,
            sceneCount: 3,
          }}
          currentPage={5}
          showWordCount={true}
          onOpenHelp={vi.fn()}
        />
      );

      expect(screen.getByText('1,245')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText((c) => c.includes('Page') && c.includes('12'))).toBeInTheDocument();
    });

    it('completely hides word count while preserving page count when showWordCount is false', () => {
      render(
        <StatusChip
          stats={{
            wordCount: 1245,
            pageCount: 12,
            characterCount: 6000,
            sceneCount: 3,
          }}
          currentPage={5}
          showWordCount={false}
          onOpenHelp={vi.fn()}
        />
      );

      expect(screen.queryByText('1,245')).not.toBeInTheDocument();
      expect(screen.queryByText(/Words:/i)).not.toBeInTheDocument();
      // Page count remains visible and intact
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText((c) => c.includes('Page') && c.includes('12'))).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. HIGHLIGHT CHARACTERS FEATURE
  // =========================================================================
  describe('5. Highlight Characters Feature', () => {
    it('renders detected characters from current screenplay with checkboxes', () => {
      const onSettingsChange = vi.fn();
      render(
        <HighlightCharactersModal
          isOpen={true}
          onClose={vi.fn()}
          detectedCharacters={['GEJA', 'PRANJAL', 'BOY', 'RANO']}
          settings={{
            enabled: true,
            color: 'rgba(167, 139, 250, 0.35)',
            selectedCharacters: ['GEJA'],
          }}
          onSettingsChange={onSettingsChange}
        />
      );

      expect(screen.getByText('Highlight characters')).toBeInTheDocument();
      expect(screen.getByText('GEJA')).toBeInTheDocument();
      expect(screen.getByText('PRANJAL')).toBeInTheDocument();
      expect(screen.getByText('BOY')).toBeInTheDocument();
      expect(screen.getByText('RANO')).toBeInTheDocument();

      // Selecting PRANJAL activates highlighting for PRANJAL
      fireEvent.click(screen.getByText('PRANJAL'));
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedCharacters: expect.arrayContaining(['GEJA', 'PRANJAL']),
        })
      );
    });

    it('supports Unselect All to clear all character selections', () => {
      const onSettingsChange = vi.fn();
      render(
        <HighlightCharactersModal
          isOpen={true}
          onClose={vi.fn()}
          detectedCharacters={['GEJA', 'PRANJAL']}
          settings={{
            enabled: true,
            color: 'rgba(167, 139, 250, 0.35)',
            selectedCharacters: ['GEJA', 'PRANJAL'],
          }}
          onSettingsChange={onSettingsChange}
        />
      );

      const unselectAllBtn = screen.getByRole('button', { name: /Unselect all/i });
      fireEvent.click(unselectAllBtn);

      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedCharacters: [],
        })
      );
    });

    it('allows choosing a highlight color from the palette', () => {
      const onSettingsChange = vi.fn();
      render(
        <HighlightCharactersModal
          isOpen={true}
          onClose={vi.fn()}
          detectedCharacters={['GEJA']}
          settings={{
            enabled: true,
            color: HIGHLIGHT_COLORS[0].color,
            selectedCharacters: ['GEJA'],
          }}
          onSettingsChange={onSettingsChange}
        />
      );

      const yellowBtn = screen.getByTitle('Yellow Highlight');
      fireEvent.click(yellowBtn);

      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          color: HIGHLIGHT_COLORS[1].color,
        })
      );
    });

    it('provides enable/disable toggle without destroying selected characters', () => {
      const onSettingsChange = vi.fn();
      render(
        <HighlightCharactersModal
          isOpen={true}
          onClose={vi.fn()}
          detectedCharacters={['GEJA']}
          settings={{
            enabled: true,
            color: 'rgba(167, 139, 250, 0.35)',
            selectedCharacters: ['GEJA'],
          }}
          onSettingsChange={onSettingsChange}
        />
      );

      const toggleCheckbox = screen.getByLabelText(/Toggle character highlighting/i);
      fireEvent.click(toggleCheckbox);

      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          selectedCharacters: ['GEJA'], // Kept intact
        })
      );
    });
  });
});
