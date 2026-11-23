/**
 * UndoRedoPill.tsx - Standalone bottom-left Undo/Redo pill
 * Styled to match the Words / Page StatusChip indicator on the bottom-right.
 */

import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';

export interface UndoRedoPillProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onKeepFocus?: () => void;
  isKeyboardOpen?: boolean;
  keyboardHeight?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const UndoRedoPill: React.FC<UndoRedoPillProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onKeepFocus,
  isKeyboardOpen: _isKeyboardOpen = false,
  keyboardHeight: _keyboardHeight,
  className = '',
  style,
}) => {
  const preventFocusLoss = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <div
      role="toolbar"
      aria-label="Undo and Redo"
      className={`undo-redo-pill select-none flex items-center justify-between ${className}`}
      style={{
        position: 'absolute',
        left: 'calc(var(--left-panel-width, 0px) + 21px)',
        bottom: '22px',
        width: '92px',
        height: '32px',
        borderRadius: '9999px',
        background: '#2a2a2a',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        border: 'none',
        padding: '0 6px',
        zIndex: 30,
        pointerEvents: 'auto',
        transition:
          'left 240ms cubic-bezier(0.16, 1, 0.3, 1), bottom var(--dur-slow) var(--ease)',
        ...style,
      }}
      onMouseDown={preventFocusLoss}
      onPointerDown={preventFocusLoss}
    >
      {/* Undo Button */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          if (canUndo) {
            onUndo();
            onKeepFocus?.();
          }
        }}
        disabled={!canUndo}
        title="Undo (Cmd/Ctrl+Z)"
        aria-label="Undo (Cmd/Ctrl+Z)"
        className="flex-1 h-full flex items-center justify-center rounded-full transition-colors"
        style={{
          border: 'none',
          background: 'transparent',
          color: canUndo ? 'var(--text-secondary)' : 'var(--text-disabled)',
          opacity: canUndo ? 1 : 0.4,
          cursor: canUndo ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => {
          if (canUndo) {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--surface-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (canUndo) {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <Undo2 size={16} />
      </button>

      {/* 1px Vertical Divider (inset 9px top and bottom: 32px - 18px = 14px) */}
      <div
        style={{
          width: '1px',
          height: '14px',
          backgroundColor: '#424242',
          flexShrink: 0,
        }}
        role="separator"
        aria-orientation="vertical"
      />

      {/* Redo Button */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          if (canRedo) {
            onRedo();
            onKeepFocus?.();
          }
        }}
        disabled={!canRedo}
        title="Redo (Cmd/Ctrl+Shift+Z)"
        aria-label="Redo (Cmd/Ctrl+Shift+Z)"
        className="flex-1 h-full flex items-center justify-center rounded-full transition-colors"
        style={{
          border: 'none',
          background: 'transparent',
          color: canRedo ? 'var(--text-secondary)' : 'var(--text-disabled)',
          opacity: canRedo ? 1 : 0.4,
          cursor: canRedo ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => {
          if (canRedo) {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--surface-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (canRedo) {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <Redo2 size={16} />
      </button>
    </div>
  );
};
