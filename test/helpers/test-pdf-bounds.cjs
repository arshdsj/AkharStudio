const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  try {
    const courierBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/CourierPrime.ttf')).toString('base64');
    const gurmukhiBase64 = fs.readFileSync(path.join(__dirname, '../../public/fonts/NotoSansGurmukhi.ttf')).toString('base64');
    const blocks = JSON.parse(fs.readFileSync('/tmp/prarbadh_blocks.json', 'utf8'));

    const draft = {
      id: 'e374dc53-3c6a-4ab4-a886-cb5797c8f3ca',
      name: 'Main Draft',
      isMain: true,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      blocks,
    };

    const metadata = {
      title: 'prarbadh',
      author: 'Author',
    };

    // We can load the exported unified HTML using main.cjs or build helper
    // In our build, generateUnifiedScreenplayPdfHtml is in dist-electron or dist
    // Let's create the HTML via BrowserWindow executing dist/index.html or importing
    const win = new BrowserWindow({
      show: false,
      width: 816,
      height: 1056,
      webPreferences: {
        preload: path.join(__dirname, '../../dist-electron/preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await win.loadFile(path.join(__dirname, '../../dist/index.html'));

    // Click prarbadh
    for (let i = 0; i < 50; i++) {
      const clicked = await win.webContents.executeJavaScript(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('prarbadh'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`);
      if (clicked) break;
      await new Promise(r => setTimeout(r, 100));
    }

    for (let i = 0; i < 50; i++) {
      const count = await win.webContents.executeJavaScript(`document.querySelectorAll('.screenplay-block').length`);
      if (count > 10) break;
      await new Promise(r => setTimeout(r, 100));
    }

    await win.webContents.executeJavaScript('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));

    // In the editor, generate PDF HTML using the app's modules
    const exportResult = await win.webContents.executeJavaScript(`(async () => {
      // We can access or evaluate generateUnifiedScreenplayPdfHtml
      // Or we can invoke export:pdf with a mocked save dialog, or render directly
      return true;
    })()`);

    console.log('Done');
    app.quit();
  } catch (err) {
    console.error('Error:', err);
    app.exit(1);
  }
});
