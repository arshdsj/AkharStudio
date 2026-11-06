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
  SessionRecoveryCheckpoint,
  ScreenplayBlock,
  ScreenplayBlockType,
  TitleMetadata,
  PaperSize,
  ContdSetting,
} from '../types/screenplay';

import {
  createDefaultProject,
  createScriptVersion,
  getNextVersionNumber,
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
import { CloseConfirmationModal } from './components/CloseConfirmationModal';
import { CreateVersionModal } from './components/CreateVersionModal';
import { SwitchVersionModal } from './components/SwitchVersionModal';
import { RemoveVersionModal } from './components/RemoveVersionModal';
import { PasteConvertModal } from './components/PasteConvertModal';
import { DirectPastePromptModal } from './components/DirectPastePromptModal';
import { HighlightCharactersModal } from './components/HighlightCharactersModal';
import { ExportPdfOptions } from './components/ExportModal';
import { FindBar } from './components/FindBar';
import { SearchState } from '../core/editor/searchPlugin';
import { normalizeCharacterName } from '../core/editor/contd';
import { HighlightCharactersSetting } from '../types/screenplay';
import { getStoredTheme, setTheme as applyAndSaveTheme, ThemeMode } from './utils/theme';
import {
  PaginationEngineSetting,
  getStoredPaginationEngine,
  setStoredPaginationEngine,
} from './utils/paginationSetting';

export const App: React.FC = () => {
  const [project, setProject] = useState<ScriptProject>(() => createDefaultProject());
  const [projectSource, setProjectSource] = useState<ProjectSource>('database');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recoverySnapshot, setRecoverySnapshot] = useState<RecoverySnapshot | SessionRecoveryCheckpoint | null>(null);

  // Autosave configuration & persistence (Stage 1.B)
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('akhar_autosave_enabled');
      if (saved !== null) return saved === 'true';
    }
    return true; // Enabled by default for new installations
  });

  // Close Confirmation state (Stage 1.D)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [isClosingSave, setIsClosingSave] = useState<boolean>(false);
  const [closeSaveError, setCloseSaveError] = useState<string | null>(null);

  // Script Version Management state (Stage 2)
  const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState<boolean>(false);
  const [isSwitchVersionModalOpen, setIsSwitchVersionModalOpen] = useState<boolean>(false);
  const [pendingTargetVersionId, setPendingTargetVersionId] = useState<string | null>(null);
  const [draftToRemove, setDraftToRemove] = useState<ScriptDraft | null>(null);

  // Application Theme state (Requirement 4)
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());

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
  const [formatPainterActive, setFormatPainterActive] = useState<boolean>(false);
  const [contdPrompt, setContdPrompt] = useState<{ isOpen: boolean; characterName: string }>({
    isOpen: false,
    characterName: '',
  });

  // In-Draft Search state (ORG-04 P0)
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCaseSensitive, setSearchCaseSensitive] = useState<boolean>(false);
  const [searchWholeWord, setSearchWholeWord] = useState<boolean>(false);
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    caseSensitive: false,
    wholeWord: false,
    matches: [],
    activeIndex: -1,
  });

  // Pagination Engine state & persistence (Milestone M2E & M2E.1 Audit)
  const [paginationEngine, setPaginationEngine] = useState<PaginationEngineSetting>(() =>
    getStoredPaginationEngine()
  );
  const isUnifiedPaginationActive = paginationEngine === 'unified';
  const [isEditorFallback, setIsEditorFallback] = useState<boolean>(false);

  const handlePaginationEngineChange = (engine: PaginationEngineSetting) => {
    setPaginationEngine(engine);
    setStoredPaginationEngine(engine);
    setIsEditorFallback(false);
  };

  // Roman Punjabi to Gurmukhi Conversion state (Stage 3)
  const [isPasteConvertOpen, setIsPasteConvertOpen] = useState<boolean>(false);
  const [pasteConvertInitialText, setPasteConvertInitialText] = useState<string>('');
  const [directPastePrompt, setDirectPastePrompt] = useState<{ isOpen: boolean; text: string } | null>(null);

  const handleOpenRomanConverter = useCallback((initialText = '') => {
    setPasteConvertInitialText(initialText);
    setIsPasteConvertOpen(true);
  }, []);

  const handleInsertConvertedText = useCallback((gurmukhiText: string, mode: 'cursor' | 'replace-all' = 'cursor') => {
    editorRef.current?.insertConvertedText(gurmukhiText, mode);
  }, []);

  const handleDetectRomanPunjabiPaste = useCallback((text: string) => {
    setDirectPastePrompt({ isOpen: true, text });
  }, []);

  const handleDirectPasteConvertAndInsert = useCallback((convertedText: string) => {
    editorRef.current?.insertConvertedText(convertedText, 'cursor');
    setDirectPastePrompt(null);
  }, []);

  const handleDirectPasteOpenInConverter = useCallback((text: string) => {
    setDirectPastePrompt(null);
    handleOpenRomanConverter(text);
  }, [handleOpenRomanConverter]);

  const handleDirectPasteAsIs = useCallback((rawText: string) => {
    editorRef.current?.insertConvertedText(rawText, 'cursor');
    setDirectPastePrompt(null);
  }, []);

  const handleDirectPasteCancel = useCallback(() => {
    setDirectPastePrompt(null);
  }, []);

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

  // References to eliminate stale closures and prevent save race conditions (Stage 1.A)
  const projectRef = useRef(project);
  projectRef.current = project;

  const saveStatusRef = useRef(saveStatus);
  saveStatusRef.current = saveStatus;

  const autosaveEnabledRef = useRef(autosaveEnabled);
  autosaveEnabledRef.current = autosaveEnabled;

  const activeBlockRef = useRef(activeBlock);
  activeBlockRef.current = activeBlock;

  const isSavingInProgressRef = useRef(false);
  const lastSavedRevisionRef = useRef(project.revision);
  const lastSavedTimeRef = useRef(Date.now());

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

  // Checkpoint session recorder helper (Stage 1.C)
  const recordSessionCheckpoint = useCallback(async (projToRecord: ScriptProject) => {
    if (!window.electronAPI?.saveSessionCheckpoint) return;
    try {
      const draft = getActiveDraft(projToRecord);
      const activeScene = draft.blocks.find(
        (b) => b.type === 'scene_heading' && (activeBlockRef.current ? b.id === activeBlockRef.current.id : true)
      );
      const checkpoint: SessionRecoveryCheckpoint = {
        timestamp: new Date().toISOString(),
        projectId: projToRecord.id,
        projectTitle: projToRecord.title,
        activeDraftId: projToRecord.activeDraftId,
        activeDraftName: draft.name,
        activeSceneId: activeScene?.id,
        activeSceneHeading: activeScene?.text,
        projectSnapshot: projToRecord,
      };
      await window.electronAPI.saveSessionCheckpoint(checkpoint);
    } catch (err) {
      console.warn('Failed to record session checkpoint:', err);
    }
  }, []);

  // Transactional flush save with race condition prevention (Stage 1.A)
  const flushSave = useCallback(
    async (forcedProj?: ScriptProject): Promise<boolean> => {
      const targetProj = forcedProj || projectRef.current;
      if (!window.electronAPI) return false;

      // If not dirty and not forced, save is clean
      if (!forcedProj && saveStatusRef.current === 'clean') {
        return true;
      }

      if (isSavingInProgressRef.current) {
        return false;
      }

      const savingRevision = targetProj.revision;
      isSavingInProgressRef.current = true;
      setSaveStatus('saving');

      try {
        await window.electronAPI.dbSaveProject(targetProj);
        await recordSessionCheckpoint(targetProj);
        lastSavedRevisionRef.current = savingRevision;
        lastSavedTimeRef.current = Date.now();

        // Prevent race condition: only transition to 'clean' if no newer edits occurred during the save
        if (projectRef.current.revision <= savingRevision) {
          setSaveStatus('clean');
        } else {
          setSaveStatus('dirty');
        }

        const recents = await window.electronAPI.getRecentProjects();
        setRecentProjects(recents);
        return true;
      } catch (err) {
        console.error('Transactional save error:', err);
        setSaveStatus('error');
        throw err;
      } finally {
        isSavingInProgressRef.current = false;
      }
    },
    [recordSessionCheckpoint]
  );

  // Autosave toggle persistence (Stage 1.B)
  const handleToggleAutosave = useCallback((val: boolean) => {
    setAutosaveEnabled(val);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('akhar_autosave_enabled', String(val));
    }
    setProject((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        autosave: val,
      },
    }));
    showToast(val ? 'Autosave enabled' : 'Autosave disabled (manual save required)');
  }, [showToast]);

  // 1. Startup: Check for recovery snapshot & load recent projects (Stage 1.C)
  useEffect(() => {
    async function init() {
      if (window.electronAPI) {
        try {
          if (window.electronAPI.getLaunchLogoMode) {
            const mode = await window.electronAPI.getLaunchLogoMode();
            if (mode) setLogoMode(mode);
          }

          // Check for interrupted crash session checkpoint first
          let foundRecovery: SessionRecoveryCheckpoint | RecoverySnapshot | null = null;
          if (window.electronAPI.checkInterruptedSession) {
            const interrupted = await window.electronAPI.checkInterruptedSession();
            if (interrupted && interrupted.projectSnapshot) {
              foundRecovery = interrupted;
            }
          }

          if (!foundRecovery && window.electronAPI.checkRecovery) {
            const snapshot = await window.electronAPI.checkRecovery();
            if (snapshot && snapshot.project) {
              foundRecovery = snapshot;
            }
          }

          if (foundRecovery) {
            setRecoverySnapshot(foundRecovery);
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

  // Intercept native close requests for close confirmation dialogue (Stage 1.D)
  useEffect(() => {
    if (window.electronAPI?.onRequestClose) {
      const unsubscribe = window.electronAPI.onRequestClose(() => {
        setCloseSaveError(null);
        setIsCloseModalOpen(true);
      });
      return unsubscribe;
    }
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

  // Autosave controller (Debounced + Continuous Typing Max Interval) (Stage 1.A, 1.B)
  useEffect(() => {
    if (!autosaveEnabled || saveStatus !== 'dirty') return;

    // Check if continuous typing interval exceeded maximum of 5000ms
    const timeSinceLastSave = Date.now() - lastSavedTimeRef.current;
    if (timeSinceLastSave >= 5000) {
      flushSave().catch((err) => console.error('Continuous interval save error:', err));
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Inactivity debounce timer (1200ms)
    autosaveTimeoutRef.current = setTimeout(() => {
      flushSave().catch((err) => console.error('Inactivity autosave error:', err));
    }, 1200);

    // Continuous typing safety timer (guarantees save within 5000ms even if typing never pauses)
    const continuousTimer = setTimeout(() => {
      if (saveStatusRef.current === 'dirty') {
        flushSave().catch((err) => console.error('Periodic max interval save error:', err));
      }
    }, Math.max(400, 5000 - timeSinceLastSave));

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      clearTimeout(continuousTimer);
    };
  }, [project, saveStatus, autosaveEnabled, flushSave]);

  // Actions
  const handleSave = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      setSaveStatus('saving');
      // Direct database save (Requirement 1: Database is single source of truth)
      await window.electronAPI.dbSaveProject(project);
      setSaveStatus('clean');
      const recents = await window.electronAPI.getRecentProjects();
      setRecentProjects(recents);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
    }
  }, [project]);

  const handleSaveAs = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      // External project files are strictly for export and sharing (Requirement 1)
      await window.electronAPI.exportProjectBundleDialog(project.title, project);
    } catch (err) {
      console.error('Export failed:', err);
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
        setCurrentFilePath(null);
        setProjectSource('database');
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
          setCurrentFilePath(null);
          setProjectSource('database');
          setSaveStatus('clean');
          setIsWelcomeOpen(false);
          const recents = await window.electronAPI.getRecentProjects();
          setRecentProjects(recents);
        }
        return;
      }

      if (recentItem.id) {
        const loaded = await window.electronAPI.dbGetProject(recentItem.id);
        if (loaded) {
          setHistory([]);
          setFuture([]);
          setProject(loaded);
          setCurrentFilePath(null);
          setProjectSource('database');
          setSaveStatus('clean');
          setIsWelcomeOpen(false);
          return;
        }
      }

      if (recentItem.filePath) {
        const result = await window.electronAPI.openRecentFile(recentItem.filePath);
        if (result) {
          setHistory([]);
          setFuture([]);
          setProject(result.project);
          setCurrentFilePath(null);
          setProjectSource('database');
          setSaveStatus('clean');
          setIsWelcomeOpen(false);
          const recents = await window.electronAPI.getRecentProjects();
          setRecentProjects(recents);
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

  // In-Draft Search handlers (ORG-04 P0)
  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    editorRef.current?.clearSearch();
    editorRef.current?.focus();
  }, []);

  const handleSearchQueryChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      editorRef.current?.setSearch(query, searchCaseSensitive, searchWholeWord);
    },
    [searchCaseSensitive, searchWholeWord]
  );

  const handleToggleCaseSensitive = useCallback(() => {
    setSearchCaseSensitive((prev) => {
      const next = !prev;
      editorRef.current?.setSearch(searchQuery, next, searchWholeWord);
      return next;
    });
  }, [searchQuery, searchWholeWord]);

  const handleToggleWholeWord = useCallback(() => {
    setSearchWholeWord((prev) => {
      const next = !prev;
      editorRef.current?.setSearch(searchQuery, searchCaseSensitive, next);
      return next;
    });
  }, [searchQuery, searchCaseSensitive]);

  const handleFindNext = useCallback(() => {
    editorRef.current?.findNext();
  }, []);

  const handleFindPrev = useCallback(() => {
    editorRef.current?.findPrev();
  }, []);

  // Global Keyboard shortcuts (Mod+S, Mod+O, Mod+N, Mod+F)
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
        handleOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleSaveAs, handleOpenFile, handleNewProject, handleOpenSearch]);

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

  // Script Version Switching (Stage 2.C)
  const handleSelectDraft = useCallback(
    async (targetDraftId: string) => {
      if (targetDraftId === project.activeDraftId) return;

      // If autosave is enabled, flush pending changes before switching
      if (autosaveEnabledRef.current) {
        if (saveStatusRef.current === 'dirty') {
          await flushSave();
        }
        setProject((prev) => ({
          ...prev,
          activeDraftId: targetDraftId,
        }));
        return;
      }

      // If autosave is disabled and changes are pending, prompt the user
      if (saveStatusRef.current === 'dirty') {
        setPendingTargetVersionId(targetDraftId);
        setIsSwitchVersionModalOpen(true);
        return;
      }

      setProject((prev) => ({
        ...prev,
        activeDraftId: targetDraftId,
      }));
    },
    [project.activeDraftId, flushSave]
  );

  // Script Version Creation (Stage 2.A)
  const handleCreateVersion = useCallback(
    async (customName?: string) => {
      if (autosaveEnabledRef.current && saveStatusRef.current === 'dirty') {
        await flushSave();
      }
      const newProj = createScriptVersion(project, project.activeDraftId, customName);
      commitProjectChange(newProj);
      if (autosaveEnabledRef.current) {
        await flushSave(newProj);
      }
      const createdDraft = getActiveDraft(newProj);
      showToast(`Created ${createdDraft.name}`);
    },
    [project, commitProjectChange, flushSave, showToast]
  );

  const handleCreateDraft = () => {
    setIsCreateVersionModalOpen(true);
  };

  const handleSaveAndSwitchVersion = useCallback(async () => {
    if (!pendingTargetVersionId) return;
    await flushSave();
    setProject((prev) => ({
      ...prev,
      activeDraftId: pendingTargetVersionId,
    }));
    setIsSwitchVersionModalOpen(false);
    setPendingTargetVersionId(null);
  }, [pendingTargetVersionId, flushSave]);

  const handleDiscardAndSwitchVersion = useCallback(async () => {
    if (!pendingTargetVersionId) return;
    if (window.electronAPI) {
      const loaded = await window.electronAPI.dbGetProject(project.id);
      if (loaded) {
        setProject({
          ...loaded,
          activeDraftId: pendingTargetVersionId,
        });
        setSaveStatus('clean');
      } else {
        setProject((prev) => ({
          ...prev,
          activeDraftId: pendingTargetVersionId,
        }));
      }
    } else {
      setProject((prev) => ({
        ...prev,
        activeDraftId: pendingTargetVersionId,
      }));
    }
    setIsSwitchVersionModalOpen(false);
    setPendingTargetVersionId(null);
  }, [pendingTargetVersionId, project.id]);

  const handleDeleteDraft = (draftId: string) => {
    const draftToDelete = project.drafts.find((d) => d.id === draftId);
    if (!draftToDelete) return;
    if (project.drafts.length <= 1) return;

    const hasContent = draftToDelete.blocks.some((b) => b.text.trim().length > 0);
    if (hasContent) {
      setDraftToRemove(draftToDelete);
      return;
    }
    commitProjectChange(deleteDraft(project, draftId));
  };

  const handleConfirmRemoveVersion = () => {
    if (!draftToRemove) return;
    commitProjectChange(deleteDraft(project, draftToRemove.id));
    setDraftToRemove(null);
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyAndSaveTheme(newTheme);
  };

  // Draft updates from ProseMirror (with line completion trigger)
  const handleDraftChange = useCallback(
    (updatedDraft: ScriptDraft, options?: { isLineCompleted?: boolean }) => {
      const updatedDrafts = project.drafts.map((d) =>
        d.id === updatedDraft.id ? updatedDraft : d
      );
      const nextProject: ScriptProject = {
        ...project,
        drafts: updatedDrafts,
        revision: project.revision + 1,
      };
      commitProjectChange(nextProject);

      // Line completion immediate save trigger (Stage 1.A)
      if (options?.isLineCompleted && autosaveEnabledRef.current) {
        flushSave(nextProject).catch((err) =>
          console.error('Line completion autosave error:', err)
        );
      }
    },
    [project, commitProjectChange, flushSave]
  );

  const handleSceneSwitch = useCallback(
    (_sceneBlockId: string) => {
      if (autosaveEnabledRef.current && saveStatusRef.current === 'dirty') {
        flushSave().catch((err) => console.error('Scene switch autosave error:', err));
      }
    },
    [flushSave]
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

  // Recovery modal actions (Stage 1.C, REL-01)
  const handleRestoreRecovery = () => {
    if (recoverySnapshot) {
      const restored =
        'projectSnapshot' in recoverySnapshot
          ? recoverySnapshot.projectSnapshot
          : recoverySnapshot.project;

      setProject(restored);
      if ('activeDraftId' in recoverySnapshot && recoverySnapshot.activeDraftId) {
        setProject((p) => ({ ...p, activeDraftId: recoverySnapshot.activeDraftId! }));
      }
      setSaveStatus('dirty');
      setRecoverySnapshot(null);
      if (window.electronAPI?.clearSessionCheckpoint) {
        window.electronAPI.clearSessionCheckpoint();
      }
      showToast('Previous session restored successfully');
    }
  };

  const handleDiscardRecovery = async () => {
    setRecoverySnapshot(null);
    if (window.electronAPI) {
      if (window.electronAPI.clearSessionCheckpoint) {
        await window.electronAPI.clearSessionCheckpoint();
      }
      if (window.electronAPI.clearRecovery) {
        await window.electronAPI.clearRecovery();
      }
    }
    showToast('Recovery checkpoint discarded');
  };

  // Close confirmation actions (Stage 1.D, 1.E)
  const handleConfirmClose = useCallback(async () => {
    setIsCloseModalOpen(false);
    if (window.electronAPI?.confirmQuit) {
      await window.electronAPI.confirmQuit();
    }
  }, []);

  const handleCloseWithoutSaving = useCallback(async () => {
    setIsCloseModalOpen(false);
    if (window.electronAPI?.confirmQuit) {
      await window.electronAPI.confirmQuit({ forceQuit: true });
    }
  }, []);

  const handleSaveAndClose = useCallback(async () => {
    setIsClosingSave(true);
    setCloseSaveError(null);
    try {
      await flushSave();
      if (window.electronAPI?.confirmQuit) {
        await window.electronAPI.confirmQuit();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setCloseSaveError(msg);
    } finally {
      setIsClosingSave(false);
    }
  }, [flushSave]);

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
        password: options.password,
        preserveCharacterHighlights: options.preserveCharacterHighlights,
        useUnifiedPagination: isUnifiedPaginationActive && !isEditorFallback,
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
        // STORE-02: import as new project with fresh IDs and save into DB
        const newProj = importProjectBundle(res.content, true);
        await window.electronAPI.dbSaveProject(newProj);
        setHistory([]);
        setFuture([]);
        setProject(newProj);
        setCurrentFilePath(null);
        setProjectSource('database');
        setSaveStatus('clean');
        const recents = await window.electronAPI.getRecentProjects();
        setRecentProjects(recents);
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
        autosaveEnabled={autosaveEnabled}
        inputMode={inputMode}
        onToggleInputMode={() => setInputMode((prev) => (prev === 'pa' ? 'en' : 'pa'))}
        currentFilePath={currentFilePath}
        projectSource={projectSource}
        onOpenLibrary={() => setIsWelcomeOpen(true)}
        onOpenRomanConverter={handleOpenRomanConverter}
        onOpenSearch={handleOpenSearch}
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
          autosaveEnabled={autosaveEnabled}
          onToggleAutosave={handleToggleAutosave}
          showWordCount={showWordCount}
          onToggleWordCount={handleToggleWordCount}
          highlightCharactersSetting={highlightCharactersSetting}
          onHighlightCharactersSettingChange={handleHighlightCharactersChange}
          onOpenHighlightCharacters={() => setHighlightModalOpen(true)}
          onOpenCustomDictionary={() => setCustomDictionaryOpen(true)}
          onOpenRomanConverter={handleOpenRomanConverter}
          onOpenHelp={() => setHelpModalOpen(true)}
          onOpenAbout={() => setAboutModalOpen(true)}
          onOpenDiagnostics={() => setDiagnosticModalOpen(true)}
          onOpenLibrary={() => setLibraryModalOpen(true)}
          draft={activeDraft}
          onToggleKeyboard={() => setVirtualKeyboardOpen((prev) => !prev)}
          onSceneSwitch={handleSceneSwitch}
          theme={theme}
          onThemeChange={handleThemeChange}
          paginationEngine={paginationEngine}
          onPaginationEngineChange={handlePaginationEngineChange}
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
            isCloseModalOpen ||
            isCreateVersionModalOpen ||
            isSwitchVersionModalOpen ||
            draftToRemove !== null ||
            isPasteConvertOpen ||
            Boolean(directPastePrompt?.isOpen) ||
            contdPrompt.isOpen
          }
          onSearchStateChange={setSearchState}
          onDetectRomanPunjabiPaste={handleDetectRomanPunjabiPaste}
          useUnifiedPagination={isUnifiedPaginationActive}
          onPaginationEngineStatusChange={(status) => {
            setIsEditorFallback(status.isFallback);
            if (status.isFallback && status.fallbackReason) {
              console.warn(`[App] Editor pagination fell back to legacy: ${status.fallbackReason}`);
            }
          }}
        />

        {/* In-Draft Search Bar (ORG-04 P0, A11Y-01) */}
        <FindBar
          isOpen={isSearchOpen}
          onClose={handleCloseSearch}
          query={searchQuery}
          onQueryChange={handleSearchQueryChange}
          matchesCount={searchState.matches.length}
          activeIndex={searchState.activeIndex}
          caseSensitive={searchCaseSensitive}
          onToggleCaseSensitive={handleToggleCaseSensitive}
          wholeWord={searchWholeWord}
          onToggleWholeWord={handleToggleWholeWord}
          onFindNext={handleFindNext}
          onFindPrev={handleFindPrev}
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
        onApplyFormat={(fmt) => {
          editorRef.current?.toggleFormat(fmt);
          editorRef.current?.focus();
        }}
        onHighlight={() => {
          editorRef.current?.toggleHighlight();
          editorRef.current?.focus();
        }}
        onFormatPainter={() => {
          const active = editorRef.current?.triggerFormatPainter();
          setFormatPainterActive(Boolean(active));
          editorRef.current?.focus();
        }}
        isFormatPainterActive={formatPainterActive}
        onLink={(url) => {
          editorRef.current?.setLink(url);
          editorRef.current?.focus();
        }}
        onAddAnnotationLayer={(layer) => {
          editorRef.current?.setBlockAnnotation(layer);
          editorRef.current?.focus();
        }}
        onComment={(comment) => {
          editorRef.current?.setBlockComment(comment);
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
          if (editorRef.current) {
            editorRef.current.setBlockType(type);
          } else if (activeBlock) {
            handleBlockTypeChange(activeBlock.id, type);
          }
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

      <CloseConfirmationModal
        isOpen={isCloseModalOpen}
        autosaveEnabled={autosaveEnabled}
        saveStatus={saveStatus}
        projectTitle={project.title}
        onConfirmClose={handleConfirmClose}
        onSaveAndClose={handleSaveAndClose}
        onCloseWithoutSaving={handleCloseWithoutSaving}
        onCancel={() => setIsCloseModalOpen(false)}
        isSaving={isClosingSave}
        saveError={closeSaveError}
      />

      <CreateVersionModal
        isOpen={isCreateVersionModalOpen}
        onClose={() => setIsCreateVersionModalOpen(false)}
        onCreate={handleCreateVersion}
        nextVersionNumber={getNextVersionNumber(project)}
        activeVersionName={activeDraft.name}
      />

      <SwitchVersionModal
        isOpen={isSwitchVersionModalOpen}
        onCancel={() => {
          setIsSwitchVersionModalOpen(false);
          setPendingTargetVersionId(null);
        }}
        onSaveAndSwitch={handleSaveAndSwitchVersion}
        onDiscardAndSwitch={handleDiscardAndSwitchVersion}
        targetVersionName={
          project.drafts.find((d) => d.id === pendingTargetVersionId)?.name || 'target version'
        }
      />

      <RemoveVersionModal
        isOpen={Boolean(draftToRemove)}
        versionName={draftToRemove?.name || ''}
        onCancel={() => setDraftToRemove(null)}
        onConfirm={handleConfirmRemoveVersion}
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

      {/* Stage 3: Roman Punjabi to Gurmukhi Paste & Convert Modal */}
      <PasteConvertModal
        isOpen={isPasteConvertOpen}
        onClose={() => setIsPasteConvertOpen(false)}
        onInsert={handleInsertConvertedText}
        initialText={pasteConvertInitialText}
        hasSelection={editorRef.current?.hasSelection() ?? false}
      />

      {/* Stage 3.D: Direct Paste Detection Prompt */}
      <DirectPastePromptModal
        isOpen={Boolean(directPastePrompt?.isOpen)}
        pastedText={directPastePrompt?.text || ''}
        onConvertAndInsert={handleDirectPasteConvertAndInsert}
        onOpenInConverter={handleDirectPasteOpenInConverter}
        onPasteAsIs={handleDirectPasteAsIs}
        onCancel={handleDirectPasteCancel}
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
      <WelcomeScreen
        isOpen={isWelcomeOpen}
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
