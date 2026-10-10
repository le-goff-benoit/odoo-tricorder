import { build } from 'esbuild';
import { mkdir, copyFile, cp, rm, readFile, writeFile } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({ entryPoints: { app: 'src/app.js' }, bundle: true, outdir: 'dist', loader: { '.css': 'css' }, sourcemap: true, target: 'chrome130' });
await copyFile('src/index.html', 'dist/index.html');
await rm('dist/fonts', { recursive: true, force: true });
await cp('assets/fonts', 'dist/fonts', { recursive: true, filter: source => !source.endsWith('.md') });

const studioStyles = ['studio.css','studio-execution.css','conversation-view.css','business-results.css','workflow-reader.css','workflow-guided.css','workflow-sources.css'];
await writeFile('dist/studio.css', (await Promise.all(studioStyles.map(file => readFile('src/'+file,'utf8')))).join('\n').replaceAll(':root[data-theme=dark]', ':host([data-theme=dark])').replaceAll(':root', ':host'));
