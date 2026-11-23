/**
 * ScreenplayElementMenu.tsx - Contextual Dropdown Menu for Screenplay Elements
 * Displays all 7 screenplay element types with icons, labels, and shortcuts (Cmd+1 to Cmd+7).
 * Anchored directly to the Floating Toolbar element button.
 */

import React, { useEffect, useRef } from 'react';
import { ScreenplayBlockType } from '../../types/screenplay';
import {
  SceneHeadingIcon,
  ActionIcon,
  CharacterIcon,
  ParentheticalIcon,
  DialogueIcon,
  ShotIcon,
  TransitionIcon,
} from './icons/ScreenplayElementIcons';

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
    icon: <SceneHeadingIcon size={15} />,
  },
  {
    type: 'action',
    label: 'Action',
    shortcutNumber: '2',
    icon: <ActionIcon size={15} />,
  },
  {
    type: 'character',
    label: 'Character',
    shortcutNumber: '3',
    icon: <CharacterIcon size={15} />,
  },
  {
    type: 'parenthetical',
    label: 'Parenthetical',
    shortcutNumber: '4',
    icon: <ParentheticalIcon size={15} />,
  },
  {
    type: 'dialogue',
    label: 'Dialogue',
    shortcutNumber: '5',
    icon: <DialogueIcon size={15} />,
  },
  {
    type: 'shot',
    label: 'Shot',
    shortcutNumber: '6',
    icon: <ShotIcon size={15} />,
  },
  {
    type: 'transition',
    label: 'Transition',
    shortcutNumber: '7',
    icon: <TransitionIcon size={15} />,
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
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 flex flex-col p-1.5 select-none transition-all animate-in fade-in slide-in-from-bottom-1 duration-150"
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
