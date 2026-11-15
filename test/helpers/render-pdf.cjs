const { app, BrowserWindow } = require('electron');
const fs = require('fs');

app.whenReady().then(async () => {
  try {
    const inputFile = process.argv[2];
    const outputFile = process.argv[3];
    const paperSize = process.argv[4] || 'letter';

    if (!inputFile || !outputFile) {
      console.error('Usage: electron render-pdf.cjs <inputHtmlFile> <outputPdfFile> [paperSize]');
      app.exit(1);
      return;
    }

    const html = fs.readFileSync(inputFile, 'utf8');
    const win = new BrowserWindow({
      show: false,
      width: paperSize === 'a4' ? 794 : 816,
      height: paperSize === 'a4' ? 1123 : 1056,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Wait for fonts if available
    try {
      await win.webContents.executeJavaScript('document.fonts.ready');
    } catch (e) {
      // ignore
    }

    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: paperSize === 'a4' ? 'A4' : 'Letter',
      margins: { marginType: 'none' },
      preferCSSPageSize: true,
      printBackground: true,
    });

    fs.writeFileSync(outputFile, pdfBuffer);
    app.quit();
  } catch (err) {
    console.error('Error rendering PDF:', err);
    app.exit(1);
  }
});
