import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { PACKAGE_ID, INVOCATIONS } from '../src/protocol.mjs';

// This check runs the real Cordis, Typert Gateway and JSON domain storage.
// The only substitute is a local model stream; no credentials or network are used.
const runtime = process.env.DSH_RUNTIME;
if (!runtime) throw new Error('Set DSH_RUNTIME to the installed @deepseek-ai/dsh package directory.');
const runtimeManifest = JSON.parse(await readFile(join(runtime, 'package.json'), 'utf8'));
assert.ok(['@deepseek-ai/dsh', '@deepseek-ai/dsh-desktop-runtime'].includes(runtimeManifest.name), 'DSH_RUNTIME must identify the Harness CLI or desktop runtime package');
const requireRuntime = createRequire(resolve(runtime, 'package.json'));
const loadRuntime = (name) => import(pathToFileURL(requireRuntime.resolve(name)).href);
const [{ Context }, registry, gateway, storage, jsonStorage, domains] = await Promise.all([
  loadRuntime('@deepseek-ai/cordis'),
  loadRuntime('@deepseek-ai/dsh-typert-registry'),
  loadRuntime('@deepseek-ai/dsh-api-gateway'),
  loadRuntime('@deepseek-ai/dsh-storage'),
  loadRuntime('@deepseek-ai/dsh-storage-json'),
  loadRuntime('@deepseek-ai/dsh-storage-domain'),
]);

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(projectRoot, '.test-results', `host-smoke-${randomUUID()}`);
await mkdir(outputDirectory, { recursive: true });

// Import the actual source against the selected runtime's peers. An isolated
// fixture avoids silently mixing old/new peers or changing the working copy.
const fixture = join(outputDirectory, 'plugin');
const manifest = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
await mkdir(fixture, { recursive: true });
await cp(join(projectRoot, 'src'), join(fixture, 'src'), { recursive: true });
await writeFile(join(fixture, 'package.json'), JSON.stringify(manifest, null, 2));
for (const dependency of Object.keys(manifest.peerDependencies)) {
  const target = dirname(requireRuntime.resolve(`${dependency}/package.json`));
  const destination = join(fixture, 'node_modules', dependency);
  await mkdir(dirname(destination), { recursive: true });
  await symlink(target, destination, process.platform === 'win32' ? 'junction' : 'dir');
}
const theaterPlugin = await import(pathToFileURL(join(fixture, 'src', 'host.mjs')).href);

let activeCalls = 0;
let completedCalls = 0;
let abortedCalls = 0;
let holdNextCall = false;
let notifyHeldCall;
const heldCallStarted = new Promise((resolveStarted) => { notifyHeldCall = resolveStarted; });

const mockLlm = {
  async *stream(options) {
    assert.equal(options.provider, 'local-smoke-provider');
    assert.equal(options.model, 'local-smoke-model');
    assert.equal(options.apiKey, undefined);
    activeCalls += 1;
    try {
      yield { type: 'block-start', index: 0, blockType: 'text' };
      if (holdNextCall) {
        yield { type: 'text-delta', index: 0, text: '尚未完成的发言' };
        notifyHeldCall();
        await new Promise((resolveWait, reject) => {
          const timeout = setTimeout(() => {
            options.signal.removeEventListener('abort', onAbort);
            reject(new Error('Smoke check: plugin teardown did not abort the active model call'));
          }, 5000);
          const onAbort = () => {
            clearTimeout(timeout);
            options.signal.removeEventListener('abort', onAbort);
            abortedCalls += 1;
            reject(options.signal.reason);
          };
          options.signal.addEventListener('abort', onAbort, { once: true });
          if (options.signal.aborted) onAbort();
        });
      }
      const text = options.system.includes('当前身份是主持人')
        ? '共识\n先验证最小玩法。\n分歧\n技术投入尚待评估。\n下一步\n安排一次用户试玩。'
        : `本地宿主检查发言 ${completedCalls + 1}：明确观点，并回应其他角色。`;
      yield { type: 'text-delta', index: 0, text };
      yield { type: 'block-end', index: 0, block: { type: 'text', text } };
      yield { type: 'usage', usage: { inputTokens: 100, outputTokens: 30 } };
      yield { type: 'finish', reason: { kind: 'stop' } };
      completedCalls += 1;
    } finally {
      activeCalls -= 1;
    }
  },
};

const root = new Context();
const config = { maxRuns: 3, maxTokens: 512, timeoutMs: 1000 };
let pluginFiber;
let ownerPeer;
try {
  await root.plugin(storage.default);
  await root.plugin(jsonStorage, { root: outputDirectory });
  await root.plugin(domains, { backend: 'json' });
  await root.plugin(registry.default);
  // Newer Gateways require the public access-policy service and a caller Peer;
  // older runtimes predate those contracts. Load only what the Gateway declares.
  if (gateway.default.inject?.includes('remoteAccess')) {
    const [access, connection] = await Promise.all([
      loadRuntime('@deepseek-ai/dsh-api-remote-access'),
      loadRuntime('@deepseek-ai/dsh-client-connection'),
    ]);
    await root.plugin(access.default);
    ownerPeer = new connection.Peer(root, { principal: { kind: 'owner' } });
  }
  await root.plugin(gateway.default);
  await root.plugin((ctx) => {
    ctx.provide('llm', mockLlm);
    ctx.provide('agentDefaultModel', { currentSelection: () => ({ provider: 'local-smoke-provider', model: 'local-smoke-model' }) });
  });
  pluginFiber = await root.plugin(theaterPlugin, config);
  const typert = root.get('typert');
  const dispatcher = root.get('typertGateway');
  assert.ok(dispatcher, 'The native Gateway must have all declared dependencies before dispatch');
  const invoke = (method, args = {}) => dispatcher.invoke({ namespace: 'roundtable', method, args, ...(ownerPeer ? { peer: ownerPeer } : {}) });
  const action = (input) => invoke('action', { input });
  const service = root.get('roundtable');
  assert.ok(service, 'Host plugin must register its roundtable service');
  assert.equal(service.typertRemote.serviceKey, 'roundtable');
  assert.equal(service.typertRemote.namespace, 'roundtable');
  assert.equal(typert.getPackage(PACKAGE_ID, 'host').package, PACKAGE_ID);
  for (const descriptor of INVOCATIONS) {
    assert.equal(typert.local.get(`${descriptor.namespace}/${descriptor.method}`).id, descriptor.id);
  }

  assert.deepEqual((await invoke('state')).runs, []);
  await assert.rejects(action({ type: 'unknown' }), (error) => error.code === 'gateway/input-invalid' && error.field === 'input');
  const created = await action({ type: 'create', topic: '本地宿主契约检查：朋友一起玩的小游戏' });
  const runId = created.runs[0].id;
  await action({ type: 'start', id: runId });
  await service.engine.whenIdle(runId);
  const completed = (await invoke('state')).runs.find((run) => run.id === runId);
  assert.equal(completed.status, 'completed');
  assert.deepEqual(completed.messages.map((message) => message.role), ['product', 'engineer', 'critic', 'product', 'engineer', 'critic', 'host']);
  assert.ok(completed.messages.every((message) => message.status === 'completed'));
  assert.match(completed.summary, /共识/);
  assert.match(completed.summary, /分歧/);
  assert.match(completed.summary, /下一步/);
  assert.equal(completedCalls, 7);

  await action({ type: 'vote', id: runId, messageId: completed.messages[0].id, value: 1 });
  await action({ type: 'ask', id: runId, role: 'engineer', text: '第一版怎样控制实现成本？' });
  await service.engine.whenIdle(runId);
  const followedUp = (await invoke('state')).runs.find((run) => run.id === runId);
  assert.equal(followedUp.messages[0].vote, 1);
  assert.equal(followedUp.messages.at(-1).question, '第一版怎样控制实现成本？');
  assert.equal(followedUp.summaryOutdated, true);

  // Dispose while a real plugin-owned generation is waiting. This proves that
  // lifecycle cleanup aborts and drains work before closing the storage domain.
  const second = await action({ type: 'create', topic: '验证插件卸载会取消发言并保存可恢复状态' });
  const interruptedId = second.runs.find((run) => run.id !== runId).id;
  holdNextCall = true;
  await action({ type: 'start', id: interruptedId });
  await heldCallStarted;
  await pluginFiber.dispose();
  pluginFiber = undefined;
  assert.equal(activeCalls, 0);
  assert.equal(abortedCalls, 1);
  assert.equal(root.get('roundtable'), undefined);
  assert.equal(typert.local.get('roundtable/state'), undefined);
  assert.equal(typert.getPackage(PACKAGE_ID, 'host'), undefined);

  // Reload the same public plugin against the same isolated JSON backend.
  pluginFiber = await root.plugin(theaterPlugin, config);
  const restored = await invoke('state');
  assert.equal(restored.runs.find((run) => run.id === runId).messages[0].vote, 1);
  assert.equal(restored.runs.find((run) => run.id === interruptedId).status, 'paused');
  assert.equal(restored.runs.find((run) => run.id === interruptedId).messages[0].status, 'error');
  await pluginFiber.dispose();
  pluginFiber = undefined;
  const documents = (await readdir(outputDirectory)).filter((name) => name.endsWith('.json'));
  assert.equal(documents.length, 1, 'The isolated backend must contain exactly the theater domain');
  const storageEvidence = join(outputDirectory, documents[0]);
  const document = JSON.parse(await readFile(storageEvidence, 'utf8'));
  assert.equal(document.global.schemaVersion, 1);
  assert.equal(document.global.runs.length, 2);
  console.log(JSON.stringify({
    ok: true,
    runtime: runtimeManifest.version,
    completedModelCalls: completedCalls,
    abortedModelCalls: abortedCalls,
    activeModelCalls: activeCalls,
    checks: ['Cordis plugin loading', 'Typert RPC validation and dispatch', 'two rounds and summary', 'vote and follow-up', 'unload cancellation', 'JSON persistence and reload'],
    storageEvidence,
  }, null, 2));
} finally {
  await pluginFiber?.dispose();
  await ownerPeer?.dispose();
  await root.fiber.dispose();
  assert.equal(activeCalls, 0, 'No model task may survive root disposal');
}
