import { Type } from '@earendil-works/pi-ai';
import { SettingsManager } from '@earendil-works/pi-coding-agent';
import { Container, Text } from '@earendil-works/pi-tui';
import { installContextControl } from './src/controller.js';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const exact = new Intl.NumberFormat('en-US');
const count = (value, format = exact) => Number.isFinite(value) ? format.format(value) : 'unknown';

const statusRenderers = {
  renderShell: 'self',
  renderCall(_args, theme, context) {
    return context.isPartial ? new Text(theme.fg('muted', 'Context · checking…'), 0, 0) : new Container();
  },
  renderResult(result, { expanded }, theme, context) {
    const status = result.details;
    if (context.isError || !status) {
      const message = result.content.filter(part => part.type === 'text').map(part => part.text).join('\n');
      return new Text(theme.fg(context.isError ? 'error' : 'muted', message || 'Context unavailable'), 0, 0);
    }
    const percent = Number.isFinite(status.contextTokens) && status.contextWindow > 0
      ? ` · ${Math.round(status.contextTokens / status.contextWindow * 100)}%` : '';
    const state = status.compactionPending ? ' · checkpoint pending' : status.nativeCompactionEnabled ? '' : ' · auto-compaction off';
    const summary = `Context ${count(status.contextTokens, compact)} / ${count(status.contextWindow, compact)}${percent}${state}`;
    const lines = [summary];
    if (expanded) {
      lines.push(`Model: ${status.model ?? 'unknown'} · thinking: ${status.thinkingLevel ?? 'unknown'}`,
        `Context tokens: ${count(status.contextTokens)} / ${count(status.contextWindow)}`,
        `Native compaction: ${status.nativeCompactionEnabled ? 'on' : 'off'} · threshold: ${count(status.nativeCompactionThreshold)} · keep recent: ${count(status.keepRecentTokens)}`,
        `Processed tokens: input ${count(status.processedTokens.input)} · output ${count(status.processedTokens.output)}`,
        `Cache: read ${count(status.processedTokens.cacheRead)} · write ${count(status.processedTokens.cacheWrite)}`,
        status.latestCompaction
          ? `Latest checkpoint: ${status.latestCompaction.id} · first kept: ${status.latestCompaction.firstKeptEntryId} · tokens before: ${count(status.latestCompaction.tokensBefore)}`
          : 'Latest checkpoint: none', status.history);
    }
    return new Text(theme.fg('muted', lines.join('\n')), 0, 0);
  },
};

export default function contextControl(pi) {
  installContextControl(pi, {
    status: Type.Object({}),
    history: Type.Object({ action: Type.Union([Type.Literal('search'), Type.Literal('read')]),
      query: Type.Optional(Type.String()), entryId: Type.Optional(Type.String()), offset: Type.Optional(Type.Integer({ minimum: 0 })) }),
    compact: Type.Object({ focus: Type.Optional(Type.String()), resume: Type.Optional(Type.Boolean()) }),
  }, ctx => SettingsManager.inMemory(pi.getSettings()).getCompactionSettings(ctx.model), statusRenderers);
}
