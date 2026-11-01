import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const platform = process.platform;
const arch = process.arch;
const currentAbi = process.versions.modules;

console.log(`Ensuring SQLite native bindings for platform: ${platform}, arch: ${arch}, Node ABI: ${currentAbi}...`);

const betterSqliteDir = path.join(rootDir, 'node_modules/better-sqlite3');
const bindingsBaseDir = path.join(betterSqliteDir, 'lib/binding');

if (!fs.existsSync(betterSqliteDir)) {
  console.log('better-sqlite3 not found in node_modules, skipping.');
  process.exit(0);
}

const electronBindingDir = path.join(bindingsBaseDir, `node-v130-${platform}-${arch}`);
const electronBindingFile = path.join(electronBindingDir, 'better_sqlite3.node');

const nodeBindingDir = path.join(bindingsBaseDir, `node-v${currentAbi}-${platform}-${arch}`);
const nodeBindingFile = path.join(nodeBindingDir, 'better_sqlite3.node');

// 1. Check if Electron binding is already stored
if (!fs.existsSync(electronBindingFile)) {
  console.log('Rebuilding better-sqlite3 for Electron (ABI 130)...');
  execSync('npx electron-rebuild -f -w better-sqlite3', { cwd: rootDir, stdio: 'inherit' });
  const releaseNode = path.join(betterSqliteDir, 'build/Release/better_sqlite3.node');
  if (fs.existsSync(releaseNode)) {
    fs.mkdirSync(electronBindingDir, { recursive: true });
    fs.copyFileSync(releaseNode, electronBindingFile);
    console.log(`Saved Electron binding to ${electronBindingFile}`);
  }
}

// 2. Check if current Node binding is already stored
if (!fs.existsSync(nodeBindingFile)) {
  console.log(`Rebuilding better-sqlite3 for Node (ABI ${currentAbi})...`);
  execSync('npm rebuild better-sqlite3', { cwd: rootDir, stdio: 'inherit' });
  const releaseNode = path.join(betterSqliteDir, 'build/Release/better_sqlite3.node');
  if (fs.existsSync(releaseNode)) {
    fs.mkdirSync(nodeBindingDir, { recursive: true });
    fs.copyFileSync(releaseNode, nodeBindingFile);
    console.log(`Saved Node binding to ${nodeBindingFile}`);
  }
}

// Ensure the default build/Release has the Electron binary so Electron doesn't crash on standard load
if (fs.existsSync(electronBindingFile)) {
  const releaseDir = path.join(betterSqliteDir, 'build/Release');
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.copyFileSync(electronBindingFile, path.join(releaseDir, 'better_sqlite3.node'));
}

console.log('SQLite bindings check complete!');
