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
    history: 'M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2',
    close: 'm6 6 12 12M6 18 18 6',
    ask: 'M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0ZM9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01',
    copy: 'M8 8h12v13H8ZM4 16H3V3h12v1',
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
  let targetRole = 'product';
  let unseenUpdates = false;
  let followNextRender = false;
  let restoreHistoryFocus = true;
  let composerInitialized = false;
  const drafts = new Map();
  const historyNodes = new Map();
  const viewId = `rt-${Math.random().toString(36).slice(2)}`;

  const shell = el('section', 'rt-theater');
  shell.setAttribute('aria-label', 'AI 圆桌剧场');
  const header = el('header', 'rt-header');
  const brand = el('div', 'rt-brand');
  const mark = el('span', 'rt-brand-mark'); mark.append(icon('theater'));
  const titles = el('div'); titles.append(el('h1', '', 'AI 圆桌剧场'), el('p', '', '好想法，值得被认真争论。'));
  brand.append(mark, titles);
  const headerActions = el('div', 'rt-header-actions');
  const historyButton = button('历史记录', () => {
    renderHistory(); historyDialog.showModal();
    historyButton.setAttribute('aria-expanded', 'true');
    historySearch.focus();
  }, { glyph: 'history', className: 'rt-button rt-history-button' });
  historyButton.setAttribute('aria-haspopup', 'dialog');
  historyButton.setAttribute('aria-expanded', 'false');
  historyButton.setAttribute('aria-controls', `${viewId}-history`);
  const newButton = button('新一场', () => {
    saveDraft(); showNew = true; error = ''; more.open = false;
    render(); topicInput.focus();
  }, { glyph: 'plus', className: 'rt-button rt-new' });
  headerActions.append(historyButton, newButton);
  header.append(brand, headerActions);

  const historyDialog = el('dialog', 'rt-history-dialog');
  historyDialog.id = `${viewId}-history`;
  historyDialog.setAttribute('aria-labelledby', `${viewId}-history-title`);
  const historyHeader = el('div', 'rt-history-header');
  const historyTitle = el('h2', '', '历史记录'); historyTitle.id = `${viewId}-history-title`;
  const closeHistory = button('关闭历史记录', () => historyDialog.close(), { glyph: 'close', className: 'rt-text-button rt-history-close' });
  historyHeader.append(historyTitle, closeHistory);
  const historySearch = el('input', 'rt-history-search');
  historySearch.type = 'search'; historySearch.placeholder = '搜索讨论主题';
  historySearch.setAttribute('aria-label', '搜索讨论记录');
  historySearch.addEventListener('input', renderHistory);
  const historyNote = el('p', 'rt-history-note', '讨论自动保存，新开一场不会覆盖之前的记录。');
  const historyList = el('ul', 'rt-history-list');
  const historyEmpty = el('p', 'rt-history-empty'); historyEmpty.setAttribute('role', 'status');
  historyDialog.append(historyHeader, historyNote, historySearch, historyList, historyEmpty);
  historyDialog.addEventListener('close', () => {
    historyButton.setAttribute('aria-expanded', 'false');
    if (!destroyed && restoreHistoryFocus) historyButton.focus({ preventScroll: true });
    restoreHistoryFocus = true;
  });
  historyDialog.addEventListener('keydown', (event) => {
    // Search fields consume Escape to clear their value in Chromium. The
    // drawer owns this key so one press always closes it and restores focus.
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); historyDialog.close(); }
  });
  historyDialog.addEventListener('click', (event) => {
    if (event.target !== historyDialog) return;
    const rect = historyDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) historyDialog.close();
  });

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
  stage.append(stageCaption, seats, table);

  const landing = el('div', 'rt-landing');

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
      restoreDraft();
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
  topic.tabIndex = -1;
  const runStatus = el('span', 'rt-run-status');
  const runActions = el('div', 'rt-run-actions');
  const pause = button('暂停', () => act({ type: 'pause', id: selectedId }), { glyph: 'pause' });
  const resume = button('继续讨论', () => act({ type: currentRun()?.status === 'draft' ? 'start' : 'resume', id: selectedId }), { glyph: 'play', className: 'rt-button rt-primary' });
  const viewSummary = button('查看结论', () => {
    const summary = currentRun()?.messages.findLast((message) => message.kind === 'summary');
    const card = summary && messageNodes.get(summary.id)?.card;
    if (!card) return;
    timeline.scrollTop += card.getBoundingClientRect().top - timeline.getBoundingClientRect().top - 12;
    card.focus({ preventScroll: true }); updateJump();
  }, { className: 'rt-button rt-view-summary' });
  const more = el('details', 'rt-more');
  const moreTrigger = el('summary', 'rt-more-trigger', '更多操作');
  const moreMenu = el('div', 'rt-more-menu');
  const download = button('导出', () => { more.open = false; const run = currentRun(); if (run) exportMarkdown(run); }, { glyph: 'download' });
  const remove = button('删除', () => { more.open = false; return removeRun(selectedId); }, { glyph: 'trash', title: '删除本场讨论' });
  moreMenu.append(download, remove); more.append(moreTrigger, moreMenu);
  runActions.append(pause, resume, viewSummary, more);
  discussionHeader.append(topic, runStatus, runActions);
  const progress = el('div', 'rt-progress');
  const progressItems = ['第一轮 · 摆出立场', '第二轮 · 交叉质疑', '主持人 · 结论'].map((label) => el('span', '', label));
  progress.append(...progressItems);
  const reading = el('div', 'rt-reading');
  const timeline = el('div', 'rt-timeline');
  timeline.setAttribute('aria-label', '讨论发言');
  timeline.tabIndex = 0;
  timeline.addEventListener('scroll', () => {
    if (nearLatest()) unseenUpdates = false;
    updateJump();
  }, { passive: true });
  const jumpLatest = button('回到最新', () => {
    timeline.scrollTop = timeline.scrollHeight; unseenUpdates = false; updateJump();
  }, { className: 'rt-button rt-jump-latest', glyph: 'down' });
  reading.append(timeline, jumpLatest);
  const waiting = el('div', 'rt-waiting', '角色已就位，开始后会依次发言。');
  const activity = el('div', 'rt-activity'); activity.setAttribute('role', 'status');
  const summaryNotice = el('div', 'rt-summary-notice');
  summaryNotice.setAttribute('role', 'status');
  const summaryNoticeText = el('span', '', '结论尚未包含最新发言或投票。');
  const refreshSummary = button('刷新结论', () => {
    followNextRender = true;
    return act({ type: 'ask', id: selectedId, role: 'host', text: '请根据全部最新发言、追问与用户投票重新总结共识、分歧和下一步。' });
  }, { glyph: 'retry', className: 'rt-button' });
  summaryNotice.append(summaryNoticeText, refreshSummary);

  const askForm = el('form', 'rt-ask-form');
  const askHeader = el('div', 'rt-ask-header');
  const askLabel = el('label', 'rt-ask-label', '导演席 · 你的追问');
  const askToggle = button('收起追问', () => setComposerCollapsed(!askBody.hidden), { className: 'rt-text-button rt-ask-toggle', glyph: 'up' });
  askToggle.setAttribute('aria-expanded', 'true');
  askToggle.setAttribute('aria-controls', `${viewId}-ask-body`);
  askHeader.append(askLabel, askToggle);
  const askBody = el('div', 'rt-ask-body'); askBody.id = `${viewId}-ask-body`;
  const askInput = el('textarea', 'rt-ask-input');
  askInput.id = `rt-ask-${Math.random().toString(36).slice(2)}`;
  askInput.rows = 2; askInput.maxLength = 2000;
  askInput.placeholder = '点名一位，追问你最在意的地方…';
  askLabel.htmlFor = askInput.id;
  const askFooter = el('div', 'rt-form-footer');
  const targets = el('div', 'rt-targets');
  targets.setAttribute('role', 'group'); targets.setAttribute('aria-label', '选择追问角色');
  const targetButtons = new Map();
  for (const role of ['product', 'engineer', 'critic']) {
    const choice = button(ROLES[role].name, () => { targetRole = role; saveDraft(); renderTargets(); }, { className: 'rt-target' });
    choice.style.setProperty('--role', ROLES[role].color);
    targets.append(choice); targetButtons.set(role, choice);
  }
  const askHint = el('span', 'rt-helper');
  const askButton = button('请你回答', () => askForm.requestSubmit(), { glyph: 'send', className: 'rt-button rt-primary' });
  askFooter.append(askHint, askButton);
  askBody.append(targets, askInput, askFooter);
  askForm.append(askHeader, askBody);
  askInput.addEventListener('input', () => { saveDraft(); renderAskState(); });
  askForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = askInput.value.trim();
    if (!text || busy || currentRun()?.busy || currentRun()?.status === 'running') return;
    const submittedId = selectedId;
    const submittedRole = targetRole;
    followNextRender = true;
    const submitted = await act({ type: 'ask', id: submittedId, role: submittedRole, text });
    if (submitted && !destroyed && selectedId === submittedId && targetRole === submittedRole && askInput.value.trim() === text) {
      askInput.value = ''; saveDraft(); renderAskState();
    }
  });
  askInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); askForm.requestSubmit(); }
  });
  discussion.append(discussionHeader, progress, summaryNotice, reading, activity, askForm);
  const footer = el('footer', 'rt-footer', '你来出题，也由你决定听取哪些建议。');
  const model = el('span', 'rt-model'); footer.append(model);
  landing.append(stage, newForm, footer);
  shell.append(header, alert, landing, discussion, historyDialog);
  shell.addEventListener('click', (event) => { if (!more.contains(event.target)) more.open = false; });
  more.addEventListener('keydown', (event) => { if (event.key === 'Escape') { more.open = false; moreTrigger.focus(); } });
  root.replaceChildren(shell);

  function currentRun() { return snapshot.runs.find((run) => run.id === selectedId); }
  function nearLatest() { return timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight < 80; }
  function updateJump() {
    jumpLatest.hidden = !currentRun() || showNew || nearLatest();
    jumpLatest.querySelector('span').textContent = unseenUpdates ? '有新发言，回到最新' : '回到最新';
  }
  function saveDraft() {
    if (selectedId) drafts.set(selectedId, { text: askInput.value, role: targetRole });
  }
  function restoreDraft() {
    const draft = drafts.get(selectedId);
    askInput.value = draft?.text || ''; targetRole = draft?.role || 'product';
    renderTargets();
  }
  function renderTargets() {
    for (const [role, choice] of targetButtons) choice.setAttribute('aria-pressed', String(targetRole === role));
    askInput.placeholder = `向${ROLES[targetRole].name}追问你最在意的地方…`;
  }
  function setComposerCollapsed(collapsed) {
    askForm.classList.toggle('rt-ask-collapsed', collapsed); askBody.hidden = collapsed;
    askToggle.querySelector('span').textContent = collapsed ? '展开追问' : '收起追问';
    askToggle.setAttribute('aria-expanded', String(!collapsed));
  }
  function focusQuestion(role) {
    targetRole = role;
    setComposerCollapsed(false);
    saveDraft(); renderTargets(); askInput.focus({ preventScroll: true });
  }
  function openRun(id) {
    saveDraft(); selectedId = id; showNew = false; error = ''; more.open = false;
    unseenUpdates = false; restoreDraft();
    if (historyDialog.open) { restoreHistoryFocus = false; historyDialog.close(); }
    render(); topic.focus({ preventScroll: true });
  }
  async function removeRun(id) {
    const run = snapshot.runs.find((item) => item.id === id);
    if (!run || busy || run.busy || run.status === 'running') return;
    if (!window.confirm(`删除「${run.topic.slice(0, 50)}」及本场发言记录？`)) return;
    const removed = await act({ type: 'remove', id });
    if (removed) drafts.delete(id);
    if (!destroyed && historyDialog.open) historySearch.focus();
  }
  function renderHistory() {
    const focused = historyDialog.contains(document.activeElement) ? document.activeElement : null;
    const query = historySearch.value.trim().toLocaleLowerCase();
    const ids = new Set(snapshot.runs.map((run) => run.id));
    for (const [id, view] of historyNodes) if (!ids.has(id)) { view.row.remove(); historyNodes.delete(id); }
    let visible = 0;
    snapshot.runs.forEach((run, index) => {
      let view = historyNodes.get(run.id);
      if (!view) {
        const row = el('li', 'rt-history-item');
        const open = button('', () => openRun(run.id), { className: 'rt-history-open' });
        open.replaceChildren();
        const title = el('span', 'rt-history-topic'); const meta = el('span', 'rt-history-meta');
        open.append(title, meta);
        const remove = button('删除', () => removeRun(run.id), { glyph: 'trash', className: 'rt-text-button rt-history-delete' });
        row.append(open, remove); view = { row, open, title, meta, remove }; historyNodes.set(run.id, view);
      }
      const reference = historyList.children[index];
      if (reference !== view.row) historyList.insertBefore(view.row, reference || null);
      view.row.hidden = !!query && !run.topic.toLocaleLowerCase().includes(query);
      if (!view.row.hidden) visible++;
      view.title.textContent = run.topic;
      view.open.title = run.topic;
      view.meta.textContent = `${dateText(run.createdAt)} · ${STATUS[run.status] || run.status} · ${run.messages.length} 条发言`;
      view.open.setAttribute('aria-current', String(!showNew && selectedId === run.id));
      view.open.disabled = busy;
      view.remove.setAttribute('aria-label', `删除讨论：${run.topic}`);
      view.remove.disabled = busy || run.busy || run.status === 'running';
    });
    historyEmpty.hidden = visible > 0;
    historyEmpty.textContent = !snapshot.runs.length ? '还没有讨论记录，开始第一场吧。' : '没有找到匹配的讨论，试试其他关键词。';
    if (focused && document.activeElement !== focused) {
      const target = focused.isConnected && !focused.disabled && !focused.closest('[hidden]') ? focused : historySearch;
      target.focus({ preventScroll: true });
    }
  }
  function renderAskState() {
    const run = currentRun();
    const running = run?.status === 'running' || run?.busy;
    askButton.disabled = busy || !run || running || !askInput.value.trim();
    askHint.textContent = running ? '可以先写下问题，暂停或讨论结束后发送。' : 'Ctrl / ⌘ + Enter 发送';
    // Drafting stays available during generation and while browsing other runs.
    askInput.disabled = !run;
  }
  function setSnapshot(next) {
    if (destroyed || !next || !Array.isArray(next.runs)) return;
    snapshot = next;
    loaded = true;
    if (!selectedId || !snapshot.runs.some((run) => run.id === selectedId)) {
      selectedId = snapshot.runs[0]?.id || null;
      showNew = !selectedId;
      restoreDraft();
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
    card.tabIndex = -1;
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
    const followup = button('追问', () => focusQuestion(message.role), { glyph: 'ask', className: 'rt-text-button' });
    const copyStatus = el('span', 'rt-copy-status'); copyStatus.setAttribute('role', 'status');
    const copy = button('复制结论', async () => {
      const text = currentRun()?.messages.find((item) => item.id === message.id)?.text;
      if (!text) return;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('当前环境无法复制，请使用“导出”保存讨论。');
        await navigator.clipboard.writeText(text);
        if (!destroyed && copyStatus.isConnected) copyStatus.textContent = '已复制';
      } catch (failure) {
        if (!destroyed) { error = failure.message || '复制失败，请使用“导出”保存讨论。'; render(); }
      }
    }, { glyph: 'copy', className: 'rt-text-button' });
    const version = el('span', 'rt-message-version');
    tools.append(agree, challenge, followup, copy, copyStatus, version, retry);
    card.append(top, question, body, tools);
    return { card, badge, name, label, question, body, tools, agree, challenge, retry, version, followup, copy, copyStatus, content: null };
  }
  function renderMessages(run) {
    const nearBottom = nearLatest();
    const changedRun = renderedRunId !== run.id;
    let contentChanged = false;
    if (changedRun) {
      timeline.replaceChildren(); messageNodes.clear(); renderedRunId = run.id;
      unseenUpdates = false;
    }
    const ids = new Set(run.messages.map((message) => message.id));
    const latestSummaryId = run.messages.findLast((message) => message.kind === 'summary')?.id;
    for (const [id, view] of messageNodes) if (!ids.has(id)) { view.card.remove(); messageNodes.delete(id); }
    if (!run.messages.length) { if (!waiting.isConnected) timeline.append(waiting); }
    else waiting.remove();
    for (const message of run.messages) {
      let view = messageNodes.get(message.id);
      if (!view) { view = makeMessage(message); messageNodes.set(message.id, view); timeline.append(view.card); }
      if (view.content !== message.text) {
        contentChanged = true; view.content = message.text; view.copyStatus.textContent = '';
      }
      const role = ROLES[message.role] || ROLES.host;
      view.card.style.setProperty('--role', role.color);
      view.card.classList.toggle('rt-streaming', message.status === 'streaming');
      view.badge.textContent = message.role === 'host' ? '结' : role.name.slice(0, 1);
      view.name.textContent = role.name;
      view.label.textContent = message.kind === 'summary' ? (message.id === latestSummaryId ? '本场结论' : '此前结论') : message.kind === 'question' ? '点名追问' : `第 ${message.round} 轮`;
      view.question.hidden = !message.question;
      view.question.textContent = message.question ? `你的追问：${message.question}` : '';
      const bodyText = message.text || (message.status === 'streaming' ? '正在组织观点…' : message.status === 'error' ? '这次发言未完成，可以重新回答。' : '');
      if (view.body.textContent !== bodyText) view.body.textContent = bodyText;
      view.agree.setAttribute('aria-pressed', String(message.vote === 1));
      view.challenge.setAttribute('aria-pressed', String(message.vote === -1));
      view.agree.disabled = busy || message.status !== 'completed';
      view.challenge.disabled = busy || message.status !== 'completed';
      view.retry.disabled = busy || run.busy || run.status === 'running';
      view.followup.hidden = message.role === 'host';
      view.followup.disabled = busy;
      view.copy.hidden = message.kind !== 'summary';
      view.copy.disabled = message.status !== 'completed';
      view.version.textContent = message.revisions?.length ? `已重答 ${message.revisions.length} 次` : '';
    }
    if (changedRun || followNextRender || (nearBottom && contentChanged)) {
      timeline.scrollTop = timeline.scrollHeight; unseenUpdates = false;
    } else if (contentChanged) unseenUpdates = true;
    followNextRender = false;
    updateJump();
  }
  function render() {
    if (destroyed) return;
    const run = currentRun();
    const showingRun = run && !showNew;
    shell.classList.toggle('rt-is-discussion', !!showingRun);
    landing.hidden = !!showingRun;
    discussion.hidden = !showingRun;
    if (showingRun && stage.parentElement !== discussion) discussion.insertBefore(stage, progress);
    else if (!showingRun && stage.parentElement !== landing) landing.prepend(stage);
    const runError = showingRun ? run.error : '';
    alert.hidden = !error && !snapshot.error && !runError;
    alertText.textContent = error || snapshot.error || runError || '';
    reconnect.hidden = !error;
    if (historyDialog.open) renderHistory();
    model.textContent = !loaded ? '正在连接圆桌剧场…' : snapshot.model?.model ? `当前模型：${snapshot.model.model}` : '跟随 Harness 当前模型';
    model.title = snapshot.model?.provider ? `模型提供方：${snapshot.model.provider}` : '讨论使用 Harness 已配置的模型';
    startButton.disabled = busy || !loaded;
    newButton.disabled = busy || !loaded;
    historyButton.disabled = !loaded;
    renderTargets();
    for (const [role, view] of Object.entries(seatNodes)) {
      const active = !!showingRun && run.status === 'running' && run.activeRole === role;
      view.seat.classList.toggle('rt-speaking', active);
      view.state.textContent = active ? '正在发言' : showingRun && run.messages.some((message) => message.role === role && message.status === 'completed') ? '已发表观点' : '已入座';
    }
    stageCaption.textContent = showingRun ? (run.activeRole === 'host' && run.status === 'running' ? '主持人正在收束这一场讨论' : STATUS[run.status] || '') : '三个视角，同一张圆桌';
    if (!showingRun) { jumpLatest.hidden = true; return; }
    topic.textContent = run.topic;
    topic.title = run.topic;
    if (!composerInitialized) {
      setComposerCollapsed(shell.clientHeight < 650); composerInitialized = true;
    }
    runStatus.textContent = STATUS[run.status] || run.status;
    runStatus.classList.toggle('rt-live', run.status === 'running');
    pause.hidden = run.status !== 'running';
    pause.disabled = busy;
    resume.hidden = run.status === 'running' || run.status === 'completed';
    resume.disabled = busy || run.busy;
    download.disabled = !run.messages.length;
    remove.disabled = busy || run.busy || run.status === 'running';
    viewSummary.hidden = !run.messages.some((message) => message.kind === 'summary');
    viewSummary.title = run.summaryOutdated ? '结论待更新，当前版本未包含最新发言或投票。' : '定位到最新的主持人结论';
    summaryNotice.hidden = !run.summaryOutdated;
    refreshSummary.disabled = busy || run.busy || run.status === 'running';
    const hasSummary = run.messages.some((message) => message.kind === 'summary');
    progressItems.forEach((item, index) => {
      const active = index === 0 ? run.round === 1 && !hasSummary : index === 1 ? run.round === 2 && !hasSummary : hasSummary;
      const done = index === 0 ? run.round === 2 || hasSummary : index === 1 ? hasSummary : run.status === 'completed';
      item.classList.toggle('rt-current', active); item.classList.toggle('rt-done', done);
    });
    activity.textContent = run.status === 'running' ? `${ROLES[run.activeRole]?.name || '圆桌角色'}正在发言` : run.status === 'completed' ? '讨论已保存，可以继续追问。' : '讨论已暂停，可以追问或继续。';
    renderAskState();
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
    historyNodes.clear(); drafts.clear();
    if (historyDialog.open) historyDialog.close();
    shell.remove();
  };
}

return {mountTheater};
})();
const THEATER_CSS="/* Harness owns palette and font settings. The plugin only adds layout and role identity. */\n.rt-theater {\n  --rt-bg:var(--dsw-alias-bg-base,Canvas);\n  --rt-surface:var(--dsw-alias-bg-module-platform,color-mix(in srgb,CanvasText 4%,Canvas));\n  --rt-panel:var(--dsw-alias-bg-layer-1,Canvas);\n  --rt-input:var(--dsw-specific-input-major,var(--rt-panel));\n  --rt-border:var(--dsw-alias-border-l2,color-mix(in srgb,CanvasText 16%,transparent));\n  --rt-divider:var(--dsw-alias-border-l1,color-mix(in srgb,CanvasText 8%,transparent));\n  --rt-text:var(--dsw-alias-label-primary,CanvasText);\n  --rt-muted:var(--dsw-alias-label-secondary,GrayText);\n  --rt-focus:var(--dsw-alias-state-business-primary,Highlight);\n  --rt-hover:var(--dsw-alias-interactive-bg-hover,color-mix(in srgb,CanvasText 6%,transparent));\n  --rt-active:var(--dsw-alias-interactive-bg-active,color-mix(in srgb,CanvasText 10%,transparent));\n  --rt-primary-fill:var(--dsw-alias-button-primary-fill,CanvasText);\n  --rt-primary-hover:var(--dsw-alias-button-primary-hover,color-mix(in srgb,CanvasText 88%,Canvas));\n  --rt-on-primary:var(--dsw-alias-label-primary-foreground,Canvas);\n  --rt-role-product:color-mix(in srgb,color-mix(in srgb,var(--dsw-alias-state-success-primary,CanvasText) 70%,var(--dsw-alias-state-business-primary,LinkText)) 55%,var(--rt-text));\n  --rt-role-engineer:color-mix(in srgb,var(--dsw-alias-state-business-primary,LinkText) 65%,var(--rt-text));\n  --rt-role-critic:color-mix(in srgb,color-mix(in srgb,var(--dsw-alias-state-error-primary,CanvasText) 65%,var(--dsw-alias-state-business-primary,LinkText)) 62%,var(--rt-text));\n  --rt-role-host:var(--rt-text);\n  --rt-error:color-mix(in srgb,var(--dsw-alias-state-error-primary,CanvasText) 75%,var(--rt-text));\n  --rt-gutter:24px;\n  --rt-reading-width:860px;\n  box-sizing:border-box;\n  display:flex;\n  flex-direction:column;\n  width:100%;\n  height:100%;\n  min-height:0;\n  min-width:0;\n  overflow:hidden;\n  color:var(--rt-text);\n  background:var(--rt-bg);\n  font-family:var(--dsw-font-family,inherit);\n  font-size:14px;\n  line-height:1.65;\n  container-type:inline-size;\n  scrollbar-color:var(--dsw-alias-scrollbar-bg-l1,GrayText) transparent;\n}\n.rt-theater *, .rt-history-dialog * { box-sizing:border-box; }\n.rt-theater [hidden] { display:none!important; }\n.rt-theater h1, .rt-theater h2, .rt-theater p { margin:0; }\n.rt-theater button, .rt-theater textarea, .rt-theater select, .rt-theater input { font:inherit; }\n.rt-theater button, .rt-theater summary { cursor:pointer; }\n.rt-theater button:disabled { cursor:default; opacity:.42; }\n.rt-theater svg { flex-shrink:0; }\n.rt-theater button, .rt-theater summary { transition:background-color .16s,border-color .16s,color .16s; }\n.rt-theater :is(button,summary,textarea,select,input):focus-visible {\n  outline:2px solid var(--rt-focus);\n  outline-offset:3px;\n}\n.rt-theater :is(textarea,select,input) {\n  color:var(--rt-text);\n  background:var(--rt-input);\n  border:1px solid var(--rt-border);\n  border-radius:var(--dsw-radius-sm,8px);\n}\n.rt-theater textarea { display:block; width:100%; line-height:1.7; }\n.rt-theater :is(textarea,input)::placeholder { color:var(--rt-muted); }\n.rt-theater select { min-height:44px; max-width:100%; padding:8px 28px 8px 10px; }\n\n/* Header actions stay reachable; new-discussion content owns its own scroll region. */\n.rt-header {\n  flex:none;\n  display:flex;\n  align-items:center;\n  justify-content:space-between;\n  gap:12px;\n  padding:16px var(--rt-gutter) 12px;\n}\n.rt-brand { display:flex; align-items:center; gap:10px; min-width:0; }\n.rt-brand-mark {\n  display:grid;\n  place-items:center;\n  width:36px;\n  height:40px;\n  border:1px solid var(--rt-border);\n  border-radius:var(--dsw-radius-md,12px);\n  background:var(--rt-surface);\n}\n.rt-brand-mark svg { width:24px; height:24px; }\n.rt-brand h1 { font-family:inherit; font-weight:600; font-size:19px; line-height:1.4; }\n.rt-brand p { color:var(--rt-muted); font-size:12px; margin-top:2px; }\n.rt-header-actions { display:flex; align-items:center; gap:8px; flex:none; }\n.rt-button, .rt-text-button, .rt-target, .rt-example, .rt-more-trigger, .rt-ask-toggle, .rt-view-summary {\n  display:inline-flex;\n  justify-content:center;\n  align-items:center;\n  gap:6px;\n  min-height:44px;\n  padding:9px 12px;\n  border:1px solid var(--rt-border);\n  border-radius:var(--dsw-radius-sm,8px);\n  background:transparent;\n  color:var(--rt-text);\n  font-size:13px;\n  line-height:1.5;\n  white-space:nowrap;\n}\n.rt-button:hover:not(:disabled), .rt-target:hover:not(:disabled), .rt-example:hover:not(:disabled), .rt-more-trigger:hover, .rt-ask-toggle:hover:not(:disabled), .rt-view-summary:hover:not(:disabled) { background:var(--rt-hover); }\n.rt-button.rt-primary { background:var(--rt-primary-fill); border-color:var(--rt-primary-fill); color:var(--rt-on-primary); font-weight:600; }\n.rt-button.rt-primary:hover:not(:disabled) { background:var(--rt-primary-hover); border-color:var(--rt-primary-hover); }\n.rt-text-button, .rt-ask-toggle { border-color:transparent; color:var(--rt-muted); padding:8px; font-size:12px; }\n.rt-text-button:hover:not(:disabled) { background:var(--rt-hover); color:var(--rt-text); }\n.rt-text-button[aria-pressed=true] { color:var(--rt-text); background:var(--rt-active); }\n.rt-alert {\n  flex:none;\n  display:flex;\n  align-items:center;\n  justify-content:space-between;\n  gap:12px;\n  margin:0 var(--rt-gutter) 10px;\n  padding:10px 12px;\n  border:1px solid color-mix(in srgb,var(--rt-error) 35%,var(--rt-border));\n  border-radius:8px;\n  background:var(--dsw-alias-interactive-bg-hover-danger,color-mix(in srgb,var(--rt-error) 6%,var(--rt-bg)));\n  color:var(--rt-error);\n  font-size:12px;\n  overflow-wrap:anywhere;\n}\n.rt-landing { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; }\n.rt-landing > .rt-stage, .rt-new-form { width:calc(100% - var(--rt-gutter) * 2); max-width:var(--rt-reading-width); margin-inline:auto; }\n.rt-new-form { padding:0 0 24px; }\n.rt-topic-label { display:block; margin-bottom:12px; color:var(--rt-text); font-size:22px; font-weight:500; line-height:1.5; }\n.rt-topic-input { padding:14px 16px; min-height:112px; resize:vertical; font-size:14px; }\n.rt-examples { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0 18px; }\n.rt-example { min-height:44px; padding:9px 11px; text-align:left; white-space:normal; color:var(--rt-muted); font-size:12px; }\n.rt-form-footer { display:flex; justify-content:space-between; align-items:center; gap:10px; }\n.rt-helper, .rt-model { color:var(--rt-muted); font-size:12px; }\n.rt-model { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100%; }\n.rt-footer { padding:14px var(--rt-gutter); border-top:1px solid var(--rt-divider); color:var(--rt-muted); text-align:center; font-size:12px; }\n\n/* The full roundtable belongs to the opening view only. */\n.rt-stage {\n  flex:none;\n  display:flex;\n  flex-direction:column;\n  min-width:0;\n  min-height:244px;\n  margin-block:8px 22px;\n  overflow:hidden;\n  border:1px solid var(--rt-divider);\n  border-radius:var(--dsw-radius-md,12px);\n  background:var(--rt-surface);\n}\n.rt-stage-caption { text-align:center; color:var(--rt-muted); padding:14px 12px 0; font-size:12px; }\n.rt-seats { display:flex; justify-content:center; gap:clamp(12px,6vw,80px); padding:18px 16px; }\n.rt-seat { display:flex; flex-direction:column; align-items:center; min-width:0; width:125px; color:var(--role); text-align:center; }\n.rt-portrait { display:grid; place-items:center; flex:none; width:72px; height:72px; margin-bottom:5px; border:1px solid transparent; border-radius:50%; }\n.rt-portrait svg { width:64px; height:64px; }\n.rt-seat strong { color:var(--rt-text); font-size:14px; font-weight:600; }\n.rt-seat-tag { color:var(--rt-muted); margin-top:2px; font-size:12px; line-height:1.5; }\n.rt-seat-state { margin-top:5px; min-height:20px; font-size:12px; }\n.rt-speaking .rt-portrait { border-color:var(--role); box-shadow:0 0 0 3px color-mix(in srgb,var(--role) 10%,transparent); }\n.rt-speaking .rt-seat-state::before { content:''; display:inline-block; width:5px; height:5px; margin-right:5px; border-radius:50%; background:currentColor; vertical-align:middle; animation:rt-pulse 1.6s ease-in-out infinite; }\n.rt-table { flex:none; width:65%; margin:auto auto 0; border:1px solid var(--dsw-alias-border-l3,var(--rt-border)); border-bottom:0; border-radius:50% 50% 0 0 / 100% 100% 0 0; background:var(--rt-panel); }\n.rt-table span { display:block; width:100%; padding:.8em 1.2em 1em; color:var(--rt-muted); font-size:12px; text-align:center; }\n\n/* The reading surface is the only scroller during a discussion. */\n.rt-discussion { display:flex; flex-direction:column; flex:1; min-height:0; min-width:0; overflow:hidden; }\n.rt-discussion-header { flex:none; display:flex; align-items:center; flex-wrap:wrap; gap:8px 12px; align-self:center; width:100%; max-width:calc(var(--rt-reading-width) + var(--rt-gutter) * 2); padding:0 var(--rt-gutter) 10px; }\n.rt-discussion-topic { display:-webkit-box; flex:1 1 280px; min-width:0; overflow:hidden; overflow-wrap:anywhere; -webkit-box-orient:vertical; -webkit-line-clamp:2; font-size:17px; line-height:1.55; font-weight:600; }\n.rt-run-status { color:var(--rt-muted); font-size:12px; white-space:nowrap; }\n.rt-live { color:var(--rt-text); }\n.rt-live::before { content:''; display:inline-block; width:5px; height:5px; margin-right:7px; border-radius:50%; background:var(--rt-focus); vertical-align:middle; }\n.rt-run-actions { display:flex; align-items:center; gap:6px; flex:none; }\n.rt-run-actions .rt-button { font-size:12px; padding-inline:10px; }\n.rt-is-discussion .rt-stage { margin:0 var(--rt-gutter) 10px; min-height:0; border:0; border-bottom:1px solid var(--rt-divider); border-radius:0; background:transparent; overflow:visible; }\n.rt-is-discussion .rt-stage-caption, .rt-is-discussion .rt-table, .rt-is-discussion .rt-seat-tag { display:none; }\n.rt-is-discussion .rt-seats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; padding:0 0 10px; }\n.rt-is-discussion .rt-seat { display:grid; grid-template-columns:32px minmax(0,1fr); grid-template-rows:auto auto; align-items:center; gap:0 8px; width:auto; text-align:left; }\n.rt-is-discussion .rt-portrait { grid-row:1 / 3; width:32px; height:32px; margin:0; }\n.rt-is-discussion .rt-portrait svg { width:30px; height:30px; }\n.rt-is-discussion .rt-seat strong { font-size:13px; line-height:1.5; }\n.rt-is-discussion .rt-seat-state { min-height:0; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; line-height:1.5; }\n.rt-progress { flex:none; display:flex; gap:12px; align-self:center; width:100%; max-width:calc(var(--rt-reading-width) + var(--rt-gutter) * 2); padding:0 var(--rt-gutter); color:var(--rt-muted); font-size:12px; line-height:1.5; }\n.rt-progress span { flex:1; padding:0 0 8px; border-bottom:2px solid var(--rt-divider); white-space:nowrap; }\n.rt-progress .rt-current { color:var(--rt-text); border-color:var(--rt-text); }\n.rt-progress .rt-done { border-color:var(--dsw-alias-border-l4,var(--rt-border)); }\n.rt-summary-notice { flex:none; display:flex; align-items:center; justify-content:space-between; gap:8px; align-self:center; width:calc(100% - var(--rt-gutter) * 2); max-width:var(--rt-reading-width); margin:8px 0 0; padding:8px 12px; border:1px solid var(--rt-border); border-radius:8px; background:var(--dsw-alias-state-warn-tertiary,var(--rt-surface)); color:var(--rt-text); font-size:12px; }\n.rt-summary-notice .rt-button { flex:none; font-size:12px; }\n.rt-reading { position:relative; flex:1; min-height:0; min-width:0; overflow:hidden; }\n.rt-timeline { height:100%; min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-gutter:stable; scroll-padding-block:16px 68px; padding:16px var(--rt-gutter) 20px; }\n.rt-jump-latest { position:absolute; right:max(var(--rt-gutter),calc(50% - 430px)); bottom:12px; z-index:2; min-height:44px; padding:9px 14px; border:1px solid var(--rt-border); border-radius:24px; background:var(--dsw-alias-button-floating-fill,var(--rt-panel)); color:var(--rt-text); box-shadow:0 3px 16px color-mix(in srgb,var(--rt-text) 12%,transparent); font-size:12px; }\n.rt-message { max-width:var(--rt-reading-width); margin:0 auto 14px; padding:17px 18px 10px; border:1px solid var(--rt-border); border-left:2px solid var(--role); border-radius:0 9px 9px 0; background:var(--rt-panel); overflow-wrap:anywhere; }\n.rt-message:last-child { margin-bottom:0; }\n.rt-message-header { display:flex; align-items:center; gap:8px; margin-bottom:10px; }\n.rt-message-badge { display:grid; place-items:center; width:26px; height:26px; border:1px solid color-mix(in srgb,var(--role) 24%,var(--rt-border)); border-radius:6px; background:color-mix(in srgb,var(--role) 8%,var(--rt-panel)); color:var(--role); font-size:12px; }\n.rt-message-header strong { color:var(--role); font-size:13px; font-weight:600; }\n.rt-message-label { margin-left:auto; color:var(--rt-muted); font-size:12px; white-space:nowrap; }\n.rt-message-body { white-space:pre-wrap; color:var(--rt-text); font-size:14px; line-height:1.85; }\n.rt-message-question { margin:0 0 12px; padding:9px 12px; border-left:2px solid var(--dsw-alias-border-l4,var(--rt-border)); background:var(--rt-surface); color:var(--rt-muted); font-size:12px; white-space:pre-wrap; }\n.rt-message-actions { display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-top:12px; padding-top:4px; border-top:1px solid var(--rt-divider); }\n.rt-retry { margin-left:auto; }\n.rt-message-version { color:var(--rt-muted); font-size:12px; }\n.rt-summary { border:1px solid var(--dsw-alias-border-l3,var(--rt-border)); border-left:3px solid var(--rt-text); border-radius:10px; background:var(--rt-surface); }\n.rt-summary .rt-message-header { border-bottom:1px solid var(--rt-divider); padding-bottom:10px; }\n.rt-summary .rt-message-badge { background:var(--rt-hover); }\n.rt-streaming .rt-message-body::after { content:''; display:inline-block; width:5px; height:14px; margin-left:5px; background:var(--role); vertical-align:middle; animation:rt-pulse 1s ease-in-out infinite; }\n.rt-waiting { max-width:var(--rt-reading-width); margin-inline:auto; padding:32px 14px; color:var(--rt-muted); text-align:center; font-size:13px; }\n.rt-activity { flex:none; width:100%; max-width:calc(var(--rt-reading-width) + var(--rt-gutter) * 2); align-self:center; padding:5px var(--rt-gutter) 8px; color:var(--rt-muted); font-size:12px; line-height:1.5; }\n\n/* Composer occupies layout space and never overlays keyboard focus in the reader. */\n.rt-ask-form { flex:none; align-self:center; width:100%; max-width:calc(var(--rt-reading-width) + var(--rt-gutter) * 2); padding:8px var(--rt-gutter) 12px; border-top:1px solid var(--rt-border); background:var(--rt-bg); }\n.rt-ask-header { display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:44px; }\n.rt-ask-label { color:var(--rt-text); font-size:13px; }\n.rt-ask-toggle { flex:none; font-size:12px; }\n.rt-ask-body { padding-top:2px; }\n.rt-targets { display:flex; gap:8px; margin-bottom:8px; }\n.rt-target { min-width:0; padding:8px 12px; font-size:12px; }\n.rt-target[aria-pressed=true] { border-color:color-mix(in srgb,var(--role,var(--rt-text)) 45%,var(--rt-border)); background:color-mix(in srgb,var(--role,var(--rt-text)) 8%,var(--rt-panel)); color:var(--role,var(--rt-text)); }\n.rt-ask-input { min-height:64px; max-height:120px; padding:10px 12px; resize:vertical; font-size:14px; }\n.rt-ask-body .rt-form-footer { margin-top:8px; }\n.rt-ask-body .rt-helper { flex:1; min-width:0; }\n.rt-ask-body .rt-primary { flex:none; }\n.rt-ask-collapsed .rt-ask-body { display:none; }\n\n/* Native disclosures contain secondary operations; the history drawer is a modal dialog. */\n.rt-more { position:relative; }\n.rt-more-trigger { list-style:none; font-size:12px; }\n.rt-more-trigger::-webkit-details-marker { display:none; }\n.rt-more-menu { position:absolute; z-index:5; right:0; top:calc(100% + 6px); display:flex; flex-direction:column; min-width:160px; padding:6px; border:1px solid var(--rt-border); border-radius:10px; background:var(--rt-panel); box-shadow:0 5px 20px color-mix(in srgb,var(--rt-text) 12%,transparent); }\n.rt-more-menu .rt-button { justify-content:flex-start; width:100%; border-color:transparent; }\n.rt-more-menu [data-danger], .rt-more-menu .rt-danger { color:var(--rt-error); }\n.rt-history-dialog { position:fixed; inset:0 0 0 auto; width:min(440px,100vw); max-width:100vw; height:100dvh; max-height:100dvh; margin:0; padding:0; border:0; border-left:1px solid var(--rt-border); background:var(--rt-bg); color:var(--rt-text); font:inherit; box-shadow:-8px 0 32px color-mix(in srgb,var(--rt-text) 10%,transparent); }\n.rt-history-dialog[open] { display:flex; flex-direction:column; }\n.rt-history-dialog::backdrop { background:var(--dsw-alias-bg-mask-1,color-mix(in srgb,CanvasText 24%,transparent)); }\n.rt-history-header { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:18px 18px 12px; }\n.rt-history-header h2 { font-size:18px; font-weight:600; }\n.rt-history-search { display:block; flex:none; width:calc(100% - 36px); min-height:44px; margin:0 18px 12px; padding:10px 12px; font-size:14px; }\n.rt-history-list { flex:1; min-height:0; overflow:auto; list-style:none; margin:0; padding:0 10px; overscroll-behavior:contain; }\n.rt-history-item { display:grid; grid-template-columns:minmax(0,1fr) 44px; align-items:center; gap:4px; border-bottom:1px solid var(--rt-divider); }\n.rt-history-open { display:flex; flex-direction:column; justify-content:center; align-items:flex-start; gap:6px; min-width:0; min-height:80px; padding:12px 10px; border:0; border-radius:8px; background:transparent; color:var(--rt-text); text-align:left; }\n.rt-history-open:hover, .rt-history-open[aria-current=true], .rt-history-open[aria-selected=true] { background:var(--rt-hover); }\n.rt-history-topic { display:-webkit-box; max-width:100%; overflow:hidden; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow-wrap:anywhere; font-size:14px; font-weight:500; line-height:1.5; }\n.rt-history-meta { display:flex; flex-wrap:wrap; gap:4px 10px; color:var(--rt-muted); font-size:12px; }\n.rt-history-delete { display:grid; place-items:center; width:44px; height:44px; padding:8px; border:0; border-radius:8px; background:transparent; color:var(--rt-muted); }\n.rt-history-delete:hover:not(:disabled) { color:var(--rt-error); background:var(--dsw-alias-interactive-bg-hover-danger,var(--rt-hover)); }\n.rt-history-empty { margin:auto; padding:32px 20px; color:var(--rt-muted); font-size:14px; text-align:center; }\n.rt-history-note { flex:none; padding:12px 18px; border-top:1px solid var(--rt-divider); color:var(--rt-muted); font-size:12px; }\n\n@keyframes rt-pulse { 50% { opacity:.3; } }\n@container (min-width:900px) {\n  .rt-landing > .rt-stage { margin-top:16px; min-height:264px; }\n  .rt-landing .rt-seats { gap:90px; padding-top:20px; }\n  .rt-landing .rt-portrait { width:84px; height:84px; }\n  .rt-landing .rt-portrait svg { width:76px; height:76px; }\n  .rt-landing .rt-topic-label { font-size:24px; }\n  .rt-is-discussion .rt-stage { max-width:860px; width:calc(100% - var(--rt-gutter) * 2); margin-inline:auto; }\n  .rt-timeline { scrollbar-gutter:stable both-edges; }\n}\n@container (max-width:500px) {\n  .rt-header { padding:10px 16px; gap:8px; }\n  .rt-brand { gap:7px; }\n  .rt-brand-mark { display:none; }\n  .rt-brand h1 { font-size:16px; white-space:nowrap; }\n  .rt-brand p { display:none; }\n  .rt-header-actions { gap:5px; }\n  .rt-header-actions .rt-button { padding:9px; font-size:12px; }\n  .rt-landing > .rt-stage, .rt-new-form { width:calc(100% - 32px); }\n  .rt-stage { min-height:230px; }\n  .rt-seats { gap:8px; padding:14px 8px; }\n  .rt-seat { width:33.33%; }\n  .rt-portrait { width:60px; height:60px; }\n  .rt-portrait svg { width:56px; height:56px; }\n  .rt-seat strong, .rt-seat-tag, .rt-seat-state { font-size:12px; }\n  .rt-seat-tag { min-height:3em; }\n  .rt-topic-label { font-size:19px; }\n  .rt-new-form .rt-form-footer { align-items:flex-start; flex-wrap:wrap; }\n  .rt-new-form .rt-helper { flex:1 1 140px; }\n  .rt-discussion-header { gap:4px 8px; padding:0 16px 8px; }\n  .rt-discussion-topic { flex-basis:100%; font-size:15px; }\n  .rt-run-actions { margin-left:auto; }\n  .rt-run-actions .rt-button { padding-inline:8px; }\n  .rt-is-discussion .rt-stage { margin:0 16px 8px; }\n  .rt-is-discussion .rt-seats { gap:8px; padding-bottom:8px; }\n  .rt-is-discussion .rt-seat { grid-template-columns:28px minmax(0,1fr); gap:0 5px; }\n  .rt-is-discussion .rt-portrait { width:28px; height:28px; }\n  .rt-is-discussion .rt-portrait svg { width:26px; height:26px; }\n  .rt-is-discussion .rt-seat strong { font-size:12px; }\n  .rt-is-discussion .rt-seat-state { font-size:12px; }\n  .rt-progress { padding-inline:16px; gap:6px; }\n  .rt-progress span { font-size:12px; }\n  .rt-summary-notice { width:calc(100% - 32px); padding:6px 8px; }\n  .rt-summary-notice .rt-button { padding-inline:8px; }\n  .rt-timeline { padding:12px 16px 18px; }\n  .rt-message { padding:14px 12px 8px; }\n  .rt-message-actions { gap:2px; }\n  .rt-text-button { padding-inline:6px; }\n  .rt-message-version { flex-basis:100%; }\n  .rt-activity { padding-inline:16px; }\n  .rt-ask-form { padding:4px 16px 10px; }\n  .rt-ask-label { font-size:12px; }\n  .rt-targets { gap:6px; }\n  .rt-target { flex:1; padding-inline:6px; }\n  .rt-ask-body .rt-helper { display:none; }\n  .rt-ask-body .rt-form-footer { justify-content:flex-end; }\n  .rt-ask-input { min-height:58px; max-height:90px; }\n  .rt-alert { margin-inline:16px; padding:8px 10px; flex-wrap:wrap; gap:4px; }\n}\n@media (max-height:650px) {\n  .rt-is-discussion .rt-header { padding-block:8px; }\n  .rt-is-discussion .rt-brand p { display:none; }\n  .rt-is-discussion .rt-stage { margin-bottom:4px; }\n  .rt-is-discussion .rt-seats { padding-bottom:6px; }\n  .rt-is-discussion .rt-portrait { display:none; }\n  .rt-is-discussion .rt-seat { grid-template-columns:minmax(0,1fr); }\n  .rt-is-discussion .rt-progress span { padding-bottom:5px; }\n  .rt-is-discussion .rt-activity { padding-block:4px; }\n  .rt-is-discussion .rt-ask-header { min-height:44px; }\n  .rt-is-discussion .rt-ask-input { min-height:48px; max-height:64px; }\n}\n@media (prefers-reduced-motion:reduce) {\n  .rt-theater * { animation:none!important; transition:none!important; scroll-behavior:auto!important; }\n}\n";
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
