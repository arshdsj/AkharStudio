import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { generateUnifiedScreenplayPdfHtml } from '../../src/core/export/pdfExporter';
import { LINE_PITCH_PX } from '../../src/core/layout/screenplayGeometry';
import { ScriptDraft, TitleMetadata } from '../../src/types/screenplay';

app.whenReady().then(async () => {
  try {
    const courierBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/CourierPrime.ttf')).toString('base64');
    const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/NotoSansGurmukhi.ttf')).toString('base64');
    const blocks = JSON.parse(fs.readFileSync('/tmp/prarbadh_blocks.json', 'utf8'));

    const draft: ScriptDraft = {
      id: 'e374dc53-3c6a-4ab4-a886-cb5797c8f3ca',
      name: 'Main Draft',
      isMain: true,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      blocks,
    };

    const metadata = {
      title: 'prarbadh',
      author: 'Author',
    } as TitleMetadata;

    // -------------------------------------------------------------------------
    // Step 1: Open real Electron editor and inspect live DOM
    // -------------------------------------------------------------------------
    const editorWin = new BrowserWindow({
      width: 1200,
      height: 900,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../../dist-electron/preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await editorWin.loadFile(path.join(__dirname, '../../dist/index.html'));

    // Wait and click prarbadh project button
    for (let i = 0; i < 50; i++) {
      const clicked = await editorWin.webContents.executeJavaScript(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('prarbadh'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (clicked) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // Wait for blocks to load into ProseMirror
    for (let i = 0; i < 50; i++) {
      const count = await editorWin.webContents.executeJavaScript(`document.querySelectorAll('.screenplay-block').length`);
      if (count > 10) break;
      await new Promise(r => setTimeout(r, 100));
    }

    await editorWin.webContents.executeJavaScript('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));

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

    await new Promise(r => setTimeout(r, 300));
    const editorScreenshot = await editorWin.capturePage();
    fs.writeFileSync('/tmp/new_editor.png', editorScreenshot.toPNG());
    console.log('Saved editor screenshot to /tmp/new_editor.png');
    editorWin.close();

    // -------------------------------------------------------------------------
    // Step 2: Extract Pure Pagination Engine Result from Ground-Truth Live Editor
    // -------------------------------------------------------------------------
    const paginationResult = editorMetrics.paginationResult;
    if (!paginationResult) {
      throw new Error('paginationResult not found in editor metrics');
    }

    console.log('Pagination Result Pages:', paginationResult.pages.length);

    // -------------------------------------------------------------------------
    // Step 3: Render and inspect PDF Export HTML
    // -------------------------------------------------------------------------
    const pdfHtml = generateUnifiedScreenplayPdfHtml(draft, metadata, {
      paperSize: 'letter',
      includeTitlePage: true,
      courierFontBase64: courierBase64,
      gurmukhiFontBase64: gurmukhiBase64,
      useUnifiedPagination: true,
      paginationResult,
    });

    const pdfWin = new BrowserWindow({
      width: 816,
      height: 1056,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pdfHtml)}`);
    await pdfWin.webContents.executeJavaScript('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));

    // Print to PDF
    const pdfBuffer = await pdfWin.webContents.printToPDF({
      pageSize: 'Letter',
      margins: { marginType: 'none' },
      preferCSSPageSize: true,
      printBackground: true,
    });
    fs.writeFileSync('/tmp/Our_Export_Fixed.pdf', pdfBuffer);
    console.log('Saved exported PDF to /tmp/Our_Export_Fixed.pdf');

    // Inspect rendered PDF sheets in DOM
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

    console.log('=== PDF INSPECTION REPORTS ===');
    console.log(JSON.stringify(pdfInspection, null, 2));

    // Capture screenshot of Script Page 1 (Sheet 1)
    await pdfWin.webContents.executeJavaScript(`(() => {
      const sheets = document.querySelectorAll('.page-sheet');
      if (sheets.length > 1) {
        sheets[1].scrollIntoView();
      }
    })()`);
    await new Promise(r => setTimeout(r, 300));
    const pdfPageScreenshot = await pdfWin.capturePage();
    fs.writeFileSync('/tmp/new_pdf_page1.png', pdfPageScreenshot.toPNG());
    console.log('Saved PDF page image to /tmp/new_pdf_page1.png');
    pdfWin.close();

    // -------------------------------------------------------------------------
    // Step 4: Verification and Per-Block Comparison Table
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('                  PER-BLOCK GEOMETRY & PARITY TABLE');
    console.log('========================================================================');
    console.log('Idx | Block Type      | Text Snapshot                  | Eng H | DOM H | Diff   | Eng L | DOM L | PDF L | Status');
    console.log('----+-----------------+--------------------------------+-------+-------+--------+-------+-------+-------+-------');

    const failures: string[] = [];

    // Pre-extract PDF block line counts across all sheets
    const pdfBlockLinesMap = new Map<string, number>();
    pdfInspection.forEach((s: any) => {
      s.blockLineCounts.forEach((b: any) => {
        pdfBlockLinesMap.set(b.id, (pdfBlockLinesMap.get(b.id) || 0) + b.lineCount);
      });
    });

    // Engine block lines
    const engineLinesMap = new Map<string, number>();
    paginationResult.pages.forEach((p: any) => {
      p.slots.forEach((s: any) => {
        if (s.kind === 'text') {
          engineLinesMap.set(s.blockId, (engineLinesMap.get(s.blockId) || 0) + 1);
        }
      });
    });

    editorMetrics.blockReports.forEach((domBlock: any, idx: number) => {
      const block = blocks[idx];
      const engLines = engineLinesMap.get(block.id) || 0;
      const domLines = domBlock.clientRectsCount;
      const pdfLines = pdfBlockLinesMap.get(block.id) || 0;

      // In target geometry: Courier Prime 12pt = 16px line pitch.
      // Expected block height = lines * 16px (overflow: visible)
      const expectedHeight = engLines * LINE_PITCH_PX;
      const actualHeight = domBlock.rectHeight;
      const diff = Math.abs(expectedHeight - actualHeight);

      let status = 'PASS';
      if (diff > 0.5) {
        status = 'FAIL-H';
        failures.push(`Block ${idx} height diff ${diff.toFixed(2)}px > 0.5px`);
      }
      if (domLines !== engLines) {
        status = 'FAIL-L';
        failures.push(`Block ${idx} DOM lines (${domLines}) != engine lines (${engLines})`);
      }
      if (pdfLines !== engLines && block.text.trim().length > 0) {
        status = 'FAIL-PDF';
        failures.push(`Block ${idx} PDF lines (${pdfLines}) != engine lines (${engLines})`);
      }

      const typeStr = block.type.padEnd(15);
      const textStr = (block.text.trim().replace(/\n/g, ' ') || '<empty>').slice(0, 30).padEnd(30);
      console.log(
        `${String(idx).padStart(3)} | ${typeStr} | ${textStr} | ${String(expectedHeight).padStart(5)} | ${actualHeight.toFixed(1).padStart(5)} | ${diff.toFixed(2).padStart(6)} | ${String(engLines).padStart(5)} | ${String(domLines).padStart(5)} | ${String(pdfLines).padStart(5)} | ${status}`
      );
    });

    console.log('========================================================================\n');

    // -------------------------------------------------------------------------
    // Step 5: Verify Acceptance Criteria
    // -------------------------------------------------------------------------
    console.log('VERIFYING ACCEPTANCE CRITERIA:');

    // Acceptance 1: Font size checks
    console.log(`1. Editor PM font-size: ${editorMetrics.pmFontSize} (expected 16px)`);
    if (editorMetrics.pmFontSize !== '16px') {
      failures.push(`Editor font size is ${editorMetrics.pmFontSize}, expected 16px`);
    }

    const scriptPdfSheet = pdfInspection.find((s: any) => !s.isTitlePage);
    console.log(`   PDF Line font-size: ${scriptPdfSheet?.lineFontSize} (expected 16px)`);
    if (scriptPdfSheet?.lineFontSize !== '16px') {
      failures.push(`PDF font size is ${scriptPdfSheet?.lineFontSize}, expected 16px`);
    }

    // Acceptance 2: PDF Page Bounds
    // Lowest text bottom must be <= page height - 72pt (+0.5pt) = 720.5pt
    // Top text >= 72pt (-0.5pt) = 71.5pt
    pdfInspection.forEach((s: any) => {
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

    // Acceptance 3: Page Break Position
    console.log('3. Page Break Position:');
    const pb = editorMetrics.pageBreaks[0];
    console.log(`   Before break: "${pb?.prevSiblingText}"`);
    console.log(`   After break:  "${pb?.nextSiblingText}"`);
    if (!pb?.prevSiblingText?.includes('ਓਕ')) {
      failures.push(`Expected page 1 to end with ਓਕ, got "${pb?.prevSiblingText}"`);
    }
    if (!pb?.nextSiblingText?.includes('ਪਤਨੀ')) {
      failures.push(`Expected page 2 to start with ਪਤਨੀ, got "${pb?.nextSiblingText}"`);
    }

    if (failures.length > 0) {
      console.error('\nACCEPTANCE TEST FAILURES:');
      failures.forEach(f => console.error('  - ' + f));
      app.exit(1);
    } else {
      console.log('\n>>> ALL ACCEPTANCE TESTS PASSED PERFECTLY! <<<');
      app.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during acceptance test:', err);
    app.exit(1);
  }
});
