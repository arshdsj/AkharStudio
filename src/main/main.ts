/**
 * main.ts - Electron main process for AkharStudio
 * Baseline: V9.1, DEC-013 (Electron on macOS & Windows, 100% Offline)
 */

import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { FileSystemManager } from '../core/storage/FileSystemManager';
import { DatabaseManager } from './database/DatabaseManager';
import { ScriptProject, PaperSize, ScriptDraft } from '../types/screenplay';
import { getActiveDraft } from '../core/model/ProjectModel';
import { generateScreenplayHtml, generateCharacterSheetHtml } from '../core/export/pdfExporter';
import { exportProjectBundle } from '../core/storage/projectBundle';
import { APP_VERSION, APP_AUTHOR, APP_FULL_NAME } from '../core/version';

let mainWindow: BrowserWindow | null = null;
const userDataPath = app.getPath('userData');
const fsManager = new FileSystemManager(userDataPath);
const dbManager = new DatabaseManager(path.join(userDataPath, 'database'));

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0d0e12',
    title: 'AkharStudio',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false, // Spellcheck off by default for Punjabi (DEC-020)
    },
  });

  // Load from Vite dev server if running, otherwise from packaged dist
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Native Application Menu
  setupApplicationMenu();
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';

  app.setAboutPanelOptions({
    applicationName: APP_FULL_NAME,
    applicationVersion: APP_VERSION,
    version: APP_VERSION,
    copyright: `Created By ${APP_AUTHOR}`,
    authors: [APP_AUTHOR],
  });

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {
                label: `About ${APP_FULL_NAME}`,
                click: () => mainWindow?.webContents.send('menu:about'),
              },
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-project'),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-project'),
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save-project'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:save-project-as'),
        },
        { type: 'separator' },
        {
          label: 'Export Full Database Backup...',
          click: () => mainWindow?.webContents.send('menu:export-db-backup'),
        },
        {
          label: 'Restore Database Backup...',
          click: () => mainWindow?.webContents.send('menu:import-db-backup'),
        },
        { type: 'separator' },
        {
          label: 'Export PDF...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:export-pdf'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: `About ${APP_FULL_NAME}`,
          click: () => mainWindow?.webContents.send('menu:about'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('storage:new-project', async () => {
  return dbManager.createProject();
});

// Database-First Project Handlers
ipcMain.handle('db:create-project', async (_event, project?: ScriptProject) => {
  return dbManager.createProject(project);
});

ipcMain.handle('db:save-project', async (_event, project: ScriptProject) => {
  dbManager.saveProject(project);
  return true;
});

ipcMain.handle('db:get-project', async (_event, id: string) => {
  return dbManager.getProject(id);
});

ipcMain.handle('db:list-projects', async () => {
  return dbManager.listProjects();
});

ipcMain.handle('db:delete-project', async (_event, id: string) => {
  dbManager.deleteProject(id);
  return true;
});

ipcMain.handle('app:get-launch-logo-mode', async () => {
  return dbManager.getNextLogoScriptMode();
});

ipcMain.handle('storage:open-file-dialog', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Punjabi Script',
    filters: [
      { name: 'Punjabi Script Projects', extensions: ['scriptproject', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const project = await fsManager.openProject(filePath);
  dbManager.recordExternalFile(filePath, project.title, project.id);
  return { filePath, project };
});

ipcMain.handle('storage:open-recent-file', async (_event, filePath: string) => {
  const project = await fsManager.openProject(filePath);
  dbManager.recordExternalFile(filePath, project.title, project.id);
  return { filePath, project };
});

ipcMain.handle('storage:save-project', async (_event, filePath: string, project: ScriptProject) => {
  await fsManager.saveProjectAtomic(filePath, project);
  dbManager.recordExternalFile(filePath, project.title, project.id);
  return true;
});

ipcMain.handle('storage:save-project-dialog', async (_event, defaultTitle: string, project: ScriptProject) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Punjabi Script Project',
    defaultPath: `${defaultTitle || 'Screenplay'}.scriptproject`,
    filters: [
      { name: 'Punjabi Script Project (*.scriptproject)', extensions: ['scriptproject'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  const filePath = result.filePath;
  await fsManager.saveProjectAtomic(filePath, project);
  dbManager.recordExternalFile(filePath, project.title, project.id);
  return filePath;
});

ipcMain.handle('storage:autosave-snapshot', async (_event, project: ScriptProject, filePath?: string) => {
  await fsManager.saveRecoverySnapshot(project, filePath);
  return true;
});

ipcMain.handle('storage:check-recovery', async () => {
  return await fsManager.checkRecoverySnapshot();
});

ipcMain.handle('storage:clear-recovery', async () => {
  await fsManager.clearRecoverySnapshot();
  return true;
});

ipcMain.handle('storage:get-recent-projects', async () => {
  return dbManager.getRecentProjects();
});

// Full Database Backup Dialog Handlers (SQLite Online Backup API)
ipcMain.handle('storage:export-database-backup-dialog', async () => {
  if (!mainWindow) return { canceled: true };
  const dateStr = new Date().toISOString().split('T')[0];
  const defaultFilename = `AkharStudio_Backup_${dateStr}.akharbackup`;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Full Database Backup',
    defaultPath: defaultFilename,
    filters: [
      { name: 'AkharStudio Database Backup (*.akharbackup, *.db)', extensions: ['akharbackup', 'db'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  try {
    const backupRes = await dbManager.exportDatabaseBackup(result.filePath);
    return { success: true, filePath: backupRes.filePath };
  } catch (err) {
    console.error('Database backup export failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('storage:import-database-backup-dialog', async () => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Database Backup',
    filters: [
      { name: 'AkharStudio Database Backup (*.akharbackup, *.db)', extensions: ['akharbackup', 'db'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  try {
    const importRes = await dbManager.importDatabaseBackup(result.filePaths[0], 'merge');
    return { success: true, restoredProjectCount: importRes.restoredProjectCount };
  } catch (err) {
    console.error('Database backup import failed:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('window:set-title', (_event, title: string) => {
  if (mainWindow) {
    mainWindow.setTitle(`${title} — AkharStudio`);
  }
});

// Helper to load offline bundled fonts as base64 for PDF rendering
function getEmbeddedFontBase64(fontName: string): string | undefined {
  const possiblePaths = [
    path.join(__dirname, '../assets/fonts', fontName),
    path.join(__dirname, '../../assets/fonts', fontName),
    path.join(process.cwd(), 'assets/fonts', fontName),
    path.join(process.cwd(), 'public/fonts', fontName),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p).toString('base64');
      } catch {
        // Continue to next path candidate
      }
    }
  }
  return undefined;
}

// PDF Export IPC Handler (EXPORT-01, PAGE-01, DEC-014)
ipcMain.handle(
  'export:pdf',
  async (
    _event,
    options: {
      project: ScriptProject;
      paperSize: PaperSize;
      includeTitlePage: boolean;
      exportArea?: 'entire_script' | 'selected_pages' | 'highlighted_text' | 'character_sheet';
      pageRanges?: string;
      customDraft?: ScriptDraft;
    }
  ) => {
    if (!mainWindow) return { canceled: true };

    // 1. Immutable snapshot of project data (EXPORT-01)
    const snapshotProject: ScriptProject = JSON.parse(JSON.stringify(options.project));
    const activeDraft = options.customDraft || getActiveDraft(snapshotProject);
    const exportArea = options.exportArea || 'entire_script';

    // 2. Prompt user with native Save Dialog tailored to export area
    let defaultFilename = `${(snapshotProject.title || 'Screenplay').replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
    let dialogTitle = 'Export Screenplay PDF';

    if (exportArea === 'character_sheet') {
      defaultFilename = `${(snapshotProject.title || 'Screenplay').replace(/[\\/:*?"<>|]/g, '_')}_Character_Sheet.pdf`;
      dialogTitle = 'Export Character Sheet PDF';
    } else if (exportArea === 'highlighted_text') {
      defaultFilename = `${(snapshotProject.title || 'Screenplay').replace(/[\\/:*?"<>|]/g, '_')}_Selection.pdf`;
      dialogTitle = 'Export Selected Text PDF';
    } else if (exportArea === 'selected_pages' && options.pageRanges) {
      defaultFilename = `${(snapshotProject.title || 'Screenplay').replace(/[\\/:*?"<>|]/g, '_')}_Pages_${options.pageRanges.replace('-', '_to_')}.pdf`;
      dialogTitle = `Export Selected Pages (${options.pageRanges}) PDF`;
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: dialogTitle,
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF Document (*.pdf)', extensions: ['pdf'] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    // 3. Load embedded fonts
    const courierFontBase64 = getEmbeddedFontBase64('CourierPrime.ttf');
    const gurmukhiFontBase64 = getEmbeddedFontBase64('NotoSansGurmukhi.ttf');

    // 4. Generate clean self-contained HTML
    let html = '';
    if (exportArea === 'character_sheet') {
      html = generateCharacterSheetHtml(activeDraft, snapshotProject.metadata, {
        paperSize: options.paperSize,
        includeTitlePage: false,
        courierFontBase64,
        gurmukhiFontBase64,
      });
    } else {
      const includeTitle = exportArea === 'entire_script' ? options.includeTitlePage : false;
      html = generateScreenplayHtml(activeDraft, snapshotProject.metadata, {
        paperSize: options.paperSize,
        includeTitlePage: includeTitle,
        courierFontBase64,
        gurmukhiFontBase64,
      });
    }

    // 5. Render in hidden BrowserWindow with Chromium printToPDF
    const printWindow = new BrowserWindow({
      show: false,
      width: 1024,
      height: 1400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    try {
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      const printOptions: Electron.PrintToPDFOptions = {
        pageSize: options.paperSize === 'a4' ? 'A4' : 'Letter',
        margins: { marginType: 'none' }, // CSS @page controlled margins (PAGE-01)
        printBackground: true,
        preferCSSPageSize: true,
        generateTaggedPDF: true, // Tagged PDF for accessibility and logical order
      };

      if (exportArea === 'selected_pages' && options.pageRanges) {
        printOptions.pageRanges = options.pageRanges;
      }

      const pdfBuffer = await printWindow.webContents.printToPDF(printOptions);

      // Write atomically to file
      await fs.promises.writeFile(result.filePath, pdfBuffer);
      return { success: true, filePath: result.filePath };
    } finally {
      printWindow.close();
    }
  }
);

// Plain Text Export Dialog & Save Handler (EXPORT-01)
ipcMain.handle('export:text-file', async (_event, defaultTitle: string, content: string) => {
  if (!mainWindow) return { canceled: true };
  const filename = `${(defaultTitle || 'Screenplay').replace(/[\\/:*?"<>|]/g, '_')}.txt`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Plain Text Screenplay',
    defaultPath: filename,
    filters: [{ name: 'Plain Text (*.txt)', extensions: ['txt'] }],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.promises.writeFile(result.filePath, content, 'utf8');
  return { success: true, filePath: result.filePath };
});

// Fountain Export Dialog & Save Handler (EXPORT-02, TM-16)
ipcMain.handle('export:fountain-file', async (_event, defaultTitle: string, content: string) => {
  if (!mainWindow) return { canceled: true };
  const filename = `${(defaultTitle || 'Screenplay').replace(/[\\/:*?"<>|]/g, '_')}.fountain`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Fountain Screenplay',
    defaultPath: filename,
    filters: [
      { name: 'Fountain Screenplay (*.fountain)', extensions: ['fountain'] },
      { name: 'Plain Text (*.txt)', extensions: ['txt'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.promises.writeFile(result.filePath, content, 'utf8');
  return { success: true, filePath: result.filePath };
});

// Fountain Import Dialog Handler (EXPORT-02, TM-16)
ipcMain.handle('import:fountain-dialog', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Fountain Screenplay',
    filters: [
      { name: 'Fountain / Text (*.fountain, *.txt)', extensions: ['fountain', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await fs.promises.readFile(filePath, 'utf8');
  return { filePath, content };
});

// Native Project Bundle Export (STORE-02, T-11)
ipcMain.handle('storage:export-bundle-dialog', async (_event, defaultTitle: string, project: ScriptProject) => {
  if (!mainWindow) return { canceled: true };
  const filename = `${(defaultTitle || 'Screenplay').replace(/[\\/:*?"<>|]/g, '_')}.scriptproject`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Native Project Bundle',
    defaultPath: filename,
    filters: [{ name: 'Punjabi Script Project (*.scriptproject)', extensions: ['scriptproject'] }],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const jsonBundle = exportProjectBundle(project);
  await fs.promises.writeFile(result.filePath, jsonBundle, 'utf8');
  return { success: true, filePath: result.filePath };
});

// Native Project Bundle Import Dialog (STORE-02, T-11)
ipcMain.handle('storage:import-bundle-dialog', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Native Project Bundle',
    filters: [
      { name: 'Punjabi Script Project (*.scriptproject, *.json)', extensions: ['scriptproject', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await fs.promises.readFile(filePath, 'utf8');
  return { filePath, content };
});

// App Lifecycle
app.whenReady().then(async () => {
  try {
    await dbManager.migrateLegacyFiles(path.join(userDataPath, 'recent-projects.json'));
  } catch (err) {
    console.warn('Legacy recent projects migration check:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  dbManager.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
