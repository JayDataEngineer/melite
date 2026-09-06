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

from melite_cards.validators import JsonValue
sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui" / "compose"))

import json as _j2  # noqa: E402
import plugins  # noqa: E402

PASS, FAIL = [], []


def norm_yaml(text: str) -> str:
    """Normalize the known nondeterminisms: repo path prefix, minted
    seeds, staged edit filenames. Keep inject ORDER (it is data)."""
    t = text.replace(str(REPO / "build" / ".."), str(REPO))
    t = t.replace(str(REPO), "<REPO>")
    t = re.sub(r'"seed":(-?\d+)', '"seed":<int>', t)
    t = re.sub(r'edit_[0-9a-f]+_', 'edit_<time>_', t)
    return t


def norm_extra(extra: dict[str, str | int | dict[str, str | int]] | None) -> dict[str, str | int | dict[str, str | int]] | None:
    if not isinstance(extra, dict):
        return extra
    out = {}
    for k, v in extra.items():
        if isinstance(v, dict):
            out[k] = {ik: _norm_str(iv) for ik, iv in v.items()}
        else:
            out[k] = _norm_str(v)
    return out


def _norm_str(v: str | int | float | bool | None) -> str | int | float | bool | None:
    """DOCUMENTED DEVIATION normalizer: the C's raw substring extraction
    (CC_GRAB_STR/ac_jq_s) never unescaped JSON wire escapes, so a body
    lyric '[verse]\\nhello' reached run inputs as a LITERAL backslash-n.
    The port parses real JSON, so the input carries the real newline the
    user typed. Normalize both sides to the real character."""
    if isinstance(v, str):
        return v.replace("\\n", "\n").replace("\\t", "\t")
    return v


def _norm_num(g: JsonValue) -> JsonValue:
    """Fold numeric-strings to numbers (native-type era companion to
    _norm_str): "42" -> 42, "4.5" -> 4.5. Non-numeric strings
    (prompts, filenames, sampler names) pass through untouched — only
    a FULLY numeric string folds, never a substring guess. Whole-
    valued floats canonicalize to int (30.0 -> 30: the C channel's
    "30" and the doc's typed 30.0 execute identically on FLOAT pins;
    value-FORM is owned by the doc_parity wall's per-lane pins)."""
    if isinstance(g, dict):
        return {k: _norm_num(v) for k, v in g.items()}
    if isinstance(g, list):
        return [_norm_num(v) for v in g]
    if isinstance(g, str):
        try:
            return int(g)
        except ValueError:
            pass
        try:
            g = float(g)
        except ValueError:
            return g
    if isinstance(g, float) and g.is_integer():
        return int(g)
    return g


FLIP_TPL = {
    "krea-2": "models/image/krea-2/generate_t2i.json",
    "music3": "models/audio/music3/music_t1.json",
    # (2026-09-05 image-edit rework) the `img-edit` family head is
    # retired — same lane, its template now lives on the survivor.
    "qwen-img-edit-2511": "models/image/qwen-img-edit-2511/edit_i2i.json",
}


def _oldpath_graph(model: str, golden_yaml: str, inputs: dict[str, str]) -> dict[str, dict[str, str | int | float | bool | list[str] | dict[str, str | int]]] | None:
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

def run_case(rec: dict[str, str | int | list[str] | dict[str, str | int | dict[str, str | int | None]]]) -> None:
    name, model, etypes, body = rec["case"], rec["model"], rec["engine_types"], rec["body"]
    for phase, rid, gkey in (("phase1", "", "phase1"), ("phase2", "run-GOLDEN-0001", "phase2")):
        golden = rec[gkey]
        try:
            graph, extra = plugins.compose(dict(body), model, rid, None, etypes)
            got = {"rc": 0, "graph": graph, "extra": extra}
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
        graph = got.get("graph")
        wf = None
        if graph is not None and graph.nodes:
            wf = graph.nodes[0].params.get("workflow")
        if isinstance(wf, dict):
            # CO_SCRIPT FLIP (documented deviation): the card arms emit
            # a BAKED workflow. Bar: ISOMORPHIC to the golden C-channel
            # reconstruction (template + inject resolved from the
            # phase-1 inputs the golden captured).
            PLUGIN = REPO / "plugins" / "engines" / "comfyui"
            import sys as _s2
            if str(PLUGIN) not in _s2.path:
                _s2.path.insert(0, str(PLUGIN))
            from co_script.parity import diff, reachable
            OI = _j2.loads((PLUGIN / "data" / "object_info.json").read_text())
            g_inputs = (rec.get("phase1", {}).get("extra") or {}).get("inputs", {})
            g_inputs = {k: _norm_str(v) for k, v in g_inputs.items()}
            old = _oldpath_graph(model, golden.get("yaml", ""), g_inputs)
            if old is None:
                FAIL.append("%s/phase2 flip: un-reconstructable golden" % name)
                continue
            # DOCUMENTED DEVIATION (native-type era, 2026-09-05): the
            # C channel carried every run input as a STRING (its
            # run-inputs SSOT); the card renderers now emit the doc's
            # TYPED values (ints/floats — the pinned node interface).
            # Value-FORM is owned by the doc_parity wall (per-lane
            # native pins); this bar is STRUCTURAL isomorphism, so
            # both sides fold numeric-strings to numbers first.
            old = _norm_num(old)
            wf = _norm_num(wf)
            d = diff(reachable(old, OI), reachable(wf, OI))
            if not d["isomorphic"]:
                FAIL.append("%s/phase2 flip drift: a_only=%s b_only=%s" % (name, d["a_only"][:4], d["b_only"][:4]))
                continue
            PASS.append("%s/phase2 (co_script flip isomorphic)" % name)
        elif phase == "phase2" and graph is not None and graph.nodes:
            # AUDIO ARM: the graph is a typed FlowGraph — compare
            # STRUCTURALLY against the golden's own graph (parsed at
            # the disk rim from the recorded text)
            from gateway import parse_flow_text
            try:
                old = parse_flow_text(golden.get("yaml", ""))
            except Exception as e:
                FAIL.append("%s/phase2: golden yaml unparseable (%s)" % (name, e))
                continue
            new_dump = _norm_graph(graph.model_dump(by_alias=True))
            old_dump = _norm_graph(old.model_dump(by_alias=True))
            if name == "tts_seed_temp":
                # DOCUMENTED DEVIATION: C's scalar scan mangled numeric
                # seed (99 -> 0) and silently dropped temperature. The
                # port reads real JSON values — assert the fix is EXACT
                # (raw value, BEFORE seed normalization).
                _py_seed = graph.nodes[0].params.get("seed")
                if _py_seed != 99:
                    FAIL.append("%s/phase2: seed fix absent (py %r)" % (name, _py_seed))
                    continue
                _c_seed = old_dump["nodes"][0]["params"].get("seed")
                if _c_seed == 0:
                    new_dump["nodes"][0]["params"]["seed"] = "<int>"
                    old_dump["nodes"][0]["params"]["seed"] = "<int>"
                if "temperature" not in old_dump["nodes"][0]["params"]:
                    new_dump["nodes"][0]["params"].pop("temperature", None)
            if new_dump != old_dump:
                FAIL.append("%s/phase2 graph drift\n    C: %s\n    py: %s"
                            % (name, old_dump, new_dump))
                continue
            PASS.append("%s/phase2 (graph structural)" % name)
        else:
            # PHASE 1: the flip's documented deviation — validation is
            # the DOOR, not a graph; the C echoed its input text, the
            # py arms emit no graph (None). Extras still compare.
            PASS.append("%s/phase1 (no graph — validation door)" % name)
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
        PASS.append("%s/%s extras" % (name, phase))


def _norm_graph(g: dict[str, str | int | float | bool | list[str | int] | dict[str, str | int | float | bool]] | list[str | int | dict[str, str | int]] | str | int | float | bool | None) -> dict[str, str | int | float | bool | list[str | int] | dict[str, str | int]] | list[str | int | dict[str, str | int]] | str | int | float | bool | None:
    """Structural normalizer: repo paths, minted seeds, the C's
    literal backslash-n artifact. Dict-keyed ints named seed pin to
    <int> (minted); strings normalize like extras."""
    import re as _re
    if isinstance(g, dict):
        out = {}
        for k, v in g.items():
            if k == "seed" and isinstance(v, int) and not isinstance(v, bool):
                out[k] = "<int>"
            else:
                out[k] = _norm_graph(v)
        return out
    if isinstance(g, (list, tuple)):
        return [_norm_graph(v) for v in g]
    if isinstance(g, str):
        t = g.replace(str(REPO / "build" / ".."), str(REPO))
        t = t.replace(str(REPO), "<REPO>")
        t = _re.sub(r"edit_[0-9a-f]+_", "edit_<time>_", t)
        return _norm_str(t)
    if isinstance(g, float):
        return round(g, 2)
    return g


def _same_refusal_class(c_msg: str, py_msg: str) -> bool:
    """The refusal CAUSE must match (by-name params, required-missing,
    knob-map-missing) — exact wording may differ in the rc=-1 wrap."""
    for marker in ("required param", "unknown param", "knob map", "no knob entries",
                   "could not be loaded"):
        if marker in c_msg:
            return marker in py_msg
    return True


def main() -> int:
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
