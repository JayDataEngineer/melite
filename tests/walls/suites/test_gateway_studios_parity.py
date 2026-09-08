#!/usr/bin/env python3
"""test_gateway_studios_parity.py — FLIP-GAP studios doors wall, TS-ONLY.

Pins the pure-TS port (packages/gateway/src/doors/studios.ts over
the ROUTES mirror, minimal ctx.ts arms) serving the 4 studios doors:

  GET    /v1/studios/{tenant}/presets          (presets list)
  POST   /v1/studios/{tenant}/presets          (presets save, 201)
  DELETE /v1/studios/{tenant}/presets/{id}     (presets delete)
  GET    /v1/studios/{tenant}/base-body        (base body bytes)

There is NO /v1/models/*/provisions collection leg (no route row,
no handler — the item arm is discovery's); nothing to port there.

Method (uploads-wall precedent — shared tmp, never copy-trees):
the TS server answers over HTTP on ONE fixture tmp
(MELITE_REPO_ROOT=<tmp>/tsroot whose entries symlink the product
tree except data/, MELITE_STATE_ROOT=<tmp>/state). A wall NEVER
boots a default-root TS.

  - full CRUD lifecycle (201 sequencing user-1/user-2, ledger file
    bytes incl. sort_keys/indent/trailing-newline, float
    normalization 1.00->1.0, no *.tmp leftovers, delete rewrite +
    second-delete 404, delete-on-fresh creates nothing);
  - validation refusals (the full union/coherence/lax-coercion
    taxonomy, golden-pinned — truncation, tuple locs, branch tags,
    first-error footer);
  - traversal/hostile-tenant matrix (.. tenants, encoded dots/
    slashes, case/underscore tenants, ".." preset ids, quote
    escaping);
  - auth gate (token OFF then ON with a TS reboot: 401 literals,
    wrong token, query token refused, bearer 200s incl. bytes,
    /v1/health exempt);
  - estate freshness re-derivation per run (tenant winners +
    base_body folders + pydantic MAJOR.MINOR + filename literal —
    fails LOUD on drift; the golden legs already fail on any served
    snapshot drift).
  - the serve-side AnnyBakeParams belt (valid canonicals ride;
    a hand-corrupt ledger params_json 500s golden-pinned;
    corrupt-JSON variants pin by SHAPE — V8 texts);
  - save promotion (mesh-only stays file; valid estimated params
    promote; corrupt/dims/dialect/missing-dialect/null/int/
    list-doc params refuse — host-JSON texts shape-pinned).

Status-split traps pinned: the same PresetLedgerError is a 500 on
list but a 400 on save/delete; save success is 201; the body "id"
is dropped (sentinel user-pending); 3d/img_to_mesh +
image/mask_studio fail the tenant regex AFTER the estate hit
(list 500, save/delete 400).

Reachable-scope note: the base-body "not provisioned" miss and
the "not a declared provision" guard are unreachable on the
pinned estate (every declared base body ships; the metaclass
refuses undeclared ones at import) — implemented in TS, unwalled
live. OSError/UTF-8/corrupt-JSON host texts pin by SHAPE
(status + stable prefix), never bytes.

ORACLE DEATH 2026-09-08: re-derived TS-ONLY — the py-mirror legs
(in-process py dispatcher expectations on the same fixture, plus
the py/ts record-replay mutation comparison) are deleted per the
operator order "we do not need parity, we need to migrate, not
keep the old machinery"; the TS-SSOT golden + literal legs below
are the wall now. The mutation sequence runs ONCE (TS) with
absolute status/id asserts; the final ledger bytes pin a golden.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_studios_parity.py
"""

import json
import os
import shutil
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TOKEN = "wall-studios-token-%d" % os.getpid()

TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
TS_STUDIOS = REPO / "packages" / "gateway" / "src" / "doors" / "studios.ts"
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_studios_parity")

WANT_401 = json.dumps({
    "error": "unauthorized: missing or invalid bearer token "
             "(Authorization: Bearer <token>; set DSH_GATEWAY_TOKEN "
             "to enable)"}, indent=2).encode()

# Root normalization (the e2e-tsboot normalize() precedent): legs
# whose bytes embed the wall's own fixture root (ledger
# unreadable/validation texts naming the ledger file, ledger rows
# storing absolute body refs) are compared with the live root
# substituted for <ROOT> — the goldens freeze the <ROOT> form.
# Set per run in main(); pin() applies it uniformly (a no-op where
# the root is absent).
NORM_ROOT: bytes = b""


def normalize(body: bytes) -> bytes:
    if NORM_ROOT:
        return body.replace(NORM_ROOT, b"<ROOT>")
    return body


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


def http(port: int, path: str, method: str = "GET",
         body: bytes | None = None,
         headers: dict | None = None) -> tuple[int | None, bytes, dict]:
    """Raw bytes + lowercased headers (no JSON parse)."""
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), method=method,
        data=body, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return (r.status, r.read(),
                    {k.lower(): v for k, v in r.headers.items()})
    except urllib.error.HTTPError as e:
        return (e.code, e.read(),
                {k.lower(): v for k, v in e.headers.items()})
    except Exception as e:
        return (None, b"", {"transport": str(e)})


def pin(wire: str, slug: str, name: str, method: str = "GET",
        body: bytes = b"", headers: dict | None = None,
        ts_port: int = 0, status: int = 200) -> bytes:
    """One TS-SSOT pin: status + body bytes + content-type golden."""
    exp = golden(slug + ".json")
    ts, tb, th = http(ts_port, wire, method, body, headers)
    if ts is None:
        check(name, False, "transport %r" % (tb[:80],))
        return b""
    tb = normalize(tb)
    ok = (ts == status and tb == exp
          and th.get("content-type") == "application/json")
    note = ""
    if not ok:
        note = ("status %r want %r golden %dB ts %dB pct %r"
                % (ts, status, len(exp), len(tb),
                   th.get("content-type")))
        for i, (a, b) in enumerate(zip(exp, tb)):
            if a != b:
                note += " first-div @%d golden=%r ts=%r" % (
                    i, exp[i:i+60], tb[i:i+60])
                break
        else:
            if len(exp) != len(tb):
                note += " len-div"
    check(name, ok, note)
    return tb


def expect(target: str, name: str, method: str = "GET",
           body: bytes = b"", headers: dict | None = None,
           ts_port: int = 0, status: int = 0,
           want_id: str | None = None) -> bytes:
    """One mutation leg: absolute status (+id) asserts."""
    s, b, _ = http(ts_port, target, method, body, headers)
    ok = (s == status)
    if ok and want_id is not None:
        try:
            ok = json.loads(b)["preset"]["id"] == want_id
        except (KeyError, ValueError):
            ok = False
    check(name, ok,
          "status %r want %r body=%r" % (s, status, b[:100]))
    return b


def shape(wire: str, name: str, method: str = "GET",
          body: bytes = b"", headers: dict | None = None,
          ts_port: int = 0, status: int = 0,
          prefixes: tuple = ()) -> None:
    """Shape pin for host-text legs (status + stable prefixes)."""
    ts, tb, _ = http(ts_port, wire, method, body, headers)
    ok = (ts == status
          and all(p in tb.decode("utf-8", "replace") for p in prefixes))
    check(name, ok,
          "status %r want %r tb=%r"
          % (ts, status, tb[:120]))


# ---------------------------------------------------------------------------
# Fixture: ONE shared tmp (uploads-wall precedent — no copy-trees).
# ---------------------------------------------------------------------------

class Fx:
    base: Path
    tsroot: Path
    data: Path
    state: Path
    out: Path


def build_fixture() -> Fx:
    fx = Fx()
    fx.base = Path(tempfile.mkdtemp(prefix="wall-studios-"))
    fx.tsroot = fx.base / "tsroot"
    fx.tsroot.mkdir()
    for entry in os.listdir(REPO):
        if entry == "data":
            continue
        src = Path(REPO) / entry
        try:
            (fx.tsroot / entry).symlink_to(src, target_is_directory=src.is_dir())
        except FileExistsError:
            pass
    fx.data = fx.tsroot / "data"
    fx.data.mkdir()
    fx.state = fx.base / "state"
    fx.out = fx.state / "output"
    fx.out.mkdir(parents=True)

    # fixture runs (promotion corpus + resolvable refs)
    def run(run_id: str, files: dict) -> Path:
        d = fx.out / run_id
        d.mkdir(parents=True, exist_ok=True)
        for name, content in files.items():
            mode = "wb" if isinstance(content, bytes) else "w"
            with open(d / name, mode) as f:
                f.write(content)
        return d

    run("run9", {"mesh.glb": b"GLB" * 8})
    run("run-mesh-only", {"mesh.glb": b"GLB" * 8})
    ph6 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    sc139 = [round(0.01 * i, 4) for i in range(139)]

    def est_doc(ph=ph6, sc=sc139, dialect="estimated", extra=""):
        d = {"dialect": dialect, "phenotype": ph, "scale": sc}
        return json.dumps(d)[:-1] + extra + "}"

    run("run-valid", {"mesh.glb": b"GLB" * 8,
                      "anny_preset.json": est_doc()})
    run("run-corrupt", {"mesh.glb": b"GLB" * 8,
                        "anny_preset.json": '{"dialect": "estim'})
    run("run-dims", {"mesh.glb": b"GLB" * 8,
                     "anny_preset.json": est_doc(sc=[0.2] * 5)})
    run("run-dialect", {"mesh.glb": b"GLB" * 8,
                        "anny_preset.json": est_doc(dialect="authored")})
    run("run-nodialect", {"mesh.glb": b"GLB" * 8,
                          "anny_preset.json": json.dumps(
                              {"phenotype": ph6, "scale": sc139})})
    run("run-null-ph", {"mesh.glb": b"GLB" * 8,
                        "anny_preset.json": json.dumps(
                            {"dialect": "estimated", "phenotype": None,
                             "scale": sc139})})
    run("run-int-ph", {"mesh.glb": b"GLB" * 8,
                       "anny_preset.json": json.dumps(
                           {"dialect": "estimated", "phenotype": 5,
                            "scale": sc139})})
    run("run-listdoc", {"mesh.glb": b"GLB" * 8,
                        "anny_preset.json": "[1, 2]"})
    run("run-short-ph", {"mesh.glb": b"GLB" * 8,
                         "anny_preset.json": json.dumps(
                             {"dialect": "estimated",
                              "phenotype": [0.1] * 6,
                              "scale": [0.2] * 5})})
    return fx


def teardown_fixture(fx: Fx) -> None:
    shutil.rmtree(str(fx.base), ignore_errors=True)


def tenant_dir(fx: Fx, tenant: str) -> Path:
    d = fx.data / "tenants" / tenant
    d.mkdir(parents=True, exist_ok=True)
    return d


def write_ledger(fx: Fx, tenant: str, text: str) -> None:
    tenant_dir(fx, tenant)
    (fx.data / "tenants" / tenant / "presets.json").write_text(text)


def ledger_bytes(fx: Fx, tenant: str) -> bytes | None:
    p = fx.data / "tenants" / tenant / "presets.json"
    return p.read_bytes() if p.is_file() else None


# ---------------------------------------------------------------------------
# Keeper-side resolution (no gateway import): the model scan + the
# provision mount derive from keeper libs alone
# (melite_models.scan_engine_models, estate_config.model_paths, the
# engine endpoint file) — the same ground truth the TS door reads.
# ---------------------------------------------------------------------------

def studio_family(tenant: str):
    """The Model class claiming a studio tenant, or None (unknown)."""
    from melite_models import scan_engine_models
    for _path, cls in scan_engine_models(str(REPO)).values():
        studio = getattr(cls, "studio", None)
        if studio is not None \
                and getattr(studio, "tenant", "") == tenant:
            return cls
    return None


def estate_rows(tenant: str):
    cls = studio_family(tenant)
    if cls is None:
        return None
    return tuple(getattr(cls, "character_presets", ()))


def provision_disk(family_id: str) -> bytes:
    """Raw disk bytes of a family's declared base body (keeper path)."""
    from melite_models import scan_engine_models
    cls = None
    for _path, cand in scan_engine_models(str(REPO)).values():
        if getattr(cand, "id", "") == family_id:
            cls = cand
            break
    assert cls is not None, "no family %r" % family_id
    prov = None
    for p in (getattr(cls, "provisions", None) or ()):
        if p.name == getattr(cls, "base_body", ""):
            prov = p
            break
    assert prov is not None, "no base-body provision for %r" % family_id
    engine = getattr(cls, "engine", "") or ""
    assert engine, "family %r declares no engine" % family_id
    ep_path = REPO / "packages" / "engines" / engine / "data" / (
        engine + "_endpoint.json")
    try:
        ep = json.loads(ep_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        ep = {}
    folders = ep.get("extra_model_folders") or {}
    sub = str(folders.get(prov.folder, prov.folder)
              or prov.folder).strip().strip("/")
    if isinstance(ep.get("model_base_path"), str) \
            and ep["model_base_path"].strip():
        overrides = {"model_base_path": ep["model_base_path"].strip()}
    else:
        overrides = {}
    from estate_config import model_paths as _model_paths
    roots = _model_paths(engine, endpoint_overrides=overrides)
    disk = os.path.join(roots["read_root"], sub, prov.name)
    return Path(disk).read_bytes()


# ---------------------------------------------------------------------------
# Freshness: re-derive every estate table per run, fail LOUD on drift.
# ---------------------------------------------------------------------------

def freshness() -> None:
    import pydantic
    mm_version = pydantic.VERSION.split(".")
    src = TS_STUDIOS.read_text(encoding="utf-8")
    check("pydantic major.minor pinned (footer law)",
          mm_version[0] == "2" and mm_version[1] == "13"
          and 'PYDANTIC_MM = "2.13"' in src,
          "installed %s" % pydantic.VERSION)
    from melite_models import scan_engine_models
    scan = scan_engine_models(str(REPO))
    live_tenants: dict = {}
    for _mpath, cls in scan.values():
        studio = getattr(cls, "studio", None)
        t = getattr(studio, "tenant", "") if studio is not None else ""
        if t and t not in live_tenants:
            live_tenants[t] = studio_family(t)
    import re
    snap = {m[0]: m[1:] for m in re.findall(
        r'"([^"]+)": \{ id: "([^"]*)", engine: "([^"]*)", '
        r'baseBody: "([^"]*)", baseBodyFolder: "([^"]*)" \}', src)}
    ok = sorted(snap.keys()) == sorted(live_tenants.keys())
    note = ""
    if not ok:
        note = "snap=%r live=%r" % (sorted(snap.keys()),
                                    sorted(live_tenants.keys()))
    else:
        for t, cls in live_tenants.items():
            bb = getattr(cls, "base_body", "") or ""
            folder = ""
            if bb:
                for p in (getattr(cls, "provisions", None) or ()):
                    if p.name == bb:
                        folder = p.folder or ""
                        break
            want = (cls.id, getattr(cls, "engine", "") or "", bb, folder)
            got = (snap[t][0], snap[t][1], snap[t][2], snap[t][3])
            if want != got:
                ok = False
                note = "%s want=%r got=%r" % (t, want, got)
                break
    check("estate winners re-derived (tenant/engine/base/folder)", ok, note)
    rows = estate_rows("3d/anny") or ()
    check("estate rows live (8 anny archetypes)", len(rows) == 8,
          "got %d" % len(rows))
    from melite_models import PRESET_PARAMS_FILENAME
    check("params filename literal == constant",
          PRESET_PARAMS_FILENAME == "anny_preset.json"
          and "anny_preset.json" in src)


# ---------------------------------------------------------------------------
# Legs.
# ---------------------------------------------------------------------------

PH11 = [0.5] * 11
EST6 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]


def J(obj) -> bytes:
    return json.dumps(obj).encode()


def save_body(**kw) -> bytes:
    return J(kw)


def list_legs(ts: int) -> None:
    pin("/v1/studios/3d/anny/presets", "list-anny",
        "list anny (estate 8)", ts_port=ts)
    for tenant, slug, st in (("3d/body", "list-body", 200),
                         ("3d/img_to_mesh", "list-img-to-mesh", 500),
                         ("image/canvas-ideogram", "list-canvas-ideogram",
                          200),
                         ("image/mask_studio", "list-mask-studio", 500),
                         ("motion/motion-studio", "list-motion-studio",
                          200),
                         ("video/h3-timeline", "list-h3-timeline", 200)):
        pin("/v1/studios/%s/presets" % tenant, slug,
            "list %s" % tenant, ts_port=ts, status=st)
    pin("/v1/studios/nope/nope/presets", "list-unknown-tenant",
        "list unknown tenant", ts_port=ts, status=404)
    pin("/v1/studios/3D/ANNY/presets", "list-uppercase-tenant",
        "list uppercase tenant", ts_port=ts, status=404)
    # Trailing-slash + query-strip serve the base list's golden bytes.
    pin("/v1/studios/3d/anny/presets/", "list-anny",
        "list trailing slash", ts_port=ts)
    pin("/v1/studios/3d/anny/presets?x=1", "list-anny",
        "list query strip", ts_port=ts)
    pin("/v1/studios/3d/anny/presets", "list-put-404",
        "list PUT 404", "PUT", ts_port=ts, status=404)
    pin("/v1/studios/3d/anny/presets", "list-delete-noid-404",
        "list DELETE-no-id 404", "DELETE", ts_port=ts, status=404)
    # hostile tenants (encoded wire refuses BEFORE any ledger touch —
    # unknown-tenant 404 goldens)
    pin("/v1/studios/../../presets", "list-dotdot-404",
        "list dotdot tenant", ts_port=ts, status=404)
    pin("/v1/studios/%2e%2e/%2e%2e/presets", "list-dotdot-404",
        "list encoded-dot tenant", ts_port=ts, status=404)
    pin("/v1/studios/3d%2fanny/presets", "list-anny",
        "list encoded-slash decodes to route", ts_port=ts)
    pin("/v1/studios/3d/an'ny/presets", "list-quote-404",
        "list quote tenant", ts_port=ts, status=404)
    # estate-served floats + escapes pinned, not merely golden
    _, tb, _ = http(ts, "/v1/studios/3d/anny/presets")
    doc = json.loads(tb)
    check("list estate count + tenant echo",
          doc["tenant"] == "3d/anny" and len(doc["presets"]) == 8
          and [p["id"] for p in doc["presets"]] ==
          ["neutral", "adult_female", "adult_male", "child",
           "child_female", "teen", "hero", "elderly"])
    check("list ensure_ascii escapes",
          "\\u2014" in tb.decode() and "\u2014" not in tb.decode())
    check("list params_json authored-canonical",
          b'"params_json": "{\\"dialect\\":\\"authored\\"' in tb)
    check("list code absent on 200",
          b'"code"' not in tb)


def base_body_legs(ts: int) -> None:
    # the mount resolves through the real repo (endpoint +
    # model_paths) — ask the keeper scan itself, never hardcode the
    # weights path
    real = provision_disk("anny")
    _, tb, th = http(ts, "/v1/studios/3d/anny/base-body")
    check("base-body anny (bytes)",
          tb == real and len(real) > 0,
          "ts %dB disk %dB" % (len(tb), len(real)))
    check("base-body content-type",
          th.get("content-type") == "model/gltf-binary")
    for tenant, slug in (("3d/body", "base-body-body"),
                         ("motion/motion-studio", "base-body-motion-studio"),
                         ("3d/img_to_mesh", "base-body-img-to-mesh"),
                         ("image/canvas-ideogram",
                          "base-body-canvas-ideogram"),
                         ("image/mask_studio", "base-body-mask-studio"),
                         ("video/h3-timeline", "base-body-h3-timeline")):
        pin("/v1/studios/%s/base-body" % tenant, slug,
            "base-body %s (no base)" % slug, ts_port=ts, status=404)
    # NOTE: 3d/img_to_mesh + image/mask_studio never reach the
    # tenant-regex ledger path here — the winner lookup fires
    # first (pins the ordering).
    pin("/v1/studios/nope/nope/base-body", "base-body-unknown-404",
        "base-body unknown tenant", ts_port=ts, status=404)
    pin("/v1/studios/%2e%2e/%2e%2e/base-body",
        "base-body-encoded-dot-404",
        "base-body encoded-dot tenant", ts_port=ts, status=404)
    # slash + query serve the base body's disk bytes
    for wire, nm in (("/v1/studios/3d/anny/base-body/", "slash"),
                     ("/v1/studios/3d/anny/base-body?x=1", "query")):
        _, tb, _ = http(ts, wire)
        check("base-body %s" % nm, tb == real,
              "%dB vs %dB" % (len(tb), len(real)))
    pin("/v1/studios/3d/anny/base-body", "base-body-post-404",
        "base-body POST 404", "POST", ts_port=ts, status=404)


# Save-refusal golden table: (slug, body-kwargs or raw body).
# A None body means the leg sends its raw bytes inline below.
SAVE_REFUSALS: list[tuple[str, str]] = [
    ("save-empty", "empty body (missing label+origin)"),
    ("save-array", "array body (treated as {})"),
    ("save-missing-origin", "missing origin"),
    ("save-missing-label", "missing label"),
    ("save-empty-label", "empty label"),
    ("save-bad-origin", "bad origin"),
    ("save-extra-key", "extra key"),
    # (body-id + lax-coercion 201s live in the mutation sequence —
    # back-to-back duals cannot share one ledger)
    ("save-params-str", "params str (union)"),
    ("save-params-int", "params int (union)"),
    ("save-phenotype-2elem", "phenotype 2-elem (tuple locs)"),
    ("save-authored-bad-dims", "authored-bad-dims (union text)"),
    ("save-est-bad-scale", "est-bad-scale (union text)"),
    ("save-lc-obj", "lc-obj (tuple_type + union)"),
    ("save-lc-bad-val", "lc-bad-val (less_than_equal + union)"),
    ("save-lc-bad-name", "lc-bad-name (too_short + union)"),
    ("save-dup-morph", "dup-morph"),
    ("save-ph-range", "ph-range"),
    ("save-authored-with-scale", "authored-with-scale (extra + union)"),
    # refs (params_ref checked BEFORE body_ref — first dangling wins)
    ("save-body-traversal", "body traversal"),
    ("save-dangling-run-body", "dangling run body"),
    ("save-bare-body", "bare body refusal (long form)"),
    ("save-escapes-root", "escapes-output-root URL"),
    ("save-malformed-url", "malformed artifact URL"),
    ("save-params-before-body", "params_ref reported before body_ref"),
    ("save-parts-hair-int", "parts.hair int"),
    ("save-parts-hair-dangling", "parts.hair dangling"),
    ("save-parts-outfit-dangling", "parts.outfit dangling"),
    ("save-knobs-int-parsing", "knobs int_parsing"),
    ("save-knobs-int-from-float", "knobs int_from_float"),
    ("save-knobs-float-parsing", "knobs float_parsing"),
    ("save-knobs-bool-parsing", "knobs bool_parsing"),
    ("save-knobs-extra", "knobs extra"),
    # (knobs-lax + int-phenotype 201s live in the mutation sequence)
    # coherence (union passes, branch/dialect checks fire)
    ("save-est-with-authored", "estimated-with-authored-params"),
    ("save-base-with-ref", "base_params-with-params_ref"),
    ("save-file-with-ref", "file-with-params_ref"),
    ("save-est-params-none", "estimated params-None"),
    ("save-est-params-null", "estimated params-null-explicit"),
    ("save-base-params-none", "base params-None"),
    ("save-file-with-params", "file-with-params"),
]


def refusal_body(slug: str) -> bytes:
    if slug == "save-empty":
        return b""
    if slug == "save-array":
        return J([])
    kw: dict = {"label": "L"}
    table: dict[str, dict] = {
        "save-missing-origin": {},
        "save-missing-label": {"origin": "file"},
        "save-empty-label": {"label": "", "origin": "file"},
        "save-bad-origin": {"origin": "nope"},
        "save-extra-key": {"origin": "file", "zzz": 1},
        "save-params-str": {"origin": "base_params", "params": "nope"},
        "save-params-int": {"origin": "base_params", "params": 5},
        "save-phenotype-2elem": {"origin": "base_params",
                                 "params": {"phenotype": [0.5, 0.5]}},
        "save-authored-bad-dims": {"origin": "base_params",
                                   "params": {"phenotype": [0.5] * 10}},
        "save-est-bad-scale": {"origin": "estimated",
                               "params": {"phenotype": EST6,
                                          "scale": [0.2] * 5},
                               "params_ref": "/v1/assets/runs/run9/mesh.glb"},
        "save-lc-obj": {"origin": "base_params",
                        "params": {"phenotype": PH11,
                                   "local_changes": {"a": 0.5}}},
        "save-lc-bad-val": {"origin": "base_params",
                            "params": {"phenotype": PH11,
                                       "local_changes": [
                                           {"name": "a", "value": 9}]}},
        "save-lc-bad-name": {"origin": "base_params",
                             "params": {"phenotype": PH11,
                                        "local_changes": [
                                            {"name": "", "value": 0.5}]}},
        "save-dup-morph": {"origin": "base_params",
                           "params": {"phenotype": PH11, "local_changes": [
                               {"name": "a", "value": 0.5},
                               {"name": "a", "value": 0.1}]}},
        "save-ph-range": {"origin": "base_params",
                          "params": {"phenotype": [2.0] + [0.5] * 10}},
        "save-authored-with-scale": {"origin": "base_params",
                                     "params": {"phenotype": PH11,
                                                "scale": [0.1] * 6}},
        "save-body-traversal": {"origin": "file",
                                "body_ref": "../x"},
        "save-dangling-run-body": {"origin": "file",
                                   "body_ref":
                                   "/v1/assets/runs/norun/mesh.glb"},
        "save-bare-body": {"origin": "file", "body_ref": "mesh.glb"},
        "save-escapes-root": {"origin": "file",
                              "body_ref": "/v1/assets/runs//etc/passwd"},
        "save-malformed-url": {"origin": "file",
                               "body_ref": "/v1/assets/runs/run9"},
        "save-params-before-body": {"origin": "estimated",
                                    "params": {"phenotype": EST6,
                                               "scale": [0.2] * 139},
                                    "params_ref":
                                    "/v1/assets/runs/norun/mesh.glb",
                                    "body_ref":
                                    "/v1/assets/runs/norun2/mesh.glb"},
        "save-parts-hair-int": {"origin": "file",
                                "parts": {"hair": 42}},
        "save-parts-hair-dangling": {"origin": "file",
                                     "parts": {"hair":
                                               "/v1/assets/runs/norun/"
                                               "hair.glb"}},
        "save-parts-outfit-dangling": {"origin": "file",
                                       "parts": {"outfit": "nope.glb"}},
        "save-knobs-int-parsing": {"origin": "file",
                                   "knobs": {"resolution": "x"}},
        "save-knobs-int-from-float": {"origin": "file",
                                      "knobs": {"samples": 2.5}},
        "save-knobs-float-parsing": {"origin": "file",
                                     "knobs": {"focal_length": "x"}},
        "save-knobs-bool-parsing": {"origin": "file",
                                    "knobs": {"transparent": "maybe"}},
        "save-knobs-extra": {"origin": "file", "knobs": {"zzz": 1}},
        "save-est-with-authored": {"origin": "estimated",
                                   "params": {"phenotype": PH11},
                                   "params_ref":
                                   "/v1/assets/runs/run9/mesh.glb"},
        "save-base-with-ref": {"origin": "base_params",
                               "params": {"phenotype": PH11},
                               "params_ref":
                               "/v1/assets/runs/run9/mesh.glb"},
        "save-file-with-ref": {"origin": "file",
                               "params_ref":
                               "/v1/assets/runs/run9/mesh.glb"},
        "save-est-params-none": {"origin": "estimated",
                                 "params_ref":
                                 "/v1/assets/runs/run9/mesh.glb"},
        "save-est-params-null": {"origin": "estimated", "params": None,
                                 "params_ref":
                                 "/v1/assets/runs/run9/mesh.glb"},
        "save-base-params-none": {"origin": "base_params",
                                  "params": None},
        "save-file-with-params": {"origin": "file",
                                  "params": {"phenotype": PH11}},
    }
    kw.update(table[slug])
    if slug == "save-missing-label":
        kw.pop("label", None)
    return J(kw)


def save_refusal_legs(ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"
    # bad-JSON host texts (V8) — shape pin only (status + bad_json
    # code); the byte pin would pin engine text.
    _, tb, _ = http(ts, P, "POST", b"{bad")
    check("save bad JSON shape",
          b'"code": "bad_json"' in tb and b"bad JSON:" in tb)
    for slug, name in SAVE_REFUSALS:
        pin(P, slug, "save " + name, "POST", refusal_body(slug),
            ts_port=ts, status=400)


def lifecycle_legs(fx: Fx, ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"
    # ok-file (201, params None; the save door returns the bare
    # model_dump — NO params_json key)
    b = expect(P, "save ok-file", "POST",
               save_body(label="Meshy", origin="file"),
               ts_port=ts, status=201, want_id="user-1")
    doc = json.loads(b)
    check("save ok-file shape",
          doc["tenant"] == "3d/anny" and doc["preset"]["params"] is None
          and "params_json" not in doc["preset"])
    # body id is dropped (sentinel, never stored)
    expect(P, "save body-id dropped", "POST",
           save_body(id="zzz", label="Nope", origin="file"),
           ts_port=ts, status=201, want_id="user-2")
    # float normalization through the ledger (1.00/True -> 1.0)
    b = expect(P, "save float normalization", "POST", save_body(
        label="Norm", origin="base_params",
        params={"phenotype": [1.00] * 11,
                "local_changes": [{"name": "a", "value": True}]}),
        ts_port=ts, status=201, want_id="user-3")
    check("save normalization bytes",
          b"1.0" in b and b"1.00" not in b)
    # ledger file bytes (sort_keys/indent-2/trailing-newline)
    raw = ledger_bytes(fx, "3d/anny")
    assert raw is not None
    check("ledger trailing newline + sorted keys",
          raw.endswith(b"\n") and raw.find(b'"body_ref"')
          < raw.find(b'"description"') < raw.find(b'"id"'))
    check("ledger no tmp leftovers",
          list((fx.data / "tenants" / "3d" / "anny").glob("presets-*.tmp"))
          == [])
    # delete lifecycle
    b = expect("/v1/studios/3d/anny/presets/user-2", "delete user-2",
               "DELETE", ts_port=ts, status=200)
    check("delete shape",
          json.loads(b) == {"tenant": "3d/anny", "deleted": "user-2"})
    expect("/v1/studios/3d/anny/presets/user-2",
           "delete user-2 again 404", "DELETE", ts_port=ts, status=404)
    expect("/v1/studios/3d/anny/presets/neutral",
           "delete estate id 400", "DELETE", ts_port=ts, status=400)
    expect("/v1/studios/3d/anny/presets/user-99",
           "delete missing 404", "DELETE", ts_port=ts, status=404)
    expect("/v1/studios/3d/anny/presets/..",
           "delete dotdot preset 404", "DELETE", ts_port=ts, status=404)
    pin("/v1/studios/3d/anny/presets/user-1%2f..",
        "delete-encoded-slash-404",
        "delete encoded-slash preset (no route)",
        "DELETE", ts_port=ts, status=404)
    expect("/v1/studios/3d/body/presets/user-1",
           "delete fresh tenant 404 (no file)", "DELETE",
           ts_port=ts, status=404)
    check("delete fresh tenant creates no file",
          not (fx.data / "tenants" / "3d" / "body"
               / "presets.json").exists())
    # list now serves user-1 + user-3 only
    s, b, _ = http(ts, P)
    check("list after delete",
          s == 200 and [p["id"] for p in json.loads(b)["presets"]]
          == ["neutral", "adult_female", "adult_male", "child",
              "child_female", "teen", "hero", "elderly",
              "user-1", "user-3"])


def promotion_legs(fx: Fx, ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"

    def post(tag: str, uid: str, **kw) -> None:
        body = {"label": "P", "origin": "file"}
        body.update(kw)
        b = expect(P, "promote " + tag, "POST", J(body),
                   ts_port=ts, status=201, want_id=uid)
        if kw.get("origin", "file") == "file" and \
                "params_ref" not in kw:
            check("promote %s stays file" % tag,
                  json.loads(b)["preset"]["origin"] == "file")

    post("mesh-only stays file", "user-4",
         body_ref="/v1/assets/runs/run-mesh-only/mesh.glb")
    post("runs-relative body resolves (stays file)", "user-5",
         body_ref="run9/mesh.glb")
    post("absolute body resolves (stays file)", "user-6",
         body_ref=str(fx.out / "run9" / "mesh.glb"))
    b = expect(P, "promote valid", "POST", J(
        {"label": "P", "origin": "file",
         "body_ref": "/v1/assets/runs/run-valid/mesh.glb"}),
        ts_port=ts, status=201, want_id="user-7")
    doc = json.loads(b)
    pr = doc["preset"]
    check("promote valid shape",
          pr["origin"] == "estimated"
          and pr["params_ref"] ==
          "/v1/assets/runs/run-valid/anny_preset.json"
          and "params_json" not in pr)
    # the promotion lands in the ledger — the LIST serve path
    # attaches the estimated-canonical params_json
    s, b, _ = http(ts, P)
    rows = {p["id"]: p for p in json.loads(b)["presets"]}
    check("promote valid list + params_json",
          s == 200 and rows["user-7"]["origin"] == "estimated"
          and rows["user-7"]["params_ref"]
          == "/v1/assets/runs/run-valid/anny_preset.json"
          and rows["user-7"]["params_json"].startswith(
              '{"dialect":"estimated"'))
    # promotion refusals (400s — golden-pinned, no state change)
    def post400(slug: str, tag: str, **kw) -> None:
        body = {"label": "P", "origin": "file"}
        body.update(kw)
        pin(P, slug, "promote " + tag, "POST", J(body),
            ts_port=ts, status=400)

    post400("promote-dims-400", "dims refusal",
            body_ref="/v1/assets/runs/run-dims/mesh.glb")
    post400("promote-dialect-400", "dialect refusal",
            body_ref="/v1/assets/runs/run-dialect/mesh.glb")
    post400("promote-nodialect-400", "missing-dialect refusal",
            body_ref="/v1/assets/runs/run-nodialect/mesh.glb")
    post400("promote-null-ph-400", "null-phenotype refusal",
            body_ref="/v1/assets/runs/run-null-ph/mesh.glb")
    post400("promote-int-ph-400", "int-phenotype refusal",
            body_ref="/v1/assets/runs/run-int-ph/mesh.glb")
    post400("promote-short-scale-400", "short-scale refusal",
            body_ref="/v1/assets/runs/run-short-ph/mesh.glb")
    # host-JSON texts (V8) — shape pins only
    shape(P, "promote corrupt params (shape)", "POST",
          J({"label": "P", "origin": "file",
             "body_ref": "/v1/assets/runs/run-corrupt/mesh.glb"}),
          ts_port=ts, status=400,
          prefixes=("preset ledger: run delivered anny_preset.json but "
                    "it does not parse as estimated params (",))
    shape(P, "promote list-doc params (shape)", "POST",
          J({"label": "P", "origin": "file",
             "body_ref": "/v1/assets/runs/run-listdoc/mesh.glb"}),
          ts_port=ts, status=400,
          prefixes=("preset ledger: run delivered anny_preset.json but "
                    "it does not parse as estimated params (",))


def coercion_201_legs(ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"
    expect(P, "save knobs lax coercions", "POST", save_body(
        label="L", origin="file",
        knobs={"resolution": 2048.0, "focal_length": 50,
               "samples": True, "transparent": "yes"}),
        ts_port=ts, status=201, want_id="user-8")
    expect(P, "save int-phenotype", "POST", save_body(
        label="L", origin="base_params",
        params={"phenotype": [1] * 11}),
        ts_port=ts, status=201, want_id="user-9")
    # direct estimated save (params + resolvable params_ref)
    b = expect(P, "save estimated direct", "POST", save_body(
        label="E", origin="estimated",
        params={"phenotype": EST6, "scale": [0.2] * 139},
        params_ref="run9/mesh.glb"),
        ts_port=ts, status=201, want_id="user-10")
    doc = json.loads(b)
    check("save estimated direct shape",
          doc["preset"]["origin"] == "estimated"
          and doc["preset"]["params_ref"] == "run9/mesh.glb"
          and "params_json" not in doc["preset"])


def ledger_read_legs(fx: Fx, ts: int) -> None:
    P = "/v1/studios/3d/anny/presets"
    row = {"id": "user-1", "label": "Seed", "description": "",
           "origin": "file", "params": None, "params_ref": None,
           "body_ref": None, "parts": {"hair": None, "outfit": None},
           "knobs": {"resolution": None, "framing": None,
                     "focal_length": None, "samples": None,
                     "transparent": None}}
    write_ledger(fx, "3d/anny", json.dumps({"presets": [row]}))
    pin(P, "ledger-seeded-row", "list seeded user row", ts_port=ts)
    bad = dict(row)
    bad["id"] = "user-2"
    bad["label"] = ""
    write_ledger(fx, "3d/anny", json.dumps({"presets": [row, bad]}))
    pin(P, "ledger-invalid-row-500",
        "list invalid row 500 (ValidationError text)",
        ts_port=ts, status=500)
    write_ledger(fx, "3d/anny", json.dumps({"presets": ["hello"]}))
    pin(P, "ledger-non-dict-row-500",
        "list non-dict row 500 (model_type)", ts_port=ts, status=500)
    write_ledger(fx, "3d/anny", json.dumps({"nope": []}))
    pin(P, "ledger-no-presets-500", "list no-presets-list 500",
        ts_port=ts, status=500)
    write_ledger(fx, "3d/anny", json.dumps({"presets": "[1, 2]"}))
    pin(P, "ledger-non-list-500", "list non-list presets 500",
        ts_port=ts, status=500)
    write_ledger(fx, "3d/anny", "[1, 2]")
    pin(P, "ledger-non-dict-doc-500", "list non-dict doc 500",
        ts_port=ts, status=500)
    write_ledger(fx, "3d/anny", "{bad")
    shape(P, "list corrupt ledger (shape)", ts_port=ts, status=500,
          prefixes=("preset ledger: preset ledger ", "unreadable"))
    # estate-shadow belt (hand-edited ledger must not replace an
    # archetype) + serve-side bake belt
    shadow = dict(row)
    shadow["id"] = "neutral"
    write_ledger(fx, "3d/anny", json.dumps({"presets": [shadow]}))
    pin(P, "ledger-shadow-500", "list shadow belt 500",
        ts_port=ts, status=500)
    pin("/v1/studios/3d/anny/presets/neutral",
        "delete-corrupt-estate-400",
        "delete with corrupt ledger hits estate first 400",
        "DELETE", ts_port=ts, status=400)
    belt = dict(row)
    belt["id"] = "user-9"
    belt["origin"] = "base_params"
    belt["params"] = {"phenotype": [0.5] * 11, "local_changes": []}
    belt["params_json"] = "[1, 2]"
    write_ledger(fx, "3d/anny", json.dumps({"presets": [belt]}))
    pin(P, "ledger-bake-belt-500",
        "list bake-belt 500 (params_json not an object)",
        ts_port=ts, status=500)
    belt["params_json"] = "{bad"
    write_ledger(fx, "3d/anny", json.dumps({"presets": [belt]}))
    # a stored params_json is an EXTRA key — the row-invalid
    # refusal fires first; the serve belt is defensive-only
    # (canonical_json output always validates).
    pin(P, "ledger-stored-params-500",
        "list stored-params_json 500 (extra_forbidden)",
        ts_port=ts, status=500)
    # append against a shadowed ledger refuses (no silent replace)
    pin(P, "save-vs-shadowed-400", "save vs shadowed ledger 400", "POST",
        save_body(label="X", origin="file"), ts_port=ts, status=400)
    (fx.data / "tenants" / "3d" / "anny" / "presets.json").unlink()


def bad_tenant_legs(ts: int) -> None:
    # 3d/img_to_mesh + image/mask_studio pass the estate hit but
    # fail the tenant regex — the SAME ledger error is a 500 on
    # list, a 400 on save/delete (status-split trap).
    for tenant, slug in (("3d/img_to_mesh", "badtenant-img-to-mesh"),
                         ("image/mask_studio", "badtenant-mask-studio")):
        base = "/v1/studios/%s/presets" % tenant
        pin(base, slug + "-list-500",
            "list bad-tenant-regex 500 (%s)" % tenant,
            ts_port=ts, status=500)
        pin(base, slug + "-save-400",
            "save bad-tenant-regex 400 (%s)" % tenant,
            "POST", save_body(label="X", origin="file"),
            ts_port=ts, status=400)
        pin(base + "/user-1", slug + "-delete-400",
            "delete bad-tenant-regex 400 (%s)" % tenant,
            "DELETE", ts_port=ts, status=400)


def auth_legs(ts: int) -> None:
    bearer = {"Authorization": "Bearer " + TOKEN}
    wrong = {"Authorization": "Bearer wrong"}
    P = "/v1/studios/3d/anny/presets"
    B = "/v1/studios/3d/anny/base-body"
    for path in (P, B):
        s, b, _ = http(ts, path)
        check("auth 401 %s" % path, s == 401 and b == WANT_401,
              "st %r %r" % (s, b[:60]))
    s, b, _ = http(ts, P, "POST",
                   save_body(label="X", origin="file"))
    check("auth 401 POST save", s == 401 and b == WANT_401,
          "st %r" % (s,))
    s, _, _ = http(ts, P + "?token=" + TOKEN)
    check("auth query token refused", s == 401, "st %r" % (s,))
    s, _, _ = http(ts, P, headers=wrong)
    check("auth wrong token", s == 401, "st %r" % (s,))
    # (wiped ledger: the bearer list serves the estate 8.)
    s, b, _ = http(ts, P, headers=bearer)
    try:
        doc = json.loads(b)
    except ValueError:
        doc = {}
    check("auth bearer 200 list",
          s == 200 and doc.get("tenant") == "3d/anny"
          and [p["id"] for p in doc.get("presets", [])] ==
          ["neutral", "adult_female", "adult_male", "child",
           "child_female", "teen", "hero", "elderly"],
          "st %r" % (s,))
    s, b, th = http(ts, B, headers=bearer)
    check("auth bearer 200 base-body",
          s == 200 and b == provision_disk("anny")
          and th.get("content-type") == "model/gltf-binary",
          "st %r %dB" % (s, len(b)))
    s, _, _ = http(ts, "/v1/health")
    check("auth health exempt", s == 200, "st %r" % (s,))


def wipe_ledger(fx: Fx) -> None:
    p = fx.data / "tenants" / "3d" / "anny" / "presets.json"
    if p.is_file():
        p.unlink()
    for tmp in (fx.data / "tenants" / "3d" / "anny").glob("presets-*.tmp"):
        tmp.unlink()


def mutation_sequence(fx: Fx, ts: int) -> bytes | None:
    lifecycle_legs(fx, ts)
    promotion_legs(fx, ts)
    coercion_201_legs(ts)
    return ledger_bytes(fx, "3d/anny")


def main() -> int:
    fx = build_fixture()
    global NORM_ROOT
    NORM_ROOT = str(fx.base).encode()
    ts_proc = None
    try:
        freshness()
        env = dict(os.environ)
        env["MELITE_STATE_ROOT"] = str(fx.state)
        env["MELITE_REPO_ROOT"] = str(fx.tsroot)
        env.pop("DSH_GATEWAY_TOKEN", None)
        os.environ.pop("DSH_GATEWAY_TOKEN", None)
        ts_port, ts_proc = boot_scratch_gateway(env=env)
        print("ts-only wall on :%d" % ts_port)

        # phase 1: stateless pins (no ledger mutation — safe on the
        # shared fixture in this order; ledger_read_legs restores
        # the clean ledger before returning)
        list_legs(ts_port)
        base_body_legs(ts_port)
        save_refusal_legs(ts_port)
        ledger_read_legs(fx, ts_port)
        bad_tenant_legs(ts_port)

        # phase 2: the mutation sequence runs ONCE (TS) with
        # absolute status/id asserts; the final ledger bytes pin
        # the frozen golden.
        wipe_ledger(fx)
        ts_ledger = mutation_sequence(fx, ts_port)
        check("final ledger bytes match golden (<ROOT>-normalized)",
              ts_ledger is not None
              and normalize(ts_ledger) == golden("ledger-final.json"),
              "%r" % ((len(ts_ledger),) if ts_ledger is not None else None))
        wipe_ledger(fx)

        # auth gate (token ON: TS reboots)
        os.environ["DSH_GATEWAY_TOKEN"] = TOKEN
        reap_gateway(ts_proc)
        ts_proc = None
        env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_scratch_gateway(env=env)
        print("auth ts :%d" % ts_port)
        auth_legs(ts_port)
        os.environ.pop("DSH_GATEWAY_TOKEN", None)
    finally:
        os.environ.pop("DSH_GATEWAY_TOKEN", None)
        if ts_proc is not None:
            try:
                reap_gateway(ts_proc)
            except Exception:
                pass
        teardown_fixture(fx)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
