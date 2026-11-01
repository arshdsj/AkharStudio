/**
 * FileSystemManager.ts - Atomic local storage & recovery management
 * Governing IDs: STORE-01, STORE-02, SAVE-01, REL-01, ERR-01, SAFE-01, ARCH-05, T-09, T-16
 */

import fs from 'fs';
import path from 'path';
import { ScriptProject, RecentProject, RecoverySnapshot } from '../../types/screenplay';
import { validateScriptProject } from '../model/ProjectModel';

export class FileSystemManager {
  private recoveryDir: string;
  private configDir: string;
  private recentProjectsFile: string;
  private recoveryFile: string;

  constructor(baseUserDataDir?: string) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    const legacyDir = path.join(homeDir, '.punjabi-script-writer');
    const newDir = path.join(homeDir, '.akhar-studio');
    const defaultDir = fs.existsSync(legacyDir) && !fs.existsSync(newDir) ? legacyDir : newDir;
    this.configDir = baseUserDataDir || defaultDir;
    this.recoveryDir = path.join(this.configDir, 'recovery');
    this.recentProjectsFile = path.join(this.configDir, 'recent-projects.json');
    this.recoveryFile = path.join(this.recoveryDir, 'recovery_snapshot.json');

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    if (!fs.existsSync(this.recoveryDir)) {
      fs.mkdirSync(this.recoveryDir, { recursive: true });
    }
  }

  /**
   * Atomic File Save (STORE-01, SAFE-01)
   * Writes JSON to a temporary staging file, then renames to target.
   * Guarantees zero data corruption or partial file loss on failure.
   */
  async saveProjectAtomic(filePath: string, project: ScriptProject): Promise<void> {
    const projectToSave: ScriptProject = {
      ...project,
      lastSavedRevision: project.revision,
    };

    const serialized = JSON.stringify(projectToSave, null, 2);
    const dir = path.dirname(filePath);
    const tempFile = path.join(dir, `.${path.basename(filePath)}.tmp_${Date.now()}`);

    try {
      await fs.promises.writeFile(tempFile, serialized, 'utf-8');
      await fs.promises.rename(tempFile, filePath);
      await this.recordRecentProject(filePath, projectToSave);
      // Clean up volatile recovery snapshot once cleanly saved
      await this.clearRecoverySnapshot();
    } catch (err: unknown) {
      if (fs.existsSync(tempFile)) {
        try {
          await fs.promises.unlink(tempFile);
        } catch {
          // ignore cleanup error
        }
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to save project to ${filePath}: ${message}`);
    }
  }

  /**
   * Open and Validate Project from Disk (STORE-01, ARCH-05, T-16)
   */
  async openProject(filePath: string): Promise<ScriptProject> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Project file does not exist: ${filePath}`);
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      const validated = validateScriptProject(parsed);
      await this.recordRecentProject(filePath, validated);
      return validated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Unable to load project from ${filePath}: ${message}`);
    }
  }

  /**
   * Save Volatile Autosave Recovery Snapshot (REL-01)
   * Preserves last durable revision and current unsaved volatile state
   */
  async saveRecoverySnapshot(project: ScriptProject, currentFilePath?: string): Promise<void> {
    const snapshot: RecoverySnapshot = {
      timestamp: new Date().toISOString(),
      filePath: currentFilePath,
      project,
    };

    const tempRecovery = `${this.recoveryFile}.tmp_${Date.now()}`;
    try {
      await fs.promises.writeFile(tempRecovery, JSON.stringify(snapshot, null, 2), 'utf-8');
      await fs.promises.rename(tempRecovery, this.recoveryFile);
    } catch (err) {
      console.error('Failed to write recovery snapshot:', err);
    }
  }

  /**
   * Check for Existing Crash/Unsaved Recovery Snapshot (REL-01)
   */
  async checkRecoverySnapshot(): Promise<RecoverySnapshot | null> {
    if (!fs.existsSync(this.recoveryFile)) {
      return null;
    }

    try {
      const content = await fs.promises.readFile(this.recoveryFile, 'utf-8');
      const snapshot = JSON.parse(content) as RecoverySnapshot;
      if (snapshot && snapshot.project && snapshot.project.schemaVersion) {
        validateScriptProject(snapshot.project);
        return snapshot;
      }
      return null;
    } catch (err) {
      console.warn('Corrupt recovery file found, ignoring:', err);
      return null;
    }
  }

  /**
   * Clear Recovery Snapshot after successful save or discard (REL-01)
   */
  async clearRecoverySnapshot(): Promise<void> {
    if (fs.existsSync(this.recoveryFile)) {
      try {
        await fs.promises.unlink(this.recoveryFile);
      } catch (err) {
        console.warn('Failed to clear recovery file:', err);
      }
    }
  }

  /**
   * Recent Projects Management (PROJ-01)
   */
  async getRecentProjects(): Promise<RecentProject[]> {
    if (!fs.existsSync(this.recentProjectsFile)) {
      return [];
    }

    try {
      const content = await fs.promises.readFile(this.recentProjectsFile, 'utf-8');
      const list = JSON.parse(content) as RecentProject[];
      // Filter out files that no longer exist on disk
      return list.filter((item) => Boolean(item.filePath && fs.existsSync(item.filePath)));
    } catch {
      return [];
    }
  }

  private async recordRecentProject(filePath: string, project: ScriptProject): Promise<void> {
    try {
      const list = await this.getRecentProjects();
      const existingIndex = list.findIndex((p) => p.filePath === filePath);
      const record: RecentProject = {
        filePath,
        id: project.id,
        title: project.title,
        modifiedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        list.splice(existingIndex, 1);
      }
      list.unshift(record);

      // Keep at most 20 recent projects
      const trimmed = list.slice(0, 20);
      await fs.promises.writeFile(this.recentProjectsFile, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to update recent projects list:', err);
    }
  }
}
