const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadFile(path.join(__dirname, '../../dist/index.html'));
  await win.webContents.executeJavaScript('document.fonts.ready');

  const blocks = JSON.parse(fs.readFileSync('/tmp/prarbadh_blocks.json', 'utf8'));

  const result = await win.webContents.executeJavaScript(`(async (blocks) => {
    // Click prarbadh
    for (let i = 0; i < 50; i++) {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('prarbadh'));
      if (btn) { btn.click(); break; }
      await new Promise(r => setTimeout(r, 100));
    }
    await new Promise(r => setTimeout(r, 1000));

    // Get pagination result from editor view state
    const pm = document.querySelector('.ProseMirror');
    // We can also inspect the page-break decorations
    const breaks = Array.from(document.querySelectorAll('.screenplay-page-break')).map(b => ({
      text: b.textContent,
      nextSiblingBlock: b.nextElementSibling ? b.nextElementSibling.textContent.slice(0, 30) : null,
      prevSiblingBlock: b.previousElementSibling ? b.previousElementSibling.textContent.slice(0, 30) : null,
    }));

    return { breaks };
  })(${JSON.stringify(blocks)})`);

  console.log('Breaks in editor:', JSON.stringify(result, null, 2));
  app.quit();
});
