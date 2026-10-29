import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Only the explicitly labelled offline preview may be exercised by this suite.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_SMOKE_URL || 'http://127.0.0.1:8765';
const results = resolve('.test-results');
await mkdir(results, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const errors = [], createdIds = new Set();
const context = await browser.newContext({ viewport: { width: 1180, height: 1000 }, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));
const state = async () => {
  const response = await page.request.get(`${baseURL}/api/state`);
  assert.equal(response.ok(), true, 'Offline state endpoint must be available');
  return response.json();
};
async function waitFor(check, description, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await delay(50); }
  throw new Error(`Timed out: ${description}`);
}
async function waitRun(id, predicate, timeout = 30000) {
  let result;
  await waitFor(async () => {
    result = (await state()).runs.find((item) => item.id === id);
    return result && predicate(result);
  }, `Run ${id} reaches the expected state`, timeout);
  return result;
}
const waitIdle = async (id) => {
  await waitRun(id, (run) => run.status !== 'running' && !run.busy);
  await page.waitForTimeout(400);
};
const waitGeneration = async (id) => {
  await waitRun(id, (run) => run.status === 'running', 10000);
  await waitIdle(id);
};
async function idForTopic(topic) {
  let id;
  await waitFor(async () => { id = (await state()).runs.find((run) => run.topic === topic)?.id; return id; }, 'Created topic appears in state');
  createdIds.add(id);
  return id;
}
const historyTrigger = () => page.getByRole('button', { name: '历史记录', exact: true });
const historyDialog = () => page.getByRole('dialog', { name: '历史记录', exact: true });
async function openHistory(search = '') {
  await historyTrigger().click();
  const dialog = historyDialog();
  await dialog.waitFor({ state: 'visible' });
  await dialog.getByLabel('搜索讨论记录', { exact: true }).fill(search);
  return dialog;
}
async function selectHistory(topic) {
  const dialog = await openHistory(topic);
  const item = dialog.locator('.rt-history-item:visible .rt-history-open').filter({ hasText: topic });
  assert.equal(await item.count(), 1, 'History search must identify exactly one created topic');
  await item.click();
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('.rt-discussion-topic').filter({ hasText: topic }).waitFor();
}
async function openMore() {
  const more = page.locator('.rt-more');
  if (await more.getAttribute('open') === null) await more.locator('summary').filter({ hasText: '更多操作' }).click();
  return more;
}
const overflow = async () => page.evaluate(() => {
  const theater = document.querySelector('.rt-theater');
  return { document: document.documentElement.scrollWidth > innerWidth + 1, theater: theater.scrollWidth > theater.clientWidth + 1 };
});
async function assertComposerVisible() {
  const geometry = await page.locator('.rt-ask-form').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height, viewportHeight: innerHeight };
  });
  assert.ok(geometry.height > 0 && geometry.top >= -1 && geometry.bottom <= geometry.viewportHeight + 1, `Composer must stay inside the viewport: ${JSON.stringify(geometry)}`);
}
async function assertTimelineScroll() {
  const geometry = await page.evaluate(() => {
    const timeline = document.querySelector('.rt-timeline'), shell = document.querySelector('.rt-theater');
    return { timelineOverflow: getComputedStyle(timeline).overflowY, scrollHeight: timeline.scrollHeight, clientHeight: timeline.clientHeight, shellScroll: shell.scrollHeight - shell.clientHeight, pageScroll: document.documentElement.scrollHeight - innerHeight };
  });
  assert.match(geometry.timelineOverflow, /auto|scroll/);
  assert.ok(geometry.scrollHeight > geometry.clientHeight + 30, 'Long discussion must scroll inside its timeline');
  assert.ok(geometry.shellScroll <= 2 && geometry.pageScroll <= 2, `Discussion must have one main scroll area: ${JSON.stringify(geometry)}`);
}

try {
  await page.goto(baseURL);
  await page.locator('.preview-note').filter({ hasText: '离线界面演示' }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.rt-new').disabled);
  await page.getByRole('button', { name: '新一场', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.rt-new-form .rt-primary').disabled);
  await page.screenshot({ path: resolve(results, 'ui-empty-1180.png') });
  await page.getByRole('button', { name: '给独立开发者做一个轻量记账工具', exact: true }).click();
  const unique = Date.now();
  const topic = `离线界面验证：轻量记账工具 ${unique}`;
  await page.getByLabel('今天，把什么想法摆上桌？').fill(topic);
  await page.getByRole('button', { name: '开始这一场', exact: true }).click();
  await page.locator('.rt-discussion-topic').filter({ hasText: topic }).waitFor();
  const id = await idForTopic(topic);
  const initialDraft = '角色发言时可以先写下问题，这条草稿不会自动发送。';
  const composerInput = page.getByLabel('导演席 · 你的追问', { exact: true });
  assert.equal(await composerInput.isEditable(), true, 'Composer stays editable during generation');
  await composerInput.fill(initialDraft);
  assert.equal(await page.getByRole('button', { name: '请你回答', exact: true }).isEnabled(), false, 'Drafting must not start concurrent generation');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await waitIdle(id);
  assert.equal(await composerInput.inputValue(), initialDraft);
  assert.equal((await state()).runs.find((run) => run.id === id).status, 'paused');
  await page.getByRole('button', { name: '继续讨论', exact: true }).click();
  await waitGeneration(id);
  let run = (await state()).runs.find((item) => item.id === id);
  assert.equal(run.status, 'completed');
  assert.equal(run.messages.length, 7);
  assert.equal(run.messages.filter((message) => message.status === 'completed').length, 7);
  assert.equal(await page.locator('.rt-message').count(), 7);
  assert.deepEqual(await overflow(), { document: false, theater: false });
  await assertComposerVisible();
  await assertTimelineScroll();
  await page.screenshot({ path: resolve(results, 'ui-completed-1180.png') });

  const first = page.locator('.rt-message').first();
  const agree = first.getByRole('button', { name: '赞同', exact: true });
  await agree.click();
  await waitFor(async () => await agree.getAttribute('aria-pressed') === 'true', 'Agree vote becomes selected');
  await agree.click();
  await waitFor(async () => await agree.getAttribute('aria-pressed') === 'false', 'Agree vote can be cleared');
  const challenge = first.getByRole('button', { name: '质疑', exact: true });
  await challenge.click();
  await waitFor(async () => await challenge.getAttribute('aria-pressed') === 'true', 'Challenge vote becomes selected');
  await page.getByRole('button', { name: '刷新结论', exact: true }).click();
  await waitGeneration(id);
  run = (await state()).runs.find((item) => item.id === id);
  assert.equal(run.summaryOutdated, false);
  assert.equal(await page.locator('.rt-summary-notice').isVisible(), false);

  // The header shortcut finds the newest conclusion, even after older summaries exist.
  await page.locator('.rt-timeline').evaluate((node) => { node.scrollTop = 0; });
  await page.getByRole('button', { name: '查看结论', exact: true }).click();
  const latestSummary = page.locator('.rt-summary').last();
  await waitFor(() => latestSummary.evaluate((node) => {
    const card = node.getBoundingClientRect(), timeline = document.querySelector('.rt-timeline').getBoundingClientRect();
    return card.top < timeline.bottom && card.bottom > timeline.top;
  }), 'View conclusion scrolls the latest summary into the timeline');
  await latestSummary.getByRole('button', { name: '复制结论', exact: true }).click();
  await latestSummary.locator('.rt-copy-status').filter({ hasText: '已复制' }).waitFor();
  const copiedSummary = await page.evaluate(() => navigator.clipboard.readText());
  const normalizeLines = (text) => text.replace(/\r\n/g, '\n');
  assert.equal(normalizeLines(copiedSummary), normalizeLines(run.messages.findLast((message) => message.kind === 'summary').text), 'Copy conclusion writes the current summary');

  // Message-level follow-up selects its speaker and places focus in the composer.
  await first.getByRole('button', { name: '追问', exact: true }).click();
  const roleGroup = page.getByRole('group', { name: '选择追问角色', exact: true });
  assert.equal(await roleGroup.getByRole('button', { name: '产品经理', exact: true }).getAttribute('aria-pressed'), 'true');
  const askInput = page.getByLabel('导演席 · 你的追问', { exact: true });
  assert.equal(await askInput.evaluate((node) => document.activeElement === node), true);
  await page.getByRole('button', { name: '收起追问', exact: true }).click();
  await askInput.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '展开追问', exact: true }).click();
  await askInput.waitFor({ state: 'visible' });
  await roleGroup.getByRole('button', { name: '程序员', exact: true }).click();
  assert.equal(await roleGroup.getByRole('button', { name: '程序员', exact: true }).getAttribute('aria-pressed'), 'true');
  await askInput.fill('怎样把第一版控制在一个周末内完成？');
  await page.getByRole('button', { name: '请你回答', exact: true }).click();
  await waitRun(id, (item) => item.status === 'running');
  await page.locator('.rt-timeline').evaluate((node) => { node.scrollTop = 0; node.dispatchEvent(new Event('scroll')); });
  const readingPosition = await page.locator('.rt-timeline').evaluate((node) => node.scrollTop);
  await waitIdle(id);
  assert.ok(Math.abs(await page.locator('.rt-timeline').evaluate((node) => node.scrollTop) - readingPosition) <= 3, 'Incoming speech must not move a reader viewing earlier messages');
  const jumpLatest = page.locator('.rt-jump-latest');
  await jumpLatest.filter({ hasText: '有新发言，回到最新' }).waitFor({ state: 'visible' });
  await jumpLatest.click();
  await waitFor(() => page.locator('.rt-timeline').evaluate((node) => node.scrollHeight - node.scrollTop - node.clientHeight < 6), 'New-speech shortcut returns to the latest message');
  run = (await state()).runs.find((item) => item.id === id);
  assert.equal(run.messages.at(-1).kind, 'question');
  assert.equal(run.messages.at(-1).role, 'engineer');
  assert.equal(run.summaryOutdated, true);
  const last = page.locator('.rt-message').last();
  await last.getByRole('button', { name: '重新回答', exact: true }).click();
  await waitGeneration(id);
  run = (await state()).runs.find((item) => item.id === id);
  assert.equal(run.messages.at(-1).revisions.length, 1);

  const downloadEvent = page.waitForEvent('download');
  await (await openMore()).getByRole('button', { name: '导出', exact: true }).click();
  const downloadPath = resolve(results, 'ui-discussion.md');
  await (await downloadEvent).saveAs(downloadPath);
  const markdown = await readFile(downloadPath, 'utf8');
  assert.match(markdown, /产品经理/);
  assert.ok(markdown.includes(topic));
  const more = page.locator('.rt-more');
  if (await more.getAttribute('open') !== null) await more.locator('summary').click();
  const firstAskDraft = `第一场尚未发送的追问 ${unique}`;
  await roleGroup.getByRole('button', { name: '挑刺用户', exact: true }).click();
  await askInput.fill(firstAskDraft);

  // Opening a new draft must not be replaced by the next history/state update.
  const archived = structuredClone(run.messages);
  const originalRunCount = (await state()).runs.length;
  await page.getByRole('button', { name: '新一场', exact: true }).click();
  const draft = `尚未开始的讨论草稿 ${unique}`;
  await page.getByLabel('今天，把什么想法摆上桌？').fill(draft);
  await page.waitForTimeout(700);
  assert.equal(await page.locator('.rt-new-form').isVisible(), true);
  assert.equal(await page.getByLabel('今天，把什么想法摆上桌？').inputValue(), draft);
  assert.equal((await state()).runs.length, originalRunCount);
  assert.deepEqual((await state()).runs.find((item) => item.id === id).messages, archived);
  let dialog = await openHistory(`没有对应记录-${unique}`);
  assert.equal(await dialog.locator('.rt-history-item:visible .rt-history-open').count(), 0);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await historyTrigger().evaluate((node) => node === document.activeElement), true, 'Escape must restore focus to the history trigger');
  assert.equal(await page.getByLabel('今天，把什么想法摆上桌？').inputValue(), draft);

  // A second discussion verifies real history switching and deletion without
  // removing the still-selected first discussion or changing its messages.
  const secondTopic = `离线界面验证：历史切换与删除 ${unique}`;
  await page.getByLabel('今天，把什么想法摆上桌？').fill(secondTopic);
  await page.getByRole('button', { name: '开始这一场', exact: true }).click();
  await page.locator('.rt-discussion-topic').filter({ hasText: secondTopic }).waitFor();
  const secondId = await idForTopic(secondTopic);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await waitIdle(secondId);
  assert.equal(await askInput.inputValue(), '', 'A new discussion starts with its own empty composer');
  const secondAskDraft = `第二场另一个未发送的追问 ${unique}`;
  await roleGroup.getByRole('button', { name: '程序员', exact: true }).click();
  await askInput.fill(secondAskDraft);
  dialog = await openHistory();
  await page.screenshot({ path: resolve(results, 'ui-history-1180.png') });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await selectHistory(topic);
  assert.equal(await askInput.inputValue(), firstAskDraft);
  assert.equal(await roleGroup.getByRole('button', { name: '挑刺用户', exact: true }).getAttribute('aria-pressed'), 'true');
  await selectHistory(secondTopic);
  assert.equal(await askInput.inputValue(), secondAskDraft);
  assert.equal(await roleGroup.getByRole('button', { name: '程序员', exact: true }).getAttribute('aria-pressed'), 'true');
  await selectHistory(topic);
  assert.equal(await askInput.inputValue(), firstAskDraft);
  assert.equal(await roleGroup.getByRole('button', { name: '挑刺用户', exact: true }).getAttribute('aria-pressed'), 'true');
  dialog = await openHistory(secondTopic);
  page.once('dialog', (event) => event.accept());
  await dialog.getByRole('button', { name: `删除讨论：${secondTopic}`, exact: true }).click();
  await waitFor(async () => !(await state()).runs.some((item) => item.id === secondId), 'History delete removes only its own discussion');
  assert.equal(await dialog.locator('.rt-history-item:visible .rt-history-open').count(), 0);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('.rt-discussion-topic').filter({ hasText: topic }).waitFor();
  assert.deepEqual((await state()).runs.find((item) => item.id === id).messages, archived);

  for (const width of [375, 350]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    assert.deepEqual(await overflow(), { document: false, theater: false });
    await assertComposerVisible();
    await assertTimelineScroll();
    const smallTargets = await page.locator('.rt-theater button:visible, .rt-theater summary:visible').evaluateAll((nodes) => nodes.filter((node) => node.getBoundingClientRect().height < 43.5).map((node) => ({ text: node.textContent.trim(), height: node.getBoundingClientRect().height })));
    assert.deepEqual(smallTargets, [], `Interactive targets at ${width}px must remain at least 44px high`);
    await page.screenshot({ path: resolve(results, `ui-discussion-${width}.png`) });
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('button', { name: '新一场', exact: true }).click();
  await page.screenshot({ path: resolve(results, 'ui-empty-375.png') });
  await selectHistory(topic);
  page.once('dialog', (event) => event.accept());
  await (await openMore()).getByRole('button', { name: '删除', exact: true }).click();
  await waitFor(async () => !(await state()).runs.some((item) => item.id === id), 'More-actions deletion removes the selected discussion');
  assert.deepEqual(errors, []);
  console.log('UI smoke passed: offline preview; 1180/375/350px; single timeline and visible composer; drafting during generation; pause/resume; seven turns; votes; newest summary and clipboard; role/message follow-up; reading position and new-speech shortcut; retry; Markdown export; new-topic and per-discussion composer drafts; searchable history, switching, Escape focus and deletion.');
} finally {
  for (const id of createdIds) {
    const remaining = (await state()).runs.find((run) => run.id === id);
    if (!remaining) continue;
    if (remaining.status === 'running') await page.request.post(`${baseURL}/api/action`, { data: { type: 'pause', id } });
    await waitRun(id, (run) => !run.busy && run.status !== 'running');
    await page.request.post(`${baseURL}/api/action`, { data: { type: 'remove', id } });
  }
  await browser.close();
}
