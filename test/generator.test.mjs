import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerator } from '../src/generator.mjs';

const CONFIG = { timeoutMs: 1000, maxTokens: 900 };
const selection = { provider: 'configured-provider', model: 'configured-model', reasoningEffort: 'high' };

function request(overrides = {}) {
  return {
    role: 'product',
    topic: '做一款能和朋友一起玩的小游戏',
    transcript: [],
    instruction: '提出一个能验证的产品方案。',
    signal: new AbortController().signal,
    onDelta() {},
    ...overrides,
  };
}

function context(stream, currentSelection = () => selection) {
  return { llm: { stream }, agentDefaultModel: { currentSelection } };
}

async function* textStream(text = '先验证三分钟的核心玩法。') {
  yield { type: 'block-start', index: 0, blockType: 'text' };
  yield { type: 'text-delta', index: 0, text };
  yield { type: 'block-end', index: 0, block: { type: 'text', text } };
  yield { type: 'usage', usage: { inputTokens: 90, outputTokens: 12, cacheReadTokens: 20 } };
  yield { type: 'finish', reason: { kind: 'stop' } };
}

test('streams text and assembles only the public answer', async () => {
  const deltas = [];
  const generate = createGenerator(context(async function* () {
    yield { type: 'block-start', index: 0, blockType: 'reasoning' };
    yield { type: 'reasoning-delta', index: 0, text: '不应出现在发言中' };
    yield { type: 'block-end', index: 0, block: { type: 'reasoning', text: '不应出现在发言中' } };
    yield { type: 'block-start', index: 1, blockType: 'text' };
    yield { type: 'text-delta', index: 1, text: '先验证' };
    yield { type: 'text-delta', index: 1, text: '核心玩法。' };
    yield { type: 'block-end', index: 1, block: { type: 'text', text: '先验证核心玩法。' } };
    yield { type: 'usage', usage: { inputTokens: 100, outputTokens: 20, reasoningTokens: 10 } };
    yield { type: 'finish', reason: { kind: 'stop' } };
  }), CONFIG);

  assert.equal(await generate(request({ onDelta: (text) => deltas.push(text) })), '先验证核心玩法。');
  assert.deepEqual(deltas, ['先验证', '核心玩法。']);
});

test('inherits the configured model on each call without exposing any API key', async () => {
  const options = [];
  let activeSelection = selection;
  const generate = createGenerator(context((call) => {
    options.push(call);
    return textStream();
  }, () => activeSelection), CONFIG);

  await generate(request());
  activeSelection = { provider: 'second-provider', model: 'second-model' };
  await generate(request({ role: 'engineer' }));

  assert.equal(options[0].provider, selection.provider);
  assert.equal(options[0].model, selection.model);
  assert.equal(options[0].reasoningEffort, 'high');
  assert.equal(options[1].provider, 'second-provider');
  assert.equal(options[1].model, 'second-model');
  assert.equal('reasoningEffort' in options[1], false);
  assert.equal(options[0].maxTokens, CONFIG.maxTokens);
  assert.equal(options[0].tools, undefined);
  assert.equal(options[0].apiKey, undefined);
  assert.match(options[0].system, /产品经理/);
  assert.match(options[1].system, /程序员/);
  assert.equal(options[0].messages[0].role, 'user');
  assert.equal(options[0].messages[0].source.kind, 'plugin');
  assert.match(options[0].messages[0].content[0].text, /做一款能和朋友一起玩的小游戏/);
});

test('terminal error chunks reject even if the provider streamed a partial answer', async () => {
  const generate = createGenerator(context(async function* () {
    yield { type: 'text-delta', index: 0, text: '尚未完成的回答' };
    yield { type: 'finish', reason: { kind: 'error', failure: { message: '模型暂时不可用', code: 'RATE_LIMIT' } } };
  }), CONFIG);

  await assert.rejects(generate(request()), /模型暂时不可用/);
});

test('terminal aborted chunks reject rather than completing a speech', async () => {
  const generate = createGenerator(context(async function* () {
    yield { type: 'finish', reason: { kind: 'aborted', failure: { message: '请求已取消', code: 'ABORTED' } } };
  }), CONFIG);

  await assert.rejects(generate(request()), /请求已取消/);
});

test('token limits and unexpected tool calls cannot become a successful answer', async (t) => {
  for (const [kind, expected] of [['max-tokens', /输出上限/], ['tool-calls', /模型未正常完成/]]) {
    await t.test(kind, async () => {
      const generate = createGenerator(context(async function* () {
        yield { type: 'text-delta', index: 0, text: '部分回答' };
        yield { type: 'finish', reason: { kind } };
      }), CONFIG);
      await assert.rejects(generate(request()), expected);
    });
  }
});

test('empty and whitespace-only answers fail with a useful message', async (t) => {
  for (const text of ['', ' \n\t ']) {
    await t.test(JSON.stringify(text), async () => {
      const generate = createGenerator(context(() => textStream(text)), CONFIG);
      await assert.rejects(generate(request()), /没有返回正文/);
    });
  }
});

test('caller cancellation stops forwarding further deltas', async () => {
  const controller = new AbortController();
  const deltas = [];
  const generate = createGenerator(context(async function* () {
    yield { type: 'text-delta', index: 0, text: '已显示的部分' };
    controller.abort(new Error('用户暂停讨论'));
    yield { type: 'text-delta', index: 0, text: '取消后的部分' };
    yield { type: 'finish', reason: { kind: 'stop' } };
  }), CONFIG);

  await assert.rejects(generate(request({ signal: controller.signal, onDelta: (text) => deltas.push(text) })), /用户暂停讨论/);
  assert.deepEqual(deltas, ['已显示的部分']);
});

test('timeout aborts the provider call and gives a retryable explanation', async () => {
  let providerSignal;
  const generate = createGenerator(context(async function* ({ signal }) {
    providerSignal = signal;
    // Keep one ref'ed timer while waiting: AbortSignal.timeout itself is unref'ed.
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 1000);
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(signal.reason);
      }, { once: true });
    });
    yield { type: 'finish', reason: { kind: 'stop' } };
  }), { ...CONFIG, timeoutMs: 15 });

  await assert.rejects(generate(request()), /等待超时/);
  assert.equal(providerSignal.aborted, true);
});

test('missing model configuration fails before any provider request', async () => {
  let calls = 0;
  const generate = createGenerator(context(() => {
    calls += 1;
    return textStream();
  }, () => ({ provider: 'configured-provider' })), CONFIG);

  await assert.rejects(generate(request()), /先在 Harness 设置中选择可用的模型/);
  assert.equal(calls, 0);
});
