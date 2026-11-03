/**
 * LeftSidebar.tsx - Collapsible Left Sidebar with Scene Navigator, Language Switch, and App Settings
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState } from 'react';
import { ScriptDraft, PaperSize, ContdSetting, HighlightCharactersSetting } from '../../types/screenplay';
import { APP_VERSION } from '../../core/version';
import { Info, Languages, PanelLeftClose } from 'lucide-react';

interface LeftSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  inputMode: 'pa' | 'en';
  onToggleInputMode: () => void;
  paperSize: PaperSize;
  onPaperSizeChange: (size: PaperSize) => void;
  contdSetting: ContdSetting;
  onContdSettingChange: (setting: ContdSetting) => void;
  showWordCount?: boolean;
  onToggleWordCount?: (show: boolean) => void;
  autosaveEnabled?: boolean;
  onToggleAutosave?: (enabled: boolean) => void;
  highlightCharactersSetting?: HighlightCharactersSetting;
  onHighlightCharactersSettingChange?: (settings: HighlightCharactersSetting) => void;
  onOpenHighlightCharacters?: () => void;
  onOpenCustomDictionary: () => void;
  onOpenRomanConverter?: () => void;
  onOpenHelp: () => void;
  onOpenAbout?: () => void;
  onOpenDiagnostics: () => void;
  onOpenLibrary: () => void;
  draft: ScriptDraft;
  onToggleKeyboard?: () => void;
  onSceneSwitch?: (sceneBlockId: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  isOpen,
  onClose,
  inputMode,
  onToggleInputMode,
  paperSize,
  onPaperSizeChange,
  contdSetting,
  onContdSettingChange,
  showWordCount = true,
  onToggleWordCount = () => {},
  autosaveEnabled = true,
  onToggleAutosave = () => {},
  highlightCharactersSetting = { enabled: false, color: 'rgba(167, 139, 250, 0.35)', selectedCharacters: [] },
  onHighlightCharactersSettingChange = () => {},
  onOpenHighlightCharacters = () => {},
  onOpenCustomDictionary,
  onOpenRomanConverter,
  onOpenHelp,
  onOpenAbout = () => {},
  onOpenDiagnostics,
  onOpenLibrary,
  draft,
  onToggleKeyboard,
  onSceneSwitch,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'scenes'>('settings');

  const scenes = draft.blocks
    .map((block, index) => ({ block, originalIndex: index }))
    .filter((item) => item.block.type === 'scene_heading');

  const handleJumpToScene = (blockId: string) => {
    onSceneSwitch?.(blockId);
    const el = document.querySelector(`[data-block-id="${blockId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-zinc-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-zinc-400');
      }, 1200);
    }
  };

  return (
    <div
      className={`ds-panel-container ${isOpen ? 'is-open' : 'is-closed'}`}
      aria-hidden={!isOpen}
    >
      <aside className="ds-panel" id="panel" aria-label="Sidebar Navigation and Settings">
      {/* Panel Header */}
      <header className="ds-panel__header">
        <span>Panel</span>
        <button
          type="button"
          onClick={onClose}
          className="ds-icon-btn"
          aria-label="Collapse panel"
          title="Collapse Panel (Cmd/Ctrl+\ or click icon)"
        >
          <PanelLeftClose size={16} />
        </button>
      </header>

      {/* Tabs */}
      <div className="ds-tabs" role="tablist">
        <button
          type="button"
          className="ds-tab"
          role="tab"
          aria-selected={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
        >
          <span>Settings</span>
        </button>
        <button
          type="button"
          className="ds-tab"
          role="tab"
          aria-selected={activeTab === 'scenes'}
          onClick={() => setActiveTab('scenes')}
        >
          <span>Scenes</span>
          <span className="ds-tab__count">{scenes.length}</span>
        </button>
      </div>

      {/* Settings Tab Body */}
      <div className="ds-panel__body" id="tab-settings" hidden={activeTab !== 'settings'}>
        {/* Language Section */}
        <section className="ds-section">
          <h3 className="ds-section__title">Language</h3>
          <div className="ds-seg" role="radiogroup" aria-label="Language">
            <button
              type="button"
              className="ds-seg__item gurmukhi"
              role="radio"
              aria-checked={inputMode === 'pa'}
              onClick={() => {
                if (inputMode !== 'pa') onToggleInputMode();
              }}
            >
              ਪੰਜਾਬੀ
            </button>
            <button
              type="button"
              className="ds-seg__item"
              role="radio"
              aria-checked={inputMode === 'en'}
              onClick={() => {
                if (inputMode !== 'en') onToggleInputMode();
              }}
            >
              English
            </button>
          </div>
          <p className="ds-help">Phonetic transliteration: type in Roman letters, get Gurmukhi.</p>
        </section>

        {/* Document Section */}
        <section className="ds-section">
          <h3 className="ds-section__title">Document</h3>
          <div className="ds-field">
            <span className="ds-label">Paper format</span>
            <div className="ds-seg" role="radiogroup" aria-label="Paper format">
              <button
                type="button"
                className="ds-seg__item"
                role="radio"
                aria-checked={paperSize === 'letter'}
                onClick={() => onPaperSizeChange('letter')}
              >
                US Letter
              </button>
              <button
                type="button"
                className="ds-seg__item"
                role="radio"
                aria-checked={paperSize === 'a4'}
                onClick={() => onPaperSizeChange('a4')}
              >
                A4
              </button>
            </div>
          </div>
          <div className="ds-field">
            <span className="ds-label">Dialogue continuation (CONT&apos;D)</span>
            <select
              value={contdSetting}
              onChange={(e) => onContdSettingChange(e.target.value as ContdSetting)}
              className="ds-select"
            >
              <option value="unasked">Prompt when needed</option>
              <option value="on">Always</option>
              <option value="off">Never</option>
            </select>
          </div>

          {/* Show Word Count Setting (Requirement 4) */}
          <div className="ds-field">
            <label className="ds-switch-row">
              <span className="ds-label">Show word count</span>
              <input
                className="ds-switch"
                type="checkbox"
                role="switch"
                checked={showWordCount}
                onChange={(e) => onToggleWordCount(e.target.checked)}
              />
            </label>
            <p className="ds-help">Display screenplay word count in the bottom-right status bar.</p>
          </div>

          {/* Highlight Characters Setting (Requirement 5) */}
          <div className="ds-field">
            <label className="ds-switch-row">
              <span className="ds-label">Highlight characters</span>
              <input
                className="ds-switch"
                type="checkbox"
                role="switch"
                checked={highlightCharactersSetting.enabled}
                onChange={(e) =>
                  onHighlightCharactersSettingChange({
                    ...highlightCharactersSetting,
                    enabled: e.target.checked,
                  })
                }
              />
            </label>

            <button
              type="button"
              onClick={onOpenHighlightCharacters}
              className="ds-row ds-row--two-line w-full rounded text-left mt-1"
              style={{ background: 'var(--surface-control)' }}
            >
              <span className="ds-row__label">
                <span className="flex items-center gap-2">
                  <span>Character Selection</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: highlightCharactersSetting.color || '#a78bfa' }}
                  />
                </span>
                <span className="ds-row__sub">
                  {highlightCharactersSetting.selectedCharacters &&
                  highlightCharactersSetting.selectedCharacters.length > 0
                    ? `${highlightCharactersSetting.selectedCharacters.length} character(s) selected`
                    : 'Click to select characters...'}
                </span>
              </span>
              <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
            </button>
            <p className="ds-help">Highlight dialogue cues, dialogue, and parentheticals.</p>
          </div>

          {/* Autosave Setting (Stage 1.B) */}
          <div className="ds-field">
            <label className="ds-switch-row">
              <span className="ds-label">Autosave</span>
              <input
                className="ds-switch"
                type="checkbox"
                role="switch"
                checked={autosaveEnabled}
                onChange={(e) => onToggleAutosave(e.target.checked)}
              />
            </label>
            <p className="ds-help">
              {autosaveEnabled
                ? 'Continuously save script changes while you write.'
                : 'Autosave disabled. You must save manually (Cmd+S / Ctrl+S). Unsaved changes cannot be recovered through content autosaving.'}
            </p>
          </div>
        </section>

        {/* Tools Section */}
        <section className="ds-section">
          <h3 className="ds-section__title">Tools</h3>
          <div className="ds-list">
            {onOpenRomanConverter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRomanConverter();
                }}
                className="ds-row"
              >
                <Languages size={15} className="mr-2" style={{ color: 'var(--text-accent)' }} />
                <span className="ds-row__label">Roman Punjabi to Gurmukhi</span>
                <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
              </button>
            )}
            <button type="button" onClick={onOpenCustomDictionary} className="ds-row">
              <svg className="ds-row__icon"><use href="#i-book" /></svg>
              <span className="ds-row__label">Custom dictionary</span>
              <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
            </button>
            {onToggleKeyboard && (
              <button type="button" onClick={onToggleKeyboard} className="ds-row">
                <svg className="ds-row__icon"><use href="#i-keyboard" /></svg>
                <span className="ds-row__label">On-screen Gurmukhi keyboard</span>
                <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
              </button>
            )}
            <button type="button" onClick={onOpenLibrary} className="ds-row">
              <svg className="ds-row__icon"><use href="#i-folder" /></svg>
              <span className="ds-row__label">Project library &amp; backups</span>
              <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
            </button>
            <button type="button" onClick={onOpenHelp} className="ds-row">
              <svg className="ds-row__icon"><use href="#i-help" /></svg>
              <span className="ds-row__label">Keyboard shortcuts &amp; help</span>
              <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
            </button>
            <button type="button" onClick={onOpenAbout} className="ds-row">
              <Info className="ds-row__icon" size={16} />
              <span className="ds-row__label flex items-center justify-between">
                <span>About AkharStudio</span>
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{ background: 'var(--surface-sunken)', color: 'var(--text-accent)' }}
                >
                  v{APP_VERSION}
                </span>
              </span>
              <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
            </button>
            <button type="button" onClick={onOpenDiagnostics} className="ds-row">
              <svg className="ds-row__icon"><use href="#i-activity" /></svg>
              <span className="ds-row__label">Diagnostics console</span>
              <svg className="ds-row__chevron"><use href="#i-chevron" /></svg>
            </button>
          </div>
        </section>
      </div>

      {/* Scenes Tab Body */}
      <div className="ds-panel__body" id="tab-scenes" hidden={activeTab !== 'scenes'}>
        {scenes.length === 0 ? (
          <div className="ds-empty">
            <svg><use href="#i-list" /></svg>
            <div className="ds-empty__title">No scenes yet</div>
            <div className="ds-help">Start a line with INT. or EXT. to add a scene heading to the outline.</div>
          </div>
        ) : (
          <div className="ds-list">
            {scenes.map((item, idx) => (
              <button
                key={item.block.id}
                type="button"
                onClick={() => handleJumpToScene(item.block.id)}
                className="ds-row ds-row--two-line"
                title={`Jump to Scene ${idx + 1}`}
              >
                <span className="ds-row__meta font-mono" style={{ width: '24px', flexShrink: 0 }}>
                  {idx + 1}.
                </span>
                <span className="ds-row__label font-mono">
                  {item.block.text || 'UNTITLED SCENE'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
    </div>
  );
};
