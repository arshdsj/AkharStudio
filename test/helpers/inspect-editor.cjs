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

    // Wait for editor to load
    await new Promise((r) => setTimeout(r, 2000));

    const styles = await win.webContents.executeJavaScript(`(() => {
      const pm = document.querySelector('.ProseMirror');
      const paper = document.querySelector('.screenplay-paper');
      
      const getStyles = (el) => {
        if (!el) return null;
        const s = window.getComputedStyle(el);
        return {
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          marginTop: s.marginTop,
          marginBottom: s.marginBottom,
          marginLeft: s.marginLeft,
          marginRight: s.marginRight,
          paddingTop: s.paddingTop,
          paddingBottom: s.paddingBottom,
          paddingLeft: s.paddingLeft,
          paddingRight: s.paddingRight,
          fontFamily: s.fontFamily,
        };
      };

      const blockTypes = ['scene-heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition', 'shot'];
      const blockStyles = {};
      blockTypes.forEach(t => {
        const el = document.querySelector('.block-' + t);
        blockStyles[t] = getStyles(el);
      });

      // Find fnatasy element or text
      let fnatasyWidth = null;
      let fnatasyLinePitch = null;
      const allP = Array.from(document.querySelectorAll('.screenplay-block'));
      for (const p of allP) {
        if (p.textContent.includes('fnatasy')) {
          // measure text 'fnatasy' using Range
          const textNode = Array.from(p.childNodes).find(n => n.textContent && n.textContent.includes('fnatasy'));
          if (textNode) {
            const range = document.createRange();
            const idx = textNode.textContent.indexOf('fnatasy');
            range.setStart(textNode, idx);
            range.setEnd(textNode, idx + 7);
            const rect = range.getBoundingClientRect();
            fnatasyWidth = rect.width;
          }
          const s = window.getComputedStyle(p);
          fnatasyLinePitch = s.lineHeight;
        }
      }

      return {
        pm: getStyles(pm),
        paper: getStyles(paper),
        blocks: blockStyles,
        fnatasyWidth,
        fnatasyLinePitch
      };
    })()`);

    console.log('--- COMPUTED STYLES IN REAL ELECTRON APP ---');
    console.log(JSON.stringify(styles, null, 2));

    app.quit();
  } catch (err) {
    console.error('Inspection failed:', err);
    app.exit(1);
  }
});
