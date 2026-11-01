/**
 * ElementPicker.tsx - Contextual Horizontal Element Picker Pill (EDIT-04, EDIT-03)
 * Sequence: S, A, C, P, D, T, SH (Scene Heading, Action, Character, Parenthetical, Dialogue, Transition, Shot)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useEffect, useRef } from 'react';
import {
  Clapperboard,
  Film,
  User,
  Quote,
  ArrowRight,
  Camera,
} from 'lucide-react';
import { ScreenplayBlockType } from '../../types/screenplay';

interface ElementPickerOption {
  type: ScreenplayBlockType;
  label: string;
  badge: string;
  shortcut: string;
  icon: React.ReactNode;
}

export const ELEMENT_PICKER_OPTIONS: ElementPickerOption[] = [
  {
    type: 'scene_heading',
    label: 'Scene Heading',
    badge: 'S',
    shortcut: '1',
    icon: <Clapperboard size={14} />,
  },
  {
    type: 'action',
    label: 'Action',
    badge: 'A',
    shortcut: '2',
    icon: <Film size={14} />,
  },
  {
    type: 'character',
    label: 'Character',
    badge: 'C',
    shortcut: '3',
    icon: <User size={14} />,
  },
  {
    type: 'parenthetical',
    label: 'Parenthetical',
    badge: 'P',
    shortcut: '4',
    icon: <span className="font-bold text-xs">( )</span>,
  },
  {
    type: 'dialogue',
    label: 'Dialogue',
    badge: 'D',
    shortcut: '5',
    icon: <Quote size={14} />,
  },
  {
    type: 'shot',
    label: 'Shot',
    badge: 'SH',
    shortcut: '6',
    icon: <Camera size={14} />,
  },
  {
    type: 'transition',
    label: 'Transition',
    badge: 'T',
    shortcut: '7',
    icon: <ArrowRight size={14} />,
  },
];

interface ElementPickerProps {
  isOpen: boolean;
  activeType: ScreenplayBlockType;
  onSelectType: (type: ScreenplayBlockType) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

export const ElementPicker: React.FC<ElementPickerProps> = ({
  isOpen,
  activeType,
  onSelectType,
  onClose,
  position,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key >= '1' && e.key <= '7') {
        const option = ELEMENT_PICKER_OPTIONS[parseInt(e.key, 10) - 1];
        if (option) {
          onSelectType(option.type);
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSelectType, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: position ? 'fixed' : undefined,
        top: position?.top,
        left: position?.left,
        background: 'var(--surface-overlay)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        borderRadius: '9999px',
        padding: '3px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: 'var(--text-xs)',
        zIndex: 50,
        userSelect: 'none',
      }}
      className="animate-in fade-in zoom-in-95 duration-100"
    >
      {ELEMENT_PICKER_OPTIONS.map((opt) => {
        const isSelected = opt.type === activeType;
        return (
          <button
            key={opt.type}
            type="button"
            onClick={() => {
              onSelectType(opt.type);
              onClose();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all"
            style={{
              height: 'var(--h-md)',
              background: isSelected ? 'var(--surface-thumb)' : 'transparent',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: isSelected ? 'var(--weight-medium)' : 'var(--weight-regular)',
              boxShadow: isSelected ? 'var(--shadow-thumb)' : undefined,
              border: 0,
            }}
            title={`${opt.label} (Mod+${opt.shortcut})`}
          >
            {opt.icon}
            <span className="font-semibold">{opt.badge}</span>
            <span className="hidden sm:inline text-[11px] opacity-80">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
