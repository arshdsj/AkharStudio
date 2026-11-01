/**
 * schema.ts - ProseMirror Screenplay Schema
 * Governing IDs: MODEL-01, MODEL-03, EDIT-01, PAGE-02, ARCH-02, ARCH-05
 */

import { Schema, NodeSpec, MarkSpec, DOMOutputSpec } from 'prosemirror-model';
import { ScreenplayBlockType } from '../../types/screenplay';

// Helper to render block DOM based on type and indentation
const blockDOM = (
  type: ScreenplayBlockType,
  id: string,
  contd: boolean,
  annotation?: string,
  comment?: string
): DOMOutputSpec => {
  let className = `screenplay-block block-${type.replace('_', '-')}`;
  if (contd) className += ' has-contd';

  const attrs: Record<string, string> = {
    'data-block-id': id,
    'data-block-type': type,
    'data-contd': contd ? 'true' : 'false',
    class: className,
  };

  if (annotation) attrs['data-annotation'] = annotation;
  if (comment) attrs['data-comment'] = comment;

  return ['div', attrs, 0];
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
      annotation: { default: '' },
      comment: { default: '' },
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
            annotation: el.getAttribute('data-annotation') || '',
            comment: el.getAttribute('data-comment') || '',
          };
        },
      },
    ],
    toDOM(node) {
      return blockDOM(
        node.attrs.type,
        node.attrs.id,
        node.attrs.contd,
        node.attrs.annotation,
        node.attrs.comment
      );
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
  highlight: {
    attrs: {
      color: { default: 'rgba(234, 179, 8, 0.35)' },
    },
    parseDOM: [
      {
        tag: 'mark',
        getAttrs: (dom) => ({
          color: (dom as HTMLElement).getAttribute('data-highlight') || 'rgba(234, 179, 8, 0.35)',
        }),
      },
      {
        style: 'background-color',
        getAttrs: (value) => ({ color: value }),
      },
      {
        tag: 'span[data-highlight]',
        getAttrs: (dom) => ({
          color: (dom as HTMLElement).getAttribute('data-highlight') || (dom as HTMLElement).style.backgroundColor,
        }),
      },
    ],
    toDOM(mark) {
      return [
        'mark',
        {
          style: `background-color: ${mark.attrs.color}; color: inherit; border-radius: 2px; padding: 1px 3px; -webkit-box-decoration-break: clone; box-decoration-break: clone;`,
          'data-highlight': mark.attrs.color,
        },
        0,
      ];
    },
  },
  link: {
    attrs: {
      href: { default: '' },
      title: { default: null },
    },
    inclusive: false,
    parseDOM: [
      {
        tag: 'a[href]',
        getAttrs(dom) {
          const el = dom as HTMLElement;
          return {
            href: el.getAttribute('href') || '',
            title: el.getAttribute('title') || null,
          };
        },
      },
    ],
    toDOM(node) {
      return [
        'a',
        {
          href: node.attrs.href,
          title: node.attrs.title || node.attrs.href,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'screenplay-link',
          style: 'color: var(--text-accent); text-decoration: underline; cursor: pointer;',
        },
        0,
      ];
    },
  },
};

export const screenplaySchema = new Schema({
  nodes,
  marks,
});
