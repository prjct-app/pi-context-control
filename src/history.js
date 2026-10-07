const isMessage = entry => entry.type === 'message' || entry.type === 'custom_message';

/** Render original entries, including reasoning and tool calls omitted by contentText. */
function historyRecord(entry) {
    const message = entry.type === 'message' ? entry.message : entry;
    const content = typeof message.content === 'string' ? message.content : (message.content ?? []).map(block => {
      if (block.type === 'text') return block.text;
      if (block.type === 'thinking') return block.thinking ?? '[Opaque reasoning remains in the journal]';
      if (block.type === 'toolCall') return `${block.name}(${JSON.stringify(block.arguments)})`;
      if (block.type === 'image') return '[Image preserved in the session journal]';
      return `[${block.type ?? 'non-text content'} preserved in the session journal]`;
    }).join('\n');
    return { id: entry.id, role: message.role ?? 'custom', timestamp: entry.timestamp, text: content };
}

/** Read only this session's selected branch; the stored journal is never changed. */
export function readHistory(branch, request) {
  const offset = Math.max(0, Math.floor(request.offset ?? 0));
  if (request.action === 'read') {
    const entry = branch.find(entry => entry.id === request.entryId && isMessage(entry));
    if (!entry) throw new Error('Entry is not in this session branch. Use context_history search to find its ID.');
    const record = historyRecord(entry);
    const page = record.text.slice(offset, offset + 16000);
    const nextOffset = offset + page.length;
    return { id: record.id, role: record.role, timestamp: record.timestamp, text: page, totalCharacters: record.text.length,
      nextOffset: nextOffset < record.text.length ? nextOffset : null };
  }
  const query = String(request.query ?? '').toLocaleLowerCase();
  const entries = branch.filter(isMessage);
  // Listing and reading need only the requested page. Literal search inspects all text.
  const matches = query ? entries.map(historyRecord).filter(record => record.text.toLocaleLowerCase().includes(query)) : entries;
  const page = matches.slice(offset, offset + 20).map(entry => {
    const record = query ? entry : historyRecord(entry);
    const at = query ? record.text.toLocaleLowerCase().indexOf(query) : 0;
    return { id: record.id, role: record.role, timestamp: record.timestamp, characters: record.text.length,
      excerpt: record.text.slice(Math.max(0, at - 80), Math.max(0, at - 80) + 320) };
  });
  return { totalMatches: matches.length, entries: page, nextOffset: offset + page.length < matches.length ? offset + page.length : null };
}
