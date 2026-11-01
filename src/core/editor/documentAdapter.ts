/**
 * documentAdapter.ts - Bidirectional conversion between ScriptDraft domain blocks and ProseMirror doc
 * Governing IDs: MODEL-01, MODEL-03, ARCH-02, ARCH-05
 */

import { Node as PMNode } from 'prosemirror-model';
import { screenplaySchema } from './schema';
import { ScriptDraft, ScreenplayBlock, ScreenplayBlockType, InlineFormat } from '../../types/screenplay';
import { generateId } from '../model/ProjectModel';

/**
 * Convert a domain ScriptDraft into a ProseMirror Document Node
 */
export function draftToProseMirrorDoc(draft: ScriptDraft): PMNode {
  const blockNodes: PMNode[] = [];

  for (const block of draft.blocks) {
    const textNodes: PMNode[] = [];
    if (block.text) {
      if (block.formats && block.formats.length > 0) {
        const points = new Set<number>([0, block.text.length]);
        for (const f of block.formats) {
          points.add(Math.max(0, Math.min(block.text.length, f.from)));
          points.add(Math.max(0, Math.min(block.text.length, f.to)));
        }
        const sorted = Array.from(points).sort((a, b) => a - b);
        for (let i = 0; i < sorted.length - 1; i++) {
          const segStart = sorted[i];
          const segEnd = sorted[i + 1];
          if (segStart >= segEnd) continue;
          const segText = block.text.substring(segStart, segEnd);
          const segMarks: any[] = [];
          for (const f of block.formats) {
            if (f.from <= segStart && f.to >= segEnd) {
              if (f.type === 'color' && f.color) {
                segMarks.push(screenplaySchema.marks.color.create({ color: f.color }));
              } else if (screenplaySchema.marks[f.type]) {
                segMarks.push(screenplaySchema.marks[f.type].create());
              }
            }
          }
          textNodes.push(screenplaySchema.text(segText, segMarks));
        }
      } else {
        textNodes.push(screenplaySchema.text(block.text));
      }
    }

    const pmBlock = screenplaySchema.nodes.screenplay_block.create(
      {
        id: block.id || generateId(),
        type: block.type,
        contd: false,
      },
      textNodes.length > 0 ? textNodes : undefined
    );
    blockNodes.push(pmBlock);
  }

  // Ensure at least one block exists
  if (blockNodes.length === 0) {
    const initialBlock = screenplaySchema.nodes.screenplay_block.create({
      id: generateId(),
      type: 'action',
      contd: false,
    });
    blockNodes.push(initialBlock);
  }

  return screenplaySchema.nodes.doc.create(null, blockNodes);
}

/**
 * Convert a ProseMirror Document Node back to domain ScriptDraft blocks
 */
export function proseMirrorDocToDraft(doc: PMNode, originalDraft: ScriptDraft): ScriptDraft {
  const blocks: ScreenplayBlock[] = [];

  doc.forEach((child) => {
    if (child.type.name === 'screenplay_block') {
      const id = child.attrs.id || generateId();
      const type = child.attrs.type as ScreenplayBlockType;
      const text = child.textContent;

      const formats: InlineFormat[] = [];
      let offset = 0;
      child.forEach((inlineNode) => {
        if (inlineNode.isText && inlineNode.text) {
          const from = offset;
          const to = offset + inlineNode.text.length;
          for (const mark of inlineNode.marks) {
            if (mark.type.name === 'color') {
              formats.push({
                type: 'color',
                from,
                to,
                color: mark.attrs.color,
              });
            } else if (['bold', 'italic', 'underline', 'strikethrough'].includes(mark.type.name)) {
              formats.push({
                type: mark.type.name as any,
                from,
                to,
              });
            }
          }
          offset = to;
        }
      });

      blocks.push({
        id,
        type,
        text,
        formats: formats.length > 0 ? formats : undefined,
      });
    }
  });

  return {
    ...originalDraft,
    modifiedAt: new Date().toISOString(),
    blocks: blocks.length > 0 ? blocks : [{ id: generateId(), type: 'action', text: '' }],
  };
}
