/**
 * FloatingToolbar.tsx - Floating bottom-center toolbar (TOOL-01 P0, TOOL-02, TITLE-02)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React from 'react';
import {
  Undo2,
  Redo2,
  AlignLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Paintbrush,
  Link,
  Copy,
  Layers,
  MessageSquare,
  Clapperboard,
  Film,
  User,
  Quote,
  ArrowRight,
  Camera,
  Keyboard,
} from 'lucide-react';
import { ScreenplayBlock, ScreenplayBlockType } from '../../types/screenplay';

interface FloatingToolbarProps {
  activeBlock: ScreenplayBlock | null;
  isTitleEditing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onApplyFormat: (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => void;
  onToggleCase: () => void;
  onCopy: () => void;
  onSelectBlockType: (type: ScreenplayBlockType) => void;
  isKeyboardOpen?: boolean;
  onToggleKeyboard?: () => void;
  onKeepFocus?: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  activeBlock,
  isTitleEditing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApplyFormat,
  onToggleCase,
  onCopy,
  isKeyboardOpen = false,
  onToggleKeyboard,
  onKeepFocus,
}) => {
  const preventFocusLoss = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const getElementIcon = (type: ScreenplayBlockType) => {
    switch (type) {
      case 'scene_heading':
        return <Clapperboard size={14} />;
      case 'action':
        return <Film size={14} />;
      case 'character':
        return <User size={14} />;
      case 'parenthetical':
        return <span className="font-bold text-[11px]">( )</span>;
      case 'dialogue':
        return <Quote size={14} />;
      case 'transition':
        return <ArrowRight size={14} />;
      case 'shot':
        return <Camera size={14} />;
      default:
        return <Film size={14} />;
    }
  };

  const getElementLabel = (type: ScreenplayBlockType): string => {
    switch (type) {
      case 'scene_heading':
        return 'Scene';
      case 'action':
        return 'Action';
      case 'character':
        return 'Character';
      case 'parenthetical':
        return 'Parenthetical';
      case 'dialogue':
        return 'Dialogue';
      case 'transition':
        return 'Transition';
      case 'shot':
        return 'Shot';
      default:
        return 'Element';
    }
  };

  const currentType = activeBlock ? activeBlock.type : 'action';

  return (
    <div
      onMouseDown={preventFocusLoss}
      onPointerDown={preventFocusLoss}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-2 py-1 rounded-full flex items-center gap-0.5 select-none"
      style={{
        background: 'var(--surface-overlay)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        color: 'var(--text-primary)',
      }}
    >
      {/* 1. Undo */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onUndo();
          onKeepFocus?.();
        }}
        disabled={!canUndo}
        title="Undo (Cmd/Ctrl+Z)"
        className="ds-icon-btn"
      >
        <Undo2 size={15} />
      </button>

      {/* 2. Redo */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onRedo();
          onKeepFocus?.();
        }}
        disabled={!canRedo}
        title="Redo (Cmd/Ctrl+Shift+Z)"
        className="ds-icon-btn"
      >
        <Redo2 size={15} />
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '14px', background: 'var(--line-separator)', margin: '0 2px' }} />

      {/* 3. Current Element Icon (Disabled during title editing per TITLE-02) */}
      <div
        className={`flex items-center gap-1.5 px-2 rounded ${isTitleEditing ? 'opacity-30 cursor-not-allowed' : ''}`}
        style={{
          height: 'var(--h-sm)',
          background: isTitleEditing ? 'transparent' : 'var(--surface-control)',
          color: isTitleEditing ? 'var(--text-disabled)' : 'var(--text-accent)',
        }}
        title={
          isTitleEditing
            ? 'Element selector disabled in Title Card (TITLE-02)'
            : `Current Screenplay Element: ${getElementLabel(currentType)}`
        }
      >
        {getElementIcon(currentType)}
        <span className="font-semibold text-[11px] uppercase tracking-wider">
          {isTitleEditing ? 'Title' : getElementLabel(currentType)}
        </span>
      </div>

      {/* 4. Alignment / Indentation */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        disabled={isTitleEditing}
        title={
          isTitleEditing
            ? 'Alignment controls disabled in Title Card (TITLE-02)'
            : 'Screenplay Element Indentation'
        }
        className="ds-icon-btn"
      >
        <AlignLeft size={15} />
      </button>

      {/* 5. Bold */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onApplyFormat('bold');
          onKeepFocus?.();
        }}
        title="Bold (Cmd/Ctrl+B)"
        className="ds-icon-btn font-bold"
      >
        <Bold size={15} />
      </button>

      {/* 6. Italic */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onApplyFormat('italic');
          onKeepFocus?.();
        }}
        title="Italic (Cmd/Ctrl+I)"
        className="ds-icon-btn"
      >
        <Italic size={15} />
      </button>

      {/* 7. Underline */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onApplyFormat('underline');
          onKeepFocus?.();
        }}
        title="Underline (Cmd/Ctrl+U)"
        className="ds-icon-btn"
      >
        <Underline size={15} />
      </button>

      {/* 8. Strikethrough */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onApplyFormat('strikethrough');
          onKeepFocus?.();
        }}
        title="Strikethrough"
        className="ds-icon-btn"
      >
        <Strikethrough size={15} />
      </button>

      {/* 9. Aa Case Toggle */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onToggleCase();
          onKeepFocus?.();
        }}
        title="Toggle Case (Uppercase / Normal)"
        className="ds-icon-btn font-semibold text-xs"
        style={{ width: 'auto', padding: '0 6px' }}
      >
        Aa
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '14px', background: 'var(--line-separator)', margin: '0 2px' }} />

      {/* 10. Highlight (Honest disabled for P1) */}
      <button
        type="button"
        disabled
        title="Highlight (Coming in V1.1)"
        className="ds-icon-btn"
        aria-disabled="true"
      >
        <Highlighter size={15} />
      </button>

      {/* 11. Format Painter (Disabled for P1) */}
      <button
        type="button"
        disabled
        title="Format Painter (Coming in V1.1)"
        className="ds-icon-btn"
        aria-disabled="true"
      >
        <Paintbrush size={15} />
      </button>

      {/* 12. Link (Disabled for P1) */}
      <button
        type="button"
        disabled
        title="Link (Coming in V1.1)"
        className="ds-icon-btn"
        aria-disabled="true"
      >
        <Link size={15} />
      </button>

      {/* Punjabi Virtual Keyboard */}
      {onToggleKeyboard && (
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onPointerDown={preventFocusLoss}
          onClick={() => {
            onToggleKeyboard();
            onKeepFocus?.();
          }}
          title="Virtual Gurmukhi Keyboard / ਵਰਚੁਅਲ ਪੰਜਾਬੀ ਕੀਬੋਰਡ"
          className="ds-icon-btn"
          style={isKeyboardOpen ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' } : undefined}
        >
          <Keyboard size={15} />
        </button>
      )}

      {/* 13. Copy */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onCopy();
          onKeepFocus?.();
        }}
        title="Copy Selected Text (Cmd/Ctrl+C)"
        className="ds-icon-btn"
      >
        <Copy size={15} />
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '14px', background: 'var(--line-separator)', margin: '0 2px' }} />

      {/* 14. Add Layer (Disabled for P1) */}
      <button
        type="button"
        disabled
        title="Add Annotation Layer (Coming in V1.1)"
        className="ds-icon-btn"
        aria-disabled="true"
      >
        <Layers size={15} />
      </button>

      {/* 15. Comment (Disabled for P1) */}
      <button
        type="button"
        disabled
        title="Comment Thread (Coming in V1.1)"
        className="ds-icon-btn"
        aria-disabled="true"
      >
        <MessageSquare size={15} />
      </button>
    </div>
  );
};
