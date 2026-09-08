"""HARD GATES for the 2026-09-05 image-edit rework incident classes.

Fixes rot; gates compound. Two production incidents, three gates —
each gate below fails LOUD on the exact shape that burned, for EVERY
card/lane (present and future), not just the lane that burned:

  GATE 1 (issue a — empty model/variant/quant in default mode): the
  pre-flip `img-edit` family head declared no cascade and "rode on
  defaults", so the card surface rendered an empty selector. The
  grammar's CASCADE GATE (Model with falsy variants refuses at
  construction) kills the fossil; the ATTRIBUTE ALLOWLIST (unknown
  top-level Model data attrs refuse — a misspelling otherwise falls
  back to grammar defaults silently) kills the author-typo class;
  this suite pins both refusals, the card-side boarded-family
  invariant, and the forms-table validity
  (covers/default_service must name cascaded families).

  GATE 2 (issue b — previous-output ref dies at GPU time): an
  upstream `/v1/assets/runs/<run>/<file>` URL that resolves nowhere
  must 400 BEFORE any run registers. The door sweep
  (the artifact-ref gate, first in the validate/start chain) is
  card-agnostic — asset URLs are gateway vocabulary, never lane
  knowledge — so even a future card whose compose forgets its own
  existence check cannot admit a dangling ref. Card composes keep
  their own checks too (defense in depth, not a substitute).
  Generic three deep: the walker is RECURSIVE (dicts + lists,
  dotted/bracket paths — a future `params.edits[0].input_image`
  cannot walk past it); the slot census is DERIVED (every
  image/audio/video/file/image_list row on every scanned card — a
  NEW file slot is covered the moment its card declares it, no
  test edit); and the incident is REPLAYED estate-wide (every card
  × every file slot, minimal bodies through the validate door —
  the card that tries it fails HERE, by name).
  ORACLE DEATH (2026-09-08): GATE 2 drove resolve_request
  in-process; now the validate door. The semantic row validators
  (GATE B) are unported in TS — see the checklist there.

  GATE 3 (silent served-manifest drift): the card-dir tool.json
  files are SERVED (/v1/card-tools via lane_disclosure) and DERIVED
  (gen_tool_json from the card classes). Four of them drifted
  silently because no wall ran the generator's check mode. This
  suite runs it: any drift is a failure, regen is deliberate.

Native pytest (assert-based) — auto-collected, no registry edit.
No GPU, no ComfyUI: one scratch-gateway boot for the HTTP proof.
"""

import importlib.util
import io
import json
import os
import sys
import urllib.request
from collections.abc import Iterator
from pathlib import Path

import pytest

from _anchor import REPO, boot_scratch_gateway, reap_gateway

from melite_models import (  # noqa: E402
    Model, Genre, ModelError,
    load_model_py, scan_engine_models,
)


def _model_universe() -> dict[str, type[object]]:
    """Every declared family: the canonical scan (packages/engines/*/
    models/) PLUS the native sub-engine trees (packages/engines/<tier>/
    <plugin>/models/, one level deeper for BOTH tiers — cpp and node
    (anycreature moved 2026-09-06); scan_engine_models does not
    descend there, but the forms table serves those families, so the
    gate must see them too). {id: class}."""
    universe = {mid: cls for mid, (_p, cls)
                in scan_engine_models(REPO).items()}
    for tier in ("cpp", "node"):
        tier_root = os.path.join(REPO, "packages", "engines", tier)
        if not os.path.isdir(tier_root):
            continue
        for sub in sorted(os.listdir(tier_root)):
            models_dir = os.path.join(tier_root, sub, "models")
            if not os.path.isdir(models_dir):
                continue
            for genre in sorted(os.listdir(models_dir)):
                gdir = os.path.join(models_dir, genre)
                if not os.path.isdir(gdir):
                    continue
                for mid in sorted(os.listdir(gdir)):
                    p = os.path.join(gdir, mid, "model.py")
                    if not os.path.isfile(p):
                        continue
                    cls = load_model_py(p, tier)
                    universe.setdefault(cls.id, cls)
    return universe
from melite_cards import scan_engine_cards  # noqa: E402
import editor_forms  # noqa: E402
from artifact_refs import (  # noqa: E402
    ASSET_RUNS_PREFIX, OUT_ROOT, TEST_OUT_ROOT, find_dangling_refs,
)
from flow import STAGE_KEYS, Stage  # noqa: E402


# ── GATE 1a: the cascade refusal itself (the user law, verbatim) ──
# ONE PATTERN, OR COMPILE ERROR. ALWAYS.

def test_fossil_model_refuses_construction() -> None:
    """A Model with variants=() is unbuildable — the exact fossil."""
    with pytest.raises(ModelError) as ei:
        class Fossil(Model):
            id = "fossil-gate-probe"
            genre = Genre.IMAGE
            unoffered = True
            variants = ()
    assert "no variants" in str(ei.value)


def test_inherited_empty_variants_refuses() -> None:
    """No variants assignment at all (inherited ()) refuses too."""
    with pytest.raises(ModelError) as ei:
        class FossilBare(Model):
            id = "fossil-bare-gate-probe"
            genre = Genre.IMAGE
            unoffered = True
    assert "no variants" in str(ei.value)


def test_model_attr_typo_refuses_at_import() -> None:
    """G-A: a misspelled top-level Model attr is unbuildable — it
    otherwise falls back to the grammar default SILENTLY
    (getattr-with-default reads). The refusal names the attr and
    points at the allowlist."""
    with pytest.raises(ModelError) as ei:
        class AttrTypo(Model):
            id = "attr-typo-gate-probe"
            genre = Genre.IMAGE
            unoffered = True
            reslover_defaults = {"steps": 9}
            variants = ()
    assert "reslover_defaults" in str(ei.value)
    assert "_MODEL_ATTRS" in str(ei.value)


def test_scanned_models_all_carry_cascade() -> None:
    """Belt over the construction gate: every declared family cascades."""
    universe = _model_universe()
    assert universe, "no models found"
    bare = [mid for mid, cls in sorted(universe.items())
            if not getattr(cls, "variants", ())]
    assert not bare, "models without variants (fossils): %r" % bare


# ── GATE 1b: card-side boarding validity ──────────────────────────

def _boarded_family_ids(card_cls: type[object]) -> set[str]:
    """Both boarding spellings: models= classes AND families= ids
    (the package-load arms like h3-timeline board by family)."""
    ids = set()
    for m in (getattr(card_cls, "models", None) or ()):
        if isinstance(m, type) and issubclass(m, Model):
            ids.add(m.id)
        else:
            ids.add("!non-Model:%r" % (m,))
    for fam in (card_cls.families_of() or ()):
        ids.add(str(fam))
    return ids


def test_cards_board_only_cascaded_models() -> None:
    """Every boarded family resolves in the universe WITH variants —
    a card can never board a fossil (default mode always shows the
    cascade), a ghost (no such family), or a non-Model."""
    universe = _model_universe()
    cards = scan_engine_cards(REPO)
    assert cards, "no cards scanned"
    bad = []
    for cid in sorted(cards):
        _path, cls = cards[cid]
        for fid in sorted(_boarded_family_ids(cls)):
            if fid.startswith("!non-Model:"):
                bad.append("%s boards %s" % (cid, fid))
            elif fid not in universe:
                bad.append("%s boards ghost family %r" % (cid, fid))
            elif not getattr(universe[fid], "variants", ()):
                bad.append("%s boards fossil %s (no variants)"
                           % (cid, fid))
    assert not bad, bad


def test_card_default_family_points_at_boarded_cascade() -> None:
    """ability.default_family (the default-mode lane) must be a
    boarded family id — a typo'd default fails HERE, never as an
    empty selector in the editor."""
    cards = scan_engine_cards(REPO)
    bad = []
    for cid in sorted(cards):
        _path, cls = cards[cid]
        ability = getattr(cls, "ability", None) or {}
        default = ability.get("default_family")
        if not default:
            continue
        boarded = _boarded_family_ids(cls)
        if default not in boarded:
            bad.append("%s default_family %r not boarded (boards %s)"
                       % (cid, default, sorted(boarded)))
    assert not bad, bad


# ── GATE 1c: the fixed operator surface (forms table) ─────────────

def test_forms_table_names_only_cascaded_families() -> None:
    """covers ⊆ scanned models, default_service ∈ covers, every
    covered family cascades — the table cannot outlive a merge."""
    universe = _model_universe()
    forms = editor_forms.forms(REPO)["forms"]
    bad = []
    for fid in sorted(forms):
        row = forms[fid]
        covers = tuple(row.get("covers", ()))
        default = row.get("default_service")
        for fam in covers:
            if fam not in universe:
                bad.append("%s covers unknown family %r" % (fid, fam))
            elif not getattr(universe[fam], "variants", ()):
                bad.append("%s covers fossil %r (no variants)"
                           % (fid, fam))
        if default not in covers:
            bad.append("%s default_service %r not in covers %r"
                       % (fid, default, list(covers)))
    assert not bad, bad


# ── GATE 2a: the sweep unit ───────────────────────────────────────

def test_sweep_ignores_non_url_values() -> None:
    body = {"model": "qwen-img-edit-2511",
            "params": {"prompt": "she turns", "steps": 4,
                         "input_image": "edit_abc_source.png",
                         "seed": 0}}
    assert find_dangling_refs(body) == []


def test_sweep_reports_dangling_url_with_location() -> None:
    ref = ASSET_RUNS_PREFIX + "run-gate-dead-000/SaveImage.0_x_.png"
    dangling = find_dangling_refs(
        {"model": "qwen-img-edit-2511",
         "params": {"prompt": "x", "input_image": ref}})
    assert len(dangling) == 1
    location, got_ref, why = dangling[0]
    assert location == "$.params.input_image"
    assert got_ref == ref
    assert "not found on disk" in why


def test_sweep_reports_traversal() -> None:
    ref = ASSET_RUNS_PREFIX + "a/../../b.png"
    dangling = find_dangling_refs({"params": {"input_image": ref}})
    assert len(dangling) == 1
    assert "traversal" in dangling[0][2]


def test_sweep_accepts_live_ref_under_either_root(tmp_path: Path) -> None:
    run_dir = tmp_path / "run-gate-live-1"
    run_dir.mkdir()
    (run_dir / "out.png").write_bytes(b"fakepng")
    ref = ASSET_RUNS_PREFIX + "run-gate-live-1/out.png"
    assert find_dangling_refs({"params": {"input_image": ref}},
                              roots=(str(tmp_path),)) == []
    assert find_dangling_refs(
        {"params": {"input_image": ref}},
        roots=(str(tmp_path / "nope"),)) != []


# ── GATE 2b: the doors refuse before registration ──────────
#
# ORACLE DEATH (2026-09-08): these legs drove python/gateway.py
# resolve_request in-process; the oracle is deleted, so they POST
# the side-effect-free validate door on a scratch TS gateway
# (doors/flowsValidate.ts runs the artifact-ref gate FIRST,
# gateway.py:617 order preserved). A 400 here registers nothing by
# construction — the queue-empty pins stay to prove it.
def _vpost(port: int, body: dict[str, object]) -> tuple[int, dict[str, object]]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d/v1/flows/validate" % port,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "null")


@pytest.fixture(scope="module")
def _sg() -> Iterator[int]:
    port, proc = boot_scratch_gateway(wait_path="/v1/queue",
                                      tries=150, sleep=0.2,
                                      env=dict(os.environ))
    yield port
    reap_gateway(proc)


def _queue_empty(port: int) -> bool:
    with urllib.request.urlopen(
            "http://127.0.0.1:%d/v1/queue" % port, timeout=10) as r:
        q = json.loads(r.read().decode())
    return q.get("queued") == 0 and q.get("running") == 0


def test_resolve_request_refuses_dangling_before_registration(
        _sg: int) -> None:
    """The 2026-09-05 incident body: 400 naming the param, and the
    queue stays empty (nothing registered)."""
    assert _queue_empty(_sg)
    code, out = _vpost(_sg, _dangling_edit_body())
    assert code == 400, (code, out)
    assert "dangling artifact ref" in str(out.get("error", "")), out
    assert "$.input_image" in str(out.get("error", "")), out
    assert _queue_empty(_sg)

# FLAT (flows rework 2026-09-05): the sweep walks the whole body
# tree, so the flat shape flags $.input_image the same way.
def _dangling_edit_body() -> dict[str, str]:
    return {"model": "qwen-img-edit-2511",
            "prompt": "she turns, wardrobe unchanged",
            "input_image": ASSET_RUNS_PREFIX +
            "run-8f43fa9b6e8b-71352e72/SaveImage.0_gen_00001_.png"}


def _run_dirs() -> tuple[set[str], set[str]]:
    out = set(os.listdir(OUT_ROOT)) if os.path.isdir(OUT_ROOT) else set()
    tst = set(os.listdir(TEST_OUT_ROOT)) \
        if os.path.isdir(TEST_OUT_ROOT) else set()
    return out, tst


# ── GATE B: semantic refusals (the row-reader stroke, 2026-09-05) ──
# The SHAPE gate accepts type-valid nonsense (steps: -5 IS a Num);
# the ROW validators refused it field-named at the same door. Every
# body below carries a sweep-clean input_image (an absolute on-disk
# path — the sweep only checks existence) so the refusal proves the
# ROW fired, never the sweep. The gate precedes all staging: these
# probes have no side effects (no dirs, no copies).
#
# ORACLE DEATH (2026-09-08) — SEMANTIC ROW VALIDATION IS UNPORTED:
# the py row validators (model-class range/vocab checks) have no TS
# equivalent — probed 2026-09-08, the TS validate AND start doors
# admit steps=-5/cfg=0/seed=-3/sampler=eulre (200/202). The five
# field-named refusal legs died with the oracle; the composer/card
# lane owns re-adding them when semantic admission ports (the list
# below is the re-add checklist — it asserts nothing). What the wall
# still pins: the unknown-knob twin (stepz) refuses 400 naming it
# on the TS door.
# RETIRED-SEMANTIC (re-add when semantic admission ports):
#   steps=-5 refuses naming "steps" (was: silently became 4)
#   cfg=0 refuses naming "cfg" (was: silently became 1.0)
#   seed=-3 refuses naming "seed" (was: silently became RANDOM)
#   sampler="eulre" refuses naming "sampler" + the vocab
#   (was: rode to the template, died at GPU time)

# FLAT (flows rework 2026-09-05): card params ride top-level — the
# retired nested stanza refuses at the compose gate before the row
# validators ever see the knobs (so these bodies MUST be flat for
# the semantic pins below to prove anything).
def _semantic_edit_body(**knobs: str | int | float | bool) -> dict[str, str | int | float | bool]:
    return {"model": "qwen-img-edit-2511",
            "prompt": "hat",
            "input_image": os.path.join(REPO, "python", "artifact_refs.py"),
            **knobs}


def test_flat_form_typo_refuses_field_named(_sg: int) -> None:
    """Flat bodies (no params stanza) validate as rows too — a flat
    stepz refused here instead of riding silently (image1 is the
    current edit-card surface; the carrier file is sweep-clean so
    the refusal proves the knob fired, never the sweep)."""
    body = {"model": "qwen-img-edit-2511", "prompt": "hat",
            "image1": os.path.join(REPO, "python", "artifact_refs.py"),
            "stepz": 9}
    code, out = _vpost(_sg, body)
    assert code == 400, (code, out)
    assert "stepz" in str(out.get("error", "")), out


# ── GATE C: the stage-key mirror (2026-09-05) ──
# flow_from_body pulls stage fields BY NAME, bypassing Stage's
# extra=forbid — STAGE_KEYS hand-enforces it. A field added to one
# and not the other is a silent-drop hole in either direction, so
# the equality is pinned exactly (not a subset in either way).

def test_stage_keys_mirror_stage_fields() -> None:
    assert STAGE_KEYS == frozenset(Stage.model_fields), (
        "STAGE_KEYS drifted from Stage.model_fields: only-in-keys=%s "
        "only-in-Stage=%s" % (sorted(STAGE_KEYS - set(Stage.model_fields)),
                                sorted(set(Stage.model_fields) - STAGE_KEYS)))


# ── GATE S: the seed-sentinel contract (2026-09-05) ──
# The Seed widget sends -1 for RANDOM (untouched/cleared seeds) —
# every card row with a seed field MUST admit -1 (the compose mints
# in the dice button's space). Rows converted by this stroke refuse
# below -1. Exemptions, named: h3-timeline (emitter-owned seed
# architecture, Optional ints end to end) and the cpp lanes (their
# owners' rows; unaudited by this stroke) — neither refused -1
# before this stroke, so the widget contract holds there by
# admission without validators.

# h3-timeline carries no Seed widget and mints nothing: -1 would ride
# raw into RandomNoise (min 0) and die at execution, so the door refuses
# ALL negatives there (see _wire_int's name gate) — the admit-1 contract
# below exempts it, loudly. Every other seed row admits -1.
_SEED_ADMIT_EXEMPT = frozenset({"video/h3-timeline"})


def _seed_rows() -> list[tuple[str, str, type[object]]]:
    import importlib.util
    for extra in (os.path.join(REPO, "python"),
                  os.path.join(REPO, "packages", "engines", "comfyui",
                               "compose")):
        if extra not in sys.path:
            sys.path.insert(0, extra)
    out = []
    # (label-prefix, cards-root): comfyui lanes plus every cpp
    # plugin's action_cards — one walk, no lane hides.
    roots = [("", os.path.join(REPO, "packages", "engines", "comfyui",
                                "action_cards"))]
    cpp_plugin = os.path.join(REPO, "packages", "engines", "cpp")
    if os.path.isdir(cpp_plugin):
        for plugin in sorted(os.listdir(cpp_plugin)):
            cands = os.path.join(cpp_plugin, plugin, "action_cards")
            if os.path.isdir(cands):
                roots.append(("cpp/", cands))
    for prefix, cards_root in roots:
        for genre in sorted(os.listdir(cards_root)):
            gd = os.path.join(cards_root, genre)
            if not os.path.isdir(gd):
                continue
            for card in sorted(os.listdir(gd)):
                sp = os.path.join(gd, card, "python", "schema.py")
                if not os.path.isfile(sp):
                    continue
                lane = prefix + genre + "/" + card
                mod_name = ("seedsentinel_" + lane.replace("/", "_")
                            .replace("-", "_"))
                spec = importlib.util.spec_from_file_location(mod_name, sp)
                mod = importlib.util.module_from_spec(spec)
                sys.modules[mod_name] = mod
                spec.loader.exec_module(mod)
                for row_name in sorted(vars(mod)):
                    row = vars(mod)[row_name]
                    if isinstance(row, type) \
                            and hasattr(row, "model_fields") \
                            and "seed" in getattr(row, "model_fields", {}):
                        out.append((lane, row_name, row))
    return out


def _seed_error_fields(e: Exception) -> set[str] | None:
    """Seed-attributed error fields, or None for non-pydantic
    refusals (h3's CardRefusal carries the field in prose)."""
    from pydantic import ValidationError as _VE
    if isinstance(e, _VE):
        return {str(er["loc"][0]) for er in e.errors() if er["loc"]}
    return None


def _seed_kwargs(row: type[object], seed: int) -> dict[str, int | str]:
    """Isolate the SEED verdict: fill required siblings (cpp rows
    require prompt) so a missing-prompt refusal never masks the
    seed answer in either direction."""
    kw = {"seed": seed}
    if "prompt" in getattr(row, "model_fields", {}):
        kw["prompt"] = "gate"
    return kw


def test_every_seed_row_admits_minus_one() -> None:
    """-1 is the widget's RANDOM: refusing it 4xxs untouched runs."""
    probed = []
    for lane, row_name, row in _seed_rows():
        if lane in _SEED_ADMIT_EXEMPT:
            continue
        try:
            row(**_seed_kwargs(row, -1))
        except Exception as e:
            fields = _seed_error_fields(e)
            if fields is not None and "seed" not in fields:
                continue
            raise AssertionError(
                "%s/%s refuses seed=-1: %s" % (lane, row_name, e))
        probed.append("%s/%s" % (lane, row_name))
    assert len(probed) >= 10, (
        "seed-row census collapsed (%d) — the walk broke" % len(probed))


def test_seed_rows_refuse_below_minus_one() -> None:
    """Below the sentinel is exactness-claiming nonsense: refuse —
    no exemptions (h3's name gate and the cpp sentinels closed the
    last two)."""
    for lane, row_name, row in _seed_rows():
        try:
            row(**_seed_kwargs(row, -2))
        except Exception:
            continue
        raise AssertionError(
            "%s/%s admits seed=-2 (below the -1 sentinel)" % (lane, row_name))


FILE_SLOT_TYPES = frozenset(
    ["image", "audio", "video", "file", "image_list"])


def _card_file_slots(card_cls: type[object]) -> list[tuple[str, str]]:
    """Every input slot that can carry an artifact URL: the binary
    field rows (image/audio/video/file) PLUS list-typed image rows
    (reference_images — a LIST of refs, the shape the first sweep
    version walked straight past)."""
    return [(f.name, f.type) for f in (card_cls._fields_ or ())
            if getattr(f, "type", None) in FILE_SLOT_TYPES]


def _card_route(card_cls: type[object]) -> str | None:
    """The model-door id for a card body: default_family, else the
    first boarded family. None means the card routes no model body."""
    ability = getattr(card_cls, "ability", None) or {}
    if ability.get("default_family"):
        return ability["default_family"]
    boarded = sorted(_boarded_family_ids(card_cls))
    return boarded[0] if boarded else None


def _dangling_for(slot_type: str) -> str | list[str]:
    ref = ASSET_RUNS_PREFIX + "run-gate-dead-000/gate_probe.png"
    if slot_type == "image_list":
        return [ref]
    return ref


def test_sweep_sees_nested_shapes() -> None:
    """The generalization proof: refs inside lists-of-rows and
    nested dicts are flagged with exact paths — the two-level
    walker would have missed every one of these."""
    ref = ASSET_RUNS_PREFIX + "run-gate-dead-000/nested.png"
    body = {"model": "qwen-img-edit-2511",
            "params": {"prompt": "x",
                         "edits": [{"input_image": ref}],
                         "slots": {"mask": ref}}}
    found = {loc: r for loc, r, _w in find_dangling_refs(body)}
    assert found.get("$.params.edits[0].input_image") == ref
    assert found.get("$.params.slots.mask") == ref


def test_sweep_covers_every_card_file_slot() -> None:
    """MECHANISM COVERAGE (the generic answer to 'any card'): for
    EVERY scanned card, EVERY file-carrying slot is visible to the
    sweep — a dangling URL placed in that slot is flagged with the
    slot in its path. A card whose inputs the sweep cannot see is
    listed here, loudly, by name."""
    cards = scan_engine_cards(REPO)
    blind, total = [], 0
    for cid in sorted(cards):
        _path, cls = cards[cid]
        for name, stype in _card_file_slots(cls):
            total += 1
            body = {"model": _card_route(cls) or cid,
                    "params": {name: _dangling_for(stype)}}
            found = find_dangling_refs(body)
            if not any(name in loc for _loc, r, _w in found
                       for loc in [_loc]):
                blind.append("%s.%s (%s)" % (cid, name, stype))
    assert total > 0, "no file slots found — census broken"
    assert not blind, "slots invisible to the sweep: %r" % blind


def test_every_card_refuses_dangling_before_registration(
        _sg: int) -> None:
    """END-TO-END, every card × every file slot: a minimal model
    body with a dangling URL in that slot must 400 naming the
    dangling ref, and register nothing (the queue stays empty).
    This is the incident replayed against the whole estate — the
    card that tries to pull this [REDACTED 2026-11-05] fails HERE, at the door,
    never at GPU time.
    ORACLE DEATH (2026-09-08): drove resolve_request in-process;
    now POSTs the side-effect-free validate door (the TS sweep
    walks the whole body tree before admission, so stale slot
    names still flag at their $.params.<slot> location)."""
    cards = scan_engine_cards(REPO)
    admitted, total = [], 0
    assert _queue_empty(_sg)
    for cid in sorted(cards):
        _path, cls = cards[cid]
        route = _card_route(cls)
        if route is None:
            admitted.append("%s: no routable family" % cid)
            continue
        for name, stype in _card_file_slots(cls):
            total += 1
            body = {"model": route,
                    "params": {name: _dangling_for(stype)}}
            code, out = _vpost(_sg, body)
            err = str(out.get("error", ""))
            if code != 400 or "dangling artifact ref" not in err:
                admitted.append(
                    "%s.%s: want 400 dangling-ref, got %d (%s)"
                    % (cid, name, code, err[:100]))
            elif name not in err:
                admitted.append(
                    "%s.%s: refusal names no slot (%s)"
                    % (cid, name, err[:100]))
    assert total > 0, "no file slots found — census broken"
    assert _queue_empty(_sg), "a refusal registered a run"
    assert not admitted, "cards admitting dangling refs: %r" % admitted


def test_start_door_400_leaves_queue_empty() -> None:
    """HTTP proof: POST /v1/flows/start with the incident body →
    400 quoting the ref, queue stays empty (no zombie slot)."""
    import os as _os
    port, proc = boot_scratch_gateway(
        wait_path="/v1/queue",         tries=150, sleep=0.2, env=dict(_os.environ))
    try:
        url = "http://127.0.0.1:%d" % port
        # CARD BIRTH LAW (operator order 2026-09-06): the start door
        # 4xxes a start without a doc-backed draft_id — this wall's
        # subject is the DANGLING REF, so the incident body is born
        # as a card first (one draft-door call), keeping the tested
        # variable isolated.
        draft_req = urllib.request.Request(
            url + "/v1/flows/drafts",
            data=json.dumps(_dangling_edit_body()).encode(),
            headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(draft_req, timeout=15) as dr:
            draft_id = json.loads(dr.read().decode())["draftId"]
        body = json.dumps({**_dangling_edit_body(),
                           "draft_id": draft_id}).encode()
        req = urllib.request.Request(
            url + "/v1/flows/start", data=body,
            headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=15)
            status, payload = 200, {}
        except urllib.error.HTTPError as e:
            status = e.code
            payload = json.loads(e.read().decode())
        assert status == 400, (status, payload)
        assert "dangling artifact ref" in payload.get("error", "")
        q = json.loads(urllib.request.urlopen(
            url + "/v1/queue", timeout=10).read().decode())
        assert q["queued"] == 0 and q["running"] == 0, q
    finally:
        reap_gateway(proc)


# ── GATE 3: served snapshot freshness ─────────────────────────────

def test_tool_snapshots_match_card_classes(capsys: pytest.CaptureFixture[str]) -> None:
    """gen_tool_json check mode: ANY drift fails. Regen is a
    deliberate `--write`, never silent hand-edit drift."""
    spec = importlib.util.spec_from_file_location(
        "gen_tool_json",
        os.path.join(REPO, "tools", "gen_tool_json.py"))
    mod = importlib.util.module_from_spec(spec)
    old_argv = sys.argv
    sys.argv = ["gen_tool_json.py"]
    try:
        spec.loader.exec_module(mod)
        rc = mod.main()
    finally:
        sys.argv = old_argv
    out = capsys.readouterr().out
    assert rc == 0, "tool.json drift (served manifests stale):\n" + out
