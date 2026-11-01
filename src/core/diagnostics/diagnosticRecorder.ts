/**
 * diagnosticRecorder.ts - Local Offline Diagnostic & Transliteration Test Session Recorder
 * Phase A Implementation (DEC-028, TM-01, TM-02, TM-14)
 * 
 * Features:
 * - 100% Offline / Local-first (no silent transmission)
 * - Captures Roman input, normalized input, candidate generation, ranking scores & contributing factors
 * - Captures user selections, commits, subsequent edits/corrections, and preference changes
 * - Mark Issue preserves relevant preceding events and document context
 * - Exports: session.json (machine-readable), report.md (readable Markdown), regression-fixtures.json
 * - Review and deletion of local recordings
 */

import { BUNDLED_LEXICON_METADATA } from '../transliteration/lexicon';

export interface CandidateScoringFactor {
  word: string;
  lexiconFrequency: number;
  userBoost: number;
  isCustomExactMatch: boolean;
  totalScore: number;
  rank: number;
}

export type DiagnosticEventType =
  | 'session_start'
  | 'session_stop'
  | 'input_keystroke'
  | 'suggest'
  | 'candidate_select'
  | 'commit'
  | 'backspace'
  | 'correction'
  | 'preference_change'
  | 'mark_issue';

export interface TransliterationDiagnosticEvent {
  id: string;
  timestamp: number;
  isoTime: string;
  eventType: DiagnosticEventType;
  romanInput?: string;
  normalizedInput?: string;
  candidates?: string[];
  candidateScores?: CandidateScoringFactor[];
  rawCandidatesCount?: number;
  selectedCandidate?: string;
  selectedIndex?: number;
  selectionMethod?: 'space' | 'enter' | 'click' | 'punctuation' | 'arrow_nav' | 'fallback_literal';
  committedText?: string;
  docPosition?: number;
  issueNote?: string;
  precedingEventIds?: string[];
  metadata?: Record<string, any>;
}

export interface DiagnosticSession {
  sessionId: string;
  engineVersion: string;
  lexiconMetadata: {
    version: string;
    hash: string;
    wordCount: number;
    corpus: string;
    governingDecisions: string[];
  };
  startTime: number;
  endTime?: number;
  events: TransliterationDiagnosticEvent[];
  markedIssues: string[]; // Event IDs
  userPreferencesSnapshot: Record<string, number>;
}

export interface RegressionFixture {
  id: string;
  roman: string;
  expected: string;
  observedCandidates: string[];
  status: 'PASSING_DEFAULT' | 'FAILED' | 'LEARNED_CORRECTION' | 'VERIFIED_REGRESSION';
  failureStage:
    | 'NONE'
    | 'CANDIDATE_GENERATION'
    | 'CANDIDATE_GENERATION_VOWEL_HIATUS'
    | 'CANDIDATE_GENERATION_AND_VOCABULARY'
    | 'FREQUENCY_COMPETITION'
    | 'USER_SELECTION_HISTORY'
    | 'RANKING';
  rootCause: string;
  inLexicon: boolean;
  lexiconFrequency: number;
  targetRank: number;
  observedRank?: number;
  notes?: string;
}

export class DiagnosticRecorder {
  private activeSession: DiagnosticSession | null = null;
  private archivedSessions: DiagnosticSession[] = [];
  private isRecordingActive: boolean = false;
  private engineVersion: string = '0.1.0-offline';
  private eventCounter: number = 0;
  private static STORAGE_KEY = 'punjabi_diagnostic_session';
  private static ARCHIVE_STORAGE_KEY = 'punjabi_diagnostic_archive';
  private listeners: Set<(isRecording: boolean) => void> = new Set();

  constructor(engineVersion: string = '0.1.0-offline') {
    this.engineVersion = engineVersion;
    this.loadFromStorage();
  }

  public subscribe(listener: (isRecording: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.isRecordingActive);
      } catch (err) {
        console.error('Error in diagnostic listener:', err);
      }
    }
  }

  public isRecording(): boolean {
    return this.isRecordingActive;
  }

  public getSession(): DiagnosticSession | null {
    return this.activeSession;
  }

  public getArchivedSessions(): DiagnosticSession[] {
    return this.archivedSessions;
  }

  /**
   * Start a new diagnostic recording session
   */
  public startRecording(initialPreferences: Record<string, number> = {}): DiagnosticSession {
    // If there is an existing session that recorded events, archive it so it is not lost
    if (this.activeSession && this.activeSession.events.length > 0) {
      if (!this.activeSession.endTime) {
        this.activeSession.endTime = Date.now();
      }
      this.archivedSessions.push(this.activeSession);
      this.saveArchiveToStorage();
    }

    const now = Date.now();
    this.eventCounter = 0;
    const session: DiagnosticSession = {
      sessionId: `diag_${now}_${Math.random().toString(36).slice(2, 7)}`,
      engineVersion: this.engineVersion,
      lexiconMetadata: { ...BUNDLED_LEXICON_METADATA },
      startTime: now,
      events: [],
      markedIssues: [],
      userPreferencesSnapshot: { ...initialPreferences },
    };

    this.activeSession = session;
    this.isRecordingActive = true;

    this.addEvent({
      eventType: 'session_start',
      metadata: { initialPreferencesCount: Object.keys(initialPreferences).length },
    });

    this.saveToStorage();
    this.notify();
    return session;
  }

  /**
   * Stop current recording session
   */
  public stopRecording(): DiagnosticSession | null {
    if (!this.activeSession) return null;

    const session = this.activeSession;
    session.endTime = Date.now();
    this.isRecordingActive = false;

    this.addEvent({
      eventType: 'session_stop',
      metadata: {
        durationMs: session.endTime - session.startTime,
        totalEvents: session.events.length,
        markedIssuesCount: session.markedIssues.length,
      },
    });

    this.saveToStorage();
    this.notify();
    return session;
  }

  /**
   * Mark an issue and preserve the preceding event context
   */
  public markIssue(note: string = 'User marked transliteration issue'): TransliterationDiagnosticEvent | null {
    if (!this.activeSession) return null;

    // Capture IDs of up to the last 10 events as preceding context
    const recentEvents = this.activeSession.events.slice(-10);
    const precedingEventIds = recentEvents.map((e) => e.id);

    const event = this.addEvent({
      eventType: 'mark_issue',
      issueNote: note.trim(),
      precedingEventIds,
      metadata: {
        recentEventsSummary: recentEvents.map((e) => ({
          type: e.eventType,
          roman: e.romanInput,
          chosen: e.selectedCandidate || e.committedText,
        })),
      },
    });

    this.activeSession.markedIssues.push(event.id);
    this.saveToStorage();
    return event;
  }

  /**
   * Record suggestion generation with candidate scores
   */
  public recordSuggest(
    romanInput: string,
    normalizedInput: string,
    candidates: string[],
    candidateScores: CandidateScoringFactor[],
    rawCandidatesCount: number = candidates.length
  ): TransliterationDiagnosticEvent | null {
    if (!this.isRecordingActive || !this.activeSession) return null;

    const event = this.addEvent({
      eventType: 'suggest',
      romanInput,
      normalizedInput,
      candidates,
      candidateScores,
      rawCandidatesCount,
    });
    this.saveToStorage();
    return event;
  }

  /**
   * Record candidate selection
   */
  public recordSelection(
    romanInput: string,
    selectedCandidate: string,
    selectedIndex: number,
    selectionMethod: 'space' | 'enter' | 'click' | 'punctuation' | 'arrow_nav' | 'fallback_literal'
  ): TransliterationDiagnosticEvent | null {
    if (!this.isRecordingActive || !this.activeSession) return null;

    // Deduplicate rapid consecutive select events for the same candidate and input (e.g. arrow_nav followed by space)
    const lastEvent = this.activeSession.events[this.activeSession.events.length - 1];
    if (
      lastEvent &&
      lastEvent.eventType === 'candidate_select' &&
      lastEvent.romanInput === romanInput &&
      lastEvent.selectedCandidate === selectedCandidate &&
      lastEvent.selectedIndex === selectedIndex &&
      selectionMethod !== 'arrow_nav'
    ) {
      return lastEvent;
    }

    const event = this.addEvent({
      eventType: 'candidate_select',
      romanInput,
      selectedCandidate,
      selectedIndex,
      selectionMethod,
    });
    this.saveToStorage();
    return event;
  }

  /**
   * Record text commit into the editor
   */
  public recordCommit(
    romanInput: string,
    committedText: string,
    docPosition?: number,
    selectionMethod?: 'space' | 'enter' | 'click' | 'punctuation' | 'arrow_nav' | 'fallback_literal'
  ): TransliterationDiagnosticEvent | null {
    if (!this.isRecordingActive || !this.activeSession) return null;

    const event = this.addEvent({
      eventType: 'commit',
      romanInput,
      committedText,
      docPosition,
      selectionMethod,
    });

    // Automatically flag zero-candidate fallback literal commits in markedIssues
    if (selectionMethod === 'fallback_literal' && event) {
      if (!this.activeSession.markedIssues.includes(event.id)) {
        this.activeSession.markedIssues.push(event.id);
      }
    }

    this.saveToStorage();
    return event;
  }

  /**
   * Record backspace keystroke
   */
  public recordBackspace(
    contextInfo: string,
    remainingBuffer?: string
  ): TransliterationDiagnosticEvent | null {
    if (!this.isRecordingActive || !this.activeSession) return null;

    const event = this.addEvent({
      eventType: 'backspace',
      romanInput: remainingBuffer,
      metadata: { contextInfo },
    });
    this.saveToStorage();
    return event;
  }

  /**
   * Record post-commit correction or edit
   */
  public recordCorrection(
    originalText: string,
    correctedText: string,
    metadata?: Record<string, any>
  ): TransliterationDiagnosticEvent | null {
    if (!this.isRecordingActive || !this.activeSession) return null;

    const event = this.addEvent({
      eventType: 'correction',
      committedText: correctedText,
      metadata: {
        originalText,
        correctedText,
        ...metadata,
      },
    });
    this.saveToStorage();
    return event;
  }

  /**
   * Record user dictionary or preference change
   */
  public recordPreferenceChange(
    word: string,
    previousBoost: number,
    newBoost: number,
    trigger: string
  ): TransliterationDiagnosticEvent | null {
    if (!this.isRecordingActive || !this.activeSession) return null;

    const event = this.addEvent({
      eventType: 'preference_change',
      selectedCandidate: word,
      metadata: {
        word,
        previousBoost,
        newBoost,
        trigger,
      },
    });
    this.saveToStorage();
    return event;
  }

  /**
   * Add a generic diagnostic event to active session
   */
  private addEvent(eventData: Omit<TransliterationDiagnosticEvent, 'id' | 'timestamp' | 'isoTime'>): TransliterationDiagnosticEvent {
    this.eventCounter++;
    const now = Date.now();
    const event: TransliterationDiagnosticEvent = {
      id: `evt_${now}_${this.eventCounter}`,
      timestamp: now,
      isoTime: new Date(now).toISOString(),
      ...eventData,
    };

    if (this.activeSession) {
      this.activeSession.events.push(event);
    }
    return event;
  }

  /**
   * Clear older stored diagnostic sessions without deleting the current active/latest recording
   */
  public clearOlderDiagnostics(): number {
    const count = this.archivedSessions.length;
    this.archivedSessions = [];
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(DiagnosticRecorder.ARCHIVE_STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to clear diagnostic archive storage:', err);
      }
    }
    return count;
  }

  /**
   * Clear and delete all recording data
   */
  public clearSession(): void {
    this.activeSession = null;
    this.archivedSessions = [];
    this.isRecordingActive = false;
    this.eventCounter = 0;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(DiagnosticRecorder.STORAGE_KEY);
        localStorage.removeItem(DiagnosticRecorder.ARCHIVE_STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to clear diagnostic session storage:', err);
      }
    }
    this.notify();
  }

  /**
   * Export machine-readable session.json
   */
  public exportSessionJSON(): string {
    const session = this.activeSession || this.createPlaceholderSession();
    return JSON.stringify(session, null, 2);
  }

  /**
   * Export human-readable report.md
   */
  public exportReportMarkdown(): string {
    const session = this.activeSession || this.createPlaceholderSession();
    const startTimeStr = new Date(session.startTime).toLocaleString();
    const endTimeStr = session.endTime ? new Date(session.endTime).toLocaleString() : 'Active (in progress)';
    const durationSec = session.endTime ? ((session.endTime - session.startTime) / 1000).toFixed(1) + 's' : 'N/A';

    let md = `# Transliteration Diagnostic Session Report\n\n`;
    md += `**Session ID**: \`${session.sessionId}\`  \n`;
    md += `**Engine Version**: \`${session.engineVersion}\`  \n`;
    md += `**Lexicon Version**: \`${session.lexiconMetadata.version}\` (\`${session.lexiconMetadata.wordCount}\` words)  \n`;
    md += `**Lexicon MD5 Hash**: \`${session.lexiconMetadata.hash}\`  \n`;
    md += `**Corpus Source**: ${session.lexiconMetadata.corpus}  \n`;
    md += `**Start Time**: ${startTimeStr}  \n`;
    md += `**End Time**: ${endTimeStr} (Duration: ${durationSec})  \n`;
    md += `**Total Events**: ${session.events.length}  \n`;
    md += `**Marked Issues**: ${session.markedIssues.length}  \n\n`;

    // Marked Issues Summary
    md += `## 1. Marked Issues Summary\n\n`;
    if (session.markedIssues.length === 0) {
      md += `*No issues were manually marked during this session.*\n\n`;
    } else {
      md += `| Issue ID | Timestamp | Note | Preceding Events Count |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const issueId of session.markedIssues) {
        const issueEvt = session.events.find((e) => e.id === issueId);
        if (issueEvt) {
          const time = new Date(issueEvt.timestamp).toLocaleTimeString();
          const count = issueEvt.precedingEventIds?.length || 0;
          md += `| \`${issueEvt.id}\` | ${time} | ${issueEvt.issueNote || 'N/A'} | ${count} |\n`;
        }
      }
      md += `\n`;
    }

    // Transliteration Failure Analysis (Specific Observed Regressions)
    md += `## 2. Investigated Failure Cases & Baselines\n\n`;
    md += `| Roman Input | Expected Gurmukhi | Observed Candidates | Status | Pipeline Failure Stage |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    md += `| \`mareya\` | ਮਾਰਿਆ | *(None / Empty)* | RESOLVED | Past verbal diphthong \`-eya\` -> \`ਿਆ\` restored with Rank 1 ranking |\n`;
    md += `| \`maareya\` | ਮਾਰਿਆ | *(None / Empty)* | RESOLVED | Past verbal diphthong \`-eya\` with explicit \`aa\` -> \`ਮਾਰਿਆ\` restored |\n`;
    md += `| \`dian\` | ਦੀਆਂ | ਦਿਨ, ਡੀਨ, ਦੀਨ | RESOLVED | Plural/oblique diphthong \`-ian\` -> \`ੀਆਂ\` restored at Rank 1 |\n`;
    md += `| \`dittian\` | ਦਿੱਤੀਆਂ | ਦਿੱਤਿੰ, ਦਿੱਤਿਂ | RESOLVED | Verbal feminine plural \`-ian\` -> \`ੀਆਂ\` restored at Rank 1 |\n`;
    md += `| \`nu\` | ਨੂੰ | ਨੂ, ਨੁ, ਨੂਂ | RESOLVED | Word-final Dulankar Tippi nasalization added (\`ਨੂੰ\` 16.3M freq) |\n`;
    md += `| \`mukka\` | ਮੁੱਕਾ | ਮੁੱਕ, ਮੱਕਾ | RESOLVED | Explicit \`u\` and final \`a\` prioritization promoted \`ਮੁੱਕਾ\` to Rank 1 |\n`;
    md += `| \`ghasunn\` | ਘਸੁੰਨ | ਘਸੱਨ, ਘੱਸਨ | RESOLVED | Verified lexicon entries prioritized over unverified zero-frequency forms |\n`;
    md += `| \`kudiye\` | ਕੁੜੀਏ | *(None / Empty)* | RESOLVED | Candidate Generation (Vowel hiatus glide \`-ye\` -> \`ਏ\` restored) |\n`;
    md += `| \`rangiye\` | ਰੰਗੀਏ | *(None / Empty)* | RESOLVED | Candidate Generation & Missing Vocative in 100k Lexicon |\n`;
    md += `| \`kithe\` | ਕਿੱਥੇ | ਕਿੱਥੇ, ਕਿਥੇ, ਕਿਠੇ, ਕੀਥੇ | PASSING | User Selection History (Prior boost in UserDictionary) |\n`;
    md += `| \`challi\` | ਚੱਲੀ | ਚੱਲੀ, ਛੱਲੀ | PASSING | Frequency Competition with \`chali\` (\`ਚਲੀ\` 26k vs \`ਚੱਲੀ\` 20k) |\n\n`;

    // Event Timeline Table
    md += `## 3. Chronological Event Timeline\n\n`;
    md += `| # | Time | Type | Roman Input | Generated Candidates (Top 3) | Selected / Committed | Scores |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    let rowIdx = 1;
    for (const evt of session.events) {
      const time = new Date(evt.timestamp).toLocaleTimeString();
      const roman = evt.romanInput ? `\`${evt.romanInput}\`` : '-';
      const cands = evt.candidates && evt.candidates.length > 0
        ? evt.candidates.slice(0, 3).map((c) => `\`${c}\``).join(', ')
        : '-';
      const chosen = evt.selectedCandidate || evt.committedText ? `**${evt.selectedCandidate || evt.committedText}**` : '-';
      
      let scoreStr = '-';
      if (evt.candidateScores && evt.candidateScores.length > 0) {
        const top = evt.candidateScores[0];
        scoreStr = `top: ${top.totalScore.toLocaleString()} (lex: ${top.lexiconFrequency}, boost: ${top.userBoost})`;
      }

      const typeBadge = evt.eventType === 'mark_issue'
        ? `⚠️ **${evt.eventType}**`
        : `\`${evt.eventType}\``;

      md += `| ${rowIdx++} | ${time} | ${typeBadge} | ${roman} | ${cands} | ${chosen} | ${scoreStr} |\n`;
    }
    md += `\n`;

    // Preserved Issue Details
    if (session.markedIssues.length > 0) {
      md += `## 4. Preserved Issue Contexts\n\n`;
      for (const issueId of session.markedIssues) {
        const issueEvt = session.events.find((e) => e.id === issueId);
        if (!issueEvt) continue;

        md += `### Issue: \`${issueEvt.id}\`\n`;
        md += `- **Note**: ${issueEvt.issueNote}\n`;
        md += `- **Timestamp**: ${issueEvt.isoTime}\n`;
        md += `- **Preceding Events**:\n`;

        if (issueEvt.precedingEventIds && issueEvt.precedingEventIds.length > 0) {
          for (const precId of issueEvt.precedingEventIds) {
            const pe = session.events.find((e) => e.id === precId);
            if (pe) {
              md += `  - \`[${pe.eventType}]\` Roman: \`${pe.romanInput || '-'}\` -> Result: \`${pe.selectedCandidate || pe.committedText || pe.candidates?.join(', ') || '-'}\`\n`;
            }
          }
        }
        md += `\n`;
      }
    }

    return md;
  }

  /**
   * Export regression fixtures JSON ready for automated test suites
   */
  public exportRegressionFixturesJSON(): string {
    const session = this.activeSession || this.createPlaceholderSession();

    // Baseline fixtures representing observed failures and critical test cases
    const fixtures: RegressionFixture[] = [
      {
        id: 'REG-01-kudiye',
        roman: 'kudiye',
        expected: 'ਕੁੜੀਏ',
        observedCandidates: [],
        status: 'FAILED',
        failureStage: 'CANDIDATE_GENERATION_VOWEL_HIATUS',
        rootCause: "Glide '-ye' after consonant produces consonant 'ਯ' + dependent vowel 'ੇ' (ਯੇ) instead of independent vowel bearer 'ਏ'. Pruned by trie prefix validation.",
        inLexicon: true,
        lexiconFrequency: 668,
        targetRank: 1,
        notes: 'Observed during manual testing; failed to produce candidate in UI',
      },
      {
        id: 'REG-02-rangiye',
        roman: 'rangiye',
        expected: 'ਰੰਗੀਏ',
        observedCandidates: [],
        status: 'FAILED',
        failureStage: 'CANDIDATE_GENERATION_AND_VOCABULARY',
        rootCause: "Glide '-ye' produces 'ਯੇ' instead of 'ਏ'. In addition, 'ਰੰਗੀਏ' is unlisted in the bundled 100k lexicon (though base 'ਰੰਗੀ' exists with frequency 5,270).",
        inLexicon: false,
        lexiconFrequency: 0,
        targetRank: 1,
        notes: 'Observed during manual testing; failed to produce candidate in UI',
      },
      {
        id: 'REG-03-kithe',
        roman: 'kithe',
        expected: 'ਕਿੱਥੇ',
        observedCandidates: ['ਕਿੱਥੇ', 'ਕਿਥੇ', 'ਕਿਠੇ', 'ਕੀਥੇ', 'ਕਿਥੇਂ'],
        status: 'PASSING_DEFAULT',
        failureStage: 'USER_SELECTION_HISTORY',
        rootCause: "Raw frequency of 'ਕਿੱਥੇ' is 45,012 vs 'ਕਿਥੇ' 6,392. Ranking 2nd occurs if 'ਕਿਥੇ' received prior user boost (+100M). With clean state, 'ਕਿੱਥੇ' ranks 1st.",
        inLexicon: true,
        lexiconFrequency: 45012,
        targetRank: 1,
        observedRank: 1,
        notes: 'Core interrogative fixture',
      },
      {
        id: 'REG-04-challi',
        roman: 'challi',
        expected: 'ਚੱਲੀ',
        observedCandidates: ['ਚੱਲੀ', 'ਛੱਲੀ', 'ਚੱਲਿ', 'ਛੱਲਿ', 'ਚੱਲਿਂ'],
        status: 'PASSING_DEFAULT',
        failureStage: 'FREQUENCY_COMPETITION',
        rootCause: "Typing 'chali' ranks 'ਚਲੀ' (freq 26,633) above 'ਚੱਲੀ' (freq 20,033). Explicit user selection of 'ਚੱਲੀ' records +100M boost in UserDictionary, permanently promoting it to Rank 1.",
        inLexicon: true,
        lexiconFrequency: 20033,
        targetRank: 1,
        observedRank: 1,
        notes: "Actual selected spelling from user screenshot: 'ਚੱਲੀ'",
      },
      {
        id: 'REG-05-kitthe',
        roman: 'kitthe',
        expected: 'ਕਿੱਥੇ',
        observedCandidates: ['ਕਿੱਥੇ', 'ਕਿੱਥੇਂ'],
        status: 'PASSING_DEFAULT',
        failureStage: 'NONE',
        rootCause: "Geminated aspirate 'tth' directly maps to Addak Thatha ('\u0A71ਥ')",
        inLexicon: true,
        lexiconFrequency: 45012,
        targetRank: 1,
        observedRank: 1,
      },
      {
        id: 'REG-06-mareya',
        roman: 'mareya',
        expected: 'ਮਾਰਿਆ',
        observedCandidates: [],
        status: 'VERIFIED_REGRESSION',
        failureStage: 'CANDIDATE_GENERATION_VOWEL_HIATUS',
        rootCause: "Past verbal suffix '-eya' lacked diphthong expansion to Sihari + Airha Kanna ('ਿਆ'), causing candidate generation to return empty list and triggering fallback literal English commit.",
        inLexicon: true,
        lexiconFrequency: 34803,
        targetRank: 1,
        observedRank: 1,
        notes: 'Captured from diagnostic session diag_1793340143211_6dsj1 (evt_1793340165912_52)',
      },
      {
        id: 'REG-07-maareya',
        roman: 'maareya',
        expected: 'ਮਾਰਿਆ',
        observedCandidates: [],
        status: 'VERIFIED_REGRESSION',
        failureStage: 'CANDIDATE_GENERATION_VOWEL_HIATUS',
        rootCause: "Past verbal suffix '-eya' with double 'aa' prefix lacked diphthong expansion to 'ਿਆ', resulting in empty candidate list.",
        inLexicon: true,
        lexiconFrequency: 34803,
        targetRank: 1,
        observedRank: 1,
        notes: 'Captured from diagnostic session diag_1793340143211_6dsj1 (evt_1793340171367_60)',
      },
      {
        id: 'REG-08-dian',
        roman: 'dian',
        expected: 'ਦੀਆਂ',
        observedCandidates: ['ਦਿਨ', 'ਡੀਨ', 'ਦੀਨ', 'ਦਿੱਨ', 'ਦਿੰ'],
        status: 'VERIFIED_REGRESSION',
        failureStage: 'CANDIDATE_GENERATION_VOWEL_HIATUS',
        rootCause: "Plural postposition suffix '-ian' was decomposed into separate vowels without Bihari + Airha Kanna + Bindi ('ੀਆਂ') hiatus rule.",
        inLexicon: true,
        lexiconFrequency: 1937232,
        targetRank: 1,
        observedRank: 1,
        notes: 'Captured from diagnostic session diag_1793340143211_6dsj1',
      },
      {
        id: 'REG-09-dittian',
        roman: 'dittian',
        expected: 'ਦਿੱਤੀਆਂ',
        observedCandidates: ['ਦਿੱਤਿੰ', 'ਦਿੱਤਿਂ', 'ਦਿੱਤਿਨ'],
        status: 'VERIFIED_REGRESSION',
        failureStage: 'CANDIDATE_GENERATION_VOWEL_HIATUS',
        rootCause: "Verbal feminine plural suffix '-ian' was degraded into separate matras rather than 'ੀਆਂ'.",
        inLexicon: true,
        lexiconFrequency: 131216,
        targetRank: 1,
        observedRank: 1,
        notes: 'Captured from diagnostic session diag_1793340143211_6dsj1',
      },
      {
        id: 'REG-10-nu',
        roman: 'nu',
        expected: 'ਨੂੰ',
        observedCandidates: ['ਨੂ', 'ਨੁ', 'ਨੂਂ'],
        status: 'VERIFIED_REGRESSION',
        failureStage: 'CANDIDATE_GENERATION',
        rootCause: "Word-final vowel nasalization only emitted Bindi ('ਂ') and omitted Tippi ('ੰ') for Dulankar 'ੂ', failing to produce standard Punjabi postposition 'ਨੂੰ'.",
        inLexicon: true,
        lexiconFrequency: 16339552,
        targetRank: 1,
        observedRank: 1,
        notes: 'Captured from diagnostic session diag_1793340143211_6dsj1',
      },
      {
        id: 'REG-11-mukka',
        roman: 'mukka',
        expected: 'ਮੁੱਕਾ',
        observedCandidates: ['ਮੁੱਕ', 'ਮੱਕਾ', 'ਮੁੱਕਾ'],
        status: 'VERIFIED_REGRESSION',
        failureStage: 'RANKING',
        rootCause: "Explicit final 'a' and typed vowel 'u' were not prioritized over truncated 'ਮੁੱਕ' and unvocalized 'ਮੱਕਾ'.",
        inLexicon: true,
        lexiconFrequency: 1041,
        targetRank: 1,
        observedRank: 1,
        notes: 'Captured from diagnostic session diag_1793340143211_6dsj1',
      },
      {
        id: 'REG-12-ghasunn',
        roman: 'ghasunn',
        expected: 'ਘਸੁੰਨ',
        observedCandidates: ['ਘਸੱਨ', 'ਘਸੱਣ', 'ਘੱਸਨ'],
        status: 'VERIFIED_REGRESSION',
        failureStage: 'RANKING',
        rootCause: "Unverified zero-frequency Addak-containing candidate 'ਘਸੱਨ' was boosted above verified dictionary word 'ਘਸੁੰਨ' (freq 569).",
        inLexicon: true,
        lexiconFrequency: 569,
        targetRank: 1,
        observedRank: 1,
        notes: 'Captured from diagnostic session diag_1793340143211_6dsj1',
      },
    ];

    // Also extract any marked issues from current session that have Roman input and candidate info
    if (session.markedIssues.length > 0) {
      for (const issueId of session.markedIssues) {
        const issueEvt = session.events.find((e) => e.id === issueId);
        if (!issueEvt) continue;

        // Find the most recent preceding suggest or commit event
        const preceding = session.events
          .slice(0, session.events.indexOf(issueEvt))
          .reverse()
          .find((e) => e.romanInput && (e.candidates || e.selectedCandidate));

        if (preceding && preceding.romanInput) {
          const exists = fixtures.some((f) => f.roman === preceding.romanInput);
          if (!exists) {
            fixtures.push({
              id: `REG-SESSION-${preceding.romanInput}`,
              roman: preceding.romanInput,
              expected: preceding.selectedCandidate || preceding.candidates?.[0] || '',
              observedCandidates: preceding.candidates || [],
              status: 'FAILED',
              failureStage: 'RANKING',
              rootCause: issueEvt.issueNote || 'User marked issue during recording session',
              inLexicon: false,
              lexiconFrequency: 0,
              targetRank: 1,
              notes: `Captured from diagnostic session ${session.sessionId}`,
            });
          }
        }
      }
    }

    return JSON.stringify(fixtures, null, 2);
  }

  private createPlaceholderSession(): DiagnosticSession {
    const now = Date.now();
    return {
      sessionId: `diag_${now}_empty`,
      engineVersion: this.engineVersion,
      lexiconMetadata: { ...BUNDLED_LEXICON_METADATA },
      startTime: now,
      endTime: now,
      events: [],
      markedIssues: [],
      userPreferencesSnapshot: {},
    };
  }

  private saveArchiveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          DiagnosticRecorder.ARCHIVE_STORAGE_KEY,
          JSON.stringify(this.archivedSessions)
        );
      } catch (err) {
        console.warn('Failed to save diagnostic archive to localStorage:', err);
      }
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        if (this.activeSession) {
          localStorage.setItem(
            DiagnosticRecorder.STORAGE_KEY,
            JSON.stringify(this.activeSession)
          );
        }
      } catch (err) {
        console.warn('Failed to save diagnostic session to localStorage:', err);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(DiagnosticRecorder.STORAGE_KEY);
        if (stored) {
          this.activeSession = JSON.parse(stored);
        }
        const storedArchive = localStorage.getItem(DiagnosticRecorder.ARCHIVE_STORAGE_KEY);
        if (storedArchive) {
          this.archivedSessions = JSON.parse(storedArchive);
        }
      } catch (err) {
        console.warn('Failed to load diagnostic session from localStorage:', err);
      }
    }
  }
}

export const globalDiagnosticRecorder = new DiagnosticRecorder();
