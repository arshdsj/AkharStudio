/**
 * searchPlugin.ts - ProseMirror In-Draft Search Plugin (ORG-04 P0, T-12, TM-14)
 * Provides non-destructive match highlighting, next/previous navigation,
 * case-sensitivity, and whole-word matching across Punjabi and English text.
 */

import { Plugin, PluginKey, EditorState, Transaction, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';

export interface SearchMatch {
  from: number;
  to: number;
  text: string;
}

export interface SearchState {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  matches: SearchMatch[];
  activeIndex: number; // 0-indexed; -1 if no matches
}

export const searchPluginKey = new PluginKey<SearchState>('screenplaySearchPlugin');

/**
 * Normalizes text to NFC and finds all occurrences of query in block text.
 * Uses Unicode-aware boundary checking for wholeWord matching across Latin and Gurmukhi.
 */
export function findMatchesInDoc(
  doc: any,
  query: string,
  caseSensitive: boolean,
  wholeWord: boolean
): SearchMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matches: SearchMatch[] = [];
  const normalizedQuery = trimmed.normalize('NFC');

  // Build regex pattern
  let pattern = escapeRegExp(normalizedQuery);
  if (wholeWord) {
    // Unicode-aware word boundary: preceded and followed by boundary/whitespace/punctuation
    pattern = `(?<=^|[\\s\\p{P}])${pattern}(?=$|[\\s\\p{P}])`;
  }

  const flags = caseSensitive ? 'gu' : 'giu';
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    // Fallback if lookbehind is not supported in some environment
    regex = new RegExp(escapeRegExp(normalizedQuery), caseSensitive ? 'g' : 'gi');
  }

  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      const text = node.text.normalize('NFC');
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const from = pos + match.index;
        const to = from + match[0].length;
        matches.push({
          from,
          to,
          text: match[0],
        });
        if (!regex.global) break;
      }
    }
  });

  return matches;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates the ProseMirror search plugin.
 */
export function createSearchPlugin(
  onSearchStateChange?: (state: SearchState) => void
): Plugin<SearchState> {
  return new Plugin<SearchState>({
    key: searchPluginKey,
    state: {
      init(): SearchState {
        return {
          query: '',
          caseSensitive: false,
          wholeWord: false,
          matches: [],
          activeIndex: -1,
        };
      },
      apply(tr: Transaction, prev: SearchState, _oldState: EditorState, newState: EditorState): SearchState {
        const meta = tr.getMeta(searchPluginKey);

        if (meta !== undefined) {
          const nextState: SearchState = {
            ...prev,
            ...meta,
          };

          // Re-calculate matches if query or options changed
          if (
            meta.query !== undefined ||
            meta.caseSensitive !== undefined ||
            meta.wholeWord !== undefined
          ) {
            nextState.matches = findMatchesInDoc(
              newState.doc,
              nextState.query,
              nextState.caseSensitive,
              nextState.wholeWord
            );
            nextState.activeIndex = nextState.matches.length > 0 ? 0 : -1;
          }

          if (onSearchStateChange) {
            onSearchStateChange(nextState);
          }
          return nextState;
        }

        // If document changed while a search is active, re-calculate matches
        if (tr.docChanged && prev.query) {
          const matches = findMatchesInDoc(
            newState.doc,
            prev.query,
            prev.caseSensitive,
            prev.wholeWord
          );
          let activeIndex = prev.activeIndex;
          if (matches.length === 0) {
            activeIndex = -1;
          } else if (activeIndex >= matches.length) {
            activeIndex = matches.length - 1;
          }
          const nextState: SearchState = {
            ...prev,
            matches,
            activeIndex,
          };
          if (onSearchStateChange) {
            onSearchStateChange(nextState);
          }
          return nextState;
        }

        return prev;
      },
    },
    props: {
      decorations(state: EditorState) {
        const searchState = searchPluginKey.getState(state);
        if (!searchState || !searchState.query || searchState.matches.length === 0) {
          return DecorationSet.empty;
        }

        const decos = searchState.matches.map((m, idx) => {
          const isActive = idx === searchState.activeIndex;
          return Decoration.inline(m.from, m.to, {
            class: isActive ? 'search-match search-match-active' : 'search-match',
            style: isActive
              ? 'background-color: #f59e0b; color: #000000; font-weight: bold; border-radius: 2px; padding: 1px 2px;'
              : 'background-color: rgba(245, 158, 11, 0.4); border-radius: 2px; padding: 1px 2px;',
          });
        });

        return DecorationSet.create(state.doc, decos);
      },
    },
  });
}

/**
 * Dispatches a transaction to update search parameters.
 */
export function setSearchQuery(
  view: EditorView,
  query: string,
  caseSensitive?: boolean,
  wholeWord?: boolean
) {
  const current = searchPluginKey.getState(view.state) || {
    caseSensitive: false,
    wholeWord: false,
  };
  const tr = view.state.tr.setMeta(searchPluginKey, {
    query,
    caseSensitive: caseSensitive !== undefined ? caseSensitive : current.caseSensitive,
    wholeWord: wholeWord !== undefined ? wholeWord : current.wholeWord,
  });
  view.dispatch(tr);
}

/**
 * Navigates to the next search match.
 */
export function findNextMatch(view: EditorView) {
  const current = searchPluginKey.getState(view.state);
  if (!current || current.matches.length === 0) return;

  const nextIndex = (current.activeIndex + 1) % current.matches.length;
  const match = current.matches[nextIndex];

  const tr = view.state.tr.setMeta(searchPluginKey, {
    activeIndex: nextIndex,
  });

  try {
    tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
  } catch {
    // Fallback if position changed
  }

  tr.scrollIntoView();
  view.dispatch(tr);
}

/**
 * Navigates to the previous search match.
 */
export function findPrevMatch(view: EditorView) {
  const current = searchPluginKey.getState(view.state);
  if (!current || current.matches.length === 0) return;

  const prevIndex =
    current.activeIndex <= 0 ? current.matches.length - 1 : current.activeIndex - 1;
  const match = current.matches[prevIndex];

  const tr = view.state.tr.setMeta(searchPluginKey, {
    activeIndex: prevIndex,
  });

  try {
    tr.setSelection(TextSelection.create(tr.doc, match.from, match.to));
  } catch {
    // Fallback if position changed
  }

  tr.scrollIntoView();
  view.dispatch(tr);
}

/**
 * Clears search and removes all highlights.
 */
export function clearSearch(view: EditorView) {
  const tr = view.state.tr.setMeta(searchPluginKey, {
    query: '',
    matches: [],
    activeIndex: -1,
  });
  view.dispatch(tr);
}
