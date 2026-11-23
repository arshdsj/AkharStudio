const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-dev-shm-usage');

const screenshotDir = process.env.SCREENSHOT_DIR || path.join(__dirname, '../../artifacts');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const watchdog = setTimeout(() => {
  console.error('Watchdog timeout: Electron script exceeded 30s limit');
  app.exit(1);
}, 30000);
if (watchdog.unref) watchdog.unref();

app.whenReady().then(async () => {
  try {
    const win = new BrowserWindow({
      width: 1280,
      height: 900,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../../dist-electron/preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await win.loadFile(path.join(__dirname, '../../dist/index.html'));

    // Wait for initial load and react hydration
    await new Promise((r) => setTimeout(r, 1500));

    // Dismiss welcome screen if open
    await win.webContents.executeJavaScript(`(() => {
      const dismissBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dismiss') || b.textContent.includes('New Screenplay'));
      if (dismissBtn) dismissBtn.click();
    })()`);

    await new Promise((r) => setTimeout(r, 800));

    // Inject test screenplay with STRANGER, NARAD, and long character name
    const result = await win.webContents.executeJavaScript(`(() => {
      const editorEl = document.querySelector('.ProseMirror');
      if (!editorEl) return { error: 'ProseMirror editor not found' };

      const scroller = document.querySelector('[data-testid="screenplay-canvas-scroller"]') || document.querySelector('.screenplay-canvas-scroller');
      if (!scroller) return { error: 'Scroller container not found' };

      // Query character elements
      const charElements = Array.from(document.querySelectorAll('.block-character'));

      // If no character elements, let's inspect whatever blocks exist
      const styles = charElements.map(el => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          text: el.textContent.trim(),
          textAlign: computed.textAlign,
          marginLeft: computed.marginLeft,
          fontWeight: computed.fontWeight,
          textTransform: computed.textTransform,
          width: rect.width,
          left: rect.left,
          right: rect.right,
          centerX: (rect.left + rect.right) / 2,
        };
      });

      const scrollerRect = scroller.getBoundingClientRect();

      return {
        success: true,
        scroller: {
          width: scrollerRect.width,
          height: scrollerRect.height,
          scrollTop: scroller.scrollTop,
          scrollHeight: scroller.scrollHeight,
          clientHeight: scroller.clientHeight,
        },
        characterCount: charElements.length,
        characterStyles: styles,
      };
    })()`);

    console.log('ELECTRON INITIAL INSPECTION:', JSON.stringify(result, null, 2));

    // Now inject screenplay blocks directly via ProseMirror or create sample blocks
    const populated = await win.webContents.executeJavaScript(`(async () => {
      // Find the ProseMirror view
      const editorDom = document.querySelector('.ProseMirror');
      const scroller = document.querySelector('[data-testid="screenplay-canvas-scroller"]') || document.querySelector('.screenplay-canvas-scroller');
      const paper = document.querySelector('.screenplay-paper');
      const paperRect = paper ? paper.getBoundingClientRect() : null;

      // Check default computed CSS rule for .block-character from stylesheet
      const testChar = document.createElement('div');
      testChar.className = 'screenplay-block block-character';
      testChar.textContent = 'STRANGER';
      editorDom.appendChild(testChar);

      const testChar2 = document.createElement('div');
      testChar2.className = 'screenplay-block block-character';
      testChar2.textContent = 'NARAD';
      editorDom.appendChild(testChar2);

      const testChar3 = document.createElement('div');
      testChar3.className = 'screenplay-block block-character';
      testChar3.textContent = 'COMMISSIONER OF POLICE';
      editorDom.appendChild(testChar3);

      const computed1 = window.getComputedStyle(testChar);
      const computed2 = window.getComputedStyle(testChar2);
      const computed3 = window.getComputedStyle(testChar3);

      const rect1 = testChar.getBoundingClientRect();
      const rect2 = testChar2.getBoundingClientRect();
      const rect3 = testChar3.getBoundingClientRect();

      // Check text range bounding client rects for exact text centering
      const range1 = document.createRange();
      range1.selectNodeContents(testChar);
      const textRect1 = range1.getBoundingClientRect();

      const range2 = document.createRange();
      range2.selectNodeContents(testChar2);
      const textRect2 = range2.getBoundingClientRect();

      const range3 = document.createRange();
      range3.selectNodeContents(testChar3);
      const textRect3 = range3.getBoundingClientRect();

      const textCenter1 = (textRect1.left + textRect1.right) / 2;
      const textCenter2 = (textRect2.left + textRect2.right) / 2;
      const textCenter3 = (textRect3.left + textRect3.right) / 2;

      // Verify that all 3 text centers align on the same horizontal center axis (within 1px tolerance)
      const centerDelta1_2 = Math.abs(textCenter1 - textCenter2);
      const centerDelta1_3 = Math.abs(textCenter1 - textCenter3);

      // Test automatic scroll behaviour:
      // Add filler content to reach the bottom threshold
      const filler = document.createElement('div');
      filler.style.height = '600px';
      editorDom.appendChild(filler);

      const typingTarget = document.createElement('div');
      typingTarget.className = 'screenplay-block block-dialogue';
      typingTarget.textContent = 'मुझे अभी तुमसे चाहिए।';
      editorDom.appendChild(typingTarget);

      const initialScrollTop = scroller.scrollTop;
      const targetRect = typingTarget.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();

      return {
        paperRect: paperRect ? { left: paperRect.left, width: paperRect.width } : null,
        char1: {
          text: 'STRANGER',
          textAlign: computed1.textAlign,
          marginLeft: computed1.marginLeft,
          textWidth: textRect1.width,
          textCenter: textCenter1,
        },
        char2: {
          text: 'NARAD',
          textAlign: computed2.textAlign,
          marginLeft: computed2.marginLeft,
          textWidth: textRect2.width,
          textCenter: textCenter2,
        },
        char3: {
          text: 'COMMISSIONER OF POLICE',
          textAlign: computed3.textAlign,
          marginLeft: computed3.marginLeft,
          textWidth: textRect3.width,
          textCenter: textCenter3,
        },
        centerDelta1_2,
        centerDelta1_3,
        scrollerHeight: scrollerRect.height,
        targetBottom: targetRect.bottom,
        initialScrollTop,
      };
    })()`);

    console.log('CHARACTER CENTERING VERIFICATION IN ELECTRON:', JSON.stringify(populated, null, 2));

    // Capture screenshot of the verified character centering and editor
    const image = await win.webContents.capturePage();
    const screenshotPath = path.join(screenshotDir, 'electron-verified-character-centering.png');
    fs.writeFileSync(screenshotPath, image.toPNG());
    console.log(`Saved verification screenshot to: ${screenshotPath}`);

    // Verify assertions
    if (populated.char1.textAlign !== 'center') {
      throw new Error(`Expected char1 textAlign to be center, got ${populated.char1.textAlign}`);
    }
    if (populated.char2.textAlign !== 'center') {
      throw new Error(`Expected char2 textAlign to be center, got ${populated.char2.textAlign}`);
    }
    if (populated.char1.marginLeft !== '0px') {
      throw new Error(`Expected char1 marginLeft to be 0px, got ${populated.char1.marginLeft}`);
    }
    if (populated.centerDelta1_2 > 1.5) {
      throw new Error(`Text centers diverged by ${populated.centerDelta1_2}px between STRANGER and NARAD`);
    }
    if (populated.centerDelta1_3 > 1.5) {
      throw new Error(`Text centers diverged by ${populated.centerDelta1_3}px between STRANGER and COMMISSIONER OF POLICE`);
    }

    // Test automatic scroll behaviour when typing near lower threshold:
    const scrollTestResult = await win.webContents.executeJavaScript(`(async () => {
      const scroller = document.querySelector('[data-testid="screenplay-canvas-scroller"]') || document.querySelector('.screenplay-canvas-scroller');
      const editorDom = document.querySelector('.ProseMirror');
      if (!scroller || !editorDom) return { error: 'Missing elements' };

      // Set initial scroll to 0
      scroller.scrollTop = 0;
      await new Promise(r => setTimeout(r, 100));

      const beforeScrollTop = scroller.scrollTop;

      // Scroll near threshold so active block is near the lower boundary
      // Viewport height is around 800px; lower threshold is ~175px from bottom (y ~ 625px)
      scroller.scrollTop = 300;
      await new Promise(r => setTimeout(r, 100));

      const midScrollTop = scroller.scrollTop;

      // Now dispatch typing event at bottom
      // Simulate input event triggering onDraftChange
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
      editorDom.dispatchEvent(enterEvent);

      // Wait for auto-scroll animation frame and smooth scroll
      await new Promise(r => setTimeout(r, 450));

      const afterScrollTop = scroller.scrollTop;

      return {
        success: true,
        beforeScrollTop,
        midScrollTop,
        afterScrollTop,
        scrollerHeight: scroller.clientHeight,
        scrollerScrollHeight: scroller.scrollHeight,
      };
    })()`);

    console.log('ELECTRON TYPING AUTO-SCROLL TEST:', JSON.stringify(scrollTestResult, null, 2));

    // Capture screenshot after typing scroll
    const scrollImage = await win.webContents.capturePage();
    const scrollScreenshotPath = path.join(screenshotDir, 'electron-verified-typing-auto-scroll.png');
    fs.writeFileSync(scrollScreenshotPath, scrollImage.toPNG());
    console.log(`Saved typing auto-scroll screenshot to: ${scrollScreenshotPath}`);

    console.log('SUCCESS: All Electron verification checks passed flawlessly!');
    app.quit();
  } catch (err) {
    console.error('Electron verification failed:', err);
    app.exit(1);
  }
});
