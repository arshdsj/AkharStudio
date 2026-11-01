/**
 * VirtualGurmukhiKeyboard.tsx - Offline On-Screen Punjabi Gurmukhi Keyboard
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import {
  KEYBOARD_ROWS,
  KeyDefinition,
  KeyOutput,
} from '../../core/editor/gurmukhiKeyboardMappings';

interface VirtualGurmukhiKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertOutput: (output: KeyOutput) => void;
  onInsertText?: (text: string) => void;
  onBackspace: () => void;
  onKeepFocus?: () => void;
  externalShift?: boolean;
  onShiftChange?: (isShift: boolean) => void;
  externalAltOrCtrl?: boolean;
  onAltOrCtrlChange?: (isAltOrCtrl: boolean) => void;
}

export const VirtualGurmukhiKeyboard: React.FC<VirtualGurmukhiKeyboardProps> = ({
  isOpen,
  onClose,
  onInsertOutput,
  onInsertText,
  onBackspace,
  onKeepFocus,
  externalShift,
  onShiftChange,
  externalAltOrCtrl,
  onAltOrCtrlChange,
}) => {
  const [internalShift, setInternalShift] = useState<boolean>(false);
  const isShift = externalShift !== undefined ? externalShift : internalShift;

  const [internalAltOrCtrl, setInternalAltOrCtrl] = useState<boolean>(false);
  const isAltOrCtrl = externalAltOrCtrl !== undefined ? externalAltOrCtrl : internalAltOrCtrl;

  const updateShift = useCallback(
    (newShift: boolean) => {
      setInternalShift(newShift);
      onShiftChange?.(newShift);
    },
    [onShiftChange]
  );

  const updateAltOrCtrl = useCallback(
    (newAltOrCtrl: boolean) => {
      setInternalAltOrCtrl(newAltOrCtrl);
      onAltOrCtrlChange?.(newAltOrCtrl);
    },
    [onAltOrCtrlChange]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Shift') {
        updateShift(true);
      }
      if (e.key === 'Alt' || e.key === 'Control') {
        updateAltOrCtrl(true);
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Shift') {
        updateShift(false);
      }
      if (e.key === 'Alt' || e.key === 'Control') {
        updateAltOrCtrl(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isOpen, updateShift, updateAltOrCtrl, onClose]);

  if (!isOpen) return null;

  const handlePreventFocusLoss = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const handleKeyClick = (keyDef: KeyDefinition) => {
    // 1. Functional Keys
    if (keyDef.code === 'Backspace') {
      onBackspace();
      onKeepFocus?.();
      return;
    }
    if (keyDef.code === 'ShiftLeft' || keyDef.code === 'ShiftRight') {
      updateShift(!isShift);
      onKeepFocus?.();
      return;
    }
    if (keyDef.code.startsWith('Control') || keyDef.code.startsWith('Alt')) {
      updateAltOrCtrl(!isAltOrCtrl);
      onKeepFocus?.();
      return;
    }
    if (keyDef.code === 'Escape') {
      onClose();
      return;
    }
    if (keyDef.code === 'Space') {
      if (onInsertOutput) {
        onInsertOutput(' ');
      } else if (onInsertText) {
        onInsertText(' ');
      }
      onKeepFocus?.();
      return;
    }
    if (keyDef.code === 'Tab' || keyDef.code === 'CapsLock' || keyDef.code === 'Enter') {
      onKeepFocus?.();
      return;
    }
    if (keyDef.code === 'Emoji') {
      onKeepFocus?.();
      return;
    }

    // 2. Output Keys (respects Alt/Ctrl additional characters if active)
    const output =
      isAltOrCtrl && keyDef.alt !== undefined
        ? keyDef.alt
        : isShift
        ? keyDef.shift
        : keyDef.normal;

    if (output) {
      if (onInsertOutput) {
        onInsertOutput(output);
      } else if (onInsertText) {
        onInsertText(typeof output === 'string' ? output : output.independent);
      }
      onKeepFocus?.();
    }
  };

  const renderKeyDisplay = (keyDef: KeyDefinition) => {
    // Functional keys
    if (keyDef.isSpecial) {
      if (keyDef.code === 'ShiftLeft' || keyDef.code === 'ShiftRight') {
        return (
          <span
            className="font-semibold text-xs tracking-wide transition-colors"
            style={{ color: isShift ? 'var(--green-800)' : 'var(--text-secondary)' }}
          >
            {keyDef.label}
          </span>
        );
      }
      if (keyDef.code.startsWith('Control') || keyDef.code.startsWith('Alt')) {
        return (
          <span
            className="font-semibold text-xs tracking-wide transition-colors"
            style={{ color: isAltOrCtrl ? 'var(--text-accent)' : 'var(--text-secondary)' }}
          >
            {keyDef.label}
          </span>
        );
      }
      return (
        <span className="font-medium text-xs" style={{ color: 'var(--text-secondary)' }}>
          {keyDef.label}
        </span>
      );
    }

    // Character keys: English top-left label + Gurmukhi character
    const isAltActiveKey = isAltOrCtrl && keyDef.alt !== undefined;
    let charDisplay: string = '';
    if (isAltActiveKey && keyDef.alt) {
      charDisplay =
        keyDef.displayAlt ||
        (typeof keyDef.alt === 'string' ? keyDef.alt : keyDef.alt.independent);
    } else if (isShift) {
      charDisplay =
        keyDef.displayShift ||
        (typeof keyDef.shift === 'string' ? keyDef.shift : keyDef.shift.independent);
    } else {
      charDisplay =
        keyDef.displayNormal ||
        (typeof keyDef.normal === 'string' ? keyDef.normal : keyDef.normal.independent);
    }

    const cornerLabel = isShift && keyDef.shiftLabel ? keyDef.shiftLabel : keyDef.label;

    return (
      <div className="w-full h-full relative flex items-center justify-center pointer-events-none">
        {/* Top-Left English Label */}
        <span
          className="absolute top-1 left-1.5 text-[10px] font-sans leading-none"
          style={{ color: 'var(--text-disabled)' }}
        >
          {cornerLabel}
        </span>

        {/* Gurmukhi Character */}
        <span
          className="font-medium leading-none transition-colors select-none gurmukhi"
          style={{
            fontSize: '16px',
            color: isAltActiveKey
              ? 'var(--text-accent)'
              : isShift
              ? 'var(--text-accent)'
              : 'var(--text-primary)',
          }}
        >
          {charDisplay}
        </span>
      </div>
    );
  };

  return (
    <div
      role="region"
      aria-label="Virtual Gurmukhi Keyboard"
      onMouseDown={handlePreventFocusLoss}
      onPointerDown={handlePreventFocusLoss}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 p-3 w-[780px] select-none animate-in fade-in zoom-in-95 duration-100"
      style={{
        background: 'var(--surface-overlay)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
      }}
    >
      {/* Keyboard Header */}
      <div
        onMouseDown={handlePreventFocusLoss}
        onPointerDown={handlePreventFocusLoss}
        className="flex items-center justify-between pb-2 mb-2.5 text-xs"
        style={{ boxShadow: 'inset 0 -1px 0 var(--line-separator)' }}
      >
        <div className="flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
          <span>Virtual Gurmukhi Keyboard (ਪੰਜਾਬੀ ਕੀਬੋਰਡ)</span>
          <span className="text-[11px] font-normal" style={{ color: 'var(--text-secondary)' }}>
            {isAltOrCtrl
              ? '• Additional Characters Active (Ctrl/Alt)'
              : isShift
              ? '• Shift Mode Active'
              : '• Normal Mode'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
            Ctrl/Alt: ਸ਼ ਗ਼ ਜ਼ ਖ਼ ਲ਼ ਫ਼ | Esc: Close
          </span>
          <button
            type="button"
            onMouseDown={handlePreventFocusLoss}
            onPointerDown={handlePreventFocusLoss}
            onClick={onClose}
            title="Close Virtual Keyboard (Esc)"
            className="ds-icon-btn"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 5-Row Physical Keyboard Layout */}
      <div
        onMouseDown={handlePreventFocusLoss}
        onPointerDown={handlePreventFocusLoss}
        className="space-y-1.5"
      >
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex gap-1.5 justify-between">
            {row.map((keyDef) => {
              const customWidth = keyDef.widthClass || 'flex-1 min-w-[40px]';
              const isShiftKey = keyDef.code === 'ShiftLeft' || keyDef.code === 'ShiftRight';
              const isModifierKey =
                keyDef.code.startsWith('Control') || keyDef.code.startsWith('Alt');
              const isAltActiveKey = isAltOrCtrl && keyDef.alt !== undefined;

              let keyBackground = 'var(--surface-control)';
              if (isShiftKey && isShift) {
                keyBackground = 'var(--surface-selected)';
              } else if (isModifierKey && isAltOrCtrl) {
                keyBackground = 'var(--surface-selected)';
              } else if (isAltActiveKey) {
                keyBackground = 'var(--surface-selected)';
              }

              return (
                <button
                  key={keyDef.code}
                  type="button"
                  onMouseDown={handlePreventFocusLoss}
                  onPointerDown={handlePreventFocusLoss}
                  onClick={() => handleKeyClick(keyDef)}
                  className={`h-10 transition-all active:scale-95 flex items-center justify-center ${customWidth}`}
                  style={{
                    background: keyBackground,
                    borderRadius: 'var(--radius-sm)',
                    border: 0,
                  }}
                >
                  {renderKeyDisplay(keyDef)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
