---
description: The estate's DSH tool surface as a bundle — the compose-first toolset, the /melite-runs delegation's run doors, and the editor's Enhance host routes.
kind: package-bundle
---

# @melite/harness-tools

`@melite/harness-tools` is the estate's agent-facing tool plane, mounted as
a DSH bundle. The toolset is compose-first: the agent discovers, loads, and
authors on the bench, and does not execute by default — the run press stays
the user's. The run doors (`melite_flow` + `run_status`) belong to the
`/melite-runs` delegation: the user's toggle seats them mid-session, and the
persisted record (`melite-runs-state.json` under the lane's DSH home) seats
them at boot. It calls the estate seats in-process (no HTTP, no gateway)
and mounts card tools imported from their own packages. There is no
config-selected headless interface — HEADLESS IS DSH'S (`dsh headless`,
its own shipped profile); melite carries no parallel mode.

## Contract

- Bundle rows (`cordis.patch.yml`): `melite-tools` (inject `['tools']` —
  every composition) and `melite-tools-doors` (inject webServer + llm +
  tools — web profiles only; server profiles disable the row by id).
- Base toolset: `melite_discover`, `melite_load`, `melite_construct`,
  `melite_view`, `comfy_manage`, `melite_skill_read`,
  `ledger_tail`; the /melite-runs delegation adds `melite_flow` and
  `run_status`. `adhocTools` registers session-named extras only.
- Doors: `/melite-tools/catalog` (live tool schemas + llm route list) and
  `/melite-tools/enhance` (the editor door; one execution core shared with
  everything else).
- Declared exports: `.` (the tool-plane plugin) and `./doors` (the
  web-route plane), `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

The mounted tools' schemas (names, descriptions, parameter schemas), every
tool result returned into the conversation, and — on the enhance door — the
user text plus catalog context sent over the llm seat directly, not as
session turns.

#### Token effect

Conditional — schemas are fixed per mounted toolset; results and enhance
payloads scale with the run and the catalog.

#### KV Cache effect

Append-only — each tool call and result appends to the session transcript;
enhance-door calls are independent one-shots outside it.

## Known Limitations and Deferred Work

- **Compose-only until the user delegates** — a compose-only session cannot
  run a card; that is the contract, and the /melite-runs delegation is the
  only execution seat.
- **Enhance routes are deployment-resolved** — the door enumerates whatever
  llm routes the fiber carries; there is no per-request route pin.
