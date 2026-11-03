/**
 * stage1-autosave-lifecycle.test.ts - Automated Unit & Integration Tests for Stage 1
 * Autosave, Session Recovery, Close Confirmation & macOS Lifecycle
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DatabaseManager } from '../src/main/database/DatabaseManager';
import { createDefaultProject, getActiveDraft } from '../src/core/model/ProjectModel';
import { SessionRecoveryCheckpoint, ScriptProject } from '../src/types/screenplay';

describe('Stage 1: Autosave, Session Recovery & App Closing', () => {
  let tempDir: string;
  let dbManager: DatabaseManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akhar_stage1_test_'));
    dbManager = new DatabaseManager(tempDir, 'test_stage1.db');
  });

  afterEach(() => {
    try {
      dbManager.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('A. Clean Shutdown & Interrupted Session Detection (Stage 1.C)', () => {
    it('initializes with clean shutdown flag true by default', () => {
      expect(dbManager.isCleanShutdown()).toBe(true);
      expect(dbManager.getSessionRecovery()).toBeNull();
    });

    it('marks session as unclean when active and records recovery checkpoint', () => {
      // App starts up -> marks active session as unclean
      dbManager.setCleanShutdown(false);
      expect(dbManager.isCleanShutdown()).toBe(false);

      const project = createDefaultProject();
      project.title = 'In-Progress Crash Script';
      const activeDraft = getActiveDraft(project);

      const checkpoint: SessionRecoveryCheckpoint = {
        timestamp: new Date().toISOString(),
        projectId: project.id,
        projectTitle: project.title,
        activeDraftId: activeDraft.id,
        activeDraftName: activeDraft.name,
        activeSceneHeading: 'INT. COFFEE SHOP - DAY',
        projectSnapshot: project,
      };

      dbManager.saveSessionRecovery(checkpoint);

      // Verify checkpoint is stored durably
      const loadedCheckpoint = dbManager.getSessionRecovery();
      expect(loadedCheckpoint).not.toBeNull();
      expect(loadedCheckpoint?.projectTitle).toBe('In-Progress Crash Script');
      expect(loadedCheckpoint?.activeDraftName).toBe('Master Draft');
      expect(loadedCheckpoint?.activeSceneHeading).toBe('INT. COFFEE SHOP - DAY');
    });

    it('simulates unexpected termination (crash/kill) and detects interrupted session on next launch', () => {
      // 1. Session 1: App is running, writes checkpoint, crashes (does not call setCleanShutdown(true))
      dbManager.setCleanShutdown(false);
      const project = createDefaultProject();
      project.title = 'Unsaved Crash Screenplay';
      const draft = getActiveDraft(project);

      dbManager.saveSessionRecovery({
        timestamp: new Date().toISOString(),
        projectId: project.id,
        projectTitle: project.title,
        activeDraftId: draft.id,
        activeDraftName: draft.name,
        projectSnapshot: project,
      });

      // Close DB instance without setting clean shutdown (simulating crash)
      dbManager.close();

      // 2. Session 2: App launches anew
      const relaunchDb = new DatabaseManager(tempDir, 'test_stage1.db');
      const wasClean = relaunchDb.isCleanShutdown();
      const checkpoint = relaunchDb.getSessionRecovery();

      // Assert that crash was detected
      expect(wasClean).toBe(false);
      expect(checkpoint).not.toBeNull();
      expect(checkpoint?.projectTitle).toBe('Unsaved Crash Screenplay');

      // 3. User selects "Continue Session": restore state and clear checkpoint
      expect(checkpoint?.projectSnapshot.title).toBe('Unsaved Crash Screenplay');
      relaunchDb.clearSessionRecovery();
      expect(relaunchDb.getSessionRecovery()).toBeNull();

      relaunchDb.close();
    });

    it('does not display recovery prompt after a normal clean application shutdown', () => {
      // 1. Session 1: Running
      dbManager.setCleanShutdown(false);
      const project = createDefaultProject();
      dbManager.saveSessionRecovery({
        timestamp: new Date().toISOString(),
        projectId: project.id,
        projectTitle: project.title,
        activeDraftId: project.activeDraftId,
        projectSnapshot: project,
      });

      // User exits normally -> clean shutdown
      dbManager.setCleanShutdown(true);
      dbManager.clearSessionRecovery();
      dbManager.close();

      // 2. Session 2: Launch after normal exit
      const relaunchDb = new DatabaseManager(tempDir, 'test_stage1.db');
      expect(relaunchDb.isCleanShutdown()).toBe(true);
      expect(relaunchDb.getSessionRecovery()).toBeNull();
      relaunchDb.close();
    });

    it('discard recovery clears the checkpoint without deleting the user saved project in the database', () => {
      const project = createDefaultProject();
      project.title = 'Permanent Project';
      dbManager.createProject(project);

      // Create checkpoint for this project
      dbManager.saveSessionRecovery({
        timestamp: new Date().toISOString(),
        projectId: project.id,
        projectTitle: project.title,
        activeDraftId: project.activeDraftId,
        projectSnapshot: project,
      });

      // Discard recovery
      dbManager.clearSessionRecovery();
      expect(dbManager.getSessionRecovery()).toBeNull();

      // Verify the saved project in database is completely intact
      const loaded = dbManager.getProject(project.id);
      expect(loaded).not.toBeNull();
      expect(loaded?.title).toBe('Permanent Project');
    });
  });

  describe('B. Transactional Saving & Race Condition Safety (Stage 1.A)', () => {
    it('commits saves transactionally and updates revision accurately', () => {
      const project = createDefaultProject();
      project.title = 'Initial Title';
      dbManager.createProject(project);

      // Update project
      const updated: ScriptProject = {
        ...project,
        title: 'Updated Title',
        revision: 2,
      };
      dbManager.saveProject(updated);

      const loaded = dbManager.getProject(project.id);
      expect(loaded?.title).toBe('Updated Title');
      expect(loaded?.revision).toBe(2);
    });

    it('preserves draft independence when saving multiple drafts', () => {
      const project = createDefaultProject();
      dbManager.createProject(project);

      const draft1 = project.drafts[0];
      const draft2 = {
        ...draft1,
        id: 'draft_version_2',
        name: 'Version 2 — Alternate',
        isMain: false,
        blocks: [{ id: 'b_alt', type: 'action' as const, text: 'Alternate Scene Content' }],
      };

      const multiDraftProj: ScriptProject = {
        ...project,
        drafts: [draft1, draft2],
        revision: 2,
      };

      dbManager.saveProject(multiDraftProj);

      const loaded = dbManager.getProject(project.id);
      expect(loaded?.drafts.length).toBe(2);
      expect(loaded?.drafts[0].name).toBe('Master Draft');
      expect(loaded?.drafts[1].name).toBe('Version 2 — Alternate');
      expect(loaded?.drafts[1].blocks[0].text).toBe('Alternate Scene Content');
    });
  });
});
