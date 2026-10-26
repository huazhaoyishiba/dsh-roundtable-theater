import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!process.env.DSH_RUNTIME) throw new Error('Set DSH_RUNTIME to the actual desktop or CLI runtime directory.');
const runtimeRequire = createRequire(resolve(process.env.DSH_RUNTIME, 'package.json'));
const { evaluatePluginCompatibility } = await import(pathToFileURL(runtimeRequire.resolve('@deepseek-ai/dsh-app-boot')).href);
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const semver = runtimeRequire('semver');
for (const version of ['0.1.5-rc.1', '0.2.1-rc.3']) {
  for (const name of ['@deepseek-ai/dsh-llm', '@deepseek-ai/dsh-storage-domain', '@deepseek-ai/dsh-typert-protocol']) {
    assert.ok(semver.satisfies(version, manifest.peerDependencies[name]), `Ordinary package managers must accept ${name}@${version}`);
  }
}
for (const version of ['0.1.5-rc.1', '0.2.1-rc.3', '0.2.2-rc.1', '0.3.0-rc.1', '1.0.0']) {
  assert.equal(evaluatePluginCompatibility(manifest, {}, version), undefined, `Version declaration must accept ${version}`);
}
assert.ok(evaluatePluginCompatibility(manifest, {}, '0.1.4'));
console.log('Native installer compatibility check: minimum enforced; later stable and prerelease versions accepted.');
