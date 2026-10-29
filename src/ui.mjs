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
export function mountTheater(root, { api }) {
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
