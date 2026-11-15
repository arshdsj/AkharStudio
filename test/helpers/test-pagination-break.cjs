const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadFile(path.join(__dirname, '../../dist/index.html'));
  await win.webContents.executeJavaScript('document.fonts.ready');

  const blocks = JSON.parse(fs.readFileSync('/tmp/prarbadh_blocks.json', 'utf8'));

  const result = await win.webContents.executeJavaScript(`(async (blocks) => {
    // import { PaginationEngine } from src/core/layout/paginationEngine
    // In browser, let's see if window or modules have it, or we can test layout via dom directly
    // Let's inspect the live ProseMirror page break decoration in the app
    const breaks = Array.from(document.querySelectorAll('.screenplay-page-break')).map(b => ({
      text: b.textContent,
      nextSibling: b.nextElementSibling ? b.nextElementSibling.textContent.trim().slice(0, 30) : null,
      prevSibling: b.previousElementSibling ? b.previousElementSibling.textContent.trim().slice(0, 30) : null,
    }));
    return { breaks };
  })(${JSON.stringify(blocks)})`);

  console.log('Result:', JSON.stringify(result, null, 2));
  app.quit();
});
