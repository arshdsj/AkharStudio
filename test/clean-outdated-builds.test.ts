import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
// @ts-expect-error JS script without types
import { cleanOutdatedBuilds } from '../scripts/clean-outdated-builds.js';

describe('clean-outdated-builds: automatic purging of outdated release packages', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akhar-build-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('deletes packages from previous versions while preserving current version builds', () => {
    // Populate temp release dir with both old and current builds
    const oldDmg = path.join(tempDir, 'AkharStudio-1.2.0-arm64.dmg');
    const oldExe = path.join(tempDir, 'AkharStudio Setup 1.3.0.exe');
    const oldBlockmap = path.join(tempDir, 'AkharStudio-1.3.0-arm64.dmg.blockmap');
    const currentDmg = path.join(tempDir, 'AkharStudio-1.3.1-arm64.dmg');
    const currentZip = path.join(tempDir, 'AkharStudio-1.3.1-arm64-mac.zip');

    fs.writeFileSync(oldDmg, 'old-1.2.0');
    fs.writeFileSync(oldExe, 'old-1.3.0');
    fs.writeFileSync(oldBlockmap, 'old-blockmap-1.3.0');
    fs.writeFileSync(currentDmg, 'current-1.3.1');
    fs.writeFileSync(currentZip, 'current-1.3.1');

    expect(fs.existsSync(oldDmg)).toBe(true);
    expect(fs.existsSync(oldExe)).toBe(true);
    expect(fs.existsSync(oldBlockmap)).toBe(true);
    expect(fs.existsSync(currentDmg)).toBe(true);
    expect(fs.existsSync(currentZip)).toBe(true);

    // Run cleanOutdatedBuilds for version 1.3.1
    cleanOutdatedBuilds({
      targetDir: tempDir,
      currentVersion: '1.3.1',
    });

    // Old versions must be purged
    expect(fs.existsSync(oldDmg)).toBe(false);
    expect(fs.existsSync(oldExe)).toBe(false);
    expect(fs.existsSync(oldBlockmap)).toBe(false);

    // Current version must be kept
    expect(fs.existsSync(currentDmg)).toBe(true);
    expect(fs.existsSync(currentZip)).toBe(true);
  });

  it('purges outdated YAML descriptor files when their version does not match', () => {
    const oldYaml = path.join(tempDir, 'latest.yml');
    const currentYaml = path.join(tempDir, 'latest-mac.yml');

    fs.writeFileSync(oldYaml, 'version: 1.3.0\nfiles:\n  - url: AkharStudio.exe\n');
    fs.writeFileSync(currentYaml, 'version: 1.3.1\nfiles:\n  - url: AkharStudio.dmg\n');

    cleanOutdatedBuilds({
      targetDir: tempDir,
      currentVersion: '1.3.1',
    });

    expect(fs.existsSync(oldYaml)).toBe(false);
    expect(fs.existsSync(currentYaml)).toBe(true);
  });
});
