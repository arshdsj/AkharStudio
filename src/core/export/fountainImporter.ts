/**
 * fountainImporter.ts - Screenplay Fountain Importer with Gurmukhi Element Support
 * Baseline: V9.1, EXPORT-02, TM-16, TM-14 (NFC Normalization)
 */

import { ScreenplayBlock, ScreenplayBlockType, ScriptDraft, TitleMetadata } from '../../types/screenplay';

const STANDARD_SCENE_PREFIXES = /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.|EST\.)/i;
const LATIN_UPPERCASE_ONLY = /^[A-Z0-9\s_'.\-(/)]+$/;

function generateBlockId(): string {
  return 'b_' + Math.random().toString(36).substring(2, 10);
}

export interface FountainImportResult {
  metadata: TitleMetadata;
  draft: ScriptDraft;
}

/**
 * Imports a Fountain-formatted string into a semantic ScriptDraft and TitleMetadata.
 * Strict NFC Unicode normalization is applied upfront (TM-14).
 */
export function importFromFountain(fountainText: string): FountainImportResult {
  // 1. Strict NFC Normalization (TM-14, SEC-01)
  const normalized = (fountainText || '').normalize('NFC').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = normalized.split('\n');
  const metadata: TitleMetadata = {
    title: '',
    author: '',
    basedOn: '',
    contact: '',
    rights: '',
  };

  let bodyStartIndex = 0;
  let isParsingTitle = true;
  let currentKey = '';

  // 2. Parse Title Page Metadata if present
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isParsingTitle) {
      if (line.trim() === '') {
        // If we hit an empty line after parsing some keys, title page is done
        if (metadata.title || metadata.author || metadata.basedOn) {
          bodyStartIndex = i + 1;
          isParsingTitle = false;
          continue;
        }
      }

      const match = line.match(/^([A-Za-z\s]+):\s*(.*)$/);
      if (match) {
        const key = match[1].trim().toLowerCase();
        const value = match[2].trim();
        currentKey = key;

        if (key === 'title') metadata.title = value;
        else if (key === 'author' || key === 'authors') metadata.author = value;
        else if (key === 'credit' || key === 'based on') metadata.basedOn = value;
        else if (key === 'draft date' || key === 'rights') metadata.rights = value;
        else if (key === 'contact') metadata.contact = value;
        continue;
      } else if (currentKey === 'contact' && line.startsWith('    ')) {
        // Multi-line contact info continuation
        metadata.contact += (metadata.contact ? '\n' : '') + line.trim();
        continue;
      } else {
        // Line does not match title page key; title page finished
        bodyStartIndex = i;
        isParsingTitle = false;
      }
    }
  }

  // Fallback title if not provided
  if (!metadata.title) {
    metadata.title = 'Untitled Screenplay';
  }

  // 3. Parse Screenplay Blocks
  const blocks: ScreenplayBlock[] = [];
  const bodyLines = lines.slice(bodyStartIndex);
  let i = 0;

  let lastBlockType: ScreenplayBlockType | null = null;

  while (i < bodyLines.length) {
    const line = bodyLines[i];
    const trimmed = line.trim();

    // Skip empty lines between blocks
    if (!trimmed) {
      lastBlockType = null;
      i++;
      continue;
    }

    // A. Forced Scene Heading (. prefix)
    if (trimmed.startsWith('.') && !trimmed.startsWith('..')) {
      const sceneText = trimmed.substring(1).trim();
      blocks.push({
        id: generateBlockId(),
        type: 'scene_heading',
        text: sceneText,
      });
      lastBlockType = 'scene_heading';
      i++;
      continue;
    }

    // B. Standard Scene Heading (INT., EXT., etc.)
    if (STANDARD_SCENE_PREFIXES.test(trimmed)) {
      blocks.push({
        id: generateBlockId(),
        type: 'scene_heading',
        text: trimmed,
      });
      lastBlockType = 'scene_heading';
      i++;
      continue;
    }

    // C. Forced Transition (> prefix)
    if (trimmed.startsWith('>') && !trimmed.endsWith('<')) {
      const transText = trimmed.substring(1).trim();
      blocks.push({
        id: generateBlockId(),
        type: 'transition',
        text: transText,
      });
      lastBlockType = 'transition';
      i++;
      continue;
    }

    // D. Standard Transition (ends with TO: in all caps)
    if (trimmed.endsWith('TO:') && LATIN_UPPERCASE_ONLY.test(trimmed)) {
      blocks.push({
        id: generateBlockId(),
        type: 'transition',
        text: trimmed,
      });
      lastBlockType = 'transition';
      i++;
      continue;
    }

    // E. Forced Character cue (@ prefix, TM-16 for Gurmukhi)
    if (trimmed.startsWith('@')) {
      const charText = trimmed.substring(1).trim();
      blocks.push({
        id: generateBlockId(),
        type: 'character',
        text: charText,
      });
      lastBlockType = 'character';
      i++;
      continue;
    }

    // F. Parenthetical: starts with '(' and ends with ')' following character or parenthetical
    if (
      trimmed.startsWith('(') &&
      trimmed.endsWith(')') &&
      (lastBlockType === 'character' || lastBlockType === 'parenthetical')
    ) {
      blocks.push({
        id: generateBlockId(),
        type: 'parenthetical',
        text: trimmed,
      });
      lastBlockType = 'parenthetical';
      i++;
      continue;
    }

    // G. Dialogue: directly follows Character or Parenthetical
    if (lastBlockType === 'character' || lastBlockType === 'parenthetical') {
      blocks.push({
        id: generateBlockId(),
        type: 'dialogue',
        text: trimmed,
      });
      lastBlockType = 'dialogue';
      i++;
      continue;
    }

    // H. Standard Character cue (All-caps Latin line, next line is non-empty)
    const nextLine = bodyLines[i + 1] ? bodyLines[i + 1].trim() : '';
    if (
      LATIN_UPPERCASE_ONLY.test(trimmed) &&
      trimmed.length > 0 &&
      trimmed.length < 40 &&
      nextLine.length > 0 &&
      !STANDARD_SCENE_PREFIXES.test(trimmed)
    ) {
      blocks.push({
        id: generateBlockId(),
        type: 'character',
        text: trimmed,
      });
      lastBlockType = 'character';
      i++;
      continue;
    }

    // I. Action paragraph (collect lines until blank line or special marker)
    const actionLines: string[] = [trimmed];
    while (i + 1 < bodyLines.length) {
      const next = bodyLines[i + 1].trim();
      if (!next) break;
      if (
        next.startsWith('.') ||
        next.startsWith('@') ||
        next.startsWith('>') ||
        STANDARD_SCENE_PREFIXES.test(next)
      ) {
        break;
      }
      actionLines.push(next);
      i++;
    }

    blocks.push({
      id: generateBlockId(),
      type: 'action',
      text: actionLines.join(' '),
    });
    lastBlockType = 'action';
    i++;
  }

  // Ensure at least one action block if empty
  if (blocks.length === 0) {
    blocks.push({
      id: generateBlockId(),
      type: 'action',
      text: '',
    });
  }

  const now = new Date().toISOString();
  const draft: ScriptDraft = {
    id: 'draft_' + Math.random().toString(36).substring(2, 10),
    name: 'Imported Draft',
    isMain: true,
    blocks,
    createdAt: now,
    modifiedAt: now,
  };

  return { metadata, draft };
}
