# Oracle-death import trace: what still needs `python/gateway.py`, what is serving-only

Date: 2026-09-08
Status: THINKING

> READ-ONLY survey (no file modified except this one). Method: `grep -n` over
> `python/`, `tools/`, `tests/`, `packages/`, `flows/`, `scripts/` for every
> top-level and lazy `import X` / `from X import` naming an estate module;
> line cites below are `file:line` at survey time. `python/gateway.py` is 4534
> lines. Keeper set per brief: tools keepers #1–#6 #11–#19 (minus parity_arm),
> authoring libs + SSOT decls (`melite_cards/`, `melite_models/`, `catalog.py`,
> `editor_forms.py`, `editor_runs.py`, `flow.py`, `card_requires.py`,
> `card_kinds.py`, `slot_kinds.py`, `ui_map.py`), the bridges manage runner
> (`python/manage.py` via TS subprocess rail), tools/ keepers, and the two
> capture scripts.

---

## 1. `python/gateway.py` import surface

### 1a. Top-level imports (`python/gateway.py:36-94`)

Stdlib (lines 38–55): `asyncio:38`, `base64:39`, `importlib.util:40`,
`json:41`, `os:42`, `re:43`, `signal:44`, `struct:45`, `sys:46`,
`threading:47`, `time:48`, `uuid:49`, `collections.deque:50`,
`collections.abc AsyncIterator/Awaitable/Callable/Iterable:51`,
`dataclasses dataclass/field:52`, `pathlib.Path:53`, `types.ModuleType:54`,
`typing TYPE_CHECKING/TypeVar:55`.

Third-party: `starlette.applications Starlette:57`,
`starlette.requests Request:58`, `starlette.responses Response:59`,
`starlette.websockets WebSocket:60`,
`starlette.routing Route as StarRoute, WebSocketRoute as WSRoute:61`.

Estate (the ONLY top-level estate import — everything else is lazy):
`from editor_runs import ASSET_URL_PREFIX, draft_id_ok` at `gateway.py:94`.

`TYPE_CHECKING`-only (erased at runtime): `from flow_graph import
FlowGraph, FlowNode, NodeRow:97`, `from melite_models import
CharacterPreset, Model, Provision:98`.

### 1b. LAZY imports inside functions (deduped to estate modules)

| Estate module | Lazy site(s) in `gateway.py` |
|---|---|
| `flow` | `309`, `322` (`import flow as flow_mod`, `resolve_request` arms), `1264` (Gateway start), `2754`, `2868`, `3101`, `3289` (`import flow as _flow_mod`) |
| `flow_graph` | `661` (`import flow_graph`, skeleton build), `1302`, `1720` (`import flow_graph as _pg`), `2316–2317` (`from flow_graph import FlowGraph`, `NodeRow as _NR`) |
| `melite_cards` | `422`, `512`, `767` (`from melite_cards import load_card_py`) |
| `melite_models` | `459`, `511` (`load_model_py`), `695`, `718`, `3339`, `3484` (`scan_engine_models`), `3581` (`EstimatedParams, PresetOrigin, …`), `3619` (`all_presets, read_user_presets, …`), `3640` (`AnnyBakeParams`), `3660` (`CharacterPreset, append_user_preset, …`), `3700` (`delete_user_preset, PresetLedgerError`) |
| `artifact_refs` | `621` (`find_dangling_refs`, guarded `try/except ImportError`), `865` (`ASSET_RUNS_PREFIX, ArtifactRefError, resolve_artifact_file`), `3556`, `3580` (`resolve_artifact_file, ArtifactRefError`) |
| `estate_config` | `646` (`load as _load_ecfg`, inside the card-requires block), `3387` (`model_paths as _model_paths`), `3807` (`load as _load_config`) |
| `plugins` | `955` (`import plugins as _plugin_bus`, guarded `try/except` → `None`), `4005` (`import plugins as _plugins`, compose bridge) |
| `asset_ledger` | `1405` (`import asset_ledger as _al`, queue-completion journal), `3859` (`_h_assets_index` door) |
| `catalog` | `3045`, `3050`, `3078`, `3287` (`import catalog as _cat`, discovery doors) |
| `editor_forms` | `3058`, `3063`, `3068` (`import editor_forms as _ef`, forms/kinds/form-spec doors) |
| `editor_runs` | `3015`, `3040`, `3089`, `3106`, `3112`, `3117`, `3122`, `3141`, `3149`, `3190`, `3220`, `3288`, `3408`, `3513`, `4043`, `4048` (`import editor_runs as _er`, chrome/asset/run doors) |
| `lane_disclosure` | `3290` (agent-boot door), `3880`, `3894`, `3902`, `3910`, `3919` (`_h_card_tools/_h_skills/_h_lanes/_h_skill_read/_h_lane_bundle` doors) |
| `provision_rail` | `3497` (`ProvisionRailError`, `fetch_provision` in `_fetch_provision_locked`), `3533` (same in `_h_model_provision`) |
| `manage` | `3934` (`import manage as _mg`, in-process fast path in `_h_manage:3927`), `3942` (the `-c` runner STRING `"import manage; c, r = manage.dispatch(…)"` for the subprocess fallback) |
| `comfy_mcp` | `3933` (`import comfy_mcp`, plane-availability probe; third-party/vendored, not an estate module) |
| `py.card_requires` | `637` (`from py.card_requires import check_card_requires`, guarded `try/except ImportError → pass:658-659`). NOTE: stale `py.` prefix — the repo dir is `python/`, so this ALWAYS raises `ImportError`/`ModuleNotFoundError` today and the whole card-requires gate (637–659) is dead code that silently skips. The live `card_requires` SSOT is imported directly by `tools/export_model_facts.py:132` and the walls. |

NOT imported anywhere in `gateway.py` (confirmed by grep): `mcp_door`
(reverse direction — `mcp_door` imports `gateway`), `kernel_exec`,
`kernel_manifest`, `lane_wire`, `stage_params`, `run_wire`, `form_wire`,
`card_kinds`, `card_requires` (by canonical path), `slot_kinds`, `ui_map`.

Third-party lazy: `pydantic.ValidationError` (as `_PydanticRefusal`/`_RowRefusal`:
`3584`, `3641`, `3662`), `uvicorn:4526`, stdlib `re:178`, `statistics:1884`,
`urllib.parse:2486,2502,4323,4367`, `urllib.error/request:3805-3806`,
`traceback.format_exc:2629`, `contextlib.asynccontextmanager:4496`.

Key symbols the estate reads OFF the gateway (for §3): `ValidationError:114`,
`RETIRED_RUNNER_KNOBS:230`, `resolve_request:279`, `Route:2700` (dataclass),
`_family_by_id:3480`, `ROUTES:4052`, `absolutize_artifact_refs:855`,
`resolve_inputs`, `route`, `Gateway`.

---

## 2. Per-module verdict table

"Keepers" = tools keepers (`export_card_decls`, `export_model_facts`,
`export_discovery_catalog`, `export_vocab`, `gen_tool_json`, `gen_ui_map`,
`contract_snapshot`, `author_card`, `backfill_draft_id`, `provision`,
`arch_lint`, `run_walls`) + capture scripts (`capture_chrome.py`,
`capture_assets.py`) + keeper libs. Walls/tests are NOT keepers (parity and
serving walls are rewritten/retired at Stage-B); a module imported ONLY by
`gateway.py` + walls/tests is SERVING-ONLY.

| Module | Imported by keepers? (which) | Imported only by gateway.py / parity arms? | Verdict |
|---|---|---|---|
| `python/artifact_refs.py` | NO keeper importer (only `gateway.py:621,865,3556,3580` + walls: `test_artifact_refs`, `test_hard_gates:94`, `test_gateway_studios_parity:123`, `test_flows:179,190`, `test_body_to_somax`) | YES (gateway + serving/parity walls only) | SERVING-ONLY — dies with oracle. TS validates natively (`flowsValidate.ts`); parity walls comparing against it (`test_gateway_studios_parity`) die too |
| `python/asset_ledger.py` | YES — `packages/gateway/scripts/capture_assets.py:37` (`_MESH`/`_DOC` vocab probe for `assetTables.ts` code tables) | NO (also gateway `1405,3859`, `editor_runs` comment-only, asset-route tests) | KEEP — vocab SSOT for the capture script. Follow-up option (not Stage-B): fold `_MESH`/`_DOC` into `media-kinds.json` data and re-evaluate |
| `python/card_kinds.py` | YES — `tools/export_vocab.py:51`; `python/editor_forms.py:1880` (`_ck`, `/v1/kinds` door) | NO | KEEP — SSOT decl (brief-named) |
| `python/card_requires.py` | YES — `tools/export_model_facts.py:132` (`EXTENSION_NODE_TYPES`); `packages/engines/comfyui/action_cards/3d/img_to_mesh/python/card.py` | Gateway's only reference is the dead `py.card_requires:637` string (always-ImportError, see §1b) — NOT a live dependency | KEEP — SSOT decl (brief-named); gateway deletion even removes a dead reference |
| `python/catalog.py` | YES — `tools/export_discovery_catalog.py:127`; `packages/gateway/scripts/capture_chrome.py:32` (availability import) | NO (also gateway `3045,3050,3078,3287`, `test_catalog_contract`, `test_input_accepts`) | KEEP — authoring lib (brief-named) |
| `python/editor_forms.py` | YES — `tools/export_discovery_catalog.py:128` (`forms()`, `kinds()`, `form_spec()`, `_scan_catalog`) | NO (also gateway `3058,3063,3068`, `test_form_wire`, `test_hard_gates:93`, `test_variant_group_default:100`) | KEEP — authoring lib (brief-named) |
| `python/editor_runs.py` | YES — `tools/export_discovery_catalog.py:129` (`catalog_family_ids`, `family_param_schemas`); `capture_chrome.py:33` (10 chrome doors: `health/themes/tags/services/right_panes/ui_slots/tools/shell/plugins_registry/models:34-45`); `capture_assets.py:38` (`content_type_of`, `_INPUT_IMAGE_EXTS`) | NO (also gateway `:94` top-level + 16 lazy sites, `test_run_wire`, `test_media_sidebar`) | KEEP — authoring lib (brief-named); the capture scripts' SSOT |
| `python/estate_config.py` | YES — `tools/provision.py:86` (ops rail config); `scripts/mcp_install_h3_context.py:34` | NO (also gateway `646,3387,3807`, `test_estate_config`, `test_models_on_second_drive`, `test_provision`, `test_gateway_bridges_parity:233`) | KEEP — ops-rail config SSOT (provision keeper needs it) |
| `python/flow.py` | YES — `tools/export_discovery_catalog.py:74,130` (`scan_flow_ids`, `load_flow`, `schema_snapshot`); `tools/export_vocab.py:52`; `tools/contract_snapshot.py:37` (`load_flow`); every `flows/*/flow.py` (`Flow/Stage/FromInitial/Kind…`) | NO (also gateway `309,322,1264,2754,2868,3101,3289`, `packages/engines/comfyui/compose/__init__.py:33`) | KEEP — authoring lib (brief-named). NB `flow.py` never imports gateway (says so: `flow.py:48-50` comment) — no cycle |
| `python/flow_graph.py` | YES — `python/flow.py:36` (TYPE_CHECKING) + `973` (lazy); `python/plugins.py:50` (TYPE_CHECKING) + `562,585` (lazy); `python/kernel_exec.py:37` (`NodeRow`, dying consumer) | NO | KEEP — row SSOT under keeper libs `flow`/`plugins` (gateway's `97,661,1302,1720,2316-2317` uses die, keepers' remain) |
| `python/form_wire.py` | YES — `python/editor_forms.py:70` TOP-LEVEL (`FormSpecRow` construction `1616-1619`, gate `1851-1854`); `tools/arch_lint`-adjacent walls | NO (gateway never imports it directly) | KEEP — frozen wire SSOT ridden by keeper `editor_forms` at import time |
| `python/gateway.py` | YES — `tools/export_discovery_catalog.py:131` (`_family_by_id` assert, see §3); `python/mcp_door.py:40`; `python/plugins.py:66`, `python/catalog.py:209`, `python/editor_forms.py:105` (`ValidationError` alias, all guarded — see §3) | — (is the oracle) | DELETE — the Stage-B oracle itself. §3 resolves each importer |
| `python/kernel_exec.py` | NO keeper importer (only `tests/unit/runtime/test_kernel_manifest*.py` + `vendor/retired-engines/{audio-cpp,anycreature}/compose/__init__.py:204,186` `execute_manifest`) | YES (no gateway import either — zero live serving references; header: "serves only the retiring py oracle until its final cut", `kernel_exec.py:1-22` docstring) | SERVING-ONLY — retired-engine executor; dies with oracle + already-quarantined `vendor/retired-engines/` consumers |
| `python/kernel_manifest.py` | NO keeper importer (only `kernel_exec.py:34` + `vendor/retired-engines/*/manifest.py` + kernel tests; lazy `import stage_params:161` is inward, not outward) | YES (same quarantine note as `kernel_exec`; header `kernel_manifest.py:1-26` names the quarantine) | SERVING-ONLY — dies with `kernel_exec` |
| `python/lane_disclosure.py` | NO keeper importer (only gateway `3290,3880,3894,3902,3910,3919` + tests/conftest: `tests/conftest.py:63`, `test_lane_wire`, `test_gateway_planes_parity:60`, `test_form_wire:225,319`, `test_flow_templates:120`) | YES (gateway + disclosure/parity walls only; `export_discovery_catalog` does NOT import it — TS `planes.ts:1068-1123` reads `tool.json` natively) | SERVING-ONLY — dies with oracle; TS lane surface is native (`planes.ts` readdir+readFileSync). Stage-B must also update `tests/conftest.py:63` |
| `python/lane_wire.py` | NO keeper importer (only `lane_disclosure.py:72` TOP-LEVEL + lane tests) | YES (single live consumer is the dying `lane_disclosure`) | SERVING-ONLY — cascades with `lane_disclosure`; frozen rows have no keeper reader (TS does not read them) |
| `python/manage.py` | YES — `tools/provision.py:1239` (`import manage as _mg`, manual door); TS `packages/gateway/src/doors/bridges.ts:471-485` (`manageRunner` shells `import manage; manage.dispatch(…)` over stdio — the KEEP rail, see §4) | NO (also gateway `3934` in-process + `3942` runner string, `test_manage_handlers`, `test_provision:277`) | KEEP — the bridges manage runner (EXTENSION LAW). Verified §4 |
| `python/mcp_door.py` | NO keeper importer (only `tests/unit/runtime/test_mcp_door.py:22,138`) | YES — its ONLY estate import is `gateway as gw_mod:40`, reading `ROUTES`/`Route` (see §3) | SERVING-ONLY — MCP projection of `ROUTES`; dies with the table (TS has no MCP door) |
| `python/plugins.py` | YES — `python/catalog.py:148`, `python/editor_forms.py:166,428`, `python/flow.py:976,1079,1187`, `python/lane_disclosure.py:173`, `python/melite_cards/serialize.py:94` (all keeper libs) | NO (also gateway `955,4005` lazy) | KEEP — engine broker for keeper libs. Gateway-cycle guard (`plugins.py:63-68` try/except) degrades cleanly at Stage-B, see §3 |
| `python/provision_rail.py` | NO keeper importer — `tools/provision.py` does NOT import it (own `_managed_routing`/`_fetch_verified`; the RESTATEMENT debt is documented in the header `provision_rail.py:17-21`) | YES (only gateway `3497,3533`: `_fetch_provision_locked` + `_h_model_provision` on-demand path) | SERVING-ONLY — the oracle's on-demand fetch path dies with `_h_model_provision`; keeper ops rail is `tools/provision.py` (pre-fetch), TS serves frozen `provisions` from `discovery-catalog.json` + live mount |
| `python/run_wire.py` | YES — `python/editor_runs.py:73` TOP-LEVEL (`RunRow/RunsEnvelope:604-625`, `DraftRow/DraftsEnvelope:874-881`, `validate_draft_birth:979-981`) | NO (gateway never imports it directly) | KEEP — frozen wire SSOT ridden by keeper `editor_runs` at import time |
| `python/slot_kinds.py` | YES — `tools/export_vocab.py:53`; `python/catalog.py:54,399,513,544-545` (`input_vocabulary`, slot bindings) | NO | KEEP — SSOT decl (brief-named) |
| `python/stage_params.py` | YES — `python/flow.py:809,849,977,1252` (card-schema registry); `tools/author_card.py:278,301,680` (lazy `import stage_params as sp`); `python/kernel_manifest.py:161` (dying consumer) | NO | KEEP — schema registry for keeper `flow` + keeper `author_card` |
| `python/ui_map.py` | YES — `tools/gen_ui_map.py:23` (sole import, permanent SSOT→generated); `tools/export_vocab.py:54` (read-only collision guard) | NO | KEEP (permanent) — SSOT decl (brief-named) |
| `python/melite_cards/` (`dsl`, `serialize`, `validators`) | YES — `tools/export_card_decls.py:27-29`, `tools/export_model_facts.py:138`, `tools/gen_tool_json.py:25`, `tools/export_vocab.py:55`, plus `catalog/editor_forms/editor_runs/flow/plugins` | NO | KEEP — authoring SSOT (brief-named) |
| `python/melite_models/` (`grammar`, `presets`, `refs`) | YES — `tools/export_card_decls.py:94`, `tools/export_model_facts.py:125`, `tools/export_discovery_catalog.py:132`, `tools/provision.py:72`, plus `catalog/editor_forms/editor_runs/manage/plugins/melite_cards` | NO | KEEP — authoring SSOT (brief-named) |

Summary counts: KEEP 18 (`asset_ledger`, `card_kinds`, `card_requires`,
`catalog`, `editor_forms`, `editor_runs`, `estate_config`, `flow`,
`flow_graph`, `form_wire`, `manage`, `plugins`, `run_wire`, `slot_kinds`,
`stage_params`, `ui_map`, `melite_cards`, `melite_models`) + the oracle-adjacent
note that `plugins`/`catalog`/`editor_forms` carry guarded
`from gateway import ValidationError` twins that self-heal at Stage-B (§3).
SERVING-ONLY 8 (`gateway`, `mcp_door`, `kernel_exec`, `kernel_manifest`,
`lane_disclosure`, `lane_wire`, `provision_rail`, `artifact_refs`).

---

## 3. Known gateway-importers, symbol-level

### 3a. `tools/export_discovery_catalog.py` — `gateway._family_by_id`

- Import: `import gateway as _gw` at `export_discovery_catalog.py:131`
  (inside `main()`, with `catalog:127`, `editor_forms:128`, `editor_runs:129`,
  `flow:130`, `scan_engine_models:132`).
- Use (ONLY use): line 215 —
  `assert _gw._family_by_id(fid) is not None, "provisions family %r unresolvable by the door" % fid`
  Freeze-time consistency assert: every family id in the frozen `provisions`
  table (built lines 201–210 from the already-in-hand `engine_models` walk)
  must resolve through the door's lookup.
- Definition: `gateway.py:3480` —
  `def _family_by_id(fid: str) -> "type | None"` — first `cls.id == fid` match
  over `melite_models.scan_engine_models(str(REPO)).values()` (`3484–3487`).
- Movable WITHOUT the oracle (pick one at Stage-B):
  1. (cheapest, recommended) Inline it in the exporter — the data is already in
     hand: replace the line-215 assert with a local set built from the
     lines-202–210 loop (`{getattr(cls, "id", "")}`), zero new modules.
  2. Move the 8-line helper into a keeper lib — `python/catalog.py` (scan
     neighbor) or `python/editor_runs.py` (door-logic neighbor, next to
     `catalog_family_ids`/`family_param_schemas` used at lines 189–190) — and
     import from there. `melite_models.scan_engine_models` (the only callee)
     is itself a keeper.
- After the move, the exporter imports ZERO serving modules and the TS doors
  (`discovery.ts:191,198`, `planes.ts:37`) are unaffected (they read the frozen
  `discovery-catalog.json`).

### 3b. `python/mcp_door.py` — `gateway.Route` + `gateway.ROUTES`

- Import: `import gateway as gw_mod` at `mcp_door.py:40` (UNGUARDED top-level —
  the file cannot import without the oracle; module docstring `mcp_door.py:10`
  states the derivation contract: "tool definitions DERIVE from
  gateway.ROUTES").
- Exact symbols used:
  - `gw_mod.Route` as annotation at `52` (`_slug(row: gw_mod.Route)`), `62`
    (`_tool_def(row: gw_mod.Route)`), `109` (`_build_request(row: gw_mod.Route,
    …)`); attributes read: `row.template/row.path/row.method` (`54-58`,
    `64-76`), `row.query/row.body` (`71-75`, `127-129`), `row.group/row.summary`
    (`84`), `row.handler/row.ws` (`93,96`).
  - `gw_mod.ROUTES` iterated at `92` (`catalog()`), `163` (`tool_call()` slug
    index), `246` (`dump_manifest()` `"gateway_routes": len(gw_mod.ROUTES)`).
- Defined: `Route` dataclass `gateway.py:2698-2710`; `ROUTES` tuple
  `gateway.py:4052` (+4120 rows through file end).
- Movable? NO — and nothing to move: the MCP door IS a serving projection of
  the serving table (calls proxy to the LIVE gateway over HTTP,
  `mcp_door.py:16-19`). SERVING-ONLY; dies whole with the oracle. TS has no MCP
  door. Its only importer is `tests/unit/runtime/test_mcp_door.py:22,138`
  (dies with it). Shipped manifest `dev_docs/gateway/tools.json` (`mcp_door.py:14`,
  `--dump:257-265`) becomes a frozen tombstone at Stage-B.

### 3c. `python/plugins.py` — `gateway.ValidationError`

- Import: `plugins.py:63-68` —
  ```python
  try:
      # same class as the gateway's (gateway imports us lazily, after its
      # own ValidationError is defined — the alias resolves)
      from gateway import ValidationError  # noqa: F401  (line 66)
  except Exception:
      class ValidationError(Exception): …  (lines 68+, standalone twin)
  ```
- Used (raise sites, all module-local thereafter): `253`, `413`, `426`, `433`,
  `438`, `448`, `452`, `478`, `496-518` (`500`), `532` (docstring contract),
  `549`. The gateway-side normalizer `_plugin_loud` (`gateway.py:980-990`)
  exists precisely because of this `__main__`-double-import double-class edge
  (comment `982-985`); it dies with the gateway.
- Stage-B behavior: `from gateway import ValidationError` raises
  `ModuleNotFoundError` (subclass of `Exception`) → the `except` twin
  activates AUTOMATICALLY. NO EDIT REQUIRED for correctness. Optional
  follow-up (not Stage-B): canonicalize the refusal class into one keeper home
  (e.g. `flow.py`'s or a small `errors.py`) and drop the three twins — but the
  `except Exception` shape means deletion day is a no-op for this file.

### 3d. `python/catalog.py` — `gateway.ValidationError`

- Import: `catalog.py:206-211` — same guarded shape as plugins
  (`from gateway import ValidationError  # noqa: F401` at `209`, comment
  `207-208` cites the plugins.py twin trick, fallback twin at `211+`).
- Used (raise sites): `228`, `337`, `431`, `446`, `452`, `457`.
- Stage-B behavior: identical to §3c — fallback twin activates, NO EDIT
  REQUIRED.

### 3e. `python/editor_forms.py` — `gateway.ValidationError`

- Import: `editor_forms.py:102-107` — same guarded shape
  (`from gateway import ValidationError  # noqa: F401` at `105`, comment
  `103-104`, fallback twin at `107+`).
- Used (raise sites): `153`, `173`, `178`, `182`, `187`, `192`, `207`,
  `1069`. (Other `ValidationError` hits in the file are `form_wire`'s:
  `1852-1854`, and comments `43`, `221`, `573`, `1036`, `1873`.)
- Stage-B behavior: identical to §3c — fallback twin activates, NO EDIT
  REQUIRED.

Note the asymmetry: `python/editor_runs.py` and `python/flow.py` NEVER import
gateway (flow states it explicitly, `flow.py:48-50`; editor_runs surfaces no
`gateway`/`ValidationError` import — its refusals ride `run_wire`). Only the
three §3c–3e files carry the alias, and all three are pre-armored.

---

## 4. Named-module importer checks + bridges verification

- `mcp_door` — importers: NONE in product code; only
  `tests/unit/runtime/test_mcp_door.py:22` (`import mcp_door as mc`) and `:138`
  (subprocess `python/mcp_door.py --dump`). SERVING-ONLY, dies whole.
- `plugins` — importers: keeper libs `catalog.py:148`, `editor_forms.py:166,428`,
  `flow.py:976,1079,1187`, `lane_disclosure.py:173` (dying),
  `melite_cards/serialize.py:94`; lazy gateway `955,4005`; ~15 test files.
  KEEP (broker for keepers).
- `kernel_exec` — importers: `tests/unit/runtime/test_kernel_manifest*.py`
  (3 files) + `vendor/retired-engines/{audio-cpp:204,anycreature:186}/compose/__init__.py`
  (`execute_manifest`). Gateway NEVER imports it. SERVING-ONLY.
- `kernel_manifest` — importers: `kernel_exec.py:34` (`KernelManifest`,
  `resolve_spell`) + `vendor/retired-engines/*/manifest.py` (2 files) +
  kernel tests. SERVING-ONLY.
- `lane_wire` — importers: ONLY `lane_disclosure.py:72` (top-level) + lane
  tests (`test_lane_wire.py`, `test_refusal_reasons.py:28`,
  `test_strict_wire.py` is `form_wire`/`run_wire`). SERVING-ONLY (cascades).
- `stage_params` — importers: keeper `flow.py:809,849,977,1252`, keeper
  `author_card.py:278,301,680`, dying `kernel_manifest.py:161`, stage/card
  tests. KEEP.
- `run_wire` — importers: keeper `editor_runs.py:73,979` + wire tests
  (`test_run_wire.py:38`, `test_strict_wire.py:22`, `test_refusal_reasons:29`).
  KEEP.
- `form_wire` — importers: keeper `editor_forms.py:70` + wire tests
  (`test_form_wire.py:41`, `test_strict_wire.py:21`, `test_imports.py:55`).
  KEEP.
- `provision_rail` — importers: ONLY `gateway.py:3497,3533`. (`tools/provision.py`
  deliberately does NOT import it — header debt note.) SERVING-ONLY.
- `estate_config` — importers: gateway `646,3387,3807`, keeper
  `tools/provision.py:86`, `scripts/mcp_install_h3_context.py:34`, estate tests.
  KEEP.
- `manage` — importers: gateway `3934` + `3942` (runner string),
  keeper `tools/provision.py:1239`, estate tests. KEEP.
- Is `manage.py` the bridges manage runner? YES — verified both ends:
  - PY side: `_h_manage` (`gateway.py:3927-3963`): inserts `REPO/"python"`
    (`3929-3931`), tries in-process `import comfy_mcp` + `import manage as _mg`
    → `_mg.dispatch(body_json)` (`3933-3935`), else the `-c` runner string
    `3940-3945` run under `REPO/.venv/bin/python` (`3946`) with 503/502/504
    envelopes (`3947-3963`).
  - TS side: `packages/gateway/src/doors/bridges.ts` — header `3-12` declares
    the subprocess bridge; `15-78` line-cites the py arms; `resolveManagePython`
    `447-450` (MELITE_MANAGE_PYTHON else `<repo>/.venv/bin/python`, py's exact
    default); `managePyDirs` `456-463`; `manageRunner` `471-485` emits the
    behavior-identical `"import sys, json; …; import manage;
    c, r = manage.dispatch(json.loads(sys.stdin.read())); …"` runner;
    `handleManage` `512+` mirrors the 503/passthrough/502/504 outcomes.
    The TS door NEVER imports `manage.py` in-process — it shells to base-env
    python per the EXTENSION LAW proxy pattern (ladder P6). `manage.py` MUST
    survive Stage-B or the TS manage door loses its implementation.

---

## 5. Capture scripts: TS-side freeze, no py boot

- `packages/gateway/scripts/capture_chrome.py` — does NOT boot `gateway.py`
  (no `import gateway`, no `subprocess`). Imports `catalog:32` (availability
  proof only — no symbol used) and `editor_runs as _er:33`; calls the 10 door
  functions directly (`_er.health/themes/tags/services/right_panes/ui_slots/tools/shell/plugins_registry/models`,
  `capture_chrome.py:34-45`) and emits `packages/gateway/src/doors/chrome.ts`
  (`OUT:47`) as verbatim JSON-string constants served by `ctx.ts` without
  re-serialization (docstring `1-21`). TS-relevant KEEP-adjacent; oracle deletion
  does not touch it (both its imports are keepers).
- `packages/gateway/scripts/capture_assets.py` — does NOT boot `gateway.py`
  either. Imports `asset_ledger as _al:37` (`_MESH`/`_DOC` vocab) and
  `editor_runs as _er:38` (`content_type_of`, `_INPUT_IMAGE_EXTS`); media-kind
  ext sets stay DATA (`media-kinds.json` read at request time, docstring
  `13-18`); emits `packages/gateway/src/doors/assetTables.ts` (`OUT:50`) with
  `--check` drift pin for walls (docstring `22-28`). TS-relevant KEEP-adjacent;
  this is the SOLE keeper-side consumer keeping `asset_ledger` alive (§2).

---

## 6. `tools/parity_arm.py`: no oracle coupling (brief-vs-survey conflict noted)

- Current file (104 lines) imports ONLY stdlib at top (`importlib.util, types,
  json, os, random, re, sys:10-16`, `subprocess` lazily at `69`). NO
  `import gateway`, NO `from gateway import`, NO `compose`/`flow` import.
- Its only job: load card-compose arms BY PATH —
  `packages/engines/comfyui/action_cards/<card>/python/compose.py` (`44-46`) —
  and byte-compare `arm.compose(body, model, run_id)` old-worktree
  (`/tmp/estate-head`) vs new-worktree in SEPARATE processes (`30-35`,
  `38-63`, driver diff `67-103`). It is a compose-ARM harness, not a gateway
  harness.
- Staleness note: line 42 appends `root + "/py"` to `sys.path` — the repo dir is
  `python/`, so that entry is dead text (harmless: `compose.py` arms resolve
  their own path); line 18 hardcodes `REPO = "…/inference.cpp"`.
- CONFLICT: the task brief says "parity_arm.py is NOT keeper — it dies with the
  oracle", but `dev_docs/design/generators-port-survey-2026-09-08.md` §0 #17 verdicts
  it KEEP ("byte-compare harness the §3 dual-maintenance rule reuses;
  subject-era retired, tool generic"). DEPENDENCY FACT: deleting `gateway.py`
  cannot break `parity_arm.py` (zero import edge either direction) — retention
  vs deletion is a POLICY call, not a dependency requirement. Recommend: keep the
  file but mark its SUBJECT (old/new `compose.py` arm pair) retired; delete only
  if the estate retires compose-arm parity as a practice.

---

## 7. Recommended Stage-B lists

### 7a. DEATH LIST (delete at Stage-B) — 8 modules + harness + serving tests

1. `python/gateway.py` — the oracle (4534 lines). Preconditions: §3a helper
   relocated (or inlined) for `export_discovery_catalog.py:215`; TS doors own
   all traffic (ladder P-cuts landed).
2. `python/mcp_door.py` — sole reader of `ROUTES`/`Route` (§3b); tombstone
   `dev_docs/gateway/tools.json` (stop regenerating).
3. `python/kernel_exec.py` + 4. `python/kernel_manifest.py` — retired-engine
   pair, zero live importers outside `vendor/retired-engines/` (already
   quarantined) and their own unit tests (delete/retire
   `test_kernel_manifest.py`, `test_kernel_manifest_audio.py`,
   `test_kernel_manifest_forge.py` legs that boot them).
4. `python/lane_disclosure.py` + 6. `python/lane_wire.py` — serving lane
   surface; TS `planes.ts` native. Update `tests/conftest.py:63`
   (`import lane_disclosure as _ld`).
5. `python/provision_rail.py` — oracle on-demand path only; keeper rail is
   `tools/provision.py`.
6. `python/artifact_refs.py` — gateway-only validation; TS validates natively.
   Retire its parity consumers (`test_artifact_refs.py`,
   `test_gateway_studios_parity.py:121-123`, `test_hard_gates.py:93-94` legs).
7. `tools/parity_arm.py` — POLICY-DEPENDENT (see §6; no dependency blocker
   either way; brief says delete, survey §0 #17 says keep-generic).
8. Serving/walls tests that `import gateway` (~40 files: all
   `tests/walls/suites/test_gateway_*`, `test_py_gateway.py`,
   `test_sidecar_witness.py`, `test_strict_body.py`, `test_streaming.py`,
   `test_output_contract.py`, `test_flow_branch.py`, `test_body_to_somax.py`,
   `test_wire_surface.py`, `test_routes_mirror.py`, `test_doc_truth.py`,
   `test_channel_resolution.py`, `test_gateway_doors.py`, plus `tests/unit/runtime/test_*`
   gateway boots and `tests/dev_dsh/test_dev_dsh_api_contract.py:224`) —
   retire or repoint at TS per the flip-readiness plan
   (`dev_docs/design/flip-readiness-2026-09-07.md:125`).

### 7b. KEEPER LIST (must survive Stage-B) — 18 modules + packages + tools + captures

- Authoring libs + SSOT decls (brief-named, verified keeper importers above):
  `python/melite_cards/`, `python/melite_models/`, `python/catalog.py`,
  `python/editor_forms.py`, `python/editor_runs.py`, `python/flow.py`,
  `python/card_requires.py`, `python/card_kinds.py`, `python/slot_kinds.py`,
  `python/ui_map.py`.
- Structural keepers (keeper-lib dependencies, §2): `python/flow_graph.py`
  (under `flow`/`plugins`), `python/form_wire.py` (under `editor_forms`),
  `python/run_wire.py` (under `editor_runs`), `python/stage_params.py` (under
  `flow` + `author_card`), `python/plugins.py` (broker for keeper libs),
  `python/estate_config.py` (under keeper `provision`), `python/manage.py`
  (bridges runner + keeper `provision`), `python/asset_ledger.py` (under
  `capture_assets.py`).
- Tools keepers (unchanged): `export_card_decls`, `export_model_facts`,
  `export_discovery_catalog` (after §3a fix), `export_vocab`, `gen_tool_json`,
  `gen_ui_map`, `contract_snapshot`, `author_card`, `backfill_draft_id`
  (stdlib-only, spent), `provision`, `arch_lint`, `run_walls`.
- Capture scripts (TS-relevant, gateway-independent, §5): `capture_chrome.py`,
  `capture_assets.py`.

### 7c. Stage-B preconditions (ordered)

1. Relocate `_family_by_id` for the discovery exporter (§3a, option 1 or 2) and
   re-run the exporter byte-clean (`test_gateway_discovery_parity.py` regen leg).
2. Confirm NO remaining `import gateway` / `from gateway import` outside the
   death list + serving tests (today: `tools/arch_lint.py:123` mentions the
   pattern only as lint text; `gateway.py:982` is the self-comment).
3. Delete §7a modules; run keeper generators (`export_*`, `gen_*`,
   `contract_snapshot --check`-class legs, `capture_*.py --check`) + keeper
   walls (`test_catalog_contract`, `test_form_wire`, `test_run_wire`,
   `test_imports`, `test_provision`, `test_manage_handlers`,
   `test_estate_config`, card/model/unit suites) GREEN.
4. Decide `parity_arm.py` by policy (§6), not by dependency.
