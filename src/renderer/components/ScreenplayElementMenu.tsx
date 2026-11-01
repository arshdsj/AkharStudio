/**
 * ScreenplayElementMenu.tsx - Contextual Dropdown Menu for Screenplay Elements
 * Displays all 7 screenplay element types with icons, labels, and shortcuts (Cmd+1 to Cmd+7).
 * Anchored directly to the Floating Toolbar element button.
 */

import React, { useEffect, useRef } from 'react';
import { ScreenplayBlockType } from '../../types/screenplay';

export interface ScreenplayElementOption {
  type: ScreenplayBlockType;
  label: string;
  shortcutNumber: string;
  icon: React.ReactNode;
}

export const SCREENPLAY_ELEMENT_OPTIONS: ScreenplayElementOption[] = [
  {
    type: 'scene_heading',
    label: 'Scene Heading',
    shortcutNumber: '1',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H4c-.55 0-1-.45-1-1v-1.5l3.5-4.5 2.5 3 4.5-6L19 15.5V17c0 .55-.45 1-1 1z" />
        <circle cx="8" cy="8.5" r="1.5" />
      </svg>
    ),
  },
  {
    type: 'action',
    label: 'Action',
    shortcutNumber: '2',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z" />
      </svg>
    ),
  },
  {
    type: 'character',
    label: 'Character',
    shortcutNumber: '3',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
  {
    type: 'parenthetical',
    label: 'Parenthetical',
    shortcutNumber: '4',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="M8 4c-3 5-3 11 0 16" />
        <path d="M16 4c3 5 3 11 0 16" />
      </svg>
    ),
  },
  {
    type: 'dialogue',
    label: 'Dialogue',
    shortcutNumber: '5',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 11.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
      </svg>
    ),
  },
  {
    type: 'shot',
    label: 'Shot',
    shortcutNumber: '6',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="M4 6.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0zm6 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0zM3 11c0-.55.45-1 1-1h11c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v-8zm14 2.5l5-3.5v8l-5-3.5v-1z" />
      </svg>
    ),
  },
  {
    type: 'transition',
    label: 'Transition',
    shortcutNumber: '7',
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="shrink-0"
        aria-hidden="true"
      >
        <path d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 14H6c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1h4v12zm8-1c0 .55-.45 1-1 1h-5V6h5c.55 0 1 .45 1 1v10z" />
        <line x1="8" y1="21" x2="16" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface ScreenplayElementMenuProps {
  isOpen: boolean;
  activeType: ScreenplayBlockType;
  onSelectType: (type: ScreenplayBlockType) => void;
  onClose: () => void;
  onKeepFocus?: () => void;
}

export const ScreenplayElementMenu: React.FC<ScreenplayElementMenuProps> = ({
  isOpen,
  activeType,
  onSelectType,
  onClose,
  onKeepFocus,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const cmdSymbol = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        onKeepFocus?.();
      } else if (e.key >= '1' && e.key <= '7' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const option = SCREENPLAY_ELEMENT_OPTIONS[parseInt(e.key, 10) - 1];
        if (option) {
          e.preventDefault();
          onSelectType(option.type);
          onClose();
          onKeepFocus?.();
        }
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, onSelectType, onKeepFocus]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Screenplay Elements"
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.preventDefault()}
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 flex flex-col p-1.5 select-none transition-all"
      style={{
        width: '204px',
        backgroundColor: 'var(--surface-overlay)',
        border: '1px solid var(--line-separator)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)',
      }}
    >
      {SCREENPLAY_ELEMENT_OPTIONS.map((opt) => {
        const isSelected = opt.type === activeType;
        return (
          <button
            key={opt.type}
            type="button"
            role="menuitem"
            aria-selected={isSelected}
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              onSelectType(opt.type);
              onClose();
              onKeepFocus?.();
            }}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer group"
            style={{
              backgroundColor: isSelected ? 'var(--surface-selected)' : 'transparent',
              color: isSelected ? 'var(--text-accent)' : 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
          >
            {/* Left: Icon & Label */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                style={{
                  color: isSelected ? 'var(--text-accent)' : 'var(--text-secondary)',
                }}
              >
                {opt.icon}
              </span>
              <span
                className={`text-[13px] truncate ${
                  isSelected ? 'font-semibold' : 'font-normal'
                }`}
              >
                {opt.label}
              </span>
            </div>

            {/* Right: Shortcut badge */}
            <span
              className="text-[11px] font-mono tracking-tight shrink-0 ml-2"
              style={{
                color: isSelected ? 'var(--text-accent)' : 'var(--text-disabled)',
              }}
            >
              {cmdSymbol} {opt.shortcutNumber}
            </span>
          </button>
        );
      })}
    </div>
  );
};
