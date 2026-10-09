---
description: The DSH embed's shell-hygiene row — loud typed refusals for the retired editor LLM lane plus the ComfyUI Manager sidebar tab.
kind: package-bundle
---

# melite-card-deck

`@melite-plugin/dsh-card-deck` keeps the retired editor surfaces honest inside the DSH origin. Its host half stubs the editor's `/v1/llm/*` lanes with typed refusals so the studio never reads the old keystore; its browser half registers the ComfyUI Manager tab over the estate's `manage` Typert remote. The cards tab itself belongs to `@melite-plugin/dsh-card-view`; the deck's center-column takeover is deleted.

## Contract

The manifest declares `dsh.bundle.patch: ./cordis.patch.yml`, inserting the deck row.

- `.` (host) — a prefix route on `/v1/llm` answering canned typed bodies: `keys` returns an empty list, `keys/active` and unknown lanes return 404 `llm_lane_disabled`, `health` reports `connected: false` with reason `dsh_owns_the_assistant`. The stub stays a stub deliberately: without it the shell fallback would answer these lanes with 200 plus HTML, which the studio would misparse as keystore JSON.
- `./client` (browser) — injects `slots`, `sidebarRightTabs`, `remote`, and `remote.manage`, and registers the native manager tab (assets over the `manage` namespace). The panel carries no transport of its own; the estate remotes are mounted by dsh-card-view's client. An apply claim keeps the tab from double-mounting.

The manifest also declares the standard `./package.json` re-export.

## Model Experience

### Request context and condition

#### What the model sees

None — the stub answers browser HTTP requests; the assistant's model calls belong to DSH, not this package.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no content of this package reaches a model request.

## Known Limitations and Deferred Work

- **The LLM lane is dead surface by design** — the routes return typed refusals instead of vanishing because the fallback's lying 200 was the bug; restoring the lane means wiring a real DSH door, not un-stubbing this one.
- **No `./invariant` companion** — the row's claims (fixed stub bodies, one tab registration) are boot facts a host either serves or does not; no cross-package observation can diverge around an assertion here.
