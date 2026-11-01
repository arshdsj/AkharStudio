/**
 * schema.ts - ProseMirror Screenplay Schema
 * Governing IDs: MODEL-01, MODEL-03, EDIT-01, PAGE-02, ARCH-02, ARCH-05
 */

import { Schema, NodeSpec, MarkSpec, DOMOutputSpec } from 'prosemirror-model';
import { ScreenplayBlockType } from '../../types/screenplay';

// Helper to render block DOM based on type and indentation
const blockDOM = (type: ScreenplayBlockType, id: string, contd: boolean): DOMOutputSpec => {
  let className = `screenplay-block block-${type.replace('_', '-')}`;
  if (contd) className += ' has-contd';

  return [
    'div',
    {
      'data-block-id': id,
      'data-block-type': type,
      'data-contd': contd ? 'true' : 'false',
      class: className,
    },
    0, // Content hole
  ];
};

const nodes: { [key: string]: NodeSpec } = {
  doc: {
    content: 'screenplay_block+',
  },

  screenplay_block: {
    content: 'inline*',
    group: 'block',
    attrs: {
      id: { default: '' },
      type: { default: 'action' as ScreenplayBlockType },
      contd: { default: false },
    },
    parseDOM: [
      {
        tag: 'div[data-block-type]',
        getAttrs(dom) {
          const el = dom as HTMLElement;
          return {
            id: el.getAttribute('data-block-id') || '',
            type: (el.getAttribute('data-block-type') as ScreenplayBlockType) || 'action',
            contd: el.getAttribute('data-contd') === 'true',
          };
        },
      },
    ],
    toDOM(node) {
      return blockDOM(node.attrs.type, node.attrs.id, node.attrs.contd);
    },
  },

  text: {
    group: 'inline',
  },
};

const marks: { [key: string]: MarkSpec } = {
  bold: {
    parseDOM: [{ tag: 'strong' }, { tag: 'b' }, { style: 'font-weight=bold' }],
    toDOM() {
      return ['strong', 0];
    },
  },
  italic: {
    parseDOM: [{ tag: 'em' }, { tag: 'i' }, { style: 'font-style=italic' }],
    toDOM() {
      return ['em', 0];
    },
  },
  underline: {
    parseDOM: [{ tag: 'u' }, { style: 'text-decoration=underline' }],
    toDOM() {
      return ['u', 0];
    },
  },
  strikethrough: {
    parseDOM: [{ tag: 's' }, { tag: 'del' }, { style: 'text-decoration=line-through' }],
    toDOM() {
      return ['s', 0];
    },
  },
  color: {
    attrs: {
      color: { default: '#eab308' },
    },
    parseDOM: [
      {
        style: 'color',
        getAttrs: (value) => ({ color: value }),
      },
      {
        tag: 'span[data-color]',
        getAttrs: (dom) => ({
          color: (dom as HTMLElement).getAttribute('data-color') || (dom as HTMLElement).style.color,
        }),
      },
    ],
    toDOM(mark) {
      return ['span', { style: `color: ${mark.attrs.color}`, 'data-color': mark.attrs.color }, 0];
    },
  },
};

export const screenplaySchema = new Schema({
  nodes,
  marks,
});
