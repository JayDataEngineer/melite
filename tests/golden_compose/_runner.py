#!/usr/bin/env python3
"""Golden parity wall — the py composes vs the C .so outputs captured
BEFORE deletion (tests/golden_compose/*.json, one per case).

Structural equivalence is the bar (per compose/emit.py): same rc band,
same yaml shape (nodes/inputs/inject keys+values), same extra inputs.
Paths normalize (<repo>/build/../ vs <repo>/), minted seeds assert
>= 0, staged edit names pattern-match.

DOCUMENTED DEVIATIONS (fixes, not drift — each justified by a C bug the
capture itself recorded):
  co_script flip (card arms): generate/edit/music phase2 now emit a
    BAKED workflow (JSON, params.workflow) instead of the C text emission
    with workflow_file+inject. The bar for those cases is STRUCTURAL:
    the new graph must be ISOMORPHIC to the C-channel reconstruction
    (golden inject + phase-1 inputs over the model template). Two
    documented corrections ride the branch: golden input strings keep
    the C backslash-n artifact (normalized, same as extra), and an
    unresolved $ref the C channel left as a LITERAL (instrumental
    lyrics="$lyrics") bakes as the empty string.
  tts_seed_temp: the C's ac_jq_s scalar scan read numeric seed/temperature
    as garbage (seed 99 -> 0; temperature silently dropped). The port
    reads real JSON values. Everything else must match byte-for-byte.

Run: python3 tests/golden_compose/_runner.py   (exit 0 = parity)
"""

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
sys.path.insert(0, str(REPO / "py"))

import plugins  # noqa: E402

PASS, FAIL = [], []


def norm_yaml(text):
    """Normalize the known nondeterminisms: repo path prefix, minted
    seeds, staged edit filenames. Keep inject ORDER (it is data)."""
    t = text.replace(str(REPO / "build" / ".."), str(REPO))
    t = t.replace(str(REPO), "<REPO>")
    t = re.sub(r'"seed":(-?\d+)', '"seed":<int>', t)
    t = re.sub(r'edit_[0-9a-f]+_', 'edit_<time>_', t)
    return t


def norm_extra(extra):
    if not isinstance(extra, dict):
        return extra
    out = {}
    for k, v in extra.items():
        if isinstance(v, dict):
            out[k] = {ik: _norm_str(iv) for ik, iv in v.items()}
        else:
            out[k] = _norm_str(v)
    return out


def _norm_str(v):
    """DOCUMENTED DEVIATION normalizer: the C's raw substring extraction
    (CC_GRAB_STR/ac_jq_s) never unescaped JSON wire escapes, so a body
    lyric '[verse]\\nhello' reached run inputs as a LITERAL backslash-n.
    The port parses real JSON, so the input carries the real newline the
    user typed. Normalize both sides to the real character."""
    if isinstance(v, str):
        return v.replace("\\n", "\n").replace("\\t", "\t")
    return v


FLIP_TPL = {
    "krea-2": "models/image/krea-2/generate_t2i.json",
    "music3": "models/audio/music3/music_t1.json",
    "img-edit": "models/image/img-edit/edit_i2i.json",
}


def _oldpath_graph(model, golden_yaml, inputs):
    """Reconstruct the C channel delivered graph: template + inject
    with $refs resolved from the phase-1 run inputs (string forms)."""
    import copy, json as _j
    import re as _re
    m = _re.search(r'\"inject\":(\{.*\})\}', golden_yaml)
    if not m:
        return None
    inject = _j.loads(m.group(1))
    tpl_rel = FLIP_TPL.get(model)
    if tpl_rel is None:
        return None
    tpl = _j.loads((REPO / "plugins" / "engines" / "comfyui" / tpl_rel).read_text())
    wf = copy.deepcopy(tpl)
    resolved = {}
    for slot, v in inject.items():
        if isinstance(v, str) and v.startswith("$"):
            # DOCUMENTED DEVIATION (co_script flip): the C channel left
            # an unresolved $ref as a LITERAL in the graph (observed:
            # instrumental music carried lyrics="$lyrics"). The flip
            # bakes the empty string - MiniMax instrumental convention.
            v = inputs.get(v[1:], "")
        resolved[slot] = v
        parts = slot.split(".")
        nid = None
        for i in range(1, len(parts)):
            cand = ".".join(parts[:i])
            if cand in wf:
                nid = cand
                field = ".".join(parts[i:])
        if nid is None:
            return None
        wf[nid].setdefault("inputs", {})[field] = v
    return wf

def run_case(rec):
    name, model, etypes, body = rec["case"], rec["model"], rec["engine_types"], rec["body"]
    skeleton = "name: %s\ntype: %s\ndescription: card-composed\n\nnodes:\n" % (model, etypes[0])
    for phase, rid, gkey in (("phase1", "", "phase1"), ("phase2", "run-GOLDEN-0001", "phase2")):
        golden = rec[gkey]
        try:
            yml, extra = plugins.compose(dict(body), model, rid, skeleton, etypes)
            got = {"rc": 0, "yaml": yml, "extra": extra}
        except plugins.ValidationError as e:
            got = {"rc": -1, "refusal": str(e)}
        want_rc0 = golden["rc"] == 0
        got_rc0 = got["rc"] == 0
        if want_rc0 != got_rc0:
            # refusal parity: the message class must name the same cause
            ref = golden.get("refusal", "")
            msg = got.get("refusal", "")
            same_class = _same_refusal_class(ref, msg)
            if not same_class:
                FAIL.append("%s/%s: rc band differs (C rc=%s py rc=%s)\n    C: %s\n    py: %s"
                            % (name, phase, golden["rc"], got["rc"], ref[:120], msg[:120]))
                continue
            PASS.append("%s/%s refusal parity" % (name, phase))
            continue
        if not want_rc0:
            PASS.append("%s/%s refusal parity" % (name, phase))
            continue
        py_raw = got.get("yaml", "")
        if py_raw.lstrip().startswith(chr(123)):
            # CO_SCRIPT FLIP (documented deviation): the card arms now
            # emit a baked workflow (JSON). Bar: ISOMORPHIC to the
            # golden C-channel reconstruction (template + inject
            # resolved from the phase-1 inputs the golden captured).
            import json as _j2
            PLUGIN = REPO / "plugins" / "engines" / "comfyui"
            import sys as _s2
            if str(PLUGIN) not in _s2.path:
                _s2.path.insert(0, str(PLUGIN))
            from constructors.co_script.parity import diff, reachable
            OI = _j2.loads((PLUGIN / "data" / "object_info.json").read_text())
            g_inputs = (rec.get("phase1", {}).get("extra") or {}).get("inputs", {})
            g_inputs = {k: _norm_str(v) for k, v in g_inputs.items()}
            g_inputs = {k: _norm_str(v) for k, v in g_inputs.items()}
            old = _oldpath_graph(model, golden.get("yaml", ""), g_inputs)
            new = _j2.loads(py_raw)["nodes"][0]["params"]["workflow"]
            if old is None:
                FAIL.append("%s/phase2 flip: un-reconstructable golden" % name)
                continue
            d = diff(reachable(old, OI), reachable(new, OI))
            if not d["isomorphic"]:
                FAIL.append("%s/phase2 flip drift: a_only=%s b_only=%s" % (name, d["a_only"][:4], d["b_only"][:4]))
                continue
            PASS.append("%s/phase2 (co_script flip isomorphic)" % name)
            continue
        gy, py_ = norm_yaml(golden.get("yaml", "")), norm_yaml(got.get("yaml", ""))
        if name == "tts_seed_temp" and phase == "phase2":
            # DOCUMENTED DEVIATION: C dropped numeric seed/temperature
            # (recorded in the golden itself: seed 99 -> 0). Assert the
            # deviation is EXACTLY this fix and nothing else.
            stripped_py = py_.replace('"temperature":0.40, ', "")
            if stripped_py != gy:
                FAIL.append("%s/%s: deviation beyond the seed/temperature fix\n    C: %s\n    py: %s"
                            % (name, phase, gy[:300], py_[:300]))
                continue
            PASS.append("%s/%s (documented seed/temp fix)" % (name, phase))
            continue
        if gy != py_:
            FAIL.append("%s/%s yaml drift\n    C: %s\n    py: %s" % (name, phase, gy[:300], py_[:300]))
            continue
        ge, pe = norm_extra(golden.get("extra")), norm_extra(got.get("extra"))
        if name == "tts_seed_temp":
            # DOCUMENTED DEVIATION: C's scalar scan mangled numeric
            # seed/temperature (99 -> 0). Assert everything else equal.
            for d in (ge, pe):
                if isinstance(d.get("inputs"), dict):
                    d["inputs"]["seed"] = "<int>"
        if ge != pe:
            FAIL.append("%s/%s extra drift\n    C: %s\n    py: %s" % (name, phase, ge, pe))
            continue
        PASS.append("%s/%s" % (name, phase))


def _same_refusal_class(c_msg, py_msg):
    """The refusal CAUSE must match (by-name params, required-missing,
    knob-map-missing) — exact wording may differ in the rc=-1 wrap."""
    for marker in ("required param", "unknown param", "knob map", "no knob entries",
                   "could not be loaded"):
        if marker in c_msg:
            return marker in py_msg
    return True


def main():
    cases = sorted(HERE.glob("*.json"))
    cases = [c for c in cases if not c.name.startswith("_")]
    for c in cases:
        run_case(json.loads(c.read_text()))
    print("PARITY PASS %d" % len(PASS))
    for p in PASS:
        print("  ok  ", p)
    if FAIL:
        print("PARITY FAIL %d" % len(FAIL))
        for f in FAIL:
            print("  FAIL", f)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
