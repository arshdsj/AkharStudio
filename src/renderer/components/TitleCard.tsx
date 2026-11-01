/**
 * TitleCard.tsx - Screenplay Title Card & Expandable Full-Page Layout View (TITLE-01, TITLE-02)
 * Supports:
 * - Custom movie title graphic / official artwork upload (above title)
 * - Expandable full-page editing view matching physical first page of screenplay
 * - Compact bar mode with quick expansion
 * - Industry standard metadata placement (Author, Based On, Rights, Contact)
 * Adheres strictly to the Script Editor Design System (tokens.css, components.css, reference.html)
 */

import React, { useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { TitleMetadata, PaperSize } from '../../types/screenplay';

interface TitleCardProps {
  metadata: TitleMetadata;
  onMetadataChange: (newMetadata: TitleMetadata) => void;
  onFocusTitle: (isFocused: boolean) => void;
  paperSize?: PaperSize;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  metadata,
  onMetadataChange,
  onFocusTitle,
  paperSize = 'letter',
  isExpanded: controlledIsExpanded,
  onToggleExpand,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalExpanded;

  const toggleExpanded = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onMetadataChange({
      ...metadata,
      title: e.target.value,
    });
  };

  const handleFieldChange = (field: keyof TitleMetadata, value: string) => {
    onMetadataChange({
      ...metadata,
      [field]: value,
    });
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onMetadataChange({
        ...metadata,
        titleImageUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onMetadataChange({
      ...metadata,
      titleImageUrl: undefined,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Hidden File Input for image uploads
  const hiddenFileInput = (
    <input
      type="file"
      ref={fileInputRef}
      accept="image/png,image/jpeg,image/webp,image/svg+xml"
      onChange={handleFileInputChange}
      className="hidden"
      aria-label="Upload Title Artwork"
    />
  );

  // 1. FULL-PAGE EDITING VIEW (Expandable Title Page Layout)
  if (isExpanded) {
    return (
      <div className="mb-12 w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {hiddenFileInput}

        {/* Top Control Bar for Title Page */}
        <div className="w-full max-w-[8.5in] flex items-center justify-between pb-2 px-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold flex items-center gap-1.5"
              style={{ background: 'var(--surface-control)', color: 'var(--text-secondary)' }}
            >
              <FileSpreadsheet size={12} />
              TITLE PAGE (FIRST PAGE)
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
              Visual layout representation of the final printed first page
            </span>
          </div>

          <button
            type="button"
            onClick={toggleExpanded}
            className="ds-btn flex items-center gap-1.5"
            title="Collapse to compact title bar"
          >
            <Minimize2 size={13} />
            <span>Collapse View</span>
          </button>
        </div>

        {/* Full-Page Screenplay Paper representation */}
        <div
          className={`screenplay-paper relative flex flex-col justify-between font-courier select-text ${
            paperSize === 'letter' ? 'paper-letter' : 'paper-a4'
          }`}
          style={{ minHeight: paperSize === 'letter' ? '11in' : '297mm' }}
        >
          {/* Top & Center Content Container */}
          <div className="flex flex-col items-center w-full pt-8">
            {/* Custom Image / Title Artwork Upload Area */}
            <div
              className={`w-full max-w-[5.5in] mb-8 transition-all ${
                metadata.titleImageUrl ? 'text-center' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {metadata.titleImageUrl ? (
                <div className="relative group mx-auto inline-block">
                  <img
                    src={metadata.titleImageUrl}
                    alt="Official Title Artwork"
                    className="max-h-[2.8in] max-w-[5.5in] object-contain rounded shadow-md"
                    style={{ background: 'var(--surface-sunken)', boxShadow: 'var(--shadow-overlay)' }}
                  />
                  {/* Hover Action Controls for Artwork */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded"
                    style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="ds-btn flex items-center gap-1"
                    >
                      <Upload size={12} />
                      <span>Change Artwork</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="ds-btn flex items-center gap-1"
                      style={{ color: 'var(--text-danger)' }}
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-6 text-center cursor-pointer transition-colors"
                  style={{
                    background: isDraggingOver ? 'var(--surface-hover)' : 'var(--surface-control)',
                    boxShadow: 'inset 0 0 0 1px var(--line-separator)',
                    color: 'var(--text-secondary)',
                  }}
                  title="Upload movie title logo or official artwork graphic"
                >
                  <ImageIcon size={26} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold tracking-wide uppercase font-sans">
                    + Add Title Graphic / Official Artwork
                  </p>
                  <p className="text-[10px] mt-1 font-sans" style={{ color: 'var(--text-disabled)' }}>
                    Movie title logo, typography artwork or graphic header (PNG, JPG, SVG)
                  </p>
                </div>
              )}
            </div>

            {/* Main Script Title */}
            <div className="w-full text-center mb-6">
              <input
                type="text"
                value={metadata.title}
                onChange={handleTitleChange}
                onFocus={() => onFocusTitle(true)}
                onBlur={() => onFocusTitle(false)}
                placeholder="SCRIPT TITLE"
                title="Screenplay Title (Uppercase)"
                aria-label="Screenplay Title"
                className="w-full text-center text-2xl md:text-3xl font-bold uppercase tracking-widest bg-transparent border-0 focus:outline-none transition-all py-1 font-courier text-white placeholder-neutral-500"
                style={{ caretColor: 'var(--accent-text)' }}
              />
            </div>

            {/* "Written by" / "ਵੱਲੋਂ" Section */}
            <div className="w-full text-center space-y-2 mb-8">
              <p className="text-xs uppercase tracking-wider font-normal" style={{ color: 'var(--text-secondary)' }}>
                {metadata.basedOn ? 'ਵੱਲੋਂ / by' : 'Written by'}
              </p>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => handleFieldChange('author', e.target.value)}
                onFocus={() => onFocusTitle(true)}
                onBlur={() => onFocusTitle(false)}
                placeholder="Author Name / ਲੇਖਕ ਦਾ ਨਾਂ"
                title="Writer / Author"
                className="w-full max-w-[4in] text-center text-base font-semibold bg-transparent border-0 focus:outline-none transition-all py-1 font-courier text-white placeholder-neutral-600"
                style={{ caretColor: 'var(--accent-text)' }}
              />

              {/* Source Material / Based On */}
              <div className="pt-2">
                <input
                  type="text"
                  value={metadata.basedOn}
                  onChange={(e) => handleFieldChange('basedOn', e.target.value)}
                  onFocus={() => onFocusTitle(true)}
                  onBlur={() => onFocusTitle(false)}
                  placeholder="Based on source material or story (optional)"
                  title="Source Material / Based On"
                  className="w-full max-w-[4.5in] text-center text-xs bg-transparent border-0 focus:outline-none transition-all py-0.5 font-courier placeholder-neutral-600"
                  style={{ color: 'var(--text-secondary)', caretColor: 'var(--accent-text)' }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Details & Metadata (Industry Standard Lower Placement) */}
          <div
            className="w-full grid grid-cols-2 gap-8 pt-12 pb-4 text-xs"
            style={{
              boxShadow: 'inset 0 1px 0 var(--line-separator)',
              color: 'var(--text-secondary)',
            }}
          >
            {/* Left: Rights & Draft version */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Rights / Draft Version &amp; Date
              </label>
              <textarea
                rows={2}
                value={metadata.rights}
                onChange={(e) => handleFieldChange('rights', e.target.value)}
                onFocus={() => onFocusTitle(true)}
                onBlur={() => onFocusTitle(false)}
                placeholder="Draft 1.0 (Revision Date)&#10;Copyright © 2026, All Rights Reserved"
                className="ds-input font-courier w-full resize-none text-xs"
                style={{ height: 'auto', padding: 'var(--space-2)' }}
              />
            </div>

            {/* Right: Contact & Representation info */}
            <div className="space-y-1 text-right">
              <label className="block text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Contact &amp; Representation
              </label>
              <textarea
                rows={2}
                value={metadata.contact}
                onChange={(e) => handleFieldChange('contact', e.target.value)}
                onFocus={() => onFocusTitle(true)}
                onBlur={() => onFocusTitle(false)}
                placeholder="Email, Phone&#10;Agent / Management details"
                className="ds-input font-courier w-full resize-none text-xs text-right"
                style={{ height: 'auto', padding: 'var(--space-2)' }}
              />
            </div>
          </div>
        </div>

        {/* Bottom indicator button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={toggleExpanded}
            className="ds-btn ds-btn--primary ds-btn--lg flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Done Editing Title Page (Return to Script)</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. COMPACT TITLE CARD VIEW (Default above script paper)
  return (
    <div
      className="mb-6 w-full max-w-[8.5in] mx-auto relative transition-all duration-200"
      style={{
        background: 'var(--surface-panel)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-overlay), inset 0 1px 0 var(--line-edge)',
        color: 'var(--text-primary)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {hiddenFileInput}

      {/* Main compact title card row */}
      <div className="p-4 text-center relative font-courier flex flex-col items-center">
        {/* Optional Artwork Thumbnail preview if added */}
        {metadata.titleImageUrl && (
          <div
            onClick={toggleExpanded}
            className="mb-2 cursor-pointer group/art relative"
            title="Click to view/edit title page artwork layout"
          >
            <img
              src={metadata.titleImageUrl}
              alt="Title Artwork Thumbnail"
              className="h-10 max-w-[120px] object-contain rounded"
              style={{
                background: 'var(--surface-sunken)',
                boxShadow: 'inset 0 0 0 1px var(--line-separator)',
              }}
            />
          </div>
        )}

        {/* Script Title */}
        <input
          type="text"
          value={metadata.title}
          onChange={handleTitleChange}
          onFocus={() => onFocusTitle(true)}
          onBlur={() => onFocusTitle(false)}
          placeholder="SCRIPT TITLE"
          title="Screenplay Title (Uppercase) - Click to edit"
          aria-label="Screenplay Title"
          className="w-full text-center text-xl font-bold uppercase tracking-widest bg-transparent border-0 focus:outline-none transition-all py-1 font-courier cursor-text"
          style={{
            color: 'var(--text-primary)',
            caretColor: 'var(--accent-text)',
          }}
        />

        {metadata.author && !drawerOpen && (
          <p className="text-xs mt-0.5 font-normal uppercase" style={{ color: 'var(--text-secondary)' }}>
            Written by {metadata.author}
          </p>
        )}

        {/* Expand to Full-Page View Button (Top Right) */}
        <button
          type="button"
          onClick={toggleExpanded}
          className="ds-btn ds-btn--quiet absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5"
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            opacity: isHovered ? 1 : 0.7,
          }}
          title="Expand into full-page editing view (Movie artwork, credits & layout)"
          aria-label="Expand Script Title Page Layout"
        >
          <Maximize2 size={13} />
          <span className="hidden sm:inline">Title Page</span>
        </button>

        {/* Hover / drawer toggle button (Chevron) */}
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="ds-icon-btn absolute right-3 top-1/2 -translate-y-1/2"
          style={{
            color: 'var(--text-secondary)',
            opacity: isHovered || drawerOpen ? 1 : 0.7,
          }}
          title={drawerOpen ? 'Hide Quick Details' : 'Quick Details Drawer (Author, Rights)'}
        >
          {drawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Collapsible Metadata Drawer for Compact Mode */}
      {drawerOpen && (
        <div
          className="px-6 pb-5 pt-3 font-courier text-xs grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150"
          style={{
            background: 'var(--surface-control)',
            boxShadow: 'inset 0 1px 0 var(--line-separator)',
          }}
        >
          <div>
            <label className="block uppercase font-bold text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
              Written By (Author)
            </label>
            <input
              type="text"
              value={metadata.author}
              onChange={(e) => handleFieldChange('author', e.target.value)}
              onFocus={() => onFocusTitle(true)}
              onBlur={() => onFocusTitle(false)}
              placeholder="Author Name / ਲੇਖਕ"
              className="ds-input font-courier w-full"
            />
          </div>

          <div>
            <label className="block uppercase font-bold text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
              Based On
            </label>
            <input
              type="text"
              value={metadata.basedOn}
              onChange={(e) => handleFieldChange('basedOn', e.target.value)}
              onFocus={() => onFocusTitle(true)}
              onBlur={() => onFocusTitle(false)}
              placeholder="Source Material / Original Story"
              className="ds-input font-courier w-full"
            />
          </div>

          <div>
            <label className="block uppercase font-bold text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
              Contact Info
            </label>
            <input
              type="text"
              value={metadata.contact}
              onChange={(e) => handleFieldChange('contact', e.target.value)}
              onFocus={() => onFocusTitle(true)}
              onBlur={() => onFocusTitle(false)}
              placeholder="Email, Phone, Agent"
              className="ds-input font-courier w-full"
            />
          </div>

          <div>
            <label className="block uppercase font-bold text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
              Rights / Draft Version
            </label>
            <input
              type="text"
              value={metadata.rights}
              onChange={(e) => handleFieldChange('rights', e.target.value)}
              onFocus={() => onFocusTitle(true)}
              onBlur={() => onFocusTitle(false)}
              placeholder="Copyright © 2026, All Rights Reserved"
              className="ds-input font-courier w-full"
            />
          </div>

          {/* Quick Artwork Uploader in Drawer */}
          <div
            className="md:col-span-2 pt-3 flex items-center justify-between font-sans"
            style={{ boxShadow: 'inset 0 1px 0 var(--line-separator)' }}
          >
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
              {metadata.titleImageUrl ? 'Official title artwork uploaded.' : 'No title artwork uploaded.'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ds-btn flex items-center gap-1.5"
              >
                <Upload size={12} />
                <span>{metadata.titleImageUrl ? 'Change Artwork' : 'Upload Artwork'}</span>
              </button>
              {metadata.titleImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="ds-btn flex items-center gap-1.5"
                  style={{ color: 'var(--text-danger)' }}
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              )}
              <button
                type="button"
                onClick={toggleExpanded}
                className="ds-btn ds-btn--primary flex items-center gap-1.5"
              >
                <Maximize2 size={12} />
                <span>Open Full Page</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
