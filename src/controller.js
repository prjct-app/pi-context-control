import { readHistory } from './history.js';

const result = value => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value, details: value });

/** No context transforms, timers, threshold prompts, classifiers or model requests. */
export function installContextControl(pi, schemas, compactionSettings, views = {}) {
  const state = { generation: 0, pending: false };
  const reset = () => { state.generation += 1; state.pending = false; };
  pi.on('session_start', reset);
  pi.on('session_tree', reset);
  pi.on('session_shutdown', reset);
  pi.registerTool({
    name: 'context_status', label: 'Context status',
    description: 'Inspect current context size, native Pi compaction threshold and usage. Processed tokens include cached input; they do not measure remaining provider quota. Inspection does not trigger compaction.',
    parameters: schemas.status,
    ...(schemas.statusOutput ? { outputSchema: schemas.statusOutput } : {}),
    ...views.status,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async execute(_id, _args, _signal, _update, ctx) {
      const usage = ctx.getContextUsage();
      const settings = compactionSettings(ctx);
      const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
      const branch = ctx.sessionManager.getBranch();
      for (const entry of branch) {
        const metered = entry.type === 'message' && entry.message.role === 'assistant' ? entry.message.usage
          : entry.type === 'usage' || entry.type === 'compaction' ? entry.usage : undefined;
        if (metered) for (const key of Object.keys(totals)) totals[key] += Number(metered[key]) || 0;
      }
      const latest = branch.findLast(entry => entry.type === 'compaction');
      return result({ model: ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : null, thinkingLevel: ctx.thinkingLevel,
        contextTokens: usage?.tokens ?? null, contextWindow: ctx.model?.contextWindow ?? null,
        nativeCompactionEnabled: settings.enabled, nativeCompactionThreshold: ctx.model ? ctx.model.contextWindow - settings.reserveTokens : null,
        keepRecentTokens: settings.keepRecentTokens, processedTokens: totals, compactionPending: state.pending,
        latestCompaction: latest ? { id: latest.id, firstKeptEntryId: latest.firstKeptEntryId, tokensBefore: latest.tokensBefore } : null,
        history: 'Original entries on this branch remain available through context_history. No quota estimate is inferred from API prices.' });
    },
  });
  pi.registerTool({
    name: 'context_history', label: 'Context history',
    description: 'Recover original text from this session branch, including before compaction. Search literal text (empty query lists entries), then read by ID; follow nextOffset for more. Images remain in the journal.',
    parameters: schemas.history,
    ...(schemas.historyOutput ? { outputSchema: schemas.historyOutput } : {}),
    ...views.history,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async execute(_id, args, _signal, _update, ctx) { return result(readHistory(ctx.sessionManager.getBranch(), args)); },
  });
  pi.registerTool({
    name: 'context_compact', label: 'Request context checkpoint', exposure: 'model-only',
    description: 'Optionally request native Pi compaction when you judge a checkpoint useful. Costs one summary request using your current model and reasoning, pauses this run, then resumes unless resume=false. No handoff note required; normal prose can finish a task. Recover omitted details with context_history. Call alone after pending tools finish.',
    parameters: schemas.compact,
    ...views.compact,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    async execute(_id, args, signal, _update, ctx) {
      if (signal?.aborted) throw new Error('Checkpoint request cancelled.');
      if (!ctx.model) throw new Error('No active model is available for compaction.');
      if (state.pending) return result({ status: 'already_requested' });
      const generation = state.generation;
      const sessionId = ctx.sessionManager.getSessionId();
      const current = () => state.generation === generation && ctx.sessionManager.getSessionId() === sessionId;
      const operation = { settled: false };
      state.pending = true;
      const onError = error => {
        if (!current() || operation.settled) return;
        operation.settled = true;
        state.pending = false;
        if (ctx.hasUI) ctx.ui.notify(`Context checkpoint failed; original history retained: ${error.message}`, 'error');
      };
      try {
        // Fire-and-forget is Pi's public extension contract. Awaiting the
        // compaction inside this tool would deadlock its abort of the run.
        ctx.compact({
          customInstructions: [
            'Preserve the original active task, every unresolved user correction and constraint, verified evidence, unfinished work and exact next actions. Keep complete sentences. Do not claim pending work is complete.',
            args.focus ? `Additional focus selected by the active agent: ${args.focus}` : '',
          ].filter(Boolean).join('\n\n'),
          onComplete: () => {
            if (!current() || operation.settled) return;
            operation.settled = true;
            state.pending = false;
            if (args.resume !== false) {
              try { pi.sendMessage({ customType: 'context-checkpoint', display: false,
                content: 'The checkpoint you requested completed. Continue the existing task with its original constraints and latest user steering. Use context_history if you need exact evidence from before the summary.' },
              { triggerTurn: true, deliverAs: 'followUp' }); } catch (error) {
                if (ctx.hasUI) ctx.ui.notify(`Checkpoint saved, but continuation could not start: ${error.message}`, 'error');
              }
            }
          },
          onError,
        });
      } catch (error) { state.pending = false; throw error; }
      return result({ status: 'requested', resume: args.resume !== false, model: `${ctx.model.provider}/${ctx.model.id}`,
        note: 'This acknowledges the request, not a completed checkpoint. Pi reports completion or failure.' });
    },
  });
  return state;
}
