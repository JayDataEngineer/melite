---
name: unity-delivery
description: Closed-loop game-kit delivery into meld — bulk kits via tools/ingest_ray_kit.py (classify, flac->ogg, loop enforcement, headless verify, delivery log, commit), single assets via scripts/deliver_asset.py; requests live in meld docs/ART-MANIFEST.md.
---

# Unity delivery — the closed loop

Two automated paths move assets from this repo into the game
repo (`~/Documents/programs/games/meld`). Manual copying is
BANNED — the 2026-08-25 kit-v1 hand-import took a whole agent session and
left import-law mistakes; both paths below encode those lessons.

## Request side (what to make)

Requests are FORMAL now (2026-08-26 — docs/reference/ADR-ASSET-REGISTRY.md):

- **Queue**: `POST /v1/requests (gateway API)
  `curl -X POST http://127.0.0.1:18090/v1/requests -d '{"class":"..","asset_id":"..","spec":".."}'
  (or MCP `meld-assets` -> `submit_asset_request`). One OPEN request per asset id.
- **Work order**: `python3 scripts/process_requests.py list` -> `claim`
  (serial GPU law: one active machine-wide) -> run the class lane -> gate ->
  deliver -> `complete --req ... --run-id ... --sha16 ...` (stamps the
  registry) or `reject --reason`.
- **Inventory SSOT**: `GET /v1/requests (gateway API) id
  with append-only version rows (run_id, seeds, sha16, gate verdict,
  kit/promote commit, game_path). Read it before making anything.
- `~/Documents/programs/games/meld/docs/ART-MANIFEST.md` stays the human
  brief (style DNA + delivery contract + the why of each ask); new asks
  enqueue FIRST, manifest rows narrate.

## Path A — single asset (one creature/prop/icon from a run)

```bash
python3 scripts/deliver_asset.py --run-id <id> --manifest-id <id> \
    --kind creature [--static] [--allow-warn]
```
Gate-kept: run must be `completed`, verification PASS, GLB->FBX converted
(container blender), copied into the game repo's `Resources/models/`, ledger
row stamped in ART-MANIFEST.md. AFTER any single delivery, run the game
repo's import gate once (enforces Generic rig + looped idle/move):

```bash
cd ~/Documents/programs/games/meld
python3 tools/ingest_ray_kit.py --force-verify --no-commit   # verify + metas
```

## Path B — bulk game kit (a delivery folder with MANIFEST.json)

```bash
cd ~/Documents/programs/games/meld
python3 tools/ingest_ray_kit.py            # classify, convert, verify, log, commit
python3 tools/ingest_ray_kit.py --check    # poll: CURRENT or NEW (exit 4)
```

What it does (in order): creatures -> `Resources/models/` (fbx+glb),
icons -> `Resources/UI/icons/`, audio -> flac->ogg q5 into
`Resources/audio/{music,sfx,vo}/` (dedup via ingest-stamps.json source-sha),
driver scripts -> `Runtime/ArtLane/`, taste-call lanes (props /
experimental / humanoids — yellow gates, 20+ MB, glTFast-pending) ->
`downloaded_files/ray-gamekit-<kit>/` staging. Then, if anything changed:
headless `PhaseB.Editor.ArtKitImport.Verify` (exit != 0 aborts BEFORE
commit), a row in `docs/art-kit.md` Delivery log (manifest sha — this is
what --check compares), and one house-style git commit.

## Laws

- Never hand-copy into the game repo. If a path is missing, extend the
  script, don't bypass it.
- The verify gate is mandatory before commit — it bakes Loop Time and
  persists it into metas (Unity 6 leaves defaultClipAnimations empty at
  preprocess time; see game repo docs/error-log.md U-027).
- Staging lanes (props/experimental/humanoids) are NOT imported — operator
  taste call. Say so in the report, don't decide unilaterally.
- Idempotency is the contract: re-running on the same delivery must no-op
  (files sha-deduped, manifest sha logged). A NEW manifest sha = new work.
- Evidence or it did not happen: verify log lands in
  `docs/evidence/artkit-gamekit-v1.log` and is committed with the ingest.
