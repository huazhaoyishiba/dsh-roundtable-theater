// The same descriptors are used by the Host and the browser ModuleLoader bundle.
export const PACKAGE_ID = 'dsh-roundtable-theater';

function requireText(value, name, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new TypeError(`${name}无效`);
  return value;
}

export function parseAction(value) {
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

export function parseSnapshot(value) {
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
export const INVOCATIONS = ['state', 'action'].map((method) => ({
  id: `${PACKAGE_ID}#roundtable/${method}`,
  service: 'roundtable', namespace: 'roundtable', method,
  invocation: { kind: 'direct' },
  parameters: method === 'state' ? [] : [{ name: 'input', wire: 'input', source: 'json', codec: codec('action:input', parseAction) }],
  result: codec(`${method}:result`, parseSnapshot),
}));
