const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Configure headless stability switches to prevent GPU hang
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-dev-shm-usage');

// Hard watchdog timer: abort process after 25s if Electron window hangs
const watchdog = setTimeout(() => {
  console.error('Watchdog timeout: Electron geometry script did not finish within 25 seconds');
  app.exit(1);
}, 25000);
if (watchdog.unref) watchdog.unref();

app.whenReady().then(async () => {
  try {
    const courierBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/CourierPrime.ttf')).toString('base64');
    const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/NotoSansGurmukhi.ttf')).toString('base64');
    const indexCss = fs.readFileSync(path.join(__dirname, '../../src/renderer/index.css'), 'utf8');

    const outputFile = process.argv[2];

    function createHtml(paperSize, zoom, blocks) {
      const isA4 = paperSize === 'a4';
      const widthPx = isA4 ? 793.7 : 816;
      const heightPx = isA4 ? 1122.5 : 1056;
      const scale = zoom / 100;

      // Group blocks into simulated pages or render discrete page boxes matching ScreenplayCanvas
      return `<!DOCTYPE html>
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
    ${indexCss}

    body {
      margin: 0;
      padding: 0;
      background: #09090b;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .canvas-container {
      transform-origin: top center;
      transform: scale(${scale});
    }

    .screenplay-page-box {
      width: ${widthPx}px;
      height: ${heightPx}px;
      background: #18181b;
      color: #fafafa;
      position: relative;
      box-sizing: border-box;
      overflow: visible;
      margin-bottom: 36px;
    }

    .screenplay-page-box:last-child {
      margin-bottom: 0px;
    }

    .page-content-flow {
      padding: 96px 96px 96px 144px; /* 1in top/bottom/right, 1.5in left */
      box-sizing: border-box;
      height: 100%;
    }

    .first-block-top {
      margin-top: 0px !important;
    }
  </style>
</head>
<body>
  <div class="canvas-container">
    ${blocks}
  </div>
</body>
</html>`;
    }

    const win = new BrowserWindow({
      show: false,
      width: 1400,
      height: 1200,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const results = {};

    // 1. Measure Letter (100% zoom, 2 pages)
    const letterContent = `
      <div class="screenplay-page-box" data-page="1">
        <div class="page-content-flow">
          <div class="screenplay-block block-scene_heading first-block-top">INT. LIVING ROOM - DAY</div>
          <div class="screenplay-block block-action">First action paragraph on Letter page 1.</div>
          <div class="screenplay-block block-character">ਮਨਪਰੀਤ</div>
          <div class="screenplay-block block-dialogue">ਲੋ ਜੀ ਭੱਜ ਲੋ ਜੀ।</div>
          <div class="screenplay-block block-action">Last action line on Letter page 1.</div>
        </div>
      </div>
      <div class="screenplay-page-box" data-page="2">
        <div class="page-content-flow">
          <div class="screenplay-block block-character first-block-top">ਪਤਨੀ</div>
          <div class="screenplay-block block-dialogue">ਹੋ ਜੀ ਕਿ ਜੀ।</div>
        </div>
      </div>
    `;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createHtml('letter', 100, letterContent))}`);
    await win.webContents.executeJavaScript('document.fonts.ready');

    results.letter = await win.webContents.executeJavaScript(`(() => {
      const boxes = Array.from(document.querySelectorAll('.screenplay-page-box'));
      return boxes.map((box, idx) => {
        const bRect = box.getBoundingClientRect();
        const firstBlock = box.querySelector('.screenplay-block');
        const lastBlock = box.querySelectorAll('.screenplay-block')[box.querySelectorAll('.screenplay-block').length - 1];
        
        const firstRect = firstBlock ? firstBlock.getBoundingClientRect() : null;
        const lastRect = lastBlock ? lastBlock.getBoundingClientRect() : null;

        return {
          page: idx + 1,
          offsetWidth: box.offsetWidth,
          offsetHeight: box.offsetHeight,
          rectWidth: bRect.width,
          rectHeight: bRect.height,
          firstLineFromTop: firstRect ? (firstRect.top - bRect.top) : null,
          lastLineToBottom: lastRect ? (bRect.bottom - lastRect.bottom) : null,
        };
      });
    })()`);

    // 2. Measure A4 (100% zoom, 2 pages)
    const a4Content = `
      <div class="screenplay-page-box" data-page="1">
        <div class="page-content-flow">
          <div class="screenplay-block block-scene_heading first-block-top">EXT. COUNTRYSIDE - DAY</div>
          <div class="screenplay-block block-action">Action on A4 paper sheet.</div>
        </div>
      </div>
      <div class="screenplay-page-box" data-page="2">
        <div class="page-content-flow">
          <div class="screenplay-block block-action first-block-top">Second page action on A4.</div>
        </div>
      </div>
    `;

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createHtml('a4', 100, a4Content))}`);
    await win.webContents.executeJavaScript('document.fonts.ready');

    results.a4 = await win.webContents.executeJavaScript(`(() => {
      const boxes = Array.from(document.querySelectorAll('.screenplay-page-box'));
      return boxes.map((box, idx) => {
        const bRect = box.getBoundingClientRect();
        const firstBlock = box.querySelector('.screenplay-block');
        const lastBlock = box.querySelectorAll('.screenplay-block')[box.querySelectorAll('.screenplay-block').length - 1];
        
        const firstRect = firstBlock ? firstBlock.getBoundingClientRect() : null;
        const lastRect = lastBlock ? lastBlock.getBoundingClientRect() : null;

        return {
          page: idx + 1,
          offsetWidth: box.offsetWidth,
          offsetHeight: box.offsetHeight,
          rectWidth: bRect.width,
          rectHeight: bRect.height,
          firstLineFromTop: firstRect ? (firstRect.top - bRect.top) : null,
          lastLineToBottom: lastRect ? (bRect.bottom - lastRect.bottom) : null,
        };
      });
    })()`);

    // 3. Measure Unscaled Zoom (75% and 150%)
    for (const zoom of [75, 150]) {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createHtml('letter', zoom, letterContent))}`);
      await win.webContents.executeJavaScript('document.fonts.ready');

      results[`zoom_${zoom}`] = await win.webContents.executeJavaScript(`(() => {
        const box = document.querySelector('.screenplay-page-box');
        const bRect = box.getBoundingClientRect();
        const scale = ${zoom} / 100;
        return {
          zoom: ${zoom},
          scale,
          offsetWidth: box.offsetWidth,
          offsetHeight: box.offsetHeight,
          rectWidth: bRect.width,
          rectHeight: bRect.height,
          unscaledFromRectWidth: Number((bRect.width / scale).toFixed(2)),
          unscaledFromRectHeight: Number((bRect.height / scale).toFixed(2)),
        };
      })()`);
    }

    if (outputFile) {
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf8');
    } else {
      console.log('RESULTS_JSON:' + JSON.stringify(results));
    }

    app.quit();
  } catch (err) {
    console.error('Geometry verification error:', err);
    app.exit(1);
  }
});
