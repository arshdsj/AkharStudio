const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 900, height: 1200 });
  const courierBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/CourierPrime.ttf')).toString('base64');
  const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/NotoSansGurmukhi.ttf')).toString('base64');

  const blocks = JSON.parse(fs.readFileSync('/tmp/prarbadh_blocks.json', 'utf8'));

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
        padding: 40px;
        background: #ffffff;
        color: #000000;
        font-family: "Courier Prime", "Noto Sans Gurmukhi", monospace;
        font-size: 16px;
        line-height: 16px;
        text-rendering: optimizeLegibility;
        font-kerning: normal;
        font-feature-settings: "kern" 1, "liga" 1;
        -webkit-font-smoothing: antialiased;
      }
      .screenplay-block {
        font-size: 16px;
        line-height: 16px;
        overflow: visible;
        margin-bottom: 16px;
      }
      .block-dialogue {
        margin-left: 96px;
        max-width: 336px;
        margin-bottom: 16px;
      }
      .block-character {
        margin-left: 211.2px;
        margin-bottom: 0px;
        margin-top: 16px;
      }
      .block-action {
        max-width: 576px;
        margin-bottom: 16px;
      }
    </style>
  </head>
  <body>
    <div id="content"></div>
  </body>
  </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await win.webContents.executeJavaScript('document.fonts.ready');

  const check = await win.webContents.executeJavaScript(`((blocks) => {
    const root = document.getElementById('content');
    blocks.forEach((b, i) => {
      const p = document.createElement('div');
      p.className = 'screenplay-block block-' + b.type.replace('_', '-');
      p.textContent = b.text || '';
      p.id = 'b-' + i;
      root.appendChild(p);
    });

    // Check multiline dialogue for vertical mark overlap
    // For each block, check each line's actual bounding box or ink
    const dial = document.getElementById('b-3');
    const range = document.createRange();
    range.selectNodeContents(dial);
    const rects = Array.from(range.getClientRects());
    return {
      dialRects: rects.map(r => ({ top: r.top, bottom: r.bottom, height: r.height }))
    };
  })(${JSON.stringify(blocks)})`);

  console.log('Collision check:', JSON.stringify(check, null, 2));

  const image = await win.capturePage();
  fs.writeFileSync('/tmp/ink_test.png', image.toPNG());
  console.log('Saved /tmp/ink_test.png');
  app.quit();
});
