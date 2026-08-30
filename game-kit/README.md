# game-kit — the asset wave system

Every asset class is a FOLDER: `SKILL.md` (the law) + lane YAMLs + any
CPU post-process tool. One registry, one driver, one sync. No ad-hoc
scripts, no /tmp launchers, no flat dumps.

```
game-kit/
  kit.py            THE driver — list / validate / sync / run / status
  registry.yaml     asset-class index: folder, seed band, budget, gate, output
  sync.sh           deploy lanes -> data/pipelines/ + skills -> ~/.dsh/skills
  serial_runner.py  (legacy: use kit.py run — kept for reference)
  props-3d/         static 3D props        (7xxx seeds, <=5k/8k faces)
  creatures-forge/  animated creatures     (breed loop, U-027 loops)
  races/            humanoids              (base + morphs + attachments)
  icons-ui/         UI item icons          (3xx seeds, style families)
  ground-textures/  tileable terrain       (4xx seeds, make_tiling.py)
  sprites-2d/       2D/2.5D sprite sheets   (6xx seeds, pack_sprites.py)
  sfx/              sound effects          (moss-sfx, one event per call)
  music/            structured tracks      (music3, three-section captions)
  vo/               character voice        (qwen3-tts, persona DNA)
  vision-gate/      the gating protocol    (shared skill)
  unity-delivery/   the ingest gate law    (meld repo, manual copying banned)
```

## The agent workflow (ALL of it)

```bash
python3 game-kit/kit.py list                 # what exists
python3 game-kit/kit.py run <lane> [...]     # SERIAL execution, exit carries verdict
python3 game-kit/kit.py status [run_id]      # where things stand
```

Adding a wave = folder + SKILL.md + lane YAML (+ CPU tool if needed) +
registry.yaml row + DEPLOY_DIRS entry in kit.py + sync.sh glob. That is
the entire checklist; the gateway/cards/families do not change.

## Laws (encoded in kit.py — fix there, never work around)

1. **Serial GPU.** `kit.py run` never fires two lanes at once (LANE-GOTCHAS #7).
2. **Validate or don't deploy.** `kit.py sync` deploys, validates each
   lane against the live gateway, and PULLS BACK invalid ones.
3. **One door.** No /tmp launchers, no bespoke fire scripts — the driver
   is the only way waves start.
4. **Every class gated.** vision/budget/alpha gates per registry row;
   retry-once; delivery only through the ingest gate (meld repo).
5. **Seed bands are class property** (registry.yaml) — never cross bands.

Post-process tools live WITH their class (`make_tiling.py`,
`pack_sprites.py`) — CPU-only, deterministic, no GPU work outside
ComfyUI.
