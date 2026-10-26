import { parseAction } from './protocol.mjs';

/** One application boundary shared by native RPC and the offline QA harness. */
export async function performAction(engine, input) {
  const action = parseAction(input);
  switch (action.type) {
    case 'create': return engine.create({ topic: action.topic });
    case 'start': return engine.start(action.id);
    case 'resume': return engine.resume(action.id);
    case 'pause': return engine.pause(action.id);
    case 'remove': return engine.remove(action.id);
    case 'ask': return engine.ask(action.id, { role: action.role, text: action.text });
    case 'retry': return engine.retry(action.id, action.messageId);
    case 'vote': return engine.vote(action.id, { messageId: action.messageId, value: action.value });
  }
}
