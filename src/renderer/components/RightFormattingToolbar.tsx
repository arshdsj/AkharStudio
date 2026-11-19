/**
 * RightFormattingToolbar.tsx - Contextual Right-Side Formatting Toolbar
 * Adheres strictly to Akhar Studio's Design System (tokens.css, components.css, reference.html)
 * Positioned vertically along the right side of the screenplay workspace.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ScreenplayBlock, ScreenplayBlockType } from '../../types/screenplay';

export interface FormattingToolOption {
  type: ScreenplayBlockType;
  label: string;
  shortcutNumber: string;
  description: string;
  icon: React.ReactNode;
}

export const FORMATTING_TOOLBAR_OPTIONS: FormattingToolOption[] = [
  {
    type: 'scene_heading',
    label: 'Scene Heading',
    shortcutNumber: '1',
    description: 'Location and time of day (slugline). Applies to the selection or the line at your cursor.',
    icon: (
      <svg
        width="16"
        height="16"
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
    description: 'Scene description and character action. Applies to the selection or the line at your cursor.',
    icon: (
      <svg
        width="16"
        height="16"
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
    description: 'Character name speaking dialogue. Applies to the selection or the line at your cursor.',
    icon: (
      <svg
        width="16"
        height="16"
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
    description: 'Actor instruction or attitude. Applies to the selection or the line at your cursor.',
    icon: (
      <svg
        width="16"
        height="16"
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
    description: 'Spoken lines. Applies to the selection or the line at your cursor.',
    icon: (
      <svg
        width="16"
        height="16"
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
    description: 'Camera shot or angle. Applies to the selection or the line at your cursor.',
    icon: (
      <svg
        width="16"
        height="16"
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
    description: 'Scene transition or cut. Applies to the selection or the line at your cursor.',
    icon: (
      <svg
        width="16"
        height="16"
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

const STORAGE_KEY = 'akhar_format_toolbar_collapsed';

export interface RightFormattingToolbarProps {
  activeBlock: ScreenplayBlock | null;
  isTitleEditing: boolean;
  onSelectBlockType: (type: ScreenplayBlockType) => void;
  onKeepFocus?: () => void;
  defaultCollapsed?: boolean;
  onCollapseChange?: (isCollapsed: boolean) => void;
  className?: string;
}

export const RightFormattingToolbar: React.FC<RightFormattingToolbarProps> = ({
  activeBlock,
  isTitleEditing,
  onSelectBlockType,
  onKeepFocus,
  defaultCollapsed,
  onCollapseChange,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (defaultCollapsed !== undefined) return defaultCollapsed;
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          return saved === 'true';
        }
      } catch {
        // ignore localStorage read error
      }
    }
    return false;
  });

  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [focusedTool, setFocusedTool] = useState<string | null>(null);

  const toolButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);
  const expandButtonRef = useRef<HTMLButtonElement | null>(null);

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const cmdSymbol = isMac ? '⌘' : 'Ctrl';

  const activeTooltip = hoveredTool || focusedTool;

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      setHoveredTool(null);
      setFocusedTool(null);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
          // ignore localStorage write error
        }
      }
      onCollapseChange?.(next);
      return next;
    });
  }, [onCollapseChange]);

  // Clean tooltips when unmounting or collapsing
  useEffect(() => {
    if (isCollapsed) {
      setHoveredTool(null);
      setFocusedTool(null);
    }
  }, [isCollapsed]);

  // Prevent editor focus loss on mouse interaction
  const preventFocusLoss = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const currentType = activeBlock ? activeBlock.type : null;

  // Keyboard navigation across the vertical tools
  const handleKeyDownOnTool = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % FORMATTING_TOOLBAR_OPTIONS.length;
      toolButtonRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        collapseButtonRef.current?.focus();
      } else {
        const prevIndex = index - 1;
        toolButtonRefs.current[prevIndex]?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      toolButtonRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      toolButtonRefs.current[FORMATTING_TOOLBAR_OPTIONS.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setHoveredTool(null);
      setFocusedTool(null);
      onKeepFocus?.();
    }
  };

  const handleKeyDownOnCollapse = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      toolButtonRefs.current[0]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleToggleCollapse();
      onKeepFocus?.();
    }
  };

  // If collapsed, display the subtle centered expand toggle
  if (isCollapsed) {
    return (
      <div
        className={`ds-right-toolbar__toggle ${className}`}
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
      >
        <button
          ref={expandButtonRef}
          type="button"
          onClick={handleToggleCollapse}
          onMouseDown={preventFocusLoss}
          onPointerDown={preventFocusLoss}
          onMouseEnter={() => setHoveredTool('__expand')}
          onMouseLeave={() => setHoveredTool(null)}
          onFocus={() => setFocusedTool('__expand')}
          onBlur={() => setFocusedTool(null)}
          aria-label="Expand formatting toolbar"
          aria-expanded={false}
          className="w-full h-full flex items-center justify-center bg-transparent border-0 cursor-pointer text-inherit rounded"
        >
          <ChevronLeft size={16} />
        </button>

        {activeTooltip === '__expand' && (
          <div
            role="tooltip"
            className="ds-right-toolbar__tooltip--simple animate-in fade-in duration-100"
          >
            Expand formatting toolbar
          </div>
        )}
      </div>
    );
  }

  // Expanded complete vertical toolbar
  return (
    <div
      role="toolbar"
      aria-label="Screenplay Formatting"
      aria-orientation="vertical"
      className={`ds-right-toolbar ${className}`}
      onMouseDown={preventFocusLoss}
      onPointerDown={preventFocusLoss}
    >
      {/* 1. Collapse Toggle Button */}
      <div className="relative flex items-center justify-center">
        <button
          ref={collapseButtonRef}
          type="button"
          onClick={handleToggleCollapse}
          onKeyDown={handleKeyDownOnCollapse}
          onMouseDown={preventFocusLoss}
          onPointerDown={preventFocusLoss}
          onMouseEnter={() => setHoveredTool('__collapse')}
          onMouseLeave={() => setHoveredTool(null)}
          onFocus={() => setFocusedTool('__collapse')}
          onBlur={() => setFocusedTool(null)}
          aria-label="Collapse formatting toolbar"
          aria-expanded={true}
          className="ds-right-toolbar__collapse-btn"
        >
          <ChevronRight size={15} />
        </button>

        {activeTooltip === '__collapse' && (
          <div
            role="tooltip"
            className="ds-right-toolbar__tooltip--simple animate-in fade-in duration-100"
          >
            Collapse toolbar
          </div>
        )}
      </div>

      {/* 2. Format Header Label */}
      <span className="ds-right-toolbar__label" aria-hidden="true">
        FORMAT
      </span>

      {/* 3. Horizontal Separator */}
      <div className="ds-right-toolbar__separator" aria-hidden="true" />

      {/* 4. Screenplay Formatting Tool Buttons */}
      {FORMATTING_TOOLBAR_OPTIONS.map((opt, idx) => {
        const isSelected = !isTitleEditing && currentType === opt.type;
        const isHoveredOrFocused = activeTooltip === opt.type;

        return (
          <div key={opt.type} className="relative flex items-center justify-center">
            <button
              ref={(el) => {
                toolButtonRefs.current[idx] = el;
              }}
              type="button"
              role="button"
              aria-label={`${opt.label} (${cmdSymbol} ${opt.shortcutNumber})`}
              aria-pressed={isSelected}
              aria-disabled={isTitleEditing}
              disabled={isTitleEditing}
              data-tool-type={opt.type}
              data-active={isSelected ? 'true' : 'false'}
              onClick={() => {
                if (!isTitleEditing) {
                  onSelectBlockType(opt.type);
                  onKeepFocus?.();
                }
              }}
              onKeyDown={(e) => handleKeyDownOnTool(e, idx)}
              onMouseDown={preventFocusLoss}
              onPointerDown={preventFocusLoss}
              onMouseEnter={() => setHoveredTool(opt.type)}
              onMouseLeave={() => setHoveredTool(null)}
              onFocus={() => setFocusedTool(opt.type)}
              onBlur={() => setFocusedTool(null)}
              className={`ds-right-toolbar__item ${isSelected ? 'is-active' : ''}`}
            >
              {opt.icon}
            </button>

            {/* Contextual Left-Popping Tooltip Card */}
            {isHoveredOrFocused && (
              <div
                role="tooltip"
                id={`tooltip-${opt.type}`}
                className="ds-right-toolbar__tooltip animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="font-semibold text-[13px]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {opt.label}
                  </span>
                  <span
                    className="font-mono text-[11px] px-1.5 py-0.5 rounded tracking-tight shrink-0"
                    style={{
                      background: 'var(--surface-sunken)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--line-separator)',
                    }}
                  >
                    {cmdSymbol} {opt.shortcutNumber}
                  </span>
                </div>
                <p
                  className="text-[11px] leading-relaxed m-0"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {opt.description}
                  {isTitleEditing ? ' (Disabled in Title Card)' : ''}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
