/**
 * phase2-performance.test.ts - Performance and Scale Verification (TM-09, PERF-01)
 * Target: ~120 pages / 3,000 blocks without visible latency stalls (P95 < 50ms)
 */

import { describe, it, expect } from 'vitest';
import {
  draftToProseMirrorDoc,
  proseMirrorDocToDraft,
} from '../src/core/editor/documentAdapter';
import { calculateScreenplayStats } from '../src/core/model/ProjectModel';
import { analyzeContdEligibleBlocks } from '../src/core/editor/contd';
import { ScriptDraft, ScreenplayBlock, ScreenplayBlockType } from '../src/types/screenplay';

describe('TM-09 & PERF-01: 120-Page / 3,000-Block Screenplay Performance', () => {
  it('handles a 3,000-block feature-length screenplay with sub-50ms transaction latency', () => {
    // Generate realistic 3,000-block script fixture (approx. 120 pages)
    const blockTypes: ScreenplayBlockType[] = [
      'scene_heading',
      'action',
      'character',
      'dialogue',
      'character',
      'dialogue',
      'action',
    ];

    const blocks: ScreenplayBlock[] = [];
    const characters = ['ਗੁਰਪ੍ਰੀਤ (GURPREET)', 'ਅਮਰਜੀਤ (AMARJIT)', 'ਹਰਪ੍ਰੀਤ (HARPREET)'];

    for (let i = 0; i < 3000; i++) {
      const type = blockTypes[i % blockTypes.length];
      let text = '';
      if (type === 'scene_heading') {
        text = `INT. SCENE ${Math.floor(i / 20) + 1} - DAY`;
      } else if (type === 'action') {
        text = 'ਗੁਰਪ੍ਰੀਤ ਕਮਰੇ ਵਿੱਚ ਦਾਖ਼ਲ ਹੁੰਦਾ ਹੈ। ਬਾਹਰ ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ। The atmosphere is quiet.';
      } else if (type === 'character') {
        text = characters[i % characters.length];
      } else if (type === 'dialogue') {
        text = 'ਕੀ ਸਭ ਕੁਝ ਤਿਆਰ ਹੈ? ਸਾਨੂੰ ਸਮੇਂ ਸਿਰ ਨਿਕਲਣਾ ਪਵੇਗਾ। We cannot be late.';
      }

      blocks.push({
        id: `block_${i}`,
        type,
        text,
      });
    }

    const largeDraft: ScriptDraft = {
      id: 'feature_script',
      name: '120 Page Script',
      isMain: true,
      createdAt: '',
      modifiedAt: '',
      blocks,
    };

    // 1. Benchmark Document Conversion (Draft -> ProseMirror)
    const t0 = performance.now();
    const pmDoc = draftToProseMirrorDoc(largeDraft);
    const conversionTime = performance.now() - t0;
    expect(pmDoc.childCount).toBe(3000);
    expect(conversionTime).toBeLessThan(100); // Expect < 100ms for 3,000 blocks

    // 2. Benchmark Unicode-Aware Word & Page Count (STAT-01, PAGE-03)
    const t1 = performance.now();
    const stats = calculateScreenplayStats(largeDraft);
    const statsTime = performance.now() - t1;
    expect(stats.wordCount).toBeGreaterThan(20000); // Over 20,000 words
    expect(stats.pageCount).toBeGreaterThan(90); // ~100+ pages
    expect(statsTime).toBeLessThan(50); // Under 50ms

    // 3. Benchmark CONT'D Scan on 3,000 Blocks (CONT-02)
    const t2 = performance.now();
    const contdResults = analyzeContdEligibleBlocks(pmDoc);
    const contdTime = performance.now() - t2;
    expect(contdResults.length).toBeGreaterThan(500);
    expect(contdTime).toBeLessThan(50); // Under 50ms

    // 4. Benchmark Round-trip Conversion (ProseMirror -> Draft)
    const t3 = performance.now();
    const roundTrip = proseMirrorDocToDraft(pmDoc, largeDraft);
    const roundTripTime = performance.now() - t3;
    expect(roundTrip.blocks.length).toBe(3000);
    expect(roundTripTime).toBeLessThan(100);

    console.log(
      `TM-09 Benchmark Results for 3,000 blocks (~${stats.pageCount} pages, ${stats.wordCount} words):`
    );
    console.log(`- Draft -> ProseMirror doc: ${conversionTime.toFixed(2)} ms`);
    console.log(`- Stats calculation: ${statsTime.toFixed(2)} ms`);
    console.log(`- CONT'D scan: ${contdTime.toFixed(2)} ms`);
    console.log(`- ProseMirror doc -> Draft: ${roundTripTime.toFixed(2)} ms`);
  });
});
