import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const distRoot = join(projectRoot, 'dist');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });

await cp(join(projectRoot, 'src'), join(distRoot, 'src'), { recursive: true });
await cp(join(projectRoot, 'index.html'), join(distRoot, 'index.html'));

for (const optionalDirectory of ['assets', 'public']) {
  const source = join(projectRoot, optionalDirectory);
  if (await exists(source)) await cp(source, join(distRoot, optionalDirectory), { recursive: true });
}

const builtIndex = await readFile(join(distRoot, 'index.html'), 'utf8');
const requiredReferences = ['./src/styles.css', './src/main.js'];
if (!requiredReferences.every((reference) => builtIndex.includes(reference))) {
  await writeFile(join(distRoot, '.build-error'), 'Required runtime references are missing.');
  throw new Error('Production index.html is missing a required runtime reference.');
}

console.log('EcoPulse production build complete: dist/');