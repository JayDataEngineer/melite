# hot/ — drop-in mods + basic cards for the RUNNING estate

THE HOT DOOR (#39). Write a drop-in here, add one `insert` row to the
profile's `cordis.patch.yml`, and the RUNNING lane mounts it — no
restart, no rebuild, no bundle. Remove the row and the lane disposes
the fiber and the registration reverts.

This directory rides **DSH's own native machinery, zero custom
watcher code**: custom profiles default `patchReload: "live"`, so
dsh itself watches the profile patch file (`hmr.registerConfig` →
the root include's `entry.update`) and the **loader** mounts /
disposes the inserted plugins as fibers. The estate only owns the
seams that make hot registrations SERVE (below).

## The contract

A drop-in is an ordinary cordis plugin file (`*.plugin.ts`,
TypeScript, Node's native type stripping — avoid enums, namespaces,
parameter properties):

```ts
import type { Context } from '@deepseek-ai/cordis'
import { refreshCardDefs, theService } from '@melite/comfyui-cordis'

export function apply(ctx: Context): void {
  ctx.effect(() => {
    const off = theService().registerFlavor({ ... })   // mods rows
    // and/or theService().registerCard({ ... })        // a card
    refreshCardDefs()                                   // cards serve
    return () => { off(); refreshCardDefs() }           // revert + re-project
  })
}
```

Laws:

- **Do NOT `inject: ['comfyui']`** — a drop-in loads at the ROOT
  include level where `comfyui` binds `ComfyUIHostService`, not the
  card plane. Talk to the card-plane **singleton by import**
  (`theService()` from `@melite/comfyui-cordis`) — the same module
  instance the estate's doors serve from.
- **Files live under this directory** (or anywhere inside the
  `@melite/melite-estate` package): drop-in imports resolve through
  THIS package's node_modules. A repo-root dir would see pnpm's
  strict root and resolve nothing. The authoring seams
  (`@deepseek-ai/schemastery`, `@melite/comfyui-card-kit`,
  `@melite/comfyui-cordis`) are the estate's declared deps for
  exactly this reason.
- **The patch file is the SSOT of what loads** — no implicit glob.
  A drop-in mounts only while a patch `insert` row names it, so
  `examples/` is documentation BY CONFIG, not by directory magic.
  Every patch save reconciles: inserted fibers cycle
  (dispose + recreate) — the dsh loader's own diffing.
- **Mods rows serve on the next form-spec request** (the spec reads
  the singleton's flavors live). **Cards ride the defs snapshot
  cache** — call `refreshCardDefs()` after registering AND inside
  the disposer (the #39 re-projection seam).
- **THE FLAVOR MERGE (#39)**: several flavors may board one
  `(pack, family)` — the family's own table plus hot rows MERGE
  (id-keyed, family rows first). Before #39 a second flavor was
  invisible behind the first.
- **Boarded families are id strings** in drop-ins
  (`boarded: ['krea-2', 'z-image']`): a packaged card imports the
  family DECL for tsc-time spelling; a drop-in rides the runtime
  family gate instead (unknown ids refuse loud) — the price of
  zero-install authoring.
- **The registration gates own every refusal**: duplicate card ids,
  unprovisioned rows, bad shapes refuse LOUD in the lane log; the
  watcher survives; nothing half-serves.

## The mount row

`data/runtime/dsh-harness-home/profiles/melite-test/cordis.patch.yml`:

```yaml
- insert:
    - name: ../../../../../packages/web/melite-estate/hot/examples/real-mod.plugin.ts
- insert:
    - name: ../../../../../packages/web/melite-estate/hot/examples/real-card.plugin.ts
```

Relative names anchor beside the patch file (the loader converts
them to `file://` URLs).

## Live receipts (2026-09-19, the running lane, no restarts)

- `[hot] probe.plugin.ts LIVE — mounted by the dsh native patch reload`
  → `hot_probe_row` served in `/v1/form-spec?model=h3-timeline`
  BESIDE the family rows (the merge); row removed → fiber disposed →
  row stopped serving.
- `real-mod.plugin.ts`: `h3_silu_temb_grid.safetensors` — provisioned
  on the estate, linked in the family provisions, served live by a
  drop-in.
- `real-card.plugin.ts`: the `hot-sketch` card (full CardDefinition,
  card-kit `imageT2I` recipe, krea-2 + z-image boarding) — served in
  `/v1/forms`, spec'd at `/v1/form-spec?model=hot-sketch`, and
  `POST /v1/flows/validate` returned `{"ok":true,"flow":"hot-sketch"}`.

## When a drop-in grows up

A hot file is the seed of a package, not its replacement: when a
card or mod row stabilizes, it moves to its own package
(`make-card` / `make-model`) and its `cardPackages` / family row —
the hot door stays for the next experiment.
