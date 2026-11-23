/**
 * FloatingToolbar.tsx - Floating formatting and history toolbar
 * Composes LeftFormattingToolbar (vertical strip) and UndoRedoPill (bottom-left pill).
 */

import React from 'react';
import { LeftFormattingToolbar } from './LeftFormattingToolbar';
import { UndoRedoPill } from './UndoRedoPill';
import { ScreenplayBlock, ScreenplayBlockType } from '../../types/screenplay';

export interface FloatingToolbarProps {
  activeBlock: ScreenplayBlock | null;
  isTitleEditing: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onApplyFormat: (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => void;
  onToggleCase: () => void;
  onCopy: () => void;
  onSelectBlockType?: (type: ScreenplayBlockType) => void;
  onHighlight?: () => void;
  onFormatPainter?: () => void;
  isFormatPainterActive?: boolean;
  onLink?: (url: string) => void;
  onAddAnnotationLayer?: (layer: string) => void;
  onComment?: (comment: string) => void;
  isKeyboardOpen?: boolean;
  keyboardHeight?: number;
  onToggleKeyboard?: () => void;
  onKeepFocus?: () => void;
  activeFormats?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  };
  className?: string;
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
  onHighlight,
  onFormatPainter,
  isFormatPainterActive,
  onLink,
  onAddAnnotationLayer,
  onComment,
  isKeyboardOpen,
  keyboardHeight,
  onToggleKeyboard,
  onKeepFocus,
  activeFormats,
  className,
}) => {
  return (
    <>
      <LeftFormattingToolbar
        activeBlock={activeBlock}
        isTitleEditing={isTitleEditing}
        onApplyFormat={onApplyFormat}
        onToggleCase={onToggleCase}
        onCopy={onCopy}
        onHighlight={onHighlight}
        onFormatPainter={onFormatPainter}
        isFormatPainterActive={isFormatPainterActive}
        onLink={onLink}
        onAddAnnotationLayer={onAddAnnotationLayer}
        onComment={onComment}
        isKeyboardOpen={isKeyboardOpen}
        onToggleKeyboard={onToggleKeyboard}
        onKeepFocus={onKeepFocus}
        activeFormats={activeFormats}
        className={className}
      />
      <UndoRedoPill
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onKeepFocus={onKeepFocus}
        isKeyboardOpen={isKeyboardOpen}
        keyboardHeight={keyboardHeight}
      />
    </>
  );
};
