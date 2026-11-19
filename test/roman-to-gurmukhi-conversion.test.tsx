/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';

import { HeaderRow1 } from '../src/renderer/components/HeaderRow1';
import { LeftSidebar } from '../src/renderer/components/LeftSidebar';
import { PasteConvertModal } from '../src/renderer/components/PasteConvertModal';
import { convertRomanPunjabiToGurmukhi } from '../src/core/transliteration/textConverter';
import { defaultTransliterator } from '../src/core/transliteration/defaultEngine';
import { ScriptDraft } from '../src/types/screenplay';
import {
  ProseMirrorEditor,
  ProseMirrorEditorHandle,
} from '../src/renderer/components/ProseMirrorEditor';

describe('Roman to Gurmukhi Conversion & Top-Bar Button Removal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const dummyDraft: ScriptDraft = {
    id: 'draft-1',
    name: 'Draft 1',
    isMain: true,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    blocks: [
      { id: 'b1', type: 'scene_heading', text: 'ਅੰਦਰ. ਕਮਰਾ - ਦਿਨ' },
      { id: 'b2', type: 'action', text: 'ਰਣਜੀਤ ਚਾਹ ਪੀ ਰਿਹਾ ਹੈ।' },
    ],
  };

  // --------------------------------------------------------------------------
  // 1. Top-Bar (HeaderRow1): Removal of Redundant "Roman to Gurmukhi" Button
  // --------------------------------------------------------------------------
  describe('HeaderRow1 Top Bar', () => {
    it('does NOT render the Roman to Gurmukhi button in HeaderRow1', () => {
      render(
        <HeaderRow1
          title="ਮੇਰੀ ਸਕ੍ਰਿਪਟ"
          onTitleChange={vi.fn()}
          saveStatus="clean"
          currentFilePath="/scripts/test.scriptproject"
          onOpenLibrary={vi.fn()}
          onOpenSearch={vi.fn()}
          onRetrySave={vi.fn()}
        />
      );

      // Verify the button and label are absent from the top bar
      expect(screen.queryByText(/Roman to Gurmukhi/i)).toBeNull();
      expect(screen.queryByTitle(/Convert Roman Punjabi to Gurmukhi/i)).toBeNull();

      // Verify essential top-bar items remain intact and properly displayed
      expect(screen.getByRole('button', { name: /Projects/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Project Title/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('ਮੇਰੀ ਸਕ੍ਰਿਪਟ')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Left Sidebar: Retention & Invocation of Roman to Gurmukhi Option
  // --------------------------------------------------------------------------
  describe('LeftSidebar Writing Tools', () => {
    it('renders the Roman to Gurmukhi option in the sidebar and invokes it without arguments', () => {
      const onOpenRomanConverter = vi.fn();
      const onClose = vi.fn();

      render(
        <LeftSidebar
          isOpen={true}
          onClose={onClose}
          inputMode="pa"
          onToggleInputMode={vi.fn()}
          paperSize="letter"
          onPaperSizeChange={vi.fn()}
          contdSetting="unasked"
          onContdSettingChange={vi.fn()}
          onOpenCustomDictionary={vi.fn()}
          onOpenRomanConverter={onOpenRomanConverter}
          onOpenHelp={vi.fn()}
          onOpenDiagnostics={vi.fn()}
          onOpenLibrary={vi.fn()}
          draft={dummyDraft}
        />
      );

      // Find the sidebar row for Roman Punjabi to Gurmukhi
      const romanBtn = screen.getByText('Roman Punjabi to Gurmukhi');
      expect(romanBtn).toBeInTheDocument();

      // Clicking must close the sidebar and call onOpenRomanConverter with 0 arguments
      fireEvent.click(romanBtn.closest('button')!);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onOpenRomanConverter).toHaveBeenCalledTimes(1);
      expect(onOpenRomanConverter).toHaveBeenCalledWith(); // Clean call: no MouseEvent passed
    });
  });

  // --------------------------------------------------------------------------
  // 3. Root Cause Reproduction: I.trim is not a function failure scenario
  // --------------------------------------------------------------------------
  describe('PasteConvertModal Root Cause & Error Resilience', () => {
    it('does NOT crash when initialText is a MouseEvent or object (reproducing exact I.trim defect)', () => {
      // In the original defect, HeaderRow1 passed `onClick={onOpenRomanConverter}`,
      // which passed the React MouseEvent to `handleOpenRomanConverter`, causing
      // initialText to be an object. Then `initialText.trim()` threw:
      // "Application encountered an issue: I.trim is not a function".
      const syntheticEvent = new MouseEvent('click', { bubbles: true });

      expect(() => {
        render(
          <PasteConvertModal
            isOpen={true}
            onClose={vi.fn()}
            onInsert={vi.fn()}
            initialText={syntheticEvent as unknown as string}
            hasSelection={false}
          />
        );
      }).not.toThrow();

      // Ensure the modal mounted safely with empty input
      expect(screen.getByText('Roman Punjabi to Gurmukhi')).toBeInTheDocument();
      const input = screen.getByLabelText(/Roman Punjabi Input/i) as HTMLTextAreaElement;
      expect(input.value).toBe('');
    });

    it('handles empty, null, and undefined initialText gracefully', () => {
      const { rerender } = render(
        <PasteConvertModal
          isOpen={true}
          onClose={vi.fn()}
          onInsert={vi.fn()}
          initialText=""
          hasSelection={false}
        />
      );

      const input = screen.getByLabelText(/Roman Punjabi Input/i) as HTMLTextAreaElement;
      expect(input.value).toBe('');

      // Rerender with undefined
      rerender(
        <PasteConvertModal
          isOpen={true}
          onClose={vi.fn()}
          onInsert={vi.fn()}
          initialText={undefined}
          hasSelection={false}
        />
      );
      expect(input.value).toBe('');

      // Rerender with non-string numbers
      rerender(
        <PasteConvertModal
          isOpen={true}
          onClose={vi.fn()}
          onInsert={vi.fn()}
          initialText={42 as unknown as string}
          hasSelection={false}
        />
      );
      expect(input.value).toBe('');
    });

    it('automatically converts when provided valid initialText string', () => {
      render(
        <PasteConvertModal
          isOpen={true}
          onClose={vi.fn()}
          onInsert={vi.fn()}
          initialText="tusi kiddan ho?"
          hasSelection={false}
        />
      );

      const input = screen.getByLabelText(/Roman Punjabi Input/i) as HTMLTextAreaElement;
      expect(input.value).toBe('tusi kiddan ho?');

      const output = screen.getByLabelText(/Gurmukhi Output/i) as HTMLTextAreaElement;
      expect(output.value).toContain('ਕਿੱਦਾਂ');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Modal User Workflow: Typing, Converting, Editing, Suggestions, and Insertion
  // --------------------------------------------------------------------------
  describe('PasteConvertModal Conversion Workflow', () => {
    it('converts typed Roman Punjabi input and inserts into screenplay', () => {
      const onInsert = vi.fn();
      const onClose = vi.fn();

      render(
        <PasteConvertModal
          isOpen={true}
          onClose={onClose}
          onInsert={onInsert}
          initialText=""
          hasSelection={false}
        />
      );

      const input = screen.getByLabelText(/Roman Punjabi Input/i);
      const output = screen.getByLabelText(/Gurmukhi Output/i);
      const convertBtn = screen.getByRole('button', { name: /Convert/i });
      const insertBtn = screen.getByRole('button', { name: /Insert into Screenplay/i });

      // Before conversion, insert is disabled
      expect(insertBtn).toBeDisabled();

      // Type Roman Punjabi text
      fireEvent.change(input, { target: { value: 'mera naam jeet hai' } });

      // Click Convert
      fireEvent.click(convertBtn);

      // Verify Gurmukhi conversion
      expect((output as HTMLTextAreaElement).value).toContain('ਮੇਰਾ');
      expect((output as HTMLTextAreaElement).value).toContain('ਨਾਮ');
      expect(insertBtn).not.toBeDisabled();

      // Click Insert into Screenplay
      fireEvent.click(insertBtn);

      expect(onInsert).toHaveBeenCalledTimes(1);
      expect(onInsert).toHaveBeenCalledWith(expect.stringContaining('ਮੇਰਾ'), 'cursor');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('supports selecting "Replace Entire Screenplay" insertion mode', () => {
      const onInsert = vi.fn();
      const onClose = vi.fn();

      render(
        <PasteConvertModal
          isOpen={true}
          onClose={onClose}
          onInsert={onInsert}
          initialText="vadiya kam kita"
          hasSelection={false}
        />
      );

      // Select Replace Entire Screenplay radio
      const replaceAllRadio = screen.getByLabelText(/Replace Entire Screenplay/i);
      fireEvent.click(replaceAllRadio);

      const insertBtn = screen.getByRole('button', { name: /Insert into Screenplay/i });
      fireEvent.click(insertBtn);

      expect(onInsert).toHaveBeenCalledTimes(1);
      expect(onInsert).toHaveBeenCalledWith(expect.any(String), 'replace-all');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('allows manual editing of Gurmukhi preview before inserting', () => {
      const onInsert = vi.fn();
      const onClose = vi.fn();

      render(
        <PasteConvertModal
          isOpen={true}
          onClose={onClose}
          onInsert={onInsert}
          initialText="tusi kiddan ho"
          hasSelection={false}
        />
      );

      const output = screen.getByLabelText(/Gurmukhi Output/i);
      fireEvent.change(output, { target: { value: 'ਮੈਨੂਅਲ ਸੁਧਾਰ' } });

      const insertBtn = screen.getByRole('button', { name: /Insert into Screenplay/i });
      fireEvent.click(insertBtn);

      expect(onInsert).toHaveBeenCalledWith('ਮੈਨੂਅਲ ਸੁਧਾਰ', 'cursor');
    });

    it('closes without inserting when Cancel is clicked', () => {
      const onInsert = vi.fn();
      const onClose = vi.fn();

      render(
        <PasteConvertModal
          isOpen={true}
          onClose={onClose}
          onInsert={onInsert}
          initialText="tusi kiddan ho"
          hasSelection={false}
        />
      );

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      expect(onInsert).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Core Engine Hardening: textConverter and GurmukhiTransliterator
  // --------------------------------------------------------------------------
  describe('Core Transliteration Engine Robustness', () => {
    it('safely handles all non-string and malformed inputs to convertRomanPunjabiToGurmukhi', () => {
      expect(convertRomanPunjabiToGurmukhi(null as unknown as string)).toEqual({
        convertedText: '',
        tokens: [],
        uncertainCount: 0,
      });
      expect(convertRomanPunjabiToGurmukhi(undefined as unknown as string)).toEqual({
        convertedText: '',
        tokens: [],
        uncertainCount: 0,
      });
      expect(convertRomanPunjabiToGurmukhi({ some: 'object' } as unknown as string)).toEqual({
        convertedText: '',
        tokens: [],
        uncertainCount: 0,
      });
      expect(convertRomanPunjabiToGurmukhi(['array'] as unknown as string)).toEqual({
        convertedText: '',
        tokens: [],
        uncertainCount: 0,
      });
    });

    it('safely handles non-string inputs to defaultTransliterator.suggestWithDetails', () => {
      expect(defaultTransliterator.suggestWithDetails(null as unknown as string)).toEqual({
        candidates: [],
        rawCandidatesCount: 0,
        details: [],
      });
      expect(defaultTransliterator.suggestWithDetails(undefined as unknown as string)).toEqual({
        candidates: [],
        rawCandidatesCount: 0,
        details: [],
      });
      expect(defaultTransliterator.suggestWithDetails({} as unknown as string)).toEqual({
        candidates: [],
        rawCandidatesCount: 0,
        details: [],
      });
    });
  });

  // --------------------------------------------------------------------------
  // 6. Editor State & Document Updates: insertConvertedText
  // --------------------------------------------------------------------------
  describe('Editor Integration: insertConvertedText', () => {
    it('inserts converted Gurmukhi text into the editor at cursor without destroying remaining blocks', () => {
      let currentDraft = { ...dummyDraft };
      const onDraftChange = vi.fn((newDraft: ScriptDraft) => {
        currentDraft = newDraft;
      });

      const ref = React.createRef<ProseMirrorEditorHandle>();

      render(
        <ProseMirrorEditor
          ref={ref}
          draft={currentDraft}
          onDraftChange={onDraftChange}
          contdSetting="none"
          inputMode="pa"
          onTriggerContdPrompt={vi.fn()}
          onActiveBlockChange={vi.fn()}
        />
      );

      expect(ref.current).toBeDefined();

      // Insert converted Gurmukhi text at cursor
      act(() => {
        ref.current?.insertConvertedText('ਇਹ ਨਵਾਂ ਵਾਕ ਹੈ।', 'cursor');
      });

      // Confirm onDraftChange was called with the inserted text
      expect(onDraftChange).toHaveBeenCalled();
      const updatedDraft = onDraftChange.mock.calls[onDraftChange.mock.calls.length - 1][0];

      // Block 2 or content should still retain original script elements
      const allText = updatedDraft.blocks.map((b: any) => b.text).join(' ');
      expect(allText).toContain('ਇਹ ਨਵਾਂ ਵਾਕ ਹੈ।');
      expect(allText).toContain('ਅੰਦਰ. ਕਮਰਾ - ਦਿਨ');
    });

    it('replaces all screenplay blocks when mode is replace-all', () => {
      let currentDraft = { ...dummyDraft };
      const onDraftChange = vi.fn((newDraft: ScriptDraft) => {
        currentDraft = newDraft;
      });

      const ref = React.createRef<ProseMirrorEditorHandle>();

      render(
        <ProseMirrorEditor
          ref={ref}
          draft={currentDraft}
          onDraftChange={onDraftChange}
          contdSetting="none"
          inputMode="pa"
          onTriggerContdPrompt={vi.fn()}
          onActiveBlockChange={vi.fn()}
        />
      );

      act(() => {
        ref.current?.insertConvertedText('ਲਾਈਨ ਇਕ\nਲਾਈਨ ਦੋ', 'replace-all');
      });

      expect(onDraftChange).toHaveBeenCalled();
      const updatedDraft = onDraftChange.mock.calls[onDraftChange.mock.calls.length - 1][0];

      expect(updatedDraft.blocks.length).toBe(2);
      expect(updatedDraft.blocks[0].text).toBe('ਲਾਈਨ ਇਕ');
      expect(updatedDraft.blocks[1].text).toBe('ਲਾਈਨ ਦੋ');
    });
  });
});
