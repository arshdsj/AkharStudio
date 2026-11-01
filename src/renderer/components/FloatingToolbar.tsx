/**
 * FloatingToolbar.tsx - Floating bottom-center toolbar (TOOL-01 P0, TOOL-02, TITLE-02)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState } from 'react';
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
import { ScreenplayElementMenu } from './ScreenplayElementMenu';

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
  onHighlight?: () => void;
  onFormatPainter?: () => void;
  isFormatPainterActive?: boolean;
  onLink?: (url: string) => void;
  onAddAnnotationLayer?: (layer: string) => void;
  onComment?: (comment: string) => void;
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
  onSelectBlockType,
  onHighlight,
  onFormatPainter,
  isFormatPainterActive = false,
  onLink,
  onAddAnnotationLayer,
  onComment,
  isKeyboardOpen = false,
  onToggleKeyboard,
  onKeepFocus,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

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

      {/* 3. Current Element Button & Contextual Popover (Disabled during title editing per TITLE-02) */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onPointerDown={preventFocusLoss}
          onClick={() => {
            if (!isTitleEditing) {
              setIsMenuOpen((prev) => !prev);
            }
          }}
          disabled={isTitleEditing}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className={`flex items-center gap-1.5 px-2 rounded transition-colors ${
            isTitleEditing ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
          }`}
          style={{
            height: 'var(--h-sm)',
            background: isTitleEditing
              ? 'transparent'
              : isMenuOpen
              ? 'var(--surface-selected)'
              : 'var(--surface-control)',
            color: isTitleEditing ? 'var(--text-disabled)' : 'var(--text-accent)',
            border: 0,
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
        </button>

        <ScreenplayElementMenu
          isOpen={isMenuOpen && !isTitleEditing}
          activeType={currentType}
          onSelectType={(newType) => {
            onSelectBlockType(newType);
            setIsMenuOpen(false);
          }}
          onClose={() => setIsMenuOpen(false)}
          onKeepFocus={onKeepFocus}
        />
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

      {/* 10. Highlight */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onHighlight?.();
          onKeepFocus?.();
        }}
        title="Highlight Selected Text"
        className="ds-icon-btn"
      >
        <Highlighter size={15} />
      </button>

      {/* 11. Format Painter */}
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          onFormatPainter?.();
          onKeepFocus?.();
        }}
        title={
          isFormatPainterActive
            ? 'Format Painter Active (Click or select text to paste format)'
            : 'Format Painter (Copy text formatting)'
        }
        className="ds-icon-btn"
        style={
          isFormatPainterActive
            ? { background: 'var(--accent-fill)', color: 'var(--text-on-accent)' }
            : undefined
        }
      >
        <Paintbrush size={15} />
      </button>

      {/* 12. Link */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onPointerDown={preventFocusLoss}
          onClick={() => {
            setIsLinkOpen((prev) => !prev);
            setIsLayersOpen(false);
            setIsCommentOpen(false);
          }}
          title="Insert or Edit Link"
          className="ds-icon-btn"
          style={isLinkOpen ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' } : undefined}
        >
          <Link size={15} />
        </button>

        {isLinkOpen && (
          <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-2.5 rounded-lg select-none shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in"
            style={{
              width: '240px',
              backgroundColor: 'var(--surface-overlay)',
              border: '1px solid var(--line-separator)',
              boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Insert Link</span>
            <input
              type="text"
              placeholder="https://example.com or #scene"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onLink?.(linkUrl);
                  setIsLinkOpen(false);
                  onKeepFocus?.();
                } else if (e.key === 'Escape') {
                  setIsLinkOpen(false);
                  onKeepFocus?.();
                }
              }}
              className="ds-input text-xs"
              autoFocus
            />
            <div className="flex justify-end gap-1.5 mt-1">
              <button
                type="button"
                className="ds-btn text-xs px-2 py-1"
                onClick={() => {
                  onLink?.('');
                  setIsLinkOpen(false);
                  onKeepFocus?.();
                }}
              >
                Remove
              </button>
              <button
                type="button"
                className="ds-btn ds-btn--primary text-xs px-2 py-1"
                onClick={() => {
                  onLink?.(linkUrl);
                  setIsLinkOpen(false);
                  onKeepFocus?.();
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

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

      {/* 14. Add Layer */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onPointerDown={preventFocusLoss}
          onClick={() => {
            setIsLayersOpen((prev) => !prev);
            setIsLinkOpen(false);
            setIsCommentOpen(false);
          }}
          title="Annotation & Revision Layer"
          className="ds-icon-btn"
          style={
            isLayersOpen || activeBlock?.annotationLayer
              ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' }
              : undefined
          }
        >
          <Layers size={15} />
        </button>

        {isLayersOpen && (
          <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-1.5 rounded-lg select-none shadow-2xl flex flex-col gap-0.5 z-50 animate-in fade-in"
            style={{
              width: '180px',
              backgroundColor: 'var(--surface-overlay)',
              border: '1px solid var(--line-separator)',
              boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1">Layer Tag</span>
            {['Director Note', 'VFX / Stunt', 'Sound / Music', 'Production', 'Polish / Revision'].map((layer) => (
              <button
                key={layer}
                type="button"
                className="ds-row text-xs px-2 py-1.5 rounded flex items-center justify-between text-left"
                style={activeBlock?.annotationLayer === layer ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' } : undefined}
                onClick={() => {
                  onAddAnnotationLayer?.(layer);
                  setIsLayersOpen(false);
                  onKeepFocus?.();
                }}
              >
                <span>{layer}</span>
              </button>
            ))}
            {activeBlock?.annotationLayer && (
              <button
                type="button"
                className="ds-row text-xs px-2 py-1 rounded text-red-400 hover:text-red-300 mt-0.5"
                onClick={() => {
                  onAddAnnotationLayer?.('');
                  setIsLayersOpen(false);
                  onKeepFocus?.();
                }}
              >
                Clear Layer
              </button>
            )}
          </div>
        )}
      </div>

      {/* 15. Comment */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={preventFocusLoss}
          onPointerDown={preventFocusLoss}
          onClick={() => {
            setCommentText(activeBlock?.comment || activeBlock?.notes || '');
            setIsCommentOpen((prev) => !prev);
            setIsLinkOpen(false);
            setIsLayersOpen(false);
          }}
          title="Script Notes & Comments"
          className="ds-icon-btn"
          style={
            isCommentOpen || activeBlock?.comment || activeBlock?.notes
              ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' }
              : undefined
          }
        >
          <MessageSquare size={15} />
        </button>

        {isCommentOpen && (
          <div
            className="absolute bottom-full mb-3 right-0 p-2.5 rounded-lg select-none shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in"
            style={{
              width: '260px',
              backgroundColor: 'var(--surface-overlay)',
              border: '1px solid var(--line-separator)',
              boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
              color: 'var(--text-primary)',
            }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Script Note / ਟਿੱਪਣੀ</span>
            <textarea
              rows={3}
              placeholder="Write a screenplay note or editorial feedback..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="ds-input text-xs resize-none p-2 h-auto"
              autoFocus
            />
            <div className="flex justify-between items-center mt-1">
              {activeBlock?.comment || activeBlock?.notes ? (
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() => {
                    onComment?.('');
                    setIsCommentOpen(false);
                    onKeepFocus?.();
                  }}
                >
                  Delete
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                className="ds-btn ds-btn--primary text-xs px-2.5 py-1"
                onClick={() => {
                  onComment?.(commentText);
                  setIsCommentOpen(false);
                  onKeepFocus?.();
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
