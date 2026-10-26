import test from 'node:test';
import assert from 'node:assert/strict';
import { createTheater } from '../src/engine.mjs';

const reply = async ({ role, instruction, onDelta }) => {
  onDelta?.('实时');
  return `${role}: ${instruction}`;
};
async function setup(options = {}) {
  const engine = createTheater({ generate: reply, ...options });
  await engine.init();
  const run = await engine.create({ topic: '做一款好玩的微信小游戏' });
  return { engine, run };
}

test('two rounds and final summary use prior completed transcript', async () => {
  const calls = [], saves = [];
  const { engine, run } = await setup({ generate: async (input) => { calls.push(input); return reply(input); }, save: async (state) => saves.push(state) });
  const events = [];
  const unsubscribe = engine.subscribe((state) => events.push(state));
  engine.start(run.id);
  await engine.whenIdle(run.id);
  const result = engine.get(run.id);
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.messages.map((message) => message.role), ['product', 'engineer', 'critic', 'product', 'engineer', 'critic', 'host']);
  assert.deepEqual(calls.map((call) => call.transcript.length), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(result.messages[3].round, 2);
  assert.equal(result.summary, result.messages[6].text);
  assert.ok(events.some((state) => state.runs[0].messages.some((message) => message.text === '实时')));
  assert.equal(saves.at(-1).runs[0].status, 'completed');
  result.messages.length = 0;
  assert.equal(engine.get(run.id).messages.length, 7);
  unsubscribe();
  await engine.close();
});

test('ask and retry preserve history, original question and revision', async () => {
  const { engine, run } = await setup();
  engine.start(run.id);
  await engine.whenIdle();
  engine.ask(run.id, { role: 'critic', text: '用户为什么愿意付费？' });
  assert.throws(() => engine.ask(run.id, { role: 'product', text: '并发追问' }), /正在发言/);
  await engine.whenIdle();
  let current = engine.get(run.id);
  const message = current.messages.at(-1);
  assert.equal(message.question, '用户为什么愿意付费？');
  assert.equal(current.status, 'completed');
  assert.equal(current.summaryOutdated, true);
  engine.retry(run.id, message.id);
  await engine.whenIdle();
  current = engine.get(run.id);
  assert.equal(current.messages.length, 8);
  assert.equal(current.messages.at(-1).revisions.length, 1);
  assert.equal(current.messages.at(-1).revisions[0].text, message.text);
  await engine.close();
});

test('pause aborts active generation; resume skips completed stages', async () => {
  let secondStarted;
  const started = new Promise((resolve) => { secondStarted = resolve; });
  let count = 0;
  const { engine, run } = await setup({ generate: async (input) => {
    count++;
    if (count === 2) return new Promise((resolve, reject) => {
      secondStarted();
      input.signal.addEventListener('abort', () => reject(input.signal.reason), { once: true });
    });
    return reply(input);
  } });
  engine.start(run.id);
  await started;
  engine.pause(run.id);
  await engine.whenIdle();
  assert.equal(engine.get(run.id).status, 'paused');
  assert.equal(engine.get(run.id).messages[0].status, 'completed');
  assert.equal(engine.get(run.id).messages[1].status, 'error');
  engine.resume(run.id);
  await engine.whenIdle();
  assert.equal(count, 8);
  assert.equal(engine.get(run.id).messages.length, 7);
  assert.equal(engine.get(run.id).status, 'completed');
  await engine.close();
});

test('resume completes an interrupted manual follow-up or summary using the same message', async (t) => {
  for (const role of ['critic', 'host']) await t.test(role, async () => {
    let count = 0, entered;
    const gate = new Promise((resolve) => { entered = resolve; });
    const { engine, run } = await setup({ generate: async (input) => {
      if (++count === 8) {
        input.onDelta('尚未完成');
        entered();
        return new Promise((resolve, reject) => input.signal.addEventListener('abort', () => reject(input.signal.reason), { once: true }));
      }
      return reply(input);
    } });
    engine.start(run.id);
    await engine.whenIdle();
    engine.ask(run.id, { role, text: '加入预算限制后重新评价' });
    await gate;
    const messageId = engine.get(run.id).messages.at(-1).id;
    engine.pause(run.id);
    await engine.whenIdle();
    engine.resume(run.id);
    await engine.whenIdle();
    const result = engine.get(run.id);
    assert.equal(count, 9);
    assert.equal(result.status, 'completed');
    assert.equal(result.messages.length, 8);
    assert.equal(result.messages.at(-1).id, messageId);
    assert.equal(result.messages.at(-1).status, 'completed');
    assert.match(result.messages.at(-1).text, /加入预算限制/);
    await engine.close();
  });
});

test('resumed automatic stage sees later director input; explicit early retry retains original context', async () => {
  const calls = [];
  let entered;
  const gate = new Promise((resolve) => { entered = resolve; });
  const { engine, run } = await setup({ generate: async (input) => {
    calls.push(input);
    if (calls.length === 2) {
      entered();
      return new Promise((resolve, reject) => input.signal.addEventListener('abort', () => reject(input.signal.reason), { once: true }));
    }
    return reply(input);
  } });
  engine.start(run.id);
  await gate;
  engine.pause(run.id);
  await engine.whenIdle();
  engine.ask(run.id, { role: 'critic', text: '导演追加：必须离线运行' });
  await engine.whenIdle();
  engine.resume(run.id);
  await engine.whenIdle();
  assert.ok(calls[3].transcript.some((message) => message.question === '导演追加：必须离线运行'));
  engine.retry(run.id, engine.get(run.id).messages[0].id);
  await engine.whenIdle();
  assert.equal(calls.at(-1).transcript.length, 0);
  await engine.close();
});

test('busy remains true until paused state finishes saving and is never persisted', async () => {
  let started, enteredSave, releaseSave;
  const startGate = new Promise((resolve) => { started = resolve; });
  const saveGate = new Promise((resolve) => { enteredSave = resolve; });
  const releaseGate = new Promise((resolve) => { releaseSave = resolve; });
  const events = [], persisted = [];
  const { engine, run } = await setup({
    generate: ({ signal }) => new Promise((resolve, reject) => { started(); signal.addEventListener('abort', () => reject(signal.reason), { once: true }); }),
    save: async (state) => {
      persisted.push(state);
      if (state.runs.some((item) => item.status === 'paused')) { enteredSave(); await releaseGate; }
    },
  });
  engine.subscribe((state) => events.push(state));
  assert.equal(engine.start(run.id).busy, true);
  await startGate;
  engine.pause(run.id);
  await saveGate;
  assert.equal(engine.get(run.id).status, 'paused');
  assert.equal(engine.get(run.id).busy, true);
  releaseSave();
  await engine.whenIdle();
  assert.equal(engine.get(run.id).busy, false);
  assert.equal(events.at(-1).runs[0].busy, false);
  assert.ok(persisted.every((state) => state.runs.every((item) => !Object.hasOwn(item, 'busy'))));
  await engine.close();
});

test('votes toggle explicit values and snapshots remain detached', async () => {
  const { engine, run } = await setup();
  engine.start(run.id);
  await engine.whenIdle();
  const messageId = engine.get(run.id).messages[0].id;
  for (const value of [1, -1, 0]) {
    await engine.vote(run.id, { messageId, value });
    assert.equal(engine.get(run.id).messages[0].vote, value);
  }
  await assert.rejects(engine.vote(run.id, { messageId, value: 5 }), /投票值/);
  await engine.close();
});

test('failed vote persistence rolls back without publishing a successful vote', async () => {
  let fail = false;
  const { engine, run } = await setup({ save: async () => { if (fail) throw new Error('磁盘不可写'); } });
  engine.start(run.id);
  await engine.whenIdle();
  const messageId = engine.get(run.id).messages[0].id, events = [];
  engine.subscribe((state) => events.push(state));
  fail = true;
  await assert.rejects(engine.vote(run.id, { messageId, value: 1 }), /磁盘不可写/);
  assert.equal(engine.get(run.id).messages[0].vote, 0);
  assert.equal(engine.get(run.id).summaryOutdated, false);
  assert.equal(events.length, 0);
  fail = false;
  await engine.vote(run.id, { messageId, value: 1 });
  assert.equal(engine.get(run.id).summaryOutdated, true);
  await engine.close();
});

test('archive validation rejects malformed message metadata; full archive permits retry', async () => {
  const { engine, run } = await setup();
  engine.start(run.id);
  await engine.whenIdle();
  const state = { schemaVersion: 1, runs: engine.list() };
  for (const metadata of [{ round: 7 }, { question: 123 }, { revisions: Array(6).fill({}) }]) {
    const brokenState = structuredClone(state);
    Object.assign(brokenState.runs[0].messages[0], metadata);
    const broken = createTheater({ generate: reply, load: async () => brokenState });
    await assert.rejects(broken.init(), /存档/);
  }
  while (state.runs[0].messages.length < 80) state.runs[0].messages.push({ id: `extra-${state.runs[0].messages.length}`, role: 'product', round: 2, kind: 'question', text: '已有回答', status: 'completed', vote: 0 });
  const full = createTheater({ generate: reply, load: async () => state });
  await full.init();
  full.retry(run.id, state.runs[0].messages[0].id);
  await full.whenIdle();
  assert.equal(full.get(run.id).messages.length, 80);
  assert.equal(full.get(run.id).status, 'completed');
  await full.close();
  await engine.close();
});

test('storage restore pauses interrupted activity and rejects bad archives', async () => {
  const { engine, run } = await setup();
  engine.start(run.id);
  await engine.whenIdle();
  const stored = { schemaVersion: 1, runs: engine.list() };
  stored.runs[0].status = 'running';
  stored.runs[0].messages.at(-1).status = 'streaming';
  const restored = createTheater({ generate: reply, load: async () => stored });
  await restored.init();
  assert.equal(restored.get(run.id).status, 'paused');
  restored.resume(run.id);
  await restored.whenIdle();
  assert.equal(restored.get(run.id).status, 'completed');
  const broken = createTheater({ generate: reply, load: async () => ({ schemaVersion: 5, runs: [] }) });
  await assert.rejects(broken.init(), /格式/);
  await restored.close();
  await engine.close();
});

test('errors are visible, failed initial save prevents generation, capacity and input are bounded', async () => {
  let failSave = false, generated = 0;
  const { engine, run } = await setup({ maxRuns: 1, generate: async () => { generated++; throw new Error('模型不可用'); }, save: async () => { if (failSave) throw new Error('磁盘不可写'); } });
  await assert.rejects(engine.create({ topic: '另一场' }), /最多/);
  engine.start(run.id);
  await engine.whenIdle();
  assert.equal(engine.get(run.id).status, 'error');
  assert.match(engine.get(run.id).error, /模型不可用/);
  failSave = true;
  engine.resume(run.id);
  await engine.whenIdle();
  assert.equal(generated, 1);
  assert.match(engine.get(run.id).error, /保存讨论失败/);
  failSave = false;
  await engine.remove(run.id);
  await assert.rejects(engine.create({ topic: ' ' }), /不能为空/);
  await engine.create({ topic: '新的讨论' });
  await engine.close();
});
