import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Install Playwright locally or point PLAYWRIGHT_MODULE to an existing package directory.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseURL = process.env.UI_SMOKE_URL || 'http://127.0.0.1:8765';
const results = resolve('.test-results');
await mkdir(results, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1180, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
let createdId;
page.on('pageerror', (error) => errors.push(error.message));
const state = async () => (await page.request.get(`${baseURL}/api/state`)).json();
const selectedId = () => page.locator('.rt-history').inputValue();
async function waitRun(id, predicate, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const run = (await state()).runs.find((item) => item.id === id);
    if (run && predicate(run)) return run;
    await delay(100);
  }
  throw new Error(`Run did not reach the expected state: ${id}`);
}
const waitGeneration = async (id) => {
  await waitRun(id, (run) => run.status === 'running', 10000);
  await waitIdle(id);
};
const waitIdle = async (id) => {
  await waitRun(id, (run) => run.status !== 'running');
  await page.waitForTimeout(350);
};
async function waitPressed(locator, value) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (await locator.getAttribute('aria-pressed') === String(value)) return;
    await delay(50);
  }
  assert.equal(await locator.getAttribute('aria-pressed'), String(value));
}
const overflow = async () => page.evaluate(() => ({
  document: document.documentElement.scrollWidth > innerWidth + 1,
  theater: document.querySelector('.rt-theater').scrollWidth > document.querySelector('.rt-theater').clientWidth + 1,
}));

try {
  await page.goto(baseURL);
  // This suite must never spend tokens against a real installation.
  await page.locator('.preview-note').filter({ hasText: '离线界面演示' }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.rt-new').disabled);
  await page.getByRole('button', { name: '新一场', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.rt-new-form .rt-primary').disabled);
  await page.screenshot({ path: resolve(results, 'ui-empty-1180.png') });
  await page.getByRole('button', { name: '给独立开发者做一个轻量记账工具', exact: true }).click();
  const topic = `离线界面验证：轻量记账工具 ${Date.now()}`;
  await page.getByLabel('今天，把什么想法摆上桌？').fill(topic);
  await page.getByRole('button', { name: '开始这一场', exact: true }).click();
  await page.locator('.rt-discussion-topic').filter({ hasText: topic }).waitFor();
  const id = await selectedId();
  createdId = id;
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await waitIdle(id);
  assert.equal((await state()).runs.find((run) => run.id === id).status, 'paused');
  await page.getByRole('button', { name: '继续讨论', exact: true }).click();
  await waitGeneration(id);
  let run = (await state()).runs.find((item) => item.id === id);
  assert.equal(run.status, 'completed');
  assert.equal(run.messages.length, 7);
  assert.equal(run.messages.filter((message) => message.status === 'completed').length, 7);
  assert.equal(await page.locator('.rt-message').count(), 7);
  assert.deepEqual(await overflow(), { document: false, theater: false });
  await page.screenshot({ path: resolve(results, 'ui-completed-1180.png') });

  const first = page.locator('.rt-message').first();
  const agree = first.getByRole('button', { name: '赞同', exact: true });
  await agree.click();
  await waitPressed(agree, true);
  await agree.click();
  await waitPressed(agree, false);
  await first.getByRole('button', { name: '质疑', exact: true }).click();
  await waitPressed(first.getByRole('button', { name: '质疑', exact: true }), true);
  await page.getByRole('button', { name: '刷新结论', exact: true }).waitFor();
  await page.getByRole('button', { name: '刷新结论', exact: true }).click();
  await waitGeneration(id);
  run = (await state()).runs.find((item) => item.id === id);
  assert.equal(run.summaryOutdated, false);
  assert.equal(await page.locator('.rt-summary-notice').isVisible(), false);

  await page.getByLabel('选择追问角色').selectOption('engineer');
  await page.getByLabel('导演席 · 你的追问').fill('怎样把第一版控制在一个周末内完成？');
  await page.getByRole('button', { name: '请你回答', exact: true }).click();
  await waitGeneration(id);
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
  await page.getByRole('button', { name: '导出', exact: true }).click();
  const downloaded = await downloadEvent;
  const downloadPath = resolve(results, 'ui-discussion.md');
  await downloaded.saveAs(downloadPath);
  const markdown = await readFile(downloadPath, 'utf8');
  assert.match(markdown, /产品经理/);
  assert.ok(markdown.includes(topic));
  await page.setViewportSize({ width: 375, height: 900 });
  await page.waitForTimeout(200);
  assert.deepEqual(await overflow(), { document: false, theater: false });
  const smallTargets = await page.locator('.rt-theater button:visible, .rt-theater select:visible').evaluateAll((nodes) => nodes.filter((node) => node.getBoundingClientRect().height < 43.5).map((node) => ({ text: node.textContent.trim(), height: node.getBoundingClientRect().height })));
  assert.deepEqual(smallTargets, []);
  assert.equal(await page.evaluate(() => document.querySelector('.rt-footer').getBoundingClientRect().top >= document.querySelector('.rt-ask-form').getBoundingClientRect().bottom), true);
  await page.locator('.rt-theater').evaluate((node) => { node.scrollTop = 0; });
  await page.screenshot({ path: resolve(results, 'ui-discussion-375.png') });
  await page.setViewportSize({ width: 350, height: 900 });
  assert.deepEqual(await overflow(), { document: false, theater: false });
  await page.screenshot({ path: resolve(results, 'ui-discussion-350.png') });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('button', { name: '新一场', exact: true }).click();
  await page.locator('.rt-theater').evaluate((node) => { node.scrollTop = 0; });
  await page.screenshot({ path: resolve(results, 'ui-empty-375.png') });
  await page.getByLabel('切换讨论记录').selectOption(id);
  await page.locator('.rt-discussion-topic').filter({ hasText: topic }).waitFor();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.waitForFunction(async (runId) => !(await (await fetch('/api/state')).json()).runs.some((run) => run.id === runId), id);
  assert.deepEqual(errors, []);
  console.log('UI smoke passed: offline preview, 1180/375px, pause/resume, seven turns, votes, summary refresh, follow-up, retry, Markdown export, history, deletion.');
} finally {
  if (createdId) {
    const remaining = (await state()).runs.find((run) => run.id === createdId);
    if (remaining) {
      if (remaining.status === 'running') {
        await page.request.post(`${baseURL}/api/action`, { data: { type: 'pause', id: createdId } });
        await waitIdle(createdId);
      }
      await page.request.post(`${baseURL}/api/action`, { data: { type: 'remove', id: createdId } });
    }
  }
  await browser.close();
}
