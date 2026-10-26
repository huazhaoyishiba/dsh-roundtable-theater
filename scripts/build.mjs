import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFile(resolve(root, path), 'utf8');
const [protocol, ui, css, client] = await Promise.all(['src/protocol.mjs', 'src/ui.mjs', 'src/theater.css', 'src/client.cjs'].map(read));
function moduleBody(source, names) {
  if (/^\s*import\s/m.test(source)) throw new Error('Browser source must remain import-free; use the existing host platform boundary');
  return `(() => {\n${source.replace(/^export /gm, '')}\nreturn {${names.join(',')}};\n})()`;
}
const output = `// Generated from src/ by npm run build.\nwindow.__ModuleLoader__.load({id:'dsh-roundtable-theater',factory(require){\nconst module={exports:{}};\nconst Protocol=${moduleBody(protocol, ['PACKAGE_ID', 'INVOCATIONS'])};\nconst UI=${moduleBody(ui, ['mountTheater'])};\nconst THEATER_CSS=${JSON.stringify(css)};\n${client}\nreturn module.exports;\n}});\n`;
new Script(output, { filename: 'client.js' });
await mkdir(resolve(root, 'lib'), { recursive: true });
await writeFile(resolve(root, 'lib/client.js'), output);
console.log(`Built lib/client.js (${Math.round(Buffer.byteLength(output) / 1024)} KiB)`);
