/**
 * preload.ts - Secure typed context bridge for renderer process
 * Baseline: V9.1, SEC-01, EXPORT-01, EXPORT-02, STORE-02
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  ScriptProject,
  RecentProject,
  RecoverySnapshot,
  SessionRecoveryCheckpoint,
  PaperSize,
  ScriptDraft,
  DatabaseProjectSummary,
  BackupExportResult,
  BackupImportResult,
} from '../types/screenplay';

export interface ExportResult {
  success?: boolean;
  filePath?: string;
  canceled?: boolean;
}

export interface ElectronAPI {
  newProject: () => Promise<ScriptProject>;
  openFileDialog: () => Promise<{ filePath: string; project: ScriptProject } | null>;
  openRecentFile: (filePath: string) => Promise<{ filePath: string; project: ScriptProject }>;
  saveProject: (filePath: string, project: ScriptProject) => Promise<boolean>;
  saveProjectDialog: (defaultTitle: string, project: ScriptProject) => Promise<string | null>;
  autosaveSnapshot: (project: ScriptProject, filePath?: string) => Promise<boolean>;
  checkRecovery: () => Promise<RecoverySnapshot | null>;
  clearRecovery: () => Promise<boolean>;
  getRecentProjects: () => Promise<RecentProject[]>;
  setWindowTitle: (title: string) => void;
  onMenuAction: (callback: (action: string) => void) => () => void;

  // Local Database Project Management
  dbCreateProject: (project?: ScriptProject) => Promise<ScriptProject>;
  dbSaveProject: (project: ScriptProject) => Promise<boolean>;
  dbGetProject: (id: string) => Promise<ScriptProject | null>;
  dbListProjects: () => Promise<DatabaseProjectSummary[]>;
  dbDeleteProject: (id: string) => Promise<boolean>;
  getLaunchLogoMode: () => Promise<'en' | 'pa'>;
  exportDatabaseBackupDialog: () => Promise<BackupExportResult>;
  importDatabaseBackupDialog: () => Promise<BackupImportResult>;

  // Phase 4 Export & Interchange (EXPORT-01, EXPORT-02, STORE-02)
  exportPdf: (options: {
    project: ScriptProject;
    paperSize: PaperSize;
    includeTitlePage: boolean;
    exportArea?: 'entire_script' | 'selected_pages' | 'highlighted_text' | 'character_sheet';
    pageRanges?: string;
    customDraft?: ScriptDraft;
    password?: string;
    preserveCharacterHighlights?: boolean;
    useUnifiedPagination?: boolean;
  }) => Promise<ExportResult>;
  exportTextFile: (defaultTitle: string, content: string) => Promise<ExportResult>;
  exportFountainFile: (defaultTitle: string, content: string) => Promise<ExportResult>;
  importFountainDialog: () => Promise<{ filePath: string; content: string } | null>;
  exportProjectBundleDialog: (defaultTitle: string, project: ScriptProject) => Promise<ExportResult>;
  importProjectBundleDialog: () => Promise<{ filePath: string; content: string } | null>;

  // Session Recovery & Lifecycle (Stage 1)
  saveSessionCheckpoint: (checkpoint: SessionRecoveryCheckpoint) => Promise<boolean>;
  checkInterruptedSession: () => Promise<SessionRecoveryCheckpoint | null>;
  clearSessionCheckpoint: () => Promise<boolean>;
  confirmQuit: (options?: { forceQuit?: boolean }) => Promise<boolean>;
  onRequestClose: (callback: () => void) => () => void;
}

const api: ElectronAPI = {
  newProject: () => ipcRenderer.invoke('storage:new-project'),
  openFileDialog: () => ipcRenderer.invoke('storage:open-file-dialog'),
  openRecentFile: (filePath: string) => ipcRenderer.invoke('storage:open-recent-file', filePath),
  saveProject: (filePath: string, project: ScriptProject) =>
    ipcRenderer.invoke('storage:save-project', filePath, project),
  saveProjectDialog: (defaultTitle: string, project: ScriptProject) =>
    ipcRenderer.invoke('storage:save-project-dialog', defaultTitle, project),
  autosaveSnapshot: (project: ScriptProject, filePath?: string) =>
    ipcRenderer.invoke('storage:autosave-snapshot', project, filePath),
  checkRecovery: () => ipcRenderer.invoke('storage:check-recovery'),
  clearRecovery: () => ipcRenderer.invoke('storage:clear-recovery'),
  getRecentProjects: () => ipcRenderer.invoke('storage:get-recent-projects'),
  setWindowTitle: (title: string) => ipcRenderer.invoke('window:set-title', title),
  onMenuAction: (callback: (action: string) => void) => {
    const listeners = [
      'menu:new-project',
      'menu:open-project',
      'menu:save-project',
      'menu:save-project-as',
      'menu:export-pdf',
      'menu:export-db-backup',
      'menu:import-db-backup',
      'menu:about',
    ];

    const cleanups = listeners.map((event) => {
      const handler = () => callback(event.replace('menu:', ''));
      ipcRenderer.on(event, handler);
      return () => ipcRenderer.removeListener(event, handler);
    });

    return () => {
      cleanups.forEach((c) => c());
    };
  },

  // Local Database methods
  dbCreateProject: (project) => ipcRenderer.invoke('db:create-project', project),
  dbSaveProject: (project) => ipcRenderer.invoke('db:save-project', project),
  dbGetProject: (id) => ipcRenderer.invoke('db:get-project', id),
  dbListProjects: () => ipcRenderer.invoke('db:list-projects'),
  dbDeleteProject: (id) => ipcRenderer.invoke('db:delete-project', id),
  getLaunchLogoMode: () => ipcRenderer.invoke('app:get-launch-logo-mode'),
  exportDatabaseBackupDialog: () => ipcRenderer.invoke('storage:export-database-backup-dialog'),
  importDatabaseBackupDialog: () => ipcRenderer.invoke('storage:import-database-backup-dialog'),

  // Phase 4 methods
  exportPdf: (options) => ipcRenderer.invoke('export:pdf', options),
  exportTextFile: (defaultTitle, content) => ipcRenderer.invoke('export:text-file', defaultTitle, content),
  exportFountainFile: (defaultTitle, content) => ipcRenderer.invoke('export:fountain-file', defaultTitle, content),
  importFountainDialog: () => ipcRenderer.invoke('import:fountain-dialog'),
  exportProjectBundleDialog: (defaultTitle, project) =>
    ipcRenderer.invoke('storage:export-bundle-dialog', defaultTitle, project),
  importProjectBundleDialog: () => ipcRenderer.invoke('storage:import-bundle-dialog'),

  // Session Recovery & Lifecycle (Stage 1)
  saveSessionCheckpoint: (checkpoint) => ipcRenderer.invoke('app:save-session-checkpoint', checkpoint),
  checkInterruptedSession: () => ipcRenderer.invoke('app:check-interrupted-session'),
  clearSessionCheckpoint: () => ipcRenderer.invoke('app:clear-session-checkpoint'),
  confirmQuit: (options) => ipcRenderer.invoke('app:confirm-quit', options),
  onRequestClose: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('app:request-close', handler);
    return () => ipcRenderer.removeListener('app:request-close', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
