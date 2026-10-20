---
description: Transport-free run-status laws and the card-family catalog door shared by the studio's card surfaces.
kind: package-library
---

# melite-run-wire

`@melite-plugin/melite-run-wire` is the pure half of the studio's run plane: the status-row grammar and its one normalize, the one media-url rewrite, the terminal vocabulary, and the card-to-family catalog door. It was once the browser transport; every transport verb now rides the mounted Typert namespaces in dsh-card-view. Consumers import these laws; nothing in this package fetches an `/api` envelope.

## Contract

The package root (`.`) is the only programmatic door; the manifest also declares the standard `./package.json` re-export.

- Status grammar — `RunStageStatus` and `RunStatusRow`, normalized once by `readRunStatus`: stage urls rewritten, a stage's `error`, `progress`, and `activity` passed through verbatim, and a run-level status outside `RUN_STATUS_WORDS` thrown on read.
- Url laws — `toRunMediaUrl` (bare run-relative names ride `/melite-media/runs/<runId>/<rel>`; scheme-carrying or rooted urls pass verbatim), plus the list-row pair `listArtifactMediaUrl` and `listRowMediaUrl`, whose currency is already run-prefixed.
- Terminal vocabulary — `isTerminalRun`, `TERMINAL_RUN_STATUSES`, and `RUN_STATUS_WORDS`, re-exports of `@melite/contracts/stageView`, the one owner.
- Catalog door — `fetchCardFamilies` (card id → boarded families; a row with no families array carries `[]`, never a minted `[id]`) and `defaultFamilyForCard` (default family, `null` for a carried family-less card, throws for an uncarried card — never a minted self-default): `GET /v1/model-catalog`, cached per session; `resetCardFamiliesCache` drops the cache.

## Model Experience

### Request context and condition

#### What the model sees

None — the package reads the status and catalog doors and transforms their documents; it contributes no field to a model request.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — the fetches here answer the browser, not a model.

## Known Limitations and Deferred Work

- **The family cache is static per boot** — `fetchCardFamilies` memoizes one door round trip; a models re-scan mid-session is visible only after `resetCardFamiliesCache`, which is currently a test hook.
- **No `./invariant` companion** — the laws are pure functions over served documents with one definition each; the cross-package drift the invariant rules guard is absent.
