/**
 * projectBundle.ts - Native .scriptproject Import/Export Bundle Manager
 * Baseline: V9.1, STORE-02, T-11, TM-14
 */

import { ScriptProject } from '../../types/screenplay';

/**
 * Serializes a ScriptProject to a formatted JSON bundle string.
 */
export function exportProjectBundle(project: ScriptProject): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Validates and parses a raw JSON string into a ScriptProject.
 * Applies strict NFC normalization and optionally forks into a new project with fresh IDs (STORE-02).
 */
export function importProjectBundle(
  jsonString: string,
  asNewProject: boolean = false
): ScriptProject {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('Invalid project bundle: Empty or non-string payload.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Invalid JSON in project bundle: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Schema validation
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid project bundle: Root must be a JSON object.');
  }

  if (typeof parsed.title !== 'string') {
    throw new Error('Invalid project bundle: Missing or invalid "title" field.');
  }

  if (!Array.isArray(parsed.drafts) || parsed.drafts.length === 0) {
    throw new Error('Invalid project bundle: Missing or empty "drafts" array.');
  }

  // NFC Normalization recursive walker (TM-14)
  const normalizeNFC = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.normalize('NFC');
    }
    if (Array.isArray(obj)) {
      return obj.map(normalizeNFC);
    }
    if (obj !== null && typeof obj === 'object') {
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        out[k] = normalizeNFC(v);
      }
      return out;
    }
    return obj;
  };

  const normalized = normalizeNFC(parsed) as ScriptProject;

  // Validate drafts and blocks structure
  for (const draft of normalized.drafts) {
    if (!draft.id || !draft.name || !Array.isArray(draft.blocks)) {
      throw new Error(`Invalid draft structure in project bundle: Draft ID ${draft.id || 'unknown'}`);
    }
    for (const block of draft.blocks) {
      if (!block.id || !block.type || typeof block.text !== 'string') {
        throw new Error(`Invalid block structure in draft ${draft.name}`);
      }
    }
  }

  // If importing as a new project (STORE-02), regenerate IDs and timestamps
  if (asNewProject) {
    const now = new Date().toISOString();
    const newProjectId = 'proj_' + Math.random().toString(36).substring(2, 10);
    const idMap = new Map<string, string>();

    const newDrafts = normalized.drafts.map((d) => {
      const newDraftId = 'draft_' + Math.random().toString(36).substring(2, 10);
      idMap.set(d.id, newDraftId);
      return {
        ...d,
        id: newDraftId,
        createdAt: now,
        modifiedAt: now,
      };
    });

    const newActiveDraftId = idMap.get(normalized.activeDraftId) || newDrafts[0].id;

    return {
      ...normalized,
      id: newProjectId,
      title: `${normalized.title} (Copy)`,
      drafts: newDrafts,
      activeDraftId: newActiveDraftId,
      revision: 1,
      lastSavedRevision: 0,
    };
  }

  return normalized;
}
