/**
 * phase1-lifecycle.test.ts - Automated test suite for Phase 1 (W1 & W1b)
 * Verifies: T-01, T-09, T-10, T-16, MODEL-01, MODEL-02, DRAFT-01, TITLE-01, TITLE-02,
 * STORE-01, SAVE-01, REL-01, ERR-01, STAT-01, PAGE-01, PAGE-03
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import {
  createDefaultProject,
  cloneDraft,
  deleteDraft,
  getActiveDraft,
  updateProjectTitle,
  calculateScreenplayStats,
  validateScriptProject,
  CURRENT_SCHEMA_VERSION,
} from '../src/core/model/ProjectModel';
import { FileSystemManager } from '../src/core/storage/FileSystemManager';

describe('Phase 1: Project Lifecycle & Data Model (W1 & W1b)', () => {
  let tempDir: string;
  let fsManager: FileSystemManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'punjabi-script-test-'));
    fsManager = new FileSystemManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('T-01: Fresh Project Initial State (MODEL-02, PAGE-03, STAT-01)', () => {
    it('creates fresh project with exact specification defaults', () => {
      const project = createDefaultProject();

      // Project title: Template Script (MODEL-02)
      expect(project.title).toBe('Template Script');
      expect(project.metadata.title).toBe('Template Script');

      // Drafts: exactly 1 draft, named 'Main Draft', isMain: true
      expect(project.drafts).toHaveLength(1);
      const mainDraft = project.drafts[0];
      expect(mainDraft.name).toBe('Main Draft');
      expect(mainDraft.isMain).toBe(true);

      // Initial block: one empty Action block (MODEL-02)
      expect(mainDraft.blocks).toHaveLength(1);
      expect(mainDraft.blocks[0].type).toBe('action');
      expect(mainDraft.blocks[0].text).toBe('');

      // Paper default: US Letter (PAGE-01, DEC-014)
      expect(project.settings.paperSize).toBe('letter');

      // Spellcheck off by default (DEC-020)
      expect(project.settings.spellcheck).toBe(false);

      // Stats: 0 words, 1 / 1 page counter (PAGE-03, STAT-01)
      const stats = calculateScreenplayStats(mainDraft);
      expect(stats.wordCount).toBe(0);
      expect(stats.pageCount).toBe(1);
    });
  });

  describe('T-10: Draft Management & Provenance (DRAFT-01)', () => {
    it('clones selected draft with independent block IDs and provenance', () => {
      const project = createDefaultProject();
      const mainDraft = getActiveDraft(project);
      mainDraft.blocks[0].text = 'INT. GOLDEN TEMPLE - DAY';

      const updatedProject = cloneDraft(project, mainDraft.id, 'Draft 2');

      expect(updatedProject.drafts).toHaveLength(2);
      expect(updatedProject.activeDraftId).not.toBe(mainDraft.id);

      const clonedDraft = updatedProject.drafts[1];
      expect(clonedDraft.name).toBe('Draft 2');
      expect(clonedDraft.isMain).toBe(false);
      expect(clonedDraft.sourceDraftId).toBe(mainDraft.id);

      // Content copied accurately
      expect(clonedDraft.blocks).toHaveLength(1);
      expect(clonedDraft.blocks[0].text).toBe('INT. GOLDEN TEMPLE - DAY');

      // Block IDs are independent
      expect(clonedDraft.blocks[0].id).not.toBe(mainDraft.blocks[0].id);

      // Editing cloned draft does not mutate original draft
      clonedDraft.blocks[0].text = 'EXT. AMRITSAR STREET - NIGHT';
      expect(mainDraft.blocks[0].text).toBe('INT. GOLDEN TEMPLE - DAY');
    });

    it('removes individual draft tabs cleanly and updates active draft (DRAFT-01)', () => {
      const project = createDefaultProject();
      const mainDraft = getActiveDraft(project);
      const withDraft2 = cloneDraft(project, mainDraft.id, 'Draft 2');
      const draft2Id = withDraft2.drafts[1].id;

      expect(withDraft2.drafts).toHaveLength(2);
      expect(withDraft2.activeDraftId).toBe(draft2Id);

      // Delete Draft 2
      const afterDelete = deleteDraft(withDraft2, draft2Id);
      expect(afterDelete.drafts).toHaveLength(1);
      expect(afterDelete.drafts[0].id).toBe(mainDraft.id);
      expect(afterDelete.activeDraftId).toBe(mainDraft.id);

      // Attempting to delete the only draft throws an error
      expect(() => deleteDraft(afterDelete, mainDraft.id)).toThrow(/Cannot delete the only remaining draft/i);
    });
  });

  describe('TITLE-01 & TITLE-02: Title Card & Synchronization', () => {
    it('updates title across project model and metadata card', () => {
      const project = createDefaultProject();
      const updated = updateProjectTitle(project, 'ਅੰਮ੍ਰਿਤ ਵੇਲਾ (AMRIT VELA)');

      expect(updated.title).toBe('ਅੰਮ੍ਰਿਤ ਵੇਲਾ (AMRIT VELA)');
      expect(updated.metadata.title).toBe('ਅੰਮ੍ਰਿਤ ਵੇਲਾ (AMRIT VELA)');
      expect(updated.revision).toBe(project.revision + 1);
    });
  });

  describe('STAT-01 & I18N-01: Screenplay Unicode Word Count', () => {
    it('correctly counts Punjabi (Gurmukhi) words and punctuation', () => {
      const draft = createDefaultProject().drafts[0];
      draft.blocks = [
        { id: '1', type: 'character', text: 'ਗੁਰਪ੍ਰੀਤ' },
        { id: '2', type: 'dialogue', text: 'ਕਿੱਥੇ ਚੱਲੇ ਹੋ ਤੁਸੀਂ? ਪੰਜਾਬ ਵਾਪਸ ਜਾਣਾ ਹੈ।' },
        { id: '3', type: 'action', text: 'He steps outside into the rain.' },
      ];

      const stats = calculateScreenplayStats(draft);
      // ਗੁਰਪ੍ਰੀਤ (1) + ਕਿੱਥੇ ਚੱਲੇ ਹੋ ਤੁਸੀਂ ਪੰਜਾਬ ਵਾਪਸ ਜਾਣਾ ਹੈ (8) + He steps outside into the rain (6) = 15 words
      expect(stats.wordCount).toBe(15);
      expect(stats.sceneCount).toBe(0);
    });
  });

  describe('STORE-01 & SAFE-01: Atomic File Saving', () => {
    it('saves project atomically to disk without corrupting existing data', async () => {
      const testFile = path.join(tempDir, 'sample_screenplay.scriptproject');
      const project = createDefaultProject();
      project.title = 'Punjab 1984';

      await fsManager.saveProjectAtomic(testFile, project);
      expect(fs.existsSync(testFile)).toBe(true);

      const loaded = await fsManager.openProject(testFile);
      expect(loaded.title).toBe('Punjab 1984');
      expect(loaded.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(loaded.lastSavedRevision).toBe(project.revision);
    });

    it('manages recent projects list accurately', async () => {
      const testFile = path.join(tempDir, 'my_script.scriptproject');
      const project = createDefaultProject();
      await fsManager.saveProjectAtomic(testFile, project);

      const recents = await fsManager.getRecentProjects();
      expect(recents.length).toBeGreaterThan(0);
      expect(recents[0].filePath).toBe(testFile);
      expect(recents[0].title).toBe(project.title);
    });
  });

  describe('REL-01: Volatile Autosave & Crash Recovery', () => {
    it('writes and recovers volatile recovery snapshot', async () => {
      const project = createDefaultProject();
      project.title = 'Unsaved Masterpiece';
      project.drafts[0].blocks[0].text = 'Action scene written right before crash.';

      // Save volatile recovery snapshot
      await fsManager.saveRecoverySnapshot(project);

      // Verify recovery detection
      const recovered = await fsManager.checkRecoverySnapshot();
      expect(recovered).not.toBeNull();
      expect(recovered?.project.title).toBe('Unsaved Masterpiece');
      expect(recovered?.project.drafts[0].blocks[0].text).toBe(
        'Action scene written right before crash.'
      );

      // Clean recovery snapshot
      await fsManager.clearRecoverySnapshot();
      const afterClear = await fsManager.checkRecoverySnapshot();
      expect(afterClear).toBeNull();
    });
  });

  describe('T-16 & ARCH-05: Schema Validation & Corrupt Data Rejection', () => {
    it('rejects corrupt JSON objects and missing fields safely', () => {
      expect(() => validateScriptProject(null)).toThrow('expected a JSON object');
      expect(() => validateScriptProject({})).toThrow('missing schemaVersion');
      expect(() =>
        validateScriptProject({ schemaVersion: 999, title: 'Future', drafts: [] })
      ).toThrow('newer schema version');
      expect(() =>
        validateScriptProject({ schemaVersion: 1, title: '', drafts: [] })
      ).toThrow('missing or empty title');
      expect(() =>
        validateScriptProject({ schemaVersion: 1, title: 'Valid', drafts: [] })
      ).toThrow('drafts must be a non-empty array');
    });

    it('rejects opening a non-existent file with clean error message', async () => {
      await expect(fsManager.openProject('/non/existent/path.scriptproject')).rejects.toThrow(
        'does not exist'
      );
    });
  });
});
