import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await mkdir('.playwright', { recursive: true });
const directory = await mkdtemp(resolve('.playwright/releases-'));
const releases = {};
for (const name of ['a', 'b']) {
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/verify-pwa.mjs'], { stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/verify-hosting.mjs'], { stdio: 'inherit' });
  const path = resolve(directory, name);
  await cp('dist', path, { recursive: true });
  const inventory = JSON.parse(await readFile(resolve(path, 'precache-inventory.json'), 'utf8'));
  releases[name] = { path, buildId: inventory.buildId };
}
if (!releases.a.buildId || releases.a.buildId === releases.b.buildId) throw new Error('Two distinct builds are required');
await writeFile('.playwright/update-builds.json', JSON.stringify(releases, null, 2));
console.log('Two production builds ready; dist contains the final candidate B.');
