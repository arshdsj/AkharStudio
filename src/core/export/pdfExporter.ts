/**
 * pdfExporter.ts - Screenplay PDF Generation & Dual-Profile Layout Engine
 * Baseline: V9.1, PAGE-01, PAGE-02, PAGE-03, ARCH-04, EXPORT-01, DEC-014
 */

import { PaperSize, ScriptDraft, TitleMetadata, HighlightCharactersSetting } from '../../types/screenplay';
import { normalizeCharacterName } from '../editor/contd';

export interface PdfExportOptions {
  paperSize: PaperSize;
  includeTitlePage: boolean;
  courierFontBase64?: string;
  gurmukhiFontBase64?: string;
  highlightCharacters?: HighlightCharactersSetting;
  preserveCharacterHighlights?: boolean;
}

export interface PageGeometry {
  paperSize: PaperSize;
  width: string;
  height: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  printableWidth: string;
}

/**
 * Returns exact physical page geometry per DEC-014 and PAGE-01
 */
export function getPageGeometry(paperSize: PaperSize): PageGeometry {
  if (paperSize === 'a4') {
    return {
      paperSize: 'a4',
      width: '210mm',
      height: '297mm',
      marginTop: '25.4mm', // 1.0 in
      marginRight: '25.4mm', // 1.0 in
      marginBottom: '25.4mm', // 1.0 in
      marginLeft: '38.1mm', // 1.5 in
      printableWidth: '146.5mm', // 210 - 38.1 - 25.4 = 146.5mm (~5.77 in)
    };
  }

  // Default: US Letter (8.5 × 11 in)
  return {
    paperSize: 'letter',
    width: '8.5in',
    height: '11in',
    marginTop: '1.0in',
    marginRight: '1.0in',
    marginBottom: '1.0in',
    marginLeft: '1.5in',
    printableWidth: '6.0in', // 8.5 - 1.5 - 1.0 = 6.0 in
  };
}

/**
 * Generates clean, self-contained HTML for PDF rendering via Chromium printToPDF.
 * Embeds Noto Sans Gurmukhi and Courier Prime fonts for 100% offline certified rendering.
 */
export function generateScreenplayHtml(
  draft: ScriptDraft,
  metadata: TitleMetadata,
  options: PdfExportOptions
): string {
  const geometry = getPageGeometry(options.paperSize);

  // Embed base64 fonts if provided
  const courierFontFace = options.courierFontBase64
    ? `@font-face {
        font-family: 'Courier Prime';
        src: url(data:font/truetype;charset=utf-8;base64,${options.courierFontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }`
    : '';

  const gurmukhiFontFace = options.gurmukhiFontBase64
    ? `@font-face {
        font-family: 'Noto Sans Gurmukhi';
        src: url(data:font/truetype;charset=utf-8;base64,${options.gurmukhiFontBase64}) format('truetype');
        font-weight: 100 900;
        font-style: normal;
      }`
    : '';

  // Title Page HTML
  const titlePageHtml = options.includeTitlePage
    ? `
    <div class="title-page">
      <div class="title-top-space"></div>
      <div class="title-center-block">
        ${metadata.titleImageUrl ? `<div class="title-artwork-container"><img src="${metadata.titleImageUrl}" class="title-artwork" alt="Script Title Artwork" /></div>` : ''}
        <h1 class="title-text">${escapeHtml(metadata.title || 'UNTITLED')}</h1>
        <p class="title-written-by">${metadata.basedOn ? escapeHtml(metadata.basedOn) : 'ਵੱਲੋਂ / by'}</p>
        <p class="title-author">${escapeHtml(metadata.author || '')}</p>
      </div>
      <div class="title-bottom-block">
        <div class="title-meta-left">
          ${metadata.rights ? `<p>${escapeHtml(metadata.rights)}</p>` : ''}
          ${metadata.contact ? `<p class="contact-text">${escapeHtml(metadata.contact)}</p>` : ''}
        </div>
      </div>
    </div>
    `
    : '';

  const highlightCfg = options.highlightCharacters;
  const isHighlightActive = Boolean(
    highlightCfg &&
    highlightCfg.enabled &&
    highlightCfg.selectedCharacters &&
    highlightCfg.selectedCharacters.length > 0 &&
    options.preserveCharacterHighlights !== false
  );

  const selectedCharSet = isHighlightActive
    ? new Set(highlightCfg!.selectedCharacters.map((c) => c.toUpperCase().trim()))
    : new Set<string>();
  const highlightColor = highlightCfg?.color || 'rgba(167, 139, 250, 0.35)';

  let currentSpeaker: string | null = null;

  // Render screenplay blocks with strict layout metrics (PAGE-02, ARCH-04)
  const blocksHtml = draft.blocks
    .map((block) => {
      const escapedText = escapeHtml(block.text);

      let isHighlighted = false;
      if (isHighlightActive) {
        if (block.type === 'scene_heading') {
          currentSpeaker = null;
        } else if (block.type === 'character') {
          const charName = normalizeCharacterName(block.text);
          if (charName && selectedCharSet.has(charName)) {
            currentSpeaker = charName;
            isHighlighted = true;
          } else {
            currentSpeaker = null;
          }
        } else if (currentSpeaker && (block.type === 'dialogue' || block.type === 'parenthetical')) {
          isHighlighted = true;
        } else {
          currentSpeaker = null;
        }
      }

      const content = isHighlighted && escapedText
        ? `<span class="character-highlight" style="background-color: ${highlightColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-radius: 2px; padding: 1px 3px;">${escapedText}</span>`
        : escapedText;

      switch (block.type) {
        case 'scene_heading':
          return `<div class="scene-heading" id="${block.id}">${content}</div>`;
        case 'action':
          return `<div class="action" id="${block.id}">${content || '&nbsp;'}</div>`;
        case 'character':
          return `<div class="character" id="${block.id}">${content}</div>`;
        case 'parenthetical':
          return `<div class="parenthetical" id="${block.id}">${content}</div>`;
        case 'dialogue':
          return `<div class="dialogue" id="${block.id}">${content}</div>`;
        case 'transition':
          return `<div class="transition" id="${block.id}">${content}</div>`;
        case 'shot':
          return `<div class="shot" id="${block.id}">${content}</div>`;
        default:
          return `<div class="action" id="${block.id}">${content}</div>`;
      }
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pa-Guru">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(metadata.title || 'Screenplay')}</title>
  <style>
    ${courierFontFace}
    ${gurmukhiFontFace}

    @page {
      size: ${geometry.width} ${geometry.height};
      margin-top: ${geometry.marginTop};
      margin-right: ${geometry.marginRight};
      margin-bottom: ${geometry.marginBottom};
      margin-left: ${geometry.marginLeft};
      @top-right {
        content: counter(page) ".";
        font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
        font-size: 10pt;
      }
    }

    @page :first {
      /* Suppress header/page number on the first page */
      @top-right {
        content: "";
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      font-size: 12pt;
      line-height: 14.5pt;
      color: #000000;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    .title-page {
      min-height: ${options.paperSize === 'a4' ? '246mm' : '9.0in'};
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
      text-align: center;
    }

    .title-top-space {
      height: ${metadata.titleImageUrl ? '1.5in' : '2.5in'};
    }

    .title-center-block {
      flex: 1;
    }

    .title-artwork-container {
      margin: 0 auto 20pt auto;
      text-align: center;
    }

    .title-artwork {
      max-width: 5.5in;
      max-height: 2.5in;
      object-fit: contain;
      display: inline-block;
    }

    .title-text {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 1.5px;
      margin: 0 0 18pt 0;
      text-transform: uppercase;
    }

    .title-written-by {
      font-size: 12pt;
      margin: 0 0 6pt 0;
    }

    .title-author {
      font-size: 14pt;
      margin: 0;
    }

    .title-bottom-block {
      display: flex;
      justify-content: space-between;
      text-align: left;
      font-size: 10pt;
      line-height: 13pt;
      padding-bottom: 0.5in;
    }

    .contact-text {
      white-space: pre-wrap;
      margin-top: 6pt;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .screenplay-body {
      padding-top: 4pt;
    }

    /* Standard Screenplay Element Layout (PAGE-02, ARCH-04) */
    /* Scene Heading with subtle separator line (Requirement 1.B) */
    .scene-heading {
      border-top: 0.5pt solid #d1d5db;
      padding-top: 8pt;
      margin-top: 18pt;
      margin-bottom: 12pt;
      text-transform: uppercase;
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .action {
      margin-top: 0;
      margin-bottom: 12pt;
      max-width: 6.0in;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Anti-orphan rule (ARCH-04): never isolate Character cue at page bottom */
    /* Bold Character Names (Requirement 1.A) */
    .character {
      margin-top: 12pt;
      margin-bottom: 0;
      margin-left: 2.2in;
      text-transform: uppercase;
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid;
      break-inside: avoid;
    }

    /* Parenthetical: keep attached to character and following dialogue */
    .parenthetical {
      margin-top: 0;
      margin-bottom: 0;
      margin-left: 1.6in;
      max-width: 3.0in;
      page-break-after: avoid;
      break-after: avoid;
      break-inside: avoid;
    }

    /* Dialogue: avoid mid-speech page rupture where possible */
    .dialogue {
      margin-top: 0;
      margin-bottom: 12pt;
      margin-left: 1.0in;
      max-width: 3.5in;
      white-space: pre-wrap;
      word-wrap: break-word;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .transition {
      margin-top: 12pt;
      margin-bottom: 12pt;
      margin-left: 4.5in;
      text-transform: uppercase;
      page-break-before: avoid;
      break-before: avoid;
    }

    .shot {
      margin-top: 18pt;
      margin-bottom: 12pt;
      text-transform: uppercase;
      font-weight: bold;
      page-break-after: avoid;
      break-after: avoid;
    }

    .character-highlight {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      display: inline;
    }
  </style>
</head>
<body>
  ${titlePageHtml}
  <div class="screenplay-body">
    ${blocksHtml}
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface CharacterSheetEntry {
  name: string;
  firstAppearanceScene: string;
  dialogueCount: number;
  wordCount: number;
  scenes: string[];
}

/**
 * Extract character data from a screenplay draft in first-appearance order (Requirement 3.D)
 */
export function extractCharacterSheetData(draft: ScriptDraft): CharacterSheetEntry[] {
  const charactersMap = new Map<string, CharacterSheetEntry>();
  let currentScene = 'SCENE 1 (UNTITLED)';
  let currentSpeaker: string | null = null;
  let sceneIndex = 0;

  for (const block of draft.blocks) {
    if (block.type === 'scene_heading') {
      const sceneText = block.text.trim();
      sceneIndex++;
      currentScene = sceneText || `SCENE ${sceneIndex}`;
      currentSpeaker = null;
    } else if (block.type === 'character') {
      const rawText = block.text.trim();
      if (!rawText) continue;
      // Normalize character name: uppercase and strip (CONT'D), (V.O.), (O.S.), etc.
      const cleanName = rawText.toUpperCase().replace(/\s*\([^)]*\)$/, '').trim();
      if (!cleanName) continue;

      if (!charactersMap.has(cleanName)) {
        charactersMap.set(cleanName, {
          name: cleanName,
          firstAppearanceScene: currentScene,
          dialogueCount: 0,
          wordCount: 0,
          scenes: [],
        });
      }

      const entry = charactersMap.get(cleanName)!;
      entry.dialogueCount++;
      if (!entry.scenes.includes(currentScene)) {
        entry.scenes.push(currentScene);
      }
      currentSpeaker = cleanName;
    } else if (block.type === 'parenthetical') {
      // Parenthetical belongs to current speaker; keep currentSpeaker active
    } else if (block.type === 'dialogue') {
      if (currentSpeaker && charactersMap.has(currentSpeaker)) {
        const text = block.text.trim();
        if (text) {
          const words = text.split(/[\s,.;:!?।॥—\-()[\]{}'"]+/).filter((w) => w.length > 0);
          charactersMap.get(currentSpeaker)!.wordCount += words.length;
        }
      }
    } else {
      // action, transition, shot: reset current speaker
      currentSpeaker = null;
    }
  }

  return Array.from(charactersMap.values());
}

/**
 * Generates clean, self-contained HTML for Character Sheet PDF rendering (Requirement 3.D)
 */
export function generateCharacterSheetHtml(
  draft: ScriptDraft,
  metadata: TitleMetadata,
  options: PdfExportOptions
): string {
  const geometry = getPageGeometry(options.paperSize);
  const characters = extractCharacterSheetData(draft);

  const courierFontFace = options.courierFontBase64
    ? `@font-face {
        font-family: 'Courier Prime';
        src: url(data:font/truetype;charset=utf-8;base64,${options.courierFontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }`
    : '';

  const gurmukhiFontFace = options.gurmukhiFontBase64
    ? `@font-face {
        font-family: 'Noto Sans Gurmukhi';
        src: url(data:font/truetype;charset=utf-8;base64,${options.gurmukhiFontBase64}) format('truetype');
        font-weight: 100 900;
        font-style: normal;
      }`
    : '';

  const rowsHtml = characters.length === 0
    ? `<tr><td colspan="5" class="empty-state">No character cues detected in this screenplay.</td></tr>`
    : characters
        .map((char, index) => {
          return `<tr>
            <td class="col-num">${index + 1}</td>
            <td class="col-name"><strong>${escapeHtml(char.name)}</strong></td>
            <td class="col-dialogue">${char.dialogueCount}</td>
            <td class="col-words">${char.wordCount.toLocaleString()}</td>
            <td class="col-first">${escapeHtml(char.firstAppearanceScene)}</td>
          </tr>`;
        })
        .join('\n');

  return `<!DOCTYPE html>
<html lang="pa-Guru">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(metadata.title || 'Screenplay')} - Character Sheet</title>
  <style>
    ${courierFontFace}
    ${gurmukhiFontFace}

    @page {
      size: ${geometry.width} ${geometry.height};
      margin: 1.0in 1.0in 1.0in 1.0in;
      @top-right {
        content: counter(page);
        font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
        font-size: 10pt;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      font-size: 11pt;
      line-height: 14pt;
      color: #111827;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }

    .header-block {
      border-bottom: 2pt solid #111827;
      padding-bottom: 12pt;
      margin-bottom: 18pt;
    }

    .doc-title {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 4pt 0;
    }

    .doc-subtitle {
      font-size: 13pt;
      font-weight: bold;
      color: #4b5563;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8pt 0;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      color: #6b7280;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10pt;
    }

    th {
      text-align: left;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8pt 6pt;
      border-bottom: 1.5pt solid #374151;
      background-color: #f3f4f6;
      color: #1f2937;
    }

    td {
      padding: 8pt 6pt;
      border-bottom: 0.5pt solid #e5e7eb;
      font-size: 10.5pt;
      vertical-align: top;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    tr:nth-child(even) td {
      background-color: #f9fafb;
    }

    .col-num {
      width: 32px;
      color: #9ca3af;
      font-size: 9pt;
    }

    .col-name {
      width: 28%;
      font-size: 11pt;
    }

    .col-dialogue {
      width: 14%;
      text-align: center;
    }

    .col-words {
      width: 14%;
      text-align: center;
    }

    .col-first {
      width: 40%;
      color: #374151;
      font-size: 9.5pt;
    }

    .empty-state {
      text-align: center;
      padding: 30pt;
      color: #9ca3af;
      font-style: italic;
    }

    .summary-footer {
      margin-top: 24pt;
      padding-top: 10pt;
      border-top: 0.5pt solid #d1d5db;
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header-block">
    <h1 class="doc-title">${escapeHtml(metadata.title || 'UNTITLED SCRIPT')}</h1>
    <div class="doc-subtitle">Character Reference Sheet / ਪਾਤਰ ਸੂਚੀ</div>
    <div class="meta-row">
      <span>${metadata.author ? `Author: ${escapeHtml(metadata.author)}` : ''}</span>
      <span>Total Detected Characters: <strong>${characters.length}</strong></span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-name">Character Name</th>
        <th class="col-dialogue">Dialogue Cues</th>
        <th class="col-words">Words Spoken</th>
        <th class="col-first">First Appearance Scene</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="summary-footer">
    <span>AkharStudio / ਅੱਖਰStudio</span>
    <span>Generated from Screenplay Analysis</span>
  </div>
</body>
</html>`;
}
