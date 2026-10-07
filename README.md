# Pi Context Control

The active agent owns its context decisions. This independent Pi extension provides three optional tools through Pi's public SDK:

- `context_status` shows one compact terminal line; expand the tool result for model, reasoning, compaction and usage details. The model still receives the complete structured result. Cached input is reported separately; processed tokens are not a provider quota estimate.
- `context_history` searches the selected session branch by literal text and reads original text by entry ID, including entries before compaction. Results have explicit pagination. Listing and reading render only the requested entries; literal search still examines the whole selected branch. Stored history is never shortened or rewritten. Images and opaque reasoning remain in the original journal.
- `context_compact` requests a native checkpoint when the active agent chooses one. An optional `focus` adds instructions, without requiring a handoff note. Pi uses the current model and reasoning settings, pauses the run, saves the summary, then continues the same task. `resume: false` leaves the session paused.

All three tools use compact terminal rows with expandable details. This changes presentation only; errors remain visible and the complete results reach the model.

There is no JEV integration, classifier, alternate summarizer model, cost trigger, timer, automatic early compaction, observation masking, reasoning pruning or message-count limit. Normal prose can complete a task. Native Pi automatic compaction remains available at its configured threshold.

## Install

Install independently from npm with `pi install npm:@prjct.app/pi-context-control@0.1.2`. It requires the host-provided `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent` and `@earendil-works/pi-tui` SDKs. It does not import sibling checkouts.

An optional cache-sharing summary extension may handle Pi's native compaction event; load that extension last. This package works with Pi's native summarizer by itself.

For `@prjct.app/pi-subagents`, explicitly include this package in `extensionPackages` and use a runner version supporting context checkpoints. A checkpoint temporarily settles the underlying Pi run before resuming; an older runner may mistake that for task completion. Each child operates on its own session history. Reader roles retain their file capability restrictions.

## Tradeoffs and verification

Compaction makes a paid summary request and can omit details; no summary system guarantees lossless semantic retention. The original journal and exact-text retrieval provide a recovery path. This package does not promise a token reduction percentage or change the model's window or reasoning level. A failed summary leaves the original history intact and does not automatically retry through this tool.

Run `npm run check`, `npm test` and `npm run check:package`. Host integration must additionally exercise the installed package with the relevant extensions, native compaction callbacks and both child runners. Deterministic provider fixtures verify control flow, not model intelligence or semantic summary quality.
