const { app } = require('electron');

app.whenReady().then(() => {
  console.log('MAIN_ENV_CHECK:', JSON.stringify({
    hasDocument: typeof document !== 'undefined',
    hasWindow: typeof window !== 'undefined',
    hasOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
  }));
  app.exit(0);
});
