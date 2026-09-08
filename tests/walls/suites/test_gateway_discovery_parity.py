#!/usr/bin/env python3
"""test_gateway_discovery_parity.py — FLIP-GAP TS discovery READ doors wall (TS-ONLY).

Proves the TypeScript port (packages/gateway/src/doors/discovery.ts
over the ROUTES mirror, ctx.ts arms) serves the 10 discovery doors
with the pinned TS contract:

  GET /v1/model-catalog                  (discovery.ts catalog arm)
  GET /v1/model-catalog/*                (discovery.ts model-row arm)
  GET /v1/models/*/provisions/*          (discovery.ts provision arm — bytes)
  GET /v1/forms                          (discovery.ts forms arm)
  GET /v1/kinds                          (discovery.ts kinds arm)
  GET /v1/form-spec                      (discovery.ts form-spec arm — ?model=)
  GET /v1/loras                          (discovery.ts loras arm — ?model=)
  *   /v1/flows/families/param-schemas   (discovery.ts all-families arm)
  GET /v1/schema                         (discovery.ts schema arm)
  GET /v1/flows/families/*/param-schema  (discovery.ts one-family arm)

Method: boot the TS server alone (MELITE_STATE_ROOT=ts_root fixture
root, ephemeral port, QUEUE LANE LAW — never the default root; the
live production gateway holds that lock), then serve every shape over
HTTP and assert the frozen TS contract — status + body bytes +
content-type against the goldens in
golden_ts/test_gateway_discovery_parity/ (causes.md there):

  - the catalog + every model row (ids enumerated from the frozen
    catalog file — the matrix grows with the estate, never a
    hardcoded list);
  - forms / kinds / schema / all-families envelopes (incl. every
    HTTP method on the "*" param-schemas arm);
  - the ?model= query-variant matrix (missing/empty/bare/repeated/
    blank-first/unknown/unsafe — the TS door drops blank values, so
    ?model=&model=anny serves anny; the matrix is frozen, never
    re-spelled);
  - every family param-schema + unknown-family refusal shapes;
  - provisions refusals (unknown family / unknown provision /
    declared-none) + the on-disk happy-path legs with content-type +
    content-length honesty. Full-bytes legs run only up to
    FULL_BYTES_MAX (256MB); mid-size provisions (up to PREFIX_MAX)
    get status + content-type + content-length + first-64KB prefix
    pins (the door materializes the whole file before first byte, so
    a prefix read never holds GBs in the wall); giant provisions
    above PREFIX_MAX SKIP with a note (materializing GBs per side
    OOM-kills the runner under wall-box pressure — flaky, never a
    pin). Declared-but-missing provisions are SKIPPED with a note
    (on-demand fetch through the rail is network in a wall — flaky,
    never a pin). On-disk artifact BYTES are never frozen (machine
    model files, not door behavior — a re-downloaded model changes
    bytes without the door moving; the wall pins status/headers/
    honesty + double-GET equality live instead);
  - SYNTHETIC-FIXTURE provisions legs (the >2GB streaming pin):
    the mount resolves through the real store (endpoint file +
    model_paths read_root — machine paths, never fixtures), so the
    wall plants a temp file at a DECLARED-but-missing mount path
    (never clobbering — the path must not exist; deleted in a
    finally so the slot returns to missing): a 16KB known-bytes
    file served byte-exact TS-only (the small-file regression leg
    for the chunked read path, incl. a Range-header-ignored pin —
    the door never parses Range here, so Range rides ignored to
    the full 200) and a 2.5GB SPARSE file (truncate — disk cost
    ~0, past node's 2GiB readFileSync ceiling) served with status
    + content-type + content-length + STREAMED byte-count pins
    (drained in chunks and discarded — GBs never sit in the wall
    client);
  - trailing-slash + query-strip normalization, method-mismatch
    404s, ensure_ascii + float-literal pins;
  - auth-gate legs with the token OFF and ON (reboot TS only: 401
    shapes, wrong token, query token refused on HTTP, /v1/health
    exempt, bearer 200s — bearer bodies equal the frozen goldens);
  - node -e unit legs for the TS-only deployment envelopes (503
    missing-catalog, 503 unparseable-catalog).
  - FROZEN TRUTH (the freshness wall's successor): the regen
    comparison against the live py tree retired with the oracle
    (the export tool drove the retired serving stack — post-py the
    frozen file IS the truth, per the header note below). The wall
    pins the file instead: present, parses, non-empty, and the
    goldens agree with it (no golden/frozen skew).

Roots: decl scans are REPO-anchored (catalog/forms/schema read the
product tree, never MELITE_STATE_ROOT), so no fixture tree is
needed for the JSON arms — the fixture root isolates the
single-writer lock only. The live production gateway holds the
default lock — a wall NEVER boots a default-root TS (the TS boot
without one would contend with live state).

The TS side serves the frozen export natively (no runtime python —
the stdio bridge is retired). Production serves the same file; a
missing/unparseable file 503s loud (post-py the file is the frozen
truth).

ORACLE DEATH 2026-09-08: re-derived TS-ONLY from the dual parity
wall per the operator order "we do not need parity, we need to
migrate, not keep the old machinery". The retired serving oracle is
deleted in a later stage (not here): the py boot + every py HTTP
leg + the py gateway imports (provision mount / family lookup) +
the freshness regen subprocess died here; ids/mounts now resolve
via keeper libs (melite_models scan, estate_config model paths —
estate model scan, never the serving oracle) and the frozen
catalog. The 46 stale py-vs-ts byte diffs from card-work drift die
with the py side — TS wins, its bytes are the goldens.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_discovery_parity.py
"""

import http.client as http_client
import json
import os
import shutil
import subprocess
import sys
import tempfile

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
TOKEN = "wall-discovery-token-%d" % os.getpid()

TS_DISCOVERY = REPO / "packages" / "gateway" / "src" / "doors" / "discovery.ts"
TS_CATALOG = (REPO / "packages" / "gateway" / "data"
              / "discovery-catalog.json")
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts"
              / "test_gateway_discovery_parity")

FULL_BYTES_MAX = 256 * 1024 * 1024
PREFIX_MAX = 1024 * 1024 * 1024
PREFIX_LEN = 64 * 1024

# Synthetic-fixture sizes: the small regression rides real known
# bytes (16KB — every byte value, byte-exact TS-only); the giant leg
# rides a 2.5GB SPARSE file (past node's 2GiB readFileSync ceiling
# — the flip-debt pin; truncate keeps disk cost ~0).
SYNTH_SMALL = bytes(list(range(256)) * 64)
SYNTH_GIANT_SIZE = 2684354560  # 2.5GiB


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def http(port: int, path: str, method: str = "GET",
         headers: dict | None = None) -> tuple[int | None, bytes, dict]:
    """Raw bytes + lowercased headers (no JSON parse — byte-equality
    against the goldens). Speaks raw HTTP (no client-side path
    normalization — `..`, over-encoded and double-slash paths ride
    the wire exactly)."""
    conn = http_client.HTTPConnection("127.0.0.1", port, timeout=60)
    try:
        conn.request(method, path, headers=headers or {})
        r = conn.getresponse()
        return (r.status, r.read(),
                {k.lower(): v for k, v in r.getheaders()})
    except Exception as e:
        return (None, b"", {"transport": str(e)})
    finally:
        conn.close()


GOLDENS: dict[str, dict] = {}


def load_goldens() -> None:
    for p in sorted(GOLDEN_DIR.glob("*.json")):
        if p.name == "causes.md":
            continue
        GOLDENS[p.stem] = json.loads(p.read_text(encoding="utf-8"))


def ts_golden(name: str, port: int, path: str,
              method: str = "GET", headers: dict | None = None) -> None:
    """One TS-served shape pinned to its frozen golden: status +
    body bytes + content-type, plus content-length honesty."""
    env = GOLDENS[name]
    want_status = env["status"]
    want_body = env["body"].encode("utf-8")
    st, body, h = http(port, path, method, headers)
    if st is None:
        check(name, False, "transport %r" % (body[:80],))
        return
    ok = (st == want_status and body == want_body
          and h.get("content-type") == env["content_type"]
          and h.get("content-length") == str(len(want_body)))
    note = ""
    if not ok:
        note = ("status %r/%r %dB/%dB pct %r/%r len %r/%r"
                % (st, want_status, len(body), len(want_body),
                   h.get("content-type"), env["content_type"],
                   h.get("content-length"), str(len(want_body))))
        for i, (a, b) in enumerate(zip(body, want_body)):
            if a != b:
                note += " first-div @%d live=%r want=%r" % (
                    i, body[i:i + 40], want_body[i:i + 40])
                break
        else:
            if len(body) != len(want_body):
                note += " len-div"
    check(name, ok, note)


def ts_alias(port: int, path: str, base: str, name: str) -> None:
    """A normalization variant (trailing slash / query strip) that
    must serve the base golden's bytes exactly."""
    want_body = GOLDENS[base]["body"].encode("utf-8")
    st, body, _ = http(port, path)
    check(name, st == 200 and body == want_body,
          "status %r %dB/%dB" % (st, len(body), len(want_body)))


def head_prefix(port: int, path: str) -> tuple[int | None, bytes, dict]:
    """status + headers + first PREFIX_LEN bytes, then close early —
    pins giant-provision parity without draining GBs into the wall."""
    conn = http_client.HTTPConnection("127.0.0.1", port, timeout=900)
    try:
        conn.request("GET", path)
        r = conn.getresponse()
        head = r.read(PREFIX_LEN)
        return (r.status, head,
                {k.lower(): v for k, v in r.getheaders()})
    except Exception as e:
        return (None, b"", {"transport": str(e)})
    finally:
        conn.close()


def ts_prefix(port: int, path: str, name: str, size: int) -> None:
    st, head, h = head_prefix(port, path)
    if st is None:
        check(name, False, "transport %r" % (head[:80],))
        return
    ok = bool(st == 200 and len(head) == PREFIX_LEN
                and h.get("content-type")
                and h.get("content-length") == str(size)
                and size > FULL_BYTES_MAX)
    check(name, ok,
          "status %r pre %dB pct %r len %r" % (
              st, len(head), h.get("content-type"),
              h.get("content-length")))


def stream_count(port: int, path: str) -> tuple[int | None, int, bytes,
                                              bytes, dict]:
    """status + headers + TOTAL byte count, drained in 4MB chunks and
    discarded — pins >2GB provision streaming without materializing
    GBs in the wall client. Returns (status, total, head16, tail16,
    headers)."""
    conn = http_client.HTTPConnection("127.0.0.1", port, timeout=900)
    try:
        conn.request("GET", path)
        r = conn.getresponse()
        total = 0
        head = b""
        tail = b""
        while True:
            chunk = r.read(4 * 1024 * 1024)
            if not chunk:
                break
            if len(head) < 16:
                head = (head + chunk)[:16]
            tail = (tail + chunk)[-16:]
            total += len(chunk)
        return (r.status, total, head, tail,
                {k.lower(): v for k, v in r.getheaders()})
    except Exception as e:
        return (None, -1, b"", b"", {"transport": str(e)})
    finally:
        conn.close()


def frozen_ids() -> tuple[list[str], list[str]]:
    """Model ids (catalog keys) + family ids, from the frozen catalog
    file — the matrix grows with the estate, never a hardcoded list.
    (The retired wall read these LIVE from the py oracle's port.)"""
    frozen = json.loads(TS_CATALOG.read_text(encoding="utf-8"))
    return (sorted(frozen["catalog"]["models"].keys()),
            sorted(frozen.get("family_ids", [])))


def keeper_mount(engine: str, folder: str, name: str) -> str | None:
    """Resolve a declared provision to its disk path through keeper
    libs ONLY (endpoint file + estate model paths — the estate model
    scan, never the serving oracle): the mount derivation the TS
    door ports (packages/gateway/src/doors/discovery.ts provision
    mount). None = the family declares no engine."""
    if not engine:
        return None
    import json as _json
    ep_path = (REPO / "packages" / "engines" / engine / "data"
               / (engine + "_endpoint.json"))
    try:
        ep = _json.loads(ep_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        ep = {}
    if not isinstance(ep, dict):
        ep = {}
    folders = ep.get("extra_model_folders") or {}
    if not isinstance(folders, dict):
        folders = {}
    sub = str(folders.get(folder, folder) or folder).strip().strip("/")
    if isinstance(ep.get("model_base_path"), str) \
            and ep["model_base_path"].strip():
        overrides = {"model_base_path": ep["model_base_path"].strip()}
    else:
        overrides = {}
    from estate_config import model_paths as _model_paths
    roots = _model_paths(engine, endpoint_overrides=overrides)
    return os.path.join(roots["read_root"], sub, name)


def provision_plan() -> tuple[list[tuple[str, str, int]],
                              list[tuple[str, str]], str]:
    """(on-disk declared provisions + size, declared-but-missing,
    declared-none family) — the mount resolves through the real repo
    (endpoint file + model_paths, keeper libs above), so missing ones
    skip (rail fetch = network). First class per family id wins (the
    door's first-match resolution)."""
    from melite_models import scan_engine_models
    first: dict[str, object] = {}
    for _, cls in scan_engine_models(str(REPO)).values():
        fid = getattr(cls, "id", "")
        if fid and fid not in first:
            first[fid] = cls
    on_disk: list[tuple[str, str, int]] = []
    missing: list[tuple[str, str]] = []
    none_fam = ""
    for fid in sorted(first):
        cls = first[fid]
        provs = getattr(cls, "provisions", None) or ()
        if not provs and not none_fam:
            none_fam = fid
        engine = getattr(cls, "engine", "") or ""
        for prov in provs:
            disk = keeper_mount(engine, getattr(prov, "folder", "") or "",
                                prov.name)
            if disk is None:
                continue
            if os.path.isfile(disk):
                on_disk.append((fid, prov.name, os.path.getsize(disk)))
            else:
                missing.append((fid, prov.name))
    return on_disk, missing, none_fam


def main() -> int:
    load_goldens()
    base = None
    ts_proc = None
    try:
        base = __import__("pathlib").Path(
            tempfile.mkdtemp(prefix="wall-discovery-"))
        ts_root = base / "ts-root"
        ts_root.mkdir(parents=True)

        ts_env = dict(os.environ)
        ts_env["MELITE_STATE_ROOT"] = str(ts_root)
        ts_env.pop("DSH_GATEWAY_TOKEN", None)
        ts_port, ts_proc = boot_scratch_gateway(env=ts_env)
        print("ts :%d (TS-only)" % ts_port)

        model_ids, family_ids = frozen_ids()
        check("frozen catalog non-empty", len(model_ids) > 0,
              "got %d" % len(model_ids))
        check("frozen families non-empty", len(family_ids) > 0,
              "got %d" % len(family_ids))

        # ── catalog ──
        ts_golden("catalog", ts_port, "/v1/model-catalog",
                  )
        ts_alias(ts_port, "/v1/model-catalog/", "catalog",
                 "catalog trailing slash")
        ts_alias(ts_port, "/v1/model-catalog?x=1", "catalog",
                 "catalog query strip")
        for mid in model_ids:
            ts_golden("catalog-row-%s" % mid, ts_port,
                      "/v1/model-catalog/" + mid,
                      )
        for weird, slug in (("nope-xyz", "nope-xyz"), ("..", "dotdot"),
                            ("ANNY", "ANNY"),
                            ("%2e%2e%2fx", "pct2e"), ("a%2Fb", "a-pct2Fb")):
            ts_golden("catalog-unknown-%s" % slug, ts_port,
                      "/v1/model-catalog/" + weird,
                      )
        ts_alias(ts_port, "/v1/model-catalog/anny/", "catalog-row-anny",
                 "catalog row trailing slash")
        for m in ("POST", "PUT", "DELETE"):
            ts_golden("catalog-%s" % m, ts_port, "/v1/model-catalog",
                      m)

        # ── forms / kinds / schema ──
        for name, path in (("forms", "/v1/forms"), ("kinds", "/v1/kinds"),
                           ("schema", "/v1/schema")):
            ts_golden(name, ts_port, path)
            ts_alias(ts_port, path + "/", name, "%s trailing slash" % path)
            ts_alias(ts_port, path + "?x=1", name, "%s query strip" % path)
        for m in ("POST", "DELETE"):
            for name, path in (("forms", "/v1/forms"),
                               ("kinds", "/v1/kinds"),
                               ("schema", "/v1/schema")):
                ts_golden("%s-%s" % (name, m), ts_port, path, m)

        # ── all-families param schemas ("*" arm: every method serves) ──
        ts_golden("families", ts_port,
                  "/v1/flows/families/param-schemas")
        for m in ("POST", "PUT", "DELETE", "PATCH"):
            ts_golden("families-%s" % m, ts_port,
                      "/v1/flows/families/param-schemas", m)
        ts_alias(ts_port, "/v1/flows/families/param-schemas/", "families",
                 "param-schemas trailing slash")
        ts_alias(ts_port, "/v1/flows/families/param-schemas?x=1", "families",
                 "param-schemas query strip")

        # ── form-spec ?model= matrix ──
        spec_paths = [
            ("/v1/form-spec", "formspec-bare"),
            ("/v1/form-spec?model=", "formspec-empty"),
            ("/v1/form-spec?model", "formspec-novalue"),
            ("/v1/form-spec?MODEL=anny", "formspec-upper"),
            ("/v1/form-spec?model=nope-xyz", "formspec-unknown"),
            ("/v1/form-spec?model=&model=anny", "formspec-blankfirst"),
            ("/v1/form-spec?model=anny&model=zzz", "formspec-repeated1"),
            ("/v1/form-spec?model=zzz&model=anny", "formspec-repeated2"),
            ("/v1/form-spec?model=&model=", "formspec-blankblank"),
            ("/v1/form-spec?model=../x", "formspec-dotdot"),
            ("/v1/form-spec?model=%2e%2e%2Fx", "formspec-pct"),
            ("/v1/form-spec/", "formspec-slash"),
            ("/v1/form-spec?model=anny&x=1", "formspec-query"),
        ]
        for path, name in spec_paths:
            ts_golden(name, ts_port, path)
        for mid in model_ids:
            ts_golden("formspec-model-%s" % mid, ts_port,
                      "/v1/form-spec?model=" + mid)
        for m in ("POST", "DELETE"):
            ts_golden("formspec-%s" % m, ts_port,
                      "/v1/form-spec?model=anny", m)

        # ── loras ?model= matrix ──
        loras_paths = [
            ("/v1/loras", "loras-bare"),
            ("/v1/loras?model=", "loras-empty"),
            ("/v1/loras?model", "loras-novalue"),
            ("/v1/loras?model=nope-xyz", "loras-unknown"),
            ("/v1/loras?model=&model=anny", "loras-blankfirst"),
            ("/v1/loras?model=anny&model=zzz", "loras-repeated"),
            ("/v1/loras/", "loras-slash"),
        ]
        for path, name in loras_paths:
            ts_golden(name, ts_port, path)
        for mid in model_ids:
            ts_golden("loras-model-%s" % mid, ts_port,
                      "/v1/loras?model=" + mid)
        ts_golden("loras-POST", ts_port, "/v1/loras?model=anny",
                  "POST")

        # ── one-family param schema ──
        for fid in family_ids:
            ts_golden("paramschema-%s" % fid, ts_port,
                      "/v1/flows/families/%s/param-schema" % fid)
        for weird, slug in (("nope-xyz", "nope-xyz"), ("..", "dotdot"),
                            ("ANNY", "ANNY"), ("a%2Fb", "a-pct2Fb"),
                            ("", "empty")):
            ts_golden("paramschema-unknown-%s" % slug, ts_port,
                      "/v1/flows/families/%s/param-schema" % weird)
        ts_alias(ts_port, "/v1/flows/families/%s/param-schema?x=1" % family_ids[0],
                 "paramschema-%s" % family_ids[0],
                 "param-schema query strip")
        ts_alias(ts_port, "/v1/flows/families/%s/param-schema/" % family_ids[0],
                 "paramschema-%s" % family_ids[0],
                 "param-schema trailing slash")
        ts_golden("paramschema-POST", ts_port,
                  "/v1/flows/families/%s/param-schema" % family_ids[0],
                  "POST")

        # ── provisions ──
        ts_golden("provisions-unknown-family", ts_port,
                  "/v1/models/nope-fam-xyz/provisions/x")
        ts_golden("provisions-unknown-provision", ts_port,
                  "/v1/models/anny/provisions/nope-xyz")
        on_disk, missing, none_fam = provision_plan()
        if none_fam:
            # The golden pins family `anima` (first sorted empty
            # family); the live leg pins whatever the keeper scan
            # finds — both must refuse declared-none the same way.
            st, body, _ = http(
                ts_port,
                "/v1/models/%s/provisions/nope-xyz" % none_fam)
            check("provisions declared-none (%s)" % none_fam,
                  st == 404 and b"declares no provision" in body
                  and b"nope-xyz" in body,
                  "status %r %r" % (st, body[:120]))
            if none_fam == "anima":
                ts_golden("provisions-declared-none", ts_port,
                          "/v1/models/anima/provisions/nope-xyz")
        for fid, pname in missing:
            print("  skip missing-on-disk %s/%s (rail fetch = network)"
                  % (fid, pname))
        small = [(f, p) for f, p, s in on_disk if s <= FULL_BYTES_MAX]
        mid = [(f, p, s) for f, p, s in on_disk
               if FULL_BYTES_MAX < s <= PREFIX_MAX]
        for fid, pname, size in sorted(
                ((f, p, s) for f, p, s in on_disk if s > PREFIX_MAX),
                key=lambda t: -t[2]):
            print("  skip giant-on-disk %s/%s (%dMB — full "
                  "materialize would swap-OOM the wall)"
                  % (fid, pname, size // (1024 * 1024)))
        anny_bytes: bytes | None = None
        for fid, pname in small:
            path = "/v1/models/%s/provisions/%s" % (fid, pname)
            st, body, h = http(ts_port, path)
            check("GET %s (bytes) 200" % path, st == 200,
                  "status %r" % (st,))
            st2, body2, _ = http(ts_port, path)
            check("GET %s bytes stable" % path,
                  st2 == 200 and body2 == body,
                  "status %r %dB/%dB" % (st2, len(body2), len(body)))
            check("provisions content-length %s" % pname,
                  st == 200 and h.get("content-length") == str(len(body))
                  and h.get("content-type") not in (None, ""),
                  "len %r pct %r" % (h.get("content-length"),
                                     h.get("content-type")))
            st3, body3, _ = http(ts_port, path + "?x=1")
            check("provisions query strip (%s)" % pname,
                  st3 == 200 and body3 == body)
            st4, body4, _ = http(ts_port, path + "/")
            check("provisions slash (%s)" % pname,
                  st4 == 200 and body4 == body)
            if fid == "anny" and pname == "anny-base-body.glb":
                anny_bytes = body
        for fid, pname, size in mid:
            path = "/v1/models/%s/provisions/%s" % (fid, pname)
            ts_prefix(ts_port, path,
                      "GET %s (prefix %dMB)" % (path, size // 1048576),
                      size)
        # ── synthetic-fixture legs (the >2GB streaming pin, TS-only) ──
        # The mount resolves through the real store, so a synthetic
        # provision rides a DECLARED-but-missing slot: plant a temp
        # file at its mount path (never clobbering — the path must
        # not exist), serve it from TS, delete it in the finally
        # (the slot returns to missing; the rail-fetch skip above is
        # restored). No slot (or an unwritable/unparented mount) =
        # SKIP with a note, never a pin.
        synth_disk: str | None = None
        try:
            if missing:
                from melite_models import scan_engine_models
                mfid, mpname = missing[0]
                mcls = None
                for _, cls in scan_engine_models(str(REPO)).values():
                    if getattr(cls, "id", "") == mfid:
                        mcls = cls
                        break
                mprov = next(
                    (p for p in
                     (getattr(mcls, "provisions", None) or ())
                     if p.name == mpname), None) if mcls is not None \
                    else None
                mdisk = (keeper_mount(getattr(mcls, "engine", "") or "",
                                      getattr(mprov, "folder", "") or "",
                                      mprov.name)
                         if mcls is not None and mprov is not None
                         else None)
                if mdisk is not None and not os.path.exists(mdisk) \
                        and os.path.isdir(os.path.dirname(mdisk)):
                    synth_disk = mdisk
                    spath = ("/v1/models/%s/provisions/%s"
                             % (mfid, mpname))
                    with open(synth_disk, "wb") as f:
                        f.write(SYNTH_SMALL)
                    st, body, h = http(ts_port, spath)
                    check("synthetic small provisions bytes (%s)" % mpname,
                          st == 200 and body == SYNTH_SMALL
                          and h.get("content-length")
                          == str(len(SYNTH_SMALL)),
                          "status %r %dB/%dB len %r"
                          % (st, len(body), len(SYNTH_SMALL),
                             h.get("content-length")))
                    st, body, _ = http(
                        ts_port, spath, headers={"Range": "bytes=0-99"})
                    check("synthetic provisions range ignored (%s)" % mpname,
                          st == 200 and body == SYNTH_SMALL,
                          "status %r %dB" % (st, len(body)))
                    os.unlink(synth_disk)
                    # SPARSE giant: truncate keeps disk cost ~0; zeros
                    # are the honest fixture (a hole reads as zeros —
                    # head/tail pins below prove it).
                    with open(synth_disk, "wb"):
                        pass
                    os.truncate(synth_disk, SYNTH_GIANT_SIZE)
                    st, total, hd, tl, h = stream_count(ts_port, spath)
                    check("synthetic >2GB ts status/length",
                          st == 200 and total == SYNTH_GIANT_SIZE
                          and int(h.get("content-length", "-1"))
                          == SYNTH_GIANT_SIZE,
                          "status %r counted %d len %r"
                          % (st, total, h.get("content-length")))
                    check("synthetic >2GB content-type present",
                          st == 200 and h.get("content-type") not in
                          (None, ""),
                          "%r" % (h.get("content-type"),))
                    check("synthetic >2GB head/tail zeros",
                          hd == b"\0" * 16 and tl == b"\0" * 16,
                          "head %r tail %r" % (hd, tl))
                else:
                    print("  skip synthetic-fixture legs "
                          "(slot occupied/unresolvable)")
            else:
                print("  skip synthetic-fixture legs (no missing slot)")
        finally:
            if synth_disk is not None:
                try:
                    os.unlink(synth_disk)
                except OSError:
                    pass
        ts_golden("provisions-POST", ts_port,
                  "/v1/models/anny/provisions/anny-base-body.glb",
                  "POST")

        # ── byte-exactness pins (escaped, TS-only literals) ──
        _, tb, _ = http(ts_port, "/v1/model-catalog")
        check("catalog ensure_ascii escapes",
              "\\u2014" in tb.decode() and "\u2014" not in tb.decode())
        check("catalog float literal verbatim",
              b'"framing": 1.2' in tb)
        _, tb, _ = http(ts_port, "/v1/form-spec?model=anny")
        check("form-spec ensure_ascii escapes",
              "\\u2014" in tb.decode())

        # ── architecture pin: the native data SSOT — the doors read
        # the frozen discovery-catalog.json (no runtime python, no
        # second snapshot). The frozen-truth legs below pin the file;
        # the golden legs above pin that TS serves it.
        src = TS_DISCOVERY.read_text(encoding="utf-8")
        code = "\n".join(
            ln for ln in src.splitlines()
            if not ln.lstrip().startswith("//"))
        check("no runtime-py bridge",
              "spawnSync" not in code
              and "discoveryRunner" not in code
              and "managePyDirs" not in code
              and "resolveManagePython" not in code)
        check("native catalog SSOT",
              "discovery-catalog.json" in code)
        check("no snapshot second-SSOT",
              "card-decls.json" not in code
              and "model-facts.json" not in code
              and "vocab.ts" not in code)

        # ── FROZEN TRUTH (the freshness wall's successor): the regen
        # comparison against the live py tree retired with the oracle
        # — its export drove the retired serving stack, so running it
        # here would re-anchor the wall to deleted machinery. Post-py
        # the frozen file IS the truth (header note above); these
        # legs pin the file itself, and the golden legs above pin
        # that TS serves it byte-exact.
        print("  retired freshness regen (export drove the retired "
              "oracle — the frozen file is the truth now)")
        check("catalog file present", TS_CATALOG.is_file())
        try:
            frozen = json.loads(TS_CATALOG.read_text(encoding="utf-8"))
            frozen_ok = True
        except ValueError:
            frozen = {}
            frozen_ok = False
        check("frozen truth parses", frozen_ok)
        try:
            frozen_models = set(
                frozen.get("catalog", {}).get("models", {}).keys())
            frozen_fams = set(frozen.get("family_ids", []))
        except AttributeError:
            frozen_models, frozen_fams = set(), set()
        check("frozen truth non-empty",
              len(frozen_models) > 0 and len(frozen_fams) > 0,
              "models=%d families=%d"
              % (len(frozen_models), len(frozen_fams)))
        try:
            golden_models = set(
                json.loads(GOLDENS["catalog"]["body"])["models"].keys())
        except (ValueError, KeyError):
            golden_models = set()
        check("goldens agree with frozen catalog ids",
              golden_models == frozen_models and len(golden_models) > 0,
              "golden-only %r frozen-only %r"
              % (sorted(golden_models - frozen_models)[:5],
                 sorted(frozen_models - golden_models)[:5]))
        try:
            golden_fams = set(
                json.loads(GOLDENS["families"]["body"]).keys())
        except (ValueError, KeyError):
            golden_fams = set()
        check("goldens agree with frozen family ids",
              golden_fams == frozen_fams and len(golden_fams) > 0,
              "golden-only %r frozen-only %r"
              % (sorted(golden_fams - frozen_fams)[:5],
                 sorted(frozen_fams - golden_fams)[:5]))

        # ── TS-only deployment envelopes (node -e units — the catalog
        # file is down, not the builder).
        node = shutil.which("node")
        bad_root = base / "bad-root"
        (bad_root / "packages" / "gateway" / "data").mkdir(parents=True)
        (bad_root / "packages" / "gateway" / "data"
         / "discovery-catalog.json").write_text(
            "{not json", encoding="utf-8")
        # '_h_kinds' below is the TS dispatch-table key
        # (packages/gateway/src/doors/discovery.ts DISCOVERY_HANDLERS)
        # the node probe passes to dispatchDiscovery — the TS API's
        # own arm name, not the retired oracle.
        units = (
            ("503 missing-catalog",
             "import('%s').then(m=>{const r=m.dispatchDiscovery("
             "'_h_kinds','GET','/v1/kinds','/v1/kinds',"
             "'/nonexistent-probe-repo-xyz');"
             "console.log(JSON.stringify([r.status,r.body]));})"
             % TS_DISCOVERY.as_uri(),
             lambda got: got[0] == 503 and "discovery catalog unavailable"
             in got[1] and "export_discovery_catalog" in got[1]),
            ("503 unparseable-catalog",
             "import('%s').then(m=>{const r=m.dispatchDiscovery("
             "'_h_kinds','GET','/v1/kinds','/v1/kinds',%s);"
             "console.log(JSON.stringify([r.status,r.body]));})"
             % (TS_DISCOVERY.as_uri(), json.dumps(str(bad_root))),
             lambda got: got[0] == 503 and "discovery catalog unavailable"
             in got[1]),
        )
        for name, probe, pred in units:
            env = dict(os.environ)
            r = subprocess.run(
                [node, "--experimental-strip-types",
                 "--input-type=module", "-e", probe],
                cwd=str(REPO), capture_output=True, text=True, timeout=120,
                env=env)
            ok = False
            if r.returncode == 0:
                try:
                    ok = bool(pred(json.loads(
                        r.stdout.strip().splitlines()[-1])))
                except (ValueError, IndexError):
                    ok = False
            check("unit " + name, ok, (r.stderr or r.stdout)[-300:])

        # ── auth gate (reboot TS ONLY with the token) ──
        reap_gateway(ts_proc)
        ts_proc = None
        ts_env["DSH_GATEWAY_TOKEN"] = TOKEN
        ts_port, ts_proc = boot_scratch_gateway(env=ts_env)
        print("auth ts :%d" % ts_port)
        for path in ("/v1/model-catalog", "/v1/kinds",
                     "/v1/form-spec?model=anny"):
            st, body, _ = http(ts_port, path)
            check("auth 401 %s" % path,
                  st == 401 and b"unauthorized" in body
                  and b"DSH_GATEWAY_TOKEN" in body,
                  "status %r %r" % (st, body[:120]))
        st, _, _ = http(ts_port, "/v1/model-catalog?token=" + TOKEN)
        check("auth query token refused shape", st == 401,
              "status %r" % (st,))
        bearer = {"Authorization": "Bearer " + TOKEN}
        for name, path in (("catalog", "/v1/model-catalog"),
                           ("kinds", "/v1/kinds"),
                           ("formspec-model-anny",
                            "/v1/form-spec?model=anny")):
            st, body, _ = http(ts_port, path, headers=bearer)
            check("auth bearer 200 %s" % path,
                  st == 200
                  and body == GOLDENS[name]["body"].encode("utf-8"),
                  "status %r %dB" % (st, len(body)))
        if anny_bytes is not None:
            st, body, h = http(
                ts_port, "/v1/models/anny/provisions/anny-base-body.glb",
                headers=bearer)
            check("auth bearer 200 provisions",
                  st == 200 and body == anny_bytes
                  and h.get("content-length") == str(len(anny_bytes)),
                  "status %r %dB" % (st, len(body)))
        st, _, _ = http(ts_port, "/v1/model-catalog",
                        headers={"Authorization": "Bearer wrong"})
        check("auth wrong token shape", st == 401, "status %r" % (st,))
        st, body, _ = http(ts_port, "/v1/health")
        check("auth health exempt",
              st == 200 and b'"status": "ok"' in body,
              "status %r %r" % (st, body[:80]))
    finally:
        if ts_proc is not None:
            reap_gateway(ts_proc)
        if base is not None:
            shutil.rmtree(str(base), ignore_errors=True)

    print("PASS %d / FAIL %d" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
