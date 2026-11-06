/**
 * LeftSidebar.tsx - Collapsible Left Sidebar with Scenes, Tools, and Dedicated Settings
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, themes.css, reference.html)
 */

import React, { useState } from 'react';
import {
  ScriptDraft,
  PaperSize,
  ContdSetting,
  HighlightCharactersSetting,
} from '../../types/screenplay';
import {
  Info,
  Languages,
  PanelLeftClose,
  HelpCircle,
  Activity,
  Folder,
  ChevronRight,
} from 'lucide-react';
import { ThemeMode } from '../utils/theme';
import { PaginationEngineSetting } from '../utils/paginationSetting';

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
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  paginationEngine?: PaginationEngineSetting;
  onPaginationEngineChange?: (engine: PaginationEngineSetting) => void;
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
  theme = 'dark',
  onThemeChange,
  paginationEngine = 'legacy',
  onPaginationEngineChange,
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'scenes' | 'settings'>('tools');

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

        {/* Three balanced navigation tabs: Scenes, Tools, and Dedicated Settings */}
        <div className="ds-tabs" role="tablist">
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
          <button
            type="button"
            className="ds-tab"
            role="tab"
            aria-selected={activeTab === 'tools'}
            onClick={() => setActiveTab('tools')}
          >
            <span>Tools</span>
          </button>
          <button
            type="button"
            className="ds-tab"
            role="tab"
            aria-selected={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          >
            <span>Settings</span>
          </button>
        </div>

        {/* 1. Scenes Tab Body */}
        <div
          className="ds-panel__body flex-1 overflow-y-auto"
          id="tab-scenes"
          hidden={activeTab !== 'scenes'}
        >
          {scenes.length === 0 ? (
            <div className="ds-empty">
              <svg><use href="#i-list" /></svg>
              <div className="ds-empty__title">No scenes yet</div>
              <div className="ds-help">
                Start a line with INT. or EXT. to add a scene heading to the outline.
              </div>
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
                  <span className="ds-row__label font-mono truncate">
                    {item.block.text || 'UNTITLED SCENE'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Tools Tab Body (Writing & Transliteration Tools) */}
        <div
          className="ds-panel__body flex-1 overflow-y-auto"
          id="tab-tools"
          hidden={activeTab !== 'tools'}
        >
          {/* Language Input Section */}
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

          {/* Dialogue & Formatting Controls */}
          <section className="ds-section">
            <h3 className="ds-section__title">Formatting</h3>
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

            {/* Show Word Count */}
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

            {/* Highlight Characters */}
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
          </section>

          {/* Writing Tools */}
          <section className="ds-section">
            <h3 className="ds-section__title">Writing Tools</h3>
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
            </div>
          </section>
        </div>

        {/* 3. Dedicated Settings Tab Body (Requirement 5) */}
        <div
          className="ds-panel__body flex-1 overflow-y-auto"
          id="tab-settings"
          hidden={activeTab !== 'settings'}
        >
          {/* Appearance Settings: Light, Dark, Darker (Requirement 4 & 5) */}
          <section className="ds-section">
            <h3 className="ds-section__title">Appearance</h3>
            <div className="ds-seg" role="radiogroup" aria-label="Theme" data-theme-control>
              <button
                type="button"
                className="ds-seg__item"
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => onThemeChange?.('dark')}
                data-theme-value="dark"
              >
                Dark
              </button>
              <button
                type="button"
                className="ds-seg__item"
                role="radio"
                aria-checked={theme === 'darker'}
                onClick={() => onThemeChange?.('darker')}
                data-theme-value="darker"
              >
                Darker
              </button>
              <button
                type="button"
                className="ds-seg__item"
                role="radio"
                aria-checked={theme === 'light'}
                onClick={() => onThemeChange?.('light')}
                data-theme-value="light"
              >
                Light
              </button>
            </div>
            <p className="ds-help">
              Dark Mode is the default studio appearance. Darker deepens blacks for low-light writing. Light provides a high-contrast writing desk.
            </p>
          </section>

          {/* Paper Format (Requirement 5) */}
          <section className="ds-section">
            <h3 className="ds-section__title">Paper Format</h3>
            <div className="ds-field">
              <span className="ds-label">Page dimensions</span>
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
              <p className="ds-help">
                US Letter (8.5 &times; 11 in) is standard for North American screenplays; A4 (210 &times; 297 mm) is standard internationally.
              </p>
            </div>
          </section>

          {/* Pagination Engine (Milestone M2E) */}
          <section className="ds-section">
            <h3 className="ds-section__title">Pagination Engine</h3>
            <div className="ds-field">
              <span className="ds-label">Layout &amp; page calculation</span>
              <div className="ds-seg" role="radiogroup" aria-label="Pagination engine" data-pagination-control>
                <button
                  type="button"
                  className="ds-seg__item"
                  role="radio"
                  aria-checked={paginationEngine === 'legacy'}
                  onClick={() => onPaginationEngineChange?.('legacy')}
                  data-pagination-value="legacy"
                >
                  Legacy
                </button>
                <button
                  type="button"
                  className="ds-seg__item"
                  role="radio"
                  aria-checked={paginationEngine === 'unified'}
                  onClick={() => onPaginationEngineChange?.('unified')}
                  data-pagination-value="unified"
                >
                  Unified
                </button>
              </div>
              <p className="ds-help">
                Legacy uses fast line-count estimation (recommended for compatibility during rollout). Unified uses pure typographic font metrics, accurate Punjabi line-wrapping, and shared PDF parity.
              </p>
            </div>
          </section>

          {/* Autosave (Requirement 5) */}
          <section className="ds-section">
            <h3 className="ds-section__title">Autosave</h3>
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
                  ? 'Continuously saves script changes directly to local storage while you write.'
                  : 'Autosave disabled. You must save manually (Cmd+S / Ctrl+S). Unsaved changes cannot be recovered through content autosaving.'}
              </p>
            </div>
          </section>

          {/* Project Library & Backups (Requirement 5) */}
          <section className="ds-section">
            <h3 className="ds-section__title">Project Library &amp; Backups</h3>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="ds-row ds-row--two-line w-full text-left rounded"
              style={{ background: 'var(--surface-control)' }}
            >
              <Folder className="ds-row__icon shrink-0" size={16} style={{ color: 'var(--text-accent)' }} />
              <span className="ds-row__label">
                <span className="font-medium">Project Library &amp; Backups</span>
                <span className="ds-row__sub">
                  Browse screenplays, export backups, and restore archive files
                </span>
              </span>
              <ChevronRight className="ds-row__chevron shrink-0" size={16} />
            </button>
            <p className="ds-help">
              Access database screenplays, manage external bundles, and create full backup snapshots.
            </p>
          </section>
        </div>

        {/* 4. Bottom Collapsible Navigation Section (Requirement 6) */}
        <div
          className="ds-panel__bottom shrink-0 flex items-center gap-1.5 p-2 border-t select-none"
          style={{
            borderColor: 'var(--line-separator)',
            background: 'var(--surface-panel)',
          }}
          role="navigation"
          aria-label="Help and Studio info"
        >
          {/* Keyboard Shortcuts & Help */}
          <button
            type="button"
            onClick={onOpenHelp}
            className="sidebar-bottom-item"
            aria-label="Keyboard Shortcuts & Help"
            title="Keyboard Shortcuts & Help"
          >
            <span className="sidebar-bottom-item__icon">
              <HelpCircle size={15} />
            </span>
            <span className="sidebar-bottom-item__label">
              Keyboard Shortcuts &amp; Help
            </span>
          </button>

          {/* About Akhar Studio */}
          <button
            type="button"
            onClick={onOpenAbout}
            className="sidebar-bottom-item"
            aria-label="About Akhar Studio"
            title="About Akhar Studio"
          >
            <span className="sidebar-bottom-item__icon">
              <Info size={15} />
            </span>
            <span className="sidebar-bottom-item__label">
              About Akhar Studio
            </span>
          </button>

          {/* Diagnostics Console */}
          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="sidebar-bottom-item"
            aria-label="Diagnostics Console"
            title="Diagnostics Console"
          >
            <span className="sidebar-bottom-item__icon">
              <Activity size={15} />
            </span>
            <span className="sidebar-bottom-item__label">
              Diagnostics Console
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
};
