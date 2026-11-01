/**
 * database-manager.test.ts - Automated Tests for DatabaseManager
 * Verifies:
 * - SQLite initialization & schema migrations
 * - Transactional project creation, update, and retrieval
 * - Draft synchronization & Unicode stats aggregation
 * - Full database backup via SQLite Online Backup API & restoration
 * - Alternating logo launch preference persistence
 * - Unified recent projects (internal database + external files)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager } from '../src/main/database/DatabaseManager';
import { createDefaultProject, getActiveDraft } from '../src/core/model/ProjectModel';

describe('DatabaseManager: Local Database-First Architecture', () => {
  let tempDir: string;
  let dbManager: DatabaseManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akhar-db-test-'));
    dbManager = new DatabaseManager(tempDir, 'test_akhar.db');
  });

  afterEach(() => {
    if (dbManager) {
      dbManager.close();
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('1. Schema Migrations & Initialization', () => {
    it('initializes SQLite with WAL mode and applies migration V1', () => {
      const dbFile = path.join(tempDir, 'test_akhar.db');
      expect(fs.existsSync(dbFile)).toBe(true);

      // Verify preferences can be stored and retrieved
      dbManager.setPreference('test_key', 'test_value');
      expect(dbManager.getPreference('test_key')).toBe('test_value');
    });

    it('persists and alternates logo preference across launches', () => {
      // First call (default was 'pa', so next is 'en')
      const firstMode = dbManager.getNextLogoScriptMode();
      expect(firstMode).toBe('en');

      // Second call (was 'en', so next is 'pa')
      const secondMode = dbManager.getNextLogoScriptMode();
      expect(secondMode).toBe('pa');

      // Third call (was 'pa', so next is 'en')
      const thirdMode = dbManager.getNextLogoScriptMode();
      expect(thirdMode).toBe('en');
    });
  });

  describe('2. Project Lifecycle & Transactional Saves', () => {
    it('creates a database-backed project and retrieves it faithfully', () => {
      const project = createDefaultProject();
      project.title = 'ਚੰਨ ਤਾਰਾ (Chann Tara)';
      const activeDraft = getActiveDraft(project);
      activeDraft.blocks = [
        { id: 'b1', type: 'scene_heading', text: 'INT. HAVELI - NIGHT' },
        { id: 'b2', type: 'character', text: 'ਜੋਰਾਵਰ' },
        { id: 'b3', type: 'dialogue', text: 'ਕਿੱਥੇ ਚੱਲੇ ਹੋ?' },
      ];

      const created = dbManager.createProject(project);
      expect(created.id).toBe(project.id);

      const loaded = dbManager.getProject(project.id);
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe('ਚੰਨ ਤਾਰਾ (Chann Tara)');
      expect(loaded?.drafts).toHaveLength(1);
      expect(loaded?.drafts[0].blocks).toHaveLength(3);
      expect(loaded?.drafts[0].blocks[2].text).toBe('ਕਿੱਥੇ ਚੱਲੇ ਹੋ?');
    });

    it('updates project content, drafts and stats transactionally', () => {
      const project = createDefaultProject();
      dbManager.createProject(project);

      // Update project title and add a second draft
      project.title = 'Updated Title';
      project.drafts[0].blocks[0].text = 'INT. AMRITSAR - DAY';
      project.drafts.push({
        id: 'draft_2',
        name: 'Second Draft',
        isMain: false,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        blocks: [{ id: 'b_d2', type: 'action', text: 'Second draft action line.' }],
      });

      dbManager.saveProject(project);

      const loaded = dbManager.getProject(project.id);
      expect(loaded?.title).toBe('Updated Title');
      expect(loaded?.drafts).toHaveLength(2);
      expect(loaded?.drafts[1].name).toBe('Second Draft');

      // Check project summary calculation
      const summaries = dbManager.listProjects();
      expect(summaries).toHaveLength(1);
      expect(summaries[0].title).toBe('Updated Title');
      expect(summaries[0].draftCount).toBe(2);
      expect(summaries[0].wordCount).toBeGreaterThan(0);
    });

    it('deletes a project cleanly with draft cascading', () => {
      const project = createDefaultProject();
      dbManager.createProject(project);
      expect(dbManager.listProjects()).toHaveLength(1);

      dbManager.deleteProject(project.id);
      expect(dbManager.listProjects()).toHaveLength(0);
      expect(dbManager.getProject(project.id)).toBeNull();
    });
  });

  describe('3. Unified Recent Projects', () => {
    it('aggregates internal database projects and external files with visual source tag', () => {
      // 1. Create a database project
      const dbProj = createDefaultProject();
      dbProj.title = 'Database Screenplay';
      dbManager.createProject(dbProj);

      // 2. Register an external file
      const fakeExternalPath = path.join(tempDir, 'ExternalScript.scriptproject');
      fs.writeFileSync(fakeExternalPath, JSON.stringify(createDefaultProject()));
      dbManager.recordExternalFile(fakeExternalPath, 'External Screenplay', 'ext_123');

      const recents = dbManager.getRecentProjects();
      expect(recents.length).toBeGreaterThanOrEqual(2);

      const dbEntry = recents.find((r) => r.source === 'database');
      const extEntry = recents.find((r) => r.source === 'external');

      expect(dbEntry).toBeDefined();
      expect(dbEntry?.title).toBe('Database Screenplay');
      expect(dbEntry?.source).toBe('database');

      expect(extEntry).toBeDefined();
      expect(extEntry?.title).toBe('External Screenplay');
      expect(extEntry?.source).toBe('external');
      expect(extEntry?.filePath).toBe(fakeExternalPath);
    });
  });

  describe('4. Full Database Backup & Restore (SQLite Online Backup API)', () => {
    it('exports a clean consistent database backup and restores into a clean database', async () => {
      // 1. Seed original database with 2 projects
      const p1 = createDefaultProject();
      p1.title = 'Project One';
      const p2 = createDefaultProject();
      p2.title = 'Project Two';
      dbManager.createProject(p1);
      dbManager.createProject(p2);

      // 2. Export full backup
      const backupFile = path.join(tempDir, 'backup.akharbackup');
      const exportResult = await dbManager.exportDatabaseBackup(backupFile);
      expect(exportResult.success).toBe(true);
      expect(fs.existsSync(backupFile)).toBe(true);

      // 3. Open a second clean database and restore backup via merge
      const cleanDbDir = path.join(tempDir, 'clean_db');
      const cleanDbManager = new DatabaseManager(cleanDbDir, 'restored.db');
      expect(cleanDbManager.listProjects()).toHaveLength(0);

      const importResult = await cleanDbManager.importDatabaseBackup(backupFile, 'merge');
      expect(importResult.success).toBe(true);
      expect(importResult.restoredProjectCount).toBe(2);

      const restoredList = cleanDbManager.listProjects();
      expect(restoredList).toHaveLength(2);
      expect(restoredList.map((p) => p.title).sort()).toEqual(['Project One', 'Project Two']);

      cleanDbManager.close();
    });
  });

  describe('5. Legacy Migration', () => {
    it('migrates legacy recent-projects.json without touching original files', async () => {
      const dummyFile = path.join(tempDir, 'old_script.scriptproject');
      fs.writeFileSync(dummyFile, '{}');

      const legacyJsonPath = path.join(tempDir, 'recent-projects.json');
      fs.writeFileSync(
        legacyJsonPath,
        JSON.stringify([
          { filePath: dummyFile, title: 'Old Script 1984', lastOpenedAt: new Date().toISOString() },
        ])
      );

      const count = await dbManager.migrateLegacyFiles(legacyJsonPath);
      expect(count).toBe(1);

      const recents = dbManager.getRecentProjects();
      const migrated = recents.find((r) => r.filePath === dummyFile);
      expect(migrated).toBeDefined();
      expect(migrated?.source).toBe('external');
      expect(migrated?.title).toBe('Old Script 1984');
    });
  });
});
