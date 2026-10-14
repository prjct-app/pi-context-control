## [1.0.0](https://github.com/prjct-app/pi-context-control/compare/v0.1.3...v1.0.0) (2026-10-14)

### ⚠ BREAKING CHANGES

* the context_history tool is gone.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

### Features

* move history recovery to pi-memory ([c41d8ff](https://github.com/prjct-app/pi-context-control/commit/c41d8ffe3a70eb8a72cf4a26435fc7d6e91ea815))

### Bug Fixes

* add package cover and Pi gallery preview ([#1](https://github.com/prjct-app/pi-context-control/issues/1)) ([369f47e](https://github.com/prjct-app/pi-context-control/commit/369f47e2ad2eb284295e1167fd731f4888a943ca))

# Changelog

## Unreleased

- Breaking: `context_history` is removed. `@prjct.app/pi-memory` 1.0 provides `memory_context`, which searches the same journal plus earlier sessions of the project, by date, and reads any entry by id.
- `context_status` and the checkpoint follow-up name `memory_context` only when it is loaded; `context_compact`'s description drops the pointer (7 fewer tokens per request).

## 0.1.4

- Add the English package cover to the README, npm archive, and Pi gallery metadata.
- Publish matching version tags through the package GitHub Actions workflow.
