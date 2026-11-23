/**
 * RightFormattingToolbar.tsx - Claude's Element Rail Redesign
 * Adheres strictly to Akhar Studio Design System and the Claude Redesign Specification.
 *
 * Visual & Interaction Highlights:
 * - .ds-palette surface (--surface-panel, 8px concentric radius, --shadow-palette, 1px inner edge highlight)
 * - .ds-tool buttons (32x32px, 16px outline icons, 1.5px stroke, round caps/joins)
 * - Three semantic groups separated by 12px spacing, no divider lines
 * - Separate collapse button at bottom (quiet control)
 * - Active state: --surface-selected tint + --text-accent icon (no solid accent square)
 * - Mixed selection: clears active state; collapsed chip shows mixed icon
 * - Compact progressive tooltip (one-line name + shortcut, 900ms description hold, smart neighbour timing)
 * - Directional collapse (140ms pop-out) and expand (160ms pop-in)
 * - Radiogroup semantics with roving tabindex and keyboard navigation
 * - Preserves editor focus and selection (preventDefault on pointerdown/mousedown)
 * - Responsive auto-collapse when desk margin < 72px without overwriting manual preferences
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ScreenplayBlock, ScreenplayBlockType } from '../../types/screenplay';
import {
  SceneHeadingIcon,
  ActionIcon,
  CharacterIcon,
  ParentheticalIcon,
  DialogueIcon,
  ShotIcon,
  TransitionIcon,
  MixedElementIcon,
  RailChevronRightIcon,
  getScreenplayElementIcon,
} from './icons/ScreenplayElementIcons';

export interface FormattingToolOption {
  type: ScreenplayBlockType;
  label: string;
  shortcutNumber: string;
  shortcut: string;
  description: string;
  icon: React.ReactNode;
}

export const FORMATTING_TOOLBAR_OPTIONS: FormattingToolOption[] = [
  {
    type: 'scene_heading',
    label: 'Scene Heading',
    shortcutNumber: '1',
    shortcut: 'Mod+1',
    description: 'Where and when the scene takes place.',
    icon: <SceneHeadingIcon />,
  },
  {
    type: 'action',
    label: 'Action',
    shortcutNumber: '2',
    shortcut: 'Mod+2',
    description: 'Scene description and character action. Applies to the selection or the line at your cursor.',
    icon: <ActionIcon />,
  },
  {
    type: 'character',
    label: 'Character',
    shortcutNumber: '3',
    shortcut: 'Mod+3',
    description: 'Who is speaking.',
    icon: <CharacterIcon />,
  },
  {
    type: 'parenthetical',
    label: 'Parenthetical',
    shortcutNumber: '4',
    shortcut: 'Mod+4',
    description: 'How a line is delivered.',
    icon: <ParentheticalIcon />,
  },
  {
    type: 'dialogue',
    label: 'Dialogue',
    shortcutNumber: '5',
    shortcut: 'Mod+5',
    description: 'What the character says.',
    icon: <DialogueIcon />,
  },
  {
    type: 'shot',
    label: 'Shot',
    shortcutNumber: '6',
    shortcut: 'Mod+6',
    description: 'Camera or shot direction.',
    icon: <ShotIcon />,
  },
  {
    type: 'transition',
    label: 'Transition',
    shortcutNumber: '7',
    shortcut: 'Mod+7',
    description: 'How one scene moves to the next.',
    icon: <TransitionIcon />,
  },
];

const STORAGE_KEY = 'akhar_format_toolbar_collapsed';
const ALT_STORAGE_KEY = 'scriptEditor.railCollapsed';

export interface RightFormattingToolbarProps {
  activeBlock: ScreenplayBlock | null;
  activeBlockType?: ScreenplayBlockType | null;
  isMixedSelection?: boolean;
  isTitleEditing: boolean;
  onSelectBlockType: (type: ScreenplayBlockType) => void;
  onKeepFocus?: () => void;
  defaultCollapsed?: boolean;
  onCollapseChange?: (isCollapsed: boolean) => void;
  className?: string;
}

interface TooltipState {
  visible: boolean;
  isDetail: boolean;
  label: string;
  shortcut?: string;
  description?: string;
  x: number;
  y: number;
}

export const RightFormattingToolbar: React.FC<RightFormattingToolbarProps> = ({
  activeBlock,
  activeBlockType,
  isMixedSelection = false,
  isTitleEditing,
  onSelectBlockType,
  onKeepFocus,
  defaultCollapsed,
  onCollapseChange,
  className = '',
}) => {
  // Determine if running on macOS for shortcut display
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return true;
    return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  }, []);

  const formatShortcut = useCallback(
    (sc: string) => (sc ? sc.replace('Mod+', isMac ? '⌘' : 'Ctrl+') : ''),
    [isMac]
  );

  // User's manual preference from localStorage
  const [userCollapsed, setUserCollapsed] = useState<boolean>(() => {
    if (defaultCollapsed !== undefined) return defaultCollapsed;
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(ALT_STORAGE_KEY);
        if (saved !== null) {
          return saved === 'true' || saved === '1';
        }
      } catch {
        // Storage access blocked or unavailable
      }
    }
    return false;
  });

  // Responsive automatic collapse (desk margin < 72px)
  const [isAutoCollapsed, setIsAutoCollapsed] = useState<boolean>(false);
  const [animatingState, setAnimatingState] = useState<'open' | 'closing'>('open');

  // Effective collapse state
  const isCollapsed = userCollapsed || isAutoCollapsed;

  // Active element type (null when mixed selection or title editing)
  const effectiveActiveType: ScreenplayBlockType | null = useMemo(() => {
    if (isTitleEditing || isMixedSelection) return null;
    if (activeBlockType !== undefined) return activeBlockType;
    return activeBlock ? activeBlock.type : null;
  }, [isTitleEditing, isMixedSelection, activeBlockType, activeBlock]);

  // Roving tabindex: which item in the radio group has tabindex=0
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Sync focused index to current active type if changed
  useEffect(() => {
    if (effectiveActiveType) {
      const idx = FORMATTING_TOOLBAR_OPTIONS.findIndex((opt) => opt.type === effectiveActiveType);
      if (idx !== -1) {
        setFocusedIndex(idx);
      }
    }
  }, [effectiveActiveType]);

  // Tooltip tracking
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const lastHiddenTimeRef = useRef<number>(0);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const collapseBtnRef = useRef<HTMLButtonElement | null>(null);
  const chipBtnRef = useRef<HTMLButtonElement | null>(null);

  // Clear timers helper
  const clearTooltipTimers = useCallback(() => {
    if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    if (detailTimerRef.current) clearTimeout(detailTimerRef.current);
    tipTimerRef.current = null;
    detailTimerRef.current = null;
  }, []);

  const hideTooltip = useCallback(() => {
    clearTooltipTimers();
    setTooltip((prev) => {
      if (prev?.visible) {
        lastHiddenTimeRef.current = Date.now();
      }
      return null;
    });
  }, [clearTooltipTimers]);

  const showTooltip = useCallback(
    (
      el: HTMLElement,
      label: string,
      shortcut?: string,
      description?: string,
      immediate: boolean = false
    ) => {
      clearTooltipTimers();
      const isNeighbourInstant = Date.now() - lastHiddenTimeRef.current < 300;
      const delay = immediate || isNeighbourInstant ? 0 : 400;

      tipTimerRef.current = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        // Position immediately to the left of the button with an 8px gap
        const x = Math.max(8, rect.left - 8);
        // Anchor top to button's top edge (both compact tooltip row and button are 32px, ensuring perfect vertical alignment)
        const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
        const y = Math.max(8, Math.min(rect.top, winHeight - 100));

        setTooltip({
          visible: true,
          isDetail: false,
          label,
          shortcut,
          description,
          x,
          y,
        });
      }, delay);

      if (description) {
        detailTimerRef.current = setTimeout(() => {
          setTooltip((curr) => (curr && curr.visible ? { ...curr, isDetail: true } : null));
        }, 900);
      }
    },
    [clearTooltipTimers]
  );

  // Clean tooltips on unmount or collapse
  useEffect(() => {
    return () => clearTooltipTimers();
  }, [clearTooltipTimers]);

  // Responsive layout check: desk margin beside screenplay page < 72px
  useEffect(() => {
    const handleCheckSpace = () => {
      try {
        const pageEl = document.querySelector('.screenplay-paper');
        const deskEl = pageEl?.closest('.flex-1') || pageEl?.parentElement;
        if (pageEl && deskEl) {
          const pageRect = pageEl.getBoundingClientRect();
          const deskRect = deskEl.getBoundingClientRect();
          const rightMargin = deskRect.right - pageRect.right;
          if (rightMargin < 72 && rightMargin > 0) {
            setIsAutoCollapsed(true);
          } else if (rightMargin >= 72) {
            setIsAutoCollapsed(false);
          }
        } else if (typeof window !== 'undefined') {
          // Fallback based on typical script desk width threshold (816px + 2*72px)
          if (window.innerWidth < 980) {
            setIsAutoCollapsed(true);
          } else {
            setIsAutoCollapsed(false);
          }
        }
      } catch {
        // Ignore measurement errors
      }
    };

    handleCheckSpace();
    window.addEventListener('resize', handleCheckSpace, { passive: true });
    return () => window.removeEventListener('resize', handleCheckSpace);
  }, []);

  // Prevent editor focus loss on mouse/pointer interaction
  const preventFocusLoss = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  // Collapse handler
  const handleCollapse = useCallback(
    (fromKeyboard: boolean = false) => {
      hideTooltip();
      setAnimatingState('closing');

      const isReduced =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
          : false;
      const duration = isReduced ? 0 : 140;

      setTimeout(() => {
        setUserCollapsed(true);
        setAnimatingState('open');
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
          localStorage.setItem(ALT_STORAGE_KEY, '1');
        } catch {
          // ignore storage error
        }
        onCollapseChange?.(true);

        if (fromKeyboard) {
          setTimeout(() => chipBtnRef.current?.focus(), 20);
        }
      }, duration);
    },
    [hideTooltip, onCollapseChange]
  );

  // Expand handler
  const handleExpand = useCallback(
    (fromKeyboard: boolean = false) => {
      hideTooltip();
      setUserCollapsed(false);
      setIsAutoCollapsed(false);
      setAnimatingState('open');

      try {
        localStorage.setItem(STORAGE_KEY, 'false');
        localStorage.setItem(ALT_STORAGE_KEY, '0');
      } catch {
        // ignore storage error
      }
      onCollapseChange?.(false);

      if (fromKeyboard) {
        setTimeout(() => {
          radioRefs.current[focusedIndex]?.focus();
        }, 20);
      }
    },
    [hideTooltip, focusedIndex, onCollapseChange]
  );

  // Keyboard navigation within the radio group
  const handleKeyDownOnRadio = (e: React.KeyboardEvent, index: number) => {
    const count = FORMATTING_TOOLBAR_OPTIONS.length;
    let nextIndex = -1;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % count;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + count) % count;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = count - 1;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isTitleEditing) {
        onSelectBlockType(FORMATTING_TOOLBAR_OPTIONS[index].type);
        onKeepFocus?.();
      }
      return;
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hideTooltip();
      onKeepFocus?.();
      return;
    }

    if (nextIndex >= 0) {
      setFocusedIndex(nextIndex);
      radioRefs.current[nextIndex]?.focus();
      // Show tooltip immediately on keyboard focus
      const opt = FORMATTING_TOOLBAR_OPTIONS[nextIndex];
      const el = radioRefs.current[nextIndex];
      if (el) {
        showTooltip(el, opt.label, formatShortcut(opt.shortcut), opt.description, true);
      }
    }
  };

  const handleKeyDownOnCollapse = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(FORMATTING_TOOLBAR_OPTIONS.length - 1);
      radioRefs.current[FORMATTING_TOOLBAR_OPTIONS.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hideTooltip();
      onKeepFocus?.();
    }
  };

  // Tool grouping: 1 (Structure), 2 (Dialogue block), 3 (Camera and scene flow)
  const group1 = FORMATTING_TOOLBAR_OPTIONS.slice(0, 2); // Scene Heading, Action
  const group2 = FORMATTING_TOOLBAR_OPTIONS.slice(2, 5); // Character, Parenthetical, Dialogue
  const group3 = FORMATTING_TOOLBAR_OPTIONS.slice(5, 7); // Shot, Transition

  // Collapsed Chip Label and Icon
  const currentChipLabel = useMemo(() => {
    if (isMixedSelection) return 'Mixed';
    if (!effectiveActiveType) return 'Mixed';
    const found = FORMATTING_TOOLBAR_OPTIONS.find((o) => o.type === effectiveActiveType);
    return found ? found.label : 'Mixed';
  }, [isMixedSelection, effectiveActiveType]);

  const currentChipIcon = useMemo(() => {
    if (isMixedSelection || !effectiveActiveType) {
      return <MixedElementIcon />;
    }
    return getScreenplayElementIcon(effectiveActiveType);
  }, [isMixedSelection, effectiveActiveType]);

  // Helper for rendering a single radio tool button
  const renderToolButton = (opt: FormattingToolOption, globalIndex: number) => {
    const isSelected = !isTitleEditing && effectiveActiveType === opt.type;
    const isRovingTarget = focusedIndex === globalIndex;
    const shortcutLabel = formatShortcut(opt.shortcut);

    return (
      <button
        key={opt.type}
        ref={(el) => {
          radioRefs.current[globalIndex] = el;
        }}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-pressed={isSelected}
        aria-disabled={isTitleEditing}
        disabled={isTitleEditing}
        tabIndex={isRovingTarget ? 0 : -1}
        data-el={opt.type}
        data-tool-type={opt.type}
        data-active={isSelected ? 'true' : 'false'}
        data-label={opt.label}
        data-shortcut={opt.shortcut}
        data-desc={opt.description}
        aria-label={`${opt.label} (${shortcutLabel})`}
        className={`ds-tool ${isSelected ? 'is-active' : ''}`}
        onMouseDown={preventFocusLoss}
        onPointerDown={preventFocusLoss}
        onClick={() => {
          if (!isTitleEditing) {
            setFocusedIndex(globalIndex);
            onSelectBlockType(opt.type);
            onKeepFocus?.();
          }
        }}
        onKeyDown={(e) => handleKeyDownOnRadio(e, globalIndex)}
        onPointerEnter={(e) =>
          showTooltip(e.currentTarget, opt.label, shortcutLabel, opt.description, false)
        }
        onPointerLeave={hideTooltip}
        onPointerDownCapture={hideTooltip}
        onFocus={(e) => {
          setFocusedIndex(globalIndex);
          if (e.target.matches(':focus-visible')) {
            showTooltip(e.currentTarget, opt.label, shortcutLabel, opt.description, true);
          }
        }}
        onBlur={hideTooltip}
      >
        {opt.icon}
      </button>
    );
  };

  return (
    <>
      <div className={`ds-rail-dock ${className}`}>
        {isCollapsed ? (
          /* Collapsed state: single chip showing active element icon */
          <div
            className="ds-palette ds-rail ds-rail--chip"
            data-state={animatingState}
          >
            <button
              ref={chipBtnRef}
              type="button"
              className="ds-tool"
              aria-label={`Show element types. Current: ${currentChipLabel} (Expand formatting toolbar)`}
              aria-expanded={false}
              data-label="Show element types"
              onMouseDown={preventFocusLoss}
              onPointerDown={preventFocusLoss}
              onClick={(e) => handleExpand(e.currentTarget.matches(':focus-visible'))}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  hideTooltip();
                  onKeepFocus?.();
                }
              }}
              onPointerEnter={(e) =>
                showTooltip(
                  e.currentTarget,
                  `Show element types (Current: ${currentChipLabel})`,
                  undefined,
                  undefined,
                  false
                )
              }
              onPointerLeave={hideTooltip}
              onPointerDownCapture={hideTooltip}
              onFocus={(e) => {
                if (e.target.matches(':focus-visible')) {
                  showTooltip(
                    e.currentTarget,
                    `Show element types (Current: ${currentChipLabel})`,
                    undefined,
                    undefined,
                    true
                  );
                }
              }}
              onBlur={hideTooltip}
            >
              {currentChipIcon}
            </button>
          </div>
        ) : (
          /* Expanded state: complete Claude redesign vertical palette */
          <nav
            className="ds-palette ds-rail"
            data-state={animatingState}
            aria-label="Screenplay Formatting"
            role="toolbar"
            onMouseDown={preventFocusLoss}
            onPointerDown={preventFocusLoss}
          >
            <div
              className="ds-rail__radios"
              role="radiogroup"
              aria-label="Element type"
            >
              {/* Group 1: Structure (Scene Heading, Action) */}
              <div className="ds-rail__group">
                {group1.map((opt, i) => renderToolButton(opt, i))}
              </div>

              {/* Group 2: Dialogue block (Character, Parenthetical, Dialogue) */}
              <div className="ds-rail__group">
                {group2.map((opt, i) => renderToolButton(opt, i + 2))}
              </div>

              {/* Group 3: Camera and scene flow (Shot, Transition) */}
              <div className="ds-rail__group">
                {group3.map((opt, i) => renderToolButton(opt, i + 5))}
              </div>
            </div>

            {/* Quiet Collapse Control at the bottom */}
            <div className="ds-rail__group">
              <button
                ref={collapseBtnRef}
                type="button"
                className="ds-tool"
                data-rail-collapse
                data-label="Hide element types"
                aria-label="Hide element types (Collapse formatting toolbar)"
                aria-expanded={true}
                tabIndex={0}
                onMouseDown={preventFocusLoss}
                onPointerDown={preventFocusLoss}
                onClick={(e) => handleCollapse(e.currentTarget.matches(':focus-visible'))}
                onKeyDown={handleKeyDownOnCollapse}
                onPointerEnter={(e) =>
                  showTooltip(e.currentTarget, 'Hide element types', undefined, undefined, false)
                }
                onPointerLeave={hideTooltip}
                onPointerDownCapture={hideTooltip}
                onFocus={(e) => {
                  if (e.target.matches(':focus-visible')) {
                    showTooltip(e.currentTarget, 'Hide element types', undefined, undefined, true);
                  }
                }}
                onBlur={hideTooltip}
              >
                <RailChevronRightIcon />
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* Compact progressive tooltip */}
      {tooltip && tooltip.visible && (
        <div
          role="tooltip"
          className={`ds-tip ${tooltip.isDetail ? 'is-detail' : ''}`}
          style={{
            position: 'fixed',
            right: `${window.innerWidth - tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <div className="ds-tip__row">
            <span className="ds-tip__name">{tooltip.label}</span>
            {tooltip.shortcut && <span className="ds-kbd">{tooltip.shortcut}</span>}
          </div>
          {tooltip.description && (
            <div className="ds-tip__expander">
              <div className="ds-tip__expander-inner">
                <p className="ds-tip__desc">{tooltip.description}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
