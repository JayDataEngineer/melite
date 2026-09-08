"""META GATES — tripwires that prove the gates can refuse and the walls bite.

Every compile-time incident in this estate had the same shape: a gate
that could no longer say no, with green walls above it. The empty
envelope deferred ALWAYS (decorative). The spread-merge resurrected
nulls AFTER the gate passed (false confidence). The card-derived
envelope agreed with the card TRIVIALLY (conflation). Each time we
passed ALL tests and still got errors — because nothing tested the
testers.

Three parts:

A. CANARY — every lane door refuses the three classic lies
   (explicit-null numeric, unknown key, garbage/wrong-typed value).
   test_card_param_gates pins each gate's full contract; the canary
   is the smoke alarm over ALL doors at once. If any door ever
   degrades to pass-through, exactly one canary dies naming it.

B. WALL BITES — forged-mutation probes against test_compose_gates'
   REAL helpers (imported, not re-implemented — the meta-test watches
   the wall, so it drives the wall's own machinery). Break a card
   default in a temp copy and show the knob wall's predicate FIRES;
   rename a knob and show the surface wall's predicate FIRES; show the
   served envelope carries the SCHEMA row's seed (0), not the card's
   (-1) — behavioral proof the derivation source is the row. A wall
   that passes on forged-bad input is decorative.

C. LEDGER — every docs/design record that names a `test_*` wall must
   name one that EXISTS (as a def or a test module). The 2026-09-06
   probe found `test_default_engine_is_the_sellable_lane` dangling
   (renamed to `test_estimate_verb_is_commercial_only`, doc repaired
   in this stroke) — a record pointing at a ghost wall is a tripwire
   connected to nothing.

Design record: docs/design/frontend-impossible-nulls.md (meta-tests
appendix)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from _anchor import REPO

CARDS = REPO / "packages/engines/comfyui/action_cards"


# ── Part A: the canary (subjects absent — tombstoned) ──────────

# Lane → (strict-null-refusing numeric, minimal valid params). KEPT
# as the restoration pointer: the three canary legs below drove the
# py schema.py doors (explicit-null refusal, extra='forbid',
# garbage/wrong-type refusal). The subjects were already absent at
# purge S-decls (no schema.py anywhere under action_cards/ — the
# legs errored FileNotFound, pre-existing red). If S-flows restores
# py schema doors, restore the three legs around this census.
CANARY = {
    "audio/music": ("duration", {"prompt": "song"}),
    "image/image-edit": ("steps", {"prompt": "hat",
                                   "image1": "x.png"}),
    "image/image-gen": ("steps", {"prompt": "a cat"}),
    "video/video-gen": ("pose_strength", {"prompt": "clip"}),
}


def test_canary_subjects_absent_legs_stay_retired() -> None:
    """The three canary legs (null/garbage/unknown-key refusal on the
    py schema.py doors) died with their subjects — no schema.py
    exists under action_cards/. A canary that cannot load its door
    is decorative; if a subject reappears this tombstone fails and
    the legs come back around CANARY above."""
    present = [(CARDS / card / "python" / "schema.py").as_posix()
               for card in CANARY
               if (CARDS / card / "python" / "schema.py").is_file()]
    assert not present, \
        "schema.py door(s) restored — restore the canary legs: %r" \
        % present


# ── Part B: the walls bite ────────────────────────────────────────

def test_card_schema_forge_legs_retired_with_card_py() -> None:
    """Retired 2026-09-08 purge S-decls: the three card.py-forge legs
    (bites_forged_default, sides_come_from_different_files,
    bites_renamed_knob) proved the PY knob/surface walls bit on the
    card.py-vs-schema.py duality. card.py is deleted — the duality
    has no two sides (the TS registry is the single declaration; the
    admission gate + compose goldens own the surface now). A wall
    that forges a deleted file is decorative."""
    card_py = (CARDS / "audio/music/python/card.py")
    assert not card_py.is_file(), \
        "card.py reappeared — the forge legs stay retired"
    assert not (REPO / "tools" / "export_card_decls.py").is_file(), \
        "exporter reappeared — the forge legs stay retired"


def test_served_envelope_derivation_duality_retired() -> None:
    """Retired 2026-09-08 purge S-decls: the served-envelope leg
    proved the envelope carried the schema ROW's seed default (0),
    not the card's (-1 sentinel) — via editor_runs._family_surface_props,
    which loads the card class. card.py is deleted, so the duality
    has no card side (the loader raises on the missing file). The
    live successors: the compose goldens (a wrong default changes
    graph bytes) + the G3 frozen snapshot shape. A revert to
    card.py derivation is unexpressible — there is no card.py."""
    assert not (CARDS / "audio/music/python/card.py").is_file(), \
        "card.py reappeared — restore the derivation-duality leg"


# ── Part C: the ledger ────────────────────────────────────────────

def _live_wall_names() -> set[str]:
    names = set()
    for p in Path(REPO, "tests").rglob("*.py"):
        if p.name == "__init__.py":
            continue
        if p.stem.startswith("test_"):
            names.add(p.stem)  # the module itself is a citable wall
        try:
            src = p.read_text(errors="replace")
        except OSError:
            continue
        names.update(re.findall(r"^def (test_[A-Za-z0-9_]+)\(", src,
                                re.M))
        # METHOD walls (2026-09-06): unittest TestCase methods are as
        # citable as module functions — the one-mesh + source-pin
        # records named class methods (test_one_mesh_no_second_scene,
        # test_source_photo_pin_survives_reload) and read as ghosts
        # because the ledger only matched column-0 defs. An indented
        # def is a wall.
        names.update(re.findall(r"^[ \t]+def (test_[A-Za-z0-9_]+)\(",
                                src, re.M))
    return names


def test_design_records_name_live_walls() -> None:
    """DOCUMENTATION LAW's mirror: a record that names a `test_*`
    wall must name one that EXISTS (def or test module). Found
    2026-09-06 with `test_default_engine_is_the_sellable_lane`
    dangling (renamed — doc repaired); a record pointing at a ghost
    wall is a tripwire connected to nothing."""
    docs = sorted(Path(REPO, "docs/design").glob("*.md"))
    assert docs, "no design records — the ledger has nothing to guard"
    live = _live_wall_names()
    dangling: dict[str, list[str]] = {}
    for d in docs:
        try:
            text = d.read_text(errors="replace")
        except OSError:
            continue
        for name in sorted(set(re.findall(r"`(test_[A-Za-z0-9_]+)`",
                                           text))):
            if name not in live:
                dangling.setdefault(d.name, []).append(name)
    assert not dangling, (
        "design records naming ghost walls (rename the ref or land "
        "the wall): %r" % dangling)


# ── Part C2: the file ledger ────────────────────────────────────────
# Every backticked file path in docs/ must resolve (bare basenames
# are context-relative by convention and must exist SOMEWHERE;
# pathed refs resolve at the repo root). Upstream-checkout, home,
# and runtime-state prefixes are environment, not contract:
_DOC_EXTERNAL = ("comfy/", "comfy_api/", "comfy_extras/", ".dsh/",
                 "data/")
_DOC_TOKEN_RE = re.compile(
    r"`([A-Za-z0-9_./-]+\.(?:py|json|tsx?|ts|yaml|md|toml))`")

DOC_GHOSTS: dict[str, dict[str, str]] = {
    # (2026-09-07 hardening sweep — each ghost is either a historical
    # journal reference (the record's own subject: a deletion or a
    # same-day run report) or parked uncommitted WIP)
    "docs/audits/media-sidebar-audit.md": {
        "src/client/__tests__/panels.test.tsx": "parked-wip",
        "src/index.ts": "parked-wip",
    },
    # mono-app M2 names the PLANNED DSL module — lands with that
    # stroke; the ledger entry retires when ui/studio.py exists
    "docs/design/python-mono-app.md": {
        "ui/studio.py": "planned-m2-dsl",
    },
    "docs/design/image-edit-surface-standard.md": {
        ".d/causes.md": "past",
        "presets/blue_mesh.yaml": "deleted-in-record",
    },
    "docs/design/one-contract-compose.md": {
        "co_script/emit.py": "retired-with-compose-move",
    },
    "docs/design/parameter-surface.md": {
        "infer-daisy-studio/e2e/test_live.py": "past-run-journal",
        "python/card.py": "past-run-journal",
    },
    "docs/audits/bootstrap-audit.md": {
        "PIN.md": "past",
        "config/comfyui/extra_model_paths.yaml": "past",
        "dev_bootstrap_comfyui.py": "past",
        "h3-timeline/model.yaml": "past",
        "infra/comfyui/stage/extra_model_paths.yaml": "past",
        "model.yaml": "past",
        "model_manifest.py": "past",
        "packages/MIGRATION.md": "past",
        "packages/comfyui/nodes.yaml": "past",
        "packages/comfyui/nodes/extensions.yaml": "past",
        "packages/gens/nodes/extensions.yaml": "past",
        "packages/melite-manager/manager/extra_model_paths.yaml": "past",
        "setup_comfyui.py": "past",
        "sync_local_comfyui.py": "past",
    },
    "docs/audits/dsh-plugin-consolidation.md": {
        "packages/melite-video/cards/video_timeline/component.tsx": "past",
    },
    "docs/audits/queue-audit.md": {
        "flows/_gap1_probe/flow.py": "past",
    },
    "docs/cards/knobs.md": {
        "card_knobs.yaml": "rot",
    },
    "docs/comfyui/comfy-mcp.md": {
        "comfyui-extra-paths.yaml": "rot",
        "extensions.yaml": "rot",
        "infra/docker/dev_bootstrap_comfyui.py": "rot",
        "mcp_asset_server.py": "rot",
    },
    "docs/comfyui/estate-provenance-audit.md": {
        "h3-timeline/nodes.yaml": "past",
        "h3_chain.py": "past",
        "h3_song_audio_context.py": "past",
        "melite-h3-motion-nodes/h3_seam_nodes.py": "past",
    },
    "docs/comfyui/execution.md": {
        "packages/engines/comfyui/nodes.yaml": "rot",
    },
    "docs/comfyui/plaguekind-1to1.md": {
        "tools/plaguekind_parity.py": "past",
    },
    "docs/comfyui/plaguekind-node-migration-cost.md": {
        "card_knobs.yaml": "past",
        "h3_chain.py": "past",
        "h3_seam_nodes.py": "past",
        # deleted 2026-09-07 (KnobRow flip stroke): the fossil audit
        # tool read the extinct card_knobs.yaml against pre-reorg
        # paths — the live audit is test_cpp_engines TestKnobSSOT
        "tools/layer_audit.py": "deleted-in-record",
        "melite-h3-motion-nodes/h3_seam_nodes.py": "past",
        "tests/test_v7_knobs.py": "past",
        "window1_load.json": "past",
        "window1_t4_audio.json": "past",
    },
    "docs/design/anny-base-body.md": {
        "python/card.py": "rot",
        "python/compose.py": "rot",
        "python/renderer.py": "rot",
        "python/schema.py": "rot",
    },
    "docs/design/anny-native-viewport.md": {
        "soma/assets.py": "rot",
    },
    "docs/design/commercial-estimator-chain.md": {
        "soma/body/soma.py": "rot",
    },
    "docs/design/doc-rot-ledger.md": {
        "card_knobs.yaml": "past",
        "flow.yaml": "past",
        "image-edit/python/schema.py": "past",
        "models/3d/anny/model.py": "past",
        "nope_nothing_here.py": "past",
    },
    "docs/design/image-edit-button-mods-runtime-loras.md": {
        "ModGroupSections.tsx": "rot",
        "image-edit/tool.json": "rot",
    },
    "docs/design/mod-recipes.md": {
        "_krea-2-raw.json": "rot",
    },
    "docs/design/progress-streaming.md": {
        "compose/co_script/mcp.py": "rot",
    },
    "docs/design/studio-shell.md": {
        "video/h3-timeline/ui/package.json": "rot",
    },
    "docs/design/validated-row-gates.md": {
        "python/compose.py": "rot",
        "python/schema.py": "rot",
    },
    "docs/design/web-registry.md": {
        "ui/studio/component.tsx": "rot",
    },
    "docs/gateway/endpoints.md": {
        "flow.yaml": "rot",
    },
    "docs/glossary/operator-laws.md": {
        "card_knobs.yaml": "rot",
    },
    "docs/index.md": {
        "card_knobs.yaml": "rot",
    },
    "docs/plans/card-first-render.md": {
        "action_cards/audio/music/music.py": "past",
        "action_cards/video/h3-timeline/emit.py": "past",
        "pipeline-card.test.tsx": "past",
    },
    "docs/plans/comfy-script-meeting-point.md": {
        "comfy.yaml": "past",
        "docs/design/video-families.md": "past",
        "modifiers.py": "past",
        "video_timeline.py": "past",
    },
    "docs/plans/comfyui-consolidation-plan.md": {
        "anny_phenotype_map.yaml": "past",
        "packages/melite-manager/manager/extra_model_paths.yaml": "past",
    },
    "docs/plans/cpp-engines.md": {
        "card_knobs.yaml": "past",
        "plugin.yaml": "past",
    },
    "docs/plans/orchestrator-migration.md": {
        "compose/main.py": "past",
    },
    "docs/plans/python-action-cards.md": {
        "card.yaml": "past",
        "card_knobs.yaml": "past",
        "melite-core/_shared.yaml": "past",
        "packages/agent/dsh/melite-core/models/field_options.yaml": "past",
    },
    "docs/plans/root-config-gap-fix.md": {
        "python/__init__.py": "past",
    },
    "docs/plans/typed-step-docs.md": {
        "tests/test_co_script_parity_cards.py": "past",
    },
    "docs/packages/card-compose.md": {
        "card_knobs.yaml": "rot",
        "python/timeline/compile.py": "rot",
    },
    "docs/packages/catalog.md": {
        "card.yaml": "rot",
        "grading_rubric.yaml": "rot",
        "inference.yaml": "rot",
        "mod.yaml": "rot",
        "model.yaml": "rot",
        "preset.yaml": "rot",
        "variant.yaml": "rot",
    },
    "docs/packages/registry.md": {
        "compose/__init__.py": "rot",
        "nodes/extensions.yaml": "rot",
    },
    "docs/queue/card-stage-typing.md": {
        "python/schema.py": "rot",
    },
    "docs/queue/flows.md": {
        "FlowsPane.tsx": "rot",
        "flow.yaml": "rot",
    },
    "docs/research/trellis2-native-method-case-study.md": {
        "anny_identity_space.json": "past",
        "anny_shape_basis_names.json": "past",
        "dequant.py": "past",
        "docs/model_manager.md": "past",
        "flow.yaml": "past",
        "flows/creature-flow/flow.yaml": "past",
        "flows/humanoid-flow/flow.yaml": "past",
        "flows/prop-flow/flow.yaml": "past",
        "form_3d_autoremesher.yaml": "past",
        "form_3d_pixal3d.builder.ts": "past",
        "form_motion_kimodo.yaml": "past",
        "kimodo_retarget_fbx.py": "past",
        "mesh3d/postprocess/remesh.py": "past",
        "model.yaml": "past",
        "pixal3d_native.ts": "past",
        "packages/anny/cards/body/card.yaml": "past",
        "packages/comfyui/models/3d/trellis2-native/model.yaml": "past",
        "packages/comfyui/nodes/extensions.yaml": "past",
        "packages/kimodo/cards/motion-gen/card.yaml": "past",
        "packages/melite-3d/cards/3d/form_3d_autoremesher.yaml": "past",
        "packages/melite-3d/families/autoremesher.ts": "past",
        "packages/melite-3d/families/trellis2_native.ts": "past",
        "packages/melite-3d/graph/form_3d_trellis2_native.builder.ts": "past",
        "packages/melite-3d/models/3d/autoremesher/model.yaml": "past",
        "packages/melite-motion/cards/motion_kimodo/form_motion_kimodo.yaml": "past",
        "packages/melite-motion/graph/form_motion_kimodo.builder.ts": "past",
        "presets/prop.yaml": "past",
        "tts_audio_suite_engines.yaml": "past",
        "variants/1024/variant.yaml": "past",
    },
    "docs/testing/chaos-tests.md": {
        "tests/test_queue_chaos.py": "rot",
    },
    "docs/wiki.md": {
        "kick_queue_consumer.py": "rot",
        "packages/comfyui/cards/video_timeline/form_video_timeline.yaml": "rot",
        "packages/comfyui/models/video/h3-timeline/card_knobs.yaml": "rot",
    },
    # (2026-09-08 purge S-decls — the card.py/exporter/snapshot
    # deletion. "deleted-in-record" where the doc IS the deletion
    # record; "past" where a completed record names the machinery
    # as live. The py/card.py + plugins/*/py/card.py refs died
    # earlier (py/ -> python/ rename) — accounted here as found.)
    "docs/design/python-purge-2026-09-08.md": {
        "card-decls.json": "deleted-in-record",
        "py/card.py": "deleted-in-record",
        "tools/export_card_decls.py": "deleted-in-record",
        # (2026-09-08 purge S-facts — the model-facts exporter
        # deletion; same dispositions, this doc is the record.)
        "tools/export_model_facts.py": "deleted-in-record",
    },
    "docs/design/ts-migration-ladder-2026-09-07.md": {
        "card-decls.json": "past",
        "export_card_decls.py": "past",
        "tools/export_card_decls.py": "past",
    },
    "docs/design/card-lane-port-survey-2026-09-08.md": {
        "card-decls.json": "past",
    },
    "docs/design/generators-port-survey-2026-09-08.md": {
        "card-decls.json": "past",
        "packages/engines/comfyui/cordis/data/card-decls.json": "past",
        "tools/export_card_decls.py": "past",
        # (2026-09-08 purge S-facts — the survey's #2 row names the
        # facts exporter as live; completed record, historic ref.)
        "tools/export_model_facts.py": "past",
    },
    "docs/design/cpp-node-cutover-quad-remesh-2026-09-07.md": {
        "card-decls.json": "past",
        "tools/export_card_decls.py": "past",
    },
    "docs/design/anny-base-body.md": {
        "py/card.py": "past",
    },
    "docs/design/cordis-compose-runtime-2026-09-07.md": {
        "py/card.py": "past",
    },
    "docs/design/parameter-surface.md": {
        "py/card.py": "past",
    },
    "docs/design/image-edit-surface-standard.md": {
        "plugins/engines/comfyui/action_cards/image/tagger/py/card.py": "past",
        "plugins/engines/comfyui/action_cards/image/upscale-tools/py/card.py": "past",
    },
}


def _doc_ghost_refs(text: str, doc: Path) -> set[str]:
    """Backticked file refs in one doc that resolve NOWHERE."""
    ghosts = set()
    for tok in set(_DOC_TOKEN_RE.findall(text)):
        if "/" not in tok:
            # Bare basenames are context-relative by convention
            # ("the lane's schema.py") — a ghost only when the name
            # exists NOWHERE in the tree.
            if tok not in _tree_basenames():
                ghosts.add(tok)
            continue
        if ".." in tok:
            try:
                ok = (doc.parent / tok).resolve().exists()
            except Exception:
                ok = False
            if not ok:
                ghosts.add(tok)
            continue
        if tok.startswith(_DOC_EXTERNAL) or (REPO / tok).exists():
            continue
        ghosts.add(tok)
    return ghosts


_TREE_BASENAMES: set[str] = set()


def _tree_basenames() -> set[str]:
    if not _TREE_BASENAMES:
        for p in Path(REPO).rglob("*"):
            if p.is_file():
                _TREE_BASENAMES.add(p.name)
    return _TREE_BASENAMES


def test_docs_name_live_files() -> None:
    """The doc-rot ledger (2026-09-06 audit: 113 docs, 30 refs
    repaired in this stroke — pre-reorg path prefixes repointed at
    verified targets). Two dispositions per ref: `past` (the record's
    subject IS the retired world — audits of deleted systems,
    completed-migration plans; correct-in-context, permanent) and
    `rot` (a live record naming a dead thing — its owner rewords).
    Bidirectional like every burn-down list here: an unlisted ghost
    fails, and a listed ref that RESOLVES again fails (repaired —
    delete the entry)."""
    docs = sorted(Path(REPO, "docs").rglob("*.md"))
    assert docs, "no docs — the ledger has nothing to guard"
    unlisted: dict[str, list[str]] = {}
    for d in docs:
        rel = str(d.relative_to(REPO))
        try:
            ghosts = _doc_ghost_refs(d.read_text(errors="replace"), d)
        except OSError:
            continue
        known = set(DOC_GHOSTS.get(rel, {}))
        for g in sorted(ghosts - known):
            unlisted.setdefault(rel, []).append(g)
    assert not unlisted, (
        "docs naming files that exist nowhere (repoint the ref if "
        "the file moved, reword if the thing is gone, or ledger it "
        "with a disposition): %r" % unlisted)
    stale: dict[str, list[str]] = {}
    for rel, refs in sorted(DOC_GHOSTS.items()):
        p = REPO / rel
        if not p.is_file():
            stale.setdefault(rel, []).append("<record gone>")
            continue
        try:
            ghosts = _doc_ghost_refs(p.read_text(errors="replace"), p)
        except OSError:
            continue
        for r in sorted(set(refs) - ghosts):
            stale.setdefault(rel, []).append(r)
    assert not stale, (
        "ledger entries that resolve again (repaired — delete the "
        "entry): %r" % stale)
