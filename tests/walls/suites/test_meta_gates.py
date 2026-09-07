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

import importlib.util
import inspect
import os
import re
import shutil
import sys
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType

import pytest
from pydantic import ValidationError

from _anchor import REPO

sys.path.insert(0, os.path.join(str(REPO), "py"))
from melite_cards import load_card_py  # noqa: E402 — pre-imported so the
                                        # module-evicting fixture below
                                        # never unloads estate loaders

import test_compose_gates as walls  # noqa: E402 — the meta-test drives
                                    # the wall's OWN helpers


from contextlib import contextmanager


@contextmanager
def _evict_collisions(engine: str, forged_card_py: str,
                      forged_model_dir: str) -> Iterator[None]:
    """The estate loaders key modules by lane identity, not path: the
    model loader REFUSES a second path under one key (two-paths-one-
    key ModelError) and the card loader silently returns the FIRST
    class cached under the key (stale hit). A forgery must therefore
    save + evict the REAL lane's keys, run, evict its own
    registrations, and restore the saved objects (same objects, no
    re-exec — the process world is exactly as found)."""
    from melite_cards.serialize import _module_name
    keys = ["plugin_models.%s.%s" % (
                engine, os.path.basename(forged_model_dir)),
            _module_name(engine, os.path.dirname(forged_card_py))]
    saved = {k: sys.modules[k] for k in keys if k in sys.modules}
    for k in saved:
        del sys.modules[k]
    before = set(sys.modules)
    try:
        yield
    finally:
        for k in [k for k in sys.modules if k not in before]:
            del sys.modules[k]
        sys.modules.update(saved)

CARDS = REPO / "plugins/engines/comfyui/action_cards"


# ── Part A: the canary ────────────────────────────────────────────

# Lane → (strict-null-refusing numeric, minimal valid params). The
# numeric MUST be one the row refuses as explicit null (the
# required_positive/present class — omit-to-default, never null).
CANARY = {
    "audio/music": ("duration", {"prompt": "song"}),
    "image/image-edit": ("steps", {"prompt": "hat",
                                   "image1": "x.png"}),
    "image/image-gen": ("steps", {"prompt": "a cat"}),
    "video/video-gen": ("pose_strength", {"prompt": "clip"}),
}


def _canary_schema_mod(card: str) -> ModuleType:
    p = CARDS / card / "py" / "schema.py"
    name = "canary_" + card.replace("/", "_")
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, str(p))
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_canary_explicit_numeric_null_refuses() -> None:
    """The operator's incident, per door: a stated null on a
    defaulted numeric MUST refuse (absent rides the default; null is
    garbage). If any door admits it, the frontend strip rule has no
    backstop and untouched knobs 400 again."""
    dead = []
    for card, (num, minimal) in sorted(CANARY.items()):
        mod = _canary_schema_mod(card)
        try:
            mod.parse_card({"params": dict(minimal, **{num: None})})
        except ValidationError:
            continue
        dead.append(card)
    assert not dead, (
        "doors admitting explicit numeric null (the music3 incident "
        "returns): %r" % dead)


def test_canary_unknown_key_refuses() -> None:
    """extra='forbid' must hold on every door — an unknown key that
    slides through renders at defaults (GPU cycles on wrong params,
    zero errors: the silent-garbage class)."""
    dead = []
    for card, (_num, minimal) in sorted(CANARY.items()):
        mod = _canary_schema_mod(card)
        try:
            mod.parse_card({"params": dict(minimal,
                                            __dead_rider__=1)})
        except ValidationError as e:
            if "extra_forbidden" in str(e.errors()):
                continue
            dead.append("%s (wrong refusal: %s)" % (card, e.errors()))
            continue
        dead.append("%s (admitted)" % card)
    assert not dead, "doors not forbidding unknown keys: %r" % dead


def test_canary_garbage_and_wrong_types_refuse() -> None:
    """`steps: 'later'` and `prompt: {object}` must refuse LOUDLY on
    every door — never silently re-default, never accept."""
    dead = []
    for card, (num, minimal) in sorted(CANARY.items()):
        mod = _canary_schema_mod(card)
        for lie in ({num: "later"}, {"prompt": {"object": True}}):
            try:
                mod.parse_card({"params": dict(minimal, **lie)})
            except ValidationError:
                continue
            dead.append("%s admits %r" % (card, lie))
    assert not dead, "doors admitting garbage: %r" % dead


# ── Part B: the walls bite ────────────────────────────────────────

def _forged_music_card(tmp_path: Path, old: str, new: str) -> tuple[str, str]:
    """A temp card copy the estate loader can actually load: the card
    resolves its boarded model via __file__ (../../../.. + models/),
    so the forgery mirrors the repo layout (action_cards + the
    boarded model dir), with ONLY card.py mutated."""
    root = tmp_path / "forge"
    dst = root / "plugins/engines/comfyui/action_cards/audio/music/py"
    dst.mkdir(parents=True)
    src = CARDS / "audio/music/py"
    shutil.copy(src / "schema.py", dst / "schema.py")
    text = (src / "card.py").read_text()
    assert old in text, "forge anchor moved — repair the probe"
    (dst / "card.py").write_text(text.replace(old, new, 1))
    msrc = REPO / ("plugins/engines/comfyui/models/audio/music3")
    mdst = root / "plugins/engines/comfyui/models/audio/music3"
    shutil.copytree(msrc, mdst)
    sys.path.insert(0, os.path.join(str(REPO), "py"))
    return str(dst / "card.py"), str(mdst)


def test_knob_wall_bites_forged_default(tmp_path: Path) -> None:
    """Forge duration 30 → 31 in a temp card copy (pristine sibling
    schema): the knob wall's predicate (card default == lane
    default) must come out FALSE — i.e. the wall WOULD fire. A wall
    that still passes on this input is decorative."""
    forged_py, forged_model = _forged_music_card(
        tmp_path, "default=30,", "default=31,")
    with _evict_collisions("comfyui", forged_py, forged_model):
        row = walls._wall_schema_row(forged_py)
        assert row is not None, "wall resolver lost the forged lane"
        card_cls = load_card_py(forged_py, "comfyui")
    forged = next(f.default for f in card_cls._fields_
                  if f.name == "duration")
    lane = row.model_fields["duration"].get_default(
        call_default_factory=True)
    assert (forged, lane) == (31, 30), (
        "forge did not take: card=%r lane=%r" % (forged, lane))
    assert forged != lane, (
        "KNOB WALL IS BLIND: forged card default 31 == lane 30 "
        "passed the wall predicate")


def test_knob_wall_sides_come_from_different_files() -> None:
    """The conflation class: an envelope derived from the card agrees
    with the card trivially. The knob wall's two sides MUST load from
    two different files (card.py vs schema.py) — mutating one side
    can never move the other."""
    card_py = (CARDS / "audio/music/py/card.py").as_posix()
    row = walls._wall_schema_row(card_py)
    assert row is not None
    row_file = inspect.getfile(row)
    assert row_file != card_py, (
        "wall reads both sides from one file — conflation blind")
    assert Path(row_file).name == "schema.py", (
        "lane side must resolve to schema.py, got %s" % row_file)
    assert Path(card_py).name == "card.py"


def test_surface_wall_bites_renamed_knob(tmp_path: Path) -> None:
    """Forge duration → duration_typo_xyz: the renamed knob is card
    surface with no schema row — the surface wall's predicate (every
    surface name rides the envelope) must come out FALSE."""
    forged_py, forged_model = _forged_music_card(
        tmp_path,
        "duration                 = Slider",
        "duration_typo_xyz        = Slider")
    with _evict_collisions("comfyui", forged_py, forged_model):
        row = walls._wall_schema_row(forged_py)
        assert row is not None
        card_cls = load_card_py(forged_py, "comfyui")
        surface = [f.name for f in card_cls._fields_]
        assert "duration_typo_xyz" in surface, "forge did not take"
        proj = walls._wall_project_row(row)
        assert proj is not None
        missing = [n for n in surface if n not in proj]
    assert "duration_typo_xyz" in missing, (
        "SURFACE WALL IS BLIND: renamed knob rides the projection")


def test_served_envelope_carries_the_row_not_the_card() -> None:
    """Behavioral proof of the derivation source: the card's Seed
    default is -1 (the RANDOM sentinel), the MusicParams row's is 0.
    The served envelope must carry 0 — a revert to card.py derivation
    serves -1 and fails HERE, not at the user's click."""
    sys.path.insert(0, os.path.join(str(REPO), "py"))
    import editor_runs as _er
    served = _er._family_surface_props("music3")
    assert served is not None, "music3 serves no envelope"
    assert served["seed"]["default"] == 0, (
        "envelope seed default is %r — card.py derivation (row says "
        "0, card says -1)" % (served["seed"].get("default"),))


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
    "docs/design/image-edit-surface-standard.md": {
        ".d/causes.md": "past",
        "presets/blue_mesh.yaml": "deleted-in-record",
    },
    "docs/design/one-contract-compose.md": {
        "co_script/emit.py": "retired-with-compose-move",
    },
    "docs/design/parameter-surface.md": {
        "infer-daisy-studio/e2e/test_live.py": "past-run-journal",
        "py/card.py": "past-run-journal",
    },
    "docs/audits/bootstrap-audit.md": {
        "PIN.md": "past",
        "config/comfyui/extra_model_paths.yaml": "past",
        "dev_bootstrap_comfyui.py": "past",
        "h3-timeline/model.yaml": "past",
        "infra/comfyui/stage/extra_model_paths.yaml": "past",
        "model.yaml": "past",
        "model_manifest.py": "past",
        "plugins/MIGRATION.md": "past",
        "plugins/comfyui/nodes.yaml": "past",
        "plugins/comfyui/nodes/extensions.yaml": "past",
        "plugins/gens/nodes/extensions.yaml": "past",
        "plugins/melite-manager/manager/extra_model_paths.yaml": "past",
        "setup_comfyui.py": "past",
        "sync_local_comfyui.py": "past",
    },
    "docs/audits/dsh-plugin-consolidation.md": {
        "plugins/melite-video/cards/video_timeline/component.tsx": "past",
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
        "plugins/engines/comfyui/nodes.yaml": "rot",
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
        "py/card.py": "rot",
        "py/compose.py": "rot",
        "py/renderer.py": "rot",
        "py/schema.py": "rot",
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
        "image-edit/py/schema.py": "past",
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
        "py/compose.py": "rot",
        "py/schema.py": "rot",
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
        "plugins/melite-manager/manager/extra_model_paths.yaml": "past",
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
        "plugins/agent/dsh/melite-core/models/field_options.yaml": "past",
    },
    "docs/plans/root-config-gap-fix.md": {
        "py/__init__.py": "past",
    },
    "docs/plans/typed-step-docs.md": {
        "tests/test_co_script_parity_cards.py": "past",
    },
    "docs/plugins/card-compose.md": {
        "card_knobs.yaml": "rot",
        "py/timeline/compile.py": "rot",
    },
    "docs/plugins/catalog.md": {
        "card.yaml": "rot",
        "grading_rubric.yaml": "rot",
        "inference.yaml": "rot",
        "mod.yaml": "rot",
        "model.yaml": "rot",
        "preset.yaml": "rot",
        "variant.yaml": "rot",
    },
    "docs/plugins/registry.md": {
        "compose/__init__.py": "rot",
        "nodes/extensions.yaml": "rot",
    },
    "docs/queue/card-stage-typing.md": {
        "py/schema.py": "rot",
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
        "plugins/anny/cards/body/card.yaml": "past",
        "plugins/comfyui/models/3d/trellis2-native/model.yaml": "past",
        "plugins/comfyui/nodes/extensions.yaml": "past",
        "plugins/kimodo/cards/motion-gen/card.yaml": "past",
        "plugins/melite-3d/cards/3d/form_3d_autoremesher.yaml": "past",
        "plugins/melite-3d/families/autoremesher.ts": "past",
        "plugins/melite-3d/families/trellis2_native.ts": "past",
        "plugins/melite-3d/graph/form_3d_trellis2_native.builder.ts": "past",
        "plugins/melite-3d/models/3d/autoremesher/model.yaml": "past",
        "plugins/melite-motion/cards/motion_kimodo/form_motion_kimodo.yaml": "past",
        "plugins/melite-motion/graph/form_motion_kimodo.builder.ts": "past",
        "presets/prop.yaml": "past",
        "tts_audio_suite_engines.yaml": "past",
        "variants/1024/variant.yaml": "past",
    },
    "docs/testing/chaos-tests.md": {
        "tests/test_queue_chaos.py": "rot",
    },
    "docs/wiki.md": {
        "kick_queue_consumer.py": "rot",
        "plugins/comfyui/cards/video_timeline/form_video_timeline.yaml": "rot",
        "plugins/comfyui/models/video/h3-timeline/card_knobs.yaml": "rot",
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
