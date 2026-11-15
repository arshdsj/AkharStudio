const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 1200,
      height: 900,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../../dist-electron/preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await win.loadFile(path.join(__dirname, '../../dist/index.html'));

    await new Promise((r) => setTimeout(r, 2000));

    const info = await win.webContents.executeJavaScript(`(() => {
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        className: b.className,
      }));
      return {
        title: document.title,
        buttons,
        hasWelcome: Boolean(document.querySelector('.welcome-screen') || document.querySelector('.ds-dialog')),
      };
    })()`);

    console.log('INFO:', JSON.stringify(info, null, 2));
    app.quit();
  } catch (err) {
    console.error('Error:', err);
    app.exit(1);
  }
});
