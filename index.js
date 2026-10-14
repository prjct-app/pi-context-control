import { Type } from '@earendil-works/pi-ai';
import { SettingsManager } from '@earendil-works/pi-coding-agent';
import { installContextControl } from './src/controller.js';

import { contextViews } from './src/views.js';

const nullable = schema => Type.Union([schema, Type.Null()]);

export default function contextControl(pi) {
  installContextControl(pi, {
    status: Type.Object({}),
    compact: Type.Object({ focus: Type.Optional(Type.String()), resume: Type.Optional(Type.Boolean()) }),
    // Codemode scripts receive these objects instead of the JSON text the model reads.
    statusOutput: Type.Object({ model: nullable(Type.String()), thinkingLevel: Type.Optional(Type.String()),
      contextTokens: nullable(Type.Number()), contextWindow: nullable(Type.Number()), nativeCompactionEnabled: Type.Boolean(),
      nativeCompactionThreshold: nullable(Type.Number()), keepRecentTokens: Type.Number(),
      processedTokens: Type.Object({ input: Type.Number(), output: Type.Number(), cacheRead: Type.Number(), cacheWrite: Type.Number() }),
      compactionPending: Type.Boolean(),
      latestCompaction: nullable(Type.Object({ id: Type.String(), firstKeptEntryId: Type.String(), tokensBefore: Type.Number() })),
      history: Type.String() }),
  }, ctx => SettingsManager.inMemory(pi.getSettings()).getCompactionSettings(ctx.model), contextViews);
}
