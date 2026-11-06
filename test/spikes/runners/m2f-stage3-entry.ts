/**
 * m2f-stage3-entry.ts
 *
 * Bundle entry for Milestone M2F — Stage 3 Final Verification.
 */

export { screenplaySchema } from '../../../src/core/editor/schema';
export { draftToProseMirrorDoc } from '../../../src/core/editor/documentAdapter';
export {
  createUnifiedPaginationPlugin,
  unifiedPaginationPluginKey,
} from '../../../src/core/editor/unifiedPaginationPlugin';
export {
  createPaginationPlugin,
  paginationPluginKey,
} from '../../../src/core/editor/paginationPlugin';
export { createPaginationEngine } from '../../../src/core/layout/paginationEngine';
export { draftToLayoutBlocks } from '../../../src/core/layout/paginationAdapter';
export { generateUnifiedScreenplayPdfHtml } from '../../../src/core/export/pdfExporter';
export { createTextLayoutService } from '../../../src/core/layout/textLayoutService';
export { getGurmukhiFontMetricsProvider, FontMetricsProvider } from '../../../src/core/layout/fontMetrics';
export {
  GOLDEN_BLOCKS,
  GOLDEN_METADATA,
  createGoldenDraft,
} from '../../fixtures/golden-screenplay.fixture';
