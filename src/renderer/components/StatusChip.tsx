/**
 * StatusChip.tsx - Bottom-right dark rounded chip (STAT-01, PAGE-03)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 * Displays word count and screenplay pagination with toggleable word count (Requirement 4).
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { ScreenplayStats } from '../../types/screenplay';

interface StatusChipProps {
  stats: ScreenplayStats;
  currentPage?: number;
  showWordCount?: boolean;
  onOpenHelp: () => void;
  isKeyboardOpen?: boolean;
  keyboardHeight?: number;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  stats,
  currentPage = 1,
  showWordCount = true,
  onOpenHelp,
  isKeyboardOpen = false,
  keyboardHeight,
}) => {
  return (
    <div
      className="fixed right-6 z-40 flex items-center gap-2.5 select-none"
      style={{
        bottom: isKeyboardOpen ? `${(keyboardHeight || 296) + 12}px` : '1.5rem',
        transition: 'bottom var(--dur-slow) var(--ease)',
        height: 'var(--h-lg)',
        padding: '0 var(--space-3)',
        borderRadius: '9999px',
        background: 'var(--surface-overlay)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        color: 'var(--text-secondary)',
        fontSize: 'var(--text-xs)',
      }}
    >
      {/* Unicode-aware word count (Requirement 4) */}
      {showWordCount && (
        <>
          <span className="font-mono">
            Words:{' '}
            <strong style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-semibold)' }}>
              {stats.wordCount.toLocaleString()}
            </strong>
            <span className="sr-only">words</span>
          </span>
          <div style={{ width: '1px', height: '12px', background: 'var(--line-separator)' }} />
        </>
      )}

      {/* Page counter */}
      <span className="font-mono">
        Page{' '}
        <strong style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-semibold)' }}>
          {currentPage}
        </strong>{' '}
        / {stats.pageCount}
      </span>

      <div style={{ width: '1px', height: '12px', background: 'var(--line-separator)' }} />

      {/* Circled ? help button */}
      <button
        type="button"
        onClick={onOpenHelp}
        title="Keyboard Shortcuts & Punjabi Typing Guide"
        className="ds-icon-btn"
        style={{ width: '20px', height: '20px' }}
      >
        <HelpCircle size={14} />
      </button>
    </div>
  );
};
