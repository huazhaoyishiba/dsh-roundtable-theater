// Generated from src/ by npm run build.
window.__ModuleLoader__.load({id:'dsh-roundtable-theater',factory(require){
const module={exports:{}};
const Protocol=(() => {
// The same descriptors are used by the Host and the browser ModuleLoader bundle.
const PACKAGE_ID = 'dsh-roundtable-theater';

function requireText(value, name, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new TypeError(`${name}无效`);
  return value;
}

function parseAction(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('操作格式无效');
  const allowed = ['create', 'start', 'pause', 'resume', 'remove', 'ask', 'retry', 'vote'];
  if (!allowed.includes(value.type)) throw new TypeError('未知操作');
  if (value.type === 'create') return { type: value.type, topic: requireText(value.topic, '主题', 4000) };
  const action = { type: value.type, id: requireText(value.id, '讨论编号', 128) };
  if (value.type === 'ask') {
    if (!['product', 'engineer', 'critic', 'host'].includes(value.role)) throw new TypeError('未知角色');
    return { ...action, role: value.role, text: requireText(value.text, '追问', 2000) };
  }
  if (value.type === 'retry' || value.type === 'vote') action.messageId = requireText(value.messageId, '发言编号', 128);
  if (value.type === 'vote') {
    if (![-1, 0, 1].includes(value.value)) throw new TypeError('投票值无效');
    action.value = value.value;
  }
  return action;
}

function parseSnapshot(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.runs) || value.runs.length > 100) throw new TypeError('讨论数据无效');
  for (const run of value.runs) {
    if (!run || typeof run.id !== 'string' || typeof run.topic !== 'string' || !Array.isArray(run.messages) || run.messages.length > 80) throw new TypeError('讨论记录无效');
  }
  return value;
}

const codec = (name, parse) => {
  const schema = { parse };
  // 0.1 reads schema directly; 0.2 creates it lazily. Both use one validator.
  return { mode: 'strict', typeSymbol: `${PACKAGE_ID}#${name}`, schema, create: () => schema };
};
const INVOCATIONS = ['state', 'action'].map((method) => ({
  id: `${PACKAGE_ID}#roundtable/${method}`,
  service: 'roundtable', namespace: 'roundtable', method,
  invocation: { kind: 'direct' },
  parameters: method === 'state' ? [] : [{ name: 'input', wire: 'input', source: 'json', codec: codec('action:input', parseAction) }],
  result: codec(`${method}:result`, parseSnapshot),
}));

return {PACKAGE_ID,INVOCATIONS};
})();
const UI=(() => {
/** Browser view. State and generation belong to the host engine, reached only through api. */
const ROLES = {
  product: { name: '产品经理', tag: '先找到值得做的事', color: 'var(--rt-role-product)' },
  engineer: { name: '程序员', tag: '把想法落到现实', color: 'var(--rt-role-engineer)' },
  critic: { name: '挑刺用户', tag: '替真实体验把关', color: 'var(--rt-role-critic)' },
  host: { name: '主持人', tag: '收束分歧，留下行动', color: 'var(--rt-role-host)' },
};
const STATUS = { draft: '等待开场', running: '讨论进行中', paused: '已暂停', completed: '本场已结束', error: '讨论遇到问题' };
const EXAMPLES = ['做一款上班间隙能玩的微信小游戏', '给独立开发者做一个轻量记账工具', '让新用户在一分钟内学会使用我的产品'];
const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgNode(tag, attributes) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function icon(name) {
  const node = svgNode('svg', { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  const paths = {
    play: 'm9 5 11 7-11 7V5Z', pause: 'M8 5v14M16 5v14', plus: 'M12 5v14M5 12h14',
    retry: 'M4 11a8 8 0 1 1 2 7M4 4v7h7', download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    up: 'm6 14 6-6 6 6', down: 'm6 10 6 6 6-6', send: 'm3 3 19 9-19 9 4-9-4-9Zm4 9h15',
    trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
    theater: 'M3 4h18v5a9 9 0 0 1-18 0V4Zm5 5h1m6 0h1m-8 4c2 3 6 3 8 0',
  };
  node.append(svgNode('path', { d: paths[name] || paths.theater }));
  return node;
}

function avatar(role) {
  const node = svgNode('svg', { viewBox: '0 0 80 80', width: 64, height: 64, fill: 'none', 'aria-hidden': 'true' });
  node.append(svgNode('circle', { cx: 40, cy: 40, r: 39, fill: 'currentColor', opacity: .1 }));
  node.append(svgNode('path', { d: 'M14 72c1-16 10-24 26-24s25 8 26 24', fill: 'currentColor', opacity: .7 }));
  node.append(svgNode('path', { d: role === 'critic' ? 'M24 35c0-21 32-21 32 0v7H24Z' : 'M24 31c0-20 32-20 32 0v12H24Z', fill: 'currentColor' }));
  node.append(svgNode('ellipse', { cx: 40, cy: 35, rx: 13, ry: 17, fill: '#ead8ce' }));
  const hair = role === 'product' ? 'M26 29c1-14 26-15 28 1-7-2-11-5-14-9-3 5-8 7-14 8Z' : role === 'engineer' ? 'M26 31c-2-18 30-20 29-1l-8-5-7 3-8-3Z' : 'M24 38c-5-25 31-29 33-7-10 1-16-3-19-8-2 7-7 11-14 15Z';
  node.append(svgNode('path', { d: hair, fill: '#3a303d' }));
  node.append(svgNode('path', { d: 'M33 35h1m12 0h1M37 44q3 2 6 0', stroke: '#59454d', 'stroke-width': 2, 'stroke-linecap': 'round' }));
  if (role === 'engineer') node.append(svgNode('path', { d: 'M28 32h10v7H28Zm14 0h10v7H42Zm-4 3h4', stroke: '#54445c', 'stroke-width': 2 }));
  node.append(svgNode('path', { d: 'm33 51 7 8 7-8', stroke: '#211b2c', 'stroke-width': 2 }));
  return node;
}

function button(label, action, { glyph, className = 'rt-button', title } = {}) {
  const node = el('button', className);
  node.type = 'button';
  if (glyph) node.append(icon(glyph));
  node.append(el('span', '', label));
  if (title) node.title = title;
  node.addEventListener('click', action);
  return node;
}

function dateText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function exportMarkdown(run) {
  const sections = [`# ${run.topic}`, '', `圆桌剧场 · ${new Date(run.createdAt).toLocaleString('zh-CN')}`, ''];
  for (const message of run.messages) {
    sections.push(`## ${ROLES[message.role]?.name || message.role}${message.kind === 'summary' ? ' · 结论' : ` · 第 ${message.round} 轮`}`, '');
    if (message.question) sections.push(`> 追问：${message.question}`, '');
    sections.push(message.text || '（未完成）', '');
  }
  const url = URL.createObjectURL(new Blob([sections.join('\n')], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `圆桌剧场-${run.topic.replace(/[\\/:*?"<>|]/g, '').slice(0, 36) || '讨论'}.md`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Mounts one view; all DOM and subscriptions are released by destroy(). */
function mountTheater(root, { api }) {
  let snapshot = { runs: [] };
  let selectedId = null;
  let showNew = true;
  let busy = false;
  let loaded = false;
  let destroyed = false;
  let notified = false;
  let error = '';
  let messageNodes = new Map();
  let renderedRunId = null;
  let renderFrame = 0;

  const shell = el('section', 'rt-theater');
  shell.setAttribute('aria-label', 'AI 圆桌剧场');
  const header = el('header', 'rt-header');
  const brand = el('div', 'rt-brand');
  const mark = el('span', 'rt-brand-mark'); mark.append(icon('theater'));
  const titles = el('div'); titles.append(el('h1', '', 'AI 圆桌剧场'), el('p', '', '好想法，值得被认真争论。'));
  brand.append(mark, titles);
  const newButton = button('新一场', () => { showNew = true; error = ''; render(); topicInput.focus(); }, { glyph: 'plus', className: 'rt-button rt-new' });
  header.append(brand, newButton);

  const navigation = el('div', 'rt-navigation');
  const historyLabel = el('label', '', '讨论记录');
  const history = el('select', 'rt-history');
  history.setAttribute('aria-label', '切换讨论记录');
  history.addEventListener('change', () => { selectedId = history.value; showNew = false; error = ''; render(); });
  historyLabel.append(history);
  const model = el('span', 'rt-model');
  navigation.append(historyLabel, model);

  const alert = el('div', 'rt-alert'); alert.setAttribute('role', 'alert');
  const alertText = el('span');
  const reconnect = button('重试连接', () => reload(), { glyph: 'retry', className: 'rt-text-button' });
  alert.append(alertText, reconnect);

  const stage = el('section', 'rt-stage');
  stage.setAttribute('aria-label', '圆桌角色');
  const stageCaption = el('div', 'rt-stage-caption', '三个视角，同一张圆桌');
  const table = el('div', 'rt-table');
  table.append(el('span', '', '想法在此交锋'));
  table.setAttribute('aria-hidden', 'true');
  const seats = el('div', 'rt-seats');
  const seatNodes = {};
  for (const role of ['product', 'engineer', 'critic']) {
    const item = ROLES[role];
    const seat = el('div', `rt-seat rt-seat-${role}`);
    seat.style.setProperty('--role', item.color);
    const portrait = el('div', 'rt-portrait'); portrait.append(avatar(role));
    const state = el('span', 'rt-seat-state', '已入座');
    const name = el('strong', '', item.name);
    const tag = el('span', 'rt-seat-tag', item.tag);
    seat.append(portrait, name, tag, state);
    seats.append(seat);
    seatNodes[role] = { seat, state };
  }
  stage.append(stageCaption, table, seats);

  const newForm = el('form', 'rt-new-form');
  const topicLabel = el('label', 'rt-topic-label', '今天，把什么想法摆上桌？');
  const topicInput = el('textarea', 'rt-topic-input');
  topicInput.id = `rt-topic-${Math.random().toString(36).slice(2)}`;
  topicInput.rows = 3; topicInput.maxLength = 4000;
  topicInput.placeholder = '说说你想做的产品、游戏，或一个还没想明白的决定…';
  topicLabel.htmlFor = topicInput.id;
  const examples = el('div', 'rt-examples');
  for (const example of EXAMPLES) examples.append(button(example, () => { topicInput.value = example; topicInput.focus(); }, { className: 'rt-example' }));
  const newFooter = el('div', 'rt-form-footer');
  newFooter.append(el('span', 'rt-helper', '两轮交锋，最后由主持人收束结论。'));
  const startButton = button('开始这一场', () => newForm.requestSubmit(), { glyph: 'play', className: 'rt-button rt-primary' });
  newFooter.append(startButton);
  newForm.append(topicLabel, topicInput, examples, newFooter);
  newForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const topic = topicInput.value.trim();
    if (!topic || busy || !loaded) { topicInput.focus(); return; }
    const knownIds = new Set(snapshot.runs.map((run) => run.id));
    await act({ type: 'create', topic }, (next) => {
      const created = next.runs.find((run) => !knownIds.has(run.id));
      selectedId = created?.id || next.runs[0]?.id;
      showNew = false;
      topicInput.value = '';
      return selectedId;
    }).then(async (id) => { if (id && !destroyed) await act({ type: 'start', id }); });
  });
  topicInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); newForm.requestSubmit(); }
  });

  const discussion = el('section', 'rt-discussion');
  const discussionHeader = el('div', 'rt-discussion-header');
  const topic = el('h2', 'rt-discussion-topic');
  const runStatus = el('span', 'rt-run-status');
  const runActions = el('div', 'rt-run-actions');
  const pause = button('暂停', () => act({ type: 'pause', id: selectedId }), { glyph: 'pause' });
  const resume = button('继续讨论', () => act({ type: currentRun()?.status === 'draft' ? 'start' : 'resume', id: selectedId }), { glyph: 'play', className: 'rt-button rt-primary' });
  const download = button('导出', () => { const run = currentRun(); if (run) exportMarkdown(run); }, { glyph: 'download' });
  const remove = button('删除', async () => {
    const run = currentRun();
    if (run && window.confirm(`删除「${run.topic.slice(0, 50)}」及本场发言记录？`)) await act({ type: 'remove', id: run.id });
  }, { glyph: 'trash', title: '删除本场讨论' });
  runActions.append(pause, resume, download, remove);
  discussionHeader.append(topic, runStatus, runActions);
  const progress = el('div', 'rt-progress');
  const progressItems = ['第一轮 · 摆出立场', '第二轮 · 交叉质疑', '主持人 · 结论'].map((label) => el('span', '', label));
  progress.append(...progressItems);
  const timeline = el('div', 'rt-timeline');
  timeline.setAttribute('aria-label', '讨论发言');
  const waiting = el('div', 'rt-waiting', '角色已就位，开始后会依次发言。');
  const activity = el('div', 'rt-activity'); activity.setAttribute('role', 'status');
  const summaryNotice = el('div', 'rt-summary-notice');
  summaryNotice.setAttribute('role', 'status');
  const summaryNoticeText = el('span', '', '结论尚未包含最新发言或投票。');
  const refreshSummary = button('刷新结论', () => {
    timeline.scrollTop = timeline.scrollHeight;
    return act({ type: 'ask', id: selectedId, role: 'host', text: '请根据全部最新发言、追问与用户投票重新总结共识、分歧和下一步。' });
  }, { glyph: 'retry', className: 'rt-button' });
  summaryNotice.append(summaryNoticeText, refreshSummary);

  const askForm = el('form', 'rt-ask-form');
  const askLabel = el('label', 'rt-ask-label', '导演席 · 你的追问');
  const askInput = el('textarea', 'rt-ask-input');
  askInput.id = `rt-ask-${Math.random().toString(36).slice(2)}`;
  askInput.rows = 2; askInput.maxLength = 2000;
  askInput.placeholder = '点名一位，追问你最在意的地方…';
  askLabel.htmlFor = askInput.id;
  const askFooter = el('div', 'rt-form-footer');
  const target = el('select', 'rt-target'); target.setAttribute('aria-label', '选择追问角色');
  for (const role of ['product', 'engineer', 'critic']) { const option = el('option', '', ROLES[role].name); option.value = role; target.append(option); }
  const askHint = el('span', 'rt-helper', '等当前发言结束，或先暂停讨论。');
  const askButton = button('请你回答', () => askForm.requestSubmit(), { glyph: 'send', className: 'rt-button rt-primary' });
  askFooter.append(target, askHint, askButton);
  askForm.append(askLabel, askInput, askFooter);
  askForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = askInput.value.trim();
    if (!text || busy || currentRun()?.busy || currentRun()?.status === 'running') return;
    timeline.scrollTop = timeline.scrollHeight;
    const submitted = await act({ type: 'ask', id: selectedId, role: target.value, text });
    if (submitted && !destroyed) askInput.value = '';
  });
  askInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); askForm.requestSubmit(); }
  });
  discussion.append(discussionHeader, progress, summaryNotice, timeline, activity, askForm);
  const footer = el('footer', 'rt-footer', '你来出题，也由你决定听取哪些建议。');
  shell.append(header, navigation, alert, stage, newForm, discussion, footer);
  root.replaceChildren(shell);

  function currentRun() { return snapshot.runs.find((run) => run.id === selectedId); }
  function setSnapshot(next) {
    if (destroyed || !next || !Array.isArray(next.runs)) return;
    snapshot = next;
    loaded = true;
    if (!selectedId || !snapshot.runs.some((run) => run.id === selectedId)) {
      selectedId = snapshot.runs[0]?.id || null;
      showNew = !selectedId;
    }
    scheduleRender();
  }
  function scheduleRender() {
    if (!renderFrame && !destroyed) renderFrame = requestAnimationFrame(() => { renderFrame = 0; render(); });
  }
  async function reload() {
    error = ''; render();
    try { setSnapshot(await api.state()); }
    catch (failure) { if (!destroyed) { error = failure.message || '暂时无法连接，请重试。'; render(); } }
  }
  async function act(action, beforeAccept) {
    if (busy || destroyed) return undefined;
    busy = true; error = ''; render();
    try {
      const next = await api.action(action);
      if (destroyed) return undefined;
      const result = beforeAccept ? beforeAccept(next) : true;
      setSnapshot(next);
      return result;
    } catch (failure) {
      if (!destroyed) error = failure.message || '操作没有完成，请稍后再试。';
      return undefined;
    } finally { if (!destroyed) { busy = false; render(); } }
  }

  function makeMessage(message) {
    const card = el('article', `rt-message${message.kind === 'summary' ? ' rt-summary' : ''}`);
    const top = el('div', 'rt-message-header');
    const badge = el('span', 'rt-message-badge');
    const name = el('strong');
    const label = el('span', 'rt-message-label');
    top.append(badge, name, label);
    const question = el('blockquote', 'rt-message-question');
    const body = el('div', 'rt-message-body');
    const tools = el('div', 'rt-message-actions');
    const agree = button('赞同', () => act({ type: 'vote', id: selectedId, messageId: message.id, value: agree.getAttribute('aria-pressed') === 'true' ? 0 : 1 }), { glyph: 'up', className: 'rt-text-button' });
    const challenge = button('质疑', () => act({ type: 'vote', id: selectedId, messageId: message.id, value: challenge.getAttribute('aria-pressed') === 'true' ? 0 : -1 }), { glyph: 'down', className: 'rt-text-button' });
    const retry = button('重新回答', () => act({ type: 'retry', id: selectedId, messageId: message.id }), { glyph: 'retry', className: 'rt-text-button rt-retry' });
    const version = el('span', 'rt-message-version');
    tools.append(agree, challenge, version, retry);
    card.append(top, question, body, tools);
    return { card, badge, name, label, question, body, tools, agree, challenge, retry, version };
  }
  function renderMessages(run) {
    const nearBottom = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight < 100;
    const changedRun = renderedRunId !== run.id;
    if (changedRun) {
      timeline.replaceChildren(); messageNodes.clear(); renderedRunId = run.id;
    }
    const ids = new Set(run.messages.map((message) => message.id));
    const latestSummaryId = run.messages.findLast((message) => message.kind === 'summary')?.id;
    for (const [id, view] of messageNodes) if (!ids.has(id)) { view.card.remove(); messageNodes.delete(id); }
    if (!run.messages.length) { if (!waiting.isConnected) timeline.append(waiting); }
    else waiting.remove();
    for (const message of run.messages) {
      let view = messageNodes.get(message.id);
      if (!view) { view = makeMessage(message); messageNodes.set(message.id, view); timeline.append(view.card); }
      const role = ROLES[message.role] || ROLES.host;
      view.card.style.setProperty('--role', role.color);
      view.card.classList.toggle('rt-streaming', message.status === 'streaming');
      view.badge.textContent = message.role === 'host' ? '结' : role.name.slice(0, 1);
      view.name.textContent = role.name;
      view.label.textContent = message.kind === 'summary' ? (message.id === latestSummaryId ? '本场结论' : '此前结论') : message.kind === 'question' ? '点名追问' : `第 ${message.round} 轮`;
      view.question.hidden = !message.question;
      view.question.textContent = message.question ? `你的追问：${message.question}` : '';
      view.body.textContent = message.text || (message.status === 'streaming' ? '正在组织观点…' : message.status === 'error' ? '这次发言未完成，可以重新回答。' : '');
      view.agree.setAttribute('aria-pressed', String(message.vote === 1));
      view.challenge.setAttribute('aria-pressed', String(message.vote === -1));
      view.agree.disabled = busy || message.status !== 'completed';
      view.challenge.disabled = busy || message.status !== 'completed';
      view.retry.disabled = busy || run.busy || run.status === 'running';
      view.version.textContent = message.revisions?.length ? `已重答 ${message.revisions.length} 次` : '';
    }
    if (nearBottom || changedRun) timeline.scrollTop = timeline.scrollHeight;
  }
  function render() {
    if (destroyed) return;
    const run = currentRun();
    const showingRun = run && !showNew;
    shell.classList.toggle('rt-is-discussion', !!showingRun);
    newForm.hidden = !!showingRun;
    discussion.hidden = !showingRun;
    navigation.hidden = !snapshot.runs.length;
    const runError = showingRun ? run.error : '';
    alert.hidden = !error && !snapshot.error && !runError;
    alertText.textContent = error || snapshot.error || runError || '';
    reconnect.hidden = !error;
    const currentHistory = history.value;
    if (history.options.length !== snapshot.runs.length || [...history.options].some((option, index) => option.value !== snapshot.runs[index]?.id)) {
      history.replaceChildren(...snapshot.runs.map((item) => {
        const option = el('option', '', `${dateText(item.createdAt)}  ${item.topic}`);
        option.value = item.id; return option;
      }));
    }
    history.value = selectedId || currentHistory;
    model.textContent = !loaded ? '正在连接圆桌剧场…' : snapshot.model?.model ? snapshot.model.model : '跟随 Harness 当前模型';
    model.title = snapshot.model?.provider ? `模型提供方：${snapshot.model.provider}` : '讨论使用 Harness 已配置的模型';
    startButton.disabled = busy || !loaded;
    newButton.disabled = busy || !loaded;
    for (const [role, view] of Object.entries(seatNodes)) {
      const active = !!showingRun && run.status === 'running' && run.activeRole === role;
      view.seat.classList.toggle('rt-speaking', active);
      view.state.textContent = active ? '正在发言' : showingRun && run.messages.some((message) => message.role === role && message.status === 'completed') ? '已发表观点' : '已入座';
    }
    stageCaption.textContent = showingRun ? (run.activeRole === 'host' && run.status === 'running' ? '主持人正在收束这一场讨论' : STATUS[run.status] || '') : '三个视角，同一张圆桌';
    if (!showingRun) return;
    topic.textContent = run.topic;
    runStatus.textContent = STATUS[run.status] || run.status;
    runStatus.classList.toggle('rt-live', run.status === 'running');
    pause.hidden = run.status !== 'running';
    pause.disabled = busy;
    resume.hidden = run.status === 'running' || run.status === 'completed';
    resume.disabled = busy || run.busy;
    download.disabled = !run.messages.length;
    remove.disabled = busy || run.busy || run.status === 'running';
    summaryNotice.hidden = !run.summaryOutdated;
    refreshSummary.disabled = busy || run.busy || run.status === 'running';
    const hasSummary = run.messages.some((message) => message.kind === 'summary');
    progressItems.forEach((item, index) => {
      const active = index === 0 ? run.round === 1 && !hasSummary : index === 1 ? run.round === 2 && !hasSummary : hasSummary;
      const done = index === 0 ? run.round === 2 || hasSummary : index === 1 ? hasSummary : run.status === 'completed';
      item.classList.toggle('rt-current', active); item.classList.toggle('rt-done', done);
    });
    activity.textContent = run.status === 'running' ? `${ROLES[run.activeRole]?.name || '圆桌角色'}正在思考，你可以先暂停，再加入追问。` : run.status === 'completed' ? '这一场已落幕。还没问透的地方，可以继续点名追问。' : '讨论已暂停，你可以加入追问，或继续下一位的发言。';
    askButton.disabled = busy || run.busy || run.status === 'running';
    askInput.disabled = busy || run.busy || run.status === 'running';
    target.disabled = busy || run.busy || run.status === 'running';
    askHint.hidden = run.status !== 'running';
    renderMessages(run);
  }

  const unsubscribe = api.subscribe((next) => { notified = true; setSnapshot(next); });
  render();
  api.state().then((next) => { if (!notified) setSnapshot(next); }).catch((failure) => { if (!destroyed) { error = failure.message || '无法连接圆桌剧场，请重试。'; render(); } });
  return function destroy() {
    destroyed = true;
    unsubscribe?.();
    if (renderFrame) cancelAnimationFrame(renderFrame);
    messageNodes.clear();
    shell.remove();
  };
}

return {mountTheater};
})();
const THEATER_CSS=".rt-theater {\n  /* Palette ownership stays with Harness; system colors support token-free previews. */\n  --rt-bg:var(--dsw-alias-bg-base,Canvas);\n  --rt-surface:var(--dsw-alias-bg-module-platform,color-mix(in srgb,CanvasText 4%,Canvas));\n  --rt-panel:var(--dsw-alias-bg-layer-1,Canvas);\n  --rt-input:var(--dsw-specific-input-major,var(--rt-panel));\n  --rt-border:var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 16%,transparent));\n  --rt-divider:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 8%,transparent));\n  --rt-text:var(--dsw-alias-label-primary,CanvasText);\n  --rt-muted:var(--dsw-alias-label-secondary,GrayText);\n  --rt-focus:var(--dsw-alias-state-business-primary,Highlight);\n  --rt-hover:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 6%,transparent));\n  --rt-active:var(--dsw-alias-interactive-bg-active,color-mix(in srgb,CanvasText 10%,transparent));\n  --rt-primary-fill:var(--dsw-alias-button-primary-fill,CanvasText);\n  --rt-primary-hover:var(--dsw-alias-button-primary-hover,color-mix(in srgb,CanvasText 88%,Canvas));\n  --rt-on-primary:var(--dsw-alias-label-primary-foreground,Canvas);\n  --rt-role-product:color-mix(in srgb,color-mix(in srgb,var(--dsw-alias-state-success-primary,CanvasText) 70%,var(--dsw-alias-state-business-primary,LinkText)) 55%,var(--rt-text));\n  --rt-role-engineer:color-mix(in srgb,var(--dsw-alias-state-business-primary,LinkText) 65%,var(--rt-text));\n  --rt-role-critic:color-mix(in srgb,color-mix(in srgb,var(--dsw-alias-state-error-primary,CanvasText) 65%,var(--dsw-alias-state-business-primary,LinkText)) 62%,var(--rt-text));\n  --rt-role-host:var(--rt-text);\n  --rt-error:color-mix(in srgb,var(--dsw-alias-state-error-primary,CanvasText) 75%,var(--rt-text));\n  box-sizing:border-box;\n  min-width:0;\n  min-height:100%;\n  height:100%;\n  display:flex;\n  flex-direction:column;\n  color:var(--rt-text);\n  background:var(--rt-bg);\n  font-family:var(--dsw-font-family,inherit);\n  font-size:14px;\n  line-height:1.65;\n  container-type:inline-size;\n  overflow-y:auto;\n  scrollbar-color:var(--dsw-alias-scrollbar-bg-l1,GrayText) transparent;\n}\n.rt-theater * {\n  box-sizing:border-box\n}\n.rt-theater [hidden] {\n  display:none!important\n}\n.rt-theater button,.rt-theater textarea,.rt-theater select {\n  font:inherit\n}\n.rt-theater button {\n  cursor:pointer\n}\n.rt-theater button:disabled {\n  cursor:default;\n  opacity:.42\n}\n.rt-theater button:focus-visible,.rt-theater textarea:focus-visible,.rt-theater select:focus-visible {\n  outline:2px solid var(--rt-focus);\n  outline-offset:3px\n}\n.rt-theater button {\n  transition:background-color .16s,border-color .16s,color .16s\n}\n.rt-theater h1,.rt-theater h2,.rt-theater p {\n  margin:0\n}\n.rt-theater textarea,.rt-theater select {\n  color:var(--rt-text);\n  background:var(--rt-input);\n  border:1px solid var(--rt-border);\n  border-radius:var(--dsw-radius-sm,8px)\n}\n.rt-theater textarea {\n  width:100%;\n  resize:vertical;\n  line-height:1.7\n}\n.rt-theater textarea::placeholder {\n  color:var(--rt-muted)\n}\n.rt-theater select {\n  min-height:40px;\n  max-width:100%;\n  padding:7px 28px 7px 10px\n}\n.rt-theater svg {\n  flex-shrink:0\n}\n.rt-header,.rt-navigation,.rt-stage,.rt-new-form,.rt-footer {\n  flex-shrink:0;\n}\n.rt-header {\n  padding:24px 26px 17px;\n  display:flex;\n  align-items:center;\n  justify-content:space-between;\n  gap:16px\n}\n.rt-brand {\n  display:flex;\n  gap:12px;\n  align-items:center;\n  min-width:0\n}\n.rt-brand-mark {\n  display:grid;\n  place-items:center;\n  width:43px;\n  height:47px;\n  border:1px solid var(--rt-border);\n  border-radius:var(--dsw-radius-md,12px);\n  color:var(--rt-text);\n  background:var(--rt-surface);\n}\n.rt-brand-mark svg {\n  width:27px;\n  height:27px\n}\n.rt-brand h1 {\n  font-family:inherit;\n  font-weight:600;\n  font-size:21px;\n  line-height:1.4\n}\n.rt-brand p {\n  color:var(--rt-muted);\n  font-size:12px;\n  margin-top:3px\n}\n.rt-button {\n  display:inline-flex;\n  justify-content:center;\n  align-items:center;\n  gap:7px;\n  min-height:40px;\n  padding:8px 13px;\n  border:1px solid var(--rt-border);\n  border-radius:7px;\n  background:transparent;\n  color:var(--rt-text);\n  white-space:nowrap\n}\n.rt-button:hover:not(:disabled) {\n  background:var(--rt-hover);\n  border-color:var(--dsw-alias-border-l3,var(--rt-border));\n}\n.rt-button.rt-primary {\n  background:var(--rt-primary-fill);\n  border-color:var(--rt-primary-fill);\n  color:var(--rt-on-primary);\n  font-weight:650\n}\n.rt-button.rt-primary:hover:not(:disabled) {\n  background:var(--rt-primary-hover);\n  border-color:var(--rt-primary-hover)\n}\n.rt-new {\n  color:var(--rt-text);\n  border-color:var(--rt-border)\n}\n.rt-navigation {\n  display:flex;\n  justify-content:space-between;\n  align-items:center;\n  gap:12px;\n  padding:0 26px 14px;\n  color:var(--rt-muted);\n  font-size:12px\n}\n.rt-navigation label {\n  display:flex;\n  align-items:center;\n  gap:9px;\n  min-width:0\n}\n.rt-history {\n  width:clamp(150px,24vw,320px);\n  font-size:12px!important\n}\n.rt-model {\n  white-space:nowrap;\n  overflow:hidden;\n  text-overflow:ellipsis;\n  max-width:180px\n}\n.rt-alert {\n  margin:0 26px 14px;\n  padding:11px 14px;\n  border:1px solid color-mix(in srgb,var(--rt-error) 35%,var(--rt-border));\n  border-radius:7px;\n  background:var(--dsw-alias-interactive-bg-hover-danger,color-mix(in srgb,var(--rt-error) 6%,var(--rt-bg)));\n  color:var(--rt-error);\n  display:flex;\n  gap:14px;\n  align-items:center;\n  justify-content:space-between;\n  overflow-wrap:anywhere\n}\n.rt-stage {\n  position:relative;\n  min-height:244px;\n  margin:0 26px 22px;\n  border:1px solid var(--rt-divider);\n  border-radius:var(--dsw-radius-md,12px);\n  overflow:hidden;\n  background:var(--rt-surface);\n}\n.rt-stage-caption {\n  position:relative;\n  z-index:1;\n  text-align:center;\n  color:var(--rt-muted);\n  padding-top:16px;\n  font-size:12px;\n  letter-spacing:normal\n}\n.rt-seats {\n  position:relative;\n  z-index:2;\n  display:flex;\n  justify-content:center;\n  gap:clamp(12px,6vw,80px);\n  padding:20px 16px 24px\n}\n.rt-seat {\n  display:flex;\n  align-items:center;\n  flex-direction:column;\n  position:relative;\n  min-width:0;\n  width:125px;\n  text-align:center;\n  color:var(--role)\n}\n.rt-portrait {\n  position:relative;\n  display:grid;\n  place-items:center;\n  border:1px solid transparent;\n  border-radius:50%;\n  width:71px;\n  height:71px;\n  margin-bottom:5px;\n  transition:border-color .2s,box-shadow .2s\n}\n.rt-seat strong {\n  color:var(--rt-text);\n  font-size:14px;\n  font-weight:600\n}\n.rt-seat-tag {\n  color:var(--rt-muted);\n  font-size:11px;\n  white-space:nowrap;\n  margin-top:1px\n}\n.rt-seat-state {\n  font-size:11px;\n  min-height:20px;\n  margin-top:5px\n}\n.rt-speaking .rt-portrait {\n  border-color:var(--role);\n  box-shadow:0 0 0 4px color-mix(in srgb,var(--role) 10%,transparent)\n}\n.rt-speaking .rt-seat-state::before {\n  content:'';\n  display:inline-block;\n  width:5px;\n  height:5px;\n  vertical-align:middle;\n  background:currentColor;\n  border-radius:50%;\n  margin-right:5px;\n  animation:rt-pulse 1.6s ease-in-out infinite\n}\n.rt-table {\n  position:absolute;\n  width:65%;\n  height:74px;\n  background:var(--rt-panel);\n  left:17.5%;\n  bottom:-39px;\n  border-radius:50%;\n  border:1px solid var(--dsw-alias-border-l3,var(--rt-border));\n}\n.rt-table span {\n  position:absolute;\n  top:8px;\n  width:100%;\n  text-align:center;\n  color:var(--rt-muted);\n  font-size:10px;\n  letter-spacing:normal\n}\n.rt-new-form {\n  padding:0 26px 24px\n}\n.rt-topic-label {\n  display:block;\n  font-size:20px;\n  font-weight:500;\n  color:var(--rt-text);\n  margin:0 0 12px;\n  line-height:1.5\n}\n.rt-topic-input {\n  padding:14px 16px;\n  min-height:108px;\n  font-size:15px!important\n}\n.rt-examples {\n  display:flex;\n  flex-wrap:wrap;\n  gap:8px;\n  margin:12px 0 18px\n}\n.rt-example {\n  color:var(--rt-muted);\n  background:transparent;\n  border:1px solid var(--rt-border);\n  border-radius:5px;\n  padding:6px 10px;\n  text-align:left;\n  line-height:1.5;\n  font-size:12px!important\n}\n.rt-example:hover {\n  color:var(--rt-text);\n  border-color:var(--dsw-alias-border-l3,var(--rt-border));\n  background:var(--rt-hover)\n}\n.rt-form-footer {\n  display:flex;\n  justify-content:space-between;\n  align-items:center;\n  gap:10px\n}\n.rt-helper {\n  font-size:11px;\n  color:var(--rt-muted)\n}\n.rt-footer {\n  margin-top:auto;\n  border-top:1px solid var(--rt-divider);\n  text-align:center;\n  padding:13px 20px;\n  color:var(--rt-muted);\n  font-size:11px\n}\n.rt-discussion {\n  display:flex;\n  flex-direction:column;\n  min-height:0;\n  padding:0 26px 22px;\n  flex:1 0 auto\n}\n.rt-discussion-header {\n  display:flex;\n  flex-wrap:wrap;\n  align-items:center;\n  gap:10px\n}\n.rt-discussion-topic {\n  font-size:18px;\n  line-height:1.6;\n  font-weight:600;\n  overflow-wrap:anywhere;\n  flex:1 1 200px;\n  min-width:0\n}\n.rt-run-status {\n  color:var(--rt-muted);\n  font-size:11px;\n  white-space:nowrap\n}\n.rt-live {\n  color:var(--rt-text)\n}\n.rt-live::before {\n  content:'';\n  display:inline-block;\n  background:var(--rt-focus);\n  width:5px;\n  height:5px;\n  border-radius:50%;\n  margin-right:7px;\n  vertical-align:middle\n}\n.rt-run-actions {\n  width:100%;\n  display:flex;\n  gap:8px;\n  margin-top:2px\n}\n.rt-run-actions .rt-button {\n  min-height:36px;\n  padding:6px 11px;\n  font-size:12px\n}\n.rt-run-actions .rt-button:nth-last-child(2) {\n  margin-left:auto\n}\n.rt-progress {\n  display:flex;\n  gap:0;\n  margin:21px 0 13px;\n  font-size:11px;\n  line-height:1.5\n}\n.rt-progress span {\n  flex:1;\n  padding:9px 3px;\n  border-top:2px solid var(--rt-border);\n  color:var(--rt-muted);\n  white-space:nowrap\n}\n.rt-progress .rt-current {\n  color:var(--rt-text);\n  border-color:var(--rt-text)\n}\n.rt-progress .rt-done {\n  border-color:var(--dsw-alias-border-l4,var(--rt-border));\n  color:var(--rt-muted)\n}\n.rt-timeline {\n  min-height:160px;\n  max-height:560px;\n  overflow-y:auto;\n  overscroll-behavior:contain;\n  scrollbar-gutter:stable;\n  padding-right:4px;\n  scrollbar-width:thin\n}\n.rt-message {\n  padding:17px 17px 12px;\n  background:var(--rt-panel);\n  border:1px solid var(--rt-border);\n  border-left:2px solid var(--role);\n  border-radius:0 9px 9px 0;\n  margin-bottom:13px;\n  overflow-wrap:anywhere\n}\n.rt-message-header {\n  display:flex;\n  align-items:center;\n  gap:9px;\n  margin-bottom:12px\n}\n.rt-message-badge {\n  width:25px;\n  height:25px;\n  display:grid;\n  place-items:center;\n  color:var(--role);\n  background:color-mix(in srgb,var(--role) 8%,var(--rt-panel));\n  border:1px solid color-mix(in srgb,var(--role) 24%,var(--rt-border));\n  border-radius:6px;\n  font-size:11px\n}\n.rt-message-header strong {\n  font-size:13px;\n  font-weight:600;\n  color:var(--role)\n}\n.rt-message-label {\n  margin-left:auto;\n  color:var(--rt-muted);\n  font-size:11px;\n  white-space:nowrap\n}\n.rt-message-body {\n  white-space:pre-wrap;\n  font-size:14px;\n  line-height:1.9;\n  color:var(--rt-text)\n}\n.rt-message-question {\n  font-size:12px;\n  margin:0 0 12px;\n  padding:9px 12px;\n  border-left:2px solid var(--dsw-alias-border-l4,var(--rt-border));\n  background:var(--rt-surface);\n  color:var(--rt-muted);\n  white-space:pre-wrap\n}\n.rt-message-actions {\n  display:flex;\n  align-items:center;\n  gap:4px;\n  margin-top:13px;\n  padding-top:7px;\n  border-top:1px solid var(--rt-divider);\n  flex-wrap:wrap\n}\n.rt-text-button {\n  display:inline-flex;\n  align-items:center;\n  gap:4px;\n  min-height:32px;\n  border:0;\n  border-radius:5px;\n  background:transparent;\n  color:var(--rt-muted);\n  font-size:11px!important;\n  padding:5px 7px\n}\n.rt-text-button:hover:not(:disabled) {\n  color:var(--rt-text);\n  background:var(--rt-hover)\n}\n.rt-text-button[aria-pressed=true] {\n  color:var(--rt-text);\n  background:var(--rt-active)\n}\n.rt-retry {\n  margin-left:auto\n}\n.rt-message-version {\n  font-size:10px;\n  color:var(--rt-muted);\n  margin-left:4px\n}\n.rt-summary {\n  background:var(--rt-surface);\n  border:1px solid var(--dsw-alias-border-l3,var(--rt-border));\n  border-left:3px solid var(--rt-text);\n  border-radius:10px\n}\n.rt-summary .rt-message-header {\n  border-bottom:1px solid var(--rt-divider);\n  padding-bottom:12px\n}\n.rt-summary .rt-message-badge {\n  background:var(--rt-hover)\n}\n.rt-summary-notice {\n  display:flex;\n  align-items:center;\n  justify-content:space-between;\n  gap:12px;\n  padding:11px 13px;\n  margin-bottom:13px;\n  border:1px solid var(--dsw-alias-border-l3,var(--rt-border));\n  border-radius:7px;\n  background:var(--dsw-alias-state-warn-tertiary,var(--rt-surface));\n  color:var(--rt-text);\n  font-size:12px;\n}\n.rt-summary-notice .rt-button {\n  color:var(--rt-text);\n  font-size:12px;\n}\n.rt-streaming .rt-message-body::after {\n  content:'';\n  display:inline-block;\n  background:var(--role);\n  width:5px;\n  height:14px;\n  margin-left:5px;\n  vertical-align:middle;\n  animation:rt-pulse 1s ease-in-out infinite\n}\n.rt-waiting {\n  padding:32px 14px;\n  text-align:center;\n  color:var(--rt-muted);\n  font-size:13px\n}\n.rt-activity {\n  color:var(--rt-muted);\n  font-size:11px;\n  padding:11px 0 14px\n}\n.rt-ask-form {\n  border-top:1px solid var(--rt-border);\n  padding-top:15px\n}\n.rt-ask-label {\n  display:block;\n  font-size:12px;\n  color:var(--rt-text);\n  margin-bottom:8px\n}\n.rt-ask-input {\n  min-height:76px;\n  padding:11px 13px;\n  resize:vertical\n}\n.rt-ask-form .rt-form-footer {\n  margin-top:9px\n}\n.rt-target {\n  font-size:12px!important\n}\n.rt-ask-form .rt-primary {\n  min-height:38px;\n  font-size:12px\n}\n.rt-ask-form .rt-helper {\n  font-size:10px\n}\n.rt-is-discussion .rt-stage {\n  min-height:210px;\n  margin-bottom:18px\n}\n.rt-is-discussion .rt-seats {\n  padding-top:10px;\n  padding-bottom:13px\n}\n.rt-is-discussion .rt-stage-caption {\n  padding-top:11px\n}\n@keyframes rt-pulse {\n  50% {\n    opacity:.3\n  }\n}\n@container (min-width:850px) {\n  .rt-theater .rt-header,.rt-theater .rt-navigation {\n    padding-left:42px;\n    padding-right:42px\n  }\n  .rt-theater .rt-stage {\n    margin-left:42px;\n    margin-right:42px;\n    min-height:270px\n  }\n  .rt-theater .rt-seats {\n    gap:100px;\n    padding-top:23px\n  }\n  .rt-theater .rt-portrait {\n    height:88px;\n    width:88px\n  }\n  .rt-theater .rt-portrait svg {\n    height:80px;\n    width:80px\n  }\n  .rt-theater .rt-new-form,.rt-theater .rt-discussion {\n    padding-left:42px;\n    padding-right:42px\n  }\n  .rt-theater .rt-topic-label {\n    font-size:24px\n  }\n  .rt-theater .rt-new-form {\n    padding-top:9px\n  }\n  .rt-theater .rt-topic-input {\n    min-height:120px\n  }\n  .rt-theater .rt-timeline {\n    max-height:620px\n  }\n  .rt-theater .rt-message {\n    padding:20px 23px 13px\n  }\n  .rt-theater .rt-discussion-header .rt-run-actions {\n    width:auto;\n    margin-left:auto\n  }\n  .rt-theater .rt-discussion-header {\n    gap:18px\n  }\n  .rt-theater .rt-discussion-topic {\n    flex-basis:300px\n  }\n  .rt-theater.rt-is-discussion .rt-stage {\n    min-height:220px\n  }\n}\n@container (max-width:450px) {\n  .rt-button,.rt-text-button,.rt-example,.rt-theater select {\n    min-height:44px;\n  }\n  .rt-run-actions .rt-button,.rt-ask-form .rt-primary {\n    min-height:44px;\n  }\n  .rt-summary-notice {\n    flex-wrap:wrap;\n    font-size:11px;\n  }\n  .rt-header {\n    padding:18px 16px 14px;\n    gap:8px\n  }\n  .rt-brand {\n    gap:8px\n  }\n  .rt-brand-mark {\n    width:34px;\n    height:39px\n  }\n  .rt-brand h1 {\n    font-size:20px\n  }\n  .rt-brand p {\n    font-size:10px\n  }\n  .rt-new {\n    padding:7px 9px;\n    font-size:11px!important;\n    gap:3px\n  }\n  .rt-new svg {\n    width:15px\n  }\n  .rt-navigation {\n    padding:0 16px 12px;\n    gap:8px;\n    flex-wrap:wrap\n  }\n  .rt-navigation label {\n    font-size:11px;\n    flex:1 1 100%;\n    white-space:nowrap;\n  }\n  .rt-history {\n    width:auto;\n    max-width:none;\n    min-width:0;\n    flex:1;\n  }\n  .rt-model {\n    font-size:10px;\n    max-width:100%;\n    margin-left:0;\n  }\n  .rt-stage {\n    margin:0 16px 20px;\n    border-radius:var(--dsw-radius-md,12px);\n    min-height:225px\n  }\n  .rt-stage-caption {\n    font-size:10px;\n    padding-top:13px\n  }\n  .rt-seats {\n    gap:4px;\n    padding:18px 8px 21px\n  }\n  .rt-seat {\n    width:33.33%\n  }\n  .rt-portrait {\n    width:62px;\n    height:62px\n  }\n  .rt-portrait svg {\n    width:58px;\n    height:58px\n  }\n  .rt-seat strong {\n    font-size:12px\n  }\n  .rt-seat-tag {\n    font-size:9px\n  }\n  .rt-seat-state {\n    font-size:10px\n  }\n  .rt-new-form {\n    padding:0 16px 22px\n  }\n  .rt-topic-label {\n    font-size:18px\n  }\n  .rt-topic-input {\n    font-size:13px!important;\n    min-height:110px\n  }\n  .rt-examples {\n    gap:7px\n  }\n  .rt-example {\n    font-size:11px!important;\n    padding:6px 8px\n  }\n  .rt-form-footer {\n    align-items:flex-start\n  }\n  .rt-new-form .rt-form-footer {\n    flex-wrap:wrap\n  }\n  .rt-new-form .rt-helper {\n    flex:1 1 130px;\n    font-size:10px;\n    max-width:170px\n  }\n  .rt-new-form .rt-primary {\n    font-size:12px\n  }\n  .rt-alert {\n    margin:0 16px 13px;\n    font-size:12px;\n    flex-wrap:wrap\n  }\n  .rt-discussion {\n    padding:0 16px 19px\n  }\n  .rt-discussion-topic {\n    font-size:16px;\n    flex-basis:160px\n  }\n  .rt-run-status {\n    font-size:10px\n  }\n  .rt-run-actions {\n    gap:5px\n  }\n  .rt-run-actions .rt-button {\n    font-size:11px;\n    padding:5px 8px;\n    gap:3px\n  }\n  .rt-run-actions svg {\n    width:15px;\n    height:15px\n  }\n  .rt-progress {\n    font-size:9px;\n    margin-top:17px\n  }\n  .rt-progress span {\n    padding-top:7px\n  }\n  .rt-message {\n    padding:13px 12px 9px\n  }\n  .rt-message-body {\n    font-size:13px;\n    line-height:1.9\n  }\n  .rt-message-header {\n    gap:6px\n  }\n  .rt-message-header strong {\n    font-size:12px\n  }\n  .rt-message-label {\n    font-size:10px\n  }\n  .rt-message-actions {\n    gap:0\n  }\n  .rt-text-button {\n    font-size:10px!important;\n    padding:5px\n  }\n  .rt-message-version {\n    font-size:9px\n  }\n  .rt-ask-form .rt-helper {\n    display:none\n  }\n  .rt-activity {\n    font-size:10px\n  }\n  .rt-footer {\n    font-size:10px;\n    padding:12px 16px\n  }\n  .rt-is-discussion .rt-stage {\n    min-height:196px\n  }\n  .rt-is-discussion .rt-seat-tag {\n    font-size:9px\n  }\n}\n@media(prefers-reduced-motion:reduce) {\n  .rt-theater * {\n    animation:none!important;\n    transition:none!important;\n    scroll-behavior:auto!important\n  }\n}\n";
// Embedded by scripts/build.mjs inside the Harness ModuleLoader factory.
const React = require('react');
const { PACKAGE_ID, INVOCATIONS } = Protocol;
const { mountTheater } = UI;

module.exports.inject = ['slots', 'layout', 'remote'];
module.exports.apply = async function apply(ctx) {
  await ctx.remote.$mount({ package: PACKAGE_ID, descriptors: INVOCATIONS });
  // The Remote namespace is created by $mount; inject it afterwards to avoid a
  // dependency cycle while preserving Cordis's namespace access checks.
  ctx.inject(['slots', 'remote', 'remote.roundtable'], (ctx) => {
  const unwrap = async (promise) => {
    const result = await promise;
    if (!result.ok) throw new Error(result.error?.message ?? '圆桌连接失败，请检查 Harness 日志');
    return result.value;
  };

  function TheaterPanel() {
    const container = React.useRef(null);
    React.useEffect(() => {
      let stopped = false, timer, inflight = false, mutating = false, last, sequence = 0, accepted = 0;
      const listeners = new Set();
      const publish = (snapshot) => {
        if (stopped) return snapshot;
        last = snapshot;
        for (const listener of listeners) listener(snapshot);
        return snapshot;
      };
      const state = async () => {
        const ticket = ++sequence;
        const snapshot = await unwrap(ctx.remote.roundtable.state());
        if (ticket < accepted || stopped) return last ?? snapshot;
        accepted = ticket;
        return publish(snapshot);
      };
      const api = {
        state,
        action: async (input) => {
          accepted = ++sequence; mutating = true;
          try { return publish(await unwrap(ctx.remote.roundtable.action(input))); }
          finally { mutating = false; }
        },
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
      };
      const destroy = mountTheater(container.current, { api });
      const tick = async () => {
        if (stopped) return;
        if (inflight || mutating || document.hidden) { timer = setTimeout(tick, 800); return; }
        inflight = true;
        try { await state(); }
        catch { publish({ ...(last ?? { schemaVersion: 1, runs: [] }), error: '与 Harness 的连接已中断，正在尝试重新连接。' }); }
        finally {
          inflight = false;
          if (!stopped) timer = setTimeout(tick, last?.runs.some((run) => run.status === 'running') ? 650 : 4000);
        }
      };
      timer = setTimeout(tick, 800);
      return () => { stopped = true; clearTimeout(timer); listeners.clear(); destroy(); };
    }, []);
    return React.createElement('div', { ref: container, style: { height: '100%', minHeight: 0, width: '100%' } });
  }

  function TheaterIcon({ size = 18 }) {
    return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
      React.createElement('ellipse', { cx: 12, cy: 15, rx: 9, ry: 4 }),
      React.createElement('circle', { cx: 6, cy: 7, r: 2 }),
      React.createElement('circle', { cx: 12, cy: 5, r: 2 }),
      React.createElement('circle', { cx: 18, cy: 7, r: 2 }));
  }

  ctx.effect(() => {
    const style = document.createElement('style'); style.textContent = THEATER_CSS; document.head.append(style);
    return () => style.remove();
  });
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'roundtable-theater' }, TheaterPanel));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'roundtable-theater', order: 25, label: '圆桌剧场' }, TheaterIcon));
  });
};

return module.exports;
}});
