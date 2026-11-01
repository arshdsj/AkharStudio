/**
 * CustomDictionaryModal.tsx - Custom Dictionary Management Modal
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  AlertCircle,
  Check,
  Search,
} from 'lucide-react';
import { CustomDictionary, CustomDictionaryEntry, TSVImportResult } from '../../core/transliteration/customDictionary';

interface CustomDictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customDict: CustomDictionary;
  onDictionaryChange?: () => void;
}

export const CustomDictionaryModal: React.FC<CustomDictionaryModalProps> = ({
  isOpen,
  onClose,
  customDict,
  onDictionaryChange,
}) => {
  const [entries, setEntries] = useState<CustomDictionaryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formGurmukhi, setFormGurmukhi] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // TSV Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<TSVImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshEntries = () => {
    setEntries(customDict.getAllEntries());
    if (onDictionaryChange) onDictionaryChange();
  };

  useEffect(() => {
    if (isOpen) {
      refreshEntries();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          resetForm();
        } else if (isImporting) {
          setIsImporting(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditing, isImporting, onClose]);

  const resetForm = () => {
    setFormGurmukhi('');
    setFormAliases('');
    setFormNotes('');
    setFormError(null);
    setConflictWarning(null);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleStartEdit = (entry: CustomDictionaryEntry) => {
    setFormGurmukhi(entry.gurmukhi);
    setFormAliases(entry.aliases.join(', '));
    setFormNotes(entry.notes || '');
    setFormError(null);
    setConflictWarning(null);
    setEditingId(entry.id);
    setIsEditing(true);
  };

  const handleSaveEntry = (allowOverwrite: boolean = false) => {
    setFormError(null);
    const normGurmukhi = formGurmukhi.trim();
    if (!normGurmukhi) {
      setFormError('Please provide a Gurmukhi word');
      return;
    }

    const aliases = formAliases
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (aliases.length === 0) {
      setFormError('Please provide at least one Roman trigger/alias');
      return;
    }

    // Check for conflict if not already confirming overwrite
    if (!allowOverwrite) {
      for (const alias of aliases) {
        const conflict = customDict.findConflict(alias, editingId || undefined);
        if (conflict) {
          setConflictWarning(
            `Trigger "${alias}" is already mapped to "${conflict.gurmukhi}". Overwrite this mapping?`
          );
          return;
        }
      }
    }

    try {
      if (editingId) {
        customDict.updateEntry(editingId, normGurmukhi, aliases, formNotes, allowOverwrite);
      } else {
        customDict.addEntry(normGurmukhi, aliases, formNotes, allowOverwrite);
      }
      refreshEntries();
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = (id: string, gurmukhi: string) => {
    if (window.confirm(`Delete custom mapping for "${gurmukhi}"?`)) {
      customDict.deleteEntry(id);
      refreshEntries();
    }
  };

  const handleExportTSV = () => {
    const tsvContent = customDict.exportTSV();
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `punjabi_custom_dictionary_${new Date().toISOString().slice(0, 10)}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        setIsImporting(true);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleExecuteImport = () => {
    if (!importText.trim()) return;
    const res = customDict.importTSV(importText, true);
    setImportResult(res);
    refreshEntries();
  };

  const filteredEntries = entries.filter((entry) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      entry.gurmukhi.toLowerCase().includes(q) ||
      entry.aliases.some((a) => a.includes(q)) ||
      (entry.notes && entry.notes.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div
      className="ds-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ds-dialog max-h-[85vh] flex flex-col"
        style={{ width: '720px', maxWidth: 'calc(100vw - 32px)' }}
        role="dialog"
        aria-labelledby="dict-title"
      >
        {/* Header */}
        <div className="ds-dialog__header">
          <span id="dict-title">Custom Dictionary (ਕਸਟਮ ਸ਼ਬਦਕੋਸ਼)</span>
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
          className="flex items-center justify-between gap-3"
          style={{
            padding: 'var(--space-3) var(--space-6)',
            boxShadow: 'inset 0 -1px 0 var(--line-separator)',
          }}
        >
          <div className="relative flex-1 max-w-sm">
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              placeholder="Search triggers or Gurmukhi words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ds-input"
              style={{ paddingLeft: '32px' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartAdd}
              className="ds-btn ds-btn--primary flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Word</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsImporting(!isImporting);
                setImportResult(null);
              }}
              title="Import TSV file"
              className="ds-btn flex items-center gap-1.5"
            >
              <Upload size={14} />
              <span>Import TSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportTSV}
              title="Export custom dictionary as UTF-8 TSV"
              className="ds-btn flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Export TSV</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".tsv,.txt,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--space-4) var(--space-6)' }}>
          {/* Add / Edit Form */}
          {isEditing && (
            <div
              className="ds-section rounded mb-4"
              style={{
                background: 'var(--surface-control)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="ds-section__title">
                  {editingId ? 'Edit Custom Mapping' : 'New Custom Word Mapping'}
                </h3>
                <button type="button" onClick={resetForm} className="ds-icon-btn">
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="ds-field">
                  <label className="ds-label">Gurmukhi Output (ਪੰਜਾਬੀ ਸ਼ਬਦ):</label>
                  <input
                    type="text"
                    placeholder="e.g. ਜੈੱਲਾ"
                    value={formGurmukhi}
                    onChange={(e) => setFormGurmukhi(e.target.value)}
                    className="ds-input font-medium"
                  />
                </div>

                <div className="ds-field">
                  <label className="ds-label">Roman Triggers (comma-separated):</label>
                  <input
                    type="text"
                    placeholder="e.g. jailla, jaila"
                    value={formAliases}
                    onChange={(e) => setFormAliases(e.target.value)}
                    className="ds-input font-mono"
                  />
                </div>
              </div>

              <div className="ds-field mt-2">
                <label className="ds-label">Notes (Optional):</label>
                <input
                  type="text"
                  placeholder="e.g. Protagonist Character Name"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="ds-input"
                />
              </div>

              {formError && (
                <div
                  className="flex items-center gap-1.5 p-2 rounded mt-2"
                  style={{ background: 'var(--surface-sunken)', color: 'var(--text-danger)', fontSize: 'var(--text-xs)' }}
                >
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              {conflictWarning && (
                <div
                  className="p-3 rounded mt-2 space-y-2"
                  style={{ background: 'var(--surface-sunken)', fontSize: 'var(--text-xs)' }}
                >
                  <div className="flex items-center gap-1.5" style={{ color: 'var(--text-accent)' }}>
                    <AlertCircle size={14} />
                    <span>{conflictWarning}</span>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setConflictWarning(null)}
                      className="ds-btn"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEntry(true)}
                      className="ds-btn ds-btn--primary"
                    >
                      Overwrite & Save
                    </button>
                  </div>
                </div>
              )}

              {!conflictWarning && (
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={resetForm} className="ds-btn">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEntry(false)}
                    className="ds-btn ds-btn--primary flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Save Entry</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TSV Import Box */}
          {isImporting && (
            <div
              className="ds-section rounded mb-4"
              style={{
                background: 'var(--surface-control)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="ds-section__title">Bulk TSV Import</h3>
                <button type="button" onClick={() => setIsImporting(false)} className="ds-icon-btn">
                  <X size={14} />
                </button>
              </div>

              <p className="ds-help mb-2">
                Paste tab-separated rows (<code style={{ background: 'var(--surface-sunken)', padding: '2px 4px', borderRadius: '3px' }}>triggers \t gurmukhi \t notes</code>) or choose a file:
              </p>

              <textarea
                rows={5}
                placeholder={"jailla, jaila\tਜੈੱਲਾ\tProtagonist\ngurp\tਗੁਰਪ੍ਰੀਤ\tFriend"}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="ds-input font-mono w-full"
                style={{ height: 'auto', padding: 'var(--space-2)' }}
              />

              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ds-btn flex items-center gap-1.5"
                >
                  <Upload size={13} />
                  <span>Select TSV File</span>
                </button>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsImporting(false)} className="ds-btn">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={!importText.trim()}
                    className="ds-btn ds-btn--primary"
                  >
                    Run Import
                  </button>
                </div>
              </div>

              {importResult && (
                <div
                  className="p-3 rounded mt-2 space-y-1"
                  style={{ background: 'var(--surface-sunken)', fontSize: 'var(--text-xs)' }}
                >
                  <div style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>
                    Import completed: {importResult.added} added, {importResult.updated} updated.
                  </div>
                  {importResult.errors.length > 0 && (
                    <div style={{ color: 'var(--text-danger)' }}>
                      <div>Errors ({importResult.errors.length}):</div>
                      <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto font-mono text-[11px]">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Entries Table */}
          {filteredEntries.length === 0 ? (
            <div className="ds-empty py-8">
              <BookOpen size={28} style={{ opacity: 0.6 }} />
              <div className="ds-empty__title">
                {searchQuery ? 'No custom entries match your search.' : 'No custom dictionary entries yet.'}
              </div>
              <p className="ds-help max-w-md mx-auto">
                Add custom mappings (e.g. <span className="font-mono">jailla</span> → <span className="font-medium">ਜੈੱਲਾ</span>) to guarantee your desired proper names and spellings always rank #1 and commit automatically.
              </p>
            </div>
          ) : (
            <div className="rounded overflow-hidden" style={{ background: 'var(--surface-control)' }}>
              <table className="w-full text-left" style={{ fontSize: 'var(--text-sm)', borderCollapse: 'collapse' }}>
                <thead
                  style={{
                    background: 'var(--surface-sunken)',
                    boxShadow: 'inset 0 -1px 0 var(--line-separator)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}
                >
                  <tr>
                    <th className="px-4 py-2 font-semibold">Gurmukhi Word</th>
                    <th className="px-4 py-2 font-semibold">Roman Triggers</th>
                    <th className="px-4 py-2 font-semibold">Notes</th>
                    <th className="px-4 py-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      style={{
                        boxShadow: 'inset 0 -1px 0 var(--line-separator)',
                        transition: 'background var(--dur-fast) var(--ease)',
                      }}
                      className="hover:bg-white/[0.04]"
                    >
                      <td className="px-4 py-2 font-semibold text-sm gurmukhi">
                        {entry.gurmukhi}
                      </td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {entry.aliases.map((a, i) => (
                          <span
                            key={i}
                            className="inline-block px-1.5 py-0.5 rounded mr-1 mb-0.5 text-xs font-mono"
                            style={{ background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
                          >
                            {a}
                          </span>
                        ))}
                      </td>
                      <td
                        className="px-4 py-2 text-xs truncate max-w-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {entry.notes || <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(entry)}
                          title="Edit"
                          className="ds-icon-btn mr-1 inline-flex"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id, entry.gurmukhi)}
                          title="Delete"
                          className="ds-icon-btn inline-flex"
                          style={{ color: 'var(--text-danger)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ds-dialog__footer justify-between items-center">
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {entries.length} custom {entries.length === 1 ? 'word' : 'words'} saved
          </span>
          <button type="button" onClick={onClose} className="ds-btn ds-btn--lg">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
