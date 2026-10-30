import { cp, mkdtemp, readFile, readdir, rm, symlink, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const command = process.argv[2] || 'build';
if (!['build', 'check'].includes(command)) throw new Error('Use build or check.');
// The optional path allows installation outside the checkout in restricted workers.
const toolchain = resolve(process.argv[3] || here);
const astroCLI = join(toolchain, 'node_modules/astro/bin/astro.mjs');
await access(astroCLI);
const stage = await mkdtemp(join(tmpdir(), 'squeek-static-'));
try {
  await cp(join(root, 'src'), join(stage, 'src'), { recursive: true });
  await cp(join(root, 'public'), join(stage, 'public'), { recursive: true });
  await cp(join(here, 'astro.config.mjs'), join(stage, 'astro.config.mjs'));
  await cp(join(here, 'package.json'), join(stage, 'package.json'));
  await writeFile(join(stage, 'tsconfig.json'), JSON.stringify({
    extends: 'astro/tsconfigs/strict',
    include: ['.astro/types.d.ts', '**/*'],
    exclude: ['dist', 'node_modules'],
  }, null, 2));
  await symlink(join(toolchain, 'node_modules'), join(stage, 'node_modules'), 'dir');
  const result = spawnSync(process.execPath, [astroCLI, command], {
    cwd: stage, stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  });
  if (result.status !== 0) process.exitCode = result.status || 1;
  else if (command === 'build') {
    // Astro emits origin-relative links. All pages are explicit sibling HTML files,
    // so normalize only HTML asset URLs for IPFS gateway subpaths.
    for (const name of await readdir(join(stage, 'dist'))) {
      if (!name.endsWith('.html')) continue;
      const file = join(stage, 'dist', name);
      const html = await readFile(file, 'utf8');
      const relative = html
        .replace(/(\b(?:src|href)=["'])(?:\.\/)?\/+_astro\//g, '$1./_astro/')
        .replace(/(\b(?:src|href)=["'])\/(?!\/)/g, '$1./');
      await writeFile(file, relative);
    }
    for (const name of await readdir(join(stage, 'dist/_astro'))) {
      if (!name.endsWith('.css')) continue;
      const file = join(stage, 'dist/_astro', name);
      const css = await readFile(file, 'utf8');
      await writeFile(file, css.replace(/url\((["']?)(?:\.\/)?\/+_astro\//g, 'url($1./'));
    }
    await rm(join(root, 'dist'), { recursive: true, force: true });
    await cp(join(stage, 'dist'), join(root, 'dist'), { recursive: true });
    console.log('Static export written to dist/ (relative assets; four HTML pages).');
  }
} finally {
  await rm(stage, { recursive: true, force: true });
}
