---
description: The estate host row — mounts the whole server-side melite composition into the DSH host as child plugins.
kind: package-bundle
---

# melite-estate

`@melite-plugin/dsh-estate` is the one bundle row that seats melite's server side inside the DSH host. Its plugin mounts the composition as child plugins through `ctx.plugin`: the local subprocess seat, the engines tier (the `engines` registry, the ComfyUI adapter, the optional MCP engine lane, the craft critic, the agent engine), the drafts service, the serial run queue with its disclosure, skills, and runs seats, and the manage, runs, media, and models remotes plus the provisioning composition. A consumer row, never a provider: the storage stack belongs to dsh-base in profiles.

## Contract

The manifest declares `dsh.bundle.patch: ./cordis.patch.yml`, inserting the single `melite-estate` row, and the standard `./package.json` re-export. Config face, pinned by the profile's `cordis.yml` row — every env seam is gone:

- `repoRoot` — pins the runs state tree; the queue refuses unpinned boots.
- `allowGuttedLane` — serve degraded (recorded on the `meliteLaneHealth` service) instead of refusing the boot when required bundles are absent.
- `mcpEngines` — MCP engine ids to seat; default none, announced loud, optional and experimental.
- `criticRoute` and `agentRoute` — named `"provider/model"` routes for the craft critic and the agent brain; unset means the auto route for the critic and a loud refusal at the door for the agent.

The bundle gate runs first in `apply`, before any row mounts: it checks the loader tree for the required bundle rows and either refuses the fiber or degrades per `allowGuttedLane`. The models row mounts first and is awaited, so a family refusal fails the lane atomically before any other row lands.

## Model Experience

### Request context and condition

#### What the model sees

None directly — the row seats engines and remotes; what reaches a model request is each seated engine's own contract (the routes named in config, the skill leaves its spawner discloses).

#### Token effect

Zero-direct token effect; the engines it seats own their own request costs.

#### KV Cache effect

Independent — the row contributes no content to model requests.

## Known Limitations and Deferred Work

- **No MCP engine by default** — `mcp:…` stages refuse by name at their own door until an engine is explicitly seated; a 3D bench is a DSH-profile concern, not this row's.
- **The bundle gate's scope is the core surface** — card studios stay optional by design, since a headless commission estate composes without them; the every-bundle sweep belongs to dsh-app-boot upstream.
- **No `./invariant` companion** — the row's mount claims are composition facts checked by the bundle gate at boot; independent observations cannot diverge around a runtime assertion here.
