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
        padding: 20px;
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
  <body></body>
  </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await win.webContents.executeJavaScript('document.fonts.ready');

  const res = await win.webContents.executeJavaScript(`(() => {
    const text = 'ਜੋ ਕੁਝ ਵੀ ਹੁੰਦਾ ਹੈ, ਉਹ ਸਭ ਪਹਿਲਾਂ ਤੋਂ ਹੀ ਲਿਖਿਆ ਹੋਇਆ ਹੈ। ਦੁਨੀਆ ਦਾ ਦਸਤੂਰ ਹੀ ਇਹੋ ਹੈ। ਹਰ ਨਿੱਕੀ ਤੋਂ ਨਿੱਕੀ ਗੱਲ ਪਹਿਲਾਂ ਤੋਂ ਤੈਅ ਹੈ। ਜੋ ਲਿਖਿਆ ਹੋਇਆ ਹੈ, ਉਸ ਤੋਂ ਬਾਹਰ ਕਦੇ ਕੁਝ ਨਹੀਂ ਵਾਪਰਦਾ।';
    const div = document.createElement('div');
    div.style.width = '336px'; // 3.5in
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.textContent = text;
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);
    const rects = Array.from(range.getClientRects());

    // Let's also extract the exact line text for each line by walking character by character or word by word
    // How does Range.getClientRects() map to line strings?
    // Let's find character indices at line breaks:
    const lines = [];
    const textNode = div.firstChild;
    let lineStart = 0;
    let lastTop = null;

    for (let i = 1; i <= text.length; i++) {
      const r = document.createRange();
      r.setStart(textNode, i - 1);
      r.setEnd(textNode, i);
      const cr = r.getClientRects()[0];
      if (cr) {
        if (lastTop === null) {
          lastTop = cr.top;
        } else if (Math.abs(cr.top - lastTop) > 4) {
          // Line break occurred before index i-1!
          // We can find where the word break was:
          lines.push({ start: lineStart, end: i - 1, text: text.slice(lineStart, i - 1) });
          lineStart = i - 1;
          lastTop = cr.top;
        }
      }
    }
    if (lineStart < text.length) {
      lines.push({ start: lineStart, end: text.length, text: text.slice(lineStart) });
    }

    return {
      rectsCount: rects.length,
      rects: rects.map(r => ({ top: r.top, bottom: r.bottom, height: r.height, width: r.width })),
      lines
    };
  })()`);

  console.log('Result:', JSON.stringify(res, null, 2));
  app.quit();
});
