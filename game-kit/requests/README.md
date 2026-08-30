# Asset request queue

Drop one `<req-id>.yaml` into `pending/` per ask (or use any door below).
Oldest P0-first gets claimed; ONE request active machine-wide (serial GPU law);
one OPEN request per asset_id.

## Template (copy me)

```yaml
schema: meld.asset-request/v1
id: req-<YYYYMMDD-HHMMSS>-<asset_id>   # optional; auto-generated if omitted
created: <ISO timestamp>               # optional
requested_by: operator
class: props            # props|creatures|humanoids|icons|ground_textures|sprites_2d|sfx|music|vo
asset_id: my_asset      # canonical slug = Resources/models/<id> stem / AudioDirector key / icon stem
title: My asset
priority: P2            # P0 blocks-a-lane .. P3 nice-to-have
spec: |
  What to make + dimensions/scale + tri/length budget + which style family
  it joins (shared suffix + seed base). Style DNA lives in the game repo's
  ART-MANIFEST.md; palette anchor Resources/palette.png.
acceptance: {}          # optional machine-checkable asks, e.g. {tri_budget: 8000}
lane_hint: props-3d     # optional game-kit/<folder>
status: pending
history: []
```

## Easier doors (same files)

- CLI: `python3 scripts/request_asset.py --class props --asset-id my_asset --spec "..."`
- HTTP: `POST :33081/v1/assets/requests`
- MCP tool: `meld-assets` -> `submit_asset_request`

Watch progress: `python3 scripts/process_requests.py list --queue all`
