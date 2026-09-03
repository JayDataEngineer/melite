"""Python-cards parity wall — a flipped card's class fragment must equal
the yaml parser's fragment, recursively, per served family.

This is the migration's safety net (docs/plans/python-action-cards.md):
a card.py that disagrees with the yaml it replaces is a regression, not
a refactor. When the yaml parameters: block is deleted, this test pins
the class against the golden form-spec instead (same deep compare).
"""

import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "py"))
sys.path.insert(0, os.path.join(REPO, "py"))

import editor_forms as ef                    # noqa: E402
from melite_cards.serialize import _norm       # noqa: E402
from melite_cards import load_card_py, field_spec  # noqa: E402

PASS = FAIL = 0


def check(name, ok, note=""):
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def deep_diff(a, b, path="$"):
    """First divergence path (None when equal) — key order matters for
    'fields' arrays; dicts compare by content (the wire JSON is an
    object; the C's emission order is preserved by construction)."""
    if type(a) is not type(b):
        return "%s: type %s != %s" % (path, type(a).__name__, type(b).__name__)
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                return "%s.%s: missing in class" % (path, k)
            if k not in b:
                return "%s.%s: missing in yaml" % (path, k)
            d = deep_diff(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return "%s: len %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = deep_diff(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    return None if a == b else "%s: %r != %r" % (path, a, b)


def main():
    def _card_py(*parts):
        """THE CARD PATTERN (2026-09-03): python lives in the card's py/
        subfolder; a root card.py is the compat fallback."""
        root = os.path.join(REPO, "plugins", "engines", *parts)
        for c in (os.path.join(root, "py", "card.py"),
                  os.path.join(root, "card.py")):
            if os.path.isfile(c):
                return c
        return os.path.join(root, "card.py")

    card_py = os.path.join(REPO, "plugins", "engines", "comfyui",
                           "action_cards", "image", "image-gen", "card.py")
    check("image-gen card.py loads", os.path.isfile(card_py))
    cls = load_card_py(card_py, "comfyui")
    check("card id", cls.id == "image-gen", cls.id)

    engine_dir = os.path.join(REPO, "plugins", "engines", "comfyui")
    vocab = {
        "samplers": ef._option_list(REPO, "samplers", engine_dir),
        "schedulers": ef._option_list(REPO, "schedulers", engine_dir),
    }
    check("vocab resolves", len(vocab["samplers"]) == 12
          and len(vocab["schedulers"]) == 9,
          "%d samplers / %d schedulers" % (len(vocab["samplers"]),
                                           len(vocab["schedulers"])))

    # families gate: the flip deleted image-gen's yaml parameters block —
    # the yaml parser no longer produces a fragment, so parity pins
    # against the GOLDEN form-spec (the wire the editor consumes). The
    # class fragment must equal the golden's card tail, recursively.
    model = "krea-2"
    golden = json.load(open(os.path.join(
        REPO, "tests", "golden_http", "form-spec_model_krea-2.json")))
    py_frag = field_spec(cls, model, vocab, service=golden["service"])
    want = {k: golden[k] for k in ("form", "service", "fields",
                                   "schema_groups") if k in golden}
    d = deep_diff(py_frag, want)
    check("fragment parity vs golden (%s)" % model, d is None, d or "")

    # the served route itself must serve the class fragment (round trip:
    # _card_spec loads card.py — proves the serving path is class-driven)
    served = ef._card_spec(REPO, model)
    d2 = deep_diff(served, py_frag)
    check("served fragment is class-driven", d2 is None, d2 or "")

    # z-image/anima boarded the card with the model-level mods flip
    # (2026-09-02): the interface card serves all three families, each
    # scoped to its own declared mods — z-image/anima carry lanpaint,
    # krea-2 carries loras. Serving all three IS the point.
    check("z-image gate parity",
          ef._card_spec(REPO, "z-image") is not None
          and "z-image" in tuple(cls.families_of()))

    # ── the 2026-09-02 full card flip: every flipped card pinned the
    # same way — class fragment == golden form-spec (captured from the
    # yaml-era serving BEFORE the parameters blocks died), and the
    # served route must be class-driven for each family model.
    # (reorg 2026-09-02b: comfyui cards live under genre groups in
    # action_cards/<genre>/<card>/; audio-cpp still rides cards/<cid>/)
    FLIPPED = [
        ("image-edit", "comfyui", "img-edit",
         ("action_cards", "image", "image-edit")),
        ("h3-timeline", "comfyui", "h3-timeline",
         ("action_cards", "video", "h3-timeline")),
        ("tts", "audio-cpp", "qwen3-tts", ("cards", "tts")),
        ("voice-lock", "audio-cpp", "qwen3-tts-voicedesign",
         ("cards", "voice-lock")),
        ("music", "audio-cpp", "music3", ("cards", "music")),
    ]
    for cid, engine, model, home in FLIPPED:
        cpath = _card_py(engine, *home)
        fcls = load_card_py(cpath, engine)
        check("%s id" % cid, fcls.id == cid, fcls.id)
        gpath = os.path.join(REPO, "tests", "golden_http",
                             "form-spec_model_%s.json" % model)
        gold = json.load(open(gpath))
        edir = os.path.join(REPO, "plugins", "engines", engine)
        fvocab = {
            "samplers": ef._option_list(REPO, "samplers", edir),
            "schedulers": ef._option_list(REPO, "schedulers", edir),
        }
        frag = field_spec(fcls, model, fvocab, service=gold["service"])
        # size/layout are the presentation notches — non-defaults only,
        # so both sides may lack them (a "form"/"default" card emits
        # nothing; the h3-timeline golden carries both).
        want = {k: gold[k] for k in ("form", "service", "size", "layout",
                                     "fields", "schema_groups") if k in gold}
        dd = deep_diff(frag, want)
        check("%s fragment parity vs golden (%s)" % (cid, model),
              dd is None, dd or "")
        served = ef._card_spec(REPO, model)
        dd2 = deep_diff(served, frag)
        check("%s served fragment is class-driven" % cid,
              dd2 is None, dd2 or "")

    # ── PRESENTATION NOTCHES (2026-09-02) ─────────────────────────────
    # The declaration law: the base owns the defaults ("default"/"form");
    # a card states ONLY deviations, the wire carries ONLY deviations.
    # Both-directions audit (the LAYER AUDIT pattern): a model declaring
    # a studio tenant ROUTES to an interactive body — the card of its
    # family MUST declare layout="studio", and a card declaring
    # layout="studio" without a tenant binding is an orphan notch.
    from melite_models import scan_engine_models
    models = {mid: cls for mid, (_p, cls)
              in scan_engine_models(REPO).items()}
    cards = {}
    for cid, engine, model, home in [("image-gen", "comfyui", "krea-2",
                                      ("action_cards", "image",
                                       "image-gen"))] + FLIPPED:
        cards[cid] = load_card_py(_card_py(engine, *home), engine)
    studio_models = {}
    for mid, cls in models.items():
        st = getattr(cls, "studio", None)
        if st is not None:            # Studio row (typed at boot)
            studio_models[mid] = st.tenant
    for cid, card in cards.items():
        for fam in card.families_of():
            n = _norm(fam)
            has_tenant = any(_norm(m) == n for m in studio_models)
            if has_tenant:
                check("notch: %s (family %s has a studio tenant) "
                      "declares layout=studio" % (cid, fam),
                      card.layout == "studio", card.layout)
                check("notch: %s layout=studio + size is explicit"
                      % cid,
                      card.size in ("default", "huge"), card.size)
    # a studio-layout card whose NO family carries a tenant = orphan
    for cid, card in cards.items():
        if card.layout == "studio":
            fams = {_norm(f) for f in card.families_of()}
            if not fams & {_norm(m) for m in studio_models}:
                check("notch: %s declares studio but no family "
                      "binds a tenant" % cid, False, "orphan notch")

    # cross-validation: models declaring a card attr must keep defaults
    # inside the owning card's field domains (the killer feature, live
    # across engines now that both sides are python)
    import catalog as _cat
    from melite_models import validate_against_cards
    import importlib.util as _ilu
    _spec = _ilu.spec_from_file_location(
        "audio_compose", os.path.join(
            REPO, "plugins", "engines", "audio-cpp", "engines", "audio",
            "compose.py"))
    _ac = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(_ac)
    pairs = validate_against_cards(models, cards,
                                   engine_truth=_ac.ENGINE_TRUTH_KEYS)
    check("cross-validation pairs (all boarded families)",
          pairs == [("anima", "image-gen"),
                    ("img-edit", "image-edit"),
                    ("krea-2", "image-gen"),
                    ("music3", "music"),
                    ("z-image", "image-gen")], repr(pairs))

    # tool.json snapshots are DERIVED artifacts — the card class is the
    # SSOT (mods declared at the model level, absorbed through models=);
    # a snapshot drifting from tool_manifests() is a parity failure.
    # Regen: python3 tools/gen_tool_json.py --write
    from melite_cards import tool_manifests
    from melite_cards.serialize import scan_engine_cards
    snap_fail = []
    for pcid, (cpath, ccls) in sorted(scan_engine_cards(REPO).items()):
        snap = os.path.join(os.path.dirname(cpath), "tool.json")
        if not os.path.isfile(snap):
            continue
        want = json.loads(open(snap, encoding="utf-8").read())
        if want != tool_manifests(ccls):
            snap_fail.append(pcid)
    check("tool.json snapshots derive from card classes", not snap_fail,
          "drifted: %s — run tools/gen_tool_json.py --write" % snap_fail)

    # boot-loud validation contracts
    from melite_cards import ActionCard, ValidationError, Number, Select, VocabRef

    try:
        Number(label="x", min=10, max=1)
        check("bad range refused", False, "no refusal")
    except ValidationError:
        check("bad range refused", True)
    try:
        Number(label="x", step=0)
        check("zero step refused", False, "no refusal")
    except ValidationError:
        check("zero step refused", True)

    class _BadCard(ActionCard):
        id = "bad-card"
        f = Select(label="x", options=VocabRef("$nope"))

    try:
        field_spec(_BadCard, "m", vocab)
        check("unresolved vocab refused", False, "no refusal")
    except ValidationError:
        check("unresolved vocab refused", True)

    # two-SSOTs refusal: a card dir with BOTH card.py and a yaml
    # parameters: block never serves (loud, before the wire).
    import tempfile
    import editor_forms as _ef
    with tempfile.TemporaryDirectory() as td:
        cdir = os.path.join(td, "engine", "cards", "duo")
        os.makedirs(cdir)
        open(os.path.join(cdir, "card.py"), "w").write(
            "from melite_cards import ActionCard, Text\n\n\n"
            "class DuoCard(ActionCard):\n    id = 'image-gen'\n"
            "    families = ('krea-2',)\n"
            "    t = Text(label='t')\n")
        yml = os.path.join(cdir, "card.yaml")
        open(yml, "w").write(
            "card:\n  id: image-gen\nfamilies:\n  - id: krea-2\n"
            "parameters:\n  t:\n    type: text\n")
        orig_iter = _ef._iter_plugin_engines
        _ef._iter_plugin_engines = lambda root: [("engine",
                                                  os.path.join(td, "engine"))]
        try:
            try:
                _ef._card_spec(td, "krea-2")
                check("two-SSOTs refused", False, "no refusal")
            except _ef.ValidationError:
                check("two-SSOTs refused", True)
        finally:
            _ef._iter_plugin_engines = orig_iter

    # ── drift walls: the cards tree cannot rot ────────────────────────
    # rung 8 (inverse): renderer payload lives ONLY in card packages.
    # Any renderer.py under an engine tree must sit inside an
    # action_cards/ dir — a renderer next to a model is the regression
    # rung 8 exists to prevent.
    from pathlib import Path as _P
    _repo = _P(REPO)
    _misplaced = sorted(
        str(r.relative_to(_repo)) for r in
        _repo.glob("plugins/engines/*/models/**/renderer.py")) + sorted(
        str(r.relative_to(_repo)) for r in
        _repo.glob("plugins/engines/*/models/**/co_script_renderer.py"))
    check("no renderer payload under models/ (rung 8)",
          not _misplaced, "; ".join(_misplaced[:3]))
    _card_renderers = sorted(
        str(r.relative_to(_repo)) for r in
        _repo.glob("plugins/engines/*/action_cards/**/renderer.py"))
    check("card renderers exist (rung 8 has surface)",
          len(_card_renderers) >= 4, repr(_card_renderers[:6]))

    # rung 5: the compose bus owns import mechanics — zero sys.path
    # rituals anywhere under action_cards/. Pattern matches the CALL
    # (path.insert/append), not one spelling.
    def _ritual(txt):
        return "path.insert(" in txt or "path.append(" in txt
    _rituals = sorted(
        str(f.relative_to(_repo)) for f in
        _repo.glob("plugins/engines/*/action_cards/**/*.py")
        if _ritual(f.read_text(errors="replace")))
    check("zero sys.path rituals under action_cards/ (rung 5)",
          not _rituals, "; ".join(_rituals[:3]))

    # dead card refs refuse (the migration amnesty is over): a model
    # declaring card= for a card that does not exist is drift.
    from melite_models import ModelError
    _dead_probe = dict(models)
    class _Ghost:  # minimal shape validate_against_cards reads
        id = "zombie"
        card = "no-such-card"
    _dead_probe["zombie"] = _Ghost
    try:
        from melite_models import validate_against_cards
        # ghost ALONE (real models need their engine_truth keys; the
        # ghost has no defaults — the refusal path is isolated)
        validate_against_cards({"zombie": _Ghost}, cards)
        check("dead card= ref refuses", False, "no refusal")
    except ModelError as e:
        check("dead card= ref refuses", "no known card" in str(e))

    # ── THE LIVE COMPOSE WALL (2026-09-04) ─────────────────────────────
    # Coverage gap this closes: every other section loads card.py ALONE;
    # the golden rows are audio refusals. Nothing imported the full
    # timeline package end-to-end — which is how a broken intra-package
    # import (the deleted .fp16) shipped green through every wall. This
    # section drives the REAL dispatch (plugins.compose, engine-typed)
    # through the whole pipeline: schema -> timeline -> emission ->
    # renderer.
    import plugins
    from plugins import ValidationError as PluginsValidationError

    _body = {"model": "h3-timeline",
             "params": {"seed": 7, "fps": 24,
                        "identity": "a courier in lantern-lit rain",
                        "calls": [{"text": "pushes off through the glow",
                                   "start_frame": 0, "end_frame": 56},
                                  {"text": "the storm swallows the alley",
                                   "start_frame": 56, "end_frame": 112}]}}
    _skel = "name: h3-timeline\ntype: comfyui\n\nnodes:\n"

    # phase 1: persisted extras
    yml1, extra1 = plugins.compose(dict(_body), "h3-timeline", "", _skel,
                                   ("comfyui",))
    _in = (extra1 or {}).get("inputs", {})
    check("live compose phase1 extras",
          set((extra1 or {})) == {"inputs", "trims", "spans"}
          and "prompt" in _in and str(_in.get("seed")) == "7"
          and "prompt2" in _in,
          "extra keys %s" % sorted((extra1 or {}).keys()))

    # phase 2: the run graph (renderer seam included)
    yml2, extra2 = plugins.compose(dict(_body), "h3-timeline",
                                   "run-WALL-0001", _skel, ("comfyui",))
    # THE ACTION CARD LAW: one skeleton node = one workflow = one queue submission.
    # The skeleton has exactly one node: h3-film (not per-window nodes).
    check("live compose phase2 run graph",
          "- id: h3-film" in (yml2 or "")
          and "workflow: {" in (yml2 or "")
          and "$prompt" in ((extra2 or {}).get("inputs", {})),
          "yaml %d bytes" % len(yml2 or ""))

    # THE CARD ROAD WALL: input_from is the scaffold's positional pool
    # contract — $prompt, $prompt2..N ascending, then $seed. The refs
    # must mirror the pool exactly, nothing missing, nothing extra.
    import re as _re_road  # noqa: E402
    _refs = _re_road.findall(r"__initial__\.\$[a-z0-9]+", yml2 or "")
    _pool2 = sorted((extra2 or {}).get("inputs", {}))

    def _rank(k):
        if k == "$prompt":
            return (0, 0, k)
        if k.startswith("$prompt") and k[7:].isdigit():
            return (0, int(k[7:]), k)
        return (1, 0, k)

    _expected = ["__initial__." + k for k in sorted(_pool2, key=_rank)]
    check("card road: input_from positional contract",
          _refs == _expected and "$seed" in _pool2
          and len(_refs) >= 3 and _refs[-1] == "__initial__.$seed",
          "refs %s vs pool %s" % (_refs, _pool2))

    # THE MERGE WALL: every link tuple in the merged multi-window
    # workflow must resolve to a node in the SAME workflow. Namespacing
    # that renames IDs but not links passes shape checks and severs the
    # graph — ComfyUI refuses it at /prompt. This wall catches it at
    # compose time (witness: 46 dangling links through naive prefixing).
    sys.path.insert(0, os.path.join(
        REPO, "plugins", "engines", "comfyui", "compose"))
    from co_script.merge import dangling_links  # noqa: E402
    import re as _re  # noqa: E402
    _wf = json.loads(
        _re.search(r"workflow: (.*)", yml2 or "{}").group(1))
    _bad = dangling_links(_wf)
    check("merged workflow link integrity",
          not _bad, "%d dangling (first: %s)" % (
              len(_bad), _bad[0] if _bad else "-"))

    # THE PATTERN PRIMITIVE WALL: the wire seed clamp is pattern policy
    # (compose/params.seed) — deterministic default, LOUD on garbage.
    sys.path.insert(0, os.path.join(
        REPO, "plugins", "engines", "comfyui", "compose"))
    from params import seed as _seed_fn  # noqa: E402
    try:
        _seed_fn("not-a-number")
        _loud = False
    except ValueError:
        _loud = True
    check("wire seed pattern primitive",
          _seed_fn(None) == 42 and _seed_fn(-3) == 42
          and _seed_fn(7) == 7 and _seed_fn("9") == 9
          and _seed_fn(7.0) == 7 and _seed_fn(-1, default=5) == 5
          and _loud,
          "clamp/refusal policy drifted")

    # THE CHAINING PRIMITIVE WALL: base + seams + mods -> ONE workflow.
    # Card params propagate via declared mods; group mods win; bad mod
    # targets refuse at construction; dangling links refuse LOUD.
    import _coscript as _cs
    import chain as _chain_mod
    _orig_render = _cs.render_card
    try:
        _cs.render_card = lambda root, model, fam, doc: {
            fam: {"class_type": fam, "inputs": dict(doc["inject"])}}
        from chain import Chain, Group, Inject
        g1 = Group(family="w", tpl="a.json",
                   inject={"N.0.seed": 1}, prompt="p1")
        g2 = Group(family="w", tpl="b.json",
                   inject={"N.0.seed": 2},
                   mods=(Inject(key="N.0.x", value="per-call"),),
                   prompt="p2")
        wf = _chain_mod.compose(
            Chain(base=g1, seams=(g2,),
                  mods=(Inject(key="N.0.x", value="card"),
                        Inject(key="N.0.knob", value=7))),
            "/tmp", "m")
        _ok = (set(wf) == {"window1_w", "window2_w"}
               and wf["window1_w"]["inputs"]["N.0.x"] == "card"      # chain mod reached base
               and wf["window1_w"]["inputs"]["N.0.knob"] == 7        # chain mod reached seam too
               and wf["window2_w"]["inputs"]["N.0.x"] == "per-call"  # group mod WINS
               and wf["window1_w"]["inputs"]["N.0.seed"] == 1)       # injects untouched
        _pool = Chain(base=g1, seams=(g2,)).pool()
        _pool_ok = (_pool == {"$prompt": "p1", "$prompt2": "p2"})
        _bad_target = _bad_links = False
        try:
            Inject(key="no-dots", value=1)
        except Exception:
            _bad_target = True
        _cs.render_card = lambda root, model, fam, doc: {
            fam: {"class_type": fam, "inputs": {"x": ["missing", 0]}}}
        try:
            _chain_mod.compose(Chain(base=g1, seams=(g2,)), "/tmp", "m")
        except RuntimeError:
            _bad_links = True
        check("chain primitive: mods propagate, group wins, LOUD gates",
              _ok and _pool_ok and _bad_target and _bad_links,
              "compose/precedence/refusal drifted")
    finally:
        _cs.render_card = _orig_render

    # refusal: unknown key refuses LOUDLY through the same door
    try:
        plugins.compose({"model": "h3-timeline",
                         "params": {"calls": [{"bogus": 1}]}},
                        "h3-timeline", "", _skel, ("comfyui",))
        check("live compose unknown-key refusal", False, "no refusal")
    except PluginsValidationError as e:
        check("live compose unknown-key refusal",
              "strict card validation failed" in str(e))

    # refusal: the identity law (image-anchored, multi-window, no identity)
    try:
        plugins.compose({"model": "h3-timeline",
                         "params": {"calls": [
                             {"image": "/tmp/a.png", "text": "a",
                              "start_frame": 0, "end_frame": 56},
                             {"text": "b", "start_frame": 56,
                              "end_frame": 112}]}},
                        "h3-timeline", "", _skel, ("comfyui",))
        check("live compose identity-law refusal", False, "no refusal")
    except PluginsValidationError as e:
        check("live compose identity-law refusal",
              "image-anchored film without params.identity" in str(e))

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
