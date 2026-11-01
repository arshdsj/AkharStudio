import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildElectron() {
  console.log('Building Electron main and preload scripts...');
  
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
    sourcemap: true,
  });

  console.log('Electron build complete: dist-electron/main.cjs & dist-electron/preload.cjs');
}

buildElectron().catch((err) => {
  console.error(err);
  process.exit(1);
});
