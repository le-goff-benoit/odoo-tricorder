import { build } from 'esbuild';
import { mkdir, copyFile, cp, rm, readFile, writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({ entryPoints: { app: 'src/app.js' }, bundle: true, outdir: 'dist', loader: { '.css': 'css' }, sourcemap: true, target: 'chrome130' });
await copyFile('src/index.html', 'dist/index.html');
await rm('dist/fonts', { recursive: true, force: true });
await cp('assets/fonts', 'dist/fonts', { recursive: true, filter: source => !source.endsWith('.md') });

await writeFile('dist/studio.css', (await readFile('src/studio.css', 'utf8') + '\n' + await readFile('src/studio-execution.css', 'utf8') + '\n' + await readFile('src/conversation-view.css', 'utf8') + '\n' + await readFile('src/business-results.css', 'utf8')).replaceAll(':root[data-theme=dark]', ':host([data-theme=dark])').replaceAll(':root', ':host'));
