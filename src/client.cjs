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
