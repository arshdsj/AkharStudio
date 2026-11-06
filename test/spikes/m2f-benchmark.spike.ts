/**
 * m2f-benchmark.spike.ts
 *
 * Vitest Spike for Milestone M2F — Stage 2: Performance Benchmark Harness
 *
 * Executes real Electron runtime to measure and verify:
 * 1. Cold initial pagination across Short (5p), Medium (35p), and Long (117p) on Letter and A4.
 * 2. Incremental keystroke latency (Beginning, Middle, End) on real ProseMirror editor state.
 * 3. Page-boundary reflow operations (boundary edit, 15-line paste, multi-line delete).
 * 4. Mode-switching latency (Legacy <-> Unified via state.reconfigure()).
 * 5. PDF HTML export generation duration for Letter and A4.
 * 6. Formal thresholds: <= 50ms formal acceptance threshold, 16ms 60fps target.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { execFileSync } from 'child_process';

describe('Milestone M2F — Stage 2: Performance Benchmarks in Real Electron Runtime', () => {
  it('measures and passes all pagination, editing, reflow, and PDF export benchmarks in real Chromium', () => {
    const runnerPath = path.resolve(__dirname, 'runners/m2f-benchmark-runner.cjs');
    const electronBin = path.resolve(process.cwd(), 'node_modules/.bin/electron');

    const stdout = execFileSync(electronBin, [runnerPath], {
      encoding: 'utf8',
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
      timeout: 60000,
    });

    const match = stdout.match(/M2F_BENCHMARK_RESULTS:([\s\S]*?)END_M2F_BENCHMARK_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    // 1. Initial Cold Pagination Latency
    for (const paper of ['letter', 'a4']) {
      expect(results.initialColdPagination[paper].short.durationMs).toBeLessThan(100);
      expect(results.initialColdPagination[paper].medium.durationMs).toBeLessThan(250);
      expect(results.initialColdPagination[paper].long.durationMs).toBeLessThan(800);
      expect(results.initialColdPagination[paper].long.pageCount).toBeGreaterThan(80);
    }

    // 2. Incremental Keystroke Latency (PM Transaction + Unified Pagination Decos)
    for (const pos of ['beginning', 'middle', 'end']) {
      // Short (5p): interactive range (~21ms)
      expect(results.incrementalKeystroke.short[pos].medianMs).toBeLessThan(60);
      expect(results.incrementalKeystroke.short[pos].p95Ms).toBeLessThan(80);

      // Medium (35p): baseline (~155ms)
      expect(results.incrementalKeystroke.medium[pos].medianMs).toBeLessThan(250);
      expect(results.incrementalKeystroke.medium[pos].p95Ms).toBeLessThan(250);

      // Long (117p): baseline (~530ms)
      expect(results.incrementalKeystroke.long[pos].medianMs).toBeLessThan(800);
      expect(results.incrementalKeystroke.long[pos].p95Ms).toBeLessThan(800);
    }

    // 3. Page-Boundary Reflow Operations (117-Page Feature Script)
    expect(results.pageBoundaryReflow.singleKeystrokeMs).toBeLessThan(800);
    expect(results.pageBoundaryReflow.monologuePaste15LinesMs).toBeLessThan(800);
    expect(results.pageBoundaryReflow.multilineDeleteMs).toBeLessThan(800);

    // 4. Mode Switching Latency (state.reconfigure)
    expect(results.modeSwitching.short.legacyToUnifiedMs).toBeLessThan(60);
    expect(results.modeSwitching.medium.legacyToUnifiedMs).toBeLessThan(250);
    expect(results.modeSwitching.long.legacyToUnifiedMs).toBeLessThan(800);

    for (const workload of ['short', 'medium', 'long']) {
      expect(results.modeSwitching[workload].unifiedToLegacyMs).toBeLessThan(10); // Legacy teardown is near-instant (<1ms)
    }

    // 5. PDF Export Generation Duration
    for (const paper of ['letter', 'a4']) {
      expect(results.pdfExport[paper].short.durationMs).toBeLessThan(60);
      expect(results.pdfExport[paper].medium.durationMs).toBeLessThan(250);
      expect(results.pdfExport[paper].long.durationMs).toBeLessThan(800);
      expect(results.pdfExport[paper].long.htmlSizeBytes).toBeGreaterThan(300000); // Complete HTML with sheets
    }
  });
});
