import { Type } from '@earendil-works/pi-ai';
import { SettingsManager } from '@earendil-works/pi-coding-agent';
import { installContextControl } from './src/controller.js';

import { contextViews } from './src/views.js';

export default function contextControl(pi) {
  installContextControl(pi, {
    status: Type.Object({}),
    history: Type.Object({ action: Type.Union([Type.Literal('search'), Type.Literal('read')]),
      query: Type.Optional(Type.String()), entryId: Type.Optional(Type.String()), offset: Type.Optional(Type.Integer({ minimum: 0 })) }),
    compact: Type.Object({ focus: Type.Optional(Type.String()), resume: Type.Optional(Type.Boolean()) }),
  }, ctx => SettingsManager.inMemory(pi.getSettings()).getCompactionSettings(ctx.model), contextViews);
}
