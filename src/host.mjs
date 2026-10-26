import z from '@deepseek-ai/schemastery';
import { z as schema } from 'zod';
import { defineDomain } from '@deepseek-ai/dsh-storage-domain';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { createTheater } from './engine.mjs';
import { createGenerator } from './generator.mjs';
import { performAction } from './actions.mjs';
import { PACKAGE_ID, INVOCATIONS, parseSnapshot } from './protocol.mjs';

export const name = 'roundtable-theater';
export const inject = ['llm', 'agentDefaultModel', 'storageDomain', 'typert'];
export const Config = z.object({
  maxRuns: z.number().step(1).min(1).max(100).default(30),
  maxTokens: z.number().step(1).min(256).max(8192).default(1800),
  timeoutMs: z.number().step(1).min(1000).max(600000).default(180000),
});

const domainSpec = defineDomain({
  name: 'roundtable_theater', version: 1, tables: {},
  global: {
    initial: { schemaVersion: 1, runs: [] },
    schema: schema.custom((value) => { try { parseSnapshot(value); return true; } catch { return false; } }),
  },
});

export class RoundtableService extends TypertRemoteService {
  constructor(ctx, engine) { super(ctx, 'roundtable'); this.engine = engine; }
  state() {
    return { schemaVersion: 1, runs: this.engine.list(), model: this.ctx.agentDefaultModel.currentSelection() };
  }
  async action(input) {
    await performAction(this.engine, input);
    return this.state();
  }
}

export async function apply(ctx, config) {
  const domain = await ctx.storageDomain.open(domainSpec);
  const engine = createTheater({
    maxRuns: config.maxRuns, generate: createGenerator(ctx, config),
    load: () => domain.global.get(), save: (value) => domain.global.set(value),
  });
  try { await engine.init(); } catch (error) { await domain.close(); throw error; }
  ctx.effect(() => async () => { try { await engine.close(); } finally { await domain.close(); } });
  new RoundtableService(ctx, engine);
  ctx.typert.register({ package: PACKAGE_ID, face: 'host', schemas: [], model: { services: [], events: [], objects: [] }, invocations: INVOCATIONS });
}
