/**
 * SPIKE 1: Gurmukhi Shaping and Ink-Clearance Test
 * File: test/spikes/harfbuzz-ink-clearance.spike.ts
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

const FONT_PATH = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');

export interface FontIdentity {
  family: string;
  subfamily: string;
  version: string;
  postscriptName: string;
  sha256: string;
  unitsPerEm: number;
  yMin: number;
  yMax: number;
  gsubFeatures: string[];
  gposFeatures: string[];
}

export function inspectStaticFont(filePath: string): FontIdentity {
  const buf = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

  const numTables = buf.readUInt16BE(4);
  const tables: Record<string, { offset: number; length: number }> = {};
  for (let i = 0; i < numTables; i++) {
    const offset = 12 + i * 16;
    const tag = buf.toString('ascii', offset, offset + 4);
    tables[tag] = { offset: buf.readUInt32BE(offset + 8), length: buf.readUInt32BE(offset + 12) };
  }

  // head table
  const headOff = tables['head'].offset;
  const unitsPerEm = buf.readUInt16BE(headOff + 18);
  const yMin = buf.readInt16BE(headOff + 38);
  const yMax = buf.readInt16BE(headOff + 42);

  // name table
  const names: Record<number, string> = {};
  const nameOff = tables['name'].offset;
  const count = buf.readUInt16BE(nameOff + 2);
  const stringOffset = nameOff + buf.readUInt16BE(nameOff + 4);
  for (let i = 0; i < count; i++) {
    const rec = nameOff + 6 + i * 12;
    const platformID = buf.readUInt16BE(rec);
    const nameID = buf.readUInt16BE(rec + 6);
    const length = buf.readUInt16BE(rec + 8);
    const offset = buf.readUInt16BE(rec + 10);
    let str = '';
    if (platformID === 0 || platformID === 3) {
      const sub = Buffer.from(buf.subarray(stringOffset + offset, stringOffset + offset + length));
      sub.swap16();
      str = sub.toString('utf16le');
    } else {
      str = buf.toString('utf8', stringOffset + offset, stringOffset + offset + length);
    }
    if (!names[nameID]) names[nameID] = str;
  }

  function getFeatureTags(tableTag: string): string[] {
    if (!tables[tableTag]) return [];
    const tOff = tables[tableTag].offset;
    const featListOff = tOff + buf.readUInt16BE(tOff + 6);
    const featCount = buf.readUInt16BE(featListOff);
    const tags: string[] = [];
    for (let f = 0; f < featCount; f++) {
      const rec = featListOff + 2 + f * 6;
      tags.push(buf.toString('ascii', rec, rec + 4));
    }
    return Array.from(new Set(tags));
  }

  return {
    family: names[1] || '',
    subfamily: names[2] || '',
    version: names[5] || '',
    postscriptName: names[6] || '',
    sha256,
    unitsPerEm,
    yMin,
    yMax,
    gsubFeatures: getFeatureTags('GSUB'),
    gposFeatures: getFeatureTags('GPOS'),
  };
}

export const TWENTY_DIFFICULT_GURMUKHI_COMBINATIONS = [
  { id: 1, text: "ਕ੍ਰਿੱਪਾ", desc: "Virama + Rakar + Sihari + Addak" },
  { id: 2, text: "ਗੁੰਝਲ਼ਦਾਰ", desc: "Aunkad + Tippi + Nukta" },
  { id: 3, text: "ਪ੍ਰੋਗਰਾਮਾਂ", desc: "Rakar + Hora + Kanna + Bindi" },
  { id: 4, text: "ਉੱਲੂ", desc: "Addak + Dulainkar" },
  { id: 5, text: "ਕਿਉਂਕਿ", desc: "Sihari + Bindi + Sihari" },
  { id: 6, text: "ਤ੍ਰਿਸ਼ਨਾ", desc: "Rakar + Sihari + Nukta" },
  { id: 7, text: "ਸੰਪੂਰਨ", desc: "Tippi + Dulainkar" },
  { id: 8, text: "ਕ੍ਰੂ਼", desc: "Rakar + Dulainkar + Nukta (stacked descender)" },
  { id: 9, text: "ਪ੍ਰ੍ਹ", desc: "Dual subjoined Rakar + Haha" },
  { id: 10, text: "ਸ੍ਰੀ", desc: "Rakar + Bihari" },
  { id: 11, text: "ਕ੍ਹ", desc: "Subjoined Pairin Haha" },
  { id: 12, text: "ਮ੍ਹ", desc: "Subjoined Pairin Haha with Ma" },
  { id: 13, text: "ਕ੍ਵ", desc: "Subjoined Pairin Vava" },
  { id: 14, text: "ਚੌਂਕੀਦਾਰ", desc: "Kanaura + Bindi + Bihari" },
  { id: 15, text: "ਮੈਂਡੇਲੀਫ਼", desc: "Dulaanv + Bindi + Nukta" },
  { id: 16, text: "ਨਿਊਕਲੀਅਰ", desc: "Sihari + Dulainkar + Bihari" },
  { id: 17, text: "ਝਿੜਕਿਆ", desc: "Sihari + Rara Nukta + Sihari" },
  { id: 18, text: "ਅੰਮ੍ਰਿਤਸਰ", desc: "Tippi + Rakar + Sihari" },
  { id: 19, text: "ਖ਼ੁਸ਼ਫ਼ਹਿਮੀਆਂ", desc: "Triple Nuktas + Aunkad + Sihari + Bindi" },
  { id: 20, text: "ਦ੍ਰਿਸ਼ਟੀਕੋਣ", desc: "Rakar + Sihari + Nukta + Bihari + Hora" }
];

describe('SPIKE 1: Gurmukhi Shaping & Ink-Clearance Measurement', () => {
  it('validates production font identity, checksum, and OpenType tables', () => {
    const fontInfo = inspectStaticFont(FONT_PATH);

    expect(fontInfo.family).toBe('Noto Sans Gurmukhi');
    expect(fontInfo.postscriptName).toBe('NotoSansGurmukhi-Regular');
    expect(fontInfo.version).toContain('2.004');
    expect(fontInfo.sha256).toBe('b9b7f20c34d4ab2cda743f4619d08aed9fc05c5f0bb0d39030fcf2bc986dfa0a');
    expect(fontInfo.unitsPerEm).toBe(1000);
    expect(fontInfo.yMin).toBe(-398);
    expect(fontInfo.yMax).toBe(995);

    // Verify GSUB shaping features
    expect(fontInfo.gsubFeatures).toContain('blwf'); // Below-base forms (Rakar, Haha, Vava)
    expect(fontInfo.gsubFeatures).toContain('abvs'); // Above-base substitutions
    expect(fontInfo.gsubFeatures).toContain('nukt'); // Nukta forms
    expect(fontInfo.gsubFeatures).toContain('ccmp'); // Glyph composition

    // Verify GPOS positioning features
    expect(fontInfo.gposFeatures).toContain('abvm'); // Above-base mark positioning
    expect(fontInfo.gposFeatures).toContain('mark'); // Mark-to-base positioning
    expect(fontInfo.gposFeatures).toContain('mkmk'); // Mark-to-mark positioning
    expect(fontInfo.gposFeatures).toContain('dist'); // Distance adjustments
  });

  it('measures rendered ink clearance across 20 difficult combinations in Chromium at pitches 16pt, 17pt, 18pt, 18.5pt', () => {
    // Run the standalone Electron measurement runner script
    const runnerPath = path.resolve(__dirname, 'runners/spike1-runner.cjs');
    const stdout = execFileSync(
      path.resolve(process.cwd(), 'node_modules/.bin/electron'),
      [runnerPath],
      {
        encoding: 'utf8',
        env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
      }
    );

    const match = stdout.match(/SPIKE1_RESULTS:([\s\S]*?)END_SPIKE1_RESULTS/);
    expect(match).not.toBeNull();
    const results = JSON.parse(match![1].trim());

    expect(results.length).toBe(20);

    for (const res of results) {
      // 1. At pitch 16pt, check collision behavior on extreme descender combinations
      if (res.hasExtremeDescender) {
        expect(res.pitch16.gapPx).toBeLessThanOrEqual(0); // Proves collision at 16pt!
      }

      // 2. At pitch 18.0pt, clearance must be strictly >= 1.0pt (+1.33px)
      expect(res.pitch18.gapPt).toBeGreaterThanOrEqual(1.0);
      expect(res.pitch18.collision).toBe(false);

      // 3. At pitch 18.5pt, clearance must be strictly >= 1.5pt (+2.0px)
      expect(res.pitch18_5.gapPt).toBeGreaterThanOrEqual(1.5);
      expect(res.pitch18_5.collision).toBe(false);
    }
  });
});
