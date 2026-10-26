import { access, mkdir, readFile, symlink, lstat, realpath, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// A development helper: use this machine's installed peers without copying a runtime.
const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = process.argv[2];
if (!runtime) throw new Error('Usage: node scripts/link-dsh.mjs <Harness CLI or desktop runtime directory> [--replace]');
const manifest = JSON.parse(await readFile(join(runtime, 'package.json'), 'utf8'));
if (!['@deepseek-ai/dsh', '@deepseek-ai/dsh-desktop-runtime'].includes(manifest.name)) throw new Error('The supplied directory is not a Harness CLI or desktop runtime package');
const runtimeRequire = createRequire(resolve(runtime, 'package.json'));
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
for (const name of Object.keys(pkg.peerDependencies)) {
  const target = dirname(runtimeRequire.resolve(`${name}/package.json`));
  await access(join(target, 'package.json'));
  const destination = resolve(root, 'node_modules', name);
  const parent = resolve(destination, '..');
  await mkdir(parent, { recursive: true });
  let existing;
  try { existing = await lstat(destination); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (existing) {
    if (await realpath(destination) === await realpath(target)) continue;
    if (!existing.isSymbolicLink() || !process.argv.includes('--replace')) throw new Error(`${name} already exists for a different runtime; only development links may be replaced using --replace`);
    // destination is a verified link under this project's node_modules. Never recurse.
    await unlink(destination);
  }
  await symlink(target, destination, process.platform === 'win32' ? 'junction' : 'dir');
  console.log(`Linked ${name}`);
}
console.log(`Using Harness ${manifest.version}`);
