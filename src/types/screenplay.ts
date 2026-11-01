/**
 * screenplay.ts - Strict domain types for Punjabi Screenplay Editor
 * Baseline: V9.1 (ARCH-01, ARCH-02, ARCH-05, MODEL-01, MODEL-02, STORE-01, STORE-02)
 */

export type ScreenplayBlockType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'shot';

export interface InlineFormat {
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'color' | 'highlight' | 'link';
  from: number;
  to: number;
  color?: string;
  href?: string;
}

export interface ScreenplayBlock {
  id: string;
  type: ScreenplayBlockType;
  text: string;
  formats?: InlineFormat[];
  notes?: string;
  comment?: string;
  annotationLayer?: string;
}

export interface TitleMetadata {
  title: string;
  author: string;
  basedOn: string;
  contact: string;
  rights: string;
  titleImageUrl?: string; // Base64 data URL for custom title artwork / movie graphic
}

export type PaperSize = 'letter' | 'a4';
export type ContdSetting = 'unasked' | 'on' | 'off';

export interface HighlightCharactersSetting {
  enabled: boolean;
  color: string;
  selectedCharacters: string[];
}

export interface ProjectSettings {
  paperSize: PaperSize;
  contdSetting: ContdSetting;
  language: 'pa' | 'en' | 'mixed';
  spellcheck: boolean; // default false per DEC-020
  showWordCount?: boolean;
  highlightCharacters?: HighlightCharactersSetting;
}

export interface ScriptDraft {
  id: string;
  name: string;
  isMain: boolean;
  createdAt: string;
  modifiedAt: string;
  sourceDraftId?: string; // provenance for cloned drafts (DRAFT-01)
  blocks: ScreenplayBlock[];
}

export interface ScriptProject {
  schemaVersion: number; // current = 1 (ARCH-05)
  id: string;
  title: string;
  metadata: TitleMetadata;
  settings: ProjectSettings;
  activeDraftId: string;
  drafts: ScriptDraft[];
  revision: number;
  lastSavedRevision: number;
}

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'error';
export type ProjectSource = 'database' | 'external';

export interface RecentProject {
  id: string;
  source?: ProjectSource;
  title: string;
  filePath?: string;
  modifiedAt: string;
  lastOpenedAt: string;
  wordCount?: number;
  pageCount?: number;
  sceneCount?: number;
}

export interface DatabaseProjectSummary {
  id: string;
  title: string;
  author?: string;
  schemaVersion: number;
  activeDraftId: string;
  draftCount: number;
  wordCount: number;
  pageCount: number;
  sceneCount: number;
  characterCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface BackupManifest {
  format: 'akharstudio-database-backup';
  version: number;
  createdAt: string;
  appVersion: string;
  projectCount: number;
  databaseChecksum?: string;
}

export interface BackupExportResult {
  success?: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

export interface BackupImportResult {
  success?: boolean;
  canceled?: boolean;
  restoredProjectCount?: number;
  error?: string;
}

export interface RecoverySnapshot {
  timestamp: string;
  filePath?: string;
  project: ScriptProject;
}

export interface ScreenplayStats {
  wordCount: number;
  pageCount: number;
  characterCount: number;
  sceneCount: number;
}
