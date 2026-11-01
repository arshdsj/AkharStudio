/**
 * App.tsx - Main Screenplay Application Shell (UI-01, UI-02, UI-03, UI-05, VIS-01, SAVE-01, REL-01)
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { HeaderRow1 } from './components/HeaderRow1';
import { HeaderRow2 } from './components/HeaderRow2';
import { ScreenplayCanvas } from './components/ScreenplayCanvas';
import { LeftSidebar } from './components/LeftSidebar';
import { FloatingToolbar } from './components/FloatingToolbar';
import { StatusChip } from './components/StatusChip';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ProjectLibraryModal } from './components/ProjectLibraryModal';
import { RecoveryModal } from './components/RecoveryModal';
import { HelpShortcutsModal } from './components/HelpShortcutsModal';
import { ExportModal } from './components/ExportModal';
import { ContdPromptModal } from './components/ContdPromptModal';
import { CustomDictionaryModal } from './components/CustomDictionaryModal';
import { DiagnosticModal } from './components/DiagnosticModal';
import { VirtualGurmukhiKeyboard } from './components/VirtualGurmukhiKeyboard';
import { ProseMirrorEditorHandle } from './components/ProseMirrorEditor';
import { globalCustomDict, globalUserDict } from '../core/transliteration/defaultEngine';
import { globalDiagnosticRecorder } from '../core/diagnostics/diagnosticRecorder';

import {
  ScriptProject,
  ScriptDraft,
  SaveStatus,
  ProjectSource,
  RecentProject,
  RecoverySnapshot,
  ScreenplayBlock,
  ScreenplayBlockType,
  TitleMetadata,
  PaperSize,
  ContdSetting,
} from '../types/screenplay';

import {
  createDefaultProject,
  cloneDraft,
  deleteDraft,
  getActiveDraft,
  updateProjectTitle,
  calculateScreenplayStats,
} from '../core/model/ProjectModel';
import { exportToPlainText } from '../core/export/textExporter';
import { exportToFountain } from '../core/export/fountainExporter';
import { importFromFountain } from '../core/export/fountainImporter';
import { exportProjectBundle, importProjectBundle } from '../core/storage/projectBundle';
import { AboutModal } from './components/AboutModal';
import { HighlightCharactersModal } from './components/HighlightCharactersModal';
import { ExportPdfOptions } from './components/ExportModal';
import { normalizeCharacterName } from '../core/editor/contd';
import { HighlightCharactersSetting } from '../types/screenplay';

export const App: React.FC = () => {
  const [project, setProject] = useState<ScriptProject>(() => createDefaultProject());
  const [projectSource, setProjectSource] = useState<ProjectSource>('database');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recoverySnapshot, setRecoverySnapshot] = useState<RecoverySnapshot | null>(null);

  // Welcome Screen & Launch state (Requirement 6 & 8)
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(true);
  const [logoMode, setLogoMode] = useState<'en' | 'pa'>('pa');

  // UI state
  const [zoom, setZoom] = useState<number>(100);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState<boolean>(false);
  const [helpModalOpen, setHelpModalOpen] = useState<boolean>(false);
  const [aboutModalOpen, setAboutModalOpen] = useState<boolean>(false);
  const [highlightModalOpen, setHighlightModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [highlightedBlocksForExport, setHighlightedBlocksForExport] = useState<ScreenplayBlock[] | null>(null);
  const [showWordCount, setShowWordCount] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('akhar_show_word_count');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [customDictionaryOpen, setCustomDictionaryOpen] = useState<boolean>(false);
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState<boolean>(false);
  const [virtualKeyboardOpen, setVirtualKeyboardOpen] = useState<boolean>(false);
  const [isShiftHeld, setIsShiftHeld] = useState<boolean>(false);
  const [isAltOrCtrlHeld, setIsAltOrCtrlHeld] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'pa' | 'en'>('pa');
  const [isTitlePageExpanded, setIsTitlePageExpanded] = useState<boolean>(false);
  const [contdPrompt, setContdPrompt] = useState<{ isOpen: boolean; characterName: string }>({
    isOpen: false,
    characterName: '',
  });

  // Diagnostic recording state & toast notifications
  const [isDiagnosticsRecording, setIsDiagnosticsRecording] = useState<boolean>(() =>
    globalDiagnosticRecorder.isRecording()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  }, []);

  useEffect(() => {
    return globalDiagnosticRecorder.subscribe((isRec) => {
      setIsDiagnosticsRecording(isRec);
    });
  }, []);

  const handleStartDiagnostics = useCallback(() => {
    const prefs = globalUserDict.getAllPreferences();
    globalDiagnosticRecorder.startRecording(prefs);
    setIsDiagnosticsRecording(true);
    showToast('Diagnostics recording started');
  }, [showToast]);

  const handleStopDiagnostics = useCallback(() => {
    const session = globalDiagnosticRecorder.stopRecording();
    setIsDiagnosticsRecording(false);
    const count = session?.events.length || 0;
    showToast(`Diagnostics recording stopped (${count} events captured)`);
  }, [showToast]);

  const handleExportDiagnostics = useCallback(() => {
    const jsonStr = globalDiagnosticRecorder.exportSessionJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported current diagnostics to session.json');
  }, [showToast]);

  const handleClearOlderDiagnostics = useCallback(() => {
    const count = globalDiagnosticRecorder.clearOlderDiagnostics();
    showToast(
      count > 0
        ? `Cleared ${count} older diagnostic sessions (current session preserved)`
        : 'Older diagnostics cleared (active session preserved)'
    );
  }, [showToast]);

  // Editor ref for direct virtual keyboard insertion
  const editorRef = useRef<ProseMirrorEditorHandle>(null);

  // Active element focus tracking for toolbar (TOOL-01, TITLE-02)
  const [activeBlock, setActiveBlock] = useState<ScreenplayBlock | null>(null);
  const [isTitleEditing, setIsTitleEditing] = useState<boolean>(false);

  // History stack for Undo/Redo (TOOL-02)
  const [history, setHistory] = useState<ScriptProject[]>([]);
  const [future, setFuture] = useState<ScriptProject[]>([]);

  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeDraft = getActiveDraft(project);
  const stats = calculateScreenplayStats(activeDraft);

  // Dynamic current page tracking based on active block in screenplay
  const currentPage = useMemo(() => {
    if (!activeBlock || !activeDraft.blocks.length) return 1;
    let linesSoFar = 0;
    for (const b of activeDraft.blocks) {
      if (b.id === activeBlock.id) break;
      const text = b.text.trim();
      let charsPerLine = 60;
      if (b.type === 'dialogue') charsPerLine = 35;
      else if (b.type === 'character' || b.type === 'parenthetical') charsPerLine = 25;
      const lines = text.length > 0 ? Math.max(1, Math.ceil(text.length / charsPerLine)) : 1;
      linesSoFar += lines + 1;
    }
    return Math.min(stats.pageCount, Math.max(1, Math.floor(linesSoFar / 54) + 1));
  }, [activeBlock, activeDraft.blocks, stats.pageCount]);

  // Word count toggle persistence (Requirement 4)
  const handleToggleWordCount = (val: boolean) => {
    setShowWordCount(val);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('akhar_show_word_count', String(val));
    }
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        showWordCount: val,
      },
    }));
  };

  // Highlight Characters configuration & persistence (Requirement 5)
  const highlightCharactersSetting: HighlightCharactersSetting = project.settings.highlightCharacters || {
    enabled: false,
    color: 'rgba(167, 139, 250, 0.35)',
    selectedCharacters: [],
  };

  const handleHighlightCharactersChange = (newSetting: HighlightCharactersSetting) => {
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        highlightCharacters: newSetting,
      },
      revision: prev.revision + 1,
    }));
  };

  // Detected characters from active draft in order of appearance (Requirement 5.A)
  const detectedCharacters = useMemo(() => {
    const chars = new Set<string>();
    for (const block of activeDraft.blocks) {
      if (block.type === 'character' && block.text.trim()) {
        const name = normalizeCharacterName(block.text.trim());
        if (name) chars.add(name);
      }
    }
    return Array.from(chars);
  }, [activeDraft.blocks]);

  // Capture selection reliably before opening export dialog (Requirement 3.C)
  const handleOpenExport = useCallback(() => {
    const selected = editorRef.current?.getSelectedBlocks() || null;
    setHighlightedBlocksForExport(selected);
    setExportModalOpen(true);
  }, []);

  // 1. Startup: Check for recovery snapshot & load recent projects
  useEffect(() => {
    async function init() {
      if (window.electronAPI) {
        try {
          if (window.electronAPI.getLaunchLogoMode) {
            const mode = await window.electronAPI.getLaunchLogoMode();
            if (mode) setLogoMode(mode);
          }
          const snapshot = await window.electronAPI.checkRecovery();
          if (snapshot) {
            setRecoverySnapshot(snapshot);
          }
          const recents = await window.electronAPI.getRecentProjects();
          setRecentProjects(recents);
        } catch (err) {
          console.error('Initialization error:', err);
        }
      }
    }
    init();
  }, []);

  // Update window title on project title change
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setWindowTitle(project.title);
    }
  }, [project.title]);

  // Push to history helper
  const commitProjectChange = useCallback(
    (newProject: ScriptProject) => {
      setHistory((prev) => [...prev.slice(-30), project]); // Keep up to 30 history states
      setFuture([]);
      setProject(newProject);
      setSaveStatus('dirty');
    },
    [project]
  );

  // Autosave debouncing (REL-01, SAVE-01)
  useEffect(() => {
    if (saveStatus !== 'dirty') return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      if (window.electronAPI) {
        try {
          if (projectSource === 'database') {
            setSaveStatus('saving');
            await window.electronAPI.dbSaveProject(project);
            setSaveStatus('clean');
          } else if (currentFilePath) {
            setSaveStatus('saving');
            await window.electronAPI.saveProject(currentFilePath, project);
            setSaveStatus('clean');
          } else {
            // Save volatile recovery snapshot for untitled project
            await window.electronAPI.autosaveSnapshot(project);
            setSaveStatus('dirty');
          }
        } catch (err) {
          console.error('Autosave error:', err);
          setSaveStatus('error');
        }
      }
    }, 1500);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [project, projectSource, currentFilePath, saveStatus]);

  // Actions
  const handleSave = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      setSaveStatus('saving');
      if (projectSource === 'database') {
        // Direct database save (Requirement 3: Cmd+S saves directly to local database, no file dialog)
        await window.electronAPI.dbSaveProject(project);
        setSaveStatus('clean');
        const recents = await window.electronAPI.getRecentProjects();
        setRecentProjects(recents);
      } else if (currentFilePath) {
        await window.electronAPI.saveProject(currentFilePath, project);
        setSaveStatus('clean');
        const recents = await window.electronAPI.getRecentProjects();
        setRecentProjects(recents);
      } else {
        const filePath = await window.electronAPI.saveProjectDialog(project.title, project);
        if (filePath) {
          setCurrentFilePath(filePath);
          setProjectSource('external');
          setSaveStatus('clean');
          const recents = await window.electronAPI.getRecentProjects();
          setRecentProjects(recents);
        } else {
          setSaveStatus('dirty');
        }
      }
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
    }
  }, [project, projectSource, currentFilePath]);

  const handleSaveAs = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const filePath = await window.electronAPI.saveProjectDialog(project.title, project);
      if (filePath) {
        setCurrentFilePath(filePath);
        setProjectSource('external');
        setSaveStatus('clean');
        const recents = await window.electronAPI.getRecentProjects();
        setRecentProjects(recents);
      }
    } catch (err) {
      console.error('Save As failed:', err);
      setSaveStatus('error');
    }
  }, [project]);

  const handleNewProject = useCallback(async () => {
    if (window.electronAPI?.dbCreateProject) {
      try {
        const newProj = await window.electronAPI.dbCreateProject();
        setHistory([]);
        setFuture([]);
        setProject(newProj);
        setProjectSource('database');
        setCurrentFilePath(null);
        setSaveStatus('clean');
        setIsWelcomeOpen(false);
        const recents = await window.electronAPI.getRecentProjects();
        setRecentProjects(recents);
        return;
      } catch (err) {
        console.error('Database project creation failed:', err);
      }
    }

    const newProj = createDefaultProject();
    setHistory([]);
    setFuture([]);
    setProject(newProj);
    setProjectSource('database');
    setCurrentFilePath(null);
    setSaveStatus('clean');
    setIsWelcomeOpen(false);
  }, []);

  const handleOpenFile = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.openFileDialog();
      if (result) {
        setHistory([]);
        setFuture([]);
        setProject(result.project);
        setCurrentFilePath(result.filePath);
        setProjectSource('external');
        setSaveStatus('clean');
        setIsWelcomeOpen(false);
        const recents = await window.electronAPI.getRecentProjects();
        setRecentProjects(recents);
      }
    } catch (err) {
      alert(`Unable to open project: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const handleOpenRecent = useCallback(async (recentItem: RecentProject | string) => {
    if (!window.electronAPI) return;
    try {
      if (typeof recentItem === 'string') {
        const result = await window.electronAPI.openRecentFile(recentItem);
        if (result) {
          setHistory([]);
          setFuture([]);
          setProject(result.project);
          setCurrentFilePath(result.filePath);
          setProjectSource('external');
          setSaveStatus('clean');
          setIsWelcomeOpen(false);
        }
        return;
      }

      if (recentItem.source === 'database' || !recentItem.filePath) {
        const loaded = await window.electronAPI.dbGetProject(recentItem.id);
        if (loaded) {
          setHistory([]);
          setFuture([]);
          setProject(loaded);
          setCurrentFilePath(null);
          setProjectSource('database');
          setSaveStatus('clean');
          setIsWelcomeOpen(false);
        }
      } else {
        const result = await window.electronAPI.openRecentFile(recentItem.filePath);
        if (result) {
          setHistory([]);
          setFuture([]);
          setProject(result.project);
          setCurrentFilePath(result.filePath);
          setProjectSource('external');
          setSaveStatus('clean');
          setIsWelcomeOpen(false);
        }
      }
    } catch (err) {
      alert(`Unable to open project: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const handleExportDatabaseBackup = useCallback(async () => {
    if (!window.electronAPI?.exportDatabaseBackupDialog) return;
    try {
      const res = await window.electronAPI.exportDatabaseBackupDialog();
      if (res.success && res.filePath) {
        const filename = res.filePath.split('/').pop() || res.filePath.split('\\').pop() || res.filePath;
        showToast(`Full database backup exported to ${filename}`);
      }
    } catch (err) {
      console.error('Database backup export failed:', err);
      alert(`Backup export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [showToast]);

  const handleRestoreDatabaseBackup = useCallback(async () => {
    if (!window.electronAPI?.importDatabaseBackupDialog) return;
    try {
      const res = await window.electronAPI.importDatabaseBackupDialog();
      if (res.success) {
        showToast(`Restored ${res.restoredProjectCount || 0} screenplay(s) from backup`);
        const recents = await window.electronAPI.getRecentProjects();
        setRecentProjects(recents);
      }
    } catch (err) {
      console.error('Database backup restore failed:', err);
      alert(`Backup restore failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [showToast]);

  // Listen to native Electron menu actions
  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onMenuAction((action) => {
        if (action === 'new-project') handleNewProject();
        else if (action === 'open-project') handleOpenFile();
        else if (action === 'save-project') handleSave();
        else if (action === 'save-project-as') handleSaveAs();
        else if (action === 'export-pdf') handleOpenExport();
        else if (action === 'export-db-backup') handleExportDatabaseBackup();
        else if (action === 'import-db-backup') handleRestoreDatabaseBackup();
        else if (action === 'about') setAboutModalOpen(true);
      });
      return unsubscribe;
    }
  }, [
    handleNewProject,
    handleOpenFile,
    handleSave,
    handleSaveAs,
    handleOpenExport,
    handleExportDatabaseBackup,
    handleRestoreDatabaseBackup,
  ]);

  // Global Keyboard shortcuts (Mod+S, Mod+O, Mod+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) handleSaveAs();
        else handleSave();
      } else if (mod && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if (mod && e.key === 'n') {
        e.preventDefault();
        handleNewProject();
      } else if (mod && e.key === 'f') {
        e.preventDefault();
        // find dialog trigger
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleSaveAs, handleOpenFile, handleNewProject]);

  // Undo / Redo
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [project, ...prev]);
    setProject(previous);
    setSaveStatus('dirty');
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, project]);
    setProject(next);
    setSaveStatus('dirty');
  };

  // Title changes
  const handleTitleChange = (newTitle: string) => {
    commitProjectChange(updateProjectTitle(project, newTitle));
  };

  const handleMetadataChange = (newMeta: TitleMetadata) => {
    commitProjectChange({
      ...project,
      title: newMeta.title,
      metadata: newMeta,
      revision: project.revision + 1,
    });
  };

  // Draft management (DRAFT-01)
  const handleSelectDraft = (draftId: string) => {
    setProject((prev) => ({
      ...prev,
      activeDraftId: draftId,
    }));
  };

  const handleCreateDraft = () => {
    commitProjectChange(cloneDraft(project, project.activeDraftId));
  };

  const handleDeleteDraft = (draftId: string) => {
    const draftToDelete = project.drafts.find((d) => d.id === draftId);
    if (!draftToDelete) return;
    if (project.drafts.length <= 1) return;

    const hasContent = draftToDelete.blocks.some((b) => b.text.trim().length > 0);
    if (hasContent) {
      const confirmed = window.confirm(
        `Are you sure you want to close and remove "${draftToDelete.name}"?`
      );
      if (!confirmed) return;
    }
    commitProjectChange(deleteDraft(project, draftId));
  };

  // Draft updates from ProseMirror
  const handleDraftChange = useCallback(
    (updatedDraft: ScriptDraft) => {
      const updatedDrafts = project.drafts.map((d) =>
        d.id === updatedDraft.id ? updatedDraft : d
      );
      commitProjectChange({
        ...project,
        drafts: updatedDrafts,
        revision: project.revision + 1,
      });
    },
    [project, commitProjectChange]
  );

  const handleContdChoice = (choice: ContdSetting) => {
    commitProjectChange({
      ...project,
      settings: {
        ...project.settings,
        contdSetting: choice,
      },
      revision: project.revision + 1,
    });
    setContdPrompt({ isOpen: false, characterName: '' });
  };

  const handleBlockTypeChange = (blockId: string, newType: ScreenplayBlockType) => {
    const draft = getActiveDraft(project);
    const updatedBlocks = draft.blocks.map((b) =>
      b.id === blockId ? { ...b, type: newType } : b
    );
    const updatedDrafts = project.drafts.map((d) =>
      d.id === draft.id ? { ...d, blocks: updatedBlocks, modifiedAt: new Date().toISOString() } : d
    );
    commitProjectChange({
      ...project,
      drafts: updatedDrafts,
      revision: project.revision + 1,
    });
  };

  // Paper Size change (PAGE-01, DEC-014)
  const handlePaperSizeChange = (paperSize: PaperSize) => {
    commitProjectChange({
      ...project,
      settings: {
        ...project.settings,
        paperSize,
      },
      revision: project.revision + 1,
    });
  };

  // Recovery modal actions (REL-01)
  const handleRestoreRecovery = () => {
    if (recoverySnapshot) {
      setProject(recoverySnapshot.project);
      setCurrentFilePath(recoverySnapshot.filePath || null);
      setRecoverySnapshot(null);
      setSaveStatus('dirty');
    }
  };

  const handleDiscardRecovery = async () => {
    setRecoverySnapshot(null);
    if (window.electronAPI) {
      await window.electronAPI.clearRecovery();
    }
  };

  // Export handlers (EXPORT-01, EXPORT-02, STORE-02)
  const handleExportPdf = async (options: ExportPdfOptions) => {
    if (!window.electronAPI) {
      alert('PDF generation is available in the desktop application.');
      return;
    }
    try {
      // Immutable snapshot of project (EXPORT-01)
      const snapshot: ScriptProject = JSON.parse(JSON.stringify(project));

      let customDraft: ScriptDraft | undefined;
      let pageRanges: string | undefined;

      if (options.exportArea === 'highlighted_text' && options.highlightedBlocks) {
        customDraft = {
          id: 'draft_selection',
          name: 'Selected Excerpt',
          isMain: false,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          blocks: options.highlightedBlocks,
        };
      } else if (options.exportArea === 'selected_pages' && options.pageRange) {
        pageRanges = `${options.pageRange.from}-${options.pageRange.to}`;
      }

      const res = await window.electronAPI.exportPdf({
        project: snapshot,
        paperSize: options.paperSize,
        includeTitlePage: options.includeTitlePage,
        exportArea: options.exportArea,
        pageRanges,
        customDraft,
      });
      if (res.success) {
        console.log('PDF exported successfully to:', res.filePath);
        showToast('PDF exported successfully');
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      alert(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleExportText = async () => {
    const formattedText = exportToPlainText(activeDraft, project.metadata);
    if (window.electronAPI) {
      try {
        await window.electronAPI.exportTextFile(project.title, formattedText);
      } catch (err) {
        console.error('Text export failed:', err);
      }
    } else {
      const blob = new Blob([formattedText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title || 'Screenplay'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportFountain = async () => {
    const fountainText = exportToFountain(activeDraft, project.metadata);
    if (window.electronAPI) {
      try {
        await window.electronAPI.exportFountainFile(project.title, fountainText);
      } catch (err) {
        console.error('Fountain export failed:', err);
      }
    } else {
      const blob = new Blob([fountainText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title || 'Screenplay'}.fountain`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportNativeProject = async () => {
    if (window.electronAPI) {
      try {
        const snapshot: ScriptProject = JSON.parse(JSON.stringify(project));
        await window.electronAPI.exportProjectBundleDialog(project.title, snapshot);
      } catch (err) {
        console.error('Project bundle export failed:', err);
      }
    } else {
      const json = exportProjectBundle(project);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title || 'Screenplay'}.scriptproject`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Import handlers (STORE-02, EXPORT-02, TM-16)
  const handleImportFountain = async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.importFountainDialog();
      if (res && res.content) {
        const { metadata, draft } = importFromFountain(res.content);
        setHistory([]);
        setFuture([]);
        setProject((prev) => ({
          ...prev,
          title: metadata.title || 'Imported Screenplay',
          metadata,
          drafts: [draft],
          activeDraftId: draft.id,
          revision: prev.revision + 1,
        }));
        setCurrentFilePath(null);
        setSaveStatus('dirty');
      }
    } catch (err) {
      console.error('Import fountain failed:', err);
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleImportBundle = async () => {
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.importProjectBundleDialog();
      if (res && res.content) {
        // STORE-02: import as new project with fresh IDs
        const newProj = importProjectBundle(res.content, true);
        setHistory([]);
        setFuture([]);
        setProject(newProj);
        setCurrentFilePath(null);
        setSaveStatus('dirty');
      }
    } catch (err) {
      console.error('Import bundle failed:', err);
      alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div
      className="ds-app flex flex-col h-screen w-screen overflow-hidden select-none"
      style={{ background: 'var(--surface-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Header Row 1 (UI-01, UI-02, SAVE-01) */}
      <HeaderRow1
        title={project.title}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        inputMode={inputMode}
        onToggleInputMode={() => setInputMode((prev) => (prev === 'pa' ? 'en' : 'pa'))}
        currentFilePath={currentFilePath}
        projectSource={projectSource}
        onOpenLibrary={() => setIsWelcomeOpen(true)}
        onOpenSearch={() => {}}
        onRetrySave={handleSave}
        onExpandTitlePage={() => setIsTitlePageExpanded((prev) => !prev)}
        onOpenCustomDictionary={() => setCustomDictionaryOpen(true)}
        onOpenDiagnostics={() => setDiagnosticModalOpen(true)}
        isDiagnosticsRecording={isDiagnosticsRecording}
        onStartDiagnostics={handleStartDiagnostics}
        onStopDiagnostics={handleStopDiagnostics}
        onExportDiagnostics={handleExportDiagnostics}
        onClearOlderDiagnostics={handleClearOlderDiagnostics}
      />

      {/* Header Row 2 (UI-01, UI-03, DRAFT-01, PAGE-01) */}
      <HeaderRow2
        drafts={project.drafts}
        activeDraftId={project.activeDraftId}
        onSelectDraft={handleSelectDraft}
        onCreateDraft={handleCreateDraft}
        onDeleteDraft={handleDeleteDraft}
        paperSize={project.settings.paperSize}
        onPaperSizeChange={handlePaperSizeChange}
        zoom={zoom}
        onZoomChange={setZoom}
        onOpenExport={handleOpenExport}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Document Workspace */}
      <div className="flex-1 flex overflow-hidden relative select-text">
        {/* Left Sidebar Panel (Navigation, Language & Settings) */}
        <LeftSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          inputMode={inputMode}
          onToggleInputMode={() => setInputMode((prev) => (prev === 'pa' ? 'en' : 'pa'))}
          paperSize={project.settings.paperSize}
          onPaperSizeChange={handlePaperSizeChange}
          contdSetting={project.settings.contdSetting}
          onContdSettingChange={handleContdChoice}
          showWordCount={showWordCount}
          onToggleWordCount={handleToggleWordCount}
          highlightCharactersSetting={highlightCharactersSetting}
          onHighlightCharactersSettingChange={handleHighlightCharactersChange}
          onOpenHighlightCharacters={() => setHighlightModalOpen(true)}
          onOpenCustomDictionary={() => setCustomDictionaryOpen(true)}
          onOpenHelp={() => setHelpModalOpen(true)}
          onOpenAbout={() => setAboutModalOpen(true)}
          onOpenDiagnostics={() => setDiagnosticModalOpen(true)}
          onOpenLibrary={() => setLibraryModalOpen(true)}
          draft={activeDraft}
          onToggleKeyboard={() => setVirtualKeyboardOpen((prev) => !prev)}
        />

        {/* Screenplay Document Canvas & Scroller */}
        <ScreenplayCanvas
          ref={editorRef}
          draft={activeDraft}
          metadata={project.metadata}
          onMetadataChange={handleMetadataChange}
          onDraftChange={handleDraftChange}
          contdSetting={project.settings.contdSetting}
          inputMode={inputMode}
          isVirtualKeyboardOpen={virtualKeyboardOpen}
          onToggleVirtualKeyboard={() => setVirtualKeyboardOpen((prev) => !prev)}
          onShiftChange={setIsShiftHeld}
          onAltOrCtrlChange={setIsAltOrCtrlHeld}
          onTriggerContdPrompt={(characterName) =>
            setContdPrompt({ isOpen: true, characterName })
          }
          paperSize={project.settings.paperSize}
          zoom={zoom}
          onFocusTitle={setIsTitleEditing}
          onFocusBlock={setActiveBlock}
          isTitlePageExpanded={isTitlePageExpanded}
          onToggleTitlePageExpand={() => setIsTitlePageExpanded((prev) => !prev)}
          highlightCharacters={highlightCharactersSetting}
          isModalOpen={
            isWelcomeOpen ||
            libraryModalOpen ||
            helpModalOpen ||
            aboutModalOpen ||
            highlightModalOpen ||
            exportModalOpen ||
            diagnosticModalOpen ||
            customDictionaryOpen ||
            recoverySnapshot !== null ||
            contdPrompt.isOpen
          }
        />
      </div>

      {/* Floating Bottom-Center Toolbar (TOOL-01, TOOL-02, TITLE-02) */}
      <FloatingToolbar
        activeBlock={activeBlock}
        isTitleEditing={isTitleEditing}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={() => {
          handleUndo();
          editorRef.current?.focus();
        }}
        onRedo={() => {
          handleRedo();
          editorRef.current?.focus();
        }}
        onApplyFormat={() => {
          editorRef.current?.focus();
        }}
        onToggleCase={() => {
          editorRef.current?.focus();
        }}
        onCopy={() => {
          if (activeBlock) {
            navigator.clipboard.writeText(activeBlock.text);
          }
          editorRef.current?.focus();
        }}
        onSelectBlockType={(type) => {
          if (activeBlock) handleBlockTypeChange(activeBlock.id, type);
          editorRef.current?.focus();
        }}
        isKeyboardOpen={virtualKeyboardOpen}
        onToggleKeyboard={() => {
          setVirtualKeyboardOpen((prev) => !prev);
          editorRef.current?.focus();
        }}
        onKeepFocus={() => editorRef.current?.focus()}
      />

      {/* Virtual Gurmukhi Keyboard (Offline On-Screen Keyboard) */}
      <VirtualGurmukhiKeyboard
        isOpen={virtualKeyboardOpen}
        onClose={() => {
          setVirtualKeyboardOpen(false);
          editorRef.current?.focus();
        }}
        onInsertOutput={(output) => {
          editorRef.current?.insertKeyOutput(output);
          editorRef.current?.focus();
        }}
        onBackspace={() => {
          editorRef.current?.backspace();
          editorRef.current?.focus();
        }}
        onKeepFocus={() => {
          editorRef.current?.focus();
        }}
        externalShift={isShiftHeld}
        onShiftChange={setIsShiftHeld}
        externalAltOrCtrl={isAltOrCtrlHeld}
        onAltOrCtrlChange={setIsAltOrCtrlHeld}
      />

      {/* Bottom-Right Status Chip (STAT-01, PAGE-03, Requirement 4) */}
      <StatusChip
        stats={stats}
        currentPage={currentPage}
        showWordCount={showWordCount}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      {/* Modals & Dialogs */}
      <DiagnosticModal
        isOpen={diagnosticModalOpen}
        onClose={() => setDiagnosticModalOpen(false)}
      />
      <CustomDictionaryModal
        isOpen={customDictionaryOpen}
        onClose={() => setCustomDictionaryOpen(false)}
        customDict={globalCustomDict}
      />
      <ProjectLibraryModal
        isOpen={libraryModalOpen}
        onClose={() => setLibraryModalOpen(false)}
        onNewProject={handleNewProject}
        onOpenFile={handleOpenFile}
        recentProjects={recentProjects}
        onOpenRecent={handleOpenRecent}
        onImportFountain={handleImportFountain}
        onImportBundle={handleImportBundle}
        onExportBackup={handleExportDatabaseBackup}
        onRestoreBackup={handleRestoreDatabaseBackup}
      />

      <RecoveryModal
        snapshot={recoverySnapshot}
        onRestore={handleRestoreRecovery}
        onDiscard={handleDiscardRecovery}
      />

      <HelpShortcutsModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      <AboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
      />

      <HighlightCharactersModal
        isOpen={highlightModalOpen}
        onClose={() => setHighlightModalOpen(false)}
        detectedCharacters={detectedCharacters}
        settings={highlightCharactersSetting}
        onSettingsChange={handleHighlightCharactersChange}
      />

      <ContdPromptModal
        isOpen={contdPrompt.isOpen}
        characterName={contdPrompt.characterName}
        onChoice={handleContdChoice}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        project={project}
        currentPaperSize={project.settings.paperSize}
        totalPages={stats.pageCount}
        highlightedBlocks={highlightedBlocksForExport}
        onExportPdf={handleExportPdf}
        onExportText={handleExportText}
        onExportFountain={handleExportFountain}
        onExportNativeProject={handleExportNativeProject}
        onExportDatabaseBackup={handleExportDatabaseBackup}
      />

      {/* Welcome Screen on launch and upon opening Projects (Requirement 6, 7, 8) */}
      {isWelcomeOpen && (
        <WelcomeScreen
          logoMode={logoMode}
          recentProjects={recentProjects}
          onNewDatabaseProject={handleNewProject}
          onOpenExternalFile={handleOpenFile}
          onOpenRecent={handleOpenRecent}
          onRestoreBackup={handleRestoreDatabaseBackup}
          onExportBackup={handleExportDatabaseBackup}
          canDismiss={true}
          onDismiss={() => setIsWelcomeOpen(false)}
        />
      )}

      {/* Non-intrusive Monochromatic Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-12 left-6 z-50 px-3.5 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{
            background: 'var(--surface-overlay)',
            boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-fill)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
