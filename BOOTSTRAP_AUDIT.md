# BOOTSTRAP_AUDIT — self-bootstrap reproducibility audit (2026-08-30)

Question asked: *Are all comfyui-extensions, comfyui-installs, and
model-downloads documented and able to be auto-downloaded?*

**Verdict: NO.** Three install systems exist and none is complete or
mutually consistent. The H3 lane + the 26-pack git manifest + the catalog
`source:` blocks ARE auto-downloadable. Everything else — 34 of 63 live
extension packs, the host ComfyUI core install, the entire Docker lane,
and ~90% of the 802 GB model estate (124 of 140 large files) — is
undocumented, points at dead paths after the plugins reorg, or exists
only as machine-local state that cannot be re-fetched.

All file:line citations are repo-relative unless an absolute path.

---

## 1. The three install systems (and which one is real)

| System | Files | Status |
|---|---|---|
| A. Host git IaC | `infra/comfyui/bootstrap.sh`, `nodes.manifest`, `models.manifest` | Works, never actually used on this box (`infra/comfyui/nodes/` cache is EMPTY — clones went to `~/Documents/programs/ray` instead) |
| B. h3-lane script | `scripts/comfyui-setup.sh` | Works for the h3-timeline lane; contradicts live state (§2.4) |
| C. Docker lane | `infra/comfyui/Dockerfile.comfyui`, `setup_comfyui.py`, `extension_lane.py` | **BROKEN** — SSOT file class does not exist (§3.2), build context dead (§3.3) |
| D. Root `setup.sh` | `setup.sh:49-103` | **Silently installs nothing** — reads a dead lane path (§3.4) |

The `plugins/` reorg (`plugins/MIGRATION.md`: `plugins/gens` → `plugins/comfyui`,
root `custom_nodes/` → `plugins/comfyui/custom_nodes/`) stranded every
script that still reads the old paths.

## 2. ComfyUI extensions (custom_nodes) — 63 live packs

Live = `ls /opt/ComfyUI/custom_nodes/` minus `__pycache__`,
`example_node.py.example`, `.disabled`.

### 2.1 Documented + auto-downloadable (29 of 63) ✅

- **26 packs** in `infra/comfyui/nodes.manifest:9-36` with public git
  origins (Manager, GGUF, KJNodes, VHS, AnimateDiff, impact/inspire,
  IPAdapter, LTXVideo, rgthree, was-node-suite, …). All 26 verified
  present live. Caveat: `bootstrap.sh:34` clones `--depth 1` unpinned —
  floating HEAD, no ref pins anywhere in this system.
- **+3** in `scripts/comfyui-setup.sh:81-90`: Comfyui-PlagueKind-Nodes,
  ComfyUI-H3-Motion-Context-MultiRef, ComfyUI-SolAttn_triton
  (KJNodes + VHS overlap the manifest).
- **5 in-tree packs** git-tracked at `plugins/comfyui/custom_nodes/`
  (anigen, autorig, seethrough, step1x, stretchy) — copyable, no
  download needed.

### 2.2 Documented prose-only, NOT auto-downloadable (26 + 4 = 30 of 63) ⚠️

`nodes.manifest:38-44` lists them as "NOT git-managed … live in the
ray/melite repos or are local copies, synced by ray's sync_packs.sh":

- 13 live `melite-*-nodes` symlinks → `~/Documents/programs/ray/custom_nodes/`
  (audio, h3-motion, hymotion, kimodo, poser, trelliscpp, utility,
  video exist ONLY there — this repo tracks just 5 of the 13);
- `vnccs`, `vnccs_utils` (= ComfyUI_VNCCS / ComfyUI_VNCCS_Utils),
  `Nvidia_RTX_Nodes_ComfyUI`, `WhatDreamsCost-ComfyUI`,
  `ComfyUI-TRELLIS2`, `ray-audio-nodes`, `qweneditutils`, `LanPaint`,
  `websocket_image_save.py`.

The declared sync path is dead twice over: this repo's
`infra/comfyui/sync_packs.sh:5` declares itself LEGACY, and its SSOT
read (`sync_packs.sh:14-20`) points at `plugins/gens/nodes/extensions.yaml`
— a path that no longer exists. **2 of these packs are already dangling
symlinks** (`ComfyUI-TRELLIS2`, `ray-audio-nodes` → missing targets in
the ray repo) — the estate is already decaying.

### 2.3 Undocumented anywhere (8 of 63) ❌

ComfyUI-3D-Pack, ComfyUI-Dwpose-Tensorrt, ComfyUI-SeedVR2_VideoUpscaler,
ComfyUI-segment-anything-2, ComfyUI_UltimateSDUpscale,
ComfyUI-WanVaceAdvanced, ComfyUI-Wan-VACE-Prep, ComfyUI-WanVideoWrapper.

### 2.4 Live state contradicts the docs

- `plugins/comfyui/models/video/h3-timeline/model.yaml:48-50` declares
  MultiRef "**SUPERSEDES** h3_motion_context base pack", and
  `scripts/comfyui-setup.sh:173-176` verifies exactly that (MultiRef
  enabled, base disabled). The LIVE box is the opposite:
  `_ComfyUI-H3-Motion-Context-MultiRef_DISABLED` (disabled) +
  active `h3_motion_context`. Undocumented flip, invisible to both
  scripts' verification.
  **RESOLVED 2026-08-31**: the either/or framing was wrong in BOTH
  directions — the MultiRef fork is a SUPERSET built ON TOP of the
  base pack (same four class names + ~37 uniquely-named additions:
  V2V motion transfer, masked/keyframed contexts, music video,
  streaming, de-rope continuation), not a rival. Both packs now run
  TOGETHER on the box: fork updated to Update 8 (5839d45) and enabled;
  base verified as owner of the four shared names (load order — sorted
  dir names, base registers last; confirmed from live object_info:
  base's string-combo context_length, no fork target_start).
  model.yaml, extensions.yaml, and comfyui-setup.sh now all verify
  coexistence; the "disable base pack" conflict block is deleted.
- Case-duplicate double registrations live on disk:
  `comfyui-videohelpersuite` (manifest) + `ComfyUI-VideoHelperSuite`
  (real dir), `comfyui-lanpaint` + `LanPaint`, `Comfyui-QwenEditUtils` +
  `qweneditutils` — precisely the phantom-node class
  `infra/comfyui/setup_comfyui.py:80-83` was written to purge.

## 3. ComfyUI installs (core, venv, docker lane)

### 3.1 Host core is unreproducible ❌

- `/opt/ComfyUI` HEAD = `b518a90` = v0.33.0 (`2f35f4a`) + **3 local
  commits on NO remote** (`git log HEAD --not --remotes`:
  b518a90, 001bf9a, c37888e — the entire H3 latent-seam feature).
  Lose this directory → lose the feature.
- Working tree dirty (38 files): the `model.py` PackedLayout sed patch
  IS documented (`scripts/comfyui-setup.sh:160-168`), but the
  `comfy/ldm/lightricks/vae/audio_vae.py` torchaudio-ABI guard
  (2026-08-29) is documented **nowhere**.
- `Dockerfile.comfyui:19` claims the pin is "the same pin the host dev
  clone uses". False: the Docker pin is `e01fb4c…`
  (`Dockerfile.comfyui:58`, verified public on origin/master), the host
  is at `b518a90`. The scripts that allegedly maintain host parity —
  `dev_bootstrap_comfyui.py` and `sync_local_comfyui.py`
  (`Dockerfile.comfyui:42-43`) — **do not exist** in this repo.

### 3.2 Docker lane SSOT is an empty set ❌

`extension_lane.py:36` merges `plugins/*/nodes/extensions.yaml`;
`setup_comfyui.py` (purge + install) is driven entirely by that merge.
**Zero such files exist** — the reorg moved model.yaml trees but nobody
ported the extension lane. A build today would purge every extension
and install none.

### 3.3 Docker build fails at Phase 1 staging ❌

`Dockerfile.comfyui:118-122` `COPY custom_nodes/melite-anigen-nodes …`
from the REPO ROOT — root `custom_nodes/` no longer exists (moved to
`plugins/comfyui/custom_nodes/` per `plugins/MIGRATION.md:61-64`).
`docker compose build inference-comfyui` (compose points at
`infra/comfyui/Dockerfile.comfyui`, `docker-compose.yml:33`) cannot
succeed.

### 3.4 Root setup.sh silently installs nothing ⚠️

- `setup.sh:73-75` reads `plugins/gens/nodes/extensions.yaml` → missing
  → prints WARN and `sys.exit(0)`: a green run that installed zero packs.
- `setup.sh:55` clones ComfyUI **unpinned HEAD** (no parity with the
  Docker pin); `setup.sh:62` installs Manager from `ltdrdata/ComfyUI-Manager`
  while `nodes.manifest:9` uses `Comfy-Org/ComfyUI-Manager` — two
  different origins for the same pack.

### 3.5 pip layer ✅ / model-path SSOT diverged ⚠️

- `comfy-kitchen==0.2.31` documented (`bootstrap.sh:78`,
  `models.manifest:17`, `Dockerfile.comfyui:53-57`) and installed
  (venv reports 0.2.31). `comfy-angle` documented docker-side
  (`Dockerfile.comfyui:69-73`).
- `extra_model_paths.yaml` exists in THREE divergent copies: live
  `/opt/ComfyUI/extra_model_paths.yaml` (has `ultrashape_store`,
  `melite3d_store`, `audiocpp_store`, `model_patches: controlnet`),
  docker-staged `infra/comfyui/stage/extra_model_paths.yaml` (lacks all
  four; has ultralytics/qwen3_tts keys the live one lacks), plus dead
  references to `config/comfyui/extra_model_paths.yaml` (live file
  comment) and `plugins/melite-manager/manager/extra_model_paths.yaml`
  (`setup_comfyui.py:198`) — neither path exists.

## 4. Model downloads

### 4.1 Documented + auto-downloadable ✅ (a thin slice)

- **Catalog `source:` blocks are the only machine-consumed download
  path**: parsed by `src/catalog.c:188-190`, executed by
  `POST /v1/models/download`, `/v1/models/download-all`,
  `/v1/models/provision` (`src/server.cpp:2911-3021, 4107+`), HF
  repo_id+filename resolved via the Hub API
  (`include/inference/download.h:73-81`). 34 of 39 model.yaml families
  carry a `source:` → auto-downloadable (all audio-cpp/ace-step/
  qwen3-tts/moss families, llama, sam/sam3, sd, kimodo, z-image,
  krea-2, anima, h3, mesh_refine, somax, step1x_texture).
- `infra/comfyui/models.manifest:9-14`: 6 H3 files with URLs + exact
  bytes; `bootstrap.sh:51-74` skip/resume download works.
- `scripts/comfyui-setup.sh:107-155`: ~10 h3-lane files with URLs
  (curl + comfy-cli).

### 4.2 Gaps ❌

- **Coverage: 16 of 140 live files >50 MB (11%) have a documented URL.**
  124 files ≈ 790 GB of the 802 GB store are re-fetchable from NOTHING
  in this repo — the whole Wan 2.2 / LTX-2.3 / Flux / Qwen-Edit-2511 /
  krea-2 variant matrix, GGUF quant mirrors, the style/pose LoRA
  collections (krea2_*, VNCCS_*, z-image-*), controlnets, upscalers.
  Outside the comfyui store: `/mnt/data/models/trellis-cpp` (31 GB,
  catalog says `type: local` — deliberately non-downloadable),
  `UltraShape/` 6.9 GB, `3d/` 48 GB, `audio/` 89 GB, `video/` 80 GB —
  none covered by any manifest.
- **`provisions:` / `provision:` blocks are docs-only** — no code
  parses them (grep across `src/`, `include/`, `dsh/`, `plugins/*/engines`
  finds zero consumers; only `source:` is read). The h3-timeline
  provisions (`h3-timeline/model.yaml:68-92`) are honored only because
  `comfyui-setup.sh` re-hardcodes the same URLs.
- **5 families can never provision** (neither `source:` nor
  `provisions:`): `plugins/comfyui/models/image/img-edit/`,
  `video/h3-keyframe/`, `3d/texture_project/`, `3d/transfer_rig/`,
  `plugins/anny/models/3d/composite_character/` — the provision door
  422s "declares no downloadable source" (`server.cpp` handle_provision).
  img-edit alone guards a live qwen-edit estate (~8 weights on disk,
  0 documented).
- **`UNVERIFIED_URL` placeholder is stale**:
  `models.manifest:14` (h3 turbo LoRA, 620 MB) has no URL, yet
  `scripts/comfyui-setup.sh:125` carries a working silveroxides URL for
  the identical filename, and the file IS on disk. Promote the URL and
  the manifest entry becomes whole.
- **Integrity not enforced**: `models.manifest:19-25` records sha256 for
  the 6 H3 files, but `bootstrap.sh` checks only byte size
  (`bootstrap.sh:56-63`); `--checksums` prints, never verifies.

## 5. What to fix, in order of blast radius

1. **Export the 3 local ComfyUI commits** (`b518a90`, `001bf9a`,
   `c37888e`) as patch files under `infra/comfyui/patches/comfyui-core/`
   and pin them in BOTH the Dockerfile and a resurrected host bootstrap —
   today they survive only in `/opt/ComfyUI/.git`.
2. **Port the extension lane to the reorg**: create
   `plugins/comfyui/nodes/extensions.yaml` (26 manifest packs + the 8
   undocumented + h3 lane five, with refs), fix
   `Dockerfile.comfyui:118-122` to `COPY plugins/comfyui/custom_nodes/…`,
   and either delete or repair `setup.sh` + `sync_packs.sh` (dead
   `plugins/gens` reads, silent zero-install exit).
3. **Vendor the 8 ray-only melite packs** into
   `plugins/comfyui/custom_nodes/` (the ray repo is a machine-local
   dependency with 2 already-dangling symlinks), and remove the two
   dangling entries.
4. **Resolve the MultiRef flip** (docs say MultiRef supersedes base;
   live runs base with MultiRef disabled) — either update
   `h3-timeline/model.yaml` + `comfyui-setup.sh` verification or restore
   the documented state.
5. **Add `source:` blocks** to the 5 provision-less families; promote
   the turbo-LoRA URL from `comfyui-setup.sh:125` into
   `models.manifest:14`.
6. **Decide the model-estate policy**: either extend coverage (URLs for
   the Wan/LTX/Flux/Qwen/krea matrices + LoRA collections) or explicitly
   mark the store "manual/restore-from-backup" in one document, so
   "auto-downloadable" has a defined boundary.
7. **Make bootstrap verify sha256** on download (records already exist
   for the H3 six) and pin node refs (replace floating `--depth 1`
   clones).

---

## 6. REMEDIATION APPLIED (2026-08-30, same day — operator scoped: WAN retired, target = the h3-timeline queue pipeline)

### 6.1 ONE PATTERN (operator order, verbatim intent: "all models links are documented, all extension links are documented, we need ONE PATTERN not scattered [REDACTED 2026-11-05]")

Every download link now lives in exactly ONE document, and every consumer
PROJECTS from it — no hand-maintained twins anywhere:

| concern | the one document | projection | executor |
|---|---|---|---|
| extensions | `plugins/comfyui/nodes/extensions.yaml` (pinned refs, pip, patches) | `extension_lane.py` (merge law: plugin-id order, duplicate-name → SystemExit) | `bootstrap.sh --lane` / Docker `setup_comfyui.py` / gateway preflight |
| models | owning family's `model.yaml` `provisions:` (name+url+bytes+sha256) | `model_manifest.py` (one-owner-per-file check, source/provisions agreement check, loud on missing bytes/sha/url) | `bootstrap.sh --models` (sha256 verified on every download) |

Deleted as duplicates of the pattern (git rm):
`infra/comfyui/nodes.manifest`, `infra/comfyui/models.manifest`,
`scripts/comfyui-setup.sh` (legacy lane script, URLs now all in catalog),
`infra/comfyui/sync_packs.sh` (dead `plugins/gens` reads),
`plugins/comfyui/nodes.yaml` (flat pre-reorg lane file — the SSOT move
of 2026-08-26 left it behind un-merged; its unique pip declarations were
ported into extensions.yaml: lanpaint `scikit-image`, controlnet_aux
3 pips, melite-step1x 5 pips).

### 6.2 The production lane, reproducible from a fresh box

`infra/comfyui/bootstrap.sh` (rewritten; flags `--core --lane --lane-all
--models --checksums`, default `all`):
- **--core**: ComfyUI @ `2f35f4a0` + 5 patches from
  `infra/comfyui/patches/comfyui-core/` (3 feature commits exported via
  `git format-patch` + 2 uncommitted diffs; apply-order documented in
  `PIN.md`). Present-tree acceptance: HEAD `b518a900` (base+0001..0003)
  skips; anything else DIES (no silent divergence).
- **--lane**: 8 required packs, every pin verified (NODES_DIR clone cache
  + symlink target + real-dir HEAD all checked against the SSOT ref).
  In-tree (url-less) packs skip cloning. Estate via `--lane-all` (unpinned).
- **--models**: 12 files (11 required + film_net optional) projected from
  the catalog; byte-size skip when present, **sha256 hard-verified on
  every fresh download** (die on mismatch), `INF_VERIFY_PRESENT=1` to
  re-verify present files.

Verified live on the production host 2026-08-30: `--core` skip ✓,
`--lane` 8/8 pins ✓ (Manager py3.12 patch confirmed idempotent),
`--models` 11 present-skips + 1 optional skip ✓.

### 6.3 Other fixes
- `Dockerfile.comfyui`: broken `COPY custom_nodes/melite-*` →
  `COPY plugins/comfyui/custom_nodes/*` (5 in-tree packs, now also
  declared url-less in the lane so the Docker purge won't nuke them);
  stale `infra/docker/*` comment paths corrected; host-vs-Docker pin
  divergence documented in-file (host `2f35f4a`+patches ≠ image
  `e01fb4c` — upstream-only feature set, deliberately not unified).
- `setup.sh` §4: dead `plugins/gens` python block → delegation to
  `bootstrap.sh --core|--lane|--models` with `error()` on failure.
- `setup_comfyui.py`: stale path comments fixed (patches at
  `infra/comfyui/patches/`, in-tree packs at `plugins/comfyui/custom_nodes/`).
- Live estate hygiene: removed dangling `ComfyUI-TRELLIS2`,
  `ray-audio-nodes` symlinks + case-duplicate registrations
  `comfyui-videohelpersuite`, `qweneditutils`, `LanPaint` (kept the
  canonical `ComfyUI-VideoHelperSuite`, `Comfyui-QwenEditUtils`,
  `comfyui-lanpaint`).
- `h3-timeline/model.yaml` `requires:`: names only (repo URLs removed —
  they mirrored the lane SSOT).
- Turbo-LoRA UNVERIFIED_URL resolved: silveroxides URL promoted into the
  h3 provisions with full bytes+sha (§4.4 gap closed).
- MultiRef flip: docs now match reality — base `h3_motion_context` pack
  is the lane; the seitanism fork is retired and out of lane.

### 6.4 Still open (accepted or operator-decision)
1. **5 provision-less families** (img-edit, h3-keyframe, texture_project,
   transfer_rig, composite_character) — the C++ provision door still 422s
   on them. The h3 lane is fully covered; these families need either
   `source:` blocks or explicit `type: local` marking.
2. **Wide model estate** (802 GB store; Wan/LTX/Flux/Qwen/krea matrices,
   LoRA collections) — deliberately OUT of the manifests (boundary
   decision §4.2; WAN retired by operator). Restore-from-backup applies.
3. **Docker image pin `e01fb4c`** differs from host pin `2f35f4a`+patches —
   documented, not unified (different feature sets; the queue pipeline
   runs on the HOST today).
4. **Manager pack .git corruption** on the ray-clone (`pack-b64410ae…`
   unknown object) — pin + fresh-clone sidesteps it; surgical repair not
   attempted (ray repo is a machine-local dependency, slated for
   vendoring per §5.3).
5. **Cold-start drill** — the curl+sha download path is verified by
   construction and by the 12/12 byte-size matches, but a full
   empty-box `bootstrap.sh all` run (≈90 GB for the required set) has
   not been exercised end-to-end on this host.

---

*Method: full enumeration of `/opt/ComfyUI/custom_nodes` (66 entries) and
`/mnt/data/models/image-gen/comfyui` (140 files >50 MB, 802 GB) diffed
against every URL/name in `nodes.manifest`, `models.manifest`,
`scripts/comfyui-setup.sh`, and all 42 `plugins/**/model.yaml`; code
consumers verified by grep over `src/`, `include/`, `dsh/`, `scripts/`;
git state verified on `/opt/ComfyUI` (remotes, unpushed commits, dirty
tree). Remediation verified by live runs of all three bootstrap stages
against the production host (§6.2).*
