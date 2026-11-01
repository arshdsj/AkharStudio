/**
 * DatabaseManager.ts - Local Database-First Project Storage Engine for AkharStudio
 *
 * Implements persistent local SQLite database using better-sqlite3 with WAL mode,
 * foreign keys, transactional saves, versioned schema migrations, and SQLite Online Backup API.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  ScriptProject,
  ScriptDraft,
  RecentProject,
  DatabaseProjectSummary,
} from '../../types/screenplay';
import {
  createDefaultProject,
  calculateScreenplayStats,
  validateScriptProject,
} from '../../core/model/ProjectModel';

/**
 * Locate matching native binding for better-sqlite3 across different
 * Node/Electron ABI versions (e.g. Electron ABI 130 vs Node 22 ABI 127).
 */
export function getMatchingNativeBinding(): string | undefined {
  const abi = process.versions.modules;
  const platform = process.platform;
  const arch = process.arch;
  const targetName = `node-v${abi}-${platform}-${arch}`;

  const candidates = [
    path.resolve(process.cwd(), `node_modules/better-sqlite3/lib/binding/${targetName}/better_sqlite3.node`),
    path.resolve(__dirname, `../node_modules/better-sqlite3/lib/binding/${targetName}/better_sqlite3.node`),
    path.resolve(__dirname, `../../node_modules/better-sqlite3/lib/binding/${targetName}/better_sqlite3.node`),
    path.resolve(__dirname, `../../../node_modules/better-sqlite3/lib/binding/${targetName}/better_sqlite3.node`),
    path.resolve(__dirname, `../../../../node_modules/better-sqlite3/lib/binding/${targetName}/better_sqlite3.node`),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbDir: string, dbName: string = 'akharstudio.db') {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, dbName);

    // Open database with ABI-matched native binding
    const nativeBinding = getMatchingNativeBinding();
    this.db = new Database(this.dbPath, nativeBinding ? { nativeBinding } : {});

    // Apply baseline pragmas
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');

    // Run schema migrations
    this.runMigrations();
  }

  /**
   * Run versioned schema migrations
   */
  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL,
        description TEXT NOT NULL
      );
    `);

    const applied = this.db
      .prepare('SELECT version FROM schema_migrations')
      .all() as { version: number }[];
    const appliedVersions = new Set(applied.map((r) => r.version));

    // Migration 1: Initial Database-First Schema
    if (!appliedVersions.has(1)) {
      const migrateV1 = this.db.transaction(() => {
        this.db.exec(`
          -- Persistent Application Preferences & Alternate Launch Settings
          CREATE TABLE IF NOT EXISTS app_preferences (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          -- Core Screenplay Projects
          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            schema_version INTEGER NOT NULL DEFAULT 1,
            active_draft_id TEXT NOT NULL,
            settings_json TEXT NOT NULL,
            metadata_json TEXT NOT NULL,
            revision INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            is_archived INTEGER NOT NULL DEFAULT 0
          );

          -- Screenplay Drafts (Multi-Draft support DRAFT-01)
          CREATE TABLE IF NOT EXISTS drafts (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            is_main INTEGER NOT NULL DEFAULT 0,
            source_draft_id TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            blocks_json TEXT NOT NULL,
            word_count INTEGER NOT NULL DEFAULT 0,
            page_count INTEGER NOT NULL DEFAULT 1,
            scene_count INTEGER NOT NULL DEFAULT 0,
            character_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          -- Associated Project Media / Title Card Artwork
          CREATE TABLE IF NOT EXISTS project_assets (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            filename TEXT NOT NULL,
            data BLOB NOT NULL,
            byte_size INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          -- Externally Opened Recent Files
          CREATE TABLE IF NOT EXISTS recent_external_files (
            file_path TEXT PRIMARY KEY,
            project_id TEXT,
            title TEXT NOT NULL,
            last_opened_at TEXT NOT NULL
          );

          -- Fast Indexing
          CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
          CREATE INDEX IF NOT EXISTS idx_drafts_project_id ON drafts(project_id);
          CREATE INDEX IF NOT EXISTS idx_assets_project_id ON project_assets(project_id);
        `);

        this.db
          .prepare(
            'INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?)'
          )
          .run(1, new Date().toISOString(), 'Initial database-first schema');
      });

      migrateV1();
    }
  }

  // -------------------------------------------------------------
  // Preferences & Alternating Logo Management
  // -------------------------------------------------------------

  getPreference(key: string, defaultValue?: string): string | null {
    const row = this.db
      .prepare('SELECT value FROM app_preferences WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row ? row.value : defaultValue ?? null;
  }

  setPreference(key: string, value: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        INSERT INTO app_preferences (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `)
      .run(key, value, now);
  }

  /**
   * Cycles logo script mode on application launch:
   * Alternates between 'en' (AkharStudio) and 'pa' (ਅੱਖਰStudio).
   */
  getNextLogoScriptMode(): 'en' | 'pa' {
    const current = this.getPreference('logo_script_mode', 'pa') as 'en' | 'pa';
    const next: 'en' | 'pa' = current === 'en' ? 'pa' : 'en';
    this.setPreference('logo_script_mode', next);
    return next;
  }

  // -------------------------------------------------------------
  // Project CRUD Operations
  // -------------------------------------------------------------

  /**
   * Create a new project in the database.
   */
  createProject(initialProject?: ScriptProject): ScriptProject {
    const project = initialProject || createDefaultProject();
    const now = new Date().toISOString();

    const insertTx = this.db.transaction(() => {
      this.db
        .prepare(`
          INSERT INTO projects (
            id, title, schema_version, active_draft_id,
            settings_json, metadata_json, revision,
            created_at, updated_at, is_archived
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `)
        .run(
          project.id,
          project.title,
          project.schemaVersion || 1,
          project.activeDraftId,
          JSON.stringify(project.settings),
          JSON.stringify(project.metadata),
          project.revision,
          now,
          now
        );

      const insertDraftStmt = this.db.prepare(`
        INSERT INTO drafts (
          id, project_id, name, is_main, source_draft_id,
          sort_order, blocks_json, word_count, page_count,
          scene_count, character_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      project.drafts.forEach((draft, index) => {
        const stats = calculateScreenplayStats(draft);
        insertDraftStmt.run(
          draft.id,
          project.id,
          draft.name,
          draft.isMain ? 1 : 0,
          draft.sourceDraftId || null,
          index,
          JSON.stringify(draft.blocks),
          stats.wordCount,
          stats.pageCount,
          stats.sceneCount,
          stats.characterCount,
          draft.createdAt || now,
          draft.modifiedAt || now
        );
      });
    });

    insertTx();
    return project;
  }

  /**
   * Transactional project save / update.
   */
  saveProject(project: ScriptProject): void {
    validateScriptProject(project);
    const now = new Date().toISOString();

    const saveTx = this.db.transaction(() => {
      // 1. Check if project exists; if not, create it
      const existing = this.db
        .prepare('SELECT id, created_at FROM projects WHERE id = ?')
        .get(project.id) as { id: string; created_at: string } | undefined;

      if (!existing) {
        this.createProject(project);
        return;
      }

      // 2. Update projects table
      this.db
        .prepare(`
          UPDATE projects
          SET title = ?,
              schema_version = ?,
              active_draft_id = ?,
              settings_json = ?,
              metadata_json = ?,
              revision = ?,
              updated_at = ?
          WHERE id = ?
        `)
        .run(
          project.title,
          project.schemaVersion,
          project.activeDraftId,
          JSON.stringify(project.settings),
          JSON.stringify(project.metadata),
          project.revision,
          now,
          project.id
        );

      // 3. Sync drafts
      const existingDraftIds = (
        this.db
          .prepare('SELECT id FROM drafts WHERE project_id = ?')
          .all(project.id) as { id: string }[]
      ).map((r) => r.id);

      const incomingDraftIds = new Set(project.drafts.map((d) => d.id));

      // Remove removed drafts
      const deleteDraftStmt = this.db.prepare('DELETE FROM drafts WHERE id = ?');
      for (const existingId of existingDraftIds) {
        if (!incomingDraftIds.has(existingId)) {
          deleteDraftStmt.run(existingId);
        }
      }

      // Upsert drafts
      const upsertDraftStmt = this.db.prepare(`
        INSERT INTO drafts (
          id, project_id, name, is_main, source_draft_id,
          sort_order, blocks_json, word_count, page_count,
          scene_count, character_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          is_main = excluded.is_main,
          source_draft_id = excluded.source_draft_id,
          sort_order = excluded.sort_order,
          blocks_json = excluded.blocks_json,
          word_count = excluded.word_count,
          page_count = excluded.page_count,
          scene_count = excluded.scene_count,
          character_count = excluded.character_count,
          updated_at = excluded.updated_at
      `);

      project.drafts.forEach((draft, index) => {
        const stats = calculateScreenplayStats(draft);
        upsertDraftStmt.run(
          draft.id,
          project.id,
          draft.name,
          draft.isMain ? 1 : 0,
          draft.sourceDraftId || null,
          index,
          JSON.stringify(draft.blocks),
          stats.wordCount,
          stats.pageCount,
          stats.sceneCount,
          stats.characterCount,
          draft.createdAt || now,
          draft.modifiedAt || now
        );
      });
    });

    saveTx();
  }

  /**
   * Load a full project by ID.
   */
  getProject(id: string): ScriptProject | null {
    const projRow = this.db
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(id) as any;

    if (!projRow) return null;

    const draftRows = this.db
      .prepare('SELECT * FROM drafts WHERE project_id = ? ORDER BY sort_order ASC')
      .all(id) as any[];

    const drafts: ScriptDraft[] = draftRows.map((d) => ({
      id: d.id,
      name: d.name,
      isMain: Boolean(d.is_main),
      sourceDraftId: d.source_draft_id || undefined,
      createdAt: d.created_at,
      modifiedAt: d.updated_at,
      blocks: JSON.parse(d.blocks_json),
    }));

    const project: ScriptProject = {
      schemaVersion: projRow.schema_version,
      id: projRow.id,
      title: projRow.title,
      metadata: JSON.parse(projRow.metadata_json),
      settings: JSON.parse(projRow.settings_json),
      activeDraftId: projRow.active_draft_id,
      drafts,
      revision: projRow.revision,
      lastSavedRevision: projRow.revision,
    };

    return validateScriptProject(project);
  }

  /**
   * List all projects with aggregated summary metadata.
   */
  listProjects(): DatabaseProjectSummary[] {
    const rows = this.db
      .prepare(`
        SELECT 
          p.id,
          p.title,
          p.schema_version,
          p.active_draft_id,
          p.metadata_json,
          p.revision,
          p.created_at,
          p.updated_at,
          p.is_archived,
          COUNT(d.id) as draft_count,
          COALESCE(SUM(d.word_count), 0) as total_word_count,
          COALESCE(MAX(d.page_count), 1) as max_page_count,
          COALESCE(SUM(d.scene_count), 0) as total_scene_count,
          COALESCE(SUM(d.character_count), 0) as total_character_count
        FROM projects p
        LEFT JOIN drafts d ON p.id = d.project_id
        WHERE p.is_archived = 0
        GROUP BY p.id
        ORDER BY p.updated_at DESC
      `)
      .all() as any[];

    return rows.map((r) => {
      let author = '';
      try {
        const meta = JSON.parse(r.metadata_json);
        author = meta.author || '';
      } catch {
        // ignore parse error
      }

      return {
        id: r.id,
        title: r.title,
        author,
        schemaVersion: r.schema_version,
        activeDraftId: r.active_draft_id,
        draftCount: r.draft_count,
        wordCount: r.total_word_count,
        pageCount: r.max_page_count,
        sceneCount: r.total_scene_count,
        characterCount: r.total_character_count,
        revision: r.revision,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        isArchived: Boolean(r.is_archived),
      };
    });
  }

  /**
   * Delete a project from the database.
   */
  deleteProject(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  // -------------------------------------------------------------
  // Recent Projects (Unified: Internal DB + External Files)
  // -------------------------------------------------------------

  recordExternalFile(filePath: string, title: string, projectId?: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        INSERT INTO recent_external_files (file_path, project_id, title, last_opened_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(file_path) DO UPDATE SET
          title = excluded.title,
          project_id = excluded.project_id,
          last_opened_at = excluded.last_opened_at
      `)
      .run(filePath, projectId || null, title, now);
  }

  removeRecentExternalFile(filePath: string): void {
    this.db.prepare('DELETE FROM recent_external_files WHERE file_path = ?').run(filePath);
  }

  /**
   * Get unified recent projects list, visually distinguishing
   * internal database projects from external project files.
   */
  getRecentProjects(): RecentProject[] {
    const list: RecentProject[] = [];

    // 1. Fetch internal database projects
    const dbProjects = this.listProjects();
    for (const p of dbProjects) {
      list.push({
        id: p.id,
        source: 'database',
        title: p.title,
        modifiedAt: p.updatedAt,
        lastOpenedAt: p.updatedAt,
        wordCount: p.wordCount,
        pageCount: p.pageCount,
        sceneCount: p.sceneCount,
      });
    }

    // 2. Fetch external files (filter out files that were deleted on disk)
    const extRows = this.db
      .prepare('SELECT * FROM recent_external_files ORDER BY last_opened_at DESC')
      .all() as any[];

    for (const row of extRows) {
      if (fs.existsSync(row.file_path)) {
        list.push({
          id: row.project_id || row.file_path,
          source: 'external',
          title: row.title,
          filePath: row.file_path,
          modifiedAt: row.last_opened_at,
          lastOpenedAt: row.last_opened_at,
        });
      }
    }

    // Sort by lastOpenedAt descending
    list.sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());

    // Limit to top 30
    return list.slice(0, 30);
  }

  // -------------------------------------------------------------
  // Full Database Backup & Restore (SQLite Online Backup API)
  // -------------------------------------------------------------

  /**
   * Export the entire database as a clean, consistent backup file.
   * Uses SQLite's native online backup API (db.backup).
   */
  async exportDatabaseBackup(destinationFilePath: string): Promise<{ success: boolean; filePath: string }> {
    const tempBackupPath = `${destinationFilePath}.tmp_${Date.now()}`;
    try {
      // 1. Perform live online backup using better-sqlite3 API
      await this.db.backup(tempBackupPath);

      // 2. Atomically rename to final destination
      await fs.promises.rename(tempBackupPath, destinationFilePath);
      return { success: true, filePath: destinationFilePath };
    } catch (err) {
      if (fs.existsSync(tempBackupPath)) {
        try {
          await fs.promises.unlink(tempBackupPath);
        } catch {
          // ignore
        }
      }
      throw err;
    }
  }

  /**
   * Restore database from a backup file.
   * Mode: 'replace' replaces existing database (with pre-restore backup),
   *       'merge' imports projects from the backup into the current database.
   */
  async importDatabaseBackup(
    backupFilePath: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ success: boolean; restoredProjectCount: number }> {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file does not exist: ${backupFilePath}`);
    }

    // Open backup database in read-only mode to inspect and validate
    const nativeBinding = getMatchingNativeBinding();
    const backupDb = new Database(backupFilePath, {
      readonly: true,
      ...(nativeBinding ? { nativeBinding } : {}),
    });
    let restoredCount = 0;

    try {
      const backupProjects = backupDb
        .prepare('SELECT * FROM projects')
        .all() as any[];

      if (mode === 'replace') {
        // Create emergency pre-restore snapshot of current database
        const preRestoreBackup = `${this.dbPath}.pre_restore_${Date.now()}`;
        await this.db.backup(preRestoreBackup);

        // Replace all records in current database
        const replaceTx = this.db.transaction(() => {
          this.db.exec(`
            DELETE FROM drafts;
            DELETE FROM project_assets;
            DELETE FROM projects;
          `);

          const insertProj = this.db.prepare(`
            INSERT INTO projects (
              id, title, schema_version, active_draft_id,
              settings_json, metadata_json, revision,
              created_at, updated_at, is_archived
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const insertDraft = this.db.prepare(`
            INSERT INTO drafts (
              id, project_id, name, is_main, source_draft_id,
              sort_order, blocks_json, word_count, page_count,
              scene_count, character_count, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const p of backupProjects) {
            insertProj.run(
              p.id,
              p.title,
              p.schema_version,
              p.active_draft_id,
              p.settings_json,
              p.metadata_json,
              p.revision,
              p.created_at,
              p.updated_at,
              p.is_archived
            );

            const drafts = backupDb
              .prepare('SELECT * FROM drafts WHERE project_id = ?')
              .all(p.id) as any[];

            for (const d of drafts) {
              insertDraft.run(
                d.id,
                d.project_id,
                d.name,
                d.is_main,
                d.source_draft_id,
                d.sort_order,
                d.blocks_json,
                d.word_count,
                d.page_count,
                d.scene_count,
                d.character_count,
                d.created_at,
                d.updated_at
              );
            }
            restoredCount++;
          }
        });

        replaceTx();
      } else {
        // Mode === 'merge': add or update projects
        const mergeTx = this.db.transaction(() => {
          for (const p of backupProjects) {
            const drafts = backupDb
              .prepare('SELECT * FROM drafts WHERE project_id = ?')
              .all(p.id) as any[];

            const projectToImport: ScriptProject = {
              schemaVersion: p.schema_version,
              id: p.id,
              title: p.title,
              metadata: JSON.parse(p.metadata_json),
              settings: JSON.parse(p.settings_json),
              activeDraftId: p.active_draft_id,
              drafts: drafts.map((d) => ({
                id: d.id,
                name: d.name,
                isMain: Boolean(d.is_main),
                sourceDraftId: d.source_draft_id || undefined,
                createdAt: d.created_at,
                modifiedAt: d.updated_at,
                blocks: JSON.parse(d.blocks_json),
              })),
              revision: p.revision,
              lastSavedRevision: p.revision,
            };

            this.saveProject(projectToImport);
            restoredCount++;
          }
        });

        mergeTx();
      }

      return { success: true, restoredProjectCount: restoredCount };
    } finally {
      backupDb.close();
    }
  }

  // -------------------------------------------------------------
  // Legacy File Migration Assistant
  // -------------------------------------------------------------

  /**
   * Migrates legacy recent-projects.json to recent_external_files table.
   * Leaves existing files on disk untouched.
   */
  async migrateLegacyFiles(recentProjectsJsonPath: string): Promise<number> {
    if (!fs.existsSync(recentProjectsJsonPath)) {
      return 0;
    }

    try {
      const content = await fs.promises.readFile(recentProjectsJsonPath, 'utf-8');
      const list = JSON.parse(content) as Array<{
        filePath: string;
        id?: string;
        title?: string;
        lastOpenedAt?: string;
      }>;

      let count = 0;
      for (const item of list) {
        if (item.filePath && fs.existsSync(item.filePath)) {
          this.recordExternalFile(
            item.filePath,
            item.title || path.basename(item.filePath),
            item.id
          );
          count++;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Close database connection safely.
   */
  close(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
  }
}
