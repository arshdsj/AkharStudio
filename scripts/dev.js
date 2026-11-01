import { spawn } from 'child_process';
import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function dev() {
  console.log('Building Electron main process for dev...');
  await esbuild.build({
    entryPoints: [
      { in: path.join(rootDir, 'src/main/main.ts'), out: 'main' },
      { in: path.join(rootDir, 'src/preload/preload.ts'), out: 'preload' },
    ],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outdir: path.join(rootDir, 'dist-electron'),
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    external: ['electron', 'better-sqlite3'],
    sourcemap: 'inline',
  });

  // Start Vite dev server
  console.log('Starting Vite...');
  const viteProcess = spawn('npx', ['vite'], {
    stdio: 'inherit',
    shell: true,
  });

  // Wait 2 seconds for Vite to start, then launch Electron with VITE_DEV_SERVER_URL
  setTimeout(() => {
    console.log('Launching Electron...');
    const electronPath = process.platform === 'win32' 
      ? path.join(rootDir, 'node_modules/.bin/electron.cmd')
      : path.join(rootDir, 'node_modules/.bin/electron');

    const electronProcess = spawn(electronPath, [path.join(rootDir, 'dist-electron/main.cjs')], {
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://localhost:5173',
      },
      stdio: 'inherit',
    });

    electronProcess.on('close', () => {
      viteProcess.kill();
      process.exit();
    });
  }, 2000);
}

dev().catch((err) => {
  console.error(err);
  process.exit(1);
});
