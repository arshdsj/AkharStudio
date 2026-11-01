/**
 * contd.ts - Automatic (CONT'D) Character Cue Automation
 * Governing IDs: CONT-01, CONT-02, PAGE-02, DEC-025, T-05, T-06
 */

import { Node as PMNode } from 'prosemirror-model';
import { ContdSetting } from '../../types/screenplay';

export interface ContdAnalysis {
  blockIndex: number;
  characterName: string;
  isEligible: boolean;
  hasManualContd: boolean;
}

/**
 * Clean character cue string to extract base speaker name (CONT-02)
 * Removes (CONT'D), (V.O.), (O.S.), etc.
 */
export function normalizeCharacterName(text: string): string {
  return text
    .toUpperCase()
    .replace(/\s*\([^)]*\)$/, '')
    .trim();
}

/**
 * Check if character cue has manual (CONT'D) already (T-05, T-06)
 */
export function hasContdSuffix(text: string): boolean {
  return /\(\s*CONT['’]D\s*\)/i.test(text);
}

/**
 * Deterministically scan document for eligible CONT'D character repetitions (CONT-02)
 * A cue qualifies when its normalized base speaker matches the immediately preceding
 * character cue in the same scene without an intervening character cue.
 */
export function analyzeContdEligibleBlocks(doc: PMNode): ContdAnalysis[] {
  const results: ContdAnalysis[] = [];
  let currentSpeakerInScene: string | null = null;

  doc.forEach((child, _offset, index) => {
    if (child.type.name !== 'screenplay_block') return;

    const type = child.attrs.type;
    const text = child.textContent.trim();

    // Reset on new scene heading (CONT-02: within the same scene)
    if (type === 'scene_heading') {
      currentSpeakerInScene = null;
      return;
    }

    if (type === 'character' && text.length > 0) {
      const baseName = normalizeCharacterName(text);
      const isEligible = currentSpeakerInScene !== null && currentSpeakerInScene === baseName;
      const manualContd = hasContdSuffix(text);

      results.push({
        blockIndex: index,
        characterName: baseName,
        isEligible,
        hasManualContd: manualContd,
      });

      // Update speaker in scene
      currentSpeakerInScene = baseName;
    }
  });

  return results;
}

/**
 * Calculate display text for character cue without modifying stored source (PAGE-02, T-05)
 */
export function getCharacterDisplayText(
  rawText: string,
  isEligible: boolean,
  contdSetting: ContdSetting
): string {
  if (contdSetting !== 'on') {
    return rawText;
  }

  // If already manually typed, keep as-is (no duplicate suffix per T-06)
  if (hasContdSuffix(rawText)) {
    return rawText;
  }

  if (isEligible) {
    return `${rawText} (CONT'D)`;
  }

  return rawText;
}
