"""Row-3 migration parity harness: old arm (HEAD worktree) vs new arm
(working tree) on identical bodies, run in SEPARATE processes (one
tree per process — the renderer registry's file-identity tolerance
is per source file, and two checkouts of one renderer are two
files). Usage:
  python3 tools/parity_arm.py <card-subpath> <model> '<json-bodies>'
card-subpath like image/ideogram4. Bodies: JSON list of bodies.
Exit 0 all-match, 1 diff.
"""
import importlib.util
import json
import os
import random
import re
import sys

REPO = "/home/user/Documents/programs/active/inference.cpp"
HEAD = os.environ.get("PARITY_HEAD", "/tmp/estate-head")


def load(name: str, path: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def run(arm, model: str, body: dict, run_id: str):
    try:
        return arm.compose(dict(body), model, run_id)
    except Exception as e:  # noqa: BLE001 — parity surface, report verbatim
        return ("EXC", "%s: %s" % (type(e).__name__, str(e)[:160]))


def main() -> int:
    side, card, model, raw = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    bodies = json.loads(raw)
    root = REPO if side == "new" else HEAD
    sys.path.append(root + "/py")
    sys.path.append(root + "/plugins/engines/comfyui/compose")
    arm = load("compose_%s_%s" % (side, card.replace("/", "_")),
               "%s/plugins/engines/comfyui/action_cards/%s/py/compose.py"
               % (root, card))
    if side == "old":
        # the old arms' standalone schema fallback exec's schema.py
        # WITHOUT registering it in sys.modules — pydantic then
        # cannot resolve forward refs (`from __future__ import
        # annotations` schemas like input_prep's). Production loads
        # arms as proper packages, so this never fires live; the
        # harness pre-registers the module to match production.
        load("card_schema_gate",
             "%s/plugins/engines/comfyui/action_cards/%s/py/schema.py"
             % (root, card))
    out = []
    for i, b in enumerate(bodies):
        for rid in ("", "run-PARITY-1"):
            random.seed(11)
            out.append(run(arm, model, b, rid))
    print(json.dumps(out, default=str))
    return 0


if __name__ == "__main__":
    if len(sys.argv) == 4:
        # driver mode: run both sides, diff
        import subprocess
        card, model, raw = sys.argv[1], sys.argv[2], sys.argv[3]
        outs = []
        for side in ("old", "new"):
            r = subprocess.run(
                [sys.executable, __file__, side, card, model, raw],
                capture_output=True, text=True, cwd=REPO)
            if r.returncode != 0:
                print("%s side crashed:\n%s" % (side, r.stderr[-800:]))
                raise SystemExit(1)
            outs.append(json.loads(r.stdout))
        bad = 0
        nb = len(json.loads(raw))
        # staged-copy names embed wall-clock seconds
        # (input_<hex>_base) — the old/new sides run a second apart
        # by construction, so normalize the stamp before comparing
        # (the golden runner pattern-matches staged names likewise).
        _stage_re = re.compile(r"input_[0-9a-f]+_")

        def _norm(out: object) -> str:
            return _stage_re.sub(
                "input_TS_",
                json.dumps(out, default=str))
        for i in range(nb):
            for j, rid in enumerate(("", "run-PARITY-1")):
                o, n = outs[0][2 * i + j], outs[1][2 * i + j]
                if _norm(o) == _norm(n):
                    print("MATCH %d %r" % (i, rid))
                else:
                    bad += 1
                    print("DIFF %d %r\n  OLD=%s\n  NEW=%s"
                          % (i, rid, json.dumps(o, default=str)[:400],
                             json.dumps(n, default=str)[:400]))
        print("parity: %s" % ("ALL MATCH" if not bad else ("%d DIFFS" % bad)))
        raise SystemExit(1 if bad else 0)
    raise SystemExit(main())
