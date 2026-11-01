/**
 * phaseA-diagnostics.test.ts - Automated Tests for Phase A Diagnostic Recording System
 * Governing IDs: DEC-028, TM-01, TM-02, TM-14
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticRecorder, RegressionFixture } from '../src/core/diagnostics/diagnosticRecorder';
import { GurmukhiLexicon, UserDictionary, BUNDLED_LEXICON_METADATA } from '../src/core/transliteration/lexicon';
import { GurmukhiTransliterator } from '../src/core/transliteration/engine';

describe('Phase A: Offline Diagnostic Recording System', () => {
  let recorder: DiagnosticRecorder;
  let lexicon: GurmukhiLexicon;
  let userDict: UserDictionary;
  let engine: GurmukhiTransliterator;

  // Mock localStorage for test environment
  const mockStorage: Record<string, string> = {};
  beforeEach(() => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
    (globalThis as any).localStorage = {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
      clear: () => {
        for (const k in mockStorage) delete mockStorage[k];
      },
    };

    recorder = new DiagnosticRecorder('0.1.0-test');
    lexicon = new GurmukhiLexicon();
    lexicon.insert('ਕਿੱਥੇ', 45012);
    lexicon.insert('ਕਿਥੇ', 6392);
    lexicon.insert('ਚੱਲੀ', 20033);
    lexicon.insert('ਚਲੀ', 26633);
    lexicon.insert('ਕੁੜੀਏ', 668);

    userDict = new UserDictionary();
    engine = new GurmukhiTransliterator(lexicon, userDict);
  });

  describe('Session Lifecycle: Start, Mark Issue, Stop & Reset', () => {
    it('initializes in dormant / stopped state by default', () => {
      expect(recorder.isRecording()).toBe(false);
      expect(recorder.getSession()).toBeNull();
    });

    it('starts recording and captures session metadata including bundled lexicon version and hash', () => {
      const session = recorder.startRecording({ 'ਕੁੜੀ': 1 });
      expect(recorder.isRecording()).toBe(true);
      expect(session.sessionId).toMatch(/^diag_\d+_/);
      expect(session.engineVersion).toBe('0.1.0-test');
      expect(session.lexiconMetadata.hash).toBe(BUNDLED_LEXICON_METADATA.hash);
      expect(session.lexiconMetadata.version).toBe(BUNDLED_LEXICON_METADATA.version);
      expect(session.events.length).toBe(1);
      expect(session.events[0].eventType).toBe('session_start');
    });

    it('stops recording and marks duration and end event', () => {
      recorder.startRecording();
      const stopped = recorder.stopRecording();
      expect(recorder.isRecording()).toBe(false);
      expect(stopped?.endTime).toBeDefined();
      const lastEvent = stopped?.events[stopped.events.length - 1];
      expect(lastEvent?.eventType).toBe('session_stop');
    });

    it('allows clearing / deleting recordings cleanly', () => {
      recorder.startRecording();
      recorder.markIssue('Testing clear');
      expect(recorder.getSession()?.events.length).toBeGreaterThan(0);

      recorder.clearSession();
      expect(recorder.getSession()).toBeNull();
      expect(recorder.isRecording()).toBe(false);
      expect(mockStorage['punjabi_diagnostic_session']).toBeUndefined();
    });

    it('safely clears older diagnostic sessions without deleting the active recording', () => {
      // 1. Session 1
      recorder.startRecording();
      recorder.markIssue('Issue in session 1');
      recorder.stopRecording();

      // 2. Session 2 (active)
      const session2 = recorder.startRecording();
      recorder.markIssue('Issue in session 2');
      expect(recorder.getArchivedSessions().length).toBe(1);

      // 3. Clear older diagnostics
      const clearedCount = recorder.clearOlderDiagnostics();
      expect(clearedCount).toBe(1);
      expect(recorder.getArchivedSessions().length).toBe(0);

      // Active session 2 is completely preserved!
      expect(recorder.getSession()?.sessionId).toBe(session2.sessionId);
      expect(recorder.isRecording()).toBe(true);
      expect(recorder.getSession()?.events.length).toBeGreaterThan(0);
    });
  });

  describe('Transliteration Event Capture & Scoring Details', () => {
    it('captures suggest events with detailed contributing scoring factors', () => {
      recorder.startRecording();

      const roman = 'kithe';
      const result = engine.suggestWithDetails(roman, 5);

      recorder.recordSuggest(
        roman,
        roman.toLowerCase(),
        result.candidates,
        result.details,
        result.rawCandidatesCount
      );

      const session = recorder.getSession()!;
      const suggestEvt = session.events.find((e) => e.eventType === 'suggest');
      expect(suggestEvt).toBeDefined();
      expect(suggestEvt?.romanInput).toBe('kithe');
      expect(suggestEvt?.normalizedInput).toBe('kithe');
      expect(suggestEvt?.candidates).toContain('ਕਿੱਥੇ');
      expect(suggestEvt?.candidateScores).toBeDefined();
      expect(suggestEvt?.candidateScores?.length).toBeGreaterThan(0);

      // Verify scoring breakdown includes lexiconFrequency and userBoost
      const kitheScore = suggestEvt?.candidateScores?.find((s) => s.word === 'ਕਿੱਥੇ');
      expect(kitheScore?.lexiconFrequency).toBe(45012);
      expect(kitheScore?.userBoost).toBe(0);
      expect(kitheScore?.totalScore).toBe(45012);
    });

    it('captures candidate selections and commit events with methods', () => {
      recorder.startRecording();

      recorder.recordSelection('kithe', 'ਕਿੱਥੇ', 0, 'space');
      recorder.recordCommit('kithe', 'ਕਿੱਥੇ', 10, 'space');

      const session = recorder.getSession()!;
      const selectEvt = session.events.find((e) => e.eventType === 'candidate_select');
      const commitEvt = session.events.find((e) => e.eventType === 'commit');

      expect(selectEvt?.selectedCandidate).toBe('ਕਿੱਥੇ');
      expect(selectEvt?.selectionMethod).toBe('space');
      expect(commitEvt?.committedText).toBe('ਕਿੱਥੇ');
      expect(commitEvt?.docPosition).toBe(10);
    });

    it('captures backspace and correction events', () => {
      recorder.startRecording();

      recorder.recordBackspace('buffer_backspace', 'kudh');
      recorder.recordCorrection('ਕੁੜੀ', 'ਕੁੜੀਏ', { reason: 'manual_vowel_add' });

      const session = recorder.getSession()!;
      expect(session.events.some((e) => e.eventType === 'backspace')).toBe(true);
      expect(session.events.some((e) => e.eventType === 'correction')).toBe(true);
    });
  });

  describe('Mark Issue & Context Preservation', () => {
    it('preserves relevant preceding events when Mark Issue is clicked', () => {
      recorder.startRecording();

      // Simulate a sequence of events leading to an issue
      recorder.recordSuggest('kudiye', 'kudiye', [], []);
      recorder.recordCommit('kudiye', 'kudiye', 5, 'fallback_literal');

      // User marks issue
      const issueEvt = recorder.markIssue('kudiye failed to convert into Gurmukhi');
      expect(issueEvt).not.toBeNull();
      expect(issueEvt?.eventType).toBe('mark_issue');
      expect(issueEvt?.issueNote).toBe('kudiye failed to convert into Gurmukhi');

      // Verify preceding event IDs were recorded
      expect(issueEvt?.precedingEventIds).toBeDefined();
      expect(issueEvt?.precedingEventIds?.length).toBe(3); // session_start, suggest, commit
      expect(recorder.getSession()?.markedIssues).toContain(issueEvt?.id);
    });
  });

  describe('Export Formats: session.json, report.md, regression-fixtures.json', () => {
    beforeEach(() => {
      recorder.startRecording();
      const res = engine.suggestWithDetails('kithe', 5);
      recorder.recordSuggest('kithe', 'kithe', res.candidates, res.details, res.rawCandidatesCount);
      recorder.recordSelection('kithe', 'ਕਿੱਥੇ', 0, 'space');
      recorder.recordCommit('kithe', 'ਕਿੱਥੇ', 1, 'space');
      recorder.markIssue('Verified kithe Rank 1 test');
      recorder.stopRecording();
    });

    it('exports machine-readable session.json with valid schema and metadata', () => {
      const jsonStr = recorder.exportSessionJSON();
      const parsed = JSON.parse(jsonStr);

      expect(parsed.sessionId).toBeDefined();
      expect(parsed.engineVersion).toBe('0.1.0-test');
      expect(parsed.lexiconMetadata.hash).toBe(BUNDLED_LEXICON_METADATA.hash);
      expect(parsed.events.length).toBeGreaterThan(0);
      expect(parsed.markedIssues.length).toBe(1);
    });

    it('exports readable report.md with summary tables and marked issues', () => {
      const md = recorder.exportReportMarkdown();

      expect(md).toContain('# Transliteration Diagnostic Session Report');
      expect(md).toContain('**Engine Version**: `0.1.0-test`');
      expect(md).toContain(BUNDLED_LEXICON_METADATA.hash);
      expect(md).toContain('## 1. Marked Issues Summary');
      expect(md).toContain('## 2. Investigated Failure Cases & Baselines');
      expect(md).toContain('`kudiye`');
      expect(md).toContain('ਕੁੜੀਏ');
      expect(md).toContain('`rangiye`');
      expect(md).toContain('ਰੰਗੀਏ');
      expect(md).toContain('`kithe`');
      expect(md).toContain('`challi`');
      expect(md).toContain('## 3. Chronological Event Timeline');
    });

    it('exports regression-fixtures.json containing verified test cases and failure stages', () => {
      const fixturesJson = recorder.exportRegressionFixturesJSON();
      const fixtures: RegressionFixture[] = JSON.parse(fixturesJson);

      expect(fixtures.length).toBeGreaterThanOrEqual(4);

      // 1. kudiye -> ਕੁੜੀਏ
      const kudiyeFixture = fixtures.find((f) => f.roman === 'kudiye');
      expect(kudiyeFixture).toBeDefined();
      expect(kudiyeFixture?.expected).toBe('ਕੁੜੀਏ');
      expect(kudiyeFixture?.status).toBe('FAILED');
      expect(kudiyeFixture?.failureStage).toBe('CANDIDATE_GENERATION_VOWEL_HIATUS');
      expect(kudiyeFixture?.inLexicon).toBe(true);

      // 2. rangiye -> ਰੰਗੀਏ
      const rangiyeFixture = fixtures.find((f) => f.roman === 'rangiye');
      expect(rangiyeFixture).toBeDefined();
      expect(rangiyeFixture?.expected).toBe('ਰੰਗੀਏ');
      expect(rangiyeFixture?.status).toBe('FAILED');
      expect(kudiyeFixture?.failureStage).toBeDefined();

      // 3. kithe -> ਕਿੱਥੇ
      const kitheFixture = fixtures.find((f) => f.roman === 'kithe');
      expect(kitheFixture).toBeDefined();
      expect(kitheFixture?.expected).toBe('ਕਿੱਥੇ');
      expect(kitheFixture?.lexiconFrequency).toBe(45012);

      // 4. challi -> ਚੱਲੀ
      const challiFixture = fixtures.find((f) => f.roman === 'challi');
      expect(challiFixture).toBeDefined();
      expect(challiFixture?.expected).toBe('ਚੱਲੀ');
      expect(challiFixture?.lexiconFrequency).toBe(20033);
    });
  });

  describe('Zero Overhead When Recording Is Disabled', () => {
    it('does not record any events when recording is inactive', () => {
      // Recording NOT started
      expect(recorder.isRecording()).toBe(false);

      const res = recorder.recordSuggest('test', 'test', ['ਤੈਸਟ'], []);
      expect(res).toBeNull();

      const sel = recorder.recordSelection('test', 'ਤੈਸਟ', 0, 'space');
      expect(sel).toBeNull();

      const com = recorder.recordCommit('test', 'ਤੈਸਟ', 0, 'space');
      expect(com).toBeNull();

      expect(recorder.getSession()).toBeNull();
    });
  });
});
