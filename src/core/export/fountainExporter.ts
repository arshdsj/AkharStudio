/**
 * fountainExporter.ts - Screenplay Fountain Exporter with Gurmukhi Element Markers
 * Baseline: V9.1, EXPORT-02, TM-16, features-amendments.md §A8
 */

import { ScriptDraft, TitleMetadata } from '../../types/screenplay';

const STANDARD_SCENE_PREFIXES = /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.|EST\.)/i;
const LATIN_UPPERCASE_ONLY = /^[A-Z0-9\s_'.\-(/)]+$/;

/**
 * Checks if text contains Gurmukhi Unicode characters (U+0A00 - U+0A7F)
 */
export function hasGurmukhi(text: string): boolean {
  return /[\u0A00-\u0A7F]/.test(text);
}

/**
 * Exports a ScriptDraft to Fountain screenplay format.
 * Uses '@' for Gurmukhi character cues and '.' for non-standard scene headings (TM-16).
 */
export function exportToFountain(draft: ScriptDraft, metadata?: TitleMetadata): string {
  const parts: string[] = [];

  // 1. Title Page metadata
  if (metadata && (metadata.title || metadata.author)) {
    if (metadata.title) parts.push(`Title: ${metadata.title.trim()}`);
    if (metadata.basedOn) parts.push(`Credit: ${metadata.basedOn.trim()}`);
    if (metadata.author) parts.push(`Author: ${metadata.author.trim()}`);
    if (metadata.rights) parts.push(`Draft date: ${metadata.rights.trim()}`);
    if (metadata.contact) {
      const contactLines = metadata.contact.trim().split('\n');
      parts.push(`Contact:\n    ${contactLines.join('\n    ')}`);
    }
    parts.push(''); // Blank separator after title page
  }

  // 2. Screenplay Body
  for (let i = 0; i < draft.blocks.length; i++) {
    const block = draft.blocks[i];
    const text = block.text.trim();
    if (!text && block.type === 'action') continue;

    switch (block.type) {
      case 'scene_heading': {
        // If it starts with standard Latin INT./EXT., keep it clean; otherwise force with '.' (TM-16)
        if (STANDARD_SCENE_PREFIXES.test(text)) {
          parts.push(text.toUpperCase());
        } else {
          parts.push(`.${text}`);
        }
        break;
      }

      case 'character': {
        // Gurmukhi has no uppercase; force with '@' per TM-16 and Fountain spec
        if (hasGurmukhi(text) || !LATIN_UPPERCASE_ONLY.test(text)) {
          parts.push(`@${text}`);
        } else {
          parts.push(text.toUpperCase());
        }
        break;
      }

      case 'parenthetical': {
        const formatted = text.startsWith('(') && text.endsWith(')') ? text : `(${text})`;
        parts.push(formatted);
        break;
      }

      case 'dialogue': {
        parts.push(text);
        break;
      }

      case 'transition': {
        // Force transition with '>' per Fountain spec
        if (text.endsWith('TO:') && LATIN_UPPERCASE_ONLY.test(text)) {
          parts.push(text.toUpperCase());
        } else {
          parts.push(`> ${text}`);
        }
        break;
      }

      case 'shot': {
        // Forced shot / scene heading with '.'
        parts.push(`.${text.toUpperCase()}`);
        break;
      }

      case 'action':
      default: {
        parts.push(text);
        break;
      }
    }

    // Dialogue and parentheticals are grouped tightly with single newline in Fountain
    const nextBlock = draft.blocks[i + 1];
    const isNextDialogueOrParen =
      nextBlock && (nextBlock.type === 'dialogue' || nextBlock.type === 'parenthetical');

    if (
      (block.type === 'character' || block.type === 'parenthetical') &&
      isNextDialogueOrParen
    ) {
      // Single line break inside speech group
    } else {
      parts.push(''); // Standard double line break
    }
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
