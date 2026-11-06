/**
 * paginationPlugin.ts - ProseMirror Screenplay Dynamic Pagination & Visual Page Breaks
 * Governing IDs: PAGE-01, PAGE-02, PAGE-03, ARCH-04, UI-01, UI-05
 *
 * Implements real-time screenplay pagination:
 * - Computes page boundaries based on standard screenplay metrics (54 lines Letter / 58 lines A4)
 * - Enforces anti-orphan rules (ARCH-04: never isolate Character cue or parenthetical at page bottom)
 * - Injects visual page break widgets spanning the full paper width with page gaps, divider badges,
 *   and running page headers ('2.', '3.', '4.', etc.)
 */

import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { PaperSize, ScreenplayBlockType } from '../../types/screenplay';

export interface PaginationPluginOptions {
  paperSize?: PaperSize;
}

export const paginationPluginKey = new PluginKey('screenplayPaginationPlugin');

/**
 * Calculates estimated lines occupied by a screenplay block based on standard industry metrics.
 */
export function calculateBlockEstimatedLines(type: ScreenplayBlockType, text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 1;

  let charsPerLine = 60;
  if (type === 'dialogue') {
    charsPerLine = 35;
  } else if (type === 'character' || type === 'parenthetical') {
    charsPerLine = 25;
  }

  const lines = Math.max(1, Math.ceil(trimmed.length / charsPerLine));
  return lines + 1; // +1 for block margin / vertical spacing
}

/**
 * Creates the DOM element for the screenplay page break widget.
 */
export function createPageBreakDOM(pageNumber: number, paperSize: PaperSize = 'letter'): HTMLElement {
  const container = document.createElement('div');
  container.className = `screenplay-page-break select-none ${paperSize === 'a4' ? 'paper-a4' : 'paper-letter'}`;
  container.setAttribute('contenteditable', 'false');
  container.setAttribute('data-page-break', String(pageNumber));

  // 1. Full-width sheet separator with bottom edge, canvas gap with PAGE badge, and top edge
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

  // 2. Running page header with top right page number '2.', '3.', etc. (PAGE-03)
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
 * Creates the ProseMirror Pagination Plugin.
 */
export function createPaginationPlugin(options: PaginationPluginOptions = {}): Plugin {
  let currentPaperSize: PaperSize = options.paperSize || 'letter';

  return new Plugin({
    key: paginationPluginKey,
    state: {
      init() {
        return { paperSize: currentPaperSize };
      },
      apply(tr, value) {
        const meta = tr.getMeta(paginationPluginKey);
        if (meta && meta.paperSize) {
          currentPaperSize = meta.paperSize;
          return { paperSize: meta.paperSize };
        }
        return value;
      },
    },
    props: {
      decorations(state) {
        const linesPerPage = currentPaperSize === 'a4' ? 58 : 54;
        const decos: Decoration[] = [];

        // Collect all blocks with their types, texts, and doc offsets
        interface BlockInfo {
          offset: number;
          type: ScreenplayBlockType;
          lines: number;
        }

        const blocks: BlockInfo[] = [];
        state.doc.forEach((node, offset) => {
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

          // Check if this block would cause a page overflow
          if (linesOnCurrentPage + b.lines > linesPerPage && linesOnCurrentPage > 12) {
            let breakIndex = i;

            // Anti-orphan rule (ARCH-04): never isolate Character cue or parenthetical at page bottom
            if (b.type === 'dialogue' && i > 0 && blocks[i - 1].type === 'character') {
              breakIndex = i - 1;
            } else if (b.type === 'parenthetical' && i > 0 && blocks[i - 1].type === 'character') {
              breakIndex = i - 1;
            } else if (b.type === 'character' && i < blocks.length - 1) {
              // Current block is a character cue near page bottom; break before it
              breakIndex = i;
            }

            const targetBlock = blocks[breakIndex];
            const pageNum = currentPage + 1;
            const paper = currentPaperSize;

            decos.push(
              Decoration.widget(
                targetBlock.offset,
                () => createPageBreakDOM(pageNum, paper),
                {
                  side: -1,
                  stopEvent: () => true,
                  key: `page-break-${pageNum}-${targetBlock.offset}`,
                }
              )
            );

            currentPage++;
            // If we broke before previous block, adjust lines on new page
            if (breakIndex < i) {
              linesOnCurrentPage = blocks[breakIndex].lines + b.lines;
            } else {
              linesOnCurrentPage = b.lines;
            }
          } else {
            linesOnCurrentPage += b.lines;
          }
        }

        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}
