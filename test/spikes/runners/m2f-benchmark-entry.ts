/**
 * m2f-benchmark-entry.ts
 *
 * Electron runtime benchmark bundle entry.
 * Runs in Chromium browser context with live 2D Canvas font measurement.
 */

import { performance } from 'perf_hooks';
import { EditorState } from 'prosemirror-state';
import { screenplaySchema } from '../../../src/core/editor/schema';
import { draftToProseMirrorDoc } from '../../../src/core/editor/documentAdapter';
import {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../../../src/core/editor/unifiedPaginationPlugin';
import {
  createPaginationPlugin,
  paginationPluginKey,
} from '../../../src/core/editor/paginationPlugin';
import { generateUnifiedScreenplayPdfHtml } from '../../../src/core/export/pdfExporter';
import { createPaginationEngine } from '../../../src/core/layout/paginationEngine';
import { draftToLayoutBlocks } from '../../../src/core/layout/paginationAdapter';
import { createTextLayoutService } from '../../../src/core/layout/textLayoutService';
import { getGurmukhiFontMetricsProvider } from '../../../src/core/layout/fontMetrics';
import {
  GOLDEN_BLOCKS,
  GOLDEN_METADATA,
  createGoldenDraft,
} from '../../fixtures/golden-screenplay.fixture';
import { ScriptDraft, ScreenplayBlock } from '../../../src/types/screenplay';

export function createScaledDraft(targetPages: number): ScriptDraft {
  const targetBlocks = Math.round(targetPages * 10);
  const blocks: ScreenplayBlock[] = [];
  let blockCounter = 0;
  while (blocks.length < targetBlocks) {
    const sceneIndex = Math.floor(blockCounter / 10) + 1;
    for (const b of GOLDEN_BLOCKS) {
      blockCounter++;
      blocks.push({
        ...b,
        id: `blk-${blockCounter}`,
        text: b.type === 'scene_heading' ? `${b.text} - ACT ${sceneIndex}` : b.text,
      });
      if (blocks.length >= targetBlocks) break;
    }
  }
  return {
    id: `scaled-script-${targetPages}p`,
    name: `Scaled Script (${targetPages} Pages)`,
    isMain: true,
    createdAt: '2026-11-06T00:00:00.000Z',
    modifiedAt: '2026-11-06T00:00:00.000Z',
    blocks,
  };
}

export {
  performance,
  EditorState,
  screenplaySchema,
  draftToProseMirrorDoc,
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
  createPaginationPlugin,
  paginationPluginKey,
  generateUnifiedScreenplayPdfHtml,
  createPaginationEngine,
  draftToLayoutBlocks,
  createTextLayoutService,
  getGurmukhiFontMetricsProvider,
  GOLDEN_METADATA,
  createGoldenDraft,
};
