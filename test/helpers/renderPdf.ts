import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Renders HTML to a real PDF Buffer using Electron's Chromium printToPDF.
 * Configured with dumb-printer settings: marginType: 'none', preferCSSPageSize: true, printBackground: true.
 */
export function renderHtmlToPdf(html: string, paperSize: 'letter' | 'a4' = 'letter'): Buffer {
  const tmpDir = os.tmpdir();
  const id = Math.random().toString(36).substring(2, 9);
  const inputHtml = path.join(tmpDir, `akhar-test-${id}.html`);
  const outputPdf = path.join(tmpDir, `akhar-test-${id}.pdf`);

  fs.writeFileSync(inputHtml, html, 'utf8');
  try {
    const scriptPath = path.join(process.cwd(), 'test/helpers/render-pdf.cjs');
    execFileSync('npx', ['electron', scriptPath, inputHtml, outputPdf, paperSize], {
      timeout: 20000,
      encoding: 'utf8',
    });
    return fs.readFileSync(outputPdf);
  } finally {
    if (fs.existsSync(inputHtml)) {
      try { fs.unlinkSync(inputHtml); } catch { /* ignore */ }
    }
    if (fs.existsSync(outputPdf)) {
      try { fs.unlinkSync(outputPdf); } catch { /* ignore */ }
    }
  }
}
