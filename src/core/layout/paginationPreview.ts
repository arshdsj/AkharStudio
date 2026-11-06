/**
 * paginationPreview.ts - Development-Only Pagination Preview & Comparison Harness
 * Governing Context: AKHAR-ARCH-PAG — Milestone M2A
 *
 * Runs the unified M1 layout & pagination pipeline on a canonical screenplay document
 * (ScriptDraft or ProseMirror Node) and produces an exhaustive, structured inspection report:
 * - Page count and page-by-page slot breakdowns
 * - Source block identities, types, and exact text ranges
 * - Presentation-only elements: (MORE), (CONT'D), running headers, blank line slots
 * - Diagnostics: dialogue splits, anti-orphan preventions, overflow detection
 * - Direct side-by-side comparison with the legacy paginationPlugin heuristic
 *
 * ISOLATION GUARANTEE:
 * This harness is 100% development/diagnostic only. It does NOT mutate canonical documents,
 * does NOT replace paginationPlugin, and does NOT affect normal editor performance.
 */

import { Node as PMNode } from 'prosemirror-model';
import { ScriptDraft, PaperSize } from '../../types/screenplay';
import { IFontMetricsProvider, FontMetricsProvider } from './fontMetrics';
import { createTextLayoutService, ITextLayoutService } from './textLayoutService';
import {
  createPaginationEngine,
  IPaginationEngine,
  PaginationResult,
  PageProfile,
  createPageProfile,
} from './paginationEngine';
import {
  docToLayoutBlocks,
  ProseMirrorPositionMap,
  extractPageBreakTargets,
  PageBreakDecorationTarget,
  AdapterDiagnostic,
  KNOWN_SCREENPLAY_BLOCK_TYPES,
} from './paginationAdapter';
import { normalizeCharacterName } from '../editor/contd';
import { calculateBlockEstimatedLines } from '../editor/paginationPlugin';

// -----------------------------------------------------------------------------
// Preview Report Data Model
// -----------------------------------------------------------------------------

export interface SlotItemPreview {
  slotIndex: number;
  kind: string;
  blockId: string;
  blockType: string;
  isPresentationOnly: boolean;
  presentationText?: string;
  textSnippet?: string;
  sourceStartOffset?: number;
  sourceEndOffset?: number;
  pmPos?: number;
}

export interface PagePreview {
  pageNumber: number;
  usedSlots: number;
  remainingSlots: number;
  hasHeader: boolean;
  headerText?: string;
  slots: SlotItemPreview[];
}

export interface LegacyComparison {
  legacyEstimatedTotalLines: number;
  legacyEstimatedPages: number;
  legacyLinesPerPage: number;
  m1ExactPages: number;
  m1TotalUsedSlots: number;
  m1SlotCapacity: number;
  deltaPages: number;
  discrepancyAnalysis: string;
}

export interface PaginationPreviewReport {
  paperSize: PaperSize;
  profile: PageProfile;
  totalPages: number;
  totalUsedSlots: number;
  pages: PagePreview[];
  pageBreakTargets: PageBreakDecorationTarget[];
  diagnostics: {
    hasOverflow: boolean;
    unfittedBlockIds: string[];
    dialogueSplitsCount: number;
    orphanPreventedCount: number;
    isIncomplete: boolean;
    unsupportedBlockIds: string[];
    adapterDiagnostics: AdapterDiagnostic[];
  };
  comparison: LegacyComparison;

  /** Formats the report into a clean, human-readable terminal/log string. */
  toFormattedText(): string;
  /** Returns clean serializable JSON representation for dev tools. */
  toJSON(): Record<string, unknown>;
}

export interface PaginationPreviewOptions {
  paperSize?: PaperSize;
  metricsProvider?: IFontMetricsProvider;
  layoutService?: ITextLayoutService;
  paginationEngine?: IPaginationEngine;
}

// -----------------------------------------------------------------------------
// Preview Harness Generator
// -----------------------------------------------------------------------------

/**
 * Runs the M1 pagination pipeline on a ScriptDraft or ProseMirror doc and produces a detailed report.
 */
export function generatePaginationPreview(
  document: ScriptDraft | PMNode,
  options?: PaginationPreviewOptions
): PaginationPreviewReport {
  const paperSize: PaperSize = options?.paperSize ?? 'letter';
  const profile = createPageProfile(paperSize);

  // Setup M1 layout stack
  const metrics =
    options?.metricsProvider ??
    new FontMetricsProvider({
      measureFn: (text) => text.length * 8.0, // Safe fallback advance width
    });
  const layoutService = options?.layoutService ?? createTextLayoutService(metrics);
  const engine = options?.paginationEngine ?? createPaginationEngine();

  // Convert input to layout blocks and position map
  let layoutBlocks;
  let positionMap: ProseMirrorPositionMap | undefined;
  let legacyTotalLines = 0;
  let adapterDiagnostics: AdapterDiagnostic[] = [];
  let unsupportedBlockIds: string[] = [];

  const isProseMirrorDoc = Boolean((document as PMNode).type && (document as PMNode).type.name === 'doc');

  if (isProseMirrorDoc) {
    const doc = document as PMNode;
    const res = docToLayoutBlocks(doc);
    layoutBlocks = res.layoutBlocks;
    positionMap = res.positionMap;
    adapterDiagnostics = res.diagnostics;
    unsupportedBlockIds = res.diagnostics
      .filter((d) => d.code === 'UNSUPPORTED_BLOCK_TYPE')
      .map((d) => d.blockId);

    // Compute legacy lines from PM doc
    doc.forEach((node) => {
      if (node.type.name === 'screenplay_block') {
        const type = node.attrs.type || 'action';
        legacyTotalLines += calculateBlockEstimatedLines(type, node.textContent);
      }
    });
  } else {
    const draft = document as ScriptDraft;
    layoutBlocks = [];
    for (const b of draft.blocks || []) {
      if (!KNOWN_SCREENPLAY_BLOCK_TYPES.has(b.type)) {
        adapterDiagnostics.push({
          level: 'error',
          code: 'UNSUPPORTED_BLOCK_TYPE',
          blockId: b.id,
          message: `Unsupported screenplay block type '${b.type}' in block '${b.id}'. Block cannot be paginated.`,
          rawType: b.type,
        });
        unsupportedBlockIds.push(b.id);
      } else {
        const characterName =
          b.type === 'character' ? normalizeCharacterName(b.text) || b.text.trim() : undefined;
        layoutBlocks.push({
          id: b.id,
          type: b.type,
          text: b.text || '',
          characterName,
        });
      }
      legacyTotalLines += calculateBlockEstimatedLines(b.type, b.text);
    }
  }

  // Execute pure pagination
  const paginationResult: PaginationResult = engine.paginate(layoutBlocks, {
    profile,
    textLayoutService: layoutService,
  });

  const isIncomplete =
    unsupportedBlockIds.length > 0 ||
    paginationResult.diagnostics.hasOverflow ||
    paginationResult.diagnostics.unfittedBlockIds.length > 0;

  // Extract page-break targets if position map is available
  const pageBreakTargets = positionMap
    ? extractPageBreakTargets(paginationResult, positionMap)
    : [];

  // Build page-by-page slot breakdowns
  const pages: PagePreview[] = paginationResult.pages.map((p) => {
    const slots: SlotItemPreview[] = p.slots.map((s) => {
      let pmPos: number | undefined;
      if (positionMap && s.kind === 'text' && s.sourceStartOffset !== undefined) {
        try {
          pmPos = positionMap.pmPosFromOffset(s.blockId, s.sourceStartOffset);
        } catch {
          // Fallback if offset is at edge
        }
      }

      const textSnippet = s.line ? s.line.text.trim().slice(0, 40) : undefined;

      return {
        slotIndex: s.slotIndex,
        kind: s.kind,
        blockId: s.blockId,
        blockType: s.blockType,
        isPresentationOnly: s.isPresentationOnly,
        presentationText: s.presentationText,
        textSnippet,
        sourceStartOffset: s.sourceStartOffset,
        sourceEndOffset: s.sourceEndOffset,
        pmPos,
      };
    });

    return {
      pageNumber: p.pageNumber,
      usedSlots: p.usedSlots,
      remainingSlots: p.remainingSlots,
      hasHeader: p.hasHeader,
      headerText: p.headerText,
      slots,
    };
  });

  // Legacy comparison calculations
  const legacyLinesPerPage = paperSize === 'a4' ? 58 : 54;
  const legacyEstimatedPages = Math.max(1, Math.ceil(legacyTotalLines / legacyLinesPerPage));
  const m1ExactPages = paginationResult.totalPages;
  const deltaPages = m1ExactPages - legacyEstimatedPages;

  let discrepancyAnalysis = '';
  if (deltaPages === 0) {
    discrepancyAnalysis = 'Legacy and M1 page counts match on this document.';
  } else {
    discrepancyAnalysis = `Page count delta: ${deltaPages > 0 ? '+' : ''}${deltaPages}. M1 uses certified 18pt pitch (${profile.slotCapacity} slots) with anti-orphan lookahead, while legacy assumed ${legacyLinesPerPage} lines with arbitrary character-length division.`;
  }

  const comparison: LegacyComparison = {
    legacyEstimatedTotalLines: legacyTotalLines,
    legacyEstimatedPages,
    legacyLinesPerPage,
    m1ExactPages,
    m1TotalUsedSlots: paginationResult.totalUsedSlots,
    m1SlotCapacity: profile.slotCapacity,
    deltaPages,
    discrepancyAnalysis,
  };

  const report: PaginationPreviewReport = {
    paperSize,
    profile,
    totalPages: paginationResult.totalPages,
    totalUsedSlots: paginationResult.totalUsedSlots,
    pages,
    pageBreakTargets,
    diagnostics: {
      hasOverflow: paginationResult.diagnostics.hasOverflow,
      unfittedBlockIds: paginationResult.diagnostics.unfittedBlockIds,
      dialogueSplitsCount: paginationResult.diagnostics.dialogueSplitsCount,
      orphanPreventedCount: paginationResult.diagnostics.orphanPreventedCount,
      isIncomplete,
      unsupportedBlockIds,
      adapterDiagnostics,
    },
    comparison,

    toFormattedText(): string {
      const lines: string[] = [];
      lines.push('================================================================');
      lines.push(`AKHARSTUDIO SCREENPLAY PAGINATION PREVIEW (${paperSize.toUpperCase()})`);
      lines.push('================================================================');
      if (isIncomplete) {
        lines.push('⚠️ WARNING: PREVIEW INCOMPLETE');
        if (unsupportedBlockIds.length > 0) {
          lines.push(`  Unsupported blocks excluded from layout: [${unsupportedBlockIds.join(', ')}]`);
        }
        if (paginationResult.diagnostics.hasOverflow) {
          lines.push(`  Unfitted blocks exceeding physical slot limits: [${paginationResult.diagnostics.unfittedBlockIds.join(', ')}]`);
        }
        lines.push('----------------------------------------------------------------');
      }
      lines.push(`Total Pages: ${report.totalPages} | Total Used Slots: ${report.totalUsedSlots}`);
      lines.push(`Capacity: ${profile.slotCapacity} slots/page @ 18.0pt pitch | Header: ${profile.headerTopPt}pt`);
      lines.push(`Dialogue Splits: ${report.diagnostics.dialogueSplitsCount} | Orphans Prevented: ${report.diagnostics.orphanPreventedCount}`);
      lines.push('----------------------------------------------------------------');
      lines.push(`Legacy Comparison: Legacy estimated ${comparison.legacyEstimatedPages} pages (${comparison.legacyEstimatedTotalLines} lines @ ${comparison.legacyLinesPerPage}/page).`);
      lines.push(`Analysis: ${comparison.discrepancyAnalysis}`);
      lines.push('----------------------------------------------------------------');

      for (const p of report.pages) {
        lines.push(`PAGE ${p.pageNumber} (${p.usedSlots}/${profile.slotCapacity} slots used, ${p.remainingSlots} free)${p.hasHeader ? ` [Header: "${p.headerText}"]` : ' [No Header]'}`);
        for (const s of p.slots) {
          const kindTag = s.isPresentationOnly ? `[${s.kind.toUpperCase()}: "${s.presentationText}"]` : `[${s.blockType}]`;
          const textPart = s.textSnippet ? ` "${s.textSnippet}"` : '';
          const posPart = s.pmPos !== undefined ? ` (PM pos: ${s.pmPos})` : '';
          lines.push(`  Slot ${String(s.slotIndex).padStart(2, ' ')}: ${kindTag}${textPart}${posPart}`);
        }
        lines.push('');
      }

      if (report.pageBreakTargets.length > 0) {
        lines.push('PAGE BREAK DECORATION TARGETS:');
        for (const target of report.pageBreakTargets) {
          lines.push(`  Page ${target.pageNumber}: PM pos ${target.pmPos} (${target.breakType}) on block ${target.blockId}${target.moreText ? ` (with ${target.moreText})` : ''}`);
        }
      }

      return lines.join('\n');
    },

    toJSON(): Record<string, unknown> {
      return {
        paperSize: report.paperSize,
        totalPages: report.totalPages,
        totalUsedSlots: report.totalUsedSlots,
        profile: report.profile,
        diagnostics: report.diagnostics,
        comparison: report.comparison,
        pages: report.pages,
        pageBreakTargets: report.pageBreakTargets,
      };
    },
  };

  return report;
}
