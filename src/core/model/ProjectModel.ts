/**
 * ProjectModel.ts - Domain logic for ScriptProject lifecycle
 * Governing IDs: MODEL-01, MODEL-02, DRAFT-01, TITLE-01, TITLE-02, STAT-01, PAGE-03, ARCH-02, ARCH-05
 */

import {
  ScriptProject,
  ScriptDraft,
  ScreenplayBlock,
  ScreenplayStats,
} from '../../types/screenplay';

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Generate a unique random ID
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

/**
 * Create a fresh default project (MODEL-02, T-01)
 * Default document: project title "Template Script", ✧ Master Draft, title card, one focused empty Action block
 */
export function createDefaultProject(): ScriptProject {
  const mainDraftId = generateId();
  const initialBlockId = generateId();

  const mainDraft: ScriptDraft = {
    id: mainDraftId,
    name: 'Master Draft',
    isMain: true,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    blocks: [
      {
        id: initialBlockId,
        type: 'action',
        text: '',
      },
    ],
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: generateId(),
    title: 'Template Script',
    metadata: {
      title: 'Template Script',
      author: '',
      basedOn: '',
      contact: '',
      rights: '',
    },
    settings: {
      paperSize: 'letter', // Default US Letter (PAGE-01, DEC-014)
      contdSetting: 'unasked', // CONT-01 tri-state
      language: 'pa',
      spellcheck: false, // Spellcheck off by default (DEC-020)
      showWordCount: true,
      highlightCharacters: {
        enabled: false,
        color: 'rgba(167, 139, 250, 0.35)',
        selectedCharacters: [],
      },
    },
    activeDraftId: mainDraftId,
    drafts: [mainDraft],
    revision: 1,
    lastSavedRevision: 1,
  };
}

/**
 * Calculate next available version number for a project (Stage 2)
 */
export function getNextVersionNumber(project: ScriptProject): number {
  let highest = 0;
  for (const draft of project.drafts) {
    const match =
      draft.name.match(/Version\s*(\d+)/i) ||
      draft.name.match(/^V(\d+)/i) ||
      draft.name.match(/Draft\s*(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highest) {
        highest = num;
      }
    }
  }
  return Math.max(highest + 1, project.drafts.length + 1);
}

/**
 * Format a human-friendly version display label (Stage 2)
 */
export function formatVersionDisplayName(draft: ScriptDraft, index: number): string {
  if (draft.name.startsWith('Version ') || draft.name.startsWith('V')) {
    return draft.name;
  }
  if (draft.isMain && (draft.name === 'Master Draft' || draft.name === 'Main Draft')) {
    return `Version 1 — Original`;
  }
  return `Version ${index + 1} — ${draft.name}`;
}

/**
 * Create a new independent Script Version cloned from the currently active version (Stage 2)
 */
export function createScriptVersion(
  project: ScriptProject,
  sourceDraftId: string,
  customVersionName?: string
): ScriptProject {
  const sourceDraft = project.drafts.find((d) => d.id === sourceDraftId);
  if (!sourceDraft) {
    throw new Error(`Source script version ${sourceDraftId} not found`);
  }

  const nextVerNumber = getNextVersionNumber(project);
  let versionName: string;
  if (customVersionName && customVersionName.trim()) {
    const trimmed = customVersionName.trim();
    if (trimmed.toLowerCase().startsWith('version ') || trimmed.toLowerCase().startsWith('v')) {
      versionName = trimmed;
    } else {
      versionName = `Version ${nextVerNumber} — ${trimmed}`;
    }
  } else {
    versionName = `Version ${nextVerNumber}`;
  }

  const newDraftId = generateId();

  // Deep clone all screenplay elements with fresh unique IDs
  const clonedBlocks: ScreenplayBlock[] = sourceDraft.blocks.map((block) => ({
    id: generateId(),
    type: block.type,
    text: block.text,
    formats: block.formats ? block.formats.map((f) => ({ ...f })) : undefined,
    notes: block.notes,
    comment: block.comment,
    annotationLayer: block.annotationLayer,
  }));

  const newDraft: ScriptDraft = {
    id: newDraftId,
    name: versionName,
    isMain: false,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    sourceDraftId: sourceDraft.id,
    blocks: clonedBlocks,
  };

  return {
    ...project,
    drafts: [...project.drafts, newDraft],
    activeDraftId: newDraftId, // Made active immediately per Stage 2.A
    revision: project.revision + 1,
  };
}

/**
 * Clone current active draft into a new independent draft tab (DRAFT-01)
 * + creates an independent new draft by copying selected draft content
 * into a new stable draft ID with source-draft provenance
 */
export function cloneDraft(project: ScriptProject, sourceDraftId: string, newDraftName?: string): ScriptProject {
  const sourceDraft = project.drafts.find((d) => d.id === sourceDraftId);
  if (!sourceDraft) {
    throw new Error(`Source draft ${sourceDraftId} not found`);
  }

  const newDraftId = generateId();
  const draftCount = project.drafts.length;
  const name = newDraftName || `Draft ${draftCount + 1}`;

  // Deep clone blocks with new stable IDs to ensure total editing independence
  const clonedBlocks: ScreenplayBlock[] = sourceDraft.blocks.map((block) => ({
    ...block,
    id: generateId(),
    formats: block.formats ? [...block.formats] : undefined,
  }));

  const newDraft: ScriptDraft = {
    id: newDraftId,
    name,
    isMain: false,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    sourceDraftId: sourceDraft.id,
    blocks: clonedBlocks,
  };

  return {
    ...project,
    drafts: [...project.drafts, newDraft],
    activeDraftId: newDraftId,
    revision: project.revision + 1,
  };
}

/**
 * Remove an individual draft tab from the project (DRAFT-01)
 * Prevents removal if only one draft remains.
 * Reassigns activeDraftId if the active draft is removed.
 */
export function deleteDraft(project: ScriptProject, draftId: string): ScriptProject {
  if (project.drafts.length <= 1) {
    throw new Error('Cannot delete the only remaining draft.');
  }

  const exists = project.drafts.some((d) => d.id === draftId);
  if (!exists) {
    return project;
  }

  const remainingDrafts = project.drafts.filter((d) => d.id !== draftId);
  let nextActiveDraftId = project.activeDraftId;

  if (nextActiveDraftId === draftId) {
    const mainDraft = remainingDrafts.find((d) => d.isMain);
    nextActiveDraftId = mainDraft ? mainDraft.id : remainingDrafts[0].id;
  }

  return {
    ...project,
    drafts: remainingDrafts,
    activeDraftId: nextActiveDraftId,
    revision: project.revision + 1,
  };
}

/**
 * Get active draft of project
 */
export function getActiveDraft(project: ScriptProject): ScriptDraft {
  const active = project.drafts.find((d) => d.id === project.activeDraftId);
  if (active) return active;
  if (project.drafts.length > 0) return project.drafts[0];
  throw new Error('Project contains no drafts');
}

/**
 * Update project title and synchronize with title card metadata (TITLE-01)
 */
export function updateProjectTitle(project: ScriptProject, title: string): ScriptProject {
  return {
    ...project,
    title,
    metadata: {
      ...project.metadata,
      title,
    },
    revision: project.revision + 1,
  };
}

/**
 * Calculate Unicode-aware word count and page statistics (STAT-01, PAGE-03)
 * Initial page counter shows 1 / 1 for a new blank draft.
 * Total excludes title page by default.
 */
export function calculateScreenplayStats(draft: ScriptDraft): ScreenplayStats {
  let wordCount = 0;
  let totalLines = 0;
  let sceneCount = 0;
  let characterCount = 0;

  for (const block of draft.blocks) {
    const text = block.text.trim();
    if (text.length > 0) {
      // Unicode-aware word tokenization: matches Gurmukhi, Latin, digits
      // Split on whitespace or punctuation
      const words = text.split(/[\s,.;:!?।॥—\-()[\]{}'"]+/).filter((w) => w.length > 0);
      wordCount += words.length;
      characterCount += text.length;

      // Approximate screenplay line estimation:
      // Action/Scene: ~60 chars/line
      // Dialogue: ~35 chars/line
      // Character/Parenthetical: ~25 chars/line
      let charsPerLine = 60;
      if (block.type === 'dialogue') charsPerLine = 35;
      else if (block.type === 'character' || block.type === 'parenthetical') charsPerLine = 25;

      const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
      totalLines += lines + 1; // + 1 for element margin
    } else {
      totalLines += 1;
    }

    if (block.type === 'scene_heading') {
      sceneCount++;
    }
  }

  // Standard screenplay page: ~54 lines per page
  // Minimum 1 page for blank draft (PAGE-03: initial page counter 1 / 1)
  const pageCount = Math.max(1, Math.ceil(totalLines / 54));

  return {
    wordCount,
    pageCount,
    characterCount,
    sceneCount,
  };
}

/**
 * Strict schema validator (ARCH-05, T-16)
 * Validates project structure and version compatibility before accepting file
 */
export function validateScriptProject(data: unknown): ScriptProject {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid project file: expected a JSON object');
  }

  const p = data as Record<string, unknown>;

  if (typeof p.schemaVersion !== 'number') {
    throw new Error('Invalid project file: missing schemaVersion');
  }

  if (p.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Project created with newer schema version (${p.schemaVersion} > ${CURRENT_SCHEMA_VERSION}). Please update the app.`
    );
  }

  if (typeof p.title !== 'string' || !p.title) {
    throw new Error('Invalid project file: missing or empty title');
  }

  if (!Array.isArray(p.drafts) || p.drafts.length === 0) {
    throw new Error('Invalid project file: drafts must be a non-empty array');
  }

  // Validate drafts
  for (const draft of p.drafts as Record<string, unknown>[]) {
    if (typeof draft.id !== 'string' || !draft.id) {
      throw new Error('Invalid draft in project: missing ID');
    }
    if (typeof draft.name !== 'string' || !draft.name) {
      throw new Error('Invalid draft in project: missing name');
    }
    if (!Array.isArray(draft.blocks)) {
      throw new Error(`Draft ${draft.id} blocks must be an array`);
    }
    for (const block of draft.blocks as Record<string, unknown>[]) {
      if (typeof block.id !== 'string' || typeof block.type !== 'string' || typeof block.text !== 'string') {
        throw new Error(`Invalid screenplay block in draft ${draft.id}`);
      }
    }
  }

  return p as unknown as ScriptProject;
}
