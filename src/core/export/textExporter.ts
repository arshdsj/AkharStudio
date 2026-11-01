/**
 * textExporter.ts - Screenplay Plain Text Formatter (.txt)
 * Baseline: V9.1, EXPORT-01, PAGE-02
 */

import { ScriptDraft, TitleMetadata } from '../../types/screenplay';

export interface TextExportOptions {
  includeTitlePage?: boolean;
}

/**
 * Wraps text at specified width respecting word boundaries and Unicode clusters.
 */
function wrapText(text: string, maxWidth: number, indent: number): string {
  if (!text) return '';
  const indentSpaces = ' '.repeat(indent);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(indentSpaces + currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(indentSpaces + currentLine);
  }

  return lines.join('\n');
}

/**
 * Exports screenplay to industry standard formatted plain text.
 */
export function exportToPlainText(
  draft: ScriptDraft,
  metadata?: TitleMetadata,
  options: TextExportOptions = { includeTitlePage: true }
): string {
  const parts: string[] = [];

  // Title page if requested and metadata exists
  if (options.includeTitlePage && metadata && (metadata.title || metadata.author)) {
    const title = (metadata.title || 'UNTITLED').toUpperCase();
    const writtenBy = metadata.basedOn || 'by';
    const author = metadata.author || '';

    // Centered block
    parts.push(
      `${title}\n\n` +
      `${writtenBy}\n\n` +
      `${author}\n\n\n\n` +
      (metadata.rights ? `${metadata.rights}\n` : '') +
      (metadata.contact ? `Contact: ${metadata.contact}\n` : '') +
      '\n======================================================================\n'
    );
  }

  for (const block of draft.blocks) {
    const text = block.text.trim();
    if (!text && block.type === 'action') {
      continue;
    }

    switch (block.type) {
      case 'scene_heading':
        // Left margin (0 spaces), uppercase
        parts.push(text.toUpperCase());
        break;

      case 'action':
        // Left margin (0 spaces), wrapped at 60 characters
        parts.push(wrapText(text, 60, 0));
        break;

      case 'character':
        // Indented 22 spaces, uppercase
        parts.push(' '.repeat(22) + text.toUpperCase());
        break;

      case 'parenthetical':
        // Indented 16 spaces, wrapped at 30 characters
        parts.push(wrapText(text.startsWith('(') ? text : `(${text})`, 30, 16));
        break;

      case 'dialogue':
        // Indented 10 spaces, wrapped at 35 characters
        parts.push(wrapText(text, 35, 10));
        break;

      case 'transition':
        // Indented 45 spaces, uppercase
        parts.push(' '.repeat(45) + text.toUpperCase());
        break;

      case 'shot':
        // Left margin (0 spaces), uppercase
        parts.push(text.toUpperCase());
        break;

      default:
        parts.push(wrapText(text, 60, 0));
        break;
    }
  }

  return parts.join('\n\n') + '\n';
}
