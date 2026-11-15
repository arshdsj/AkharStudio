const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-dev-shm-usage');

const watchdog = setTimeout(() => {
  console.error('Watchdog timeout: benchmark exceeded 30s');
  app.exit(1);
}, 30000);
if (watchdog.unref) watchdog.unref();

app.whenReady().then(async () => {
  try {
    const courierBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/CourierPrime.ttf')).toString('base64');
    const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/NotoSansGurmukhi.ttf')).toString('base64');
    const bundleJs = fs.readFileSync(path.join(__dirname, 'benchmark-electron-bundle.js'), 'utf8');

    const win = new BrowserWindow({
      show: false,
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @font-face {
      font-family: 'Courier Prime';
      src: url(data:font/truetype;charset=utf-8;base64,${courierBase64}) format('truetype');
      font-weight: normal;
      font-style: normal;
    }
    @font-face {
      font-family: 'Noto Sans Gurmukhi';
      src: url(data:font/truetype;charset=utf-8;base64,${gurmukhiBase64}) format('truetype');
      font-weight: 100 900;
      font-style: normal;
    }
    body {
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      font-size: 16px;
      line-height: 20px;
    }
  </style>
</head>
<body>
  <div id="test-root"></div>
  <script>${bundleJs}</script>
</body>
</html>`;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await win.webContents.executeJavaScript('document.fonts.ready');

    const result = await win.webContents.executeJavaScript('BenchmarkRunner.runRealElectronBenchmark()');

    console.log('\n================ REAL ELECTRON CHROME COLD-PATH TIMINGS ================');
    console.log(`Runs per benchmark: ${result.runs} (Measured inside real Electron with real fonts)`);
    console.log('-------------------------------------------------------------------------');
    console.log('1. Open-Time Pagination (Empty Cache, Real TrueType Fonts):');
    console.log(`   -   5-page script:   p50 = ${result.cold.p5.p50} ms | p95 = ${result.cold.p5.p95} ms`);
    console.log(`   -  35-page script:   p50 = ${result.cold.p35.p50} ms | p95 = ${result.cold.p35.p95} ms`);
    console.log(`   - 117-page script:   p50 = ${result.cold.p117.p50} ms | p95 = ${result.cold.p117.p95} ms`);
    console.log('-------------------------------------------------------------------------');
    console.log('2. Full-Script Paste Reflow (Live Editor State, Real TrueType Fonts):');
    console.log(`   -   5-page script:   p50 = ${result.paste.p5.p50} ms | p95 = ${result.paste.p5.p95} ms`);
    console.log(`   -  35-page script:   p50 = ${result.paste.p35.p50} ms | p95 = ${result.paste.p35.p95} ms`);
    console.log(`   - 117-page script:   p50 = ${result.paste.p117.p50} ms | p95 = ${result.paste.p117.p95} ms`);
    console.log('-------------------------------------------------------------------------');
    console.log('3. Re-measure Time after Fonts Load (invalidateFonts, Real TrueType Fonts):');
    console.log(`   -   5-page script:   p50 = ${result.remeasure.p5.p50} ms | p95 = ${result.remeasure.p5.p95} ms`);
    console.log(`   -  35-page script:   p50 = ${result.remeasure.p35.p50} ms | p95 = ${result.remeasure.p35.p95} ms`);
    console.log(`   - 117-page script:   p50 = ${result.remeasure.p117.p50} ms | p95 = ${result.remeasure.p117.p95} ms`);
    console.log('-------------------------------------------------------------------------');
    console.log('4. Keystroke Latency in Live ProseMirror View (Real TrueType Fonts):');
    console.log('   - 5-page script:');
    console.log(`       Typing (Middle Block):    p50 = ${result.keystroke.p5.typingMiddle.p50} ms | p95 = ${result.keystroke.p5.typingMiddle.p95} ms`);
    console.log(`       Typing (Page Boundary):   p50 = ${result.keystroke.p5.typingBoundary.p50} ms | p95 = ${result.keystroke.p5.typingBoundary.p95} ms`);
    console.log(`       Deleting (Backspace):     p50 = ${result.keystroke.p5.deleting.p50} ms | p95 = ${result.keystroke.p5.deleting.p95} ms`);
    console.log('   - 35-page script:');
    console.log(`       Typing (Middle Block):    p50 = ${result.keystroke.p35.typingMiddle.p50} ms | p95 = ${result.keystroke.p35.typingMiddle.p95} ms`);
    console.log(`       Typing (Page Boundary):   p50 = ${result.keystroke.p35.typingBoundary.p50} ms | p95 = ${result.keystroke.p35.typingBoundary.p95} ms`);
    console.log(`       Deleting (Backspace):     p50 = ${result.keystroke.p35.deleting.p50} ms | p95 = ${result.keystroke.p35.deleting.p95} ms`);
    console.log('   - 117-page script:');
    console.log(`       Typing (Middle Block):    p50 = ${result.keystroke.p117.typingMiddle.p50} ms | p95 = ${result.keystroke.p117.typingMiddle.p95} ms`);
    console.log(`       Typing (Page Boundary):   p50 = ${result.keystroke.p117.typingBoundary.p50} ms | p95 = ${result.keystroke.p117.typingBoundary.p95} ms`);
    console.log(`       Deleting (Backspace):     p50 = ${result.keystroke.p117.deleting.p50} ms | p95 = ${result.keystroke.p117.deleting.p95} ms`);
    console.log('-------------------------------------------------------------------------');
    console.log('5. Time-to-First-Keystroke Opening 117-Page Script (Real TrueType Fonts):');
    console.log(`   - Synchronous Open:   p50 = ${result.ttfk.sync.p50} ms | p95 = ${result.ttfk.sync.p95} ms`);
    console.log(`   - Deferred Open:      p50 = ${result.ttfk.deferred.p50} ms | p95 = ${result.ttfk.deferred.p95} ms`);
    console.log('-------------------------------------------------------------------------');
    console.log('6. Bold Gurmukhi Line Break Parity Test:');
    console.log(`   - Text: "${result.boldGurmukhiTest.sampleText}"`);
    console.log(`   - Bold Word: "${result.boldGurmukhiTest.boldWord}"`);
    console.log(`   - Plain DOM Lines (${result.boldGurmukhiTest.domPlainLines.length}): ${JSON.stringify(result.boldGurmukhiTest.domPlainLines)}`);
    console.log(`   - Bold DOM Lines (${result.boldGurmukhiTest.domBoldLines.length}):  ${JSON.stringify(result.boldGurmukhiTest.domBoldLines)}`);
    console.log(`   - Bold Engine Lines (${result.boldGurmukhiTest.engineBoldLines.length}): ${JSON.stringify(result.boldGurmukhiTest.engineBoldLines)}`);
    console.log(`   - Bold PDF Lines (${result.boldGurmukhiTest.pdfBoldLines.length}):    ${JSON.stringify(result.boldGurmukhiTest.pdfBoldLines)}`);
    console.log(`   - Line break changed by bold: ${result.boldGurmukhiTest.lineBreakChangedByBold}`);
    console.log(`   - DOM vs Engine 100% Parity:  ${result.boldGurmukhiTest.domEngineParity}`);
    console.log(`   - Engine vs PDF 100% Parity:  ${result.boldGurmukhiTest.enginePdfParity}`);
    console.log('=========================================================================\n');

    const outputFile = process.argv[2];
    if (outputFile) {
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
    }

    clearTimeout(watchdog);
    app.quit();
  } catch (err) {
    console.error('Real Electron benchmark failed:', err);
    app.exit(1);
  }
});
