/**
 * fontMetrics.ts - Font Identity, Availability, Fallback Detection & Text Measurement Service
 * Governing Context: AKHAR-ARCH-PAG — Milestone M1A
 *
 * Provides an independent, headless typography metrics service for AkharStudio:
 * 1. Static TrueType table validation and SHA-256 fingerprinting.
 * 2. Asynchronous browser font loading, readiness verification, and fallback detection.
 * 3. Physical point-based text width measurement via canvas.
 * 4. Line-box metrics reporting (ascent, descent, line-box height).
 *
 * IMPORTANT ARCHITECTURAL DISTINCTION:
 * This module reports raw font metrics and advance widths. It does NOT establish
 * or hardcode page-layout policies such as baseline grid pitch (18pt), page line capacity
 * (36/38 slots), margins, or screenplay element spacing. Those policies are strictly
 * evaluated by the downstream Pagination Engine (M1C).
 */

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export interface FontIdentityInfo {
  family: string;
  postscriptName: string;
  version: string;
  sha256: string;
  unitsPerEm: number;
  yMin: number;
  yMax: number;
}

export interface FontValidationResult {
  valid: boolean;
  identity?: FontIdentityInfo;
  error?: string;
  mismatches?: string[];
}

export type FontLoadingState = 'unloaded' | 'loading' | 'ready' | 'degraded' | 'failed';

export interface RuntimeFontStatus {
  loaded: boolean;
  isFallback: boolean;
  status: FontLoadingState;
  error?: string;
  availableMetrics?: {
    actualBoundingBox: boolean;
    fontBoundingBox: boolean;
  };
}

/**
 * Typographic line-box dimensions (font ascent + font descent) in physical points.
 * ARCHITECTURAL BOUNDARY:
 * This represents the intrinsic font glyph bounding extents at the requested font size.
 * It is an unpaginated line-box metric and NOT the authoritative screenplay baseline grid
 * (such as the 18pt pitch established in M0 Spike 1), which is managed exclusively
 * by Milestone M1C Pagination Engine.
 */
export interface LineBoxMetrics {
  fontSizePt: number;
  ascentPt: number;
  descentPt: number;
  lineBoxHeightPt: number;
  actualAscentPt?: number;
  actualDescentPt?: number;
}

export interface FontFaceSetLike {
  check(font: string, text?: string): boolean;
  load(font: string, text?: string): Promise<unknown[]>;
  ready: Promise<unknown>;
}

export interface FontMetricsOptions {
  family?: string;
  expectedIdentity?: FontIdentityInfo;
  canvasContext?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  measureFn?: (text: string, fontSpec: string) => number;
  fontsTarget?: FontFaceSetLike;
}

export interface IFontMetricsProvider {
  ensureLoaded(timeoutMs?: number): Promise<RuntimeFontStatus>;
  getStatus(): RuntimeFontStatus;
  measureWidth(text: string, fontSizePt?: number, bold?: boolean, italic?: boolean): number;
  getLineBoxMetrics(fontSizePt?: number): LineBoxMetrics;
}

// -----------------------------------------------------------------------------
// Expected Production Font Baselines
// -----------------------------------------------------------------------------

export const EXPECTED_NOTO_SANS_GURMUKHI: FontIdentityInfo = {
  family: 'Noto Sans Gurmukhi',
  postscriptName: 'NotoSansGurmukhi-Regular',
  version: 'Version 2.004',
  sha256: 'b9b7f20c34d4ab2cda743f4619d08aed9fc05c5f0bb0d39030fcf2bc986dfa0a',
  unitsPerEm: 1000,
  yMin: -398,
  yMax: 995,
};

export const EXPECTED_COURIER_PRIME: FontIdentityInfo = {
  family: 'Courier Prime',
  postscriptName: 'CourierPrime-Regular',
  version: 'Version 3.018',
  sha256: '72f793376f8e2841656bf21d77a5de010f2929bd6956a22ee848ad0c7eb978af',
  unitsPerEm: 2048,
  yMin: -526,
  yMax: 1827,
};

// -----------------------------------------------------------------------------
// Unit Conversion Helpers
// -----------------------------------------------------------------------------

/**
 * Converts points to CSS pixels (1 inch = 72 points = 96 CSS pixels).
 */
export function pointsToPixels(pt: number): number {
  return pt * (96 / 72);
}

/**
 * Converts CSS pixels to points (1 inch = 96 CSS pixels = 72 points).
 */
export function pixelsToPoints(px: number): number {
  return px * (72 / 96);
}

// -----------------------------------------------------------------------------
// Static Font-File Validation
// -----------------------------------------------------------------------------

/**
 * Computes SHA-256 hexadecimal hash from an ArrayBuffer.
 * Uses W3C standard Web Crypto API if available, falling back to Node crypto.
 */
export async function computeBufferSha256(buffer: ArrayBuffer): Promise<string> {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Cannot compute SHA-256 for empty or undefined buffer');
  }

  // 1. Browser / Web Crypto API
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    globalThis.crypto.subtle &&
    typeof globalThis.crypto.subtle.digest === 'function'
  ) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 2. Node.js environment
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(new Uint8Array(buffer)).digest('hex');
  } catch (err) {
    throw new Error(`No cryptographic implementation available for SHA-256: ${String(err)}`);
  }
}

/**
 * Parses TrueType/OpenType font header metadata (head and name tables) using standard DataView.
 * Operates purely in memory without third-party dependencies or filesystem access.
 */
export function parseTrueTypeMetadata(buffer: ArrayBuffer): FontIdentityInfo | null {
  if (!buffer || buffer.byteLength < 64) {
    return null;
  }

  try {
    const view = new DataView(buffer);
    const numTables = view.getUint16(4, false);

    const tables: Record<string, { offset: number; length: number }> = {};
    for (let i = 0; i < numTables; i++) {
      const rec = 12 + i * 16;
      if (rec + 16 > buffer.byteLength) break;
      let tag = '';
      for (let j = 0; j < 4; j++) {
        tag += String.fromCharCode(view.getUint8(rec + j));
      }
      tables[tag] = {
        offset: view.getUint32(rec + 8, false),
        length: view.getUint32(rec + 12, false),
      };
    }

    if (!tables['head'] || !tables['name']) {
      return null;
    }

    // head table: unitsPerEm (offset + 18), yMin (offset + 38), yMax (offset + 42)
    const headOff = tables['head'].offset;
    const unitsPerEm = view.getUint16(headOff + 18, false);
    const yMin = view.getInt16(headOff + 38, false);
    const yMax = view.getInt16(headOff + 42, false);

    // name table
    const nameOff = tables['name'].offset;
    const count = view.getUint16(nameOff + 2, false);
    const stringOffset = nameOff + view.getUint16(nameOff + 4, false);
    const names: Record<number, string> = {};

    for (let i = 0; i < count; i++) {
      const rec = nameOff + 6 + i * 12;
      if (rec + 12 > buffer.byteLength) break;
      const platformID = view.getUint16(rec, false);
      const nameID = view.getUint16(rec + 6, false);
      const length = view.getUint16(rec + 8, false);
      const offset = view.getUint16(rec + 10, false);
      const strOff = stringOffset + offset;

      if (strOff + length <= buffer.byteLength) {
        let str = '';
        if (platformID === 0 || platformID === 3) {
          // UTF-16BE (Unicode or Windows)
          for (let j = 0; j < length; j += 2) {
            str += String.fromCharCode(view.getUint16(strOff + j, false));
          }
        } else {
          // 8-bit ASCII / Roman
          for (let j = 0; j < length; j++) {
            str += String.fromCharCode(view.getUint8(strOff + j));
          }
        }
        if (!names[nameID]) names[nameID] = str;
      }
    }

    return {
      family: names[1] || '',
      postscriptName: names[6] || '',
      version: names[5] || '',
      sha256: '', // Populated by caller
      unitsPerEm,
      yMin,
      yMax,
    };
  } catch {
    return null;
  }
}

/**
 * Validates a binary font buffer against expected font identity and SHA-256 hash.
 */
export async function validateFontBuffer(
  buffer: ArrayBuffer,
  expected: FontIdentityInfo = EXPECTED_NOTO_SANS_GURMUKHI
): Promise<FontValidationResult> {
  if (!buffer || buffer.byteLength === 0) {
    return { valid: false, error: 'Font buffer is missing or empty' };
  }

  const identity = parseTrueTypeMetadata(buffer);
  if (!identity) {
    return { valid: false, error: 'Failed to parse TrueType font headers (corrupt or invalid font)' };
  }

  try {
    identity.sha256 = await computeBufferSha256(buffer);
  } catch (err) {
    return { valid: false, identity, error: `SHA-256 calculation failed: ${String(err)}` };
  }

  const mismatches: string[] = [];

  if (expected.family && identity.family !== expected.family) {
    mismatches.push(`family expected "${expected.family}", received "${identity.family}"`);
  }
  if (expected.postscriptName && identity.postscriptName !== expected.postscriptName) {
    mismatches.push(`postscriptName expected "${expected.postscriptName}", received "${identity.postscriptName}"`);
  }
  if (expected.version && !identity.version.includes(expected.version)) {
    mismatches.push(`version expected to contain "${expected.version}", received "${identity.version}"`);
  }
  if (expected.unitsPerEm && identity.unitsPerEm !== expected.unitsPerEm) {
    mismatches.push(`unitsPerEm expected ${expected.unitsPerEm}, received ${identity.unitsPerEm}`);
  }
  if (expected.sha256 && identity.sha256 !== expected.sha256) {
    mismatches.push(`sha256 expected "${expected.sha256}", received "${identity.sha256}"`);
  }

  if (mismatches.length > 0) {
    return {
      valid: false,
      identity,
      mismatches,
      error: `Font identity validation failed: ${mismatches.join('; ')}`,
    };
  }

  return { valid: true, identity };
}

// -----------------------------------------------------------------------------
// Runtime Font Metrics Provider
// -----------------------------------------------------------------------------

export class FontMetricsProvider implements IFontMetricsProvider {
  public readonly family: string;
  public readonly expectedIdentity: FontIdentityInfo;

  private status: RuntimeFontStatus = {
    loaded: false,
    isFallback: false,
    status: 'unloaded',
  };

  private loadPromise: Promise<RuntimeFontStatus> | null = null;
  private canvasContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;
  private canvasContextAttempted = false;
  private customMeasureFn: ((text: string, fontSpec: string) => number) | null = null;
  private fontsTarget: FontFaceSetLike | null = null;

  constructor(options: FontMetricsOptions = {}) {
    this.family = options.family || EXPECTED_NOTO_SANS_GURMUKHI.family;
    this.expectedIdentity = options.expectedIdentity || EXPECTED_NOTO_SANS_GURMUKHI;
    this.canvasContext = options.canvasContext || null;
    this.customMeasureFn = options.measureFn || null;
    this.fontsTarget = options.fontsTarget || null;
  }

  /**
   * Returns the current runtime readiness and fallback status.
   */
  public getStatus(): RuntimeFontStatus {
    return { ...this.status };
  }

  /**
   * Ensures the font is registered and ready in Chromium font cache.
   * Awaits document.fonts.ready, tests with document.fonts.check(), and detects fallback.
   * Respects a configurable timeout (default: 3000ms).
   */
  public async ensureLoaded(timeoutMs = 3000): Promise<RuntimeFontStatus> {
    // 1. Return immediately if already ready
    if (this.status.status === 'ready') {
      return this.getStatus();
    }

    // 2. Return existing in-flight promise to prevent duplicate concurrent operations
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.status = { ...this.status, status: 'loading', error: undefined };

    this.loadPromise = this.performLoad(timeoutMs)
      .then((res) => {
        this.status = res;
        this.loadPromise = null;
        return this.getStatus();
      })
      .catch((err) => {
        this.status = {
          loaded: false,
          isFallback: false,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        };
        this.loadPromise = null;
        return this.getStatus();
      });

    return this.loadPromise;
  }

  private async performLoad(timeoutMs: number): Promise<RuntimeFontStatus> {
    const fonts = this.resolveFontsTarget();

    // In pure headless Node without document.fonts
    if (!fonts) {
      // If a custom measure function or canvas context was supplied, allow measurement
      if (this.customMeasureFn || this.canvasContext) {
        return {
          loaded: true,
          isFallback: false,
          status: 'ready',
        };
      }
      return {
        loaded: false,
        isFallback: false,
        status: 'degraded',
        error: 'document.fonts unavailable in current environment; running in headless mode',
      };
    }

    // Wrap loading in a strict timeout
    let timer: any;
    const loadTimeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Font loading timed out after ${timeoutMs}ms for "${this.family}"`));
      }, timeoutMs);
    });

    const fontSpec = `12pt "${this.family}"`;

    try {
      // Await fonts.ready and fonts.load() concurrently with timeout
      await Promise.race([
        Promise.all([
          fonts.ready,
          fonts.load ? fonts.load(fontSpec) : Promise.resolve(),
        ]),
        loadTimeout,
      ]);
    } catch (loadErr) {
      return {
        loaded: false,
        isFallback: false,
        status: 'failed',
        error: loadErr instanceof Error ? loadErr.message : String(loadErr),
      };
    } finally {
      if (timer) clearTimeout(timer);
    }

    // Verify whether document.fonts reports the family as loaded
    const isFontAvailable = fonts.check ? fonts.check(fontSpec) : true;
    if (!isFontAvailable) {
      return {
        loaded: false,
        isFallback: false,
        status: 'failed',
        error: `Font "${this.family}" is not available in document.fonts after loading`,
      };
    }

    // Perform fallback detection using canvas metrics
    const isFallback = this.detectFallbackRendering();
    if (isFallback) {
      return {
        loaded: true,
        isFallback: true,
        status: 'degraded',
        error: `Browser rendered fallback font instead of "${this.family}"`,
      };
    }

    return {
      loaded: true,
      isFallback: false,
      status: 'ready',
      availableMetrics: this.inspectAvailableMetrics(),
    };
  }

  /**
   * Detects whether Chromium substituted a generic fallback font.
   * Compares the measured advance width of a characteristic Gurmukhi akshara
   * against generic fallback families (e.g. monospace).
   */
  private detectFallbackRendering(): boolean {
    const ctx = this.getOrCreateContext();
    if (!ctx) return false;

    try {
      const testString = 'ਕ੍ਰਿੱਪਾ ਸ੍ਰੀ ਗੁੰਝਲ਼';
      const sizePx = 16; // 12pt

      ctx.font = `normal normal ${sizePx}px "${this.family}", sans-serif`;
      const targetWidth = ctx.measureText(testString).width;

      ctx.font = `normal normal ${sizePx}px "__AkharNonExistentFallbackFont__", monospace`;
      const fallbackWidth = ctx.measureText(testString).width;

      // If target width exactly equals an intentionally non-existent font, fallback occurred
      if (Math.abs(targetWidth - fallbackWidth) < 0.001 && targetWidth > 0) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private inspectAvailableMetrics(): { actualBoundingBox: boolean; fontBoundingBox: boolean } {
    const ctx = this.getOrCreateContext();
    if (!ctx) return { actualBoundingBox: false, fontBoundingBox: false };

    try {
      const metrics = ctx.measureText('M');
      return {
        actualBoundingBox: typeof metrics.actualBoundingBoxAscent === 'number',
        fontBoundingBox: typeof (metrics as unknown as { fontBoundingBoxAscent?: number }).fontBoundingBoxAscent === 'number',
      };
    } catch {
      return { actualBoundingBox: false, fontBoundingBox: false };
    }
  }

  /**
   * Measures physical advance width of a text string in points (pt).
   */
  public measureWidth(text: string, fontSizePt = 12, bold = false, italic = false): number {
    if (typeof text !== 'string') {
      throw new Error(`measureWidth: expected string, received ${typeof text}`);
    }
    if (text.length === 0) {
      return 0;
    }
    if (!Number.isFinite(fontSizePt) || fontSizePt <= 0 || Number.isNaN(fontSizePt)) {
      throw new Error(`measureWidth: invalid fontSizePt (${fontSizePt}). Must be a positive finite number.`);
    }

    // 1. Use custom measure function if provided
    if (this.customMeasureFn) {
      const weight = bold ? 'bold' : 'normal';
      const style = italic ? 'italic' : 'normal';
      const fontSpec = `${style} ${weight} ${pointsToPixels(fontSizePt)}px "${this.family}"`;
      const widthPt = this.customMeasureFn(text, fontSpec);
      if (!Number.isFinite(widthPt) || Number.isNaN(widthPt)) {
        throw new Error('Custom measureFn returned non-finite width');
      }
      return widthPt;
    }

    // 2. Use 2D Canvas context
    const ctx = this.getOrCreateContext();
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable for font measurement');
    }

    const weight = bold ? 'bold ' : 'normal ';
    const style = italic ? 'italic ' : 'normal ';
    const sizePx = pointsToPixels(fontSizePt);
    ctx.font = `${style}${weight}${sizePx}px "${this.family}", sans-serif`;

    const metrics = ctx.measureText(text);
    const widthPx = metrics.width;

    if (!Number.isFinite(widthPx) || Number.isNaN(widthPx)) {
      throw new Error('Canvas measureText returned non-finite width');
    }

    const widthPt = pixelsToPoints(widthPx);
    return Number(widthPt.toFixed(4));
  }

  /**
   * Reports line-box metrics (ascent, descent, height) in physical points.
   */
  public getLineBoxMetrics(fontSizePt = 12): LineBoxMetrics {
    if (!Number.isFinite(fontSizePt) || fontSizePt <= 0 || Number.isNaN(fontSizePt)) {
      throw new Error(`getLineBoxMetrics: invalid fontSizePt (${fontSizePt}). Must be a positive finite number.`);
    }

    const ctx = this.getOrCreateContext();
    let actualAscentPt: number | undefined;
    let actualDescentPt: number | undefined;

    if (ctx) {
      try {
        const sizePx = pointsToPixels(fontSizePt);
        ctx.font = `normal normal ${sizePx}px "${this.family}", sans-serif`;
        const testMetrics = ctx.measureText('ਕ੍ਰਿੱਪਾ');

        if (typeof testMetrics.actualBoundingBoxAscent === 'number') {
          actualAscentPt = Number(pixelsToPoints(testMetrics.actualBoundingBoxAscent).toFixed(4));
        }
        if (typeof testMetrics.actualBoundingBoxDescent === 'number') {
          actualDescentPt = Number(pixelsToPoints(testMetrics.actualBoundingBoxDescent).toFixed(4));
        }
      } catch {
        // Fall back gracefully
      }
    }

    // Calculate font-level ascent and descent using TrueType unitsPerEm
    const em = this.expectedIdentity.unitsPerEm || 1000;
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
      actualDescentPt,
    };
  }

  private resolveFontsTarget(): FontFaceSetLike | null {
    if (this.fontsTarget) return this.fontsTarget;
    if (typeof document !== 'undefined' && document.fonts) {
      return document.fonts as unknown as FontFaceSetLike;
    }
    return null;
  }

  private getOrCreateContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
    if (this.canvasContext) return this.canvasContext;
    if (this.canvasContextAttempted) return null;

    // OffscreenCanvas (Node or Web Worker or modern Chromium)
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        const offscreen = new OffscreenCanvas(400, 200);
        this.canvasContext = offscreen.getContext('2d', { willReadFrequently: true });
        if (this.canvasContext) return this.canvasContext;
      } catch {
        // Fall through to DOM canvas
      }
    }

    // HTML5 Canvas in DOM environment
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 200;
        this.canvasContext = canvas.getContext('2d', { willReadFrequently: true });
        if (this.canvasContext) return this.canvasContext;
      } catch {
        // Context creation failed
      }
    }

    this.canvasContextAttempted = true;
    return null;
  }
}

// -----------------------------------------------------------------------------
// Singleton Factory
// -----------------------------------------------------------------------------

let defaultGurmukhiProvider: FontMetricsProvider | null = null;

export function getGurmukhiFontMetricsProvider(options?: FontMetricsOptions): FontMetricsProvider {
  if (!defaultGurmukhiProvider || options) {
    const provider = new FontMetricsProvider(options);
    if (!options) defaultGurmukhiProvider = provider;
    return provider;
  }
  return defaultGurmukhiProvider;
}

export function createCourierFontMetricsProvider(options?: FontMetricsOptions): FontMetricsProvider {
  return new FontMetricsProvider({
    family: EXPECTED_COURIER_PRIME.family,
    expectedIdentity: EXPECTED_COURIER_PRIME,
    ...options,
  });
}
