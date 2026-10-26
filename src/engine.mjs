import { randomUUID } from 'node:crypto';

export const ROLE_IDS = Object.freeze(['product', 'engineer', 'critic', 'host']);
const STAGES = ['product', 'engineer', 'critic', 'product', 'engineer', 'critic', 'host'];
const clone = (value) => structuredClone(value);
const abortError = () => new DOMException('讨论已暂停', 'AbortError');

function textInput(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(`${name}不能为空，且不能超过 ${max} 字`);
  }
  return value.trim();
}

/** The sole owner of roundtable state; generation and persistence are injected. */
export function createTheater({ generate, load = async () => null, save = async () => {}, maxRuns = 30, now = Date.now }) {
  if (typeof generate !== 'function') throw new TypeError('generate is required');
  if (!Number.isInteger(maxRuns) || maxRuns < 1 || maxRuns > 100) throw new Error('maxRuns 必须为 1–100');
  let runs = [], initialized = false, closed = false, writes = Promise.resolve();
  const listeners = new Set(), tasks = new Map(), voteVersions = new WeakMap();
  const view = (run) => clone({ ...run, busy: tasks.has(run.id) });
  const snapshot = () => ({ schemaVersion: 1, runs: runs.map(view) });
  const notify = () => { for (const listener of listeners) { try { listener(snapshot()); } catch {} } };
  const persist = () => {
    const value = clone({ schemaVersion: 1, runs });
    const pending = writes.catch(() => {}).then(() => save(value));
    writes = pending;
    return pending;
  };
  const changed = (run) => { run.updatedAt = now(); notify(); };
  function ready() {
    if (!initialized) throw new Error('圆桌尚未初始化');
    if (closed) throw new Error('圆桌已经关闭');
  }
  function find(id) {
    ready();
    const run = runs.find((item) => item.id === id);
    if (!run) throw new Error('找不到这场讨论');
    return run;
  }
  function available(id) {
    const run = find(id);
    if (tasks.has(id)) throw new Error('这场讨论正在发言，请先暂停或等待完成');
    return run;
  }

  async function speak(run, role, { stage, question, target, includeLater = false } = {}, signal) {
    if (signal.aborted) throw abortError();
    let message = target ?? run.messages.find((item) => item.stage === stage && stage !== undefined);
    if (!message) {
      if (run.messages.length >= 80) throw new Error('单场讨论最多保存 80 条发言，请新建讨论');
      message = { id: randomUUID(), role, round: stage !== undefined && stage < 3 ? 1 : run.round, kind: role === 'host' ? 'summary' : question ? 'question' : 'speech', text: '', status: 'streaming', vote: 0 };
      if (stage !== undefined) message.stage = stage;
      if (question) message.question = question;
      run.messages.push(message);
    } else {
      if (message.text) message.revisions = [...(message.revisions ?? []), { text: message.text, at: now(), vote: message.vote }].slice(-5);
      message.text = '';
      message.status = 'streaming';
      message.vote = 0;
      delete message.error;
    }
    run.activeRole = role;
    run.round = message.round;
    if (run.summary) run.summaryOutdated = true;
    changed(run);
    const position = run.messages.indexOf(message);
    const context = role === 'host' || includeLater ? run.messages.filter((item) => item !== message) : run.messages.slice(0, position);
    const transcript = clone(context.filter((item) => item.status === 'completed' && (role !== 'host' || item.kind !== 'summary')));
    const instruction = question ?? message.question ?? (role === 'host'
      ? '总结两轮讨论，分别列出共识、分歧和可执行的下一步。清楚标明尚待验证的假设。'
      : message.round === 1 ? '第一轮：从你的角色出发给出立场、建议和理由。' : '第二轮：回应其他角色的意见，提出质疑、修正和具体取舍，避免重复第一轮。');
    try {
      const value = await generate({ role, topic: run.topic, transcript, instruction, signal, onDelta(delta) {
        if (signal.aborted || typeof delta !== 'string') return;
        message.text = (message.text + delta).slice(0, 32000);
        changed(run);
      } });
      if (signal.aborted) throw abortError();
      message.text = textInput(value, '回答', 32000);
      message.status = 'completed';
      if (message.kind === 'summary') { run.summary = message.text; run.summaryOutdated = false; }
      else if (run.summary) run.summaryOutdated = true;
      delete run.activeRole;
      changed(run);
      await persist();
    } catch (error) {
      message.status = 'error';
      message.error = signal.aborted ? '发言已暂停，可继续生成' : String(error.message ?? error);
      throw error;
    }
  }

  function launch(run, operation, { automatic = false } = {}) {
    const controller = new AbortController();
    const previousStatus = run.status;
    run.status = 'running';
    delete run.error;
    changed(run);
    const task = { controller, promise: null };
    tasks.set(run.id, task);
    task.promise = (async () => {
      try {
        await persist();
        if (controller.signal.aborted) throw abortError();
        await operation(controller.signal);
        run.status = automatic ? 'completed' : previousStatus === 'completed' ? 'completed' : 'paused';
      } catch (error) {
        run.status = controller.signal.aborted ? 'paused' : 'error';
        if (!controller.signal.aborted) run.error = String(error.message ?? error);
      } finally {
        delete run.activeRole;
        changed(run);
        try { await persist(); } catch (error) { run.status = 'error'; run.error = `保存讨论失败：${error.message ?? error}`; notify(); }
        tasks.delete(run.id);
        notify();
      }
    })();
    return view(run);
  }

  async function runStages(run, signal) {
    for (const [stage, role] of STAGES.entries()) {
      if (signal.aborted) throw abortError();
      const existing = run.messages.find((item) => item.stage === stage);
      if (existing?.status !== 'completed') {
        run.round = stage < 3 ? 1 : 2;
        await speak(run, role, { stage, includeLater: !!existing }, signal);
      }
    }
  }

  const api = {
    async init() {
      if (initialized || closed) throw new Error('圆桌已初始化或关闭');
      const value = clone(await load());
      if (value != null) {
        if (value.schemaVersion !== 1 || !Array.isArray(value.runs) || value.runs.length > maxRuns) throw new Error('讨论存档格式不兼容或超过容量');
        const ids = new Set();
        for (const run of value.runs) {
          if (!run || typeof run.id !== 'string' || !run.id || run.id.length > 128 || ids.has(run.id) || !Array.isArray(run.messages) || run.messages.length > 80) throw new Error('讨论存档损坏');
          ids.add(run.id);
          textInput(run.topic, '存档主题', 4000);
          if (!['draft', 'running', 'paused', 'completed', 'error'].includes(run.status) || ![1, 2].includes(run.round) || !Number.isFinite(run.updatedAt) || !Number.isFinite(run.createdAt)) throw new Error('讨论存档状态无效');
          if (run.summary !== undefined && (typeof run.summary !== 'string' || run.summary.length > 32000)) throw new Error('讨论结论存档无效');
          if (run.summaryOutdated !== undefined && typeof run.summaryOutdated !== 'boolean') throw new Error('讨论结论状态无效');
          const messageIds = new Set(), stages = new Set();
          for (const message of run.messages) {
            if (!message || typeof message.id !== 'string' || !message.id || message.id.length > 128 || messageIds.has(message.id) || !ROLE_IDS.includes(message.role) || ![1, 2].includes(message.round) || !['speech', 'question', 'summary'].includes(message.kind) || !['streaming', 'completed', 'error'].includes(message.status) || typeof message.text !== 'string' || message.text.length > 32000 || ![-1, 0, 1].includes(message.vote)) throw new Error('发言存档损坏');
            messageIds.add(message.id);
            if (message.stage !== undefined) {
              if (!Number.isInteger(message.stage) || message.stage < 0 || message.stage > 6 || STAGES[message.stage] !== message.role || stages.has(message.stage)) throw new Error('发言阶段存档无效');
              stages.add(message.stage);
            }
            if (message.question !== undefined) textInput(message.question, '存档追问', 2000);
            if (message.revisions !== undefined && (!Array.isArray(message.revisions) || message.revisions.length > 5 || message.revisions.some((revision) => !revision || typeof revision.text !== 'string' || revision.text.length > 32000 || !Number.isFinite(revision.at) || ![-1, 0, 1].includes(revision.vote)))) throw new Error('发言修订存档损坏');
            if (message.status === 'streaming') { message.status = 'error'; message.error = '上次运行中断，可继续生成'; }
          }
          if (run.status === 'running') run.status = 'paused';
          delete run.activeRole;
          delete run.busy;
        }
        runs = clone(value.runs);
      }
      initialized = true;
      return snapshot();
    },
    list() { ready(); return [...runs].sort((a, b) => b.updatedAt - a.updatedAt).map(view); },
    get(id) { return view(find(id)); },
    async create({ topic }) {
      ready();
      topic = textInput(topic, '讨论主题', 4000);
      if (runs.length >= maxRuns) throw new Error(`最多保留 ${maxRuns} 场讨论，请先删除历史讨论`);
      const run = { id: randomUUID(), topic, status: 'draft', createdAt: now(), updatedAt: now(), round: 1, messages: [] };
      runs.push(run);
      try { await persist(); } catch (error) { runs = runs.filter((item) => item !== run); throw new Error(`保存讨论失败：${error.message ?? error}`); }
      notify();
      return view(run);
    },
    start(id) {
      const run = available(id);
      if (run.status === 'completed') throw new Error('讨论已经完成，可以点名追问');
      return launch(run, (signal) => runStages(run, signal), { automatic: true });
    },
    resume(id) {
      const run = available(id);
      const pending = run.messages.findLast((item) => item.stage === undefined && item.status === 'error');
      if (run.status === 'completed' && !pending) throw new Error('讨论已经完成，可以点名追问');
      return launch(run, async (signal) => {
        if (pending) await speak(run, pending.role, { target: pending, includeLater: true }, signal);
        await runStages(run, signal);
      }, { automatic: true });
    },
    pause(id) {
      const run = find(id), task = tasks.get(id);
      if (!task) throw new Error('当前没有正在进行的发言');
      task.controller.abort();
      return view(run);
    },
    ask(id, { role, text }) {
      const run = available(id);
      if (!ROLE_IDS.includes(role)) throw new Error('未知角色');
      text = textInput(text, '追问', 2000);
      return launch(run, (signal) => speak(run, role, { question: text }, signal));
    },
    retry(id, messageId) {
      const run = available(id), target = run.messages.find((item) => item.id === messageId);
      if (!target) throw new Error('找不到这条发言');
      return launch(run, (signal) => speak(run, target.role, { target }, signal));
    },
    async vote(id, { messageId, value }) {
      const run = find(id), message = run.messages.find((item) => item.id === messageId);
      if (!message || message.status !== 'completed') throw new Error('只能对已完成的发言投票');
      if (![-1, 0, 1].includes(value)) throw new Error('投票值必须为 -1、0 或 1');
      const previous = { vote: message.vote, summaryOutdated: run.summaryOutdated, updatedAt: run.updatedAt };
      const version = (voteVersions.get(message) ?? 0) + 1;
      voteVersions.set(message, version);
      message.vote = value;
      if (run.summary && message.kind !== 'summary' && previous.vote !== value) run.summaryOutdated = true;
      const timestamp = now();
      run.updatedAt = timestamp;
      try { await persist(); } catch (error) {
        if (voteVersions.get(message) === version) {
          message.vote = previous.vote;
          if (run.updatedAt === timestamp) { run.updatedAt = previous.updatedAt; run.summaryOutdated = previous.summaryOutdated; }
        }
        throw error;
      }
      notify();
      return view(run);
    },
    async remove(id) {
      const run = available(id), index = runs.indexOf(run);
      runs.splice(index, 1);
      try { await persist(); } catch (error) { runs.splice(index, 0, run); throw error; }
      notify();
    },
    subscribe(listener) {
      ready();
      if (typeof listener !== 'function') throw new TypeError('listener is required');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async whenIdle(id) {
      if (id !== undefined) await tasks.get(id)?.promise;
      else await Promise.all([...tasks.values()].map((item) => item.promise));
    },
    async flush() { await writes; },
    async close() {
      if (closed) return;
      closed = true;
      for (const task of tasks.values()) task.controller.abort();
      await api.whenIdle();
      listeners.clear();
      await writes;
    },
  };
  return api;
}
