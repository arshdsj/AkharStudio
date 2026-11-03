/**
 * stage2-script-versions.test.ts - Automated Unit & Integration Tests for Stage 2
 * Script Version Management, Version Independence, Numbering & Switching
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DatabaseManager } from '../src/main/database/DatabaseManager';
import {
  createDefaultProject,
  createScriptVersion,
  getNextVersionNumber,
  formatVersionDisplayName,
  getActiveDraft,
} from '../src/core/model/ProjectModel';
import { ScriptProject } from '../src/types/screenplay';

describe('Stage 2: Script Version Management', () => {
  let tempDir: string;
  let dbManager: DatabaseManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'akhar_stage2_test_'));
    dbManager = new DatabaseManager(tempDir, 'test_stage2.db');
  });

  afterEach(() => {
    try {
      dbManager.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('calculates the next available version number accurately', () => {
    const project = createDefaultProject();
    expect(getNextVersionNumber(project)).toBe(2);

    const withV2 = createScriptVersion(project, project.activeDraftId);
    expect(withV2.drafts.length).toBe(2);
    expect(getNextVersionNumber(withV2)).toBe(3);

    const withV3Custom = createScriptVersion(withV2, withV2.activeDraftId, 'Alternate Ending');
    expect(withV3Custom.drafts.length).toBe(3);
    expect(withV3Custom.drafts[2].name).toBe('Version 3 — Alternate Ending');
    expect(getNextVersionNumber(withV3Custom)).toBe(4);
  });

  it('formats display names for legacy and newly created versions', () => {
    const project = createDefaultProject();
    const v1 = project.drafts[0];
    expect(formatVersionDisplayName(v1, 0)).toBe('Version 1 — Original');

    const v2 = { ...v1, name: 'Version 2 — Alternate Story' };
    expect(formatVersionDisplayName(v2, 1)).toBe('Version 2 — Alternate Story');
  });

  it('creates Version 2 as an independent copy of Version 1, making it active immediately', () => {
    const project = createDefaultProject();
    const v1Draft = getActiveDraft(project);
    v1Draft.blocks = [
      { id: 'b1', type: 'scene_heading', text: 'INT. DHABA - DAY' },
      { id: 'b2', type: 'character', text: 'ਜੀਤਾ' },
      { id: 'b3', type: 'dialogue', text: 'ਕਿੱਥੇ ਚੱਲਿਆ ਤੂੰ?' },
    ];
    dbManager.createProject(project);

    // 1. Create Version 2 from Version 1
    const v2Project = createScriptVersion(project, project.activeDraftId, 'Alternate Story');
    expect(v2Project.drafts.length).toBe(2);
    expect(v2Project.activeDraftId).toBe(v2Project.drafts[1].id);
    expect(v2Project.drafts[1].name).toBe('Version 2 — Alternate Story');
    expect(v2Project.drafts[1].sourceDraftId).toBe(v1Draft.id);

    // 2. Modify dialogue in Version 2
    const v2Draft = getActiveDraft(v2Project);
    v2Draft.blocks[2].text = 'ਮੈਂ ਤਾਂ ਸ਼ਹਿਰ ਚੱਲਿਆ ਹਾਂ!';

    // 3. Delete a scene or block in Version 2 (using Version 2's cloned block ID)
    const firstBlockId = v2Draft.blocks[0].id;
    v2Draft.blocks = v2Draft.blocks.filter((b) => b.id !== firstBlockId);
    expect(v2Draft.blocks.length).toBe(2);

    // Save project in DB
    dbManager.saveProject(v2Project);

    // 4. Switch back to Version 1
    const switchedToV1: ScriptProject = {
      ...v2Project,
      activeDraftId: v1Draft.id,
    };
    const activeV1 = getActiveDraft(switchedToV1);

    // 5. Verify that Version 1 is completely unchanged!
    expect(activeV1.id).toBe(v1Draft.id);
    expect(activeV1.blocks.length).toBe(3);
    expect(activeV1.blocks[0].text).toBe('INT. DHABA - DAY');
    expect(activeV1.blocks[1].text).toBe('ਜੀਤਾ');
    expect(activeV1.blocks[2].text).toBe('ਕਿੱਥੇ ਚੱਲਿਆ ਤੂੰ?');

    // 6. Restart application: reload project from DB and verify all versions remain available
    const reloaded = dbManager.getProject(project.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded?.drafts.length).toBe(2);
    expect(reloaded?.drafts[0].blocks.length).toBe(3);
    expect(reloaded?.drafts[0].blocks[2].text).toBe('ਕਿੱਥੇ ਚੱਲਿਆ ਤੂੰ?');
    expect(reloaded?.drafts[1].blocks.length).toBe(2);
    expect(reloaded?.drafts[1].blocks[1].text).toBe('ਮੈਂ ਤਾਂ ਸ਼ਹਿਰ ਚੱਲਿਆ ਹਾਂ!');

    // 7. Create Version 3 from Version 2 and verify that it copies the currently active version (Version 2)
    const v3Project = createScriptVersion(reloaded!, reloaded!.drafts[1].id, 'Revised Ending');
    expect(v3Project.drafts.length).toBe(3);
    const activeV3 = getActiveDraft(v3Project);
    expect(activeV3.name).toBe('Version 3 — Revised Ending');
    expect(activeV3.sourceDraftId).toBe(reloaded!.drafts[1].id);
    expect(activeV3.blocks.length).toBe(2);
    expect(activeV3.blocks[1].text).toBe('ਮੈਂ ਤਾਂ ਸ਼ਹਿਰ ਚੱਲਿਆ ਹਾਂ!');
  });

  it('guarantees complete independence for block IDs, notes, and formats across versions', () => {
    const project = createDefaultProject();
    const v1Draft = getActiveDraft(project);
    v1Draft.blocks = [
      {
        id: 'orig_block_1',
        type: 'dialogue',
        text: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ',
        notes: 'Original note for actor',
        formats: [{ type: 'bold', from: 0, to: 4 }],
      },
    ];

    const v2Project = createScriptVersion(project, v1Draft.id);
    const v2Draft = getActiveDraft(v2Project);

    // Verify block IDs are not reused
    expect(v2Draft.blocks[0].id).not.toBe('orig_block_1');
    expect(v2Draft.blocks[0].text).toBe('ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ');

    // Modifying notes/formats in Version 2 does not mutate Version 1
    v2Draft.blocks[0].notes = 'Modified note in V2';
    v2Draft.blocks[0].formats = [{ type: 'italic', from: 0, to: 4 }];

    expect(v1Draft.blocks[0].notes).toBe('Original note for actor');
    expect(v1Draft.blocks[0].formats?.[0].type).toBe('bold');
  });
});
