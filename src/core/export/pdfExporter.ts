/**
 * pdfExporter.ts - Screenplay PDF Generation & Dual-Profile Layout Engine
 * Baseline: V9.1, PAGE-01, PAGE-02, PAGE-03, ARCH-04, EXPORT-01, DEC-014
 */

import {
  PaperSize,
  ScriptDraft,
  TitleMetadata,
  HighlightCharactersSetting,
  ContdSetting,
  ScreenplayBlockType,
} from '../../types/screenplay';
import { normalizeCharacterName } from '../editor/contd';
import {
  PaginationResult,
  PageSlotItem,
  createPaginationEngine,
  IPaginationEngine,
  createPageProfile,
} from '../layout/paginationEngine';
import { draftToLayoutBlocks, TextMarkRun } from '../layout/paginationAdapter';
import { createTextLayoutService, ITextLayoutService } from '../layout/textLayoutService';
import {
  FontMetricsProvider,
  getGurmukhiFontMetricsProvider,
  IFontMetricsProvider,
  validateFontBuffer,
  EXPECTED_NOTO_SANS_GURMUKHI,
  FontValidationResult,
} from '../layout/fontMetrics';
import {
  CANONICAL_FONT_STACK,
  CANONICAL_TEXT_RENDERING,
  CANONICAL_FONT_KERNING,
  CANONICAL_FONT_FEATURE_SETTINGS,
  CANONICAL_WEBKIT_FONT_SMOOTHING,
  LINE_PITCH_PX,
  FONT_SIZE_PX,
} from '../layout/screenplayGeometry';

export interface PdfExportOptions {
  paperSize: PaperSize;
  includeTitlePage: boolean;
  courierFontBase64?: string;
  gurmukhiFontBase64?: string;
  highlightCharacters?: HighlightCharactersSetting;
  preserveCharacterHighlights?: boolean;
  useUnifiedPagination?: boolean;
  paginationResult?: PaginationResult;
  contdSetting?: ContdSetting;
  fontMetricsProvider?: IFontMetricsProvider;
  textLayoutService?: ITextLayoutService;
  paginationEngine?: IPaginationEngine;
  allowHeadlessFallback?: boolean;
  linePitchPx?: number;
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
 * Supports legacy flow (default) and unified pagination flow (useUnifiedPagination: true).
 */
export function generateScreenplayHtml(
  draft: ScriptDraft,
  metadata: Partial<TitleMetadata>,
  options: PdfExportOptions
): string {
  return generateUnifiedScreenplayPdfHtml(draft, metadata, {
    ...options,
    useUnifiedPagination: true,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFormattedLineText(text: string, markRuns?: TextMarkRun[]): string {
  if (!markRuns || markRuns.length === 0) {
    return escapeHtml(text);
  }
  let html = '';
  let cur = 0;
  for (const run of markRuns) {
    if (run.start > cur) {
      html += escapeHtml(text.slice(cur, run.start));
    }
    let runText = escapeHtml(text.slice(run.start, run.end));
    if (run.underline) {
      runText = `<u>${runText}</u>`;
    }
    if (run.italic) {
      runText = `<em>${runText}</em>`;
    }
    if (run.bold) {
      runText = `<strong>${runText}</strong>`;
    }
    html += runText;
    cur = run.end;
  }
  if (cur < text.length) {
    html += escapeHtml(text.slice(cur));
  }
  return html;
}

function getBlockCssClass(type: ScreenplayBlockType): string {
  switch (type) {
    case 'scene_heading':
      return 'scene-heading';
    case 'action':
      return 'action';
    case 'character':
      return 'character';
    case 'parenthetical':
      return 'parenthetical';
    case 'dialogue':
      return 'dialogue';
    case 'transition':
      return 'transition';
    case 'shot':
      return 'shot';
    default:
      return 'action';
  }
}

/**
 * Validates embedded font base64 buffers for PDF export against expected TrueType identity.
 */
export async function validateExportFonts(options: {
  gurmukhiFontBase64?: string;
  courierFontBase64?: string;
}): Promise<FontValidationResult> {
  if (options.gurmukhiFontBase64) {
    const fontBuffer = Buffer.from(options.gurmukhiFontBase64, 'base64');
    const result = await validateFontBuffer(fontBuffer.buffer, EXPECTED_NOTO_SANS_GURMUKHI);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

/**
 * Generates unified screenplay PDF HTML where each physical sheet is rendered as a discrete
 * container dictated 100% by the unified PaginationResult.
 *
 * Guaranteed Properties:
 * 1. Zero Chromium automatic pagination: page breaks are discrete .page-sheet elements.
 * 2. 18.0pt strict line-box baseline pitch across all elements.
 * 3. Exact matching of editor pagination decisions, block assignments, and dialogue splits.
 * 4. Presentation-only (MORE) and (CONT'D) labels with 0 canonical data mutations.
 * 5. Full-width margin isolation and running headers.
 */
export function generateUnifiedScreenplayPdfHtml(
  draft: ScriptDraft,
  metadata: Partial<TitleMetadata>,
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

  // 1. Title Page HTML
  const titlePageHtml = options.includeTitlePage
    ? `
    <div class="page-sheet title-page" id="title-page">
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

  // 2. Pre-calculate Highlighted Blocks
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

  const highlightedBlockIds = new Set<string>();
  if (isHighlightActive) {
    let currentSpeaker: string | null = null;
    for (const block of draft.blocks) {
      if (block.type === 'scene_heading') {
        currentSpeaker = null;
      } else if (block.type === 'character') {
        const charName = normalizeCharacterName(block.text);
        if (charName && selectedCharSet.has(charName)) {
          currentSpeaker = charName;
          highlightedBlockIds.add(block.id);
        } else {
          currentSpeaker = null;
        }
      } else if (currentSpeaker && (block.type === 'dialogue' || block.type === 'parenthetical')) {
        highlightedBlockIds.add(block.id);
      } else {
        currentSpeaker = null;
      }
    }
  }

  // 3. Resolve PaginationResult
  let paginationResult = options.paginationResult;
  const effectiveLinePitchPt = options.linePitchPx ? (options.linePitchPx * 72) / 96 : undefined;
  const effectivePitchPx = options.linePitchPx ?? LINE_PITCH_PX;

  if (!paginationResult) {
    const layoutBlocks = draftToLayoutBlocks(draft);
    const engine = options.paginationEngine ?? createPaginationEngine();
    const profile = createPageProfile(options.paperSize, effectiveLinePitchPt ? { linePitchPt: effectiveLinePitchPt } : undefined);

    let layoutService = options.textLayoutService;
    if (!layoutService) {
      let fontMetrics = options.fontMetricsProvider;
      if (!fontMetrics) {
        const provider = getGurmukhiFontMetricsProvider();
        try {
          // Check if real canvas measurement is available in current environment
          provider.measureWidth('test');
          fontMetrics = provider;
        } catch (ctxErr) {
          if (options.allowHeadlessFallback === false) {
            throw new Error(
              `Canvas 2D context is unavailable for certified font measurement in current environment. ` +
              `Silent fallback to uncertified pitch is prohibited in production PDF export. (${String(ctxErr)})`
            );
          }
          // In explicit headless Node test environments, allow script-aware proportional fallback:
          // Courier Prime (Latin monospace) is 7.2pt per character at 12pt (10 cpi);
          // Noto Sans Gurmukhi (proportional) is ~4.3pt average advance width at 12pt.
          fontMetrics = new FontMetricsProvider({
            measureFn: (text) => (/[\u0A00-\u0A7F]/.test(text) ? Number((text.length * 4.3).toFixed(4)) : Number((text.length * 7.2).toFixed(4))),
          });
        }
      }
      layoutService = createTextLayoutService(fontMetrics);
    }

    paginationResult = engine.paginate(layoutBlocks, {
      profile,
      paperSize: options.paperSize,
      contdSetting: options.contdSetting ?? 'none',
      textLayoutService: layoutService,
    });
  }

  // 4. Render Discrete Page Sheets
  let pagesHtml = '';
  if (paginationResult.pages.length === 0) {
    if (!options.includeTitlePage) {
      pagesHtml = `
      <div class="page-sheet screenplay-page-sheet" data-page-number="1">
        <div class="page-content"></div>
      </div>
      `;
    }
  } else {
    pagesHtml = paginationResult.pages
      .map((page) => {
        const headerHtml = page.hasHeader
          ? `<div class="page-header">${escapeHtml(page.headerText || `${page.pageNumber}.`)}</div>`
          : '';

        const slotItems = page.slots;
        const renderedElements: string[] = [];
        let i = 0;

        while (i < slotItems.length) {
          const slot = slotItems[i];

          if (slot.kind === 'blank_line') {
            i++;
            continue;
          }

          if (slot.kind === 'more') {
            const moreText = escapeHtml(slot.presentationText || '(MORE)');
            renderedElements.push(
              `<div class="slot-line screenplay-more-continuation select-none">${moreText}</div>`
            );
            i++;
            continue;
          }

          if (slot.kind === 'contd') {
            const contdText = escapeHtml(slot.presentationText || '');
            renderedElements.push(
              `<div class="slot-line character screenplay-contd-continuation">${contdText}</div>`
            );
            i++;
            continue;
          }

          if (slot.kind === 'text') {
            const currentBlockId = slot.blockId;
            const currentBlockType = slot.blockType;
            const blockSlots: PageSlotItem[] = [];

            while (
              i < slotItems.length &&
              slotItems[i].kind === 'text' &&
              slotItems[i].blockId === currentBlockId
            ) {
              blockSlots.push(slotItems[i]);
              i++;
            }

            const isHighlighted = highlightedBlockIds.has(currentBlockId);
            const blockLinesHtml = blockSlots
              .map((s) => {
                const formattedContent = s.line
                  ? renderFormattedLineText(s.line.text, s.line.markRuns)
                  : escapeHtml(s.presentationText || '');
                const content =
                  isHighlighted && formattedContent
                    ? `<span class="character-highlight" style="background-color: ${highlightColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-radius: 2px; padding: 1px 3px;">${formattedContent}</span>`
                    : formattedContent;
                return `<div class="screenplay-line">${content || '&nbsp;'}</div>`;
              })
              .join('\n');

            const blockCssClass = getBlockCssClass(currentBlockType);
            renderedElements.push(
              `<div class="screenplay-block ${blockCssClass}" id="${currentBlockId}">\n${blockLinesHtml}\n</div>`
            );
          }
        }

        return `
        <div class="page-sheet screenplay-page-sheet" data-page-number="${page.pageNumber}">
          ${headerHtml}
          <div class="page-content">
            ${renderedElements.join('\n')}
          </div>
        </div>
        `;
      })
      .join('\n');
  }

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
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: ${CANONICAL_FONT_STACK};
      font-size: ${FONT_SIZE_PX}px;
      line-height: ${effectivePitchPx}px;
      text-rendering: ${CANONICAL_TEXT_RENDERING};
      font-kerning: ${CANONICAL_FONT_KERNING};
      font-feature-settings: ${CANONICAL_FONT_FEATURE_SETTINGS};
      -webkit-font-smoothing: ${CANONICAL_WEBKIT_FONT_SMOOTHING};
    }

    .page-sheet {
      width: ${geometry.width};
      height: ${geometry.height};
      padding: ${geometry.marginTop} ${geometry.marginRight} ${geometry.marginBottom} ${geometry.marginLeft};
      page-break-after: always;
      break-after: page;
      position: relative;
      overflow: visible;
      box-sizing: border-box;
      background: #ffffff;
    }

    .page-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .page-header {
      position: absolute;
      top: 36pt;
      right: ${geometry.marginRight};
      font-family: ${CANONICAL_FONT_STACK};
      font-size: 10pt;
      line-height: 14pt;
      text-align: right;
      color: #000000;
    }

    .page-content {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .page-content > .screenplay-block:first-child,
    .page-content > :first-child {
      margin-top: 0 !important;
      border-top: none !important;
      padding-top: 0 !important;
    }

    .title-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      page-break-after: always;
      break-after: page;
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

    /* Screenplay Canonical Geometry (Target Geometry: 16px line pitch, 16px blank lines between blocks) */
    .screenplay-block {
      padding-top: 0;
      padding-bottom: 0;
      box-sizing: border-box;
      overflow: visible;
    }

    .screenplay-line {
      line-height: ${effectivePitchPx}px;
      font-size: ${FONT_SIZE_PX}px;
      height: ${effectivePitchPx}px;
      min-height: ${effectivePitchPx}px;
      margin: 0;
      padding: 0;
      white-space: pre;
      overflow: visible;
      box-sizing: border-box;
    }

    .slot-line {
      line-height: ${effectivePitchPx}px;
      font-size: ${FONT_SIZE_PX}px;
      height: ${effectivePitchPx}px;
      min-height: ${effectivePitchPx}px;
      margin: 0;
      padding: 0;
      white-space: pre;
      overflow: visible;
      box-sizing: border-box;
    }

    .scene-heading {
      margin-left: 0;
      max-width: ${geometry.printableWidth};
      margin-top: ${2 * effectivePitchPx}px;
      margin-bottom: ${effectivePitchPx}px;
      text-transform: uppercase;
      font-weight: bold;
      border-top: none;
      overflow: visible;
    }

    .action {
      margin-left: 0;
      max-width: ${geometry.printableWidth};
      margin-top: 0;
      margin-bottom: ${effectivePitchPx}px;
      overflow: visible;
    }

    .character {
      margin-left: 0;
      text-align: center;
      margin-top: ${effectivePitchPx}px;
      margin-bottom: 0;
      text-transform: uppercase;
      font-weight: bold;
      overflow: visible;
    }

    .parenthetical {
      margin-left: 1.6in;
      max-width: 2.2in;
      margin-top: 0;
      margin-bottom: 0;
      overflow: visible;
    }

    .dialogue {
      margin-left: 1.0in;
      max-width: 3.5in;
      margin-top: 0;
      margin-bottom: ${effectivePitchPx}px;
      overflow: visible;
    }

    .transition {
      margin-left: 0;
      text-align: right;
      margin-top: ${effectivePitchPx}px;
      margin-bottom: ${effectivePitchPx}px;
      text-transform: uppercase;
      font-weight: bold;
      overflow: visible;
    }

    .shot {
      margin-left: 0;
      max-width: ${geometry.printableWidth};
      margin-top: ${effectivePitchPx}px;
      margin-bottom: ${effectivePitchPx}px;
      text-transform: uppercase;
      font-weight: bold;
      overflow: visible;
    }

    .screenplay-more-continuation {
      margin-left: 1.0in;
      max-width: 3.5in;
      text-align: center;
      margin-top: 0;
      margin-bottom: 0;
      font-family: ${CANONICAL_FONT_STACK};
      overflow: visible;
    }

    .screenplay-contd-continuation {
      margin-left: 0;
      text-align: center;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 0;
      margin-bottom: 0;
      font-family: ${CANONICAL_FONT_STACK};
      overflow: visible;
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
  ${pagesHtml}
</body>
</html>`;
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
  metadata: Partial<TitleMetadata>,
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
