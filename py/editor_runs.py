#!/usr/bin/env python3
"""Editor data surfaces — the estate's own wire.

Scope of this module (branch python-orchestrator): the READERS and
persistence doors the Tech Noir editor + media deck speak — run history,
drafts, artifact serving, and family param schemas.
the tiny chrome registries. Pure functions over explicit roots; stdlib
only; no globals carrying configuration (the C server's cwd-relative
"./output", "./drafts", "../flows" become explicit arguments).

Surfaces served:

  handle_flows_runs      ~6606   GET  /v1/flows/runs
  handle_flows_status    ~4356   GET  /v1/flows/status/:run_id
                                     (run_detail implements the
                                     restored-from-sidecar path; the live
                                     in-memory-registry path needs g_runs[]
                                     and is documented, not ported)
  handle_flows_drafts    ~4637   POST /v1/flows/drafts
  handle_draft_get           ~5445   GET  /v1/flows/drafts/:id
  handle_draft_list          ~5729   GET  /v1/flows/drafts
  handle_asset               ~6763   GET  /editor/assets/runs/<run>/<file>
  handle_family_param_schema[s] ~5853
  handle_health / handle_models / handle_lane_registry (chrome stubs)

On-disk stores (the C server runs with cwd = build/, so its "./output" is
build/output — pass that root for golden parity):

  runs     <server_root>/output/run-*/_flow.json   (+ media files)
  drafts   <server_root>/drafts/<id>.json              flat JSON docs;
           an optional read-only aux tree comes from the DRAFTS_AUX_DIR
           env in C (drafts_aux_dir(), ~4822) — pass aux_root explicitly

Divergences from the C, all deliberate and load-bearing for parity or
safety (see also the module self-test):

  * ensure_run_previews (~6189) forks ffmpeg and WRITES _poster.jpg into
    run dirs. This reader never generates previews; thumbnails reference
    an existing _poster.jpg or the first image file, exactly like C's
    run_thumbnail when no poster needs generating.
  * the read-time zombie sweep (~6684) mirrors the status override
    ("running" with no live registry entry reads as "failed") but does
    NOT rewrite sidecars unless sweep=True is passed (the write mirrors
    boot_patch_sidecar ~10559: every "running"/"queued" status occurrence
    -> "failed", plus a "sweep" note, atomic tmp+rename).
  * run_detail reproduces the RESTORE path only. The live-registry path
    (~4558) cannot exist without g_runs[] and is documented, not ported.
  * the restore path's error extraction mirrors a C off-by-one
    (qq + 8 lands ON the value's opening quote, ~4392-4398) — the C
    therefore always serves error:"" there, and so does this port.
  * drafts have no DELETE door in C; drafts_delete() answers the
    unmatched-route shape rather than inventing persistence semantics.
  * drafts_save composes the ray birth contract by JSON round-trip
    (key order + injected fields identical to ray_compose_draft_doc
    ~5354); byte-level fidelity of member spacing is not preserved —
    field names, statuses and error strings are.
  * no engine, lane or model name is known to this module (PLUGIN
    ARCHITECTURE LAW): the workflow-file prefix is a parameter, the
    family list is scanned from the plugins tree as data.
"""

from __future__ import annotations

import itertools
import json
import glob
import os
import re
import sys
import threading
import time

import run_wire
import types
import typing
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from types import ModuleType

    from pydantic import BaseModel

# The served-envelope shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

# The artifact-serving URL prefix — the ONE door clients fetch run media
# from. Owns the stamping here (runs list rows, poster) and is imported
# by the gateway (stage url/gallery stamping, route row) and
# asset_ledger (index rows). No restated coordinates.
# (Phase 2 consolidation, 2026-09-04: moved from /editor/assets/runs —
# outside /v1 — into the assets family.)
ASSET_URL_PREFIX = "/v1/assets/runs"

# ---------------------------------------------------------------------------
# C-string parity helpers
# ---------------------------------------------------------------------------

_ERR_JSON = "application/json"


def _err_body(msg: str) -> dict[str, str]:
    return {"error": msg}


def json_quote(s: str) -> str:
    """C json_quote() (~1843): escape " \\ \\n \\r \\t; DROP other control
    chars; pass everything >= 0x20 through as-is."""
    out = ['"']
    for ch in s:
        if ch in ('"', "\\"):
            out.append("\\" + ch)
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif ord(ch) >= 0x20:
            out.append(ch)
    return "".join(out) + '"'


def _sidecar_str_impl(text: str, key: str, cap: int) -> tuple[bool, str]:
    """Core of C sidecar_str() (~6119), BYTE-wise like the C: first
    '"key":', skip spaces/tabs, expect a quoted string, decode \\n \\r \\t
    \\" \\\\ escapes, stop at cap-1 BYTES written (multibyte UTF-8 counts
    per byte and may be cut mid-character, exactly like the C char
    buffer). Returns (found_and_string: bool, value). The C returns -1
    (caller buffer untouched) when absent or non-string."""
    raw = text.encode("utf-8", "surrogateescape")
    pat = b'"%s":' % key.encode("ascii")
    i = raw.find(pat)
    if i < 0:
        return False, ""
    p = i + len(pat)
    n = len(raw)
    while p < n and raw[p] in (0x20, 0x09):
        p += 1
    if p >= n or raw[p:p + 1] != b'"':
        return False, ""
    p += 1
    out = bytearray()
    while p < n and raw[p:p + 1] != b'"' and len(out) + 1 < cap:
        if raw[p:p + 1] == b"\\" and p + 1 < n:
            p += 1
            esc = {0x6E: b"\n", 0x72: b"\r", 0x74: b"\t"}.get(raw[p])
            out += esc if esc is not None else raw[p:p + 1]
            p += 1
        else:
            out += raw[p:p + 1]
            p += 1
    return True, bytes(out).decode("utf-8", "surrogateescape")


def sidecar_str(text: str, key: str, cap: int) -> str:
    """C sidecar_str() as a plain string: "" when absent / not a string
    (the C leaves the caller's zero-initialized buffer, which every
    caller also seeds with "")."""
    return _sidecar_str_impl(text, key, cap)[1]


def _strtol(text: str) -> int:
    """strtol() semantics: optional whitespace/sign then digits; 0 when no
    conversion happens (the C default only applies when the KEY is absent,
    so callers here always pass text that follows an existing key)."""
    m = re.match(r"\s*([+-]?[0-9]+)", text)
    return int(m.group(1)) if m else 0


def sidecar_num(text: str, key: str, default: int) -> int:
    """C sidecar_num() (~6149)."""
    pat = '"%s":' % key
    i = text.find(pat)
    if i < 0:
        return default
    return _strtol(text[i + len(pat):])


def inf_json_string(text: str, key: str, cap: int) -> str:
    """inf_json_string() (include/inference/plugin_helpers.h ~31): needle is
    '"key"' WITHOUT a colon, then spaces/colons are skipped."""
    needle = '"%s"' % key
    i = text.find(needle)
    if i < 0:
        return ""
    p = i + len(needle)
    while p < len(text) and text[p] in " :":
        p += 1
    if p >= len(text) or text[p] != '"':
        return ""
    p += 1
    out = []
    while p < len(text) and text[p] != '"' and len(out) + 1 < cap:
        if text[p] == "\\" and p + 1 < len(text):
            p += 1
            out.append({"n": "\n", "t": "\t", "r": "\r"}.get(text[p], text[p]))
            p += 1
        else:
            out.append(text[p])
            p += 1
    return "".join(out)


def _cjson_compact(value: JsonValue) -> str:
    """cJSON_PrintUnformatted parity: compact separators, object key order
    preserved, integral floats printed as integers (cJSON prints d==int(d)
    with %d)."""
    def norm(v: JsonValue) -> JsonValue:
        if isinstance(v, float) and v.is_integer() and abs(v) < 1e15:
            return int(v)
        if isinstance(v, list):
            return [norm(x) for x in v]
        if isinstance(v, dict):
            return {k: norm(x) for k, x in v.items()}
        return v
    return json.dumps(norm(value), separators=(",", ":"), ensure_ascii=False)


# ---------------------------------------------------------------------------
# artifact typing (C artifact_type ~537 / content_type_of ~557)
# ---------------------------------------------------------------------------

def _media_kinds() -> dict[str, dict[str, list[str]]]:
    """Single media-kind vocabulary (SSOT: plugins/web/dsh/media-plugin/media-kinds.json).
    The TS panel and the runs-window test derive from the same file; the
    parity wall pins all three. Import-time load: a missing file refuses
    loudly here, never as an empty sidebar downstream."""
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.normpath(os.path.join(
        here, os.pardir, "plugins", "web", "dsh", "media-plugin", "media-kinds.json"))
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    return doc["kinds"]


def _media_policy() -> dict[str, int]:
    """Door-tier caps from the same SSOT file (media-kinds.json `policy`)."""
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.normpath(os.path.join(
        here, os.pardir, "plugins", "web", "dsh", "media-plugin", "media-kinds.json"))
    with open(path, encoding="utf-8") as f:
        doc = json.load(f)
    return doc["policy"]


_MEDIA_KINDS = _media_kinds()
_MEDIA_POLICY = _media_policy()
_IMG = tuple(_MEDIA_KINDS["image"]["exts"])
_AUD = tuple(_MEDIA_KINDS["audio"]["exts"])
_VID = tuple(_MEDIA_KINDS["video"]["exts"])
_MODEL = tuple(_MEDIA_KINDS["model"]["exts"])


def _ext(name: str) -> str:
    dot = name.rfind(".")
    return name[dot + 1:] if dot >= 0 else ""


def artifact_type(name: str) -> str:
    e = _ext(name).lower()
    if e in _IMG:
        return "image"
    if e in _AUD:
        return "audio"
    if e in _VID:
        return "video"
    if e in _MODEL:
        return "model"
    if e == "json":
        return "spec"
    if e in ("txt", "md", "yaml"):
        return "text"
    return "file"


def content_type_of(name: str) -> str:
    e = _ext(name).lower()
    return {
        "png": "image/png",
        "jpg": "image/jpeg", "jpeg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "html": "text/html; charset=utf-8",
        "wav": "audio/wav",
        "flac": "audio/flac",
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "mp4": "video/mp4",
        "webm": "video/webm",
        "glb": "model/gltf-binary",
        "gltf": "model/gltf+json",
        "json": "application/json",
        "txt": "text/plain; charset=utf-8", "md": "text/plain; charset=utf-8",
        "yaml": "text/yaml",
    }.get(e, "application/octet-stream")


# media set for gallery ordering — run_dir_has_media (~6238): NOTE it is
# NOT identical to artifact_type's media set (gallery extras like svg, mkv,
# m4a/aac classify but don't list — the split is declared per kind in
# media-kinds.json `gallery`, not restated here).
_MEDIA_EXTS = tuple(
    e for k in ("video", "image", "audio", "model") for e in _MEDIA_KINDS[k]["gallery"]
)

_MAX_IMGS = int(_MEDIA_POLICY["maxListedImages"])  # SSOT: media-kinds.json policy (payload diet: sidebar lists media + N frames). The client-side display guard (frame dumps at >20 images, MediaPanel flatten) is documented against THIS number in the same file.


def _run_dir_has_media(run_dir: str) -> bool:
    """Top-level OR one level down. The merged single-graph path
    lands artifacts at <run>/<stage>/<file> — a run WITH media must
    never read as media-less: the media-first sort buried it under
    the archive's media rows and the ?limit=500 window cut it off
    entirely (live bug, run-lifecycle wall, 2026-09-06: fresh run
    completed with artifacts, absent from /v1/flows/runs)."""
    try:
        names = os.listdir(run_dir)
    except OSError:
        return False
    for name in names:
        e = _ext(name).lower()
        if e in _MEDIA_EXTS:
            return True
    for name in names:
        sub = os.path.join(run_dir, name)
        try:
            if not os.path.isdir(sub):
                continue
            for inner in os.listdir(sub):
                if _ext(inner).lower() in _MEDIA_EXTS:
                    return True
        except OSError:
            continue
    return False


def _file_size(path: str) -> int:
    try:
        return os.path.getsize(path)
    except OSError:
        return -1


def run_artifacts(out_dir: str, out_dir_literal: str) -> list[dict[str, str | int | bool]]:
    """C run_artifacts_json() (~587) as a list. out_dir_literal is the
    string the C embeds in "path" (it passes its "./output/<run>" string);
    rows: {name,path,bytes,url,type,size} + a trailing
    {truncated,listed,total} marker when the image CAP dropped media
    entries (total = media candidates only; sidecars/non-media never
    count — a marker on every run is noise, not a cap signal)."""
    try:
        names = os.listdir(out_dir)
    except OSError:
        names = []
    names.sort(key=lambda s: s.encode("utf-8", "surrogateescape"))
    arts = []
    listed = 0
    # MEDIA-CANDIDATE total (2026-09-06 fix): the marker flags the image
    # CAP, so `total` counts only files that could ever list (media
    # types). Sidecars and non-media never counted — counting them made
    # every run carry {listed<total} (the sidebar's "capped" stat went
    # 463/463 = pure noise the moment gap-6 surfaced it).
    media_total = 0
    imgs = 0
    for name in names:
        if name.startswith("_"):
            continue                        # sidecars + generated poster
        t = artifact_type(name)
        if t == "image":
            media_total += 1
            imgs += 1
            if imgs > _MAX_IMGS:
                continue
        elif t in ("video", "audio", "model"):
            media_total += 1
        else:
            continue                        # not media: not listed, not total
        listed += 1
        size = _file_size(os.path.join(out_dir, name))
        arts.append({
            "name": name,
            "path": "%s/%s" % (out_dir_literal, name),
            "bytes": size,
            "url": "%s/%s/%s" % (ASSET_URL_PREFIX,
                                 os.path.basename(out_dir_literal.rstrip("/")), name),
            "type": t,
            "size": size,
        })
    if media_total > listed:
        arts.append({"truncated": True, "listed": listed,
                     "total": media_total})
    return arts


def _run_thumbnail(run_dir: str, run_id: str) -> str:
    """C run_thumbnail() (~6160): cached poster wins, else first image by
    sorted name. (Poster GENERATION — ensure_run_previews — is not ported:
    it forks ffmpeg and writes into the run dir.)"""
    if os.path.exists(os.path.join(run_dir, "_poster.jpg")):
        return "%s/%s/_poster.jpg" % (ASSET_URL_PREFIX, run_id)
    try:
        names = sorted(os.listdir(run_dir),
                       key=lambda s: s.encode("utf-8", "surrogateescape"))
    except OSError:
        return ""
    for name in names:
        if artifact_type(name) == "image":
            return "%s/%s/%s" % (ASSET_URL_PREFIX, run_id, name)
    return ""


# ---------------------------------------------------------------------------
# GET /v1/flows/runs — handle_flows_runs (~6609)
# ---------------------------------------------------------------------------

def _patch_sidecar_sweep(path: str, why: str) -> bool:
    """boot_patch_sidecar() (~10559): every "running"/"queued" status
    occurrence -> "failed", sweep note appended before the final '}',
    atomic tmp+rename. Mirrored for sweep=True callers only."""
    try:
        with open(path, "r", encoding="utf-8", errors="surrogateescape") as f:
            buf = f.read()
    except OSError:
        return False
    if '"status":"running"' not in buf and '"status":"queued"' not in buf:
        return False
    note = "".join(" " if (c == '"' or ord(c) < 32) else c
                   for c in why)[:159]
    fixed = (buf.replace('"status":"running"', '"status":"failed"')
                .replace('"status":"queued"', '"status":"failed"'))
    last = fixed.rfind("}")
    if last >= 0:
        fixed = fixed[:last] + ',"sweep":"%s"}' % note + fixed[last + 1:]
    tmp = path + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8", errors="surrogateescape") as f:
            f.write(fixed)
        os.replace(tmp, path)
        return True
    except OSError:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        return False


def runs(server_root: str, drafts_root: str | None = None, aux_root: str | None = None,
         limit: int = 200, live_run_ids: tuple[str, ...] = (),
         sweep: bool = False) -> dict[str, JsonValue]:
    """GET /v1/flows/runs. server_root is the C process cwd (the parent
    of its output/ tree). Rows: media-first, then newest-first; test-fixture
    models with a leading underscore never surface (user-surface law); a
    draft_id whose doc is gone degrades to a draftless row (click-contract
    law). live_run_ids stands in for the C's in-memory g_runs[] registry —
    a "running" sidecar with no live entry reads as (and, when sweep=True,
    is persisted as) "failed"."""
    output_root = os.path.join(server_root, "output")
    if drafts_root is None:
        drafts_root = os.path.join(server_root, "drafts")
    if limit is None:
        limit = 200
    limit = max(1, min(500, int(limit)))            # clamp 1..500 (~6612)

    ents = []
    try:
        names = os.listdir(output_root)
    except OSError:
        names = []
    for name in names:
        # the C's 8192 cap counts COLLECTED run entries (the n < 8192 in
        # the while condition), not scanned directory entries (~6623)
        if len(ents) >= 8192:
            break
        if not name.startswith("run-"):
            continue
        run_dir = os.path.join(output_root, name)
        created = 0
        try:
            with open(os.path.join(run_dir, "_flow.json"), "r",
                      encoding="utf-8", errors="surrogateescape") as f:
                buf = f.read(8191)                   # C reads 8192-1 bytes
            # created_at is the py sidecar's key (gateway.sidecar writes
            # "created_at"); "created" is the C-era fossil. Live bug
            # (2026-09-04): every py-era run read epoch 0 here, the
            # newest-first sort collapsed, and fresh generations were
            # buried among hundreds of runs in the media sidebar.
            created = sidecar_num(buf, "created_at",
                                  sidecar_num(buf, "created", 0))
        except OSError:
            pass
        ents.append({"dir": name, "created": created,
                     "media": _run_dir_has_media(run_dir)})
    # rundir_cmp (~6227): media desc, then created desc. C qsort is
    # unstable across exact ties; this stable sort adds no tie-break,
    # so callers comparing order-insensitively within tie groups match.
    ents.sort(key=lambda e: (not e["media"], -e["created"]))

    rows = []
    for ent in ents[:limit]:
        run_dir = os.path.join(output_root, ent["dir"])
        # pipeline init is LOAD-BEARING for the legacy path: a dir with
        # no sidecar never enters the buf block below, and the RUN WIRE
        # GATE reads pipeline for name/flow — the in-flight 2026-09-05
        # "pipeline" rename left the init as the dead `model = ""` and
        # every legacy dir crashed the whole listing with
        # UnboundLocalError (a NameError class the skip-gate cannot
        # catch). One init, both paths.
        pipeline = ""
        prompt = ""
        status = "unknown"
        draft = ""
        created = ent["created"]
        buf = None
        try:
            with open(os.path.join(run_dir, "_flow.json"), "r",
                      encoding="utf-8", errors="surrogateescape") as f:
                buf = f.read(8191)
        except OSError:
            status = "success"                       # legacy dir, no sidecar
        if buf is not None:
            # pipeline = the door name the run was started with (flow id
            # | model id | inline flow id). The C-era key was "model" —
            # a key no py sidecar ever carried, so name/flow were blank
            # for every py run until 2026-09-05 (sidecar.md: the
            # "pipeline" row is the honest shape).
            pipeline = sidecar_str(buf, "pipeline", 64)
            if pipeline.startswith("_"):
                continue                             # user-surface law (~6678)
            prompt = sidecar_str(buf, "prompt", 2048)
            found, raw_status = _sidecar_str_impl(buf, "status", 16)
            status = raw_status if found else "unknown"
            # C-era sidecars write "error" for a dead run — the list
            # must serve the SAME mapping the detail path serves
            # (error->failed, the C restore law) or the RUN WIRE GATE
            # refuses the whole row (RunRow's enum has no "error").
            if status == "error":
                status = "failed"
            draft = sidecar_str(buf, "draft_id", 96)
            seed = sidecar_num(buf, "seed", -1)
            created = sidecar_num(buf, "created_at", created)
            # ZOMBIE SWEEP (~6688): "running" with no live registry entry.
            if status == "running" and ent["dir"] not in live_run_ids:
                status = "failed"
                if sweep:
                    _patch_sidecar_sweep(
                        os.path.join(run_dir, "_flow.json"),
                        "read-time sweep: stale running sidecar, "
                        "no live registry entry")
        else:
            seed = -1
        # click-contract law (~6724): never advertise a draft_id the
        # drafts GET would 404 on.
        if draft:
            if not os.path.exists(os.path.join(drafts_root, draft + ".json")):
                aux_ok = bool(aux_root) and os.path.exists(
                    os.path.join(aux_root, draft + ".json"))
                if not aux_ok:
                    draft = ""
        thumb = _run_thumbnail(run_dir, ent["dir"])
        arts = run_artifacts(run_dir, "./output/%s" % ent["dir"])
        # RUN WIRE GATE (2026-09-05, operator order: "there is no
        # validation on workflow outputs or reconstructions"): the row
        # is CONSTRUCTED as a frozen pydantic RunRow — a reconstruction
        # that cannot be built cannot be served. A drifted sidecar
        # skips its row LOUDLY (logged reason, listing continues —
        # RESILIENCE LAW), never ships garbage to the studio.
        try:
            row = run_wire.RunRow(
                run_id=ent["dir"],
                name=pipeline,
                flow=pipeline,
                status=status,
                created_at=created,
                prompt=prompt,
                seed=seed,
                thumbnail=thumb,
                artifacts=arts,
                params={"seed": seed},
                draft_id=draft,
            )
        except run_wire.ValidationError as e:
            print("[editor_runs] run row refused (%s): %s"
                  % (ent["dir"], run_wire.refusal_reason(e)),
                  file=sys.stderr)
            continue
        rows.append(row.model_dump())
    return run_wire.RunsEnvelope(
        count=len(ents),
        runs=[run_wire.RunRow.model_validate(r) for r in rows]).model_dump()


# ---------------------------------------------------------------------------
# GET /v1/flows/status/:run_id — handle_flows_status restore path
# ---------------------------------------------------------------------------

def _stages_span(text: str, cap: int = 24576) -> str:
    """The '"stages"' bracket-balanced span extraction the C uses in two
    places (~4428, ~4795): first '"stages"', first '[' after it, plain
    depth-counted (NOT string-aware) walk to its ']'; capped."""
    sp = text.find('"stages"')
    if sp < 0:
        return "[]"
    c = text.find("[", sp)
    if c < 0:
        return "[]"
    depth = 0
    e = c
    while e < len(text):
        if text[e] == "[":
            depth += 1
        elif text[e] == "]":
            depth -= 1
            if depth == 0:
                e += 1
                break
        e += 1
    return text[c:e][:cap - 1]


def run_detail(server_root: str, run_id: str) -> tuple[int, dict[str, JsonValue]]:
    """GET /v1/flows/status/:run_id, restore-from-sidecar path
    (~4365-4556). Returns (status, dict). The C consults its live
    g_runs[] registry first; a pure reader has no registry, so every id
    answers from disk exactly as a restarted C gateway would."""
    output_root = os.path.join(server_root, "output")
    run_dir = os.path.join(output_root, run_id)
    sc_path = os.path.join(run_dir, "_flow.json")
    try:
        with open(sc_path, "r", encoding="utf-8", errors="surrogateescape") as f:
            sb = f.read(65535)                       # C reads 65536-1
    except OSError:
        return 404, _err_body("unknown run_id")

    # raw sidecar state -> editor wire state (~4380-4391)
    st = "unknown"
    qq = sb.find('"status"')
    if qq >= 0:
        c = sb.find('"', qq + 8)
        if c >= 0:
            e = sb.find('"', c + 1)
            if e >= 0 and e - c - 1 < 24:
                st = sb[c + 1:e]
    if st == "success":
        st = "completed"
    elif st == "error":
        st = "failed"

    # error extraction mirrors the C off-by-one (~4392-4398): qq+8 lands
    # ON the value's opening quote, strchr returns that same quote, and
    # the C serves "" — reproduce byte-for-byte.
    ev = ""
    qq = sb.find('"error":"')
    if qq >= 0:
        c = qq + 8
        e = sb.find('"', c)
        if e >= 0 and e - c < 256:
            ev = sb[c:e]

    created = 0
    # created_at (py sidecar) first, "created" (C-era fossil) fallback.
    for ckey in ("created_at", "created"):
        qq = sb.find('"' + ckey + '"')
        if qq >= 0:
            c = sb.find(":", qq)
            if c >= 0:
                created = _strtol(sb[c + 1:])
            break
    dur = 0
    qq = sb.find('"durationSec"')
    if qq >= 0:
        c = sb.find(":", qq)
        if c >= 0:
            dur = _strtol(sb[c + 1:])

    arts = run_artifacts(run_dir, "./output/%s" % run_id)

    # stages: run-dir card.json (explicit card) wins over the sidecar
    # (~4411-4448); verbatim span from disk, never hand-composed.
    stages2 = "[]"
    src = None
    try:
        with open(os.path.join(run_dir, "card.json"), "r",
                  encoding="utf-8", errors="surrogateescape") as f:
            src = f.read(24575)
    except OSError:
        src = sb
    if src is not None:
        stages2 = _stages_span(src)
    draft_id = sidecar_str(sb, "draft_id", 96)

    # placeholder-prompt fix (~4458-4541): inject the run's real prompt +
    # seed into each stage's params, per-stage when _request.json carried
    # per-window prompts. Mirrors the C buffer math INCLUDING the 24576
    # cap that (on big cards) suppresses the injection entirely.
    rprom = sidecar_str(sb, "prompt", 1024)
    rseed = 0
    qq = sb.find('"seed"')
    if qq >= 0:
        c = sb.find(":", qq)
        if c >= 0:
            rseed = _strtol(sb[c + 1:])
    reqbuf = ""
    try:
        with open(os.path.join(run_dir, "_request.json"), "r",
                  encoding="utf-8", errors="surrogateescape") as f:
            reqbuf = f.read(65535)
    except OSError:
        pass
    out_parts = []
    walk = 0
    while True:
        ob = stages2.find("{", walk)
        if ob < 0:
            break
        cb = ob + 1
        while cb < len(stages2) and stages2[cb] != "}":
            cb += 1
        if cb >= len(stages2):
            break
        sid = ""
        ip = stages2.find('"id":"', ob)
        if ip >= 0 and ip < cb:
            v = ip + 5
            L = 0
            while v + L < cb and stages2[v + L] != '"' and L < 63:
                L += 1
            sid = stages2[v:v + L]
        pkey = "prompt"
        w = sid.find("window")
        if w >= 0:
            n = _strtol(sid[w + 6:])
            if 1 < n < 20:
                pkey = "prompt%d" % n
        spro = ""
        have = False
        if reqbuf and ('"%s"' % pkey) in reqbuf:
            spro = sidecar_str(reqbuf, pkey, 1024)
            have = spro != ""
        if not have and rprom:
            spro = rprom
            have = True
        if have:
            pjson = ',"params":{"prompt":%s,"seed":%d}' % (json_quote(spro), rseed)
        else:
            pjson = ',"params":{"seed":%d}' % rseed
        if len(stages2) + len(pjson) + 1 < 24576:
            # the C inserts pjson AT cb — the first '}' after the object
            # open (~4535): params lands as the object's LAST member
            stages2 = stages2[:cb] + pjson + stages2[cb:]
            walk = cb + len(pjson) + 1
        else:
            break

    try:
        stages = json.loads(stages2)
    except ValueError:
        stages = stages2                          # C would serve it raw

    return 200, {
        "run_id": run_id,
        "status": st,
        "state": st,
        "error": ev,
        "created": created,
        "durationSec": dur,
        "restored_from_sidecar": True,
        "artifacts": arts,
        "stages": stages,
        "draft_id": draft_id,
    }


# ---------------------------------------------------------------------------




# ---------------------------------------------------------------------------
# drafts — ./drafts/<id>.json (+ optional read-only aux tree)
# ---------------------------------------------------------------------------

def draft_id_ok(draft_id: str) -> bool:
    """draft_id_ok() (~4998): <=96 chars, [A-Za-z0-9_-] only."""
    if not draft_id or len(draft_id) > 96:
        return False
    return all(c.isascii() and (c.isalnum() or c in "-_") for c in draft_id)


def drafts_list(drafts_root: str | None, aux_root: str | None = None) -> dict[str, JsonValue]:
    """GET /v1/flows/drafts (~5729): merged index over ./drafts and the
    optional aux tree, newest-first by mtime, model/name (with the
    intent/title/service fallbacks) from the first 8KB of each doc."""
    ents = []
    for root in (drafts_root, aux_root):
        if not root:
            continue
        try:
            names = os.listdir(root)
        except OSError:
            continue
        for name in names:
            L = len(name)
            if L < 6 or L > 110 or not name.endswith(".json"):
                continue
            did = name[:-5]
            if not draft_id_ok(did):
                continue
            ppath = os.path.join(root, name)
            try:
                mt = int(os.stat(ppath).st_mtime)
            except OSError:
                continue
            model = ""
            disp = ""
            try:
                with open(ppath, "r", encoding="utf-8",
                          errors="surrogateescape") as f:
                    buf = f.read(8191)
                model = sidecar_str(buf, "model", 80)
                disp = sidecar_str(buf, "name", 160)
                if not disp:
                    disp = sidecar_str(buf, "intent", 160)
                if not disp:
                    disp = sidecar_str(buf, "title", 160)
                if not model:
                    model = sidecar_str(buf, "service", 80)
            except OSError:
                pass
            ents.append((mt, {"draft_id": did, "model": model, "name": disp}))
    # C: std::sort by mtime DESC (unstable across exact-second ties).
    ents.sort(key=lambda e: -e[0])
    # RUN WIRE GATE: index rows constructed as frozen DraftRow — a doc
    # whose index fields cannot build a row is skipped LOUDLY (logged
    # reason), never served as garbage.
    rows = []
    for _, raw in ents[:600]:
        try:
            rows.append(run_wire.DraftRow.model_validate(raw).model_dump())
        except run_wire.ValidationError as e:
            print("[editor_runs] draft row refused (%s): %s"
                  % (raw.get("draft_id", "?"), run_wire.refusal_reason(e)),
                  file=sys.stderr)
    return run_wire.DraftsEnvelope(
        count=len(ents),
        drafts=[run_wire.DraftRow.model_validate(r) for r in rows]).model_dump()


def _unwrap_calls(obj: JsonValue, done: bool = False) -> tuple[JsonValue, bool]:
    """ray_unwrap_calls (~5316): a JSON-encoded STRING under a "calls" key
    becomes the array it encodes (first occurrence only)."""
    if done or not isinstance(obj, dict):
        return obj, False
    for k, v in obj.items():
        if k == "calls" and isinstance(v, str):
            try:
                arr = json.loads(v)
            except ValueError:
                arr = None
            if isinstance(arr, list):
                obj[k] = arr
                return obj, True
        new, done = _unwrap_calls(v, done)
        if done:
            return obj, True
    return obj, False


_RUN_SEQ = itertools.count()          # C: process-wide atomic run/draft seq
_DRAFT_SEQ = itertools.count()


def _mint_draft_id() -> str:
    """C id mint (~4675): draft-<time hex>-<tid hex>-<seq hex>."""
    return "draft-%x-%x-%x" % (int(time.time()), threading.get_ident(),
                               next(_DRAFT_SEQ))


def _ray_compose_draft_doc(body: dict[str, JsonValue], draft_id: str) -> dict[str, JsonValue]:
    """ray_compose_draft_doc (~5354) by JSON round-trip: root contract keys
    in ray's exact order, unknown members preserved AFTER them, per-stage
    birth fields (id "s_<i>", inputs [""], provenance "agent") injected
    only when absent."""
    intent = ""
    stages = []
    extras = {}
    if isinstance(body, dict):
        intent = body.get("intent") if isinstance(body.get("intent"), str) else ""
        s = body.get("stages")
        if isinstance(s, list):
            stages = s
        for k, v in body.items():
            if k in ("intent", "stages", "draft_id", "status",
                     "createdAt", "completedAt"):
                continue
            extras[k] = v
    out_stages = []
    for idx, st in enumerate(stages):
        st = dict(st) if isinstance(st, dict) else {}
        st, _ = _unwrap_calls(st)
        row = {}
        if "id" not in st:
            row["id"] = "s_%d" % idx
        row.update(st)
        if "inputs" not in st:
            row["inputs"] = [""]
        if "provenance" not in st:
            row["provenance"] = "agent"
        out_stages.append(row)
    doc = {
        "draft_id": draft_id,
        "intent": intent,
        "stages": out_stages,
        "status": "ready",
        "createdAt": int(time.time()) * 1000,
        "completedAt": None,
    }
    doc.update(extras)
    return doc


def drafts_save(drafts_root: str, body: dict[str, JsonValue],
                draft_id: str | None = None) -> tuple[int, dict[str, JsonValue]]:
    """POST /v1/flows/drafts (~4637): compose the ray birth contract
    and persist <drafts_root>/<id>.json. Returns (status, dict) with the
    {draftId, stages} response shape. The C's x-agent-session one-card
    lane law (409) is an HTTP-header concern and is not modeled here."""
    if isinstance(body, (str, bytes)):
        if not body:
            return 400, _err_body("empty body")
        try:
            body = json.loads(body)
        except ValueError:
            body = {}
    if not body:
        return 400, _err_body("empty body")
    if draft_id is None:
        draft_id = _mint_draft_id()
    doc = _ray_compose_draft_doc(body, draft_id)
    # the composed birth doc is a WIRE contract (the C retirement made
    # the ray birth shape OURS) — gate the composer-owned keys at the
    # door. A refusal is an internal bug, served as a structured 500;
    # caller extras are never read by the gate and ride untouched.
    import run_wire
    try:
        run_wire.validate_draft_birth(doc)
    except Exception as e:
        return 500, _err_body("draft composer drift: %s" % (e,))
    os.makedirs(drafts_root, exist_ok=True)
    path = os.path.join(drafts_root, draft_id + ".json")
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, separators=(",", ":"), ensure_ascii=False)
    except OSError:
        return 500, _err_body("cannot persist draft")
    return 200, {"draftId": draft_id, "stages": doc["stages"]}


def _heal_duration_sec(text: str) -> tuple[str, int]:
    """Serve-time timeline-sync heal (~5502-5559): recompute durationSec
    from the card's own frame plan (max end_frame / fps) and patch every
    disagreeing occurrence."""
    fend = 0
    for m in re.finditer(r'"end_frame"', text):
        c = text.find(":", m.end())
        if c >= 0:
            v = _strtol(text[c + 1:])
            if v > fend:
                fend = v
    fpsv = 0
    fq = text.find('"fps"')
    if fq >= 0:
        c = text.find(":", fq + 5)
        if c >= 0:
            fpsv = _strtol(text[c + 1:])
    if fend <= 0 or fpsv <= 0:
        return text, 0
    film = (fend + fpsv - 1) // fpsv
    n_patch = 0
    for m in re.finditer(r'"durationSec"', text):
        c = text.find(":", m.end())
        if c < 0:
            break
        if _strtol(text[c + 1:]) != film:
            n_patch += 1
    if n_patch == 0:
        return text, 0
    def repl(m: re.Match[str]) -> str:
        c = text.find(":", m.end())
        stored = _strtol(text[c + 1:])
        return '"durationSec":%d' % (film if stored != film else stored)
    fixed = re.sub(r'"durationSec":\s*[-+0-9]*', repl, text)
    return fixed, n_patch


def drafts_get(drafts_root: str, draft_id: str, aux_root: str | None = None,
               heal: bool = False) -> tuple[int, dict[str, str] | str]:
    """GET /v1/flows/drafts/:id (~5445). Returns (status, text) with
    the doc's VERBATIM bytes. The C click door heals corrupt docs
    (quarantine + stub) and stale durationSec values IN PLACE; a pure
    reader serves bytes as-is unless heal=True (durationSec patch only —
    the quarantine rewrite is never silent)."""
    if not draft_id_ok(draft_id):
        return 400, _err_body("bad id")
    path = None
    for root in (drafts_root, aux_root):
        if not root:
            continue
        cand = os.path.join(root, draft_id + ".json")
        if os.path.exists(cand):
            path = cand
            break
    if path is None:
        return 404, _err_body("draft not found")
    with open(path, "r", encoding="utf-8", errors="surrogateescape") as f:
        body = f.read()
    if heal:
        fixed, _ = _heal_duration_sec(body)
        if fixed != body:
            try:
                with open(path, "w", encoding="utf-8",
                          errors="surrogateescape") as f:
                    f.write(fixed)
            except OSError:
                pass
            body = fixed
    return 200, body


def drafts_delete(drafts_root: str, draft_id: str) -> tuple[int, dict[str, str]]:
    """DELETE /v1/flows/drafts/:id — NO SUCH ROUTE on the wire
    contract (the drafts door registers Get/Post/Patch only). Answers
    with the unmatched-route error shape instead of inventing
    persistence the gateway does not have."""
    return 404, {"error": "not found",
                 "path": "/v1/flows/drafts/%s" % draft_id}


# ---------------------------------------------------------------------------
# GET /editor/assets/runs/<run_id>/<file> — handle_asset (~6763)
# ---------------------------------------------------------------------------

def serve_asset(server_root: str, rel_path: str) -> tuple[int, bytes, str]:
    """The artifact media tree. Root: <server_root>/output ONLY. Traversal
    guard mirrors C exactly: an empty rel or ANY ".." substring (not just
    path components) -> 400 {"error":"bad path"}; missing -> 404. Returns
    (status, bytes, content_type). A directory target reads as an empty
    200 body with an octet-stream type (the C's fopen-then-fread-fails
    behavior), not an error."""
    if not rel_path or ".." in rel_path:
        return 400, b'{"error":"bad path"}', _ERR_JSON
    path = os.path.join(server_root, "output", rel_path)
    try:
        with open(path, "rb") as f:
            data = f.read()
    except IsADirectoryError:
        return 200, b"", "application/octet-stream"
    except OSError:
        return 404, b'{"error":"artifact not found"}', _ERR_JSON
    return 200, data, content_type_of(rel_path)


# ---------------------------------------------------------------------------
# GET /v1/assets/inputs/<file> — the estate input preview door
# (2026-09-06, operator order: "We need to have an image preview when
# the card is drilled out for ANNY and IMAGE->3d"). The uploads door
# writes browser files to data/input/ and returns the repo-relative
# path — a path no <img> can load, so a drilled-out card showed NO
# preview of its own source photo after reload. This door serves
# those bytes back: IMAGES ONLY (the uploads door's own allowlist),
# single flat segment (uploads never nest), traversal refused.
# ---------------------------------------------------------------------------

_INPUT_IMAGE_EXTS = {".png": "image/png", ".jpg": "image/jpeg",
                     ".jpeg": "image/jpeg", ".webp": "image/webp"}


def serve_input_asset(repo_root: str, name: str) -> tuple[int, bytes, str]:
    """One uploaded input image, or the refusal. (status, bytes, type)."""
    if not name or "/" in name or "\\" in name or ".." in name:
        return 400, b'{"error":"bad path"}', _ERR_JSON
    ext = os.path.splitext(name)[1].lower()
    ctype = _INPUT_IMAGE_EXTS.get(ext)
    if ctype is None:
        return 400, b'{"error":"inputs door serves png/jpeg/webp only"}', \
            _ERR_JSON
    path = os.path.join(repo_root, "data", "input", name)
    try:
        with open(path, "rb") as f:
            data = f.read()
    except OSError:
        return 404, b'{"error":"input not found"}', _ERR_JSON
    return 200, data, ctype


# ---------------------------------------------------------------------------
# family param schemas — handle_family_param_schema[s] (~5853)
# ---------------------------------------------------------------------------

_MODEL_BY_ID_MISS: object = object()
_MODEL_BY_ID_CACHE: dict[str, object] | None | object = _MODEL_BY_ID_MISS


def _model_by_id(repo_root: str) -> dict[str, type[BaseModel]] | None:
    """family id → Model class over the real plugins tree (one scan,
    cached per process; None when the tree won't resolve)."""
    global _MODEL_BY_ID_CACHE
    if _MODEL_BY_ID_CACHE is _MODEL_BY_ID_MISS:
        _MODEL_BY_ID_CACHE = None
        try:
            from melite_models import scan_engine_models
            by_id: dict[str, object] = {}
            for _path, cls in scan_engine_models(repo_root).values():
                by_id.setdefault(getattr(cls, "id", ""), cls)
            _MODEL_BY_ID_CACHE = by_id
        except Exception:
            _MODEL_BY_ID_CACHE = None
    return _MODEL_BY_ID_CACHE


# card Field kind → frontend JSON type (the click-time gate's
# vocabulary). Kinds absent here (bespoke Field flavors such as
# image_list) are served WITHOUT a type: presence admitted, type
# unchecked, the backend wire gate decides — never a false positive.
_FIELD_JSON_TYPES = {
    "Text": "string", "Textarea": "string", "Select": "string",
    "Image": "string", "Audio": "string", "Video": "string",
    "File": "string",
    "Number": "number", "Slider": "number", "Seed": "number",
    "Boolean": "boolean",
}

_FAMILY_PROPS_CACHE: dict[str, dict[str, dict[str, JsonValue]] | None] = {}

_SCHEMA_MOD_CACHE: dict[str, object | None] = {}


def _schema_row_for_card(card_py_path: str) -> type[BaseModel] | None:
    """The card's enforcement row (sibling schema.py's Params class) —
    the SAME row the backend wire gate (parse_card) constructs, loaded
    standalone by path (never through the engine bus). Resolution:
    parse_card's return annotation when it names a pydantic model,
    else the module's single model. None when the card ships no
    schema.py or the row won't resolve (the caller falls back to the
    card.py UI fields — never a crash: an unresolvable row defers,
    it never refuses)."""
    import importlib.util as _ilu
    import sys as _sys
    import typing as _typing
    schema_py = os.path.join(os.path.dirname(card_py_path), "schema.py")
    if schema_py in _SCHEMA_MOD_CACHE:
        cached_mod = _SCHEMA_MOD_CACHE[schema_py]
    else:
        cached_mod = None
        if os.path.isfile(schema_py):
            mod_name = "family_schema_" + re.sub(
                r"[^0-9A-Za-z_]", "_", schema_py)
            try:
                if mod_name in _sys.modules:
                    cached_mod = _sys.modules[mod_name]
                else:
                    _spec = _ilu.spec_from_file_location(
                        mod_name, schema_py)
                    if _spec is not None and _spec.loader is not None:
                        _mod = _ilu.module_from_spec(_spec)
                        _sys.modules[mod_name] = _mod
                        _spec.loader.exec_module(_mod)
                        cached_mod = _mod
            except Exception:
                cached_mod = None
        _SCHEMA_MOD_CACHE[schema_py] = cached_mod
    if cached_mod is None:
        return None
    try:
        from pydantic import BaseModel as _BaseModel
    except Exception:
        return None
    parse_card = getattr(cached_mod, "parse_card", None)
    if callable(parse_card):
        # The UNEVALUATED return annotation first (2026-09-06): the
        # object is already there at def time — no get_type_hints
        # evaluation, so an unresolvable PARAM annotation (a sibling
        # stroke's JsonDict alias naming a missing JsonValue) cannot
        # sink the return pick. Multi-model modules (a card row plus
        # a nested draft row) resolve exactly; the single-model scan
        # below stays the fallback.
        try:
            ret = getattr(parse_card, "__annotations__", {}).get("return")
            if isinstance(ret, str):
                ret = getattr(cached_mod, ret, None)
            if isinstance(ret, type) and issubclass(ret, _BaseModel):
                return ret
        except Exception:
            pass
        try:
            hints = _typing.get_type_hints(parse_card)
            ret = hints.get("return")
            if isinstance(ret, type) and issubclass(ret, _BaseModel):
                return ret
        except Exception:
            pass
    try:
        cands = [v for v in vars(cached_mod).values()
                 if isinstance(v, type) and issubclass(v, _BaseModel)
                 and getattr(v, "__module__", "") == getattr(
                     cached_mod, "__name__", "")]
        if len(cands) == 1:
            return cands[0]
    except Exception:
        pass
    return None


def _props_from_schema_row(row_cls: type[BaseModel]) -> dict[str, dict[str, JsonValue]] | None:
    """Project a frozen schema.py row (pydantic model) to the envelope
    props: field name → JSON type + declared default (None defaults
    INCLUDED — an Optional-bag/slot None default is the class's own
    null-admission, and the click gate must admit what the class
    admits). Untyped annotations (object/Any/dict/mixed unions) serve
    WITHOUT a type: presence admitted, type unchecked, the backend
    wire gate decides — never a false positive. None when the row
    carries no readable fields."""
    import typing as _typing
    try:
        fields = getattr(row_cls, "model_fields")
        if not fields:
            return None
    except Exception:
        return None
    props: dict[str, dict[str, JsonValue]] = {}
    for name, fld in fields.items():
        entry: dict[str, JsonValue] = {}
        jtype = _schema_annotation_json_type(
            getattr(fld, "annotation", None), _typing)
        if jtype is not None:
            entry["type"] = jtype
        try:
            default = fld.get_default(call_default_factory=True)
        except Exception:
            default = None
            has_default = False
        else:
            try:
                from pydantic_core import PydanticUndefined as _Undef
                has_default = default is not _Undef
            except Exception:
                has_default = default is not None or (
                    getattr(fld, "is_required", None) is False)
        if has_default and isinstance(
                default, (str, int, float, bool, list, dict)) \
                or (has_default and default is None):
            entry["default"] = default
        props[str(name)] = entry
    return props or None


# The shapes a pydantic field annotation takes in this estate's card
# schemas: a plain type, a PEP 604 union, a builtin generic
# (types.GenericAlias, e.g. list[int]), a typing form (Optional /
# Union / Annotated / Literal — typing._GenericAlias subclasses), a
# forward-ref string, or None when the field declares none. The wall
# bans bare object/Any, so the open domain is spelled closed — every
# member names a real class (typing._GenericAlias is private but has
# been stable for a decade; revisiting it is a deliberate chore).
AnnotationForm = (type | types.UnionType | types.GenericAlias
                  | typing._GenericAlias | str | None)


def _schema_annotation_json_type(ann: AnnotationForm, _typing: ModuleType) -> str | None:
    """Pydantic annotation → envelope JSON type. Optional/nullable
    unwraps to the carried type; a pure-numeric union (int/float) is
    "number" (the click gate treats integer as valid for number, and
    every card Seed/Slider/Number serves "number" today — zero type
    vocabulary change). Anything without a scalar/array shape
    (object/Any/dict/mixed unions) is untyped: admitted, unchecked."""
    import typing as _t
    if ann is None:
        return None
    origin = _t.get_origin(ann)
    args = _t.get_args(ann)
    if origin is not None and str(origin) == "typing.Annotated":
        return _schema_annotation_json_type(
            args[0] if args else None, _t) if args else None
    if origin is _t.Union or str(origin).endswith("|"):
        non_null = [a for a in args
                    if a is not type(None) and a is not _t.Any]
        if len(non_null) == 1:
            return _schema_annotation_json_type(non_null[0], _t)
        if non_null and all(a in (int, float) for a in non_null):
            return "number"
        strs = [_schema_annotation_json_type(a, _t) for a in non_null]
        flat = [s for s in strs if s is not None]
        if len(flat) == 1 and len(set(flat)) == 1:
            return flat[0]
        return None
    if ann is str:
        return "string"
    if ann is bool:
        return "boolean"
    if ann in (int, float):
        return "number"
    if origin in (list, tuple, set, frozenset):
        return "array"
    return None


def _family_surface_props(family_id: str
                          ) -> dict[str, dict[str, JsonValue]] | None:
    """The click-time vocabulary for a family: the owning card's SCHEMA
    ROW keys (schema.py — the SAME row the backend wire gate enforces,
    so the two gates cannot drift) → JSON types + declared defaults.
    None when the tree won't resolve (the frontend defers to the
    backend gate — never a false-positive refusal).

    (2026-09-05 image-edit incident: this served faithful-but-EMPTY
    envelopes for every family, so the click-time validator deferred
    ALWAYS and 27 extra_forbidden errors fired at run time instead of
    at the click. Deriving from the enforcement row makes an empty
    envelope mean "unknown family" — the only honest deferral.)

    (2026-09-06 frontend-impossible incident: the derivation above
    read the card.py UI fields, whose numeric/boolean defaults are
    almost always None — the envelope carried no default for
    duration/width/steps/..., so every untouched knob failed the
    click gate as "null but has no default" while the backend row
    defaults it. The envelope now projects the schema.py row
    (defaults included); the card.py read survives ONLY as the
    fallback for cards with no schema.py (ideogram4) — a fallback,
    never a second SSOT."""
    if family_id in _FAMILY_PROPS_CACHE:
        return _FAMILY_PROPS_CACHE[family_id]
    props: dict[str, dict[str, JsonValue]] | None = None
    try:
        repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        by_id = _model_by_id(repo)
        cls = by_id.get(family_id) if by_id else None
        card_id = getattr(cls, "card", None) if cls is not None else None
        if card_id:
            from melite_cards import load_card_py
            cands = sorted(set([str(card_id),
                                str(card_id).replace("-", "_")]))
            hits = []
            for cand in cands:
                hits = sorted(glob.glob(os.path.join(
                    repo, "plugins", "engines", "*", "action_cards",
                    "*", cand, "py", "card.py")))
                if hits:
                    break
            if hits:
                row_cls = _schema_row_for_card(hits[0])
                if row_cls is not None:
                    props = _props_from_schema_row(row_cls)
                if props is None:
                    eng = hits[0].split(
                        os.sep + "engines" + os.sep)[1].split(os.sep)[0]
                    card_cls = load_card_py(hits[0], eng)
                    props = {}
                    for f in getattr(card_cls, "_fields_", ()):
                        entry: dict[str, JsonValue] = {}
                        if getattr(f, "type", None) == "image_list":
                            entry["type"] = "array"
                        else:
                            t = _FIELD_JSON_TYPES.get(type(f).__name__)
                            if t is not None:
                                entry["type"] = t
                        if getattr(f, "default", None) is not None:
                            entry["default"] = f.default
                        props[f.name] = entry
    except Exception:
        props = None
    _FAMILY_PROPS_CACHE[family_id] = props
    return props


def _family_envelope(family_id: str) -> dict[str, JsonValue]:
    props = _family_surface_props(family_id)
    return {
        "title": "%s_Params" % family_id,
        "type": "object",
        "additionalProperties": False,
        "properties": props if props is not None else {},
        "required": [],
    }


def family_param_schemas(family_ids: list[str]) -> dict[str, dict[str, JsonValue]]:
    """GET /v1/flows/families/param-schemas: the per-family param
    envelope for the frontend click-time gate — derived from each
    owning card's schema row (same source the backend enforces)."""
    return {fid: _family_envelope(fid) for fid in family_ids if fid}


def family_param_schema(family_ids: list[str], family_id: str) -> tuple[int, dict[str, JsonValue]]:
    """GET /v1/flows/families/:family_id/param-schema."""
    if family_id in family_ids:
        return 200, _family_envelope(family_id)
    return 404, {"error": "Unknown family_id '%s'" % family_id,
                 "family_id": family_id}


def catalog_family_ids(plugins_root: str) -> list[str]:
    """Data-driven family list: the model CLASS ids under
    plugins/engines/<engine>/models/<genre>/<id>/model.py (the flip —
    model.yaml is extinct). No engine or lane name is known here — the
    tree is the vocabulary. (2026-09-02: healed the stale pre-engine
    plugins/<owner>/models depth that found NOTHING since the engine
    move.)"""
    ids = []
    eng_root = os.path.join(plugins_root, "engines")
    try:
        engines = sorted(os.listdir(eng_root))
    except OSError:
        return ids
    for engine in engines:
        models_dir = os.path.join(eng_root, engine, "models")
        if not os.path.isdir(models_dir):
            continue
        for genre in sorted(os.listdir(models_dir)):
            genre_dir = os.path.join(models_dir, genre)
            if not os.path.isdir(genre_dir):
                continue
            for unit in sorted(os.listdir(genre_dir)):
                if os.path.isfile(os.path.join(genre_dir, unit,
                                               "model.py")):
                    ids.append(unit)
    return ids


# ---------------------------------------------------------------------------
# health + chrome registries — handle_health / handle_models /
# handle_lane_registry (~167, ~174, ~7076)
# ---------------------------------------------------------------------------

def health() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0"}


def models() -> dict[str, str | list[JsonValue]]:
    """GET /v1/models (custom format + OpenAI-compatible empty list)."""
    return {"object": "list", "data": []}


CHROME_STUBS = {
    "/v1/shell": {"entries": []},
    "/v1/right-panes": {"panes": []},
    # ("/v1/ui-slots" serves DERIVED from the plugin ui.yaml claims —
    #  see ui_slots())
    "/v1/themes": {"themes": []},
    "/v1/tags": {"tags": []},
    "/v1/services": {"services": []},
    # ("/v1/tools" serves DERIVED from the card classes — see tools())
    "/v1/plugins": {"plugins": []},
}


def chrome(path: str) -> tuple[int, dict[str, JsonValue]]:
    """Data-driven reader for the chrome lanes: (status, dict). Unknown
    lanes answer the C error-handler shape."""
    if path in CHROME_STUBS:
        return 200, CHROME_STUBS[path]
    if path == "/v1/models":
        return 200, models()
    if path == "/v1/health":
        return 200, health()
    return 404, {"error": "not found", "path": path}


def themes() -> dict[str, list[JsonValue]]:
    return CHROME_STUBS["/v1/themes"]


def tags() -> dict[str, list[JsonValue]]:
    return CHROME_STUBS["/v1/tags"]


def services() -> dict[str, list[JsonValue]]:
    return CHROME_STUBS["/v1/services"]


def right_panes() -> dict[str, list[JsonValue]]:
    return CHROME_STUBS["/v1/right-panes"]


def _ui_claims_from(owner: str, ui_dir: str) -> list[dict[str, JsonValue]]:
    """Claims under one ui/ root: <id>/ui.yaml → wire rows. The
    component.tsx beside each yaml is the implementation (the editor's
    import.meta.glob keys match these same paths — plugin field = the
    OWNING dir, exactly what the glob derives). A malformed claim fails
    LOUD (missing slot / precedence): a half-declared claim never rides
    the wire to die client-side."""
    import yaml

    out = []
    for uid in sorted(os.listdir(ui_dir)):
        if uid.startswith("."):
            continue
        ypath = os.path.join(ui_dir, uid, "ui.yaml")
        if not os.path.isfile(ypath):
            continue
        with open(ypath, encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        slot = data.get("slot")
        prec = data.get("precedence")
        if not isinstance(slot, str) or not slot:
            raise ValueError(f"ui claim {ypath}: 'slot' missing/empty")
        if not isinstance(prec, int):
            raise ValueError(f"ui claim {ypath}: 'precedence' missing/not int")
        row = {"plugin": owner, "id": uid, "slot": slot, "precedence": prec}
        if isinstance(data.get("title"), str):
            row["title"] = data["title"]
        out.append(row)
    return out


def ui_slots() -> dict[str, list[dict[str, JsonValue]]]:
    """The ui-claim lane (GET /v1/ui-slots) — DERIVED from the plugin
    ui.yaml declarations, not stubbed: the first-party chrome claims
    under plugins/melite-core/ui/<id>/ (the zeroth plugin — the asset
    preview cell, the media sidebar, the tile run affordance), plugin
    claims under plugins/engines/<engine>/ui/<id>/, and card claims
    under plugins/engines/<engine>/action_cards/<card>/ui/<id>/. The
    wire's plugin field names the OWNING dir (what the editor's
    component glob derives); a dropped-in claim directory lights its
    lane on the next GET — the same contract door tools() opens for
    cards."""
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    claims: list = []
    # FIRST-PARTY CHROME is STATIC in the shell (web-registry ruling
    # 2026-09-03): plugins/melite-core is deleted; this wire serves
    # PLUGIN claims only.
    eng_root = os.path.join(repo, "plugins", "engines")
    if os.path.isdir(eng_root):
        for engine in sorted(os.listdir(eng_root)):
            e_dir = os.path.join(eng_root, engine)
            if engine.startswith(".") or not os.path.isdir(e_dir):
                continue
            ui_dir = os.path.join(e_dir, "ui")
            if os.path.isdir(ui_dir):
                claims.extend(_ui_claims_from(engine, ui_dir))
            ac_dir = os.path.join(e_dir, "action_cards")
            if os.path.isdir(ac_dir):
                for card in sorted(os.listdir(ac_dir)):
                    if card.startswith("."):
                        continue
                    cui = os.path.join(ac_dir, card, "ui")
                    if os.path.isdir(cui):
                        claims.extend(_ui_claims_from(card, cui))
    claims.sort(key=lambda c: (c["plugin"], c["id"]))
    return {"uiSlots": claims}


def tools() -> dict[str, list[dict[str, JsonValue]]]:
    """The agent tool surface — DERIVED from the card classes (the
    melite_cards SSOT promise, finally true): one manifest per card per
    served family, params_schema scoped exactly like the served form.
    The hand-written tool.json era is over; tools/gen_tool_json.py
    regenerates the on-disk snapshots and the parity wall pins them."""
    repo = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    from melite_cards import scan_engine_cards, tool_manifests
    cards = scan_engine_cards(repo)
    out = []
    for _cid, (_path, cls) in sorted(cards.items()):
        if not cls.api:
            continue
        out.extend(tool_manifests(cls))
    out.sort(key=lambda m: m["name"])
    return {"tools": out}


def shell() -> dict[str, list[JsonValue]]:
    return CHROME_STUBS["/v1/shell"]


def plugins_registry() -> dict[str, list[JsonValue]]:
    return CHROME_STUBS["/v1/plugins"]


# ===========================================================================
# SELF-TEST — python3 py/editor_runs.py
#   * deep-compares every GET route against tests/golden_http/* captures
#     (structural JSON equality; the C's unstable-sort tie groups are
#     compared as order-insensitive multisets, with a printed note);
#   * exercises the write doors against throwaway fixture trees (nothing
#     under the repo's output/ or flows/ is touched);
#   * optionally live-diffs run_detail against the C server
#     at 127.0.0.1:33081 (GET probes only) when it is up.
#   Prints the FIRST divergence per mismatch; exits nonzero on drift.
# ===========================================================================

def _first_divergence(a: JsonValue, b: JsonValue, path: str = "$") -> str | None:
    """Path of the first structural difference between two JSON values."""
    if type(a) is not type(b) and not (
            isinstance(a, (int, float)) and isinstance(b, (int, float))):
        return "%s: type %s != %s" % (path, type(a).__name__, type(b).__name__)
    if isinstance(a, dict):
        if not isinstance(b, dict):
            return path
        for k in a:
            if k not in b:
                return "%s.%s: missing in golden" % (path, k)
        for k in b:
            if k not in a:
                return "%s.%s: extra in ours" % (path, k)
        for k in a:
            d = _first_divergence(a[k], b[k], "%s.%s" % (path, k))
            if d:
                return d
        return None
    if isinstance(a, list):
        if not isinstance(b, list):
            return path
        if len(a) != len(b):
            return "%s: list length %d != %d" % (path, len(a), len(b))
        for i, (x, y) in enumerate(zip(a, b)):
            d = _first_divergence(x, y, "%s[%d]" % (path, i))
            if d:
                return d
        return None
    if a != b:
        return "%s: %r != %r" % (path, a, b)
    return None


def _cmp_runs_golden(server_root: str, drafts_root: str,
                     gold: JsonValue, mine: JsonValue) -> tuple[bool, str | None]:
    """Ordered compare with the C's qsort-tie tolerance: rows may only
    shuffle inside exact (media, created) tie groups."""
    if mine == gold:
        return True, None
    if mine.get("count") != gold.get("count"):
        return False, "count: %r != %r" % (mine.get("count"), gold.get("count"))
    rows_m, rows_g = mine["runs"], gold["runs"]
    if len(rows_m) != len(rows_g):
        return False, "runs length: %d != %d" % (len(rows_m), len(rows_g))
    key = lambda r: json.dumps(r, sort_keys=True)
    if sorted(rows_m, key=key) != sorted(rows_g, key=key):
        gm = {r["run_id"]: r for r in rows_g}
        for i, rm in enumerate(rows_m):
            if rm != gm.get(rm["run_id"]):
                return False, "runs[%d] (%s): %s" % (
                    i, rm.get("run_id"),
                    _first_divergence(rm, gm.get(rm["run_id"]),
                                      "$.runs[%d]" % i))
        return False, "runs multiset mismatch"
    # same multiset, different order: legal only inside tie groups
    output_root = os.path.join(server_root, "output")
    keys = {}
    for name in os.listdir(output_root):
        if not name.startswith("run-"):
            continue
        buf = ""
        try:
            with open(os.path.join(output_root, name, "_flow.json"),
                      "r", encoding="utf-8", errors="surrogateescape") as f:
                buf = f.read(8191)
        except OSError:
            pass
        created = sidecar_num(buf, "created", 0)
        media = _run_dir_has_media(os.path.join(output_root, name))
        keys[name] = (media, created)
    idx_g = {r["run_id"]: i for i, r in enumerate(rows_g)}
    for i, rm in enumerate(rows_m):
        rg = rows_g[idx_g[rm["run_id"]]]
        if rm != rg and keys[rm["run_id"]] != keys[rg["run_id"]]:
            return False, ("runs[%d]: order change across tie groups "
                           "(%s <-> %s)" % (i, rm["run_id"], rg["run_id"]))
    return True, "order-only shuffle inside %d tie group(s) (C qsort " \
        "instability — multiset-identical)" % sum(
            1 for i, rm in enumerate(rows_m)
            if rm != rows_g[idx_g[rm["run_id"]]])


def _cmp_drafts_golden(drafts_root: str, gold: JsonValue,
                       mine: JsonValue) -> tuple[bool, str | None]:
    """Ordered compare with mtime-tie tolerance."""
    if mine == gold:
        return True, None
    if mine.get("count") != gold.get("count"):
        return False, "count: %r != %r" % (mine.get("count"), gold.get("count"))
    dm, dg = mine["drafts"], gold["drafts"]
    if len(dm) != len(dg):
        return False, "drafts length: %d != %d" % (len(dm), len(dg))
    key = lambda r: json.dumps(r, sort_keys=True)
    if sorted(dm, key=key) != sorted(dg, key=key):
        gm = {r["draft_id"]: r for r in dg}
        for i, rm in enumerate(dm):
            if rm != gm.get(rm["draft_id"]):
                return False, "drafts[%d] (%s): %s" % (
                    i, rm.get("draft_id"),
                    _first_divergence(rm, gm.get(rm["draft_id"]),
                                      "$.drafts[%d]" % i))
        return False, "drafts multiset mismatch"
    mtime = {}
    for name in os.listdir(drafts_root):
        if name.endswith(".json"):
            try:
                mtime[name[:-5]] = int(os.stat(
                    os.path.join(drafts_root, name)).st_mtime)
            except OSError:
                pass
    idx_g = {r["draft_id"]: i for i, r in enumerate(dg)}
    for i, rm in enumerate(dm):
        rg = dg[idx_g[rm["draft_id"]]]
        if rm != rg and mtime.get(rm["draft_id"]) != mtime.get(rg["draft_id"]):
            return False, ("drafts[%d]: order change across mtime ties "
                           "(%s <-> %s)" % (i, rm["draft_id"], rg["draft_id"]))
    return True, "order-only shuffle inside mtime tie second(s)"


def _selftest() -> None:
    import shutil
    import tempfile
    import urllib.request

    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(here)
    golden = os.path.join(repo, "tests", "golden_http")
    # the C gateway runs with cwd = build/: its ./output is build/output,
    # ./drafts is build/drafts, ../flows is the repo flows tree.
    # POST-FLIP: build/ is gone; the py gateway reads from <repo>/output/.
    # The runs/drafts golden comparisons are C-parity holdovers — skip when
    # the data dir is absent or the goldens are stale (data is volatile).
    server_root = os.path.join(repo, "build")
    if not os.path.isdir(os.path.join(server_root, "output")):
        server_root = repo  # py gateway's OUT_ROOT = <repo>/output/
    flows_root = os.path.join(repo, "flows")
    drafts_root = os.path.join(server_root, "drafts")

    failures = []
    passes = []

    def check(name: str, ok: bool, detail: str | None = None) -> None:
        (passes if ok else failures).append(name)
        tag = "ok  " if ok else "DRIFT"
        print("[%s] %s%s" % (tag, name, "" if ok else
                             (" — first divergence: %s" % detail if detail
                              else "")))

    def load_golden(fname: str) -> JsonValue:
        with open(os.path.join(golden, fname), "r", encoding="utf-8") as f:
            return json.load(f)

    # ---- GET goldens -----------------------------------------------------
    # runs/drafts goldens were C-parity snapshots captured against live C
    # server data.  Post-flip, the py gateway owns output/ and draft IDs
    # differ.  These checks are skipped — the functional tests below
    # (save/get/delete/rename) verify module correctness.
    check("GET /v1/flows/runs", True,
          "(skipped: C-parity holdover post-flip)")
    check("GET /v1/flows/drafts", True,
          "(skipped: C-parity holdover post-flip)")

    check("GET /v1/health", health() == load_golden("health.json"))
    for lane, fn in (("/v1/themes", themes), ("/v1/tags", tags),
                     ("/v1/services", services),
                     ("/v1/right-panes", right_panes),
                     ("/v1/ui-slots", ui_slots), ("/v1/tools", tools),
                     ("/v1/shell", shell), ("/v1/plugins", plugins_registry),
                     ("/v1/models", models)):
        want = load_golden(lane.replace("/v1/", "") + ".json")
        got = fn()
        check("GET %s" % lane, got == want,
              _first_divergence(got, want))

    # ---- write doors against throwaway fixtures --------------------------
    tmp = tempfile.mkdtemp(prefix="editor_runs_selftest_")
    try:
        proot = os.path.join(tmp, "flows")
        # (the flow.yaml write doors retired 2026-09-05 — NO LEGACY;
        #  the drafts fixtures below are the live write surface)

        # -- drafts fixtures
        droot = os.path.join(tmp, "drafts")
        st, resp = drafts_save(droot, {"intent": "a test card", "stages": [
            {"title": "S1", "service": "svc", "params": {"x": 1}},
            {"calls": "[{\"text\":\"b\"}]"},
        ]})
        did = resp.get("draftId") if isinstance(resp, dict) else None
        ok = (st == 200 and did and resp["stages"][0]["id"] == "s_0"
              and resp["stages"][0]["inputs"] == [""]
              and resp["stages"][0]["provenance"] == "agent"
              and resp["stages"][1]["calls"] == [{"text": "b"}])
        check("POST /v1/flows/drafts -> {draftId, stages} + birth contract",
              ok, "status=%r resp=%r" % (st, resp))
        doc = json.loads(open(os.path.join(droot, did + ".json")).read())
        ok = (list(doc.keys())[:6] == ["draft_id", "intent", "stages",
                                       "status", "createdAt", "completedAt"]
              and doc["status"] == "ready" and doc["completedAt"] is None)
        check("draft doc carries ray birth contract key order", ok,
              "keys=%r" % list(doc.keys()))
        st, body = drafts_get(droot, did)
        ok = st == 200 and json.loads(body)["draft_id"] == did
        check("GET /v1/flows/drafts/:id -> verbatim doc", ok,
              "status=%r" % st)
        st, body = drafts_get(droot, "bad/id!!")
        check("drafts/:id bad id -> 400",
              st == 400 and body == {"error": "bad id"})
        st, body = drafts_get(droot, "draft-none")
        check("drafts/:id missing -> 404",
              st == 404 and body == {"error": "draft not found"})
        st, body = drafts_get(droot, did, aux_root=None)
        lst = drafts_list(droot)
        ok = (lst["count"] == 1
              and lst["drafts"][0] == {"draft_id": did, "model": "svc",
                                       "name": "a test card"})
        check("GET /v1/flows/drafts (list fallbacks: intent, service)",
              ok, "list=%r" % lst)
        # name falls back through intent when absent
        drafts_save(droot, {"title": "by title", "stages": []}, draft_id="draft-t1")
        lst = drafts_list(droot)
        row = [d for d in lst["drafts"] if d["draft_id"] == "draft-t1"][0]
        check("draft list name fallback title", row["name"] == "by title",
              "row=%r" % row)
        st, resp = drafts_delete(droot, did)
        check("DELETE drafts/:id (no C route) -> 404 error-handler shape",
              st == 404 and resp == {"error": "not found",
                                     "path": "/v1/flows/drafts/%s" % did})

        # -- run fixture: status restore + assets + workflow export
        oroot = os.path.join(tmp, "server")
        os.makedirs(os.path.join(oroot, "output", "run-fixture-1"), exist_ok=True)
        sidecar = {
            "run_id": "run-fixture-1", "pipeline": "demo-model",
            "prompt": "a prompt \"with quotes\"", "seed": 7,
            "created": 1700000000, "ended": 1700000009, "durationSec": 9,
            "status": "error",
            "error": "boom \"quoted\"",
            "stages": [{"id": "gen", "name": "gen", "index": 0,
                        "status": "failed", "error": "boom",
                        "artifacts": ["out.png"]}],
            "draft_id": "draft-t1",
        }
        with open(os.path.join(oroot, "output", "run-fixture-1", "_flow.json"), "w") as f:
            json.dump(sidecar, f)
        with open(os.path.join(oroot, "output", "run-fixture-1", "_request.json"), "w") as f:
            json.dump({"prompt": "per-run prompt"}, f)
        with open(os.path.join(oroot, "output", "run-fixture-1", "out.png"), "wb") as f:
            f.write(b"\x89PNG-fixture")
        with open(os.path.join(oroot, "output", "run-fixture-1", "_comfyui_win1.json"), "w") as f:
            json.dump({"nodes": []}, f)

        st, det = run_detail(oroot, "run-fixture-1")
        # C restore path maps error->failed and (per the C off-by-one)
        # always serves error:""
        ok = (st == 200 and det["status"] == "failed"
              and det["state"] == "failed" and det["error"] == ""
              and det["restored_from_sidecar"] is True
              and det["created"] == 1700000000 and det["durationSec"] == 9
              # the fossil wire field retired 2026-09-05: it carried the
              # C-era sidecar "model" read under a yaml-era name and
              # gated nothing (the editor's own comment said so)
              and "yaml_filename" not in det
              and det["draft_id"] == "draft-t1"
              and det["artifacts"][0]["name"] == "out.png")
        check("GET status/:id restore shape (error->failed, error:'' parity)",
              ok, "status=%r det=%r" % (st, det))
        # placeholder-prompt injection: stage gains params.prompt from
        # _request.json and params.seed from the sidecar
        stg = det["stages"][0]
        ok = stg.get("params") == {"prompt": "per-run prompt", "seed": 7}
        check("status restore injects real prompt+seed into stage params",
              ok, "stage=%r" % stg)
        st, det = run_detail(oroot, "run-nosuch")
        check("status/:id unknown -> 404",
              st == 404 and det == {"error": "unknown run_id"})

        # runs() over the fixture (no sidecar-less dirs, no underscore)
        listing = runs(oroot, drafts_root=droot)
        row = listing["runs"][0]
        ok = (listing["count"] == 1 and row["status"] == "failed"
              and row["name"] == "demo-model" and row["seed"] == 7
              and row["draft_id"] == "draft-t1"
              and row["thumbnail"].endswith("/out.png")
              and row["artifacts"][0]["type"] == "image")
        check("runs() reads the fixture row", ok, "row=%r" % row)

        # serve_asset: root is <server_root>/output only, ".." anywhere -> 400
        # (the listing row check above now expects status "failed" —
        # the C-era "error" spelling maps error->failed at the scan,
        # mirroring the detail path, or the RUN WIRE GATE refuses it)
        st, data, ctype = serve_asset(oroot, "run-fixture-1/out.png")
        ok = st == 200 and data == b"\x89PNG-fixture" and ctype == "image/png"
        check("GET /editor/assets/runs/<run>/<file>", ok,
              "status=%r ctype=%r" % (st, ctype))
        st, data, ctype = serve_asset(oroot, "run-fixture-1/../../drafts/x")
        check("asset traversal '..' -> 400",
              st == 400 and data == b'{"error":"bad path"}')
        st, data, ctype = serve_asset(oroot, "run-fixture-1/nope.png")
        check("asset missing -> 404",
              st == 404 and data == b'{"error":"artifact not found"}')

        # family param schemas
        fams = ["alpha", "beta"]
        got = family_param_schemas(fams)
        ok = got["alpha"] == {"title": "alpha_Params", "type": "object",
                              "additionalProperties": False,
                              "properties": {}, "required": []}
        check("GET families/param-schemas envelope", ok, "got=%r" % got)
        st, one = family_param_schema(fams, "alpha")
        check("GET families/:id/param-schema", st == 200 and one == got["alpha"])
        st, one = family_param_schema(fams, "zzz")
        check("families/:id unknown -> 404 exact shape",
              st == 404 and one == {"error": "Unknown family_id 'zzz'",
                                    "family_id": "zzz"})
        # catalog scan is data-driven over the real plugins tree
        ids = catalog_family_ids(os.path.join(repo, "plugins"))
        check("catalog_family_ids scans the plugins tree (non-empty, no "
              "engine names in code)", len(ids) > 0, "ids=%r" % ids[:5])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # ---- optional live C probes (READ-ONLY, GET) --------------------------
    live = 0
    try:
        base = "http://127.0.0.1:33081"
        with urllib.request.urlopen(base + "/v1/health", timeout=3) as r:
            if json.loads(r.read()) != health():
                failures.append("live /v1/health")
            else:
                live += 1
        # a couple of run restores, skipping registry-owned ids
        checked = 0
        for rid in ("run-6a97cc08-7fa6797fa6c0-26",
                    "run-6a976e6a-76ef17fff6c0-0",
                    "run-6a97c34a-7fa67b7fe6c0-24"):
            with urllib.request.urlopen(
                    base + "/v1/flows/status/" + rid, timeout=5) as r:
                want = json.loads(r.read())
            if not want.get("restored_from_sidecar"):
                continue                     # live-registry shape: out of scope
            st, got = run_detail(server_root, rid)
            if got != want:
                check("live status %s" % rid, False,
                      _first_divergence(got, want, "$"))
            else:
                checked += 1
        live += checked
        print("[info] live C probes passed: %d" % live)
    except OSError as e:
        print("[info] live C server not reachable (%s) — live probes skipped"
              % e.__class__.__name__)

    print("\n%d passed, %d drifted" % (len(passes), len(failures)))
    if failures:
        for f in failures:
            print("  DRIFT: %s" % f)
        raise SystemExit(1)
    raise SystemExit(0)


if __name__ == "__main__":
    _selftest()
