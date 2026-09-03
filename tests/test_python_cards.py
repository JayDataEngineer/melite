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
                           "action_cards", "image", "image-gen", "py",
                           "card.py")
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
        ("image-edit", "comfyui", "qwen-img-edit-2511",
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
                    ("dwpose", "image-edit"),
                    ("gem_soma", "image-edit"),
                    ("img-edit", "image-edit"),
                    ("krea-2", "image-gen"),
                    ("latentsync", "image-edit"),
                    ("music3", "music"),
                    ("qwen-img-edit-2511", "image-edit"),
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
    _skel = {"name": "h3-timeline", "type": "comfyui", "nodes": []}

    # phase 1: THE VALIDATION DOOR — construction is the gate; the
    # door carries NO render payload (prompts/seeds/trims are the
    # materialization pool's, via the render door's setdefault merge)
    yml1, extra1 = plugins.compose(dict(_body), "h3-timeline", "", _skel,
                                   ("comfyui",))
    check("run_id='' is the bare validation door (no payload)",
          (extra1 or {}) == {},
          "extra keys %s" % sorted((extra1 or {}).keys()))

    # door refusals: dead guide image + no calls 4xx BEFORE any run
    # registers (QUEUE LANE LAW — no zombie slots)
    _dead = dict(_body)
    _dead["params"] = dict(_dead["params"])
    _dead["params"]["calls"] = [
        {"image": "/nonexistent/wall-guide.png", "text": "x",
         "start_frame": 0, "end_frame": 56}]
    _refused_dead = False
    try:
        plugins.compose(_dead, "h3-timeline", "", _skel, ("comfyui",))
    except PluginsValidationError as e:
        _refused_dead = "guide image ref" in str(e)
    check("dead guide image refuses at the door",
          _refused_dead, "dead ref admitted at registration")

    _nocalls = dict(_body)
    _nocalls["params"] = {"seed": 7, "fps": 24, "calls": []}
    _refused_nc = False
    try:
        plugins.compose(_nocalls, "h3-timeline", "", _skel, ("comfyui",))
    except PluginsValidationError as e:
        _refused_nc = "no calls" in str(e)
    check("no-calls refuses at the door",
          _refused_nc, "no-calls admitted at registration")

    # door range laws: garbage wire values refuse LOUD at
    # construction — never a silent re-default at compile time
    import re as _re_road  # noqa: E402

    def _door_refusal(body, needle):
        try:
            plugins.compose(body, "h3-timeline", "", _skel, ("comfyui",))
            return False
        except PluginsValidationError as e:
            return needle in str(e)

    _c = dict(_body)
    _c["params"] = dict(_c["params"], seam_carry=999)
    check("out-of-range seam_carry refuses at the door",
          _door_refusal(_c, "outside [1, 64]"),
          "carry 999 silently re-defaulted")
    _c["params"] = dict(_c["params"], seam_carry="abc")
    check("non-integer seam_carry refuses at the door",
          _door_refusal(_c, "not an integer"),
          "carry 'abc' accepted")
    _c["params"] = dict(_c["params"], seam_carry=None,
                        calls=[{"text": "a", "start_frame": 90,
                                "end_frame": 0}])
    check("reversed frame span refuses at the door",
          _door_refusal(_c, "not a shot"),
          "reversed span silently rendered 56 frames")
    _cut0 = dict(_body)
    _cut0["params"] = dict(_body["params"], seam_carry=0)
    _ok0, _e0 = plugins.compose(_cut0, "h3-timeline", "run-WALL-CUT0",
                                _skel, ("comfyui",))
    check("seam_carry 0 is a legal hard cut",
          _ok0 is not None and _ok0.nodes
          and _ok0.nodes[0].node_id == "h3-film",
          "body-level 0 refused or re-defaulted")

    # the seed road owns the clamp EVERYWHERE: a garbage wire seed
    # feeds pool AND window seeds from the same clamped base (the
    # old compile re-read raw params — pool 42, windows -5)
    _g = dict(_body)
    _g["params"] = dict(_g["params"], seed=-5)
    _gyml, _gextra = plugins.compose(_g, "h3-timeline", "run-WALL-SEED",
                                     _skel, ("comfyui",))
    _gwf = _gyml.nodes[0].params["workflow"]
    _gseeds = sorted({v for n in _gwf.values() if isinstance(n, dict)
                      for k, v in n.get("inputs", {}).items()
                      if "seed" in k.lower() and isinstance(v, int)})
    check("garbage seed clamps everywhere (pool AND windows)",
          (_gextra or {}).get("inputs", {}).get("$seed") == 42
          and _gseeds == [42, 2000048],
          "seed divergence: pool %r vs windows %r"
          % ((_gextra or {}).get("inputs", {}).get("$seed"), _gseeds))

    # phase 2: the run graph (renderer seam included)
    yml2, extra2 = plugins.compose(dict(_body), "h3-timeline",
                                   "run-WALL-0001", _skel, ("comfyui",))
    # THE ACTION CARD LAW: one skeleton node = one workflow = one queue submission.
    # The skeleton has exactly one node: h3-film (not per-window nodes).
    check("run_id set: the render door emits the run graph",
          yml2 is not None and yml2.nodes
          and yml2.nodes[0].node_id == "h3-film"
          and isinstance(yml2.nodes[0].params["workflow"], dict)
          and "$prompt" in ((extra2 or {}).get("inputs", {})),
          "graph %r" % (yml2,))

    # THE CARD ROAD WALL: input_from is the scaffold's positional pool
    # contract — $prompt, $prompt2..N ascending, then $seed. The refs
    # must mirror the pool exactly, nothing missing, nothing extra.
    _refs = list(yml2.nodes[0].input_from)
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
    _wf = yml2.nodes[0].params["workflow"]
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
        g1 = Group(family="w", variant="t4r",
                   inject={"N.0.seed": 1}, prompt="p1")
        g2 = Group(family="w", variant="t4_chain",
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

    # ── THE LORA STACK WALL: typed rows, one serializer, SSOT bound ──
    # The stack is a chain.LoraStack mod (typed entries; the JSON is
    # the flavor's — no hand-built stack strings anywhere). The rows
    # live in lane data next to the model, bound to the payload's
    # Provision rows AND to the renderer template's LORA_STACK_GOLD:
    # three surfaces, one truth, drift is a test failure.
    from chain import LoraEntry, LoraStack
    _MODEL_DIR = os.path.join(
        REPO, "plugins", "engines", "comfyui", "models", "video",
        "h3-timeline")

    _ser = LoraStack(entries=(LoraEntry(lora="h3/a.safetensors",
                                  strength=0.4),
                              LoraEntry(lora="h3/b.safetensors",
                                        strength=0.6))).value
    check("lora stack mod: serializer owns the JSON",
          _ser == ('[{"on":true,"lora":"h3/a.safetensors","str":0.4,'
                   '"v":1,"a":1,"t":1},{"on":true,'
                   '"lora":"h3/b.safetensors","str":0.6,"v":1,"a":1,'
                   '"t":1}]')
          and LoraStack(entries=(LoraEntry(lora="x",
                                 strength=0.5),)).key
          == "LTX_lora_loader.0.stack_data",
          "stack bytes drifted: %r" % _ser)

    import yaml as _yaml
    _rows = (_yaml.safe_load(open(os.path.join(_MODEL_DIR,
                                               "lora_stack.yaml")))
             or {}).get("rows", [])
    _default = [r for r in _rows if r.get("role") == "default"]
    _always = [r for r in _rows if r.get("role") == "always"]
    _prov_names = set(_re_road.findall(
        r"Provision\(folder='loras/h3', name='([^']+)'",
        open(os.path.join(_MODEL_DIR, "model.py")).read()))
    from co_script.blocks import core as _core
    check("lora stack rows bind payload provisions + template gold",
          bool(_default) and bool(_always)
          and all(r["lora"] == "h3/" + n
                  for r in _rows for n in [r["lora"][3:]]
                  if r["lora"].startswith("h3/"))
          and {r["lora"][3:] for r in _rows} <= _prov_names
          and LoraStack(entries=tuple(
              LoraEntry(lora=str(r["lora"]),
                        strength=float(r["str"]))
              for r in (_default + _always))).value == _core.LORA_STACK_GOLD,
          "yaml rows / provisions / GOLD drifted apart")

    # the pattern primitive: user lora replaces default, always
    # rides; the no-model-dir + user-lora combo refuses LOUD (turbo
    # never silently drops)
    _stk = LoraStack.from_wire({"lora_name": "h3/user.safetensors",
                                "lora_strength": 0.8}, _MODEL_DIR)
    _base = LoraStack.from_wire({}, _MODEL_DIR)
    _refused = False
    try:
        LoraStack.from_wire({"lora_name": "h3/user.safetensors"}, "")
    except RuntimeError:
        _refused = True
    check("lora stack derivation: user replaces default, always rides",
          _stk is not None and len(_stk.entries) == 2
          and _stk.entries[0].lora == "h3/user.safetensors"
          and _stk.entries[0].strength == 0.8
          and _stk.entries[1].lora == _always[0]["lora"]
          and _base is not None
          and [e.lora for e in _base.entries] == [
              _default[0]["lora"], _always[0]["lora"]]
          and LoraStack.from_wire({}, "") is None and _refused,
          "stack derivation drifted")

    # live e2e: the mod rides the graph (window1 carries the stack)
    os.environ["H3_MODEL_DIR"] = _MODEL_DIR
    try:
        _lyml, _lextra = plugins.compose(
            {"model": "h3-timeline",
             "params": {"seed": 3, "fps": 24,
                        "lora_name": "h3/user.safetensors",
                        "lora_strength": 0.8,
                        "calls": [{"text": "runs the alley",
                                   "start_frame": 0, "end_frame": 56}]}},
            "h3-timeline", "run-WALL-LORA",
            {"name": "h3-timeline", "type": "comfyui", "nodes": []},
            ("comfyui",))
    except Exception:
        _lyml = None
    finally:
        os.environ.pop("H3_MODEL_DIR", None)
    _lw = json.dumps(
        (_lyml.nodes[0].params.get("workflow", {})
         if _lyml is not None and _lyml.nodes else {}))
    check("lora stack rides the composed graph",
          "h3/user.safetensors" in _lw and _always[0]["lora"] in _lw,
          "stack absent from composed workflow")

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
    # — the image must be REAL: the existence law (mode="before")
    # resolves guide refs before the semantic laws, so a dead image
    # would refuse as "guide image ref", not isolate the identity law
    open("/tmp/a.png", "wb").write(b"png")
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

    # ── THE ARTIFACT-REF PRIMITIVE WALL ─────────────────────────────
    # One law, five kinds: image/video/audio/latent/qvoice. The walk,
    # the kind contract (wrong kind refuses LOUD), dir-shaped latent
    # strips, and the transport policy SSOT (latent never uploads).
    import tempfile as _tf
    import artifact as _artifact_mod
    from artifact import Kind as _AK
    _ad = _tf.mkdtemp(prefix="artifact-wall-")
    _png = os.path.join(_ad, "guide.png"); open(_png, "wb").write(b"png")
    _wav = os.path.join(_ad, "clip.wav"); open(_wav, "wb").write(b"wav")
    _strip = os.path.join(_ad, "runs", "PRIOR", "h3_context")
    os.makedirs(_strip)
    open(os.path.join(_strip, "clip_1.safetensors"), "wb").write(b"s")
    open(os.path.join(_strip, "clip_2.safetensors"), "wb").write(b"s")

    _ok_img = _artifact_mod.resolve(_png, _AK.IMAGE)
    _ok_strip = _artifact_mod.resolve("runs/PRIOR/h3_context", _AK.LATENT,
                                      output_dir=_ad)
    _wrong = _missing = _dir_img = False
    try:
        _artifact_mod.resolve(_wav, _AK.IMAGE)
    except ValueError:
        _wrong = True
    try:
        _artifact_mod.resolve("nope.png", _AK.IMAGE, output_dir=_ad)
    except ValueError:
        _missing = True
    try:
        _artifact_mod.resolve(_strip, _AK.IMAGE)
    except ValueError:
        _dir_img = True
    check("artifact ref primitive: five kinds, one law",
          _ok_img is not None and _ok_img.path == _png
          and _ok_strip is not None
          and _ok_strip.path == _strip and _ok_strip.ref == "runs/PRIOR/h3_context"
          and _artifact_mod.resolve(None, _AK.IMAGE) is None
          and _wrong and _missing and _dir_img
          and not _artifact_mod.uploads(_AK.LATENT)
          and all(_artifact_mod.uploads(k) for k in
                  (_AK.IMAGE, _AK.VIDEO, _AK.AUDIO, _AK.QVOICE))
          and ".safetensors" not in _artifact_mod.upload_extensions()
          and ".png" in _artifact_mod.upload_extensions(),
          "kind walk/refusal/policy drifted")

    # ── CONTINUATION e2e: a latent ref flips window 1 to the chain
    # family; the ref bakes VERBATIM; the old run-id magic is gone. ──
    _cbody = {"model": "h3-timeline",
              "params": {"seed": 7, "fps": 24, "identity": "courier",
                         "context": "runs/PRIOR/h3_context",
                         "calls": [{"text": "more running",
                                    "start_frame": 0, "end_frame": 56}]}}
    os.environ["G_DEFAULT_OUTPUT_DIR"] = _ad
    try:
        _cyml, _cextra = plugins.compose(
            dict(_cbody), "h3-timeline", "run-WALL-CONT",
            None, ("comfyui",))
    except Exception:
        _cyml, _cextra = None, {}
    finally:
        os.environ.pop("G_DEFAULT_OUTPUT_DIR", None)
    import re as _re_cont
    _cwf = (_cyml.nodes[0].params["workflow"]
            if _cyml is not None and _cyml.nodes else {})
    _w1 = [n for n in _cwf if n.startswith("window1_")]
    _ctx_load = [n for n in _w1 if "CtxLoad" in n or "MotionContext" in n]
    check("continuation via latent artifact ref",
          bool(_cwf) and _cyml is not None
          and _cyml.nodes[0].node_id == "h3-film"
          and isinstance(_cextra.get("inputs"), dict)
          and any("runs/PRIOR/h3_context" == v
                  for n in _ctx_load
                  for v in _cwf[n].get("inputs", {}).values()),
          "context flip failed: %s" % (
              "no verbatim ref" if _cwf else "compose refused"))

    # ── SAME-PROMPT CHAIN SEAM: window2's context load is a LINK to
    # window1's save output (the extension's designed seam), never a
    # restated literal path — a literal is invisible to the scheduler
    # (window2 raced window1's save: FileNotFoundError on the strip)
    # and a restated coordinate (rung 6). ──
    _lwf = {}
    try:
        _lyml, _ = plugins.compose(
            {"model": "h3-timeline",
             "params": {"seed": 7, "fps": 24, "identity": "courier",
                        "calls": [{"text": "a", "start_frame": 0,
                                   "end_frame": 64},
                                  {"text": "b", "start_frame": 64,
                                   "end_frame": 128}]}},
            "h3-timeline", "run-WALL-LINK",
            {"name": "h3-timeline", "type": "comfyui", "nodes": []},
            ("comfyui",))
        _lwf = _lyml.nodes[0].params["workflow"]
    except Exception:
        _lwf = {}
    _ld = _lwf.get("window2_MiniMaxH3MotionContextLoadLatent.0",
                   {}).get("inputs", {}).get("latent_path")
    check("same-prompt chain links to the prior save",
          _ld == ["window1_MiniMaxH3MotionContextSaveLatent.0", 0],
          "window2 context load is not linked: %r" % (_ld,))

    # the old run-id surface must refuse at the VALIDATION door
    # (run_id="" — the registration gate; the render door assumes it ran)
    _old = dict(_cbody)
    _old["params"] = dict(_old["params"], continue_from="run-PRIOR-1")
    _old_refused = False
    try:
        plugins.compose(_old, "h3-timeline", "",
                        "name: h3-timeline\ntype: comfyui\n\nnodes:\n",
                        ("comfyui",))
    except PluginsValidationError:
        _old_refused = True
    check("continue_from run-id magic is extinct",
          _old_refused, "legacy surface accepted")

    # ── THE PRESET PATTERN (lane recipes as data) ─────────────────
    # presets.yaml rides beside lora_stack.yaml; the validation door
    # refuses unknown names; projection lays preset knobs as the
    # FLOOR under explicit values; preset lora rows replace the
    # 'default' stack role (always rows ride regardless).
    os.environ["H3_MODEL_DIR"] = _MODEL_DIR
    try:
        _pb = {"model": "h3-timeline",
               "params": {"seed": 3, "fps": 24,
                          "identity": "a courier",
                          "calls": [{"text": "walks",
                                     "start_frame": 0,
                                     "end_frame": 56}]}}
        def _wf(res):
            y = res[0]
            return {n["class_type"]: n for n in
                    (y.nodes[0].params.get("workflow", {}) if y.nodes
                     else {}).values()}

        _y = plugins.compose(dict(_pb), "h3-timeline", "run-WALL-PRESET",
                             {"name": "h3-timeline", "type": "comfyui",
                              "nodes": []}, ("comfyui",))
        _plain = _wf(_y).get("H3SLAAttention", {}).get("inputs", {})
        _y2 = plugins.compose(
            dict(_pb, params=dict(_pb["params"], preset="anime-boost")),
            "h3-timeline", "run-WALL-PRESET",
            {"name": "h3-timeline", "type": "comfyui", "nodes": []},
            ("comfyui",))
        _boost = _wf(_y2).get("H3SLAAttention", {}).get("inputs", {})
        check("preset knobs ride as the floor",
              _plain.get("sparsity_ratio") != _boost.get("sparsity_ratio")
              and _boost.get("sparsity_ratio") == 0.95,
              "anime-boost did not ride: %s -> %s"
              % (_plain.get("sparsity_ratio"),
                 _boost.get("sparsity_ratio")))

        _y3 = plugins.compose(
            dict(_pb, params=dict(_pb["params"], preset="anime-boost",
                                  knobs={"h3_sla_sparsity": 0.82})),
            "h3-timeline", "run-WALL-PRESET",
            {"name": "h3-timeline", "type": "comfyui", "nodes": []},
            ("comfyui",))
        _over = _wf(_y3).get("H3SLAAttention", {}).get("inputs", {})
        check("explicit knobs override the preset",
              _over.get("sparsity_ratio") == 0.82,
              "override lost: %s" % _over.get("sparsity_ratio"))

        _y4 = plugins.compose(
            dict(_pb, params=dict(_pb["params"], preset="turbo-768")),
            "h3-timeline", "run-WALL-PRESET",
            {"name": "h3-timeline", "type": "comfyui", "nodes": []},
            ("comfyui",))
        _stack = json.loads(
            _wf(_y4)["LTX_lora_loader"]["inputs"]["stack_data"])
        check("preset loras replace the default role",
              [r["lora"] for r in _stack] == [
                  _always[0]["lora"], _always[0]["lora"]],
              "turbo-768 stack wrong: %s"
              % [r["lora"] for r in _stack])

        _bad_preset = False
        try:
            plugins.compose(
                dict(_pb, params=dict(_pb["params"], preset="nope")),
                "h3-timeline", "run-WALL-PRESET",
                {"name": "h3-timeline", "type": "comfyui",
                 "nodes": []}, ("comfyui",))
        except PluginsValidationError:
            _bad_preset = True
        check("unknown preset refuses at the door",
              _bad_preset, "unknown preset accepted")

        _bad_knob = False
        try:
            plugins.compose(
                dict(_pb, params=dict(_pb["params"],
                                      knobs={"bogus_knob": 1})),
                "h3-timeline", "run-WALL-PRESET",
                {"name": "h3-timeline", "type": "comfyui",
                 "nodes": []}, ("comfyui",))
        except PluginsValidationError:
            _bad_knob = True
        check("unknown knob key refuses LOUD (never silent drop)",
              _bad_knob, "bogus knob accepted")

        # preset data integrity: every preset lora is a Provision row
        import presets as _pp
        _pl = [r.lora for p in _pp.load(_MODEL_DIR)
               for r in p.loras]
        _known = {_default[0]["lora"], _always[0]["lora"]}
        check("preset lora rows match the lane's proven weights",
              all(l in _known for l in _pl),
              "preset lora outside provision: %s" % _pl)
    finally:
        os.environ.pop("H3_MODEL_DIR", None)

    # ── THE MOD SYSTEM AUDIT (operator order, 2026-09-04: "is
    # LanPaint, ControlNet, LORA all tucked purely away under mods,
    # or did code leak out to the action card or model level?") ────
    from melite_cards import (MaskMod, LanPaintMod, LorasMod,
                              ControlNetMod, Boolean as _Bool)
    from melite_cards.serialize import scan_engine_cards
    from melite_models import scan_engine_models, load_model_py

    # WALL 1 — FIELDS: no card hand-lists a mod's fields (the
    # image-edit leak: 12 LanPaintMod fields copy-pasted onto the
    # card). A card class declaring a field a library mod owns is
    # drift — absorption is the only road onto a card surface.
    _MOD_FIELDS = {}
    for _mod in (MaskMod, LanPaintMod, LorasMod, ControlNetMod):
        for _f in _mod._fields_:
            _MOD_FIELDS.setdefault(_f.name, _mod.__name__)
    from melite_cards import Field as _FieldCls
    for pcid, (cpath, ccls) in sorted(scan_engine_cards(REPO).items()):
        _hand = {k for k, v in vars(ccls).items()
                 if isinstance(v, _FieldCls)}
        _leaks = sorted(_hand & set(_MOD_FIELDS))
        check("card %s hand-lists no mod field" % pcid, not _leaks,
              "leaked: %s" % _leaks)

    # WALL 2 — DEFAULTS: no model restates a mod knob in defaults=
    # (merged_defaults absorbs the mod's field defaults as the base
    # layer; a dict restatement is a silent override — the pose/edit
    # hand-copies this audit deleted).
    _models = scan_engine_models(
        os.path.join(REPO, "plugins", "engines", "comfyui"))
    for mid, mcls in sorted(_models.items()):
        _absorbed = set()
        for _mod in getattr(mcls, "mods", ()) or ():
            _absorbed |= {f.name for f in _mod._fields_}
        _restated = sorted(set(mcls.defaults or {}) & _absorbed)
        check("model %s restates no mod knob" % mid, not _restated,
              "restated: %s" % _restated)

    # WALL 3 — COMPOSITION: the mask component is standalone AND
    # attached (operator order: "it can be standalone AND also
    # attached to the lanpaint section"). Standalone = no lanpaint
    # coupling inside the mod; attached = lanpaint families board
    # both; truthful = a family with no mask consumer boards none.
    check("MaskMod standalone (no lanpaint coupling)",
          all(not (f.visible_when or "") for f in MaskMod._fields_),
          "coupled: %s" % [f.name for f in MaskMod._fields_
                           if f.visible_when])
    _anima = load_model_py(os.path.join(REPO, "plugins/engines/comfyui/models/image/anima/model.py"), "comfyui")
    _anima_packs = {getattr(m, "pack", "") for m in _anima.mods}
    check("anima attaches mask to lanpaint",
          _anima_packs == {"lanpaint", "mask"}, _anima_packs)
    _krea = load_model_py(os.path.join(REPO, "plugins/engines/comfyui/models/image/krea-2/model.py"), "comfyui")
    _krea_packs = {getattr(m, "pack", "") for m in _krea.mods}
    check("krea-2 boards no unconsumed mod (truthful surface)",
          _krea_packs == {"loras"}, _krea_packs)

    # WALL 4 — THE INTERLOCK: same-pack flavors MERGE across families
    # (one lanpaint surface across the five edit-lane families — the
    # loaded card above is the proof); DIVERGENT flavors refuse LOUD
    # (one shape per name).
    _editfams = [load_model_py(
        os.path.join(REPO, "plugins/engines/comfyui/models",
                     p, "model.py"), "comfyui")
        for p in ("image/img-edit", "edit/qwen-img-edit-2511",
                  "pose/dwpose", "pose/gem_soma", "pose/latentsync")]
    _lan_fams = sorted(
        m.id for m in _editfams
        for mod in m.mods if getattr(mod, "pack", "") == "lanpaint")
    check("edit lane: one lanpaint flavor shape, five families",
          _lan_fams == ["dwpose", "gem_soma", "img-edit",
                        "latentsync", "qwen-img-edit-2511"], _lan_fams)
    from melite_cards.dsl import (_assert_flavors_agree,
                                  ValidationError as _VE)

    class _FlavorA(LanPaintMod):
        pack = "lanpaint"

    class _FlavorB(LanPaintMod):
        pack = "lanpaint"
        lanpaint_enabled = _Bool(label='Diverged', default=False)
    try:
        _assert_flavors_agree("probe", _FlavorA, _FlavorB)
        check("divergent same-pack flavors refuse", False,
              "divergence accepted silently")
    except _VE:
        check("divergent same-pack flavors refuse", True)
    _assert_flavors_agree("probe", _FlavorA, LanPaintMod)
    check("identical same-pack flavors merge", True)

    # WALL 5 — CONSUMPTION: the loras mod rides low-code (the door
    # resolves entries against the model's own rows; the renderer
    # chains generic LoraLoaderModelOnly nodes; bare posts are
    # byte-stable; closed channels and unknown ids refuse LOUD).
    _gen = os.path.join(REPO, "plugins/engines/comfyui/action_cards",
                        "image", "image-gen", "py")
    sys.path.insert(0, _gen)
    import compose as _gen_mod

    _bare = {"model": "krea-2", "params": {"prompt": "x", "seed": 7}}
    _rc, _y, _ex, _e = _gen_mod.compose(_bare, "krea-2", "")
    check("loras: bare post carries no channel",
          _rc == 0 and "loras" not in (_ex or {}).get("inputs", {}),
          _e or "")

    _rc, _y, _ex, _e = _gen_mod.compose(
        {"model": "krea-2", "params": {"prompt": "x",
         "loras": [{"id": "nope"}]}}, "krea-2", "")
    check("loras: unknown id refuses LOUD (catalog is the SSOT)",
          _rc == -3 and "nope" in (_e or ""), _e or "")

    _rc, _y, _ex, _e = _gen_mod.compose(
        {"model": "anima", "params": {"prompt": "x",
         "loras": [{"id": "any"}]}}, "anima", "")
    check("loras: closed channel refuses (no loras mod declared)",
          _rc == -3 and "no loras mod" in (_e or ""), _e or "")

    _rc, _sk, _ex, _e = _gen_mod.compose(
        {"model": "krea-2", "params": {
            "prompt": "x", "seed": 7,
            "loras": [{"id": "krea2_turbo_lora_rank_64_bf16"},
                      {"id": "krea2_realism_lora", "strength": 0.4}]}},
        "krea-2", "run-wall-loras")
    _wf = _sk.nodes[0].params["workflow"] if _rc == 0 else {}
    _chain = [v for v in _wf.values()
              if v["class_type"] == "LoraLoaderModelOnly"]
    _sampler = [v for v in _wf.values()
                if v["class_type"] == "KSampler"]
    check("loras: chain wires unet -> loaders -> sampler",
          _rc == 0 and len(_chain) == 2 and _sampler
          and _sampler[0]["inputs"]["model"][1] == 0
          and _chain[1]["inputs"]["model"][0].startswith(
              "LoraLoaderModelOnly")
          and _chain[0]["inputs"]["model"][0].startswith("UNETLoader"),
          "chain: %s" % [v["inputs"] for v in _chain])

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
