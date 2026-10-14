import { Container, Text } from '@earendil-works/pi-tui';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const exact = new Intl.NumberFormat('en-US');
const count = (value, format = exact) => Number.isFinite(value) ? format.format(value) : 'unknown';

/** Presentation only: the complete tool content and details still reach the model. */
function toolView(label, describe) {
  return {
    renderShell: 'self',
    renderCall(_args, theme, context) {
      return context.isPartial ? new Text(theme.fg('muted', `${label} · pending…`), 0, 0) : new Container();
    },
    renderResult(result, { expanded }, theme, context) {
      if (context.isError || !result.details) {
        const message = result.content.filter(part => part.type === 'text').map(part => part.text).join('\n');
        return new Text(theme.fg(context.isError ? 'error' : 'muted', message || `${label} unavailable`), 0, 0);
      }
      return new Text(theme.fg('muted', describe(result.details, expanded, context.args).join('\n')), 0, 0);
    },
  };
}

export const contextViews = {
  status: toolView('Context', (status, expanded) => {
    const percent = Number.isFinite(status.contextTokens) && status.contextWindow > 0
      ? ` · ${Math.round(status.contextTokens / status.contextWindow * 100)}%` : '';
    const state = status.compactionPending ? ' · checkpoint pending' : status.nativeCompactionEnabled ? '' : ' · auto-compaction off';
    const lines = [`Context ${count(status.contextTokens, compact)} / ${count(status.contextWindow, compact)}${percent}${state}`];
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
    return lines;
  }),
  compact: toolView('Context checkpoint', (status, expanded, args) => {
    const lines = [status.status === 'already_requested' ? 'Context checkpoint already requested' : 'Context checkpoint requested'];
    if (expanded) {
      if (status.model) lines.push(`Model: ${status.model} · resume: ${status.resume ? 'on' : 'off'}`);
      if (args?.focus) lines.push(`Focus: ${args.focus}`);
      if (status.note) lines.push(status.note);
    }
    return lines;
  }),
};
