/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import React from 'react';
import { CreateVersionModal } from '../src/renderer/components/CreateVersionModal';
import { ExportModal } from '../src/renderer/components/ExportModal';
import { DiagnosticModal } from '../src/renderer/components/DiagnosticModal';
import { PasteConvertModal } from '../src/renderer/components/PasteConvertModal';
import { useModalTransition } from '../src/renderer/hooks/useModalTransition';
import { createDefaultProject } from '../src/core/model/ProjectModel';

const TransitionTestComponent: React.FC<{ isOpen: boolean; duration?: number }> = ({
  isOpen,
  duration = 180,
}) => {
  const { mounted, scrimClassName, isExiting } = useModalTransition(isOpen, duration);
  if (!mounted) return null;
  return (
    <div data-testid="scrim" className={scrimClassName} data-exiting={isExiting}>
      <div className="ds-dialog">Dialog Content</div>
    </div>
  );
};

describe('Modal opening transitions (Render Hook Integrity)', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens CreateVersionModal without React Hook order violations', () => {
    const { rerender } = render(
      <CreateVersionModal
        isOpen={false}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        nextVersionNumber={2}
        activeVersionName="Version 1"
      />
    );

    expect(screen.queryByText('Create New Version')).toBeNull();

    // Trigger open
    rerender(
      <CreateVersionModal
        isOpen={true}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        nextVersionNumber={2}
        activeVersionName="Version 1"
      />
    );

    expect(screen.getByText('Create New Version')).toBeInTheDocument();

    // Trigger close
    rerender(
      <CreateVersionModal
        isOpen={false}
        onClose={vi.fn()}
        onCreate={vi.fn()}
        nextVersionNumber={2}
        activeVersionName="Version 1"
      />
    );

    expect(screen.queryByText('Create New Version')).toBeNull();
  });

  it('opens ExportModal without React Hook order violations', () => {
    const project = createDefaultProject();
    const { rerender } = render(
      <ExportModal
        isOpen={false}
        onClose={vi.fn()}
        project={project}
        currentPaperSize="letter"
        totalPages={1}
        onExportPdf={vi.fn()}
        onExportText={vi.fn()}
        onExportFountain={vi.fn()}
        onExportNativeProject={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();

    // Trigger open
    rerender(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        project={project}
        currentPaperSize="letter"
        totalPages={1}
        onExportPdf={vi.fn()}
        onExportText={vi.fn()}
        onExportFountain={vi.fn()}
        onExportNativeProject={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Trigger close
    rerender(
      <ExportModal
        isOpen={false}
        onClose={vi.fn()}
        project={project}
        currentPaperSize="letter"
        totalPages={1}
        onExportPdf={vi.fn()}
        onExportText={vi.fn()}
        onExportFountain={vi.fn()}
        onExportNativeProject={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens DiagnosticModal without React Hook order violations', () => {
    const { rerender } = render(
      <DiagnosticModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();

    // Trigger open
    rerender(
      <DiagnosticModal
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Trigger close
    rerender(
      <DiagnosticModal
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens PasteConvertModal without React Hook order violations', () => {
    const { rerender } = render(
      <PasteConvertModal
        isOpen={false}
        onClose={vi.fn()}
        onInsert={vi.fn()}
        initialText=""
        hasSelection={false}
      />
    );

    expect(screen.queryByText(/Roman Punjabi to Gurmukhi/i)).toBeNull();

    // Trigger open
    rerender(
      <PasteConvertModal
        isOpen={true}
        onClose={vi.fn()}
        onInsert={vi.fn()}
        initialText=""
        hasSelection={false}
      />
    );

    expect(screen.getByText(/Roman Punjabi to Gurmukhi/i)).toBeInTheDocument();

    // Trigger close
    rerender(
      <PasteConvertModal
        isOpen={false}
        onClose={vi.fn()}
        onInsert={vi.fn()}
        initialText=""
        hasSelection={false}
      />
    );

    expect(screen.queryByText(/Roman Punjabi to Gurmukhi/i)).toBeNull();
  });

  describe('useModalTransition lifecycle & exit animation timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('mounts with ds-scrim and plays exit transition before unmounting when duration > 0', () => {
      // Temporarily bypass isTest override by passing custom duration and mocking NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const { rerender } = render(<TransitionTestComponent isOpen={false} duration={180} />);
        expect(screen.queryByTestId('scrim')).toBeNull();

        // Open
        rerender(<TransitionTestComponent isOpen={true} duration={180} />);
        const scrim = screen.getByTestId('scrim');
        expect(scrim).toBeInTheDocument();
        expect(scrim.className).toBe('ds-scrim');
        expect(scrim.getAttribute('data-exiting')).toBe('false');

        // Close: should enter is-exiting state immediately without unmounting
        rerender(<TransitionTestComponent isOpen={false} duration={180} />);
        expect(screen.getByTestId('scrim')).toBeInTheDocument();
        expect(screen.getByTestId('scrim').className).toBe('ds-scrim is-exiting');
        expect(screen.getByTestId('scrim').getAttribute('data-exiting')).toBe('true');

        // Advance 100ms: still exiting
        act(() => {
          vi.advanceTimersByTime(100);
        });
        expect(screen.getByTestId('scrim')).toBeInTheDocument();

        // Advance remaining 80ms: unmounts completely
        act(() => {
          vi.advanceTimersByTime(80);
        });
        expect(screen.queryByTestId('scrim')).toBeNull();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('cancels exit animation if modal is re-opened before timeout finishes', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const { rerender } = render(<TransitionTestComponent isOpen={true} duration={180} />);
        expect(screen.getByTestId('scrim')).toBeInTheDocument();

        // Close
        rerender(<TransitionTestComponent isOpen={false} duration={180} />);
        expect(screen.getByTestId('scrim').className).toBe('ds-scrim is-exiting');

        // Advance 100ms
        act(() => {
          vi.advanceTimersByTime(100);
        });

        // Re-open before 180ms
        rerender(<TransitionTestComponent isOpen={true} duration={180} />);
        expect(screen.getByTestId('scrim').className).toBe('ds-scrim');
        expect(screen.getByTestId('scrim').getAttribute('data-exiting')).toBe('false');

        // Advance past 180ms - it should NOT unmount
        act(() => {
          vi.advanceTimersByTime(200);
        });
        expect(screen.getByTestId('scrim')).toBeInTheDocument();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
