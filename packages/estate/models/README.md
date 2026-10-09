---
description: The models provisions door — serves declared family provision files same-origin and delegates acquisition to the shared provisioning service.
kind: package-library
---

# @melite/estate-models

`@melite/estate-models` is the provisions door for model-family DECLs. It
imports the booted DECL table from the model packages and serves their owned
bytes at `GET /v1/models/<family>/provisions/<name>` on the host webServer
seat, placement resolved from each endpoint's declared paths. Missing or
drifted artifacts are delegated to the shared ProvisioningService (submit to
ComfyUI-Manager's install queue, then verify path and SHA-256) — the door
never downloads bytes itself and never forwards client traffic.

## Contract

- Grammar: `GET /v1/models/<family>/provisions/<name>` under the single
  `MODELS_PREFIX` (disjoint by law); GET/HEAD only, else 405; unknown
  families or provisions are loud 404s.
- Placement: `<download_path>/<folder>/<name>` where `download_path`
  resolves the endpoint's `model_download_path`, else `model_base_path`,
  else the configured download root over the endpoint base. The DECL's
  place, never guessed.
- Serving: present, sha-matching bytes are served with immutable caching;
  segment confinement is the shared contracts' `segmentConfined`, not a
  private regex.
- Declared exports: `.` (the route plugin) and `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None — the door serves weight and provision files to browsers and the
engine's model folders; it contributes nothing to a model request.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state.

## Known Limitations and Deferred Work

- **Acquisition is asynchronous** — a provision delegated to
  ComfyUI-Manager lands when Manager's queue finishes; the door serves a
  loud miss until then.
- **The store-root override is a seam, not a law** — the test/lane override
  exists for harnesses; endpoint and root configs remain the source of
  truth in a real mount.
