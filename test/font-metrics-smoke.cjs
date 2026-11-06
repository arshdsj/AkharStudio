const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 400, height: 400 });
  const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');
  const fontB64 = fs.readFileSync(fontPath).toString('base64');

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <style>
      @font-face {
        font-family: 'Noto Sans Gurmukhi';
        src: url(data:font/truetype;charset=utf-8;base64,${fontB64}) format('truetype');
      }
    </style>
  </head>
  <body>
    <script>
      async function test() {
        await document.fonts.ready;
        const loaded = document.fonts.check('12pt "Noto Sans Gurmukhi"');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '16px "Noto Sans Gurmukhi", sans-serif'; // 12pt = 16px
        const m1 = ctx.measureText('ਕ੍ਰਿੱਪਾ');
        const m2 = ctx.measureText('ਪ੍ਰੋਗਰਾਮ');
        return {
          loaded,
          width1Pt: m1.width * 72 / 96,
          width2Pt: m2.width * 72 / 96,
          hasAscent: typeof m1.actualBoundingBoxAscent === 'number'
        };
      }
      test().then(r => {
        console.log('M1A_SMOKE:' + JSON.stringify(r) + 'END_M1A_SMOKE');
      }).catch(err => {
        console.error('M1A_ERROR:' + String(err));
      });
    </script>
  </body>
  </html>`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  win.webContents.on('console-message', (ev, lvl, msg) => {
    if (msg.includes('M1A_SMOKE:')) {
      process.stdout.write(msg + '\n');
      app.exit(0);
    } else if (msg.includes('M1A_ERROR:')) {
      process.stderr.write(msg + '\n');
      app.exit(1);
    }
  });
});
