#!/usr/bin/env node
/**
 * clean-outdated-builds.js
 * Automatically deletes outdated application build packages from the release directory.
 * Keeps only builds matching the current package.json version.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function cleanOutdatedBuilds(options = {}) {
  const pkgPath = path.join(rootDir, 'package.json');
  let currentVersion = options.currentVersion;
  let releaseDir = options.targetDir;

  if (!currentVersion || !releaseDir) {
    if (!fs.existsSync(pkgPath)) {
      console.warn('[clean-outdated-builds] package.json not found.');
      return;
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    currentVersion = currentVersion || pkg.version;
    releaseDir = releaseDir || path.resolve(rootDir, pkg.build?.directories?.output || 'release');
  }

  if (!fs.existsSync(releaseDir)) {
    return;
  }

  console.log(`[clean-outdated-builds] Checking for outdated builds in "${path.relative(rootDir, releaseDir)}" (current version: v${currentVersion})...`);

  const semverRegex = /\b(\d+\.\d+(?:\.\d+)?)\b/;
  const entries = fs.readdirSync(releaseDir);
  let removedCount = 0;
  let freedBytes = 0;

  for (const entry of entries) {
    // Skip hidden files like .DS_Store
    if (entry.startsWith('.')) continue;

    const fullPath = path.join(releaseDir, entry);
    let shouldDelete = false;

    // Check version in filename (e.g. AkharStudio-1.3.0-arm64.dmg vs 1.3.1)
    const match = entry.match(semverRegex);
    if (match) {
      const fileVersion = match[1];
      if (fileVersion !== currentVersion) {
        shouldDelete = true;
      }
    }

    // Check YAML release descriptor files (e.g. latest.yml, latest-mac.yml)
    if (!shouldDelete && (entry.endsWith('.yml') || entry.endsWith('.yaml'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const versionMatch = content.match(/version:\s*([0-9a-zA-Z.-]+)/);
        if (versionMatch && versionMatch[1] !== currentVersion) {
          shouldDelete = true;
        }
      } catch {
        // ignore read error
      }
    }

    if (shouldDelete) {
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          freedBytes += stats.size;
          fs.unlinkSync(fullPath);
        }
        removedCount++;
        console.log(`  ✓ Removed outdated build: ${entry}`);
      } catch (err) {
        console.warn(`  ✗ Failed to delete ${entry}:`, err.message);
      }
    }
  }

  const freedMB = (freedBytes / (1024 * 1024)).toFixed(1);
  if (removedCount > 0) {
    console.log(`[clean-outdated-builds] Successfully deleted ${removedCount} outdated build file(s), freed ${freedMB} MB.`);
  } else {
    console.log(`[clean-outdated-builds] No outdated builds found. All release artifacts match v${currentVersion}.`);
  }
}

// Run automatically when executed directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  cleanOutdatedBuilds();
}
