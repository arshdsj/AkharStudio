const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const fontPath = path.resolve(process.cwd(), 'public/fonts/NotoSansGurmukhi.ttf');
  const fontBase64 = fs.readFileSync(fontPath).toString('base64');

  const combinations = [
    { id: 1, text: "ਕ੍ਰਿੱਪਾ", desc: "Virama + Rakar + Sihari + Addak" },
    { id: 2, text: "ਗੁੰਝਲ਼ਦਾਰ", desc: "Aunkad + Tippi + Nukta" },
    { id: 3, text: "ਪ੍ਰੋਗਰਾਮਾਂ", desc: "Rakar + Hora + Kanna + Bindi" },
    { id: 4, text: "ਉੱਲੂ", desc: "Addak + Dulainkar" },
    { id: 5, text: "ਕਿਉਂਕਿ", desc: "Sihari + Bindi + Sihari" },
    { id: 6, text: "ਤ੍ਰਿਸ਼ਨਾ", desc: "Rakar + Sihari + Nukta" },
    { id: 7, text: "ਸੰਪੂਰਨ", desc: "Tippi + Dulainkar" },
    { id: 8, text: "ਕ੍ਰੂ਼", desc: "Rakar + Dulainkar + Nukta", extremeDesc: true },
    { id: 9, text: "ਪ੍ਰ੍ਹ", desc: "Dual subjoined Rakar + Haha" },
    { id: 10, text: "ਸ੍ਰੀ", desc: "Rakar + Bihari" },
    { id: 11, text: "ਕ੍ਹ", desc: "Subjoined Pairin Haha" },
    { id: 12, text: "ਮ੍ਹ", desc: "Subjoined Pairin Haha with Ma" },
    { id: 13, text: "ਕ੍ਵ", desc: "Subjoined Pairin Vava" },
    { id: 14, text: "ਚੌਂਕੀਦਾਰ", desc: "Kanaura + Bindi + Bihari" },
    { id: 15, text: "ਮੈਂਡੇਲੀਫ਼", desc: "Dulaanv + Bindi + Nukta" },
    { id: 16, text: "ਨਿਊਕਲੀਅਰ", desc: "Sihari + Dulainkar + Bihari" },
    { id: 17, text: "ਝਿੜਕਿਆ", desc: "Sihari + Rara Nukta + Sihari" },
    { id: 18, text: "ਅੰਮ੍ਰਿਤਸਰ", desc: "Tippi + Rakar + Sihari" },
    { id: 19, text: "ਖ਼ੁਸ਼ਫ਼ਹਿਮੀਆਂ", desc: "Triple Nuktas + Aunkad + Sihari + Bindi" },
    { id: 20, text: "ਦ੍ਰਿਸ਼ਟੀਕੋਣ", desc: "Rakar + Sihari + Nukta + Bihari + Hora" }
  ];

  const html = `<!DOCTYPE html>
  <html>
  <head>
    <style>
      @font-face {
        font-family: 'Noto Sans Gurmukhi';
        src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    </style>
  </head>
  <body>
    <script>
      async function runMeasurements() {
        await document.fonts.ready;
        const fontLoaded = document.fonts.check('12pt "Noto Sans Gurmukhi"');
        if (!fontLoaded) {
          throw new Error("Noto Sans Gurmukhi failed to load in Chromium context");
        }

        const combos = ${JSON.stringify(combinations)};
        const pitches = [16.0, 17.0, 18.0, 18.5];
        const results = [];

        for (const item of combos) {
          // Worst case upper line: stacked addak on sihari
          const upperLineText = "ਉੱਲੂ ਕ੍ਰਿੱਪਾ ਕਿਉਂਕਿ";
          // Lower line under test
          const lowerLineText = item.text + " " + item.text;

          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 150;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.font = '12pt "Noto Sans Gurmukhi"';

          const b1 = 50;

          // 1. Draw lowerLineText on baseline 1 to find its lowest descender
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 400, 150);
          ctx.fillStyle = '#000000';
          ctx.fillText(lowerLineText, 10, b1);

          let maxBlackRow1 = -1;
          const img1 = ctx.getImageData(0, 0, 400, 150).data;
          for (let y = 0; y < 150; y++) {
            for (let x = 0; x < 400; x++) {
              if (img1[(y * 400 + x) * 4] < 220) {
                if (y > maxBlackRow1) maxBlackRow1 = y;
              }
            }
          }

          const descenderExtentPx = maxBlackRow1 - b1;

          // 2. Now test against each pitch with the worst-case upper line on baseline 2
          const pitchResults = {};
          for (const pitch of pitches) {
            const b2 = b1 + Math.round(pitch * 96 / 72);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 150);
            ctx.fillStyle = '#000000';
            ctx.fillText(upperLineText, 10, b2);

            let minBlackRow2 = 1000;
            const img2 = ctx.getImageData(0, 0, 400, 150).data;
            for (let y = 0; y < 150; y++) {
              for (let x = 0; x < 400; x++) {
                if (img2[(y * 400 + x) * 4] < 220) {
                  if (y < minBlackRow2) minBlackRow2 = y;
                }
              }
            }

            const ascenderExtentPx = b2 - minBlackRow2;
            const gapPx = minBlackRow2 - maxBlackRow1;
            const gapPt = Number((gapPx * 72 / 96).toFixed(2));

            const key = pitch === 18.5 ? 'pitch18_5' : ('pitch' + Math.floor(pitch));
            pitchResults[key] = {
              pitchPt: pitch,
              b2Px: b2,
              gapPx: gapPx,
              gapPt: gapPt,
              collision: gapPx <= 0
            };
          }

          results.push({
            id: item.id,
            text: item.text,
            desc: item.desc,
            hasExtremeDescender: Boolean(item.extremeDesc),
            descenderPx: descenderExtentPx,
            descenderPt: Number((descenderExtentPx * 72 / 96).toFixed(2)),
            ...pitchResults
          });
        }

        return results;
      }

      runMeasurements().then(res => {
        console.log("SPIKE1_RESULTS:" + JSON.stringify(res) + "END_SPIKE1_RESULTS");
      }).catch(err => {
        console.error("SPIKE1_ERROR:" + String(err));
      });
    </script>
  </body>
  </html>`;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  win.webContents.on('console-message', (event, level, message) => {
    if (message.includes('SPIKE1_RESULTS:')) {
      process.stdout.write(message + '\n');
      app.exit(0);
    }
  });
});
