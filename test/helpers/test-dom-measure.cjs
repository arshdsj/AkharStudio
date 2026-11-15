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
      }
    </style>
  </head>
  <body><div id="container"></div></body>
  </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await win.webContents.executeJavaScript('document.fonts.ready');

  const testCases = [
    { text: '', width: 336 },
    { text: 'ਸੀਨ 1', width: 576 },
    { text: 'ਸ਼ਹਿਰ ਦੇ ਡਰੋਨ ਸ਼ੋਟ ਤੇ ਅਸੀਂ ਕਥਾਵਾਚਕ ਨੂੰ ਕਹਿੰਦੇ ਸੁਣਦੇ ਹਾਂ', width: 576 },
    { text: 'ਕਥਾਵਾਚਕ', width: 364.8 },
    { text: 'ਜੋ ਕੁਝ ਵੀ ਹੁੰਦਾ ਹੈ, ਉਹ ਸਭ ਪਹਿਲਾਂ ਤੋਂ ਹੀ ਲਿਖਿਆ ਹੋਇਆ ਹੈ। ਦੁਨੀਆ ਦਾ ਦਸਤੂਰ ਹੀ ਇਹੋ ਹੈ। ਹਰ ਨਿੱਕੀ ਤੋਂ ਨਿੱਕੀ ਗੱਲ ਪਹਿਲਾਂ ਤੋਂ ਤੈਅ ਹੈ। ਜੋ ਲਿਖਿਆ ਹੋਇਆ ਹੈ, ਉਸ ਤੋਂ ਬਾਹਰ ਕਦੇ ਕੁਝ ਨਹੀਂ ਵਾਪਰਦਾ।', width: 336 },
    { text: 'ਮਨਪਰੀਤ ਆਫਿਸ ਲਈ ਤਿਆਰ ਹੋ ਰਿਹਾ ਹੈ, ਓਹ ਸ਼ੀਸ਼ੇ ਮੂਹਰੇ ਖੜਾ ਕੱਪੜੇ ਪਾ ਰਿਹਾ ਹੈ, ਉਸਦੀ ਪਤਨੀ ', width: 576 },
    { text: 'ਲਾਈਨ 1\nਲਾਈਨ 2\nਲਾਈਨ 3', width: 336 },
    { text: 'ਊ ਲਾ ਲਾ ਲਾ ਤੂੰ ਹੈ ਮੇਰੀ fnatasy', width: 576 }
  ];

  const results = await win.webContents.executeJavaScript(`((testCases) => {
    const container = document.getElementById('container');

    function measureDom(text, widthPx) {
      if (!text || text.length === 0) {
        return [{ text: '', width: 0, height: 0, top: 0, start: 0, end: 0 }];
      }

      const div = document.createElement('div');
      div.style.width = widthPx + 'px';
      div.style.fontFamily = '"Courier Prime", "Noto Sans Gurmukhi", monospace';
      div.style.fontSize = '16px';
      div.style.lineHeight = '16px';
      div.style.textRendering = 'optimizeLegibility';
      div.style.fontKerning = 'normal';
      div.style.fontFeatureSettings = '"kern" 1, "liga" 1';
      div.style.webkitFontSmoothing = 'antialiased';
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordWrap = 'break-word';
      div.style.overflowWrap = 'break-word';
      div.style.margin = '0';
      div.style.padding = '0';
      div.style.border = 'none';
      div.style.boxSizing = 'border-box';
      div.textContent = text;
      container.appendChild(div);

      const lines = [];
      const textNode = div.firstChild;
      let lineStart = 0;
      let lastTop = null;

      for (let i = 1; i <= text.length; i++) {
        // If hard newline, line breaks immediately
        if (text[i - 1] === '\\n') {
          lines.push({
            text: text.slice(lineStart, i),
            start: lineStart,
            end: i
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
          const cr = crs[0];
          if (lastTop === null) {
            lastTop = cr.top;
          } else if (Math.abs(cr.top - lastTop) > 4) {
            // New line detected
            lines.push({
              text: text.slice(lineStart, i - 1),
              start: lineStart,
              end: i - 1
            });
            lineStart = i - 1;
            lastTop = cr.top;
          }
        }
      }

      if (lineStart <= text.length) {
        lines.push({
          text: text.slice(lineStart),
          start: lineStart,
          end: text.length
        });
      }

      container.removeChild(div);
      return lines;
    }

    return testCases.map(tc => ({
      input: tc.text.slice(0, 30),
      lines: measureDom(tc.text, tc.width)
    }));
  })(${JSON.stringify(testCases)})`);

  console.log('DOM MEASURE TEST RESULTS:');
  results.forEach(r => {
    console.log(`Input: "${r.input}" -> ${r.lines.length} lines:`);
    r.lines.forEach((l, i) => console.log(`   [${i}] "${l.text}" (start=${l.start}, end=${l.end})`));
  });

  app.quit();
});
