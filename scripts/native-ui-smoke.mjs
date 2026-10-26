import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Opens an already running test Harness. This check never starts a model request.
if (!process.env.DSH_TEST_URL) throw new Error('Set DSH_TEST_URL to the test Harness URL (including its one-time token).');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1380, height: 950 }, locale: 'zh-CN' });
  await page.emulateMedia({ colorScheme: 'light' });
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(process.env.DSH_TEST_URL);
  await page.getByRole('button', { name: '圆桌剧场', exact: true }).waitFor();
  const notice = page.getByRole('button', { name: '继续', exact: true });
  if (await notice.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) await notice.click();
  const configureLater = page.getByRole('button', { name: '稍后配置', exact: true });
  if (await configureLater.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) await configureLater.click();
  // 0.2 replaces the API-key onboarding with a dismissible sign-in dialog.
  if (await page.getByRole('heading', { name: '开始使用', exact: true }).isVisible()) {
    await page.getByRole('button', { name: '关闭', exact: true }).click();
  }
  await page.getByRole('button', { name: '圆桌剧场', exact: true }).click();
  await page.getByRole('heading', { name: 'AI 圆桌剧场', exact: true }).waitFor();
  const start = page.getByRole('button', { name: '开始这一场', exact: true });
  await start.waitFor();
  await page.waitForFunction(() => { const button = document.querySelector('.rt-primary'); return button && !button.disabled; });
  await mkdir('.test-results', { recursive: true });
  await page.screenshot({ path: '.test-results/native-theater.png', fullPage: true });
  assert.equal(await page.locator('.rt-alert:visible').count(), 0, `native RPC state: ${await page.locator('.rt-alert').innerText()}`);
  assert.equal(await page.locator('.rt-seat').count(), 3);
  assert.equal(errors.length, 0, errors.join('\n'));
  if (process.env.THEME_SMOKE === '1') {
    // Keep the isolated profile on its default system theme. Let transient host
    // notices settle before capturing screenshots for the plugin listing.
    await page.waitForTimeout(6000);
    const themeColors = [];
    for (const mode of ['light', 'dark', 'light']) {
      // Exercise the real Harness system-theme path without writing user preferences.
      await page.emulateMedia({ colorScheme: mode });
      await page.waitForFunction((expected) => document.body.hasAttribute('data-ds-dark-theme') === (expected === 'dark'), mode);
      await page.waitForFunction(() => {
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--dsw-alias-button-primary-fill)';
        document.body.append(probe);
        const matches = getComputedStyle(document.querySelector('.rt-primary')).backgroundColor === getComputedStyle(probe).backgroundColor;
        probe.remove(); return matches;
      });
      const colors = await page.evaluate(() => {
        const probe = document.createElement('span');
        document.body.append(probe);
        const resolveColor = (value) => { probe.style.color = value; return getComputedStyle(probe).color; };
        const root = document.querySelector('.rt-theater');
        const primary = root.querySelector('.rt-primary');
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const painter = canvas.getContext('2d', { willReadFrequently: true });
        const rgba = (color) => { painter.clearRect(0, 0, 1, 1); painter.fillStyle = color; painter.fillRect(0, 0, 1, 1); return [...painter.getImageData(0, 0, 1, 1).data]; };
        const blend = (front, back) => { const alpha = front[3] / 255; return front.slice(0, 3).map((value, i) => value * alpha + back[i] * (1 - alpha)).concat(255); };
        const backdrop = (element) => {
          const ancestors = []; for (let node = element; node; node = node.parentElement) ancestors.unshift(node);
          return ancestors.reduce((background, node) => blend(rgba(getComputedStyle(node).backgroundColor), background), [255, 255, 255, 255]);
        };
        const luminance = (rgb) => rgb.slice(0, 3).map((channel) => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
        const contrast = (front, back) => { const values = [luminance(front), luminance(back)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05); };
        const text = [...root.querySelectorAll('.rt-brand p,.rt-seat-tag,.rt-seat-state,.rt-helper,.rt-footer')].filter((node) => node.getClientRects().length).map((node) => ({ text: node.textContent, ratio: contrast(rgba(getComputedStyle(node).color), backdrop(node)) }));
        const result = {
          background: resolveColor(getComputedStyle(root).backgroundColor),
          nativeBackground: resolveColor('var(--dsw-alias-bg-base)'),
          foreground: resolveColor(getComputedStyle(root).color),
          nativeForeground: resolveColor('var(--dsw-alias-label-primary)'),
          primary: resolveColor(getComputedStyle(primary).backgroundColor),
          nativePrimary: resolveColor('var(--dsw-alias-button-primary-fill)'),
          text,
        };
        probe.remove(); return result;
      });
      assert.equal(colors.background, colors.nativeBackground, `${mode}: panel background must match Harness`);
      assert.equal(colors.foreground, colors.nativeForeground, `${mode}: text must match Harness`);
      assert.equal(colors.primary, colors.nativePrimary, `${mode}: primary action must match Harness`);
      assert.deepEqual(colors.text.filter((item) => item.ratio < 4.5), [], `${mode}: small text must remain readable`);
      themeColors.push(colors.background);
      await page.screenshot({ path: `.test-results/native-theater-${mode}.png`, fullPage: true });
    }
    assert.notEqual(themeColors[0], themeColors[1], 'Theme changes must repaint the mounted panel without reloading');
    const custom = await page.evaluate(() => {
      const style = document.body.style;
      const previous = style.getPropertyValue('--dsw-alias-bg-base');
      const priority = style.getPropertyPriority('--dsw-alias-bg-base');
      try {
        style.setProperty('--dsw-alias-bg-base', '#e9f0f5');
        return getComputedStyle(document.querySelector('.rt-theater')).backgroundColor;
      } finally {
        if (previous) style.setProperty('--dsw-alias-bg-base', previous, priority); else style.removeProperty('--dsw-alias-bg-base');
      }
    });
    assert.equal(custom, 'rgb(233, 240, 245)', 'Custom Harness token overrides must flow through to the panel');
    console.log('Native light/dark/live switching, custom background, native primary action and text contrast: PASS.');
  }
  console.log('Native Harness sidebar, global panel, browser bundle and RPC state: PASS (no model request).');
} finally { await browser.close(); }
