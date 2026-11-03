/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HeaderRow2 } from '../src/renderer/components/HeaderRow2';
import { LeftSidebar } from '../src/renderer/components/LeftSidebar';
import { AkharStudioLogo } from '../src/renderer/components/AkharStudioLogo';
import { SuggestionPopup } from '../src/renderer/components/SuggestionPopup';
import { TransliterationPopup } from '../src/renderer/components/TransliterationPopup';
import { ScriptDraft } from '../src/types/screenplay';
import fs from 'fs';
import path from 'path';

describe('UI and UX Refinements', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  const dummyDrafts: ScriptDraft[] = [
    {
      id: 'd1',
      name: 'Master Draft',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks: [
        { id: 'b1', type: 'scene_heading', text: 'INT. HAVELI - DAY' },
      ],
    },
    {
      id: 'd2',
      name: 'Version 2',
      isMain: false,
      createdAt: '',
      modifiedAt: '',
      blocks: [],
    },
  ];

  describe('1. Master Draft icon (Pencil)', () => {
    it('renders a pencil icon for Master Draft instead of sparkles', () => {
      render(
        <HeaderRow2
          drafts={dummyDrafts}
          activeDraftId="d1"
          onSelectDraft={vi.fn()}
          onCreateDraft={vi.fn()}
          paperSize="letter"
          onPaperSizeChange={vi.fn()}
          zoom={1}
          onZoomChange={vi.fn()}
          onOpenExport={vi.fn()}
          sidebarOpen={false}
          onToggleSidebar={vi.fn()}
        />
      );

      // Verify the Master Draft button contains lucide-pencil
      const masterDraftTabs = screen.getAllByText('Master Draft');
      const masterDraftTab = masterDraftTabs[0].closest('div');
      expect(masterDraftTab).toBeTruthy();

      const pencilSvg = masterDraftTab?.querySelector('.lucide-pencil');
      expect(pencilSvg).toBeInTheDocument();

      // Sparkles should NOT be present in Master Draft
      const sparklesSvg = masterDraftTab?.querySelector('.lucide-sparkles');
      expect(sparklesSvg).toBeNull();
    });
  });

  describe('2. Side panel toggle icon & animation', () => {
    it('shows PanelLeftOpen (arrow pointing right) when panel is closed', () => {
      render(
        <HeaderRow2
          drafts={dummyDrafts}
          activeDraftId="d1"
          onSelectDraft={vi.fn()}
          onCreateDraft={vi.fn()}
          paperSize="letter"
          onPaperSizeChange={vi.fn()}
          zoom={1}
          onZoomChange={vi.fn()}
          onOpenExport={vi.fn()}
          sidebarOpen={false}
          onToggleSidebar={vi.fn()}
        />
      );

      const toggleBtn = screen.getByLabelText('Expand Left Sidebar');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn.querySelector('.lucide-panel-left-open')).toBeInTheDocument();
      expect(toggleBtn.querySelector('.lucide-panel-left-close')).toBeNull();
    });

    it('shows PanelLeftClose (arrow pointing left) when panel is open', () => {
      render(
        <HeaderRow2
          drafts={dummyDrafts}
          activeDraftId="d1"
          onSelectDraft={vi.fn()}
          onCreateDraft={vi.fn()}
          paperSize="letter"
          onPaperSizeChange={vi.fn()}
          zoom={1}
          onZoomChange={vi.fn()}
          onOpenExport={vi.fn()}
          sidebarOpen={true}
          onToggleSidebar={vi.fn()}
        />
      );

      const toggleBtn = screen.getByLabelText('Collapse Left Sidebar');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn.querySelector('.lucide-panel-left-close')).toBeInTheDocument();
      expect(toggleBtn.querySelector('.lucide-panel-left-open')).toBeNull();
    });

    it('LeftSidebar has panel-container with animated collapse class when closed', () => {
      const { container } = render(
        <LeftSidebar
          isOpen={false}
          onClose={vi.fn()}
          inputMode="pa"
          onToggleInputMode={vi.fn()}
          paperSize="letter"
          onPaperSizeChange={vi.fn()}
          contdSetting="unasked"
          onContdSettingChange={vi.fn()}
          onOpenCustomDictionary={vi.fn()}
          onOpenHelp={vi.fn()}
          onOpenDiagnostics={vi.fn()}
          onOpenLibrary={vi.fn()}
          draft={dummyDrafts[0]}
        />
      );

      const panelContainer = container.querySelector('.ds-panel-container');
      expect(panelContainer).toBeInTheDocument();
      expect(panelContainer?.classList.contains('is-closed')).toBe(true);
      expect(panelContainer?.getAttribute('aria-hidden')).toBe('true');
    });

    it('LeftSidebar header toggle button contains PanelLeftClose (arrow pointing left)', () => {
      const { container } = render(
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
          onOpenHelp={vi.fn()}
          onOpenDiagnostics={vi.fn()}
          onOpenLibrary={vi.fn()}
          draft={dummyDrafts[0]}
        />
      );

      const collapseBtn = container.querySelector('.ds-panel__header button');
      expect(collapseBtn).toBeInTheDocument();
      expect(collapseBtn?.querySelector('.lucide-panel-left-close')).toBeInTheDocument();
    });
  });

  describe('3. Critical performance requirement (zero writing delays)', () => {
    it('SuggestionPopup does not contain animation transition classes', () => {
      render(
        <SuggestionPopup
          isOpen={true}
          items={[
            { id: '1', label: 'RAVI', value: 'RAVI' },
            { id: '2', label: 'SIMRAN', value: 'SIMRAN' },
          ]}
          selectedIndex={0}
          onSelect={vi.fn()}
          coords={{ top: 100, left: 100 }}
          onClose={vi.fn()}
          type="character"
        />
      );

      const popup = document.body.querySelector('.font-sans') as HTMLElement;
      expect(popup).toBeTruthy();
      expect(popup.className).not.toContain('animate-in');
      expect(popup.className).not.toContain('duration-100');
    });

    it('TransliterationPopup does not contain animation transition classes', () => {
      render(
        <TransliterationPopup
          isOpen={true}
          romanBuffer="ghar"
          candidates={['ਘਰ', 'ਘਾਰ']}
          selectedIndex={0}
          onSelectCandidate={vi.fn()}
          coords={{ top: 100, left: 100 }}
        />
      );

      const popup = screen.getByRole('listbox');
      expect(popup.className).not.toContain('animate-in');
      expect(popup.className).not.toContain('zoom-in');
    });
  });

  describe('4. Pro to Go text change', () => {
    it('AkharStudioLogo displays "Go" and not "Pro"', () => {
      render(<AkharStudioLogo />);
      expect(screen.getByText('Go')).toBeInTheDocument();
      expect(screen.queryByText('Pro')).toBeNull();
    });
  });

  describe('5. Application icon verification', () => {
    it('assets/icon.icns and assets/icon.png exist and have non-zero size', () => {
      const icnsPath = path.resolve(__dirname, '../assets/icon.icns');
      const pngPath = path.resolve(__dirname, '../assets/icon.png');
      expect(fs.existsSync(icnsPath)).toBe(true);
      expect(fs.existsSync(pngPath)).toBe(true);
      expect(fs.statSync(icnsPath).size).toBeGreaterThan(10000);
      expect(fs.statSync(pngPath).size).toBeGreaterThan(10000);
    });
  });
});
