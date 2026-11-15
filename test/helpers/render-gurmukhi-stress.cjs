const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  try {
    const courierBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/CourierPrime.ttf')).toString('base64');
    const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/NotoSansGurmukhi.ttf')).toString('base64');
    const indexCss = fs.readFileSync(path.join(__dirname, '../../src/renderer/index.css'), 'utf8');

    const artifactDir = '/Users/arshdsj/.gemini/antigravity/brain/02a501a1-7df1-4adf-a59c-b44a3ac26a92';

    // Stress text with dense stacked conjuncts, paired subjoined consonants, matras above and below
    const stressBlocks = [
      {
        type: 'scene_heading',
        text: 'INT. ਸ਼੍ਰੀ ਅੰਮ੍ਰਿਤਸਰ ਸਾਹਿਬ - ਮੂੰਹ-ਹਨ੍ਹੇਰੇ - DAY',
      },
      {
        type: 'action',
        text: 'ਗੁਰੂਘਰ ਵਿੱਚ ਸ਼ਰਧਾਲੂਆਂ ਦਾ ਵੱਡਾ ਇਕੱਠ ਹੈ। ਚਾਰੇ ਪਾਸੇ ਇਲਾਹੀ ਗੁਰਬਾਣੀ ਦਾ ਪ੍ਰਵਾਹ ਚੱਲ ਰਿਹਾ ਹੈ। ੴ ਸਤਿਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ॥ ਧੁੰਦ ਵਿੱਚ ਦੀਵੇ ਜਗ ਰਹੇ ਹਨ।',
      },
      {
        type: 'character',
        text: 'ਪ੍ਰੋਗਰਾਮਰ / ਵਿਦਵਾਨ',
      },
      {
        type: 'parenthetical',
        text: '(ਹੱਥ ਜੋੜ ਕੇ, ਨਿਮਰਤਾ ਨਾਲ)',
      },
      {
        type: 'dialogue',
        text: 'ਕ੍ਰਿੱਪਾ ਕਰੋ, ਹੇ ਸੱਚੇ ਪਾਤਸ਼ਾਹ! ਮੇਰੇ ਹਿਰਦੇ ਵਿੱਚ ਤ੍ਰਿਸ਼ਨਾ ਨਾ ਰਹੇ। ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ ਦੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਹੀ ਸਾਰੀ ਦੁਨੀਆ ਦਾ ਸੁੱਖ ਸਮਾਇਆ ਹੈ।',
      },
      {
        type: 'action',
        text: 'ਉਹ ਪੌੜੀਆਂ ਉਤਰ ਕੇ ਸਰੋਵਰ ਵੱਲ ਵਧਦਾ ਹੈ। ਠੰਢੀ ਹਵਾ ਚੱਲ ਰਹੀ ਹੈ। ਪਾਣੀ ਉੱਤੇ ਪ੍ਰਕਾਸ਼ ਦੀਆਂ ਲਹਿਰਾਂ ਨੱਚ ਰਹੀਆਂ ਹਨ।',
      },
      {
        type: 'character',
        text: 'ਮਨਪਰੀਤ ਸਿੰਘ',
      },
      {
        type: 'dialogue',
        text: 'ਉੱਲੂ ਵਾਂਗ ਰਾਤ ਨੂੰ ਜਾਗ ਕੇ ਲਿਖਣਾ ਸੌਖਾ ਨਹੀਂ ਹੁੰਦਾ, ਪਰ ਜਦੋਂ ਕਲਮ ਚੱਲਦੀ ਹੈ ਤਾਂ ਅੰਮ੍ਰਿਤ ਵੇਲੇ ਦੀ ਠੰਢ ਵੀ ਮਿੱਠੀ ਲੱਗਦੀ ਹੈ।',
      },
      {
        type: 'character',
        text: 'ਪਤਨੀ (ਪ੍ਰੀਤਮ ਕੌਰ)',
      },
      {
        type: 'dialogue',
        text: 'ਸ੍ਵੈ-ਮਾਣ ਨਾਲ ਜਿਊਣਾ ਹੀ ਅਸਲ ਜ਼ਿੰਦਗੀ ਹੈ। ਆਪਣੇ ਦ੍ਰਿਸ਼ਟੀਕੋਣ ਨੂੰ ਸਦਾ ਉੱਚਾ ਰੱਖੋ ਅਤੇ ਪ੍ਰਭੂ ਦੀ ਭਗਤੀ ਵਿੱਚ ਲੀਨ ਰਹੋ।',
      },
    ];

    // Helper to render HTML
    function buildEditorHtml() {
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
      padding: 30px;
      background: #09090b;
      display: flex;
      justify-content: center;
    }

    .screenplay-page-box {
      width: 816px;
      height: 1056px;
      background: #18181b;
      color: #fafafa;
      box-sizing: border-box;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      position: relative;
      overflow: visible;
      padding: 96px 96px 96px 144px;
    }

    .first-block {
      margin-top: 0px !important;
    }
  </style>
</head>
<body>
  <div class="screenplay-page-box" id="editor-page-1">
    <div class="screenplay-block screenplay-scene-heading first-block" id="b0">${stressBlocks[0].text}</div>
    <div class="screenplay-block screenplay-action" id="b1">${stressBlocks[1].text}</div>
    <div class="screenplay-block screenplay-character" id="b2">${stressBlocks[2].text}</div>
    <div class="screenplay-block screenplay-parenthetical" id="b3">${stressBlocks[3].text}</div>
    <div class="screenplay-block screenplay-dialogue" id="b4">${stressBlocks[4].text}</div>
    <div class="screenplay-block screenplay-action" id="b5">${stressBlocks[5].text}</div>
    <div class="screenplay-block screenplay-character" id="b6">${stressBlocks[6].text}</div>
    <div class="screenplay-block screenplay-dialogue" id="b7">${stressBlocks[7].text}</div>
    <div class="screenplay-block screenplay-character" id="b8">${stressBlocks[8].text}</div>
    <div class="screenplay-block screenplay-dialogue" id="b9">${stressBlocks[9].text}</div>
  </div>
</body>
</html>`;
    }

    function buildPdfHtml() {
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
    @page {
      size: letter portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      font-size: 16px;
      line-height: 20px;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      font-kerning: normal;
    }
    .pdf-page-sheet {
      width: 816px;
      height: 1056px;
      padding: 96px 96px 96px 144px;
      background: #ffffff;
      position: relative;
      page-break-after: always;
      overflow: visible;
    }
    .pdf-block {
      font-family: 'Courier Prime', 'Noto Sans Gurmukhi', monospace;
      font-size: 16px;
      line-height: 20px;
      overflow: visible;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .pdf-scene-heading {
      margin-top: 40px;
      margin-bottom: 0px;
      text-transform: uppercase;
    }
    .pdf-action {
      margin-top: 20px;
      margin-bottom: 0px;
    }
    .pdf-character {
      margin-left: 201.6px;
      margin-top: 20px;
      margin-bottom: 0px;
      text-transform: uppercase;
    }
    .pdf-parenthetical {
      margin-left: 144px;
      max-width: 288px;
      margin-top: 0px;
      margin-bottom: 0px;
    }
    .pdf-dialogue {
      margin-left: 96px;
      max-width: 336px;
      margin-top: 0px;
      margin-bottom: 0px;
    }
    .first-block-top {
      margin-top: 0px !important;
    }
  </style>
</head>
<body>
  <div class="pdf-page-sheet" id="pdf-page-1">
    <div class="pdf-block pdf-scene-heading first-block-top">${stressBlocks[0].text}</div>
    <div class="pdf-block pdf-action">${stressBlocks[1].text}</div>
    <div class="pdf-block pdf-character">${stressBlocks[2].text}</div>
    <div class="pdf-block pdf-parenthetical">${stressBlocks[3].text}</div>
    <div class="pdf-block pdf-dialogue">${stressBlocks[4].text}</div>
    <div class="pdf-block pdf-action">${stressBlocks[5].text}</div>
    <div class="pdf-block pdf-character">${stressBlocks[6].text}</div>
    <div class="pdf-block pdf-dialogue">${stressBlocks[7].text}</div>
    <div class="pdf-block pdf-character">${stressBlocks[8].text}</div>
    <div class="pdf-block pdf-dialogue">${stressBlocks[9].text}</div>
  </div>
</body>
</html>`;
    }

    const win = new BrowserWindow({
      show: false,
      width: 1000,
      height: 1200,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // 1. Capture Editor at 20px
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildEditorHtml())}`);
    await win.webContents.executeJavaScript('document.fonts.ready');
    await new Promise((r) => setTimeout(r, 200));

    const editorImage = await win.webContents.capturePage({ x: 0, y: 0, width: 900, height: 1150 });
    const editorImgPath = path.join(artifactDir, 'gurmukhi_stress_editor_20px.png');
    fs.writeFileSync(editorImgPath, editorImage.toPNG());
    console.log(`Wrote Editor 20px artifact to: ${editorImgPath}`);

    // 2. Capture PDF at 20px
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildPdfHtml())}`);
    await win.webContents.executeJavaScript('document.fonts.ready');
    await new Promise((r) => setTimeout(r, 200));

    const pdfImage = await win.webContents.capturePage({ x: 0, y: 0, width: 850, height: 1100 });
    const pdfImgPath = path.join(artifactDir, 'gurmukhi_stress_pdf_20px.png');
    fs.writeFileSync(pdfImgPath, pdfImage.toPNG());
    console.log(`Wrote PDF 20px artifact to: ${pdfImgPath}`);

    console.log('SUCCESS');
    app.quit();
  } catch (err) {
    console.error('Error rendering stress visuals:', err);
    app.exit(1);
  }
});
