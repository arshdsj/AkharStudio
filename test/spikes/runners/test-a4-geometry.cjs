const { app, BrowserWindow } = require('electron');
const { PDFDocument } = require('@cantoo/pdf-lib');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 800 });

  async function testPdf(html, printOpts) {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const buf = await win.webContents.printToPDF(printOpts);
    const doc = await PDFDocument.load(buf);
    const sz = doc.getPage(0).getSize();
    return { width: Number(sz.width.toFixed(4)), height: Number(sz.height.toFixed(4)) };
  }

  try {
    // Case 1: @page { size: 210mm 297mm; } with preferCSSPageSize: true
    const res1 = await testPdf('<style>@page { size: 210mm 297mm; margin: 0; }</style><body>A4 test 1</body>', {
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: { marginType: 'none' }
    });

    // Case 2: @page { size: 210mm 297mm; } with preferCSSPageSize: false, pageSize: 'A4'
    const res2 = await testPdf('<style>@page { size: 210mm 297mm; margin: 0; }</style><body>A4 test 2</body>', {
      pageSize: 'A4',
      preferCSSPageSize: false,
      margins: { marginType: 'none' }
    });

    // Case 3: @page { size: A4; }
    const res3 = await testPdf('<style>@page { size: A4; margin: 0; }</style><body>A4 test 3</body>', {
      pageSize: 'A4',
      preferCSSPageSize: true,
      margins: { marginType: 'none' }
    });

    // Case 4: @page { size: 595.2756pt 841.8898pt; }
    const res4 = await testPdf('<style>@page { size: 595.2756pt 841.8898pt; margin: 0; }</style><body>A4 test 4</body>', {
      preferCSSPageSize: true,
      margins: { marginType: 'none' }
    });

    // Case 5: @page { size: 8.2677in 11.6929in; }
    const res5 = await testPdf('<style>@page { size: 8.267716in 11.692913in; margin: 0; }</style><body>A4 test 5</body>', {
      preferCSSPageSize: true,
      margins: { marginType: 'none' }
    });

    // Case 6: printToPDF without preferCSSPageSize, with pageSize: { width: 8.267716, height: 11.692913 } (inches)
    const res6 = await testPdf('<body>A4 test 6</body>', {
      pageSize: { width: 8.267716, height: 11.692913 }, // Electron PrintToPDF pageSize object is in inches!
      margins: { marginType: 'none' }
    });

    console.log('A4_COMPARISON:' + JSON.stringify({ res1, res2, res3, res4, res5, res6 }) + 'END_A4_COMPARISON');
    win.destroy();
    app.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    win.destroy();
    app.exit(1);
  }
});
