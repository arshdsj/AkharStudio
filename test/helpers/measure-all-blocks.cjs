const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  const courierBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/CourierPrime.ttf')).toString('base64');
  const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/NotoSansGurmukhi.ttf')).toString('base64');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      @font-face {
        font-family: 'Courier Prime';
        src: url(data:font/truetype;charset=utf-8;base64,${courierBase64}) format('truetype');
      }
      @font-face {
        font-family: 'Noto Sans Gurmukhi';
        src: url(data:font/truetype;charset=utf-8;base64,${gurmukhiBase64}) format('truetype');
      }
      body {
        margin: 0;
        padding: 0;
        font-family: "Courier Prime", "Noto Sans Gurmukhi", monospace;
        font-size: 16px;
        line-height: 16px;
        text-rendering: optimizeLegibility;
        font-kerning: normal;
        font-feature-settings: "kern" 1, "liga" 1;
        -webkit-font-smoothing: antialiased;
      }
    </style>
  </head>
  <body><div id="measure-root"></div></body>
  </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await win.webContents.executeJavaScript('document.fonts.ready');

  const blocksJsonPath = '/tmp/prarbadh_blocks.json';
  const blocks = JSON.parse(fs.readFileSync(blocksJsonPath, 'utf8'));

  const result = await win.webContents.executeJavaScript(`((blocks) => {
    const root = document.getElementById('measure-root');
    const widths = {
      scene_heading: 576,
      action: 576,
      character: 364.8, // 576 - 211.2
      parenthetical: 211.2,
      dialogue: 336, // 3.5in
      transition: 192,
      shot: 576
    };

    const blockResults = [];

    for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
      const block = blocks[bIdx];
      const div = document.createElement('div');
      const w = widths[block.type] || 576;
      div.style.width = w + 'px';
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordWrap = 'break-word';
      div.style.overflowWrap = 'break-word';
      div.style.fontSize = '16px';
      div.style.lineHeight = '16px';
      div.style.fontFamily = '"Courier Prime", "Noto Sans Gurmukhi", monospace';
      div.style.textRendering = 'optimizeLegibility';
      div.style.fontKerning = 'normal';
      div.style.fontFeatureSettings = '"kern" 1, "liga" 1';
      div.style.webkitFontSmoothing = 'antialiased';
      div.style.padding = '0';
      div.style.margin = '0';
      div.style.border = 'none';

      const text = block.text;
      div.textContent = text || '';
      root.appendChild(div);

      // Extract lines using Range
      const lines = [];
      if (!text || text.length === 0) {
        lines.push({ text: '', width: 0 });
      } else {
        const textNode = div.firstChild;
        let lineStart = 0;
        let lastTop = null;

        for (let i = 1; i <= text.length; i++) {
          const r = document.createRange();
          r.setStart(textNode, i - 1);
          r.setEnd(textNode, i);
          const crs = r.getClientRects();
          if (crs.length > 0) {
            const cr = crs[0];
            if (lastTop === null) {
              lastTop = cr.top;
            } else if (Math.abs(cr.top - lastTop) > 4) {
              // Word break / line break
              lines.push({ text: text.slice(lineStart, i - 1) });
              lineStart = i - 1;
              lastTop = cr.top;
            }
          }
        }
        if (lineStart <= text.length) {
          lines.push({ text: text.slice(lineStart) });
        }
      }

      const rect = div.getBoundingClientRect();
      blockResults.push({
        index: bIdx,
        id: block.id,
        type: block.type,
        rawText: text,
        domHeight: rect.height,
        lineCount: lines.length,
        lines: lines.map(l => l.text)
      });

      root.removeChild(div);
    }

    return blockResults;
  })(${JSON.stringify(blocks)})`);

  console.log('MEASURED BLOCKS:');
  result.forEach(b => {
    console.log(`[${b.index}] (${b.type}) lines=${b.lineCount} height=${b.domHeight} text="${b.rawText.slice(0, 30)}"`);
    b.lines.forEach((l, li) => console.log(`   L${li}: "${l}"`));
  });

  app.quit();
});
