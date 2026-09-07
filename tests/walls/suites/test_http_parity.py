#!/usr/bin/env python3
"""test_http_parity.py — HTTP-layer golden wall for the editor data surface.

The goldens in tests/golden_http/ were captured from the C gateway
(src/server.cpp, retired 2026-09-02) and, since C RETIREMENT (operator
order, 2026-09-03), they are the ESTATE'S OWN regression pin — the wire
contract, full stop. This wall boots the gateway on a scratch port
(scratch OUT_ROOT via env override) and asserts route-level parity for
the deck-critical GET surface. State-bearing routes (runs/drafts) are
CONTRACT-pinned in-harness, not golden-pinned — server state is not a
contract. Deviations must be documented in the route module, never here.

Run: python3 tests/walls/suites/test_http_parity.py
"""

import json
import os
import sys
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

GOLDEN = REPO / "tests" / "golden_http"
PASS = FAIL = 0


def get(port: int, path: str) -> tuple[int, dict[str, str | int | float | bool | list[str] | list[dict[str, str | int | float | bool | None]] | dict[str, str | int | float | bool | None] | None]]:
    try:
        with urllib.request.urlopen(
                "http://127.0.0.1:%d%s" % (port, path), timeout=10) as r:
            return r.status, json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "null")


def deep_equal(a: str | int | float | bool | dict[str, str | int | float | bool | list[str] | dict[str, str] | None] | list[str | int | dict[str, str]] | None, b: str | int | float | bool | dict[str, str | int | float | bool | list[str] | dict[str, str] | None] | list[str | int | dict[str, str]] | None, path: str = "$") -> str | None:
    """Structural compare; returns first divergence path or None."""
    if type(a) is not type(b) and not (
            isinstance(a, (int, float)) and isinstance(b, (int, float))):
        return "%s: type %s != %s" % (path, type(a).__name__, type(b).__name__)
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a:
                return "%s.%s missing in py" % (path, k)
            if k not in b:
                return "%s.%s missing in golden" % (path, k)
            d = deep_equal(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return "%s: len %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = deep_equal(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    if a != b:
        return "%s: %r != %r" % (path, a, b)
    return None


def shape_equal(a: str | int | float | bool | dict[str, str | int | float | bool | list[str] | dict[str, str] | None] | list[str | int | dict[str, str]] | None, b: str | int | float | bool | dict[str, str | int | float | bool | list[str] | dict[str, str] | None] | list[str | int | dict[str, str]] | None, path: str = "$") -> str | None:
    """Structural SHAPE compare (keys, nesting, list lengths) — ignores
    values.  Used for volatile data routes (runs, drafts)."""
    if type(a) is not type(b):
        return "%s: type %s != %s" % (path, type(a).__name__, type(b).__name__)
    if isinstance(a, dict):
        if sorted(a.keys()) != sorted(b.keys()):
            return "%s: keys %r != %r" % (path, sorted(a.keys()), sorted(b.keys()))
        for k in sorted(a):
            d = shape_equal(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return "%s: len %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = shape_equal(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    return None


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def main() -> int:
    try:
        port, proc = boot_scratch_gateway(
            wait_path="/v1/queue", python=sys.executable,
            tries=150, sleep=0.2, env=dict(os.environ))
    except RuntimeError as e:
        print("FATAL: %s" % e)
        return 1
    try:
        routes = [
            ("model-catalog", "deep"),
            ("forms", "deep"),
            ("form-spec?model=krea-2", "deep"),
            ("form-spec?model=krea-2-raw", "deep"),
            # OFFERED MEANS RUNNABLE (2026-09-05): z-image/anima
            # board image-gen — their form-specs are contract again
            # (goldens regenerated with the boarding). z-image-base
            # remains unoffered (its checkpoint is not provisioned).
            ("form-spec?model=z-image", "deep"),
            ("form-spec?model=anima", "deep"),
            # CORDIS CARD 2 (2026-09-07): ideogram4 rides core nodes
            # (Ideogram4Scheduler live) — its golden was unpinned.
            ("form-spec?model=ideogram", "deep"),
            # CORDIS CARD 4 (2026-09-07): tagger families were never
            # pinned — goldens captured live in the same stroke.
            ("form-spec?model=wd14", "deep"),
            ("form-spec?model=joytag", "deep"),
            ("form-spec?model=florence2", "deep"),
            ("form-spec?model=joycaption", "deep"),
            # CORDIS CARD 5 (2026-09-07): upscale-tools declares all
            # three renderer packs (SeedVR2 + KJNodes + NVIDIA RTX).
            ("form-spec?model=seedvr2_ema", "deep"),
            # CORDIS CARDS 6+7 (2026-09-07): input-prep + mask-studio
            # are stock-only (Load/Save + comfy_extras detectors).
            ("form-spec?model=input", "deep"),
            ("form-spec?model=mask-studio", "deep"),
            # CORDIS CARDS 8+9 (2026-09-07): h3-timeline resolves its
            # six packs clean (verified, already pinned); video-gen
            # declares VideoHelperSuite (VHS load/combine, both fams).
            ("form-spec?model=wan-vace", "deep"),
            ("form-spec?model=scail2-animate", "deep"),
            # CORDIS CARDS 10-13 (2026-09-07): audio declares the
            # Audiocore pack (tts/sfx/voice-lock); music3 is core.
            ("form-spec?model=qwen3-tts", "deep"),
            ("form-spec?model=qwen3-tts-base", "deep"),
            ("form-spec?model=moss-sfx", "deep"),
            ("form-spec?model=qwen3-tts-voicedesign", "deep"),
            # CORDIS CARDS 14-17 (2026-09-07): 3D/body decls verified
            # complete (renderer-vs-decl: every non-core node rides
            # the declared pack); fit+skin goldens captured+ pinned.
            ("form-spec?model=anny", "deep"),
            ("form-spec?model=fit", "deep"),
            ("form-spec?model=skin", "deep"),
            ("form-spec?model=trellis2-native", "deep"),
            ("form-spec?model=pixal3d", "deep"),
            ("form-spec?model=transfer_rig", "deep"),
            ("form-spec?model=h3-timeline", "deep"),
            ("form-spec?model=music3", "deep"),
            # NATIVE 3D/AUDIO BOARDING (2026-09-06): the cpp engines'
            # cards serve via the shared card walk — quad-remesh
            # (autoremesher) + forge (anycreature) + the renamed
            # music-native (ace-step-xl). (kimodo's text-to-motion
            # boarded here too, then retired the same day with its
            # ggml lane — ONE-implementation rule.)
            ("form-spec?model=autoremesher", "deep"),
            ("form-spec?model=anycreature", "deep"),
            ("form-spec?model=ace-step-xl", "deep"),
            # (form-spec?model=soma RETIRED 2026-09-06 with the cpp
            # ggml kimodo lane — the ONE-implementation rule)
            ("kinds", "deep"),
            ("plugins", "deep"),
            ("health", "deep"),
            ("themes", "deep"),
            ("tags", "deep"),
            ("services", "deep"),
            ("right-panes", "deep"),
            ("ui-slots", "deep"),
            ("tools", "deep"),
            ("shell", "deep"),
            ("models", "deep"),
        ]
        for r, mode in routes:
            fn = r.translate(str.maketrans("/?=&", "____"))
            gpath = GOLDEN / ("%s.json" % fn)
            if not gpath.exists():
                check("GET /v1/%s" % r, False, "no golden %s" % gpath.name)
                continue
            code, body = get(port, "/v1/%s" % r)
            golden = json.loads(gpath.read_text())
            if code != 200:
                check("GET /v1/%s" % r, False, "status %d" % code)
                continue
            cmp_fn = shape_equal if mode == "shape" else deep_equal
            div = cmp_fn(golden, body)
            check("GET /v1/%s" % r, div is None, div or "")

        # queue door wire contract
        code, body = get(port, "/v1/queue")
        check("GET /v1/queue shape", code == 200 and set(body) >= {
            "queued", "running", "active", "queued_ids"}, str(body)[:80])

        # C RETIREMENT: state-bearing routes are CONTRACT-pinned, not
        # golden-pinned — the deleted C-era snapshots (174 runs / 546
        # drafts) captured one dead server's state: history, not
        # contract. The pin: envelope + count invariant + row shape.
        # count invariant (2026-09-05 correction): RunsEnvelope DECLARES
        # count = total collected entries, pre-limit, >= len(runs) —
        # the C contract, per run_wire.RunsEnvelope. The old == pin
        # held only while the estate fit under the 200-row page; with
        # 686 collected sidecars the honest invariant is >=.
        code, body = get(port, "/v1/flows/runs")
        rows = body.get("runs", []) if isinstance(body, dict) else []
        check("GET /v1/flows/runs contract",
              code == 200 and set(body) >= {"count", "runs"}
              and body["count"] >= len(rows)
              and all(set(r) >= {"run_id", "status"} for r in rows),
              str(body)[:80])
        code, body = get(port, "/v1/flows/drafts")
        rows = body.get("drafts", []) if isinstance(body, dict) else []
        check("GET /v1/flows/drafts contract",
              code == 200 and set(body) >= {"count", "drafts"}
              and body["count"] == len(rows)
              and all(set(d) >= {"draft_id", "model"} for d in rows),
              str(body)[:80])

        # unknown run: sidecar-aware 404 stays loud
        code, body = get(port, "/v1/flows/status/run-does-not-exist-000")
        check("status unknown run -> 404", code == 404, str(code))

        # loud refusal band: a cardless start ({}, no draft_id) is 400
        # BEFORE any run registration (CARD BIRTH LAW 2026-09-06 on
        # top of QUEUE LANE LAW)
        req = urllib.request.Request(
            "http://127.0.0.1:%d/v1/flows/start" % port,
            data=b"{}", headers={"content-type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=10)
            check("start {} -> 400", False, "accepted!")
        except urllib.error.HTTPError as e:
            check("start {} -> 400", e.code == 400, str(e.code))
    finally:
        reap_gateway(proc)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
