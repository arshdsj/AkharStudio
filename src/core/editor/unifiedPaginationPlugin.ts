/**
 * unifiedPaginationPlugin.ts - ProseMirror Screenplay Unified Pagination & Decoration Engine
 * Governing IDs: AKHAR-ARCH-PAG — Milestone M2B
 *
 * Implements real-time screenplay pagination integration via virtual widget decorations:
 * - Reads canonical ProseMirror document without schema modifications or page-break nodes
 * - Uses M2A document adapter and M1 pure deterministic layout/pagination engine
 * - Generates virtual page-break decorations for both inter-block breaks and mid-block splits
 * - Keeps (MORE) and (CONT'D) strictly presentation-only (never enters canonical text or SQLite)
 * - Pure caching & invalidation: document content changes, paper size, and contdSetting recalculate;
 *   cursor movements and text selections reuse mapped decorations without repaginating.
 */

import { Plugin, PluginKey, Transaction, EditorState } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Node as PMNode } from 'prosemirror-model';
import { PaperSize, ContdSetting, ScreenplayBlockType } from '../../types/screenplay';
import {
  docToLayoutBlocks,
  extractPageBreakTargets,
  PageBreakDecorationTarget,
} from '../layout/paginationAdapter';
import {
  calculateBlockEstimatedLines,
} from './paginationPlugin';
import {
  createPaginationEngine,
  IPaginationEngine,
  PaginationResult,
} from '../layout/paginationEngine';
import {
  createTextLayoutService,
  ITextLayoutService,
} from '../layout/textLayoutService';
import {
  FontMetricsProvider,
  getGurmukhiFontMetricsProvider,
  IFontMetricsProvider,
  RuntimeFontStatus,
} from '../layout/fontMetrics';

// -----------------------------------------------------------------------------
// 1. Plugin Key & Interfaces
// -----------------------------------------------------------------------------

export const unifiedPaginationPluginKey = new PluginKey<UnifiedPaginationState>('unifiedPaginationPlugin');

export interface UnifiedPaginationMeta {
  paperSize?: PaperSize;
  contdSetting?: ContdSetting;
  textLayoutService?: ITextLayoutService;
  fontStatus?: RuntimeFontStatus;
  fontReady?: boolean;
  forceRecalc?: boolean;
}

export type UnifiedFallbackReason =
  | 'unsupported_block'
  | 'incomplete_layout'
  | 'engine_error'
  | 'init_error'
  | null;

export type UnifiedPluginDiagnosticCode =
  | 'UNSUPPORTED_BLOCK_TYPE'
  | 'INVALID_SPLIT_OFFSET'
  | 'OUT_OF_BOUNDS_POSITION'
  | 'INCOMPLETE_LAYOUT'
  | 'INIT_ERROR'
  | 'ENGINE_ERROR';

export interface UnifiedPluginDiagnostic {
  level: 'error' | 'warning';
  code: UnifiedPluginDiagnosticCode;
  message: string;
  rawType?: string;
  blockId?: string;
}

export interface UnifiedPaginationPluginOptions {
  paperSize?: PaperSize;
  contdSetting?: ContdSetting;
  textLayoutService?: ITextLayoutService;
  fontMetricsProvider?: IFontMetricsProvider;
  paginationEngine?: IPaginationEngine;
  onPaginationChange?: (result: PaginationResult) => void;
  onFallback?: (reason: NonNullable<UnifiedFallbackReason>, diagnostics: UnifiedPluginDiagnostic[]) => void;
}

export interface UnifiedPaginationState {
  paperSize: PaperSize;
  contdSetting: ContdSetting;
  decorations: DecorationSet;
  paginationResult: PaginationResult | null;
  targets: PageBreakDecorationTarget[];
  recalcCount: number;
  fontStatus?: RuntimeFontStatus | null;
  isFallback: boolean;
  fallbackReason: UnifiedFallbackReason;
  fallbackDiagnostics: UnifiedPluginDiagnostic[];
}

// -----------------------------------------------------------------------------
// 2. DOM Generators for Virtual Page Break Decorations
// -----------------------------------------------------------------------------

/**
 * Creates the DOM element for clean between-block virtual page breaks.
 */
export function createUnifiedPageBreakDOM(
  target: PageBreakDecorationTarget,
  paperSize: PaperSize = 'letter'
): HTMLElement {
  const container = document.createElement('div');
  container.className = `screenplay-page-break screenplay-unified-page-break select-none ${
    paperSize === 'a4' ? 'paper-a4' : 'paper-letter'
  }`;
  container.setAttribute('contenteditable', 'false');
  container.setAttribute('data-page-break', String(target.pageNumber));
  container.setAttribute('data-break-type', target.breakType);
  container.setAttribute('data-pagination-engine', 'unified');

  // Full-width sheet separator with bottom edge, canvas gap with PAGE badge, and top edge
  const divider = document.createElement('div');
  divider.className = 'screenplay-page-break__divider';

  const bottomEdge = document.createElement('div');
  bottomEdge.className = 'screenplay-page-break__edge-bottom';

  const gap = document.createElement('div');
  gap.className = 'screenplay-page-break__gap';

  const leftLine = document.createElement('div');
  leftLine.className = 'screenplay-page-break__line';

  const badge = document.createElement('div');
  badge.className = 'screenplay-page-break__badge';
  badge.textContent = `PAGE ${target.pageNumber}`;

  const rightLine = document.createElement('div');
  rightLine.className = 'screenplay-page-break__line';

  gap.appendChild(leftLine);
  gap.appendChild(badge);
  gap.appendChild(rightLine);

  const topEdge = document.createElement('div');
  topEdge.className = 'screenplay-page-break__edge-top';

  divider.appendChild(bottomEdge);
  divider.appendChild(gap);
  divider.appendChild(topEdge);

  // Running page header with top right page number '2.', '3.', etc. (suppressed on Page 1)
  const header = document.createElement('div');
  header.className = 'screenplay-page-break__header';

  const pageNum = document.createElement('span');
  pageNum.className = 'screenplay-page-break__number';
  pageNum.textContent = `${target.pageNumber}.`;

  header.appendChild(pageNum);

  container.appendChild(divider);
  container.appendChild(header);

  return container;
}

/**
 * Creates the DOM element for mid-block virtual page breaks (dialogue or action continuation).
 */
export function createUnifiedMidBlockBreakDOM(
  target: PageBreakDecorationTarget,
  paperSize: PaperSize = 'letter'
): HTMLElement {
  const container = document.createElement('div');
  container.className = `screenplay-page-break screenplay-unified-page-break screenplay-mid-block-break select-none ${
    paperSize === 'a4' ? 'paper-a4' : 'paper-letter'
  }`;
  container.setAttribute('contenteditable', 'false');
  container.setAttribute('data-page-break', String(target.pageNumber));
  container.setAttribute('data-break-type', 'mid_block');
  container.setAttribute('data-pagination-engine', 'unified');

  // 1. Presentation (MORE) before the break if dialogue split
  if (target.moreText) {
    const moreEl = document.createElement('div');
    moreEl.className = 'screenplay-more-continuation select-none';
    moreEl.setAttribute('contenteditable', 'false');
    moreEl.textContent = target.moreText;
    container.appendChild(moreEl);
  }

  // 2. Full-width sheet separator
  const divider = document.createElement('div');
  divider.className = 'screenplay-page-break__divider';

  const bottomEdge = document.createElement('div');
  bottomEdge.className = 'screenplay-page-break__edge-bottom';

  const gap = document.createElement('div');
  gap.className = 'screenplay-page-break__gap';

  const leftLine = document.createElement('div');
  leftLine.className = 'screenplay-page-break__line';

  const badge = document.createElement('div');
  badge.className = 'screenplay-page-break__badge';
  badge.textContent = `PAGE ${target.pageNumber}`;

  const rightLine = document.createElement('div');
  rightLine.className = 'screenplay-page-break__line';

  gap.appendChild(leftLine);
  gap.appendChild(badge);
  gap.appendChild(rightLine);

  const topEdge = document.createElement('div');
  topEdge.className = 'screenplay-page-break__edge-top';

  divider.appendChild(bottomEdge);
  divider.appendChild(gap);
  divider.appendChild(topEdge);

  container.appendChild(divider);

  // 3. Running page header
  const header = document.createElement('div');
  header.className = 'screenplay-page-break__header';

  const pageNum = document.createElement('span');
  pageNum.className = 'screenplay-page-break__number';
  pageNum.textContent = `${target.pageNumber}.`;

  header.appendChild(pageNum);
  container.appendChild(header);

  // 4. Presentation CHARACTER (CONT'D) after the break on new page
  if (target.contdText) {
    const contdEl = document.createElement('div');
    contdEl.className = 'screenplay-contd-continuation select-none';
    contdEl.setAttribute('contenteditable', 'false');
    contdEl.textContent = target.contdText;
    container.appendChild(contdEl);
  }

  return container;
}

/**
 * Creates the DOM element for fallback page breaks when unified pagination
 * encounters an unsupported block or layout engine error.
 */
export function createFallbackPageBreakDOM(
  pageNumber: number,
  paperSize: PaperSize = 'letter'
): HTMLElement {
  const container = document.createElement('div');
  container.className = `screenplay-page-break screenplay-fallback-page-break select-none ${
    paperSize === 'a4' ? 'paper-a4' : 'paper-letter'
  }`;
  container.setAttribute('contenteditable', 'false');
  container.setAttribute('data-page-break', String(pageNumber));
  container.setAttribute('data-pagination-engine', 'legacy-fallback');

  const divider = document.createElement('div');
  divider.className = 'screenplay-page-break__divider';

  const bottomEdge = document.createElement('div');
  bottomEdge.className = 'screenplay-page-break__edge-bottom';

  const gap = document.createElement('div');
  gap.className = 'screenplay-page-break__gap';

  const leftLine = document.createElement('div');
  leftLine.className = 'screenplay-page-break__line';

  const badge = document.createElement('div');
  badge.className = 'screenplay-page-break__badge';
  badge.textContent = `PAGE ${pageNumber}`;

  const rightLine = document.createElement('div');
  rightLine.className = 'screenplay-page-break__line';

  gap.appendChild(leftLine);
  gap.appendChild(badge);
  gap.appendChild(rightLine);

  const topEdge = document.createElement('div');
  topEdge.className = 'screenplay-page-break__edge-top';

  divider.appendChild(bottomEdge);
  divider.appendChild(gap);
  divider.appendChild(topEdge);

  const header = document.createElement('div');
  header.className = 'screenplay-page-break__header';

  const pageNum = document.createElement('span');
  pageNum.className = 'screenplay-page-break__number';
  pageNum.textContent = `${pageNumber}.`;

  header.appendChild(pageNum);

  container.appendChild(divider);
  container.appendChild(header);

  return container;
}

/**
 * Computes safe legacy-style page break decorations directly from a ProseMirror doc
 * when unified pagination encounters unsupported blocks or layout engine errors.
 * Ensures the editor remains fully interactive and visual page boundaries exist without
 * corrupting canonical document state.
 */
export function computeFallbackLegacyDecorations(
  doc: PMNode,
  paperSize: PaperSize = 'letter'
): DecorationSet {
  const linesPerPage = paperSize === 'a4' ? 58 : 54;
  const decos: Decoration[] = [];

  interface BlockInfo {
    offset: number;
    type: ScreenplayBlockType;
    lines: number;
  }

  const blocks: BlockInfo[] = [];
  doc.forEach((node, offset) => {
    if (node.type.name === 'screenplay_block') {
      const type = (node.attrs.type as ScreenplayBlockType) || 'action';
      const lines = calculateBlockEstimatedLines(type, node.textContent);
      blocks.push({ offset, type, lines });
    }
  });

  if (blocks.length === 0) {
    return DecorationSet.empty;
  }

  let linesOnCurrentPage = 0;
  let currentPage = 1;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    if (linesOnCurrentPage + b.lines > linesPerPage && linesOnCurrentPage > 12) {
      let breakIndex = i;

      // Anti-orphan rule (ARCH-04): never isolate Character cue or parenthetical at page bottom
      if (b.type === 'dialogue' && i > 0 && blocks[i - 1].type === 'character') {
        breakIndex = i - 1;
      } else if (b.type === 'parenthetical' && i > 0 && blocks[i - 1].type === 'character') {
        breakIndex = i - 1;
      } else if (b.type === 'character' && i < blocks.length - 1) {
        breakIndex = i;
      }

      const targetBlock = blocks[breakIndex];
      const pageNum = currentPage + 1;
      const paper = paperSize;

      decos.push(
        Decoration.widget(
          targetBlock.offset,
          () => createFallbackPageBreakDOM(pageNum, paper),
          {
            side: -1,
            stopEvent: () => true,
            key: `fallback-page-break-${pageNum}-${targetBlock.offset}`,
          }
        )
      );

      currentPage++;
      if (breakIndex < i) {
        linesOnCurrentPage = blocks[breakIndex].lines + b.lines;
      } else {
        linesOnCurrentPage = b.lines;
      }
    } else {
      linesOnCurrentPage += b.lines;
    }
  }

  return DecorationSet.create(doc, decos);
}

// -----------------------------------------------------------------------------
// 3. Decoration Builder
// -----------------------------------------------------------------------------

/**
 * Builds a DecorationSet from the calculated page break targets.
 */
export function buildUnifiedDecorationSet(
  doc: PMNode,
  targets: PageBreakDecorationTarget[],
  paperSize: PaperSize
): DecorationSet {
  const decos: Decoration[] = [];

  for (const target of targets) {
    if (target.pmPos < 0 || target.pmPos > doc.nodeSize) {
      continue;
    }

    if (target.breakType === 'mid_block') {
      decos.push(
        Decoration.widget(
          target.pmPos,
          () => createUnifiedMidBlockBreakDOM(target, paperSize),
          {
            side: -1,
            stopEvent: () => true,
            ignoreSelection: true,
            key: `unified-mid-break-${target.pageNumber}-${target.pmPos}`,
          }
        )
      );
    } else {
      decos.push(
        Decoration.widget(
          target.pmPos,
          () => createUnifiedPageBreakDOM(target, paperSize),
          {
            side: -1,
            stopEvent: () => true,
            ignoreSelection: true,
            key: `unified-page-break-${target.pageNumber}-${target.pmPos}`,
          }
        )
      );
    }
  }

  return DecorationSet.create(doc, decos);
}

// -----------------------------------------------------------------------------
// 4. Fallback Layout Service Resolver
// -----------------------------------------------------------------------------

function resolveDefaultLayoutService(provided?: ITextLayoutService): ITextLayoutService {
  if (provided) return provided;
  let metricsProvider: IFontMetricsProvider;
  try {
    const provider = getGurmukhiFontMetricsProvider();
    // Test if real Canvas 2D measurement is operational in current environment
    provider.measureWidth('test');
    metricsProvider = provider;
  } catch {
    // In headless Node/JSDOM environments without Canvas 2D, use deterministic 12pt monospace (7.2pt per char @ 10 CPI)
    metricsProvider = new FontMetricsProvider({
      measureFn: (text: string) => Number((text.length * 7.2).toFixed(4)),
    });
  }
  return createTextLayoutService(metricsProvider);
}

// -----------------------------------------------------------------------------
// 5. ProseMirror Plugin Factory
// -----------------------------------------------------------------------------

/**
 * Creates the Unified Pagination ProseMirror Plugin.
 */
export function createUnifiedPaginationPlugin(
  options: UnifiedPaginationPluginOptions = {}
): Plugin<UnifiedPaginationState> {
  const initialPaperSize: PaperSize = options.paperSize || 'letter';
  const initialContdSetting: ContdSetting = options.contdSetting || 'on';
  let layoutService = resolveDefaultLayoutService(options.textLayoutService);
  const engine = options.paginationEngine || createPaginationEngine();

  return new Plugin<UnifiedPaginationState>({
    key: unifiedPaginationPluginKey,
    state: {
      init(_config, instanceState: EditorState): UnifiedPaginationState {
        try {
          const { layoutBlocks, positionMap, diagnostics } = docToLayoutBlocks(instanceState.doc);
          const unsupportedBlockDiagnostics = diagnostics.filter((d) => d.code === 'UNSUPPORTED_BLOCK_TYPE');

          if (unsupportedBlockDiagnostics.length > 0) {
            console.warn(
              `[UnifiedPagination] Unsupported block type detected (${unsupportedBlockDiagnostics.map((d) => d.rawType).join(', ')}). Falling back to legacy pagination.`
            );
            options.onFallback?.('unsupported_block', unsupportedBlockDiagnostics);
            const fallbackDecos = computeFallbackLegacyDecorations(instanceState.doc, initialPaperSize);
            return {
              paperSize: initialPaperSize,
              contdSetting: initialContdSetting,
              decorations: fallbackDecos,
              paginationResult: null,
              targets: [],
              recalcCount: 1,
              fontStatus: null,
              isFallback: true,
              fallbackReason: 'unsupported_block',
              fallbackDiagnostics: unsupportedBlockDiagnostics,
            };
          }

          const paginationResult = engine.paginate(layoutBlocks, {
            paperSize: initialPaperSize,
            textLayoutService: layoutService,
            contdSetting: initialContdSetting,
          });

          const hasPrintableContent = layoutBlocks.some((b) => b.text.trim().length > 0);
          if (hasPrintableContent && paginationResult.pages.length === 0) {
            console.warn('[UnifiedPagination] Pagination engine returned 0 pages for non-empty layout blocks. Falling back to legacy pagination.');
            const diag: UnifiedPluginDiagnostic = {
              level: 'error',
              code: 'INCOMPLETE_LAYOUT',
              message: 'Pagination engine returned 0 pages for non-empty layout blocks',
            };
            options.onFallback?.('incomplete_layout', [diag]);
            const fallbackDecos = computeFallbackLegacyDecorations(instanceState.doc, initialPaperSize);
            return {
              paperSize: initialPaperSize,
              contdSetting: initialContdSetting,
              decorations: fallbackDecos,
              paginationResult: null,
              targets: [],
              recalcCount: 1,
              fontStatus: null,
              isFallback: true,
              fallbackReason: 'incomplete_layout',
              fallbackDiagnostics: [diag],
            };
          }

          const targets = extractPageBreakTargets(paginationResult, positionMap);
          const decorations = buildUnifiedDecorationSet(instanceState.doc, targets, initialPaperSize);

          options.onPaginationChange?.(paginationResult);

          return {
            paperSize: initialPaperSize,
            contdSetting: initialContdSetting,
            decorations,
            paginationResult,
            targets,
            recalcCount: 1,
            fontStatus: options.fontMetricsProvider?.getStatus() ?? null,
            isFallback: false,
            fallbackReason: null,
            fallbackDiagnostics: [],
          };
        } catch (err) {
          console.error('[UnifiedPagination] Engine error during plugin initialization:', err);
          const diag: UnifiedPluginDiagnostic = {
            level: 'error',
            code: 'INIT_ERROR',
            message: String(err instanceof Error ? err.message : err),
          };
          options.onFallback?.('init_error', [diag]);
          const fallbackDecos = computeFallbackLegacyDecorations(instanceState.doc, initialPaperSize);
          return {
            paperSize: initialPaperSize,
            contdSetting: initialContdSetting,
            decorations: fallbackDecos,
            paginationResult: null,
            targets: [],
            recalcCount: 1,
            fontStatus: null,
            isFallback: true,
            fallbackReason: 'init_error',
            fallbackDiagnostics: [diag],
          };
        }
      },

      apply(
        tr: Transaction,
        prevState: UnifiedPaginationState,
        _oldState: EditorState,
        newState: EditorState
      ): UnifiedPaginationState {
        const meta = tr.getMeta(unifiedPaginationPluginKey) as UnifiedPaginationMeta | undefined;

        let newPaperSize = prevState.paperSize;
        let newContdSetting = prevState.contdSetting;
        let newFontStatus = prevState.fontStatus;
        let forceRecalc = false;

        if (meta) {
          if (meta.paperSize && meta.paperSize !== newPaperSize) {
            newPaperSize = meta.paperSize;
            forceRecalc = true;
          }
          if (meta.contdSetting && meta.contdSetting !== newContdSetting) {
            newContdSetting = meta.contdSetting;
            forceRecalc = true;
          }
          if (meta.textLayoutService) {
            layoutService = meta.textLayoutService;
            forceRecalc = true;
          }
          if (meta.fontStatus) {
            newFontStatus = meta.fontStatus;
            forceRecalc = true;
          }
          if (meta.fontReady) {
            forceRecalc = true;
          }
          if (meta.forceRecalc) {
            forceRecalc = true;
          }
        }

        // INVARIATION RULE: If doc did not change and no pagination-affecting settings changed,
        // do not repaginate! Simply map existing decorations across transaction.
        if (!tr.docChanged && !forceRecalc) {
          return {
            ...prevState,
            paperSize: newPaperSize,
            contdSetting: newContdSetting,
            fontStatus: newFontStatus,
            decorations: prevState.decorations.map(tr.mapping, tr.doc),
          };
        }

        // Document changed or settings updated: recalculate pagination with safe fallback
        try {
          const { layoutBlocks, positionMap, diagnostics } = docToLayoutBlocks(newState.doc);
          const unsupportedBlockDiagnostics = diagnostics.filter((d) => d.code === 'UNSUPPORTED_BLOCK_TYPE');

          if (unsupportedBlockDiagnostics.length > 0) {
            console.warn(
              `[UnifiedPagination] Unsupported block type detected (${unsupportedBlockDiagnostics.map((d) => d.rawType).join(', ')}). Falling back to legacy pagination.`
            );
            options.onFallback?.('unsupported_block', unsupportedBlockDiagnostics);
            const fallbackDecos = computeFallbackLegacyDecorations(newState.doc, newPaperSize);
            return {
              paperSize: newPaperSize,
              contdSetting: newContdSetting,
              decorations: fallbackDecos,
              paginationResult: null,
              targets: [],
              recalcCount: prevState.recalcCount + 1,
              fontStatus: newFontStatus,
              isFallback: true,
              fallbackReason: 'unsupported_block',
              fallbackDiagnostics: unsupportedBlockDiagnostics,
            };
          }

          const paginationResult = engine.paginate(layoutBlocks, {
            paperSize: newPaperSize,
            textLayoutService: layoutService,
            contdSetting: newContdSetting,
          });

          const hasPrintableContent = layoutBlocks.some((b) => b.text.trim().length > 0);
          if (hasPrintableContent && paginationResult.pages.length === 0) {
            console.warn('[UnifiedPagination] Pagination engine returned 0 pages for non-empty layout blocks. Falling back to legacy pagination.');
            const diag: UnifiedPluginDiagnostic = {
              level: 'error',
              code: 'INCOMPLETE_LAYOUT',
              message: 'Pagination engine returned 0 pages for non-empty layout blocks',
            };
            options.onFallback?.('incomplete_layout', [diag]);
            const fallbackDecos = computeFallbackLegacyDecorations(newState.doc, newPaperSize);
            return {
              paperSize: newPaperSize,
              contdSetting: newContdSetting,
              decorations: fallbackDecos,
              paginationResult: null,
              targets: [],
              recalcCount: prevState.recalcCount + 1,
              fontStatus: newFontStatus,
              isFallback: true,
              fallbackReason: 'incomplete_layout',
              fallbackDiagnostics: [diag],
            };
          }

          const targets = extractPageBreakTargets(paginationResult, positionMap);
          const decorations = buildUnifiedDecorationSet(newState.doc, targets, newPaperSize);

          options.onPaginationChange?.(paginationResult);

          return {
            paperSize: newPaperSize,
            contdSetting: newContdSetting,
            decorations,
            paginationResult,
            targets,
            recalcCount: prevState.recalcCount + 1,
            fontStatus: newFontStatus,
            isFallback: false,
            fallbackReason: null,
            fallbackDiagnostics: [],
          };
        } catch (err) {
          console.error('[UnifiedPagination] Layout engine error during document transaction:', err);
          const diag: UnifiedPluginDiagnostic = {
            level: 'error',
            code: 'ENGINE_ERROR',
            message: String(err instanceof Error ? err.message : err),
          };
          options.onFallback?.('engine_error', [diag]);
          const fallbackDecos = computeFallbackLegacyDecorations(newState.doc, newPaperSize);
          return {
            paperSize: newPaperSize,
            contdSetting: newContdSetting,
            decorations: fallbackDecos,
            paginationResult: null,
            targets: [],
            recalcCount: prevState.recalcCount + 1,
            fontStatus: newFontStatus,
            isFallback: true,
            fallbackReason: 'engine_error',
            fallbackDiagnostics: [diag],
          };
        }
      },
    },

    view(editorView) {
      if (options.fontMetricsProvider) {
        options.fontMetricsProvider
          .ensureLoaded()
          .then((status) => {
            if (editorView.isDestroyed) return;
            editorView.dispatch(
              editorView.state.tr.setMeta(unifiedPaginationPluginKey, {
                fontStatus: status,
                fontReady: status.loaded,
                forceRecalc: true,
              })
            );
          })
          .catch(() => {
            // Graceful fallback
          });
      }
      return {};
    },

    props: {
      decorations(state: EditorState) {
        const pluginState = unifiedPaginationPluginKey.getState(state);
        return pluginState ? pluginState.decorations : DecorationSet.empty;
      },
    },
  });
}
