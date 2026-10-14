# Changelog

## Unreleased

- Breaking: `context_history` is removed. `@prjct.app/pi-memory` 1.0 provides `memory_context`, which searches the same journal plus earlier sessions of the project, by date, and reads any entry by id.
- `context_status` and the checkpoint follow-up name `memory_context` only when it is loaded; `context_compact`'s description drops the pointer (7 fewer tokens per request).

## 0.1.4

- Add the English package cover to the README, npm archive, and Pi gallery metadata.
- Publish matching version tags through the package GitHub Actions workflow.

