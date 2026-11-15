const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  try {
    const courierBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/CourierPrime.ttf')).toString('base64');
    const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/NotoSansGurmukhi.ttf')).toString('base64');
    const blocks = JSON.parse(fs.readFileSync('/tmp/prarbadh_blocks.json', 'utf8'));

    // Create window with preload for editor inspection
    const win = new BrowserWindow({
      width: 1200,
      height: 900,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../../dist-electron/preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await win.loadFile(path.join(__dirname, '../../dist/index.html'));

    // Click prarbadh project
    for (let i = 0; i < 50; i++) {
      const clicked = await win.webContents.executeJavaScript(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('prarbadh'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (clicked) break;
      await new Promise(r => setTimeout(r, 100));
    }

    // Wait for blocks to load into ProseMirror
    for (let i = 0; i < 50; i++) {
      const count = await win.webContents.executeJavaScript(`document.querySelectorAll('.screenplay-block').length`);
      if (count > 10) break;
      await new Promise(r => setTimeout(r, 100));
    }

    await win.webContents.executeJavaScript('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));

    // Capture Editor metrics
    const editorData = await win.webContents.executeJavaScript(`(() => {
      const pm = document.querySelector('.ProseMirror');
      const pmStyle = window.getComputedStyle(pm);
      const blocks = Array.from(document.querySelectorAll('.screenplay-block'));

      const blockMetrics = blocks.map((el, i) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const clientRects = Array.from(range.getClientRects());
        return {
          index: i,
          className: el.className,
          text: el.textContent.slice(0, 30),
          fullText: el.textContent,
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
        return {
          index: i,
          top: rect.top,
          text: el.textContent.trim(),
          prevText: el.previousElementSibling ? el.previousElementSibling.textContent.trim() : null,
          nextText: el.nextElementSibling ? el.nextElementSibling.textContent.trim() : null,
        };
      });

      return {
        pmFontSize: pmStyle.fontSize,
        pmLineHeight: pmStyle.lineHeight,
        blockMetrics,
        pageBreaks,
      };
    })()`);

    console.log('=== EDITOR DATA CAPTURED ===');
    console.log('PM Font Size:', editorData.pmFontSize);
    console.log('PM Line Height:', editorData.pmLineHeight);
    console.log('Page Breaks:', JSON.stringify(editorData.pageBreaks, null, 2));

    app.quit();
  } catch (err) {
    console.error('Test error:', err);
    app.exit(1);
  }
});
