import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface PageBoxMetrics {
  page: number;
  offsetWidth: number;
  offsetHeight: number;
  rectWidth: number;
  rectHeight: number;
  firstLineFromTop: number | null;
  lastLineToBottom: number | null;
}

export interface ZoomMetrics {
  zoom: number;
  scale: number;
  offsetWidth: number;
  offsetHeight: number;
  rectWidth: number;
  rectHeight: number;
  unscaledFromRectWidth: number;
  unscaledFromRectHeight: number;
}

export interface ElectronGeometryTestResults {
  letter: PageBoxMetrics[];
  a4: PageBoxMetrics[];
  zoom_75: ZoomMetrics;
  zoom_150: ZoomMetrics;
}

/**
 * Runs real Electron Chromium layout measurements using getBoundingClientRect().
 * Asserts:
 * 1. Each page box height equals paper height (1056px Letter, 1122.5px A4)
 * 2. First line of every page is at 96px from page box top
 * 3. Unscaled layout dimensions during canvas zoom
 * 4. Last page also renders as full-size box
 */
export function runEditorGeometryElectron(): ElectronGeometryTestResults {
  // Fail clearly and immediately if running headless without a display server on Linux
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    throw new Error(
      'Electron geometry test cannot run: No display server found (neither DISPLAY nor WAYLAND_DISPLAY is set). ' +
      'On headless Linux/CI, run with xvfb (e.g. "xvfb-run -a npm test").'
    );
  }

  const tmpDir = os.tmpdir();
  const id = Math.random().toString(36).substring(2, 9);
  const outputFile = path.join(tmpDir, `akhar-geom-${id}.json`);

  try {
    const scriptPath = path.join(process.cwd(), 'test/helpers/run-electron-editor-geometry.cjs');
    execFileSync('npx', ['electron', scriptPath, outputFile], {
      timeout: 30000, // Explicit 30-second timeout to prevent test suite hanging
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!fs.existsSync(outputFile)) {
      throw new Error(`Electron geometry test did not generate output file: ${outputFile}`);
    }

    const data = fs.readFileSync(outputFile, 'utf8');
    return JSON.parse(data) as ElectronGeometryTestResults;
  } catch (err: any) {
    if (err.code === 'ETIMEDOUT') {
      throw new Error('Electron geometry test timed out after 30,000ms. Electron process hung or became unresponsive.');
    }
    const stderr = err.stderr ? `\nElectron stderr:\n${err.stderr}` : '';
    throw new Error(`Electron geometry test failed with error: ${err.message}${stderr}`);
  } finally {
    if (fs.existsSync(outputFile)) {
      try { fs.unlinkSync(outputFile); } catch { /* ignore */ }
    }
  }
}
