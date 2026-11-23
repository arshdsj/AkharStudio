/**
 * LeftFormattingToolbar.tsx - Vertical Left Formatting Toolbar
 * Matches the styling and dimensions of the Right Formatting Toolbar.
 * Contains 13 icon controls in 3 groups separated by horizontal dividers.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  AlignLeft,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Paintbrush,
  Link,
  Keyboard,
  Copy,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { ScreenplayBlock } from '../../types/screenplay';

export interface LeftFormattingToolbarProps {
  activeBlock: ScreenplayBlock | null;
  isTitleEditing: boolean;
  onApplyFormat: (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => void;
  onToggleCase: () => void;
  onCopy: () => void;
  onHighlight?: () => void;
  onFormatPainter?: () => void;
  isFormatPainterActive?: boolean;
  onLink?: (url: string) => void;
  onAddAnnotationLayer?: (layer: string) => void;
  onComment?: (comment: string) => void;
  isKeyboardOpen?: boolean;
  onToggleKeyboard?: () => void;
  onKeepFocus?: () => void;
  activeFormats?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  };
  className?: string;
  style?: React.CSSProperties;
}

export const LeftFormattingToolbar: React.FC<LeftFormattingToolbarProps> = ({
  activeBlock,
  isTitleEditing,
  onApplyFormat,
  onToggleCase,
  onCopy,
  onHighlight,
  onFormatPainter,
  isFormatPainterActive = false,
  onLink,
  onAddAnnotationLayer,
  onComment,
  isKeyboardOpen = false,
  onToggleKeyboard,
  onKeepFocus,
  activeFormats,
  className = '',
  style,
}) => {
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  // Refs for anchoring popovers immediately to the right of the triggering button
  const linkBtnRef = useRef<HTMLButtonElement | null>(null);
  const layersBtnRef = useRef<HTMLButtonElement | null>(null);
  const commentBtnRef = useRef<HTMLButtonElement | null>(null);

  const [linkAnchorRect, setLinkAnchorRect] = useState<DOMRect | null>(null);
  const [layersAnchorRect, setLayersAnchorRect] = useState<DOMRect | null>(null);
  const [commentAnchorRect, setCommentAnchorRect] = useState<DOMRect | null>(null);

  const preventFocusLoss = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const closeAllPopovers = () => {
    setIsLinkOpen(false);
    setIsLayersOpen(false);
    setIsCommentOpen(false);
  };

  // Close popovers on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isLinkOpen || isLayersOpen || isCommentOpen)) {
        closeAllPopovers();
        onKeepFocus?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLinkOpen, isLayersOpen, isCommentOpen, onKeepFocus]);

  return (
    <>
      <nav
        role="toolbar"
        aria-label="Text Formatting"
        className={`left-formatting-toolbar ds-palette flex flex-col items-center select-none ${className}`}
        style={{
          position: 'absolute',
          left: 'calc(var(--left-panel-width, 0px) + 13px)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          borderRadius: '9px',
          background: '#232323',
          border: '1px solid #2e2e2e',
          boxShadow: 'var(--shadow-palette), inset 0 1px 0 var(--line-edge)',
          padding: '20px 4px',
          boxSizing: 'border-box',
          maxHeight: 'calc(100% - 32px)',
          overflowY: 'auto',
          overflowX: 'visible',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          zIndex: 30,
          pointerEvents: 'auto',
          transition: 'left 240ms cubic-bezier(0.16, 1, 0.3, 1)',
          ...style,
        }}
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
      >
        {/* GROUP 1: Align, Bold, Italic, Underline, Strikethrough, Font (Aa) */}
        <div className="flex flex-col items-center gap-[2px] w-full">
          {/* 1. Align */}
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
            aria-label="Screenplay Element Indentation"
            className="ds-tool"
          >
            <AlignLeft size={17} />
          </button>

          {/* 2. Bold */}
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              onApplyFormat('bold');
              onKeepFocus?.();
            }}
            aria-pressed={activeFormats?.bold}
            title="Bold (Cmd/Ctrl+B)"
            aria-label="Bold (Cmd/Ctrl+B)"
            className={`ds-tool font-bold ${activeFormats?.bold ? 'is-active' : ''}`}
          >
            <Bold size={17} />
          </button>

          {/* 3. Italic */}
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              onApplyFormat('italic');
              onKeepFocus?.();
            }}
            aria-pressed={activeFormats?.italic}
            title="Italic (Cmd/Ctrl+I)"
            aria-label="Italic (Cmd/Ctrl+I)"
            className={`ds-tool ${activeFormats?.italic ? 'is-active' : ''}`}
          >
            <Italic size={17} />
          </button>

          {/* 4. Underline */}
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              onApplyFormat('underline');
              onKeepFocus?.();
            }}
            aria-pressed={activeFormats?.underline}
            title="Underline (Cmd/Ctrl+U)"
            aria-label="Underline (Cmd/Ctrl+U)"
            className={`ds-tool ${activeFormats?.underline ? 'is-active' : ''}`}
          >
            <Underline size={17} />
          </button>

          {/* 5. Strikethrough */}
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              onApplyFormat('strikethrough');
              onKeepFocus?.();
            }}
            aria-pressed={activeFormats?.strikethrough}
            title="Strikethrough"
            aria-label="Strikethrough"
            className={`ds-tool ${activeFormats?.strikethrough ? 'is-active' : ''}`}
          >
            <Strikethrough size={17} />
          </button>

          {/* 6. Font (Aa) */}
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              onToggleCase();
              onKeepFocus?.();
            }}
            title="Toggle Case (Uppercase / Normal)"
            aria-label="Toggle Case (Uppercase / Normal)"
            className="ds-tool font-semibold text-[13px]"
          >
            Aa
          </button>
        </div>

        {/* Group Divider 1: ~14px vertical space, 1px horizontal line, #3a3a3a, inset 11px */}
        <div
          className="w-full flex items-center justify-center my-[7px]"
          style={{ height: '1px' }}
          role="separator"
        >
          <div
            style={{
              width: 'calc(100% - 22px)',
              height: '1px',
              backgroundColor: '#3a3a3a',
            }}
          />
        </div>

        {/* GROUP 2: Highlight, Brush, Link, Keyboard, Copy */}
        <div className="flex flex-col items-center gap-[2px] w-full">
          {/* 7. Highlight */}
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              onHighlight?.();
              onKeepFocus?.();
            }}
            title="Highlight Selected Text"
            aria-label="Highlight Selected Text"
            className="ds-tool"
          >
            <Highlighter size={17} />
          </button>

          {/* 8. Brush / Format Painter */}
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              onFormatPainter?.();
              onKeepFocus?.();
            }}
            aria-pressed={isFormatPainterActive}
            title={
              isFormatPainterActive
                ? 'Format Painter Active (Click or select text to paste format)'
                : 'Format Painter (Copy text formatting)'
            }
            aria-label="Format Painter"
            className={`ds-tool ${isFormatPainterActive ? 'is-active' : ''}`}
          >
            <Paintbrush size={17} />
          </button>

          {/* 9. Link */}
          <button
            ref={linkBtnRef}
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              if (linkBtnRef.current) {
                setLinkAnchorRect(linkBtnRef.current.getBoundingClientRect());
              }
              setIsLinkOpen((prev) => !prev);
              setIsLayersOpen(false);
              setIsCommentOpen(false);
            }}
            aria-expanded={isLinkOpen}
            aria-haspopup="dialog"
            title="Insert or Edit Link"
            aria-label="Insert or Edit Link"
            className={`ds-tool ${isLinkOpen ? 'is-active' : ''}`}
          >
            <Link size={17} />
          </button>

          {/* 10. Keyboard */}
          {onToggleKeyboard && (
            <button
              type="button"
              onMouseDown={preventFocusLoss}
              onPointerDown={preventFocusLoss}
              onClick={() => {
                onToggleKeyboard();
                onKeepFocus?.();
              }}
              aria-pressed={isKeyboardOpen}
              title="Virtual Gurmukhi Keyboard / ਵਰਚੁਅਲ ਪੰਜਾਬੀ ਕੀਬੋਰਡ"
              aria-label="Virtual Gurmukhi Keyboard"
              className={`ds-tool ${isKeyboardOpen ? 'is-active' : ''}`}
            >
              <Keyboard size={17} />
            </button>
          )}

          {/* 11. Copy */}
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              onCopy();
              onKeepFocus?.();
            }}
            title="Copy Selected Text (Cmd/Ctrl+C)"
            aria-label="Copy Selected Text (Cmd/Ctrl+C)"
            className="ds-tool"
          >
            <Copy size={17} />
          </button>
        </div>

        {/* Group Divider 2: ~14px vertical space, 1px horizontal line, #3a3a3a, inset 11px */}
        <div
          className="w-full flex items-center justify-center my-[7px]"
          style={{ height: '1px' }}
          role="separator"
        >
          <div
            style={{
              width: 'calc(100% - 22px)',
              height: '1px',
              backgroundColor: '#3a3a3a',
            }}
          />
        </div>

        {/* GROUP 3: Layers, Comment */}
        <div className="flex flex-col items-center gap-[2px] w-full">
          {/* 12. Layers */}
          <button
            ref={layersBtnRef}
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              if (layersBtnRef.current) {
                setLayersAnchorRect(layersBtnRef.current.getBoundingClientRect());
              }
              setIsLayersOpen((prev) => !prev);
              setIsLinkOpen(false);
              setIsCommentOpen(false);
            }}
            aria-expanded={isLayersOpen}
            aria-haspopup="dialog"
            title="Annotation & Revision Layer"
            aria-label="Annotation & Revision Layer"
            className={`ds-tool ${
              isLayersOpen || Boolean(activeBlock?.annotationLayer) ? 'is-active' : ''
            }`}
          >
            <Layers size={17} />
          </button>

          {/* 13. Comment */}
          <button
            ref={commentBtnRef}
            type="button"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
            onClick={() => {
              if (commentBtnRef.current) {
                setCommentAnchorRect(commentBtnRef.current.getBoundingClientRect());
              }
              setCommentText(activeBlock?.comment || activeBlock?.notes || '');
              setIsCommentOpen((prev) => !prev);
              setIsLinkOpen(false);
              setIsLayersOpen(false);
            }}
            aria-expanded={isCommentOpen}
            aria-haspopup="dialog"
            title="Script Notes & Comments"
            aria-label="Script Notes & Comments"
            className={`ds-tool ${
              isCommentOpen || Boolean(activeBlock?.comment || activeBlock?.notes)
                ? 'is-active'
                : ''
            }`}
          >
            <MessageSquare size={17} />
          </button>
        </div>
      </nav>

      {/* Popovers: opened immediately to the right of the strip, vertically aligned */}
      {/* 1. Link Popover */}
      {isLinkOpen && linkAnchorRect && (
        <div
          role="dialog"
          aria-label="Insert Link Dialog"
          className="fixed p-2.5 rounded-lg select-none shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in"
          style={{
            left: `${linkAnchorRect.right + 12}px`,
            top: `${Math.max(16, Math.min(linkAnchorRect.top - 20, window.innerHeight - 180))}px`,
            width: '240px',
            backgroundColor: 'var(--surface-overlay)',
            border: '1px solid var(--line-separator)',
            boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
            color: 'var(--text-primary)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Insert Link
          </span>
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

      {/* 2. Layers Popover */}
      {isLayersOpen && layersAnchorRect && (
        <div
          role="dialog"
          aria-label="Annotation Layer Dialog"
          className="fixed p-1.5 rounded-lg select-none shadow-2xl flex flex-col gap-0.5 z-50 animate-in fade-in"
          style={{
            left: `${layersAnchorRect.right + 12}px`,
            top: `${Math.max(16, Math.min(layersAnchorRect.top - 40, window.innerHeight - 260))}px`,
            width: '180px',
            backgroundColor: 'var(--surface-overlay)',
            border: '1px solid var(--line-separator)',
            boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
            color: 'var(--text-primary)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-2 py-1">
            Layer Tag
          </span>
          {[
            'Director Note',
            'VFX / Stunt',
            'Sound / Music',
            'Production',
            'Polish / Revision',
          ].map((layer) => (
            <button
              key={layer}
              type="button"
              className="ds-row text-xs px-2 py-1.5 rounded flex items-center justify-between text-left"
              style={
                activeBlock?.annotationLayer === layer
                  ? { background: 'var(--surface-selected)', color: 'var(--text-accent)' }
                  : undefined
              }
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

      {/* 3. Comment Popover */}
      {isCommentOpen && commentAnchorRect && (
        <div
          role="dialog"
          aria-label="Script Note Dialog"
          className="fixed p-2.5 rounded-lg select-none shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in"
          style={{
            left: `${commentAnchorRect.right + 12}px`,
            top: `${Math.max(16, Math.min(commentAnchorRect.top - 80, window.innerHeight - 220))}px`,
            width: '260px',
            backgroundColor: 'var(--surface-overlay)',
            border: '1px solid var(--line-separator)',
            boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
            color: 'var(--text-primary)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Script Note / ਟਿੱਪਣੀ
          </span>
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
    </>
  );
};
