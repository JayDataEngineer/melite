---
description: LocalSync lip-sync family — unoffered registration; the run router and the engine's own lane own the invocation.
kind: package-library
---

# latentsync

latentsync registers the LocalSync lip-sync family (form `form_edit`, genre `other`) — video where mouth shapes are driven by an audio track. The DECL is `unoffered`: the family contributes no actions, no defaults, and no lane inputs. Its one variant (`standard`, native route, weightless) and its no-op `default` recipe exist so cards can name the model's run route; the run router and the engine's own validation own everything else.

## Model Experience

### Request context and condition

The card surface is the run router's lane, not this package's write plane: nothing here parses params or builds a graph. The family's job is registration — the id, the label, and the variant naming the native route.

#### What the model sees

Undeclared here. The family's DECL names no weights, no params, and no node inputs; whatever the engine's LocalSync lane loads and conditions on is the engine's own truth, not this package's.

#### Token effect

None — the package contributes no model-visible input.

#### KV Cache effect

Independent — no shared context is declared or referenced.

## Known Limitations and Deferred Work

- **No declared weights** — the variant is weightless by design; provisioning is not owned here, so a missing model fails at the engine, with the engine's voice.
- **No action surface** — any lip-sync tuning must ride the run router's own vocabulary; this package cannot carry it until an action is declared.
- **Live behavior unobserved** — not verified against the running model.

Exports: the plugin root, `./package.json`.
