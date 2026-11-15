"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// test/helpers/run-full-acceptance.ts
var import_electron = require("electron");
var path = __toESM(require("path"), 1);
var fs = __toESM(require("fs"), 1);

// src/core/editor/contd.ts
function normalizeCharacterName(text) {
  return text.toUpperCase().replace(/\s*\([^)]*\)$/, "").trim();
}

// src/core/layout/screenplayGeometry.ts
var FONT_SIZE_PX = 16;
var LINE_PITCH_PX = 16;
var LINE_PITCH_PT = 12;
var CANONICAL_FONT_STACK = '"Courier Prime", "Noto Sans Gurmukhi", monospace';
var CANONICAL_TEXT_RENDERING = "optimizeLegibility";
var CANONICAL_FONT_KERNING = "normal";
var CANONICAL_FONT_FEATURE_SETTINGS = '"kern" 1, "liga" 1';
var CANONICAL_WEBKIT_FONT_SMOOTHING = "antialiased";
var ELEMENT_SPACING = {
  scene_heading: {
    marginTopPx: 32,
    // 24pt
    marginBottomPx: 16,
    // 12pt
    marginTopPt: 24,
    marginBottomPt: 12
  },
  action: {
    marginTopPx: 0,
    marginBottomPx: 16,
    // 12pt
    marginTopPt: 0,
    marginBottomPt: 12
  },
  character: {
    marginTopPx: 16,
    // 12pt (one blank 16px line before cue)
    marginBottomPx: 0,
    // sits directly above dialogue
    marginTopPt: 12,
    marginBottomPt: 0
  },
  parenthetical: {
    marginTopPx: 0,
    marginBottomPx: 0,
    marginTopPt: 0,
    marginBottomPt: 0
  },
  dialogue: {
    marginTopPx: 0,
    marginBottomPx: 16,
    // 12pt (one blank 16px line after dialogue)
    marginTopPt: 0,
    marginBottomPt: 12
  },
  transition: {
    marginTopPx: 16,
    // 12pt
    marginBottomPx: 16,
    // 12pt
    marginTopPt: 12,
    marginBottomPt: 12
  },
  shot: {
    marginTopPx: 16,
    // 12pt
    marginBottomPx: 16,
    // 12pt
    marginTopPt: 12,
    marginBottomPt: 12
  }
};

// src/core/layout/paginationEngine.ts
var TOLERANCE_PT = 0.375;
function calculateCollapsedMarginPt(prevType, nextType, isPageTop) {
  if (isPageTop || prevType === null) {
    if (nextType === "scene_heading") {
      return ELEMENT_SPACING.scene_heading.marginTopPt;
    }
    return 0;
  }
  if ((prevType === "character" || prevType === "parenthetical") && (nextType === "dialogue" || nextType === "parenthetical")) {
    return 0;
  }
  const prevBottom = ELEMENT_SPACING[prevType]?.marginBottomPt ?? 12;
  const nextTop = ELEMENT_SPACING[nextType]?.marginTopPt ?? 12;
  return Math.max(prevBottom, nextTop);
}
var PAGE_PROFILES = {
  letter: {
    paperSize: "letter",
    widthPt: 612,
    heightPt: 792,
    marginTopPt: 72,
    // 1.0 in
    marginRightPt: 72,
    // 1.0 in
    marginBottomPt: 72,
    // 1.0 in
    marginLeftPt: 108,
    // 1.5 in binding gutter
    printableWidthPt: 432,
    // 612 - 108 - 72 = 432pt
    printableHeightPt: 648,
    // 792 - 72 - 72 = 648pt (864px)
    linePitchPt: LINE_PITCH_PT,
    // 12.0pt (16px)
    headerTopPt: 36,
    // 0.5 in from sheet top
    slotCapacity: Math.floor(648 / LINE_PITCH_PT),
    // 54 slots
    bottomSafetyBufferPt: Number((648 - Math.floor(648 / LINE_PITCH_PT) * LINE_PITCH_PT).toFixed(4))
  },
  a4: {
    paperSize: "a4",
    widthPt: 595.28,
    heightPt: 841.89,
    marginTopPt: 72,
    marginRightPt: 72,
    marginBottomPt: 72,
    marginLeftPt: 108,
    printableWidthPt: 415.28,
    printableHeightPt: 697.89,
    // 930.5px
    linePitchPt: LINE_PITCH_PT,
    // 12.0pt
    headerTopPt: 36,
    slotCapacity: Math.floor(697.89 / LINE_PITCH_PT),
    // 58 slots
    bottomSafetyBufferPt: Number((697.89 - Math.floor(697.89 / LINE_PITCH_PT) * LINE_PITCH_PT).toFixed(4))
  }
};
function validatePageProfile(profile) {
  if (!profile || typeof profile !== "object") {
    throw new Error("validatePageProfile: profile must be a valid object");
  }
  const { widthPt, heightPt, marginTopPt, marginBottomPt, marginLeftPt, marginRightPt, linePitchPt } = profile;
  if (!Number.isFinite(widthPt) || widthPt <= 0) {
    throw new Error(`validatePageProfile: invalid widthPt (${widthPt})`);
  }
  if (!Number.isFinite(heightPt) || heightPt <= 0) {
    throw new Error(`validatePageProfile: invalid heightPt (${heightPt})`);
  }
  if (!Number.isFinite(linePitchPt) || linePitchPt <= 0) {
    throw new Error(`validatePageProfile: invalid linePitchPt (${linePitchPt})`);
  }
  const printableW = widthPt - marginLeftPt - marginRightPt;
  const printableH = heightPt - marginTopPt - marginBottomPt;
  if (printableW <= 0) {
    throw new Error(`validatePageProfile: printable width is non-positive (${printableW}pt). Margins exceed sheet width.`);
  }
  if (printableH <= 0) {
    throw new Error(`validatePageProfile: printable height is non-positive (${printableH}pt). Margins exceed sheet height.`);
  }
  const expectedSlots = Math.floor(printableH / linePitchPt);
  if (expectedSlots <= 0) {
    throw new Error(`validatePageProfile: line pitch (${linePitchPt}pt) exceeds printable height (${printableH}pt). 0 slots possible.`);
  }
}
function createPageProfile(paperSize, overrides) {
  const base = PAGE_PROFILES[paperSize];
  if (!base) {
    throw new Error(`createPageProfile: unknown paperSize '${paperSize}'. Must be 'letter' or 'a4'.`);
  }
  const widthPt = overrides?.widthPt ?? base.widthPt;
  const heightPt = overrides?.heightPt ?? base.heightPt;
  const marginTopPt = overrides?.marginTopPt ?? base.marginTopPt;
  const marginRightPt = overrides?.marginRightPt ?? base.marginRightPt;
  const marginBottomPt = overrides?.marginBottomPt ?? base.marginBottomPt;
  const marginLeftPt = overrides?.marginLeftPt ?? base.marginLeftPt;
  const linePitchPt = overrides?.linePitchPt ?? base.linePitchPt;
  const headerTopPt = overrides?.headerTopPt ?? base.headerTopPt;
  const printableWidthPt = Number((widthPt - marginLeftPt - marginRightPt).toFixed(4));
  const printableHeightPt = Number((heightPt - marginTopPt - marginBottomPt).toFixed(4));
  const slotCapacity = Math.floor(printableHeightPt / linePitchPt);
  const bottomSafetyBufferPt = Number((printableHeightPt - slotCapacity * linePitchPt).toFixed(4));
  const profile = {
    paperSize: overrides?.paperSize ?? base.paperSize,
    widthPt,
    heightPt,
    marginTopPt,
    marginRightPt,
    marginBottomPt,
    marginLeftPt,
    printableWidthPt,
    printableHeightPt,
    linePitchPt,
    headerTopPt,
    slotCapacity,
    bottomSafetyBufferPt
  };
  validatePageProfile(profile);
  return profile;
}
var DEFAULT_SPACING_RULES = {
  sceneHeading: { blankAbove: 1, minLinesFollow: 2 },
  action: { blankAbove: 1, minLinesBeforeSplit: 1, minLinesAfterSplit: 1 },
  character: { blankAbove: 1, minDialogueFollow: 1 },
  parenthetical: { blankAbove: 0 },
  dialogue: { blankAbove: 0, minSplitBefore: 2, minSplitAfter: 2 },
  transition: { blankAbove: 1 },
  shot: { blankAbove: 1, minLinesFollow: 2 }
};
var PaginationEngine = class {
  /**
   * Paginates an ordered sequence of screenplay blocks across physical pages.
   * Pure, deterministic, and preserves canonical text 100%.
   */
  paginate(blocks, options) {
    if (!Array.isArray(blocks)) {
      throw new Error(`PaginationEngine.paginate: expected array of blocks, received ${typeof blocks}`);
    }
    const profile = options?.profile ?? createPageProfile(options?.paperSize ?? "letter");
    validatePageProfile(profile);
    const spacing = options?.spacingRules ?? DEFAULT_SPACING_RULES;
    const moreText = options?.moreText ?? "(MORE)";
    const contdSuffix = options?.contdSuffix ?? " (CONT'D)";
    const includeFirstPageHeader = options?.includeFirstPageHeader ?? false;
    const contdSetting = options?.contdSetting ?? "on";
    if (blocks.length === 0) {
      return {
        pages: [],
        totalPages: 0,
        totalUsedSlots: 0,
        diagnostics: {
          hasOverflow: false,
          unfittedBlockIds: [],
          pageCount: 0,
          totalUsedSlots: 0,
          dialogueSplitsCount: 0,
          orphanPreventedCount: 0
        },
        blockPageMap: /* @__PURE__ */ new Map()
      };
    }
    const preparedBlocks = this.prepareBlocks(blocks, profile, options?.textLayoutService);
    if (preparedBlocks.length === 0) {
      return {
        pages: [],
        totalPages: 0,
        totalUsedSlots: 0,
        diagnostics: {
          hasOverflow: false,
          unfittedBlockIds: [],
          pageCount: 0,
          totalUsedSlots: 0,
          dialogueSplitsCount: 0,
          orphanPreventedCount: 0
        },
        blockPageMap: /* @__PURE__ */ new Map()
      };
    }
    const pages = [];
    const blockPageMap = /* @__PURE__ */ new Map();
    let currentSlots = [];
    let currentHeightPt = 0;
    let prevBlockType = null;
    let prevBlockTypeBeforeCue = null;
    const recordBlockPage = (blockId, pageNum) => {
      let set = blockPageMap.get(blockId);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        blockPageMap.set(blockId, set);
      }
      set.add(pageNum);
    };
    const finalizeCurrentPage = () => {
      if (currentSlots.length === 0) return;
      const pageIndex = pages.length;
      const pageNumber = pageIndex + 1;
      const hasHeader = pageNumber > 1 || includeFirstPageHeader;
      pages.push({
        pageIndex,
        pageNumber,
        profile,
        slots: [...currentSlots],
        usedSlots: currentSlots.length,
        remainingSlots: Math.max(0, profile.slotCapacity - currentSlots.length),
        isFinalPage: false,
        hasHeader,
        headerText: hasHeader ? `${pageNumber}.` : void 0
      });
      currentSlots = [];
      currentHeightPt = 0;
      prevBlockType = null;
    };
    let dialogueSplitsCount = 0;
    let orphanPreventedCount = 0;
    let hasOverflow = false;
    const unfittedBlockIds = [];
    let currentSpeakerName = "";
    for (let bIdx = 0; bIdx < preparedBlocks.length; bIdx++) {
      const block = preparedBlocks[bIdx];
      const nextBlock = preparedBlocks[bIdx + 1];
      const isTop = currentSlots.length === 0;
      let marginAbovePt = calculateCollapsedMarginPt(prevBlockType, block.type, isTop);
      if (block.type === "scene_heading" || block.type === "shot") {
        currentSpeakerName = "";
        const minFollow = block.type === "scene_heading" ? spacing.sceneHeading.minLinesFollow : spacing.shot.minLinesFollow;
        const nextMarginPt = nextBlock ? calculateCollapsedMarginPt("scene_heading", nextBlock.type, false) : 0;
        const minNextLines = nextBlock ? Math.min(minFollow, Math.max(1, nextBlock.lines.length)) : 0;
        const headingLinesCount = Math.max(1, block.lines.length);
        const neededPt = marginAbovePt + headingLinesCount * profile.linePitchPt + nextMarginPt + minNextLines * profile.linePitchPt;
        if (currentSlots.length > 0 && currentHeightPt + neededPt > profile.printableHeightPt + TOLERANCE_PT) {
          orphanPreventedCount++;
          finalizeCurrentPage();
          marginAbovePt = calculateCollapsedMarginPt(null, block.type, true);
        }
        if (marginAbovePt > 0) {
          currentSlots.push({
            blockId: block.id,
            blockType: block.type,
            slotIndex: currentSlots.length,
            kind: "blank_line",
            presentationText: "",
            isPresentationOnly: true
          });
          currentHeightPt += marginAbovePt;
        }
        for (const line of block.lines) {
          currentSlots.push({
            blockId: block.id,
            blockType: block.type,
            slotIndex: currentSlots.length,
            kind: "text",
            line,
            sourceStartOffset: line.sourceStartOffset,
            sourceEndOffset: line.sourceEndOffset,
            isPresentationOnly: false
          });
          currentHeightPt += profile.linePitchPt;
        }
        recordBlockPage(block.id, pages.length + 1);
        prevBlockType = block.type;
        continue;
      }
      if (block.type === "character") {
        currentSpeakerName = block.characterName || normalizeCharacterName(block.text) || block.text.trim();
        const cueLinesCount = block.lines.length;
        if (cueLinesCount > 0) {
          let minFollowLines = 1;
          if (nextBlock && nextBlock.type === "parenthetical") {
            minFollowLines = 2;
          } else if (nextBlock && nextBlock.type === "dialogue") {
            minFollowLines = 1;
          }
          const nextMarginPt = 0;
          const neededPt = marginAbovePt + cueLinesCount * profile.linePitchPt + nextMarginPt + minFollowLines * profile.linePitchPt;
          if (currentSlots.length > 0 && currentHeightPt + neededPt > profile.printableHeightPt + TOLERANCE_PT) {
            orphanPreventedCount++;
            finalizeCurrentPage();
            marginAbovePt = 0;
          }
          if (marginAbovePt > 0) {
            currentSlots.push({
              blockId: block.id,
              blockType: block.type,
              slotIndex: currentSlots.length,
              kind: "blank_line",
              presentationText: "",
              isPresentationOnly: true
            });
            currentHeightPt += marginAbovePt;
          }
          prevBlockTypeBeforeCue = prevBlockType;
          for (const line of block.lines) {
            currentSlots.push({
              blockId: block.id,
              blockType: block.type,
              slotIndex: currentSlots.length,
              kind: "text",
              line,
              sourceStartOffset: line.sourceStartOffset,
              sourceEndOffset: line.sourceEndOffset,
              isPresentationOnly: false
            });
            currentHeightPt += profile.linePitchPt;
          }
        } else {
          const neededPt = marginAbovePt;
          if (currentSlots.length > 0 && currentHeightPt + neededPt > profile.printableHeightPt + TOLERANCE_PT) {
            finalizeCurrentPage();
            marginAbovePt = 0;
          }
          if (marginAbovePt > 0) {
            currentSlots.push({
              blockId: block.id,
              blockType: block.type,
              slotIndex: currentSlots.length,
              kind: "blank_line",
              presentationText: "",
              isPresentationOnly: true
            });
            currentHeightPt += marginAbovePt;
          }
        }
        recordBlockPage(block.id, pages.length + 1);
        prevBlockType = block.type;
        continue;
      }
      if (block.type === "parenthetical") {
        const parenLinesCount = Math.max(1, block.lines.length);
        const neededPt = marginAbovePt + parenLinesCount * profile.linePitchPt + 1 * profile.linePitchPt;
        if (currentSlots.length > 0 && currentHeightPt + neededPt > profile.printableHeightPt + TOLERANCE_PT) {
          orphanPreventedCount++;
          const lastSlot = currentSlots[currentSlots.length - 1];
          if (lastSlot && lastSlot.blockType === "character") {
            const poppedCue = currentSlots.pop();
            currentHeightPt -= profile.linePitchPt;
            if (currentSlots.length > 0 && currentSlots[currentSlots.length - 1].kind === "blank_line" && currentSlots[currentSlots.length - 1].blockId === poppedCue.blockId) {
              currentSlots.pop();
              const cueMargin = calculateCollapsedMarginPt(prevBlockTypeBeforeCue, "character", false);
              currentHeightPt -= cueMargin;
            }
            finalizeCurrentPage();
            currentSlots.push({ ...poppedCue, slotIndex: currentSlots.length });
            currentHeightPt += profile.linePitchPt;
            recordBlockPage(poppedCue.blockId, pages.length + 1);
            marginAbovePt = 0;
          } else {
            finalizeCurrentPage();
            marginAbovePt = 0;
          }
        }
        if (marginAbovePt > 0) {
          currentSlots.push({
            blockId: block.id,
            blockType: block.type,
            slotIndex: currentSlots.length,
            kind: "blank_line",
            presentationText: "",
            isPresentationOnly: true
          });
          currentHeightPt += marginAbovePt;
        }
        for (const line of block.lines) {
          currentSlots.push({
            blockId: block.id,
            blockType: block.type,
            slotIndex: currentSlots.length,
            kind: "text",
            line,
            sourceStartOffset: line.sourceStartOffset,
            sourceEndOffset: line.sourceEndOffset,
            isPresentationOnly: false
          });
          currentHeightPt += profile.linePitchPt;
        }
        recordBlockPage(block.id, pages.length + 1);
        prevBlockType = block.type;
        continue;
      }
      if (block.type === "dialogue") {
        const blockLines = block.lines;
        if (blockLines.length === 0) {
          recordBlockPage(block.id, pages.length + 1);
          prevBlockType = block.type;
          continue;
        }
        let dLineIdx = 0;
        while (dLineIdx < blockLines.length) {
          const isCurrentTop = currentSlots.length === 0;
          const currentMarginPt = dLineIdx === 0 ? calculateCollapsedMarginPt(prevBlockType, "dialogue", isCurrentTop) : 0;
          const remainingLinesCount = blockLines.length - dLineIdx;
          const fullNeededPt = currentMarginPt + remainingLinesCount * profile.linePitchPt;
          if (currentHeightPt + fullNeededPt <= profile.printableHeightPt + TOLERANCE_PT) {
            if (currentMarginPt > 0) {
              currentSlots.push({
                blockId: block.id,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: "blank_line",
                presentationText: "",
                isPresentationOnly: true
              });
              currentHeightPt += currentMarginPt;
            }
            while (dLineIdx < blockLines.length) {
              const line = blockLines[dLineIdx];
              currentSlots.push({
                blockId: block.id,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: "text",
                line,
                sourceStartOffset: line.sourceStartOffset,
                sourceEndOffset: line.sourceEndOffset,
                isPresentationOnly: false
              });
              currentHeightPt += profile.linePitchPt;
              recordBlockPage(block.id, pages.length + 1);
              dLineIdx++;
            }
          } else {
            const availHeightPt = profile.printableHeightPt + TOLERANCE_PT - (currentHeightPt + currentMarginPt);
            const linesAvail = Math.floor(availHeightPt / profile.linePitchPt);
            const minSplitBefore = spacing.dialogue.minSplitBefore;
            const minSplitAfter = spacing.dialogue.minSplitAfter;
            const canSplit = linesAvail >= minSplitBefore + 1 && remainingLinesCount - (linesAvail - 1) >= minSplitAfter;
            if (canSplit) {
              if (currentMarginPt > 0) {
                currentSlots.push({
                  blockId: block.id,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: "blank_line",
                  presentationText: "",
                  isPresentationOnly: true
                });
                currentHeightPt += currentMarginPt;
              }
              const linesToTake = linesAvail - 1;
              for (let i = 0; i < linesToTake; i++) {
                const line = blockLines[dLineIdx];
                currentSlots.push({
                  blockId: block.id,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: "text",
                  line,
                  sourceStartOffset: line.sourceStartOffset,
                  sourceEndOffset: line.sourceEndOffset,
                  isPresentationOnly: false
                });
                currentHeightPt += profile.linePitchPt;
                recordBlockPage(block.id, pages.length + 1);
                dLineIdx++;
              }
              currentSlots.push({
                blockId: `${block.id}-more`,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: "more",
                presentationText: moreText,
                isPresentationOnly: true
              });
              currentHeightPt += profile.linePitchPt;
              dialogueSplitsCount++;
              finalizeCurrentPage();
              if (contdSetting !== "off") {
                const contdSpeaker = currentSpeakerName || "CHARACTER";
                currentSlots.push({
                  blockId: `${block.id}-contd`,
                  blockType: "character",
                  slotIndex: currentSlots.length,
                  kind: "contd",
                  presentationText: `${contdSpeaker}${contdSuffix}`,
                  isPresentationOnly: true
                });
                currentHeightPt += profile.linePitchPt;
              }
            } else {
              if (currentSlots.length > 0) {
                const itemsToMove = [];
                while (currentSlots.length > 0 && (currentSlots[currentSlots.length - 1].blockType === "parenthetical" || currentSlots[currentSlots.length - 1].blockType === "character" || currentSlots[currentSlots.length - 1].kind === "blank_line")) {
                  const item = currentSlots.pop();
                  if (item.kind !== "blank_line") {
                    itemsToMove.unshift(item);
                  }
                }
                orphanPreventedCount++;
                finalizeCurrentPage();
                for (const item of itemsToMove) {
                  currentSlots.push({
                    ...item,
                    slotIndex: currentSlots.length
                  });
                  currentHeightPt += profile.linePitchPt;
                  recordBlockPage(item.blockId, pages.length + 1);
                }
              } else {
                finalizeCurrentPage();
              }
            }
          }
        }
        prevBlockType = block.type;
        continue;
      }
      {
        const blockLines = block.lines;
        if (blockLines.length === 0) {
          recordBlockPage(block.id, pages.length + 1);
          prevBlockType = block.type;
          continue;
        }
        let lIdx = 0;
        while (lIdx < blockLines.length) {
          const isCurrentTop = currentSlots.length === 0;
          const currentMarginPt = lIdx === 0 ? calculateCollapsedMarginPt(prevBlockType, block.type, isCurrentTop) : 0;
          const remainingLinesCount = blockLines.length - lIdx;
          const fullNeededPt = currentMarginPt + remainingLinesCount * profile.linePitchPt;
          if (currentHeightPt + fullNeededPt <= profile.printableHeightPt + TOLERANCE_PT) {
            if (currentMarginPt > 0) {
              currentSlots.push({
                blockId: block.id,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: "blank_line",
                presentationText: "",
                isPresentationOnly: true
              });
              currentHeightPt += currentMarginPt;
            }
            while (lIdx < blockLines.length) {
              const line = blockLines[lIdx];
              currentSlots.push({
                blockId: block.id,
                blockType: block.type,
                slotIndex: currentSlots.length,
                kind: "text",
                line,
                sourceStartOffset: line.sourceStartOffset,
                sourceEndOffset: line.sourceEndOffset,
                isPresentationOnly: false
              });
              currentHeightPt += profile.linePitchPt;
              recordBlockPage(block.id, pages.length + 1);
              lIdx++;
            }
          } else {
            const availHeightPt = profile.printableHeightPt + TOLERANCE_PT - (currentHeightPt + currentMarginPt);
            const linesAvail = Math.floor(availHeightPt / profile.linePitchPt);
            if (linesAvail >= 1 && remainingLinesCount - linesAvail >= 1) {
              if (currentMarginPt > 0) {
                currentSlots.push({
                  blockId: block.id,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: "blank_line",
                  presentationText: "",
                  isPresentationOnly: true
                });
                currentHeightPt += currentMarginPt;
              }
              for (let i = 0; i < linesAvail; i++) {
                const line = blockLines[lIdx];
                currentSlots.push({
                  blockId: block.id,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: "text",
                  line,
                  sourceStartOffset: line.sourceStartOffset,
                  sourceEndOffset: line.sourceEndOffset,
                  isPresentationOnly: false
                });
                currentHeightPt += profile.linePitchPt;
                recordBlockPage(block.id, pages.length + 1);
                lIdx++;
              }
              finalizeCurrentPage();
            } else {
              if (currentSlots.length > 0) {
                finalizeCurrentPage();
              } else {
                const line = blockLines[lIdx];
                currentSlots.push({
                  blockId: block.id,
                  blockType: block.type,
                  slotIndex: currentSlots.length,
                  kind: "text",
                  line,
                  sourceStartOffset: line.sourceStartOffset,
                  sourceEndOffset: line.sourceEndOffset,
                  isPresentationOnly: false
                });
                currentHeightPt += profile.linePitchPt;
                recordBlockPage(block.id, pages.length + 1);
                lIdx++;
              }
            }
          }
        }
        prevBlockType = block.type;
        continue;
      }
    }
    if (currentSlots.length > 0) {
      finalizeCurrentPage();
    }
    if (pages.length > 0) {
      pages[pages.length - 1].isFinalPage = true;
    }
    const finalBlockPageMap = /* @__PURE__ */ new Map();
    for (const page of pages) {
      for (const slot of page.slots) {
        if (!slot.blockId) continue;
        const rawBlockId = slot.blockId.replace(/-(more|contd)$/, "");
        let arr = finalBlockPageMap.get(rawBlockId);
        if (!arr) {
          arr = [];
          finalBlockPageMap.set(rawBlockId, arr);
        }
        if (!arr.includes(page.pageNumber)) {
          arr.push(page.pageNumber);
        }
      }
    }
    for (const [id, set] of blockPageMap.entries()) {
      if (!finalBlockPageMap.has(id)) {
        finalBlockPageMap.set(id, Array.from(set));
      }
    }
    let totalUsedSlots = 0;
    for (const p of pages) {
      totalUsedSlots += p.usedSlots;
    }
    return {
      pages,
      totalPages: pages.length,
      totalUsedSlots,
      diagnostics: {
        hasOverflow,
        unfittedBlockIds,
        pageCount: pages.length,
        totalUsedSlots,
        dialogueSplitsCount,
        orphanPreventedCount
      },
      blockPageMap: finalBlockPageMap
    };
  }
  /**
   * Prepares and lays out input blocks.
   * If a block already has lines, uses them. Otherwise, uses textLayoutService.
   */
  prepareBlocks(blocks, profile, layoutService) {
    return blocks.map((b) => {
      if (b.lines && b.lines.length > 0) {
        return {
          id: b.id,
          type: b.type,
          text: b.text,
          lines: b.lines,
          characterName: b.characterName
        };
      }
      if (!layoutService) {
        const singleLine = {
          text: b.text,
          sourceStartOffset: 0,
          sourceEndOffset: b.text.length,
          measuredWidthPt: profile.printableWidthPt,
          fullWidthPt: profile.printableWidthPt,
          isOverflow: false,
          breakReason: "end"
        };
        return {
          id: b.id,
          type: b.type,
          text: b.text,
          lines: b.text.length > 0 ? [singleLine] : [],
          characterName: b.characterName
        };
      }
      const availableWidthPt = this.getElementPrintableWidth(b.type, profile.printableWidthPt);
      const constraints = {
        availableWidthPt,
        fontSizePt: 12,
        bold: b.type === "scene_heading" || b.type === "character" || b.type === "shot"
      };
      const result = layoutService.layoutText(b.text, constraints);
      return {
        id: b.id,
        type: b.type,
        text: b.text,
        lines: b.text.length > 0 ? result.lines : [],
        characterName: b.characterName
      };
    });
  }
  /**
   * Resolves printable width for different screenplay block types.
   */
  getElementPrintableWidth(type, printableWidthPt) {
    switch (type) {
      case "character":
        return Math.max(100, printableWidthPt - 158.4);
      case "parenthetical":
        return Math.min(216, Math.max(100, printableWidthPt - 115.2));
      case "dialogue":
        return Math.min(252, Math.max(100, printableWidthPt - 72));
      case "transition":
        return Math.max(80, printableWidthPt - 324);
      case "scene_heading":
      case "action":
      case "shot":
      default:
        return printableWidthPt;
    }
  }
};
function createPaginationEngine() {
  return new PaginationEngine();
}

// src/core/layout/paginationAdapter.ts
var KNOWN_SCREENPLAY_BLOCK_TYPES = /* @__PURE__ */ new Set([
  "scene-heading",
  "scene_heading",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot"
]);
function draftToLayoutBlocks(draft) {
  if (!draft || !Array.isArray(draft.blocks)) {
    return [];
  }
  return draft.blocks.filter((b) => KNOWN_SCREENPLAY_BLOCK_TYPES.has(b.type)).map((b) => {
    const characterName = b.type === "character" ? normalizeCharacterName(b.text) || b.text.trim() : void 0;
    return {
      id: b.id,
      type: b.type,
      text: b.text || "",
      characterName
    };
  });
}

// src/core/layout/textLayoutService.ts
var TextLayoutService = class {
  constructor(fontMetrics) {
    this.fontMetrics = fontMetrics;
    if (!fontMetrics) {
      throw new Error("TextLayoutService: a valid IFontMetricsProvider must be supplied");
    }
  }
  /**
   * Formats and wraps text within available width constraints.
   * Preserves exact source characters and contiguous UTF-16 offsets.
   */
  layoutText(text, constraints) {
    if (typeof text !== "string") {
      throw new Error(`layoutText: expected string text, received ${typeof text}`);
    }
    if (!constraints || typeof constraints !== "object") {
      throw new Error("layoutText: layout constraints object is required");
    }
    const {
      availableWidthPt,
      fontSizePt = 12,
      bold = false,
      italic = false,
      tabWidthPt,
      overflowPolicy = "break-word",
      locale = "pa"
    } = constraints;
    if (!Number.isFinite(availableWidthPt) || availableWidthPt <= 0 || Number.isNaN(availableWidthPt)) {
      throw new Error(`layoutText: availableWidthPt must be a positive finite number, received ${availableWidthPt}`);
    }
    if (!Number.isFinite(fontSizePt) || fontSizePt <= 0 || Number.isNaN(fontSizePt)) {
      throw new Error(`layoutText: fontSizePt must be a positive finite number, received ${fontSizePt}`);
    }
    const lineBox = this.fontMetrics.getLineBoxMetrics(fontSizePt);
    const lineHeightPt = lineBox.lineBoxHeightPt;
    const domResult = this.layoutViaDom(text, availableWidthPt, lineHeightPt, bold);
    if (domResult) {
      return domResult;
    }
    const spaceWidth = this.fontMetrics.measureWidth(" ", fontSizePt, bold, italic);
    const resolvedTabStopPt = tabWidthPt && tabWidthPt > 0 ? tabWidthPt : Math.max(36, spaceWidth * 4);
    const measure = (str) => {
      return this.measureStringWithTabs(str, fontSizePt, bold, italic, resolvedTabStopPt);
    };
    if (text.length === 0) {
      const singleEmptyLine = {
        text: "",
        sourceStartOffset: 0,
        sourceEndOffset: 0,
        measuredWidthPt: 0,
        fullWidthPt: 0,
        isOverflow: false,
        breakReason: "end"
      };
      return {
        lines: [singleEmptyLine],
        totalLineCount: 1,
        maxLineWidthPt: 0,
        lineHeightPt,
        totalMeasuredHeightPt: lineHeightPt,
        diagnostics: {
          hasOverflow: false,
          unbreakableTokens: []
        }
      };
    }
    const paragraphs = this.splitIntoParagraphs(text);
    const allLines = [];
    const diagnostics = {
      hasOverflow: false,
      unbreakableTokens: []
    };
    let globalOffset = 0;
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const isLastParagraph = pIdx === paragraphs.length - 1;
      const paraLines = this.layoutSingleParagraph(
        para.content,
        para.newline,
        globalOffset,
        measure,
        availableWidthPt,
        overflowPolicy,
        locale,
        isLastParagraph,
        diagnostics
      );
      for (const line of paraLines) {
        allLines.push(line);
      }
      globalOffset = para.endOffset;
    }
    let maxLineWidthPt = 0;
    for (const l of allLines) {
      if (l.measuredWidthPt > maxLineWidthPt) {
        maxLineWidthPt = l.measuredWidthPt;
      }
    }
    return {
      lines: allLines,
      totalLineCount: allLines.length,
      maxLineWidthPt: Number(maxLineWidthPt.toFixed(4)),
      lineHeightPt: Number(lineHeightPt.toFixed(4)),
      totalMeasuredHeightPt: Number((allLines.length * lineHeightPt).toFixed(4)),
      diagnostics
    };
  }
  /**
   * Measures and lays out text lines in a hidden DOM element with exact editor CSS,
   * using Range.getClientRects() for true browser line wrapping.
   */
  layoutViaDom(text, availableWidthPt, lineHeightPt, bold) {
    if (typeof document === "undefined" || typeof document.createElement !== "function" || typeof Range === "undefined") {
      return null;
    }
    if (text.length === 0) {
      return {
        lines: [
          {
            text: "",
            sourceStartOffset: 0,
            sourceEndOffset: 0,
            measuredWidthPt: 0,
            fullWidthPt: 0,
            isOverflow: false,
            breakReason: "end"
          }
        ],
        totalLineCount: 1,
        maxLineWidthPt: 0,
        lineHeightPt,
        totalMeasuredHeightPt: lineHeightPt,
        diagnostics: { hasOverflow: false, unbreakableTokens: [] }
      };
    }
    let container = document.getElementById("akhar-dom-layout-measure-root");
    if (!container) {
      container = document.createElement("div");
      container.id = "akhar-dom-layout-measure-root";
      container.style.position = "fixed";
      container.style.top = "-99999px";
      container.style.left = "-99999px";
      container.style.visibility = "hidden";
      container.style.pointerEvents = "none";
      container.style.zIndex = "-9999";
      if (document.body) {
        document.body.appendChild(container);
      } else {
        document.documentElement.appendChild(container);
      }
    }
    const widthPx = availableWidthPt * (96 / 72);
    const div = document.createElement("div");
    div.style.width = `${widthPx}px`;
    div.style.fontFamily = CANONICAL_FONT_STACK;
    div.style.fontSize = `${FONT_SIZE_PX}px`;
    div.style.lineHeight = `${LINE_PITCH_PX}px`;
    div.style.textRendering = CANONICAL_TEXT_RENDERING;
    div.style.fontKerning = CANONICAL_FONT_KERNING;
    div.style.fontFeatureSettings = CANONICAL_FONT_FEATURE_SETTINGS;
    div.style.webkitFontSmoothing = CANONICAL_WEBKIT_FONT_SMOOTHING;
    div.style.whiteSpace = "pre-wrap";
    div.style.wordWrap = "break-word";
    div.style.overflowWrap = "break-word";
    div.style.margin = "0";
    div.style.padding = "0";
    div.style.border = "none";
    div.style.boxSizing = "border-box";
    if (bold) {
      div.style.fontWeight = "bold";
    }
    div.textContent = text;
    container.appendChild(div);
    try {
      const textNode = div.firstChild;
      if (!textNode) {
        return null;
      }
      const lines = [];
      let lineStart = 0;
      let lastTop = null;
      let isSupported = false;
      for (let i = 1; i <= text.length; i++) {
        if (text[i - 1] === "\n") {
          const lineStr = text.slice(lineStart, i);
          lines.push({
            text: lineStr,
            sourceStartOffset: lineStart,
            sourceEndOffset: i,
            measuredWidthPt: availableWidthPt,
            fullWidthPt: availableWidthPt,
            isOverflow: false,
            breakReason: "newline"
          });
          lineStart = i;
          lastTop = null;
          continue;
        }
        const r = document.createRange();
        r.setStart(textNode, i - 1);
        r.setEnd(textNode, i);
        const crs = r.getClientRects();
        if (crs.length > 0) {
          isSupported = true;
          const cr = crs[0];
          if (lastTop === null) {
            lastTop = cr.top;
          } else if (Math.abs(cr.top - lastTop) > 4) {
            const lineStr = text.slice(lineStart, i - 1);
            lines.push({
              text: lineStr,
              sourceStartOffset: lineStart,
              sourceEndOffset: i - 1,
              measuredWidthPt: availableWidthPt,
              fullWidthPt: availableWidthPt,
              isOverflow: false,
              breakReason: "wrap"
            });
            lineStart = i - 1;
            lastTop = cr.top;
          }
        }
      }
      if (!isSupported) {
        return null;
      }
      if (lineStart <= text.length) {
        const lineStr = text.slice(lineStart);
        lines.push({
          text: lineStr,
          sourceStartOffset: lineStart,
          sourceEndOffset: text.length,
          measuredWidthPt: availableWidthPt,
          fullWidthPt: availableWidthPt,
          isOverflow: false,
          breakReason: "end"
        });
      }
      return {
        lines,
        totalLineCount: lines.length,
        maxLineWidthPt: availableWidthPt,
        lineHeightPt,
        totalMeasuredHeightPt: lines.length * lineHeightPt,
        diagnostics: { hasOverflow: false, unbreakableTokens: [] }
      };
    } finally {
      container.removeChild(div);
    }
  }
  /**
   * Splits input text into paragraphs, preserving exact newline character sequences.
   */
  splitIntoParagraphs(text) {
    const paras = [];
    let start = 0;
    const len = text.length;
    let i = 0;
    while (i < len) {
      if (text[i] === "\r" && i + 1 < len && text[i + 1] === "\n") {
        paras.push({
          content: text.slice(start, i),
          newline: "\r\n",
          startOffset: start,
          endOffset: i + 2
        });
        start = i + 2;
        i += 2;
      } else if (text[i] === "\n" || text[i] === "\r") {
        const nl = text[i];
        paras.push({
          content: text.slice(start, i),
          newline: nl,
          startOffset: start,
          endOffset: i + 1
        });
        start = i + 1;
        i += 1;
      } else {
        i++;
      }
    }
    if (start < len || paras.length > 0) {
      paras.push({
        content: text.slice(start, len),
        newline: "",
        startOffset: start,
        endOffset: len
      });
    }
    return paras;
  }
  /**
   * Lays out a single paragraph of text (without internal newlines).
   */
  layoutSingleParagraph(content, newline, startOffset, measure, availableWidthPt, overflowPolicy, locale, isLastParagraph, diagnostics) {
    const lines = [];
    let currentOffset = startOffset;
    const commitLine = (lineChunks, reason, isOverflow = false, appendNewline = "", clippedPresentation) => {
      const rawText = lineChunks.join("") + appendNewline;
      const lineStart = currentOffset;
      const lineEnd = lineStart + rawText.length;
      currentOffset = lineEnd;
      const match = rawText.match(/^(.*?)(\s*)$/s);
      const visibleText = match ? match[1] : rawText;
      const measuredWidth = visibleText.length > 0 ? measure(visibleText) : 0;
      const fullWidth = rawText.length > 0 ? measure(rawText) : 0;
      const lineIsOverflow = isOverflow || measuredWidth > availableWidthPt;
      if (lineIsOverflow) {
        diagnostics.hasOverflow = true;
      }
      const line = {
        text: rawText,
        sourceStartOffset: lineStart,
        sourceEndOffset: lineEnd,
        measuredWidthPt: Number(measuredWidth.toFixed(4)),
        fullWidthPt: Number(fullWidth.toFixed(4)),
        isOverflow: lineIsOverflow,
        breakReason: reason
      };
      if (clippedPresentation) {
        line.clippedPresentation = clippedPresentation;
      }
      lines.push(line);
    };
    if (content.length === 0) {
      commitLine([], newline ? "newline" : isLastParagraph ? "end" : "newline", false, newline);
      return lines;
    }
    const chunks = this.tokenizeIntoChunks(content, locale);
    const getVisibleWidth = (chunkList) => {
      const joined = chunkList.join("");
      const match = joined.match(/^(.*?)(\s*)$/s);
      const visible = match ? match[1] : joined;
      return visible.length > 0 ? measure(visible) : 0;
    };
    let currentLineChunks = [];
    for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
      const chunk = chunks[cIdx];
      const candidateChunks = [...currentLineChunks, chunk];
      const candidateWidth = getVisibleWidth(candidateChunks);
      if (candidateWidth <= availableWidthPt || currentLineChunks.length === 0) {
        if (candidateWidth <= availableWidthPt) {
          currentLineChunks.push(chunk);
        } else {
          diagnostics.unbreakableTokens.push(chunk.trim());
          if (overflowPolicy === "break-word") {
            this.breakChunkByGraphemes(
              chunk,
              locale,
              measure,
              availableWidthPt,
              commitLine,
              (remainingChunk) => {
                currentLineChunks = [remainingChunk];
              }
            );
          } else if (overflowPolicy === "overflow") {
            commitLine([chunk], "overflow", true);
            currentLineChunks = [];
          } else {
            this.clipChunkByGraphemes(chunk, locale, measure, availableWidthPt, commitLine);
            currentLineChunks = [];
          }
        }
      } else {
        commitLine(currentLineChunks, "wrap", false);
        currentLineChunks = [];
        cIdx--;
      }
    }
    if (currentLineChunks.length > 0) {
      const finalReason = newline ? "newline" : isLastParagraph ? "end" : "wrap";
      commitLine(currentLineChunks, finalReason, false, newline);
    } else if (newline) {
      commitLine([], "newline", false, newline);
    }
    return lines;
  }
  /**
   * Tokenizes paragraph content into atomic layout chunks.
   * Glues trailing punctuation and whitespace to words, allowing breaks after hyphens or whitespace.
   */
  tokenizeIntoChunks(text, locale) {
    const chunks = [];
    const seg = new Intl.Segmenter(locale, { granularity: "word" });
    const segments = Array.from(seg.segment(text));
    let currentChunk = "";
    for (let i = 0; i < segments.length; i++) {
      const str = segments[i].segment;
      const hasSpace = /[\s\u00A0]/.test(str);
      const hasHyphen = str === "-" || str === "\u2014" || str === "\u2013";
      currentChunk += str;
      if (hasSpace || hasHyphen || i === segments.length - 1) {
        const next = segments[i + 1];
        if (next && !next.isWordLike && !/[\s\u00A0]/.test(next.segment) && !hasSpace) {
          continue;
        }
        chunks.push(currentChunk);
        currentChunk = "";
      }
    }
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    return chunks;
  }
  /**
   * Breaks an oversized token using Unicode Grapheme Clusters under 'break-word'.
   * Never splits a grapheme cluster. Guarantees forward progress on every line,
   * even when a single grapheme cluster exceeds availableWidthPt.
   */
  breakChunkByGraphemes(chunk, locale, measure, availableWidthPt, commitLine, onRemaining) {
    const match = chunk.match(/^(.*?)(\s+)$/s);
    const core = match ? match[1] : chunk;
    const trailing = match ? match[2] : "";
    const seg = new Intl.Segmenter(locale, { granularity: "grapheme" });
    const graphemes = Array.from(seg.segment(core)).map((s) => s.segment);
    let curGraphemes = [];
    for (let gIdx = 0; gIdx < graphemes.length; gIdx++) {
      const g = graphemes[gIdx];
      const testList = [...curGraphemes, g];
      const testWidth = measure(testList.join(""));
      if (testWidth <= availableWidthPt || curGraphemes.length === 0) {
        curGraphemes.push(g);
      } else {
        const curWidth = measure(curGraphemes.join(""));
        commitLine([curGraphemes.join("")], "wrap", curWidth > availableWidthPt);
        curGraphemes = [g];
      }
    }
    if (curGraphemes.length > 0) {
      onRemaining(curGraphemes.join("") + trailing);
    } else if (trailing.length > 0) {
      onRemaining(trailing);
    }
  }
  /**
   * Calculates presentation clipping metadata for an oversized token under 'clip' policy.
   * CRITICAL INVARIANT: The complete chunk is preserved in the LayoutLine, ensuring
   * 100% exact source reconstruction and contiguous offsets. Clipping is strictly
   * represented as presentation metadata.
   */
  clipChunkByGraphemes(chunk, locale, measure, availableWidthPt, commitLine) {
    const seg = new Intl.Segmenter(locale, { granularity: "grapheme" });
    const graphemes = Array.from(seg.segment(chunk)).map((s) => s.segment);
    const fitted = [];
    for (const g of graphemes) {
      const testList = [...fitted, g];
      if (measure(testList.join("")) <= availableWidthPt || fitted.length === 0) {
        fitted.push(g);
      } else {
        break;
      }
    }
    const visibleText = fitted.join("");
    const visibleWidthPt = Number(measure(visibleText).toFixed(4));
    const clippedPresentation = {
      visibleText,
      visibleLength: visibleText.length,
      visibleWidthPt
    };
    commitLine([chunk], "overflow", true, "", clippedPresentation);
  }
  /**
   * Measures visual advance width of text, calculating physical positions across tab stops.
   */
  measureStringWithTabs(text, fontSizePt, bold, italic, tabStopPt) {
    if (!text.includes("	")) {
      return this.fontMetrics.measureWidth(text, fontSizePt, bold, italic);
    }
    const parts = text.split("	");
    let x = 0;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) {
        x += this.fontMetrics.measureWidth(parts[i], fontSizePt, bold, italic);
      }
      if (i < parts.length - 1) {
        x = (Math.floor(x / tabStopPt) + 1) * tabStopPt;
      }
    }
    return Number(x.toFixed(4));
  }
};
function createTextLayoutService(fontMetrics) {
  return new TextLayoutService(fontMetrics);
}

// src/core/layout/fontMetrics.ts
var EXPECTED_NOTO_SANS_GURMUKHI = {
  family: "Noto Sans Gurmukhi",
  postscriptName: "NotoSansGurmukhi-Regular",
  version: "Version 2.004",
  sha256: "b9b7f20c34d4ab2cda743f4619d08aed9fc05c5f0bb0d39030fcf2bc986dfa0a",
  unitsPerEm: 1e3,
  yMin: -398,
  yMax: 995
};
var EXPECTED_COURIER_PRIME = {
  family: "Courier Prime",
  postscriptName: "CourierPrime-Regular",
  version: "Version 3.018",
  sha256: "72f793376f8e2841656bf21d77a5de010f2929bd6956a22ee848ad0c7eb978af",
  unitsPerEm: 2048,
  yMin: -526,
  yMax: 1827
};
function pointsToPixels(pt) {
  return pt * (96 / 72);
}
function pixelsToPoints(px) {
  return px * (72 / 96);
}
var FontMetricsProvider = class {
  family;
  expectedIdentity;
  status = {
    loaded: false,
    isFallback: false,
    status: "unloaded"
  };
  loadPromise = null;
  canvasContext = null;
  canvasContextAttempted = false;
  customMeasureFn = null;
  fontsTarget = null;
  constructor(options = {}) {
    this.family = options.family || EXPECTED_NOTO_SANS_GURMUKHI.family;
    this.expectedIdentity = options.expectedIdentity || EXPECTED_NOTO_SANS_GURMUKHI;
    this.canvasContext = options.canvasContext || null;
    this.customMeasureFn = options.measureFn || null;
    this.fontsTarget = options.fontsTarget || null;
  }
  /**
   * Returns the current runtime readiness and fallback status.
   */
  getStatus() {
    return { ...this.status };
  }
  /**
   * Ensures the font is registered and ready in Chromium font cache.
   * Awaits document.fonts.ready, tests with document.fonts.check(), and detects fallback.
   * Respects a configurable timeout (default: 3000ms).
   */
  async ensureLoaded(timeoutMs = 3e3) {
    if (this.status.status === "ready") {
      return this.getStatus();
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.status = { ...this.status, status: "loading", error: void 0 };
    this.loadPromise = this.performLoad(timeoutMs).then((res) => {
      this.status = res;
      this.loadPromise = null;
      return this.getStatus();
    }).catch((err) => {
      this.status = {
        loaded: false,
        isFallback: false,
        status: "failed",
        error: err instanceof Error ? err.message : String(err)
      };
      this.loadPromise = null;
      return this.getStatus();
    });
    return this.loadPromise;
  }
  async performLoad(timeoutMs) {
    const fonts = this.resolveFontsTarget();
    if (!fonts) {
      if (this.customMeasureFn || this.canvasContext) {
        return {
          loaded: true,
          isFallback: false,
          status: "ready"
        };
      }
      return {
        loaded: false,
        isFallback: false,
        status: "degraded",
        error: "document.fonts unavailable in current environment; running in headless mode"
      };
    }
    let timer;
    const loadTimeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Font loading timed out after ${timeoutMs}ms for "${this.family}"`));
      }, timeoutMs);
    });
    const fontSpec = `12pt "${this.family}"`;
    try {
      await Promise.race([
        Promise.all([
          fonts.ready,
          fonts.load ? fonts.load(fontSpec) : Promise.resolve()
        ]),
        loadTimeout
      ]);
    } catch (loadErr) {
      return {
        loaded: false,
        isFallback: false,
        status: "failed",
        error: loadErr instanceof Error ? loadErr.message : String(loadErr)
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
    const isFontAvailable = fonts.check ? fonts.check(fontSpec) : true;
    if (!isFontAvailable) {
      return {
        loaded: false,
        isFallback: false,
        status: "failed",
        error: `Font "${this.family}" is not available in document.fonts after loading`
      };
    }
    const isFallback = this.detectFallbackRendering();
    if (isFallback) {
      return {
        loaded: true,
        isFallback: true,
        status: "degraded",
        error: `Browser rendered fallback font instead of "${this.family}"`
      };
    }
    return {
      loaded: true,
      isFallback: false,
      status: "ready",
      availableMetrics: this.inspectAvailableMetrics()
    };
  }
  /**
   * Detects whether Chromium substituted a generic fallback font.
   * Compares the measured advance width of a characteristic Gurmukhi akshara
   * against generic fallback families (e.g. monospace).
   */
  detectFallbackRendering() {
    const ctx = this.getOrCreateContext();
    if (!ctx) return false;
    try {
      const testString = "\u0A15\u0A4D\u0A30\u0A3F\u0A71\u0A2A\u0A3E \u0A38\u0A4D\u0A30\u0A40 \u0A17\u0A41\u0A70\u0A1D\u0A32\u0A3C";
      const sizePx = 16;
      ctx.font = `normal normal ${sizePx}px ${CANONICAL_FONT_STACK}`;
      const targetWidth = ctx.measureText(testString).width;
      ctx.font = `normal normal ${sizePx}px "__AkharNonExistentFallbackFont__", monospace`;
      const fallbackWidth = ctx.measureText(testString).width;
      if (Math.abs(targetWidth - fallbackWidth) < 1e-3 && targetWidth > 0) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  inspectAvailableMetrics() {
    const ctx = this.getOrCreateContext();
    if (!ctx) return { actualBoundingBox: false, fontBoundingBox: false };
    try {
      const metrics = ctx.measureText("M");
      return {
        actualBoundingBox: typeof metrics.actualBoundingBoxAscent === "number",
        fontBoundingBox: typeof metrics.fontBoundingBoxAscent === "number"
      };
    } catch {
      return { actualBoundingBox: false, fontBoundingBox: false };
    }
  }
  /**
   * Measures physical advance width of a text string in points (pt).
   */
  measureWidth(text, fontSizePt = 12, bold = false, italic = false) {
    if (typeof text !== "string") {
      throw new Error(`measureWidth: expected string, received ${typeof text}`);
    }
    if (text.length === 0) {
      return 0;
    }
    if (!Number.isFinite(fontSizePt) || fontSizePt <= 0 || Number.isNaN(fontSizePt)) {
      throw new Error(`measureWidth: invalid fontSizePt (${fontSizePt}). Must be a positive finite number.`);
    }
    if (this.customMeasureFn) {
      const weight2 = bold ? "bold" : "normal";
      const style2 = italic ? "italic" : "normal";
      const fontSpec = `${style2} ${weight2} ${pointsToPixels(fontSizePt)}px "${this.family}"`;
      const widthPt2 = this.customMeasureFn(text, fontSpec);
      if (!Number.isFinite(widthPt2) || Number.isNaN(widthPt2)) {
        throw new Error("Custom measureFn returned non-finite width");
      }
      return widthPt2;
    }
    const ctx = this.getOrCreateContext();
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable for font measurement");
    }
    const weight = bold ? "bold " : "normal ";
    const style = italic ? "italic " : "normal ";
    const sizePx = pointsToPixels(fontSizePt);
    const fontStack = this.family === EXPECTED_NOTO_SANS_GURMUKHI.family || this.family === EXPECTED_COURIER_PRIME.family ? CANONICAL_FONT_STACK : `"${this.family}", ${CANONICAL_FONT_STACK}`;
    ctx.font = `${style}${weight}${sizePx}px ${fontStack}`;
    const metrics = ctx.measureText(text);
    const widthPx = metrics.width;
    if (!Number.isFinite(widthPx) || Number.isNaN(widthPx)) {
      throw new Error("Canvas measureText returned non-finite width");
    }
    const widthPt = pixelsToPoints(widthPx);
    return Number(widthPt.toFixed(4));
  }
  /**
   * Reports line-box metrics (ascent, descent, height) in physical points.
   */
  getLineBoxMetrics(fontSizePt = 12) {
    if (!Number.isFinite(fontSizePt) || fontSizePt <= 0 || Number.isNaN(fontSizePt)) {
      throw new Error(`getLineBoxMetrics: invalid fontSizePt (${fontSizePt}). Must be a positive finite number.`);
    }
    const ctx = this.getOrCreateContext();
    let actualAscentPt;
    let actualDescentPt;
    if (ctx) {
      try {
        const sizePx = pointsToPixels(fontSizePt);
        ctx.font = `normal normal ${sizePx}px "${this.family}", sans-serif`;
        const testMetrics = ctx.measureText("\u0A15\u0A4D\u0A30\u0A3F\u0A71\u0A2A\u0A3E");
        if (typeof testMetrics.actualBoundingBoxAscent === "number") {
          actualAscentPt = Number(pixelsToPoints(testMetrics.actualBoundingBoxAscent).toFixed(4));
        }
        if (typeof testMetrics.actualBoundingBoxDescent === "number") {
          actualDescentPt = Number(pixelsToPoints(testMetrics.actualBoundingBoxDescent).toFixed(4));
        }
      } catch {
      }
    }
    const em = this.expectedIdentity.unitsPerEm || 1e3;
    const fontAscentFraction = (this.expectedIdentity.yMax || 995) / em;
    const fontDescentFraction = Math.abs(this.expectedIdentity.yMin || -398) / em;
    const ascentPt = Number((fontAscentFraction * fontSizePt).toFixed(4));
    const descentPt = Number((fontDescentFraction * fontSizePt).toFixed(4));
    const lineBoxHeightPt = Number((ascentPt + descentPt).toFixed(4));
    return {
      fontSizePt,
      ascentPt,
      descentPt,
      lineBoxHeightPt,
      actualAscentPt,
      actualDescentPt
    };
  }
  /**
   * Reports line-box metrics considering the scripts actually present in the text line.
   * If Gurmukhi glyphs are present, returns the maximum font box of Noto Sans Gurmukhi and Courier Prime.
   * If only Latin / ASCII glyphs are present, returns Courier Prime line box metrics.
   */
  getLineBoxMetricsForText(text, fontSizePt = 12) {
    const hasGurmukhi = /[\u0A00-\u0A7F]/.test(text);
    const emNoto = EXPECTED_NOTO_SANS_GURMUKHI.unitsPerEm || 1e3;
    const notoAscent = (EXPECTED_NOTO_SANS_GURMUKHI.yMax || 995) / emNoto * fontSizePt;
    const notoDescent = Math.abs(EXPECTED_NOTO_SANS_GURMUKHI.yMin || -398) / emNoto * fontSizePt;
    const notoHeight = notoAscent + notoDescent;
    const emCourier = EXPECTED_COURIER_PRIME.unitsPerEm || 2048;
    const courierAscent = (EXPECTED_COURIER_PRIME.yMax || 1827) / emCourier * fontSizePt;
    const courierDescent = Math.abs(EXPECTED_COURIER_PRIME.yMin || -526) / emCourier * fontSizePt;
    const courierHeight = courierAscent + courierDescent;
    if (hasGurmukhi) {
      return {
        fontSizePt,
        ascentPt: Number(Math.max(notoAscent, courierAscent).toFixed(4)),
        descentPt: Number(Math.max(notoDescent, courierDescent).toFixed(4)),
        lineBoxHeightPt: Number(Math.max(notoHeight, courierHeight).toFixed(4))
      };
    }
    return {
      fontSizePt,
      ascentPt: Number(courierAscent.toFixed(4)),
      descentPt: Number(courierDescent.toFixed(4)),
      lineBoxHeightPt: Number(courierHeight.toFixed(4))
    };
  }
  resolveFontsTarget() {
    if (this.fontsTarget) return this.fontsTarget;
    if (typeof document !== "undefined" && document.fonts) {
      return document.fonts;
    }
    return null;
  }
  getOrCreateContext() {
    if (this.canvasContext) return this.canvasContext;
    if (this.canvasContextAttempted) return null;
    if (typeof OffscreenCanvas !== "undefined") {
      try {
        const offscreen = new OffscreenCanvas(400, 200);
        this.canvasContext = offscreen.getContext("2d", { willReadFrequently: true });
        if (this.canvasContext) return this.canvasContext;
      } catch {
      }
    }
    if (typeof document !== "undefined" && typeof document.createElement === "function") {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 200;
        this.canvasContext = canvas.getContext("2d", { willReadFrequently: true });
        if (this.canvasContext) return this.canvasContext;
      } catch {
      }
    }
    this.canvasContextAttempted = true;
    return null;
  }
};
var defaultGurmukhiProvider = null;
function getGurmukhiFontMetricsProvider(options) {
  if (!defaultGurmukhiProvider || options) {
    const provider = new FontMetricsProvider(options);
    if (!options) defaultGurmukhiProvider = provider;
    return provider;
  }
  return defaultGurmukhiProvider;
}

// src/core/export/pdfExporter.ts
function getPageGeometry(paperSize) {
  if (paperSize === "a4") {
    return {
      paperSize: "a4",
      width: "210mm",
      height: "297mm",
      marginTop: "25.4mm",
      // 1.0 in
      marginRight: "25.4mm",
      // 1.0 in
      marginBottom: "25.4mm",
      // 1.0 in
      marginLeft: "38.1mm",
      // 1.5 in
      printableWidth: "146.5mm"
      // 210 - 38.1 - 25.4 = 146.5mm (~5.77 in)
    };
  }
  return {
    paperSize: "letter",
    width: "8.5in",
    height: "11in",
    marginTop: "1.0in",
    marginRight: "1.0in",
    marginBottom: "1.0in",
    marginLeft: "1.5in",
    printableWidth: "6.0in"
    // 8.5 - 1.5 - 1.0 = 6.0 in
  };
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function getBlockCssClass(type) {
  switch (type) {
    case "scene_heading":
      return "scene-heading";
    case "action":
      return "action";
    case "character":
      return "character";
    case "parenthetical":
      return "parenthetical";
    case "dialogue":
      return "dialogue";
    case "transition":
      return "transition";
    case "shot":
      return "shot";
    default:
      return "action";
  }
}
function generateUnifiedScreenplayPdfHtml(draft, metadata, options) {
  const geometry = getPageGeometry(options.paperSize);
  const courierFontFace = options.courierFontBase64 ? `@font-face {
        font-family: 'Courier Prime';
        src: url(data:font/truetype;charset=utf-8;base64,${options.courierFontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }` : "";
  const gurmukhiFontFace = options.gurmukhiFontBase64 ? `@font-face {
        font-family: 'Noto Sans Gurmukhi';
        src: url(data:font/truetype;charset=utf-8;base64,${options.gurmukhiFontBase64}) format('truetype');
        font-weight: 100 900;
        font-style: normal;
      }` : "";
  const titlePageHtml = options.includeTitlePage ? `
    <div class="page-sheet title-page" id="title-page">
      <div class="title-top-space"></div>
      <div class="title-center-block">
        ${metadata.titleImageUrl ? `<div class="title-artwork-container"><img src="${metadata.titleImageUrl}" class="title-artwork" alt="Script Title Artwork" /></div>` : ""}
        <h1 class="title-text">${escapeHtml(metadata.title || "UNTITLED")}</h1>
        <p class="title-written-by">${metadata.basedOn ? escapeHtml(metadata.basedOn) : "\u0A35\u0A71\u0A32\u0A4B\u0A02 / by"}</p>
        <p class="title-author">${escapeHtml(metadata.author || "")}</p>
      </div>
      <div class="title-bottom-block">
        <div class="title-meta-left">
          ${metadata.rights ? `<p>${escapeHtml(metadata.rights)}</p>` : ""}
          ${metadata.contact ? `<p class="contact-text">${escapeHtml(metadata.contact)}</p>` : ""}
        </div>
      </div>
    </div>
    ` : "";
  const highlightCfg = options.highlightCharacters;
  const isHighlightActive = Boolean(
    highlightCfg && highlightCfg.enabled && highlightCfg.selectedCharacters && highlightCfg.selectedCharacters.length > 0 && options.preserveCharacterHighlights !== false
  );
  const selectedCharSet = isHighlightActive ? new Set(highlightCfg.selectedCharacters.map((c) => c.toUpperCase().trim())) : /* @__PURE__ */ new Set();
  const highlightColor = highlightCfg?.color || "rgba(167, 139, 250, 0.35)";
  const highlightedBlockIds = /* @__PURE__ */ new Set();
  if (isHighlightActive) {
    let currentSpeaker = null;
    for (const block of draft.blocks) {
      if (block.type === "scene_heading") {
        currentSpeaker = null;
      } else if (block.type === "character") {
        const charName = normalizeCharacterName(block.text);
        if (charName && selectedCharSet.has(charName)) {
          currentSpeaker = charName;
          highlightedBlockIds.add(block.id);
        } else {
          currentSpeaker = null;
        }
      } else if (currentSpeaker && (block.type === "dialogue" || block.type === "parenthetical")) {
        highlightedBlockIds.add(block.id);
      } else {
        currentSpeaker = null;
      }
    }
  }
  let paginationResult = options.paginationResult;
  if (!paginationResult) {
    const layoutBlocks = draftToLayoutBlocks(draft);
    const engine = options.paginationEngine ?? createPaginationEngine();
    const profile = createPageProfile(options.paperSize);
    let layoutService = options.textLayoutService;
    if (!layoutService) {
      let fontMetrics = options.fontMetricsProvider;
      if (!fontMetrics) {
        const provider = getGurmukhiFontMetricsProvider();
        try {
          provider.measureWidth("test");
          fontMetrics = provider;
        } catch (ctxErr) {
          if (options.allowHeadlessFallback === false) {
            throw new Error(
              `Canvas 2D context is unavailable for certified font measurement in current environment. Silent fallback to uncertified pitch is prohibited in production PDF export. (${String(ctxErr)})`
            );
          }
          fontMetrics = new FontMetricsProvider({
            measureFn: (text) => /[\u0A00-\u0A7F]/.test(text) ? Number((text.length * 4.3).toFixed(4)) : Number((text.length * 7.2).toFixed(4))
          });
        }
      }
      layoutService = createTextLayoutService(fontMetrics);
    }
    paginationResult = engine.paginate(layoutBlocks, {
      profile,
      paperSize: options.paperSize,
      contdSetting: options.contdSetting ?? "on",
      textLayoutService: layoutService
    });
  }
  let pagesHtml = "";
  if (paginationResult.pages.length === 0) {
    if (!options.includeTitlePage) {
      pagesHtml = `
      <div class="page-sheet screenplay-page-sheet" data-page-number="1">
        <div class="page-content"></div>
      </div>
      `;
    }
  } else {
    pagesHtml = paginationResult.pages.map((page) => {
      const headerHtml = page.hasHeader ? `<div class="page-header">${escapeHtml(page.headerText || `${page.pageNumber}.`)}</div>` : "";
      const slotItems = page.slots;
      const renderedElements = [];
      let i = 0;
      while (i < slotItems.length) {
        const slot = slotItems[i];
        if (slot.kind === "blank_line") {
          i++;
          continue;
        }
        if (slot.kind === "more") {
          const moreText = escapeHtml(slot.presentationText || "(MORE)");
          renderedElements.push(
            `<div class="slot-line screenplay-more-continuation select-none">${moreText}</div>`
          );
          i++;
          continue;
        }
        if (slot.kind === "contd") {
          const contdText = escapeHtml(slot.presentationText || "");
          renderedElements.push(
            `<div class="slot-line character screenplay-contd-continuation">${contdText}</div>`
          );
          i++;
          continue;
        }
        if (slot.kind === "text") {
          const currentBlockId = slot.blockId;
          const currentBlockType = slot.blockType;
          const blockSlots = [];
          while (i < slotItems.length && slotItems[i].kind === "text" && slotItems[i].blockId === currentBlockId) {
            blockSlots.push(slotItems[i]);
            i++;
          }
          const isHighlighted = highlightedBlockIds.has(currentBlockId);
          const blockLinesHtml = blockSlots.map((s) => {
            const rawLineText = s.line ? s.line.text : s.presentationText || "";
            const escapedLineText = escapeHtml(rawLineText);
            const content = isHighlighted && escapedLineText ? `<span class="character-highlight" style="background-color: ${highlightColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact; border-radius: 2px; padding: 1px 3px;">${escapedLineText}</span>` : escapedLineText;
            return `<div class="screenplay-line">${content || "&nbsp;"}</div>`;
          }).join("\n");
          const blockCssClass = getBlockCssClass(currentBlockType);
          renderedElements.push(
            `<div class="screenplay-block ${blockCssClass}" id="${currentBlockId}">
${blockLinesHtml}
</div>`
          );
        }
      }
      return `
        <div class="page-sheet screenplay-page-sheet" data-page-number="${page.pageNumber}">
          ${headerHtml}
          <div class="page-content">
            ${renderedElements.join("\n")}
          </div>
        </div>
        `;
    }).join("\n");
  }
  return `<!DOCTYPE html>
<html lang="pa-Guru">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(metadata.title || "Screenplay")}</title>
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
      line-height: ${LINE_PITCH_PX}px;
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

    .page-content > .screenplay-block:first-child:not(.scene-heading),
    .page-content > :first-child:not(.scene-heading) {
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
      height: ${metadata.titleImageUrl ? "1.5in" : "2.5in"};
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
      line-height: ${LINE_PITCH_PX}px;
      font-size: ${FONT_SIZE_PX}px;
      height: ${LINE_PITCH_PX}px;
      min-height: ${LINE_PITCH_PX}px;
      margin: 0;
      padding: 0;
      white-space: pre;
      overflow: visible;
      box-sizing: border-box;
    }

    .slot-line {
      line-height: ${LINE_PITCH_PX}px;
      font-size: ${FONT_SIZE_PX}px;
      height: ${LINE_PITCH_PX}px;
      min-height: ${LINE_PITCH_PX}px;
      margin: 0;
      padding: 0;
      white-space: pre;
      overflow: visible;
      box-sizing: border-box;
    }

    .scene-heading {
      margin-left: 0;
      max-width: ${geometry.printableWidth};
      margin-top: 32px;
      margin-bottom: 16px;
      text-transform: uppercase;
      font-weight: bold;
      border-top: none;
      overflow: visible;
    }

    .action {
      margin-left: 0;
      max-width: ${geometry.printableWidth};
      margin-top: 0;
      margin-bottom: 16px;
      overflow: visible;
    }

    .character {
      margin-left: 2.2in;
      margin-top: 16px;
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
      margin-bottom: 16px;
      overflow: visible;
    }

    .transition {
      margin-left: 4.0in;
      margin-top: 16px;
      margin-bottom: 16px;
      text-transform: uppercase;
      overflow: visible;
    }

    .shot {
      margin-left: 0;
      max-width: ${geometry.printableWidth};
      margin-top: 16px;
      margin-bottom: 16px;
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
      margin-left: 2.2in;
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

// test/helpers/run-full-acceptance.ts
import_electron.app.whenReady().then(async () => {
  try {
    const courierBase64 = fs.readFileSync(path.join(__dirname, "../../public/fonts/CourierPrime.ttf")).toString("base64");
    const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, "../../public/fonts/NotoSansGurmukhi.ttf")).toString("base64");
    const blocks = JSON.parse(fs.readFileSync("/tmp/prarbadh_blocks.json", "utf8"));
    const draft = {
      id: "e374dc53-3c6a-4ab4-a886-cb5797c8f3ca",
      name: "Main Draft",
      isMain: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      modifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
      blocks
    };
    const metadata = {
      title: "prarbadh",
      author: "Author"
    };
    const editorWin = new import_electron.BrowserWindow({
      width: 1200,
      height: 900,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "../../dist-electron/preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    await editorWin.loadFile(path.join(__dirname, "../../dist/index.html"));
    for (let i = 0; i < 50; i++) {
      const clicked = await editorWin.webContents.executeJavaScript(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('prarbadh'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (clicked) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    for (let i = 0; i < 50; i++) {
      const count = await editorWin.webContents.executeJavaScript(`document.querySelectorAll('.screenplay-block').length`);
      if (count > 10) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    await editorWin.webContents.executeJavaScript("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 500));
    const editorMetrics = await editorWin.webContents.executeJavaScript(`(() => {
      const pm = document.querySelector('.ProseMirror');
      const pmStyle = window.getComputedStyle(pm);
      const paper = document.querySelector('.screenplay-paper');
      const paperStyle = window.getComputedStyle(paper);

      const blocks = Array.from(document.querySelectorAll('.screenplay-block'));
      const blockReports = blocks.map((el, i) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const clientRects = Array.from(range.getClientRects());
        return {
          index: i,
          className: el.className,
          text: el.textContent.slice(0, 30),
          rectHeight: rect.height,
          clientRectsCount: clientRects.length,
          top: rect.top,
          bottom: rect.bottom,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
        };
      });

      const pageBreaks = Array.from(document.querySelectorAll('.screenplay-page-break')).map((el, i) => {
        const rect = el.getBoundingClientRect();
        const beforeBlocks = blockReports.filter(b => b.bottom <= rect.top + 5);
        const lastBefore = beforeBlocks[beforeBlocks.length - 1];
        const afterBlocks = blockReports.filter(b => b.top >= rect.top - 5);
        const firstAfter = afterBlocks[0];
        return {
          index: i,
          top: rect.top,
          text: el.textContent.trim(),
          prevSiblingText: lastBefore ? lastBefore.text : null,
          nextSiblingText: firstAfter ? firstAfter.text : null,
        };
      });

      // Scroll editor so page break is nicely in view
      const pbEl = document.querySelector('.screenplay-page-break');
      if (pbEl) {
        pbEl.scrollIntoView({ block: 'center' });
      }

      return {
        pmFontSize: pmStyle.fontSize,
        pmLineHeight: pmStyle.lineHeight,
        paperPaddingTop: paperStyle.paddingTop,
        paperPaddingBottom: paperStyle.paddingBottom,
        blockReports,
        pageBreaks,
        paginationResult: window.__lastPaginationResult,
      };
    })()`);
    await new Promise((r) => setTimeout(r, 300));
    const editorScreenshot = await editorWin.capturePage();
    fs.writeFileSync("/tmp/new_editor.png", editorScreenshot.toPNG());
    console.log("Saved editor screenshot to /tmp/new_editor.png");
    editorWin.close();
    const paginationResult = editorMetrics.paginationResult;
    if (!paginationResult) {
      throw new Error("paginationResult not found in editor metrics");
    }
    console.log("Pagination Result Pages:", paginationResult.pages.length);
    const pdfHtml = generateUnifiedScreenplayPdfHtml(draft, metadata, {
      paperSize: "letter",
      includeTitlePage: true,
      courierFontBase64: courierBase64,
      gurmukhiFontBase64: gurmukhiBase64,
      useUnifiedPagination: true,
      paginationResult
    });
    const pdfWin = new import_electron.BrowserWindow({
      width: 816,
      height: 1056,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pdfHtml)}`);
    await pdfWin.webContents.executeJavaScript("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 500));
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: "Letter",
      margins: { marginType: "none" },
      preferCSSPageSize: true,
      printBackground: true
    });
    fs.writeFileSync("/tmp/Our_Export_Fixed.pdf", pdfBuffer);
    console.log("Saved exported PDF to /tmp/Our_Export_Fixed.pdf");
    const pdfInspection = await pdfWin.webContents.executeJavaScript(`(() => {
      const sheets = Array.from(document.querySelectorAll('.page-sheet'));
      const sheetReports = sheets.map((sheet, sheetIdx) => {
        const sheetRect = sheet.getBoundingClientRect();
        const pageNum = sheet.getAttribute('data-page-number');
        const isTitlePage = sheet.classList.contains('title-page');

        // Find all text / line elements inside sheet
        const lines = Array.from(sheet.querySelectorAll('.screenplay-line, .title-text, .title-author, .contact-text'));
        let minTop = Infinity;
        let maxBottom = -Infinity;
        let lowestElement = null;

        lines.forEach(lineEl => {
          const r = lineEl.getBoundingClientRect();
          // Offset relative to sheet top
          const relTop = r.top - sheetRect.top;
          const relBottom = r.bottom - sheetRect.top;
          if (relTop < minTop) minTop = relTop;
          if (relBottom > maxBottom) {
            maxBottom = relBottom;
            lowestElement = lineEl.textContent.trim().slice(0, 30);
          }
        });

        // Block line counts in PDF
        const blocks = Array.from(sheet.querySelectorAll('.screenplay-block'));
        const blockLineCounts = blocks.map(b => ({
          id: b.id,
          lineCount: b.querySelectorAll('.screenplay-line').length,
          text: b.textContent.trim().slice(0, 30),
        }));

        // Measure font size of screenplay-line
        const firstLine = sheet.querySelector('.screenplay-line');
        const lineFontSize = firstLine ? window.getComputedStyle(firstLine).fontSize : null;
        const linePitch = firstLine ? window.getComputedStyle(firstLine).lineHeight : null;

        return {
          sheetIdx,
          pageNum,
          isTitlePage,
          sheetWidth: sheetRect.width,
          sheetHeight: sheetRect.height,
          minTopPx: minTop,
          maxBottomPx: maxBottom,
          minTopPt: minTop * (72 / 96),
          maxBottomPt: maxBottom * (72 / 96),
          lowestElement,
          lineFontSize,
          linePitch,
          blockLineCounts,
        };
      });

      return sheetReports;
    })()`);
    console.log("=== PDF INSPECTION REPORTS ===");
    console.log(JSON.stringify(pdfInspection, null, 2));
    await pdfWin.webContents.executeJavaScript(`(() => {
      const sheets = document.querySelectorAll('.page-sheet');
      if (sheets.length > 1) {
        sheets[1].scrollIntoView();
      }
    })()`);
    await new Promise((r) => setTimeout(r, 300));
    const pdfPageScreenshot = await pdfWin.capturePage();
    fs.writeFileSync("/tmp/new_pdf_page1.png", pdfPageScreenshot.toPNG());
    console.log("Saved PDF page image to /tmp/new_pdf_page1.png");
    pdfWin.close();
    console.log("\n========================================================================");
    console.log("                  PER-BLOCK GEOMETRY & PARITY TABLE");
    console.log("========================================================================");
    console.log("Idx | Block Type      | Text Snapshot                  | Eng H | DOM H | Diff   | Eng L | DOM L | PDF L | Status");
    console.log("----+-----------------+--------------------------------+-------+-------+--------+-------+-------+-------+-------");
    const failures = [];
    const pdfBlockLinesMap = /* @__PURE__ */ new Map();
    pdfInspection.forEach((s) => {
      s.blockLineCounts.forEach((b) => {
        pdfBlockLinesMap.set(b.id, (pdfBlockLinesMap.get(b.id) || 0) + b.lineCount);
      });
    });
    const engineLinesMap = /* @__PURE__ */ new Map();
    paginationResult.pages.forEach((p) => {
      p.slots.forEach((s) => {
        if (s.kind === "text") {
          engineLinesMap.set(s.blockId, (engineLinesMap.get(s.blockId) || 0) + 1);
        }
      });
    });
    editorMetrics.blockReports.forEach((domBlock, idx) => {
      const block = blocks[idx];
      const engLines = engineLinesMap.get(block.id) || 0;
      const domLines = domBlock.clientRectsCount;
      const pdfLines = pdfBlockLinesMap.get(block.id) || 0;
      const expectedHeight = engLines * LINE_PITCH_PX;
      const actualHeight = domBlock.rectHeight;
      const diff = Math.abs(expectedHeight - actualHeight);
      let status = "PASS";
      if (diff > 0.5) {
        status = "FAIL-H";
        failures.push(`Block ${idx} height diff ${diff.toFixed(2)}px > 0.5px`);
      }
      if (domLines !== engLines) {
        status = "FAIL-L";
        failures.push(`Block ${idx} DOM lines (${domLines}) != engine lines (${engLines})`);
      }
      if (pdfLines !== engLines && block.text.trim().length > 0) {
        status = "FAIL-PDF";
        failures.push(`Block ${idx} PDF lines (${pdfLines}) != engine lines (${engLines})`);
      }
      const typeStr = block.type.padEnd(15);
      const textStr = (block.text.trim().replace(/\n/g, " ") || "<empty>").slice(0, 30).padEnd(30);
      console.log(
        `${String(idx).padStart(3)} | ${typeStr} | ${textStr} | ${String(expectedHeight).padStart(5)} | ${actualHeight.toFixed(1).padStart(5)} | ${diff.toFixed(2).padStart(6)} | ${String(engLines).padStart(5)} | ${String(domLines).padStart(5)} | ${String(pdfLines).padStart(5)} | ${status}`
      );
    });
    console.log("========================================================================\n");
    console.log("VERIFYING ACCEPTANCE CRITERIA:");
    console.log(`1. Editor PM font-size: ${editorMetrics.pmFontSize} (expected 16px)`);
    if (editorMetrics.pmFontSize !== "16px") {
      failures.push(`Editor font size is ${editorMetrics.pmFontSize}, expected 16px`);
    }
    const scriptPdfSheet = pdfInspection.find((s) => !s.isTitlePage);
    console.log(`   PDF Line font-size: ${scriptPdfSheet?.lineFontSize} (expected 16px)`);
    if (scriptPdfSheet?.lineFontSize !== "16px") {
      failures.push(`PDF font size is ${scriptPdfSheet?.lineFontSize}, expected 16px`);
    }
    pdfInspection.forEach((s) => {
      if (s.isTitlePage) return;
      console.log(`2. Script Page ${s.pageNum}:`);
      console.log(`   Lowest text bottom: ${s.maxBottomPt.toFixed(2)}pt (limit: 720.0pt + 0.5pt = 720.5pt) -> [${s.lowestElement}]`);
      console.log(`   Highest text top:   ${s.minTopPt.toFixed(2)}pt (limit: >= 71.5pt)`);
      if (s.maxBottomPt > 720.5) {
        failures.push(`Page ${s.pageNum} lowest text bottom ${s.maxBottomPt.toFixed(2)}pt exceeds 720.5pt`);
      }
      if (s.minTopPt < 71.5) {
        failures.push(`Page ${s.pageNum} highest text top ${s.minTopPt.toFixed(2)}pt is below 71.5pt`);
      }
    });
    console.log("3. Page Break Position:");
    const pb = editorMetrics.pageBreaks[0];
    console.log(`   Before break: "${pb?.prevSiblingText}"`);
    console.log(`   After break:  "${pb?.nextSiblingText}"`);
    if (!pb?.prevSiblingText?.includes("\u0A13\u0A15")) {
      failures.push(`Expected page 1 to end with \u0A13\u0A15, got "${pb?.prevSiblingText}"`);
    }
    if (!pb?.nextSiblingText?.includes("\u0A2A\u0A24\u0A28\u0A40")) {
      failures.push(`Expected page 2 to start with \u0A2A\u0A24\u0A28\u0A40, got "${pb?.nextSiblingText}"`);
    }
    if (failures.length > 0) {
      console.error("\nACCEPTANCE TEST FAILURES:");
      failures.forEach((f) => console.error("  - " + f));
      import_electron.app.exit(1);
    } else {
      console.log("\n>>> ALL ACCEPTANCE TESTS PASSED PERFECTLY! <<<");
      import_electron.app.exit(0);
    }
  } catch (err) {
    console.error("Fatal error during acceptance test:", err);
    import_electron.app.exit(1);
  }
});
