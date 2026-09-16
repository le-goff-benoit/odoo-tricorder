import { build } from 'esbuild';
import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, outfile: 'dist/app.js', loader: { '.css': 'css' }, sourcemap: true, target: 'chrome130' });
await copyFile('src/index.html', 'dist/index.html');
await cp('assets/fonts', 'dist/fonts', { recursive: true, filter: source => !source.endsWith('.md') });
