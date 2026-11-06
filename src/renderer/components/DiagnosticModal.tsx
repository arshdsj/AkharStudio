/**
 * DiagnosticModal.tsx - Transliteration Diagnostic & Offline Test Session Modal
 * Phase A Implementation (DEC-028, TM-01, TM-02, TM-14)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Play,
  Square,
  AlertTriangle,
  Download,
  Trash2,
  FileCode,
  FileText,
  CheckCircle,
  Copy,
} from 'lucide-react';
import {
  globalDiagnosticRecorder,
  DiagnosticSession,
} from '../../core/diagnostics/diagnosticRecorder';
import { globalUserDict } from '../../core/transliteration/defaultEngine';
import { useModalTransition } from '../hooks/useModalTransition';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [session, setSession] = useState<DiagnosticSession | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [issueNote, setIssueNote] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'preview_report' | 'preview_fixtures' | 'preview_json'>('timeline');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const refreshState = () => {
    setSession(globalDiagnosticRecorder.getSession());
    setIsRecording(globalDiagnosticRecorder.isRecording());
  };

  useEffect(() => {
    if (isOpen) {
      refreshState();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { mounted, scrimClassName } = useModalTransition(isOpen);

  if (!mounted) return null;

  const handleStartRecording = () => {
    const prefs = globalUserDict.getAllPreferences();
    globalDiagnosticRecorder.startRecording(prefs);
    refreshState();
  };

  const handleStopRecording = () => {
    globalDiagnosticRecorder.stopRecording();
    refreshState();
  };

  const handleMarkIssue = () => {
    const note = issueNote.trim() || 'Unspecified transliteration failure';
    globalDiagnosticRecorder.markIssue(note);
    setIssueNote('');
    refreshState();
  };

  const handleClearSession = () => {
    if (window.confirm('Delete all recorded diagnostic session data? This cannot be undone.')) {
      globalDiagnosticRecorder.clearSession();
      refreshState();
    }
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSessionJSON = () => {
    const jsonStr = globalDiagnosticRecorder.exportSessionJSON();
    triggerDownload(jsonStr, 'session.json', 'application/json');
  };

  const handleDownloadReportMD = () => {
    const mdStr = globalDiagnosticRecorder.exportReportMarkdown();
    triggerDownload(mdStr, 'report.md', 'text/markdown');
  };

  const handleDownloadFixturesJSON = () => {
    const fixturesStr = globalDiagnosticRecorder.exportRegressionFixturesJSON();
    triggerDownload(fixturesStr, 'regression-fixtures.json', 'application/json');
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div
      className={scrimClassName}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ds-dialog max-h-[90vh] flex flex-col"
        style={{ width: '840px', maxWidth: 'calc(100vw - 32px)' }}
        role="dialog"
        aria-labelledby="diag-title"
      >
        {/* Header */}
        <div className="ds-dialog__header">
          <div className="flex items-center gap-2">
            <span id="diag-title">Diagnostics & Test Recorder</span>
            {isRecording && (
              <span
                className="flex items-center gap-1 font-medium rounded-full"
                style={{
                  fontSize: 'var(--text-xs)',
                  padding: '2px 8px',
                  background: 'var(--surface-control)',
                  color: 'var(--red-800)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: 'var(--red-600)' }} />
                Recording Live
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ds-icon-btn"
            aria-label="Close"
            title="Close dialog (Escape)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          style={{
            padding: 'var(--space-2) var(--space-6)',
            boxShadow: 'inset 0 -1px 0 var(--line-separator)',
          }}
        >
          {/* Controls: Start/Stop & Mark Issue */}
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={handleStartRecording}
                className="ds-btn ds-btn--primary flex items-center gap-1.5"
              >
                <Play size={13} fill="currentColor" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopRecording}
                className="ds-btn flex items-center gap-1.5"
                style={{ color: 'var(--text-danger)' }}
              >
                <Square size={13} fill="currentColor" />
                <span>Stop Recording</span>
              </button>
            )}

            {isRecording && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Issue note (e.g. kudiye failed)..."
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleMarkIssue()}
                  className="ds-input"
                  style={{ width: '220px' }}
                />
                <button
                  type="button"
                  onClick={handleMarkIssue}
                  className="ds-btn flex items-center gap-1.5"
                >
                  <AlertTriangle size={13} />
                  <span>Mark Issue</span>
                </button>
              </div>
            )}
          </div>

          {/* Export & Clear buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadSessionJSON}
              title="Download session.json (machine readable)"
              className="ds-btn flex items-center gap-1"
            >
              <FileCode size={13} />
              <span>session.json</span>
              <Download size={11} className="opacity-60" />
            </button>

            <button
              type="button"
              onClick={handleDownloadReportMD}
              title="Download report.md (human readable summary)"
              className="ds-btn flex items-center gap-1"
            >
              <FileText size={13} />
              <span>report.md</span>
              <Download size={11} className="opacity-60" />
            </button>

            <button
              type="button"
              onClick={handleDownloadFixturesJSON}
              title="Download regression-fixtures.json (automated test suite fixtures)"
              className="ds-btn flex items-center gap-1"
            >
              <CheckCircle size={13} />
              <span>regression-fixtures.json</span>
              <Download size={11} className="opacity-60" />
            </button>

            {session && session.events.length > 0 && (
              <button
                type="button"
                onClick={handleClearSession}
                title="Clear and delete recorded session"
                className="ds-icon-btn ml-1"
                style={{ color: 'var(--text-danger)' }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="ds-tabs" role="tablist">
          <button
            type="button"
            className="ds-tab"
            role="tab"
            aria-selected={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
          >
            Events Timeline ({session?.events.length || 0})
          </button>
          <button
            type="button"
            className="ds-tab"
            role="tab"
            aria-selected={activeTab === 'preview_report'}
            onClick={() => setActiveTab('preview_report')}
          >
            Report Preview
          </button>
          <button
            type="button"
            className="ds-tab"
            role="tab"
            aria-selected={activeTab === 'preview_fixtures'}
            onClick={() => setActiveTab('preview_fixtures')}
          >
            Regression Fixtures
          </button>
          <button
            type="button"
            className="ds-tab"
            role="tab"
            aria-selected={activeTab === 'preview_json'}
            onClick={() => setActiveTab('preview_json')}
          >
            Raw session.json
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--space-4) var(--space-6)' }}>
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {/* Metadata Banner */}
              <div
                className="rounded p-3 flex flex-wrap items-center justify-between gap-2"
                style={{ background: 'var(--surface-control)', fontSize: 'var(--text-xs)' }}
              >
                <div className="flex items-center gap-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
                  <span>Engine: <b style={{ color: 'var(--text-primary)' }}>{session?.engineVersion || '0.1.0'}</b></span>
                  <span>Lexicon: <b style={{ color: 'var(--text-primary)' }}>{session?.lexiconMetadata.version || 'v9.1-100k'}</b></span>
                  <span>Events: <b style={{ color: 'var(--text-primary)' }}>{session?.events.length || 0}</b></span>
                  <span>Issues: <b style={{ color: 'var(--text-primary)' }}>{session?.markedIssues.length || 0}</b></span>
                </div>
                {session?.events.length ? (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Recorded: {new Date(session.startTime).toLocaleTimeString()} – {session.endTime ? new Date(session.endTime).toLocaleTimeString() : 'now'}
                  </span>
                ) : null}
              </div>

              {/* Events List */}
              {!session || session.events.length === 0 ? (
                <div className="ds-empty py-12">
                  <Activity size={32} style={{ opacity: 0.5 }} />
                  <div className="ds-empty__title">No events recorded yet</div>
                  <p className="ds-help max-w-sm">
                    Click <strong>Start Recording</strong>, then type in the screenplay editor. All transliteration inputs, candidates, scores, and commitments will be captured here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {session.events.map((evt, idx) => {
                    const isIssue = evt.eventType === 'mark_issue' || session.markedIssues.includes(evt.id);

                    return (
                      <div
                        key={evt.id || idx}
                        className="rounded p-3 transition-colors"
                        style={{
                          background: isIssue ? 'var(--surface-sunken)' : 'var(--surface-control)',
                          boxShadow: isIssue ? 'inset 0 0 0 1px var(--text-accent)' : undefined,
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        {isIssue && evt.issueNote && (
                          <div className="flex items-center gap-1.5 mb-2 font-medium" style={{ color: 'var(--text-accent)' }}>
                            <AlertTriangle size={14} />
                            <span>Marked Issue: &quot;{evt.issueNote}&quot;</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>#{idx + 1}</span>
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px]"
                              style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
                            >
                              {evt.eventType}
                            </span>
                            {evt.romanInput && (
                              <>
                                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                  &quot;{evt.romanInput}&quot;
                                </span>
                                <span>→</span>
                              </>
                            )}
                            {evt.committedText && (
                              <span className="font-bold text-sm gurmukhi" style={{ color: 'var(--text-primary)' }}>
                                &quot;{evt.committedText}&quot;
                              </span>
                            )}
                            {evt.selectedIndex !== undefined && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
                              >
                                Rank #{evt.selectedIndex + 1}
                              </span>
                            )}
                            {evt.selectionMethod && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
                              >
                                {evt.selectionMethod}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {/* Top candidate scores */}
                        {evt.candidateScores && evt.candidateScores.length > 0 && (
                          <div className="mt-2.5 pt-2 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--line-separator)' }}>
                            {evt.candidateScores.slice(0, 5).map((cand, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[11px]"
                                style={{
                                  background: cand.word === evt.committedText ? 'var(--surface-sunken)' : 'var(--surface-hover)',
                                  color: cand.word === evt.committedText ? 'var(--text-primary)' : 'var(--text-secondary)',
                                }}
                              >
                                <span className="gurmukhi font-semibold">{cand.word}</span>
                                <span style={{ opacity: 0.6 }}>score: {cand.totalScore.toFixed(3)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preview_report' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => handleCopyToClipboard(globalDiagnosticRecorder.exportReportMarkdown(), 'Report')}
                className="ds-btn absolute right-3 top-3 flex items-center gap-1 z-10"
              >
                <Copy size={12} />
                <span>{copyFeedback === 'Report' ? 'Copied!' : 'Copy report.md'}</span>
              </button>
              <pre
                className="p-4 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap select-text"
                style={{ background: 'var(--surface-control)', color: 'var(--text-secondary)' }}
              >
                {globalDiagnosticRecorder.exportReportMarkdown()}
              </pre>
            </div>
          )}

          {activeTab === 'preview_fixtures' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => handleCopyToClipboard(globalDiagnosticRecorder.exportRegressionFixturesJSON(), 'Fixtures')}
                className="ds-btn absolute right-3 top-3 flex items-center gap-1 z-10"
              >
                <Copy size={12} />
                <span>{copyFeedback === 'Fixtures' ? 'Copied!' : 'Copy regression-fixtures.json'}</span>
              </button>
              <pre
                className="p-4 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap select-text"
                style={{ background: 'var(--surface-control)', color: 'var(--text-secondary)' }}
              >
                {globalDiagnosticRecorder.exportRegressionFixturesJSON()}
              </pre>
            </div>
          )}

          {activeTab === 'preview_json' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => handleCopyToClipboard(globalDiagnosticRecorder.exportSessionJSON(), 'JSON')}
                className="ds-btn absolute right-3 top-3 flex items-center gap-1 z-10"
              >
                <Copy size={12} />
                <span>{copyFeedback === 'JSON' ? 'Copied!' : 'Copy session.json'}</span>
              </button>
              <pre
                className="p-4 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap select-text"
                style={{ background: 'var(--surface-control)', color: 'var(--text-secondary)' }}
              >
                {globalDiagnosticRecorder.exportSessionJSON()}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ds-dialog__footer">
          <button type="button" onClick={onClose} className="ds-btn ds-btn--lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
