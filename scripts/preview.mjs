import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createTheater } from '../src/engine.mjs';
import { performAction } from '../src/actions.mjs';

const root = new URL('../', import.meta.url);
const engine = createTheater({ async generate({ role, topic, instruction, onDelta, signal }) {
  const text = {
    product: `先把“${topic}”收窄成一个可验证的问题。\n\n建议首版只服务一种用户、解决一个明确场景。找五位真实用户观察他们现在如何处理，再做一个能在三分钟内体验价值的原型。\n\n我会把“愿意再次使用”作为验证标准，而不是只看第一次点击。`,
    engineer: '我赞同先验证核心场景，但不要把技术架构做成未来所有功能的总和。\n\n首版使用一个清晰的数据模型，保留输入、业务规则和外部接口的边界。把失败路径与取消操作同时做通。\n\n我们应先做一个端到端切片，跑通后再讨论扩展。',
    critic: '我愿意尝试，但你得告诉我：为什么不用我现在的方法？\n\n如果第一次打开就要配置一大堆东西，我会离开。我希望先体验一次完整结果，再决定是否投入时间。\n\n请拿真实使用场景来验证，而不是让我评价一段漂亮的产品介绍。',
    host: '共识\n先聚焦一种用户和一个核心场景，以可体验的原型验证价值。\n\n分歧\n产品经理希望尽快验证留存；程序员强调完整失败路径；用户更在意首次体验门槛。\n\n下一步\n1. 访谈五位目标用户。\n2. 做一个三分钟能体验完整价值的原型。\n3. 用真实使用记录决定是否继续投入。',
  }[role];
  const output = instruction.startsWith('第一轮') || instruction.startsWith('第二轮') || role === 'host' ? text : `关于你的追问“${instruction}”：\n\n${text}`;
  for (const piece of output.match(/.{1,14}|\n/g) ?? []) { await delay(45, undefined, { signal }); onDelta(piece); }
  return output;
} });
await engine.init();
const state = () => ({ schemaVersion: 1, runs: engine.list(), model: { provider: 'preview', model: '离线演示 · 不调用模型' } });
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>圆桌剧场 · 离线预览</title><link rel="stylesheet" href="/src/theater.css"><style>html,body{margin:0;height:100%;font-family:"Microsoft YaHei",system-ui,sans-serif;background:#211b2c}body{display:flex;flex-direction:column}.preview-note{background:#d7b58b;color:#2c2031;padding:7px 18px;font-size:12px}#app{flex:1;min-height:0;max-width:1180px;width:100%;margin:auto}</style></head><body><div class="preview-note">离线界面演示：使用固定示例发言，真实插件通过 Harness 调用你的模型。</div><main id="app"></main><script type="module">import{mountTheater}from'/src/ui.mjs';const listeners=new Set();const load=async(url,options)=>{const response=await fetch(url,options);const value=await response.json();if(!response.ok)throw Error(value.error);return value};const publish=value=>{for(const listener of listeners)listener(value);return value};const api={state:()=>load('/api/state'),action:input=>load('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}).then(publish),subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener)}};mountTheater(document.querySelector('#app'),{api});setInterval(()=>api.state().then(publish).catch(()=>{}),250);</script></body></html>`;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  response.setHeader('Cache-Control', 'no-store');
  try {
    if (url.pathname === '/api/state' && request.method === 'GET') {
      response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(state())); return;
    }
    if (url.pathname === '/api/action' && request.method === 'POST') {
      const chunks = []; let bytes = 0;
      for await (const chunk of request) { bytes += chunk.length; if (bytes > 20000) throw new Error('请求太长'); chunks.push(chunk); }
      await performAction(engine, JSON.parse(Buffer.concat(chunks).toString('utf8')));
      response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(state())); return;
    }
    if (url.pathname === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); return; }
    if (['/src/ui.mjs', '/src/theater.css'].includes(url.pathname)) {
      response.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
      response.end(await readFile(new URL(`.${url.pathname}`, root))); return;
    }
    response.writeHead(404).end();
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }));
  }
});
server.listen(Number(process.env.PORT ?? 8765), '127.0.0.1', () => console.log(`Offline preview: http://127.0.0.1:${server.address().port}`));
async function close() { await engine.close(); server.close(); }
process.once('SIGINT', close); process.once('SIGTERM', close);
