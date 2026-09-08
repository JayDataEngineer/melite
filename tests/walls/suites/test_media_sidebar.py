#!/usr/bin/env python3
"""Media-sidebar contract wall (the 2026-09-06 audit remediation).

Every finding class from docs/audits/media-sidebar-audit.md gets a
mechanical pin — all OFFLINE (tree reads + built bundles, no gateway,
no browser):

- KIND PARITY (F1): media-kinds.json is the SSOT — py/editor_runs.py
  derives its classifier + gallery sets from it (import the module,
  compare the effective tuples), and the BUILT client bundle embeds
  every gallery ext (kindOf regexes carry them literally).
- DEAD-ROUTE SCAN (F4): every `/infer-media/<route>` the client fetches
  must match a `path:` registration in the host half. A retired host
  route with live client calls fails here, not as an eternal empty tab.
- VARIANT COVERAGE (F6): every kind's chip label renders from the SSOT —
  each label string must appear in the built client bundle.
- SEAM PARITY (F7-item-7): the deck-seam literal is defined once
  (apply-guard.ts DECK_OPEN_WITH_DRAFT), restated nowhere, and matches
  the provider's literal in melite-card-deck.
- LOUD DOOR (F2): the host build carries the drop-count messages —
  malformed rows refuse loudly via the errors array, never silently.
"""
import json
import re
import sys
from pathlib import Path

# media-kinds.json is JSON (no future-import — old-style alias).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

REPO = Path(__file__).resolve().parents[3]
MEDIA = REPO / "packages" / "web" / "dsh" / "media-plugin"
HOST_SRC = MEDIA / "src" / "index.ts"
CLIENT_SRC = MEDIA / "src" / "client"
HOST_LIB = MEDIA / "lib" / "index.js"
CLIENT_LIB = MEDIA / "lib" / "client.js"
DECK_ENTRY = REPO / "packages" / "web" / "dsh" / "melite-card-deck" / "src" / "client" / "deck-sidebar-entry.tsx"


def _kinds() -> dict[str, JsonValue]:
    doc = json.loads((MEDIA / "media-kinds.json").read_text(encoding="utf-8"))
    kinds = doc["kinds"]
    assert set(kinds) == {"video", "image", "audio", "model"}, set(kinds)
    for name, spec in kinds.items():
        assert set(spec["gallery"]) <= set(spec["exts"]), name
        assert isinstance(spec["label"], str) and spec["label"], name
    return kinds


def test_kind_vocabulary_shape() -> None:
    _kinds()  # malformed SSOT refuses here, not downstream


def test_py_derives_from_ssot() -> None:
    kinds = _kinds()
    sys.path.insert(0, str(REPO / "py"))
    try:
        import editor_runs
    finally:
        sys.path.remove(str(REPO / "py"))
    gallery = {e for k in ("video", "image", "audio", "model") for e in kinds[k]["gallery"]}
    assert set(editor_runs._MEDIA_EXTS) == gallery
    assert set(editor_runs._IMG) == set(kinds["image"]["exts"])
    assert set(editor_runs._AUD) == set(kinds["audio"]["exts"])
    assert set(editor_runs._VID) == set(kinds["video"]["exts"])
    assert set(editor_runs._MODEL) == set(kinds["model"]["exts"])
    assert editor_runs.artifact_type("x.glb") == "model"
    # Door-tier caps ride the same SSOT (policy.maxListedImages) — no
    # hand-kept copy in the py door.
    doc = json.loads((MEDIA / "media-kinds.json").read_text(encoding="utf-8"))
    assert editor_runs._MAX_IMGS == doc["policy"]["maxListedImages"]
    # One document, one read: kinds + policy derive from _MEDIA_DOC
    # (the duplicated _media_kinds/_media_policy loaders are gone).
    assert not hasattr(editor_runs, "_media_policy"), "dead loader kept"
    assert editor_runs._MEDIA_KINDS is editor_runs._MEDIA_DOC["kinds"]
    assert editor_runs._MEDIA_POLICY is editor_runs._MEDIA_DOC["policy"]


def test_client_imports_ssot() -> None:
    panel = (CLIENT_SRC / "MediaPanel.tsx").read_text(encoding="utf-8")
    assert "media-kinds.json" in panel, "panel must derive kinds from the SSOT, never restate them"
    for literal in ("mp4|webm", "png|jpg", "mp3|wav", "glb|gltf"):
        assert literal not in panel, "hand-kept ext regex: " + literal


def test_bundle_embeds_every_gallery_ext() -> None:
    kinds = _kinds()
    bundle = CLIENT_LIB.read_text(encoding="utf-8")
    missing = [e for k in kinds for e in kinds[k]["gallery"] if e not in bundle]
    assert not missing, "built client drops kinds: " + ",".join(missing)


def test_variant_labels_render() -> None:
    kinds = _kinds()
    bundle = CLIENT_LIB.read_text(encoding="utf-8")
    missing = [kinds[k]["label"] for k in kinds if kinds[k]["label"] not in bundle]
    assert not missing, "chip labels missing from bundle: " + ",".join(missing)


def test_no_dead_routes() -> None:
    host = HOST_SRC.read_text(encoding="utf-8")
    registered = set(re.findall(r"path:\s*'(/infer-media/[^']*)'", host))
    fetched: set[str] = set()
    for src in CLIENT_SRC.glob("*.tsx"):
        text = src.read_text(encoding="utf-8")
        for m in re.findall(r"'(/infer-media/[^'?]*)[?']", text):
            fetched.add(m)
    dead = fetched - registered
    assert not dead, "client fetches unregistered host routes: " + ",".join(sorted(dead))


def test_seam_literal_single_definition() -> None:
    guard = (CLIENT_SRC / "apply-guard.ts").read_text(encoding="utf-8")
    defs = re.findall(r"DECK_OPEN_WITH_DRAFT = '([^']*)'", guard)
    assert len(defs) == 1, defs
    seam = defs[0]
    for src in (CLIENT_SRC / "MediaPanel.tsx", CLIENT_SRC / "FlowsPanel.tsx"):
        assert seam not in src.read_text(encoding="utf-8"), "restated seam literal in " + src.name
    provider = DECK_ENTRY.read_text(encoding="utf-8")
    assert seam in provider, "provider no longer sets the seam"


def test_host_door_is_loud() -> None:
    lib = HOST_LIB.read_text(encoding="utf-8")
    for msg in ("without run_id", "without a usable url", "without draft_id"):
        assert msg in lib, "loud-drop message missing from host build: " + msg
    assert "`gateways` is required" in lib, "required-gateways refusal missing from host build"


def test_truncation_marker_is_known_shape() -> None:
    # The gateway appends a trailing {truncated,listed,total} marker row
    # (run_artifacts documents it) — the host must handle it as a KNOWN
    # shape (counts ride the run row), never count it as malformed.
    host = HOST_SRC.read_text(encoding="utf-8")
    assert ").truncated === true" in host, "marker branch missing from host door"
    assert ".truncated = { listed" in host, "marker counts must ride the run row"


def test_marker_counts_media_candidates_only() -> None:
    # 2026-09-06 fix (found by the gap-6 stat surfacing): `total` counts
    # media candidates ONLY. Sidecars (_flow.json) and non-media files
    # never count — the old semantics put a marker on EVERY run (463/463
    # "capped" = noise that hid real cap signals).
    import tempfile

    sys.path.insert(0, str(REPO / "py"))
    try:
        import editor_runs
    finally:
        sys.path.remove(str(REPO / "py"))
    with tempfile.TemporaryDirectory() as td:
        from pathlib import Path as P
        P(td, "_flow.json").write_text("{}", encoding="utf-8")
        P(td, "card.json").write_text("{}", encoding="utf-8")
        P(td, "a.png").write_bytes(b"x")
        arts = editor_runs.run_artifacts(td, "./output/x")
        assert not any(a.get("truncated") for a in arts), (
            "sidecars/non-media must not trigger the marker"
        )
        P(td, "b.png").write_bytes(b"x")
        P(td, "c.png").write_bytes(b"x")
        P(td, "d.png").write_bytes(b"x")
        arts = editor_runs.run_artifacts(td, "./output/x")
        marker = [a for a in arts if a.get("truncated")]
        assert marker and marker[0]["total"] == 4 and marker[0]["listed"] == 3, (
            "image cap must flag exactly the dropped media"
        )


def test_artifacts_descend_one_level() -> None:
    # 2026-09-06 fix: the merged single-graph path lands ComfyUI outputs
    # at <run>/generate/<file> — the sort (`_run_dir_has_media`) already
    # descended, the listing did not (61 runs read as media-less).
    # `name` stays the bare filename; `path`/`url` carry the nested
    # relpath the asset door serves (`..` refused at serve time).
    import tempfile

    sys.path.insert(0, str(REPO / "py"))
    try:
        import editor_runs
    finally:
        sys.path.remove(str(REPO / "py"))
    with tempfile.TemporaryDirectory() as td:
        from pathlib import Path as P
        P(td, "_flow.json").write_text("{}", encoding="utf-8")
        P(td, "top.mp4").write_bytes(b"x")
        gen = P(td, "generate")
        gen.mkdir()
        (gen / "SaveImage.0_gen_00001_.png").write_bytes(b"y")
        (gen / "_thumb.png").write_bytes(b"z")
        deep = gen / "deeper"
        deep.mkdir()
        (deep / "x.png").write_bytes(b"w")
        priv = P(td, "_priv")
        priv.mkdir()
        (priv / "q.png").write_bytes(b"v")
        arts = editor_runs.run_artifacts(td, "./output/run-t1")
        urls = [a.get("url") for a in arts if a.get("url")]
        assert urls == [
            "/v1/assets/runs/run-t1/top.mp4",
            "/v1/assets/runs/run-t1/generate/SaveImage.0_gen_00001_.png",
        ], "top-first order, bare names, nested rels: %s" % urls
        assert arts[1]["name"] == "SaveImage.0_gen_00001_.png"
        assert arts[1]["path"] == ("./output/run-t1/generate/"
                                     "SaveImage.0_gen_00001_.png")
        assert not any(a.get("truncated") for a in arts)
        # nested-only run still gets its poster through the same rule
        only = P(td, "only")
        only.mkdir()
        (only / "b.png").write_bytes(b"y")
        P(td, "top.mp4").unlink()
        (gen / "SaveImage.0_gen_00001_.png").unlink()
        assert editor_runs._run_thumbnail(td, "run-t1") == \
            "/v1/assets/runs/run-t1/only/b.png"


def test_built_bundles_fresh() -> None:
    # A wall that reads lib/ goes green on STALE bundles unless freshness
    # is pinned: every src file must be older than both built artifacts.
    # (Run `pnpm build` in the plugin after editing src.)
    for lib in (HOST_LIB, CLIENT_LIB):
        assert lib.exists(), "built bundle missing: " + lib.name
        built = lib.stat().st_mtime
        for src in MEDIA.glob("src/**/*.*"):
            assert src.stat().st_mtime <= built + 2, (
                "stale bundle: %s is newer than %s — rebuild before walls"
                % (src.relative_to(MEDIA), lib.name))


# ---------------------------------------------------------------- suites --
# The plugin carries its own OFFLINE behavioral suites (no live gateway, no
# GPU): the host-door node suite drives the real built door against a stub
# gateway, the vitest suite drives the panels under jsdom, and the e2e
# mounts the BUILT client bundle in real Chromium. A pattern without a
# wall is a suggestion — the wall invokes them so CI cannot skip them.
# (test/runs-window.mjs stays a LIVE-only script: `pnpm test:runs` against
# a running gateway, never a wall dependency.)


def _run(cmd: list[str]) -> None:
    import subprocess

    proc = subprocess.run(
        cmd, cwd=MEDIA, capture_output=True, text=True, timeout=600
    )
    assert proc.returncode == 0, (
        "offline suite failed: %s | stdout tail: %s | stderr tail: %s"
        % (" ".join(cmd), proc.stdout[-2000:], proc.stderr[-2000:])
    )


def test_host_door_suite() -> None:
    # malformed drop, marker ride, 502 all-down, dedupe visibility,
    # proxy bad_src + Range forwarding — against the REAL built door.
    _run(["node", "--test", "test/host-door.test.mjs"])


def test_artifact_range_suite() -> None:
    _run(["node", "--test", "test/artifact-range.test.mjs"])


def test_client_suite() -> None:
    # jsdom + Testing Library: classifier precedence, untrusted params,
    # chips/truncation render, overlay routing, viewer seam, no-seam error.
    _run(["node_modules/.bin/vitest", "run"])


def test_e2e_harness_suite() -> None:
    # Real Chromium: the 3D click chain on the BUILT client bundle
    # (the Sep-6 outage class). Rebuilds the harness only when stale;
    # chromium comes from the repo playwright cache.
    _run(["node", "test/e2e/build-harness.mjs"])
    _run(["node", "test/e2e/e2e.mjs"])


def test_tokens_single_site() -> None:
    # F6 remediation: the styling family declares every
    # var(--dsw-alias-...) string ONCE in ui.tokens.ts. The panels carry
    # no quoted token literals (the .im-tile <style> blob keeps CSS vars
    # in CSS form — exempt), and every token name they reference is an
    # export of the single site.
    tokens = (CLIENT_SRC / "ui.tokens.ts").read_text(encoding="utf-8")
    exported = set(re.findall(r"export const (\w+)", tokens))
    assert exported, "ui.tokens.ts exports nothing"
    for panel_name in ("MediaPanel.tsx", "FlowsPanel.tsx", "ui.tsx"):
        src = (CLIENT_SRC / panel_name).read_text(encoding="utf-8")
        for line in src.splitlines():
            if ".im-tile{" in line:
                continue  # CSS stylesheet blob — var() is correct there
            assert "'var(--dsw-alias-" not in line, (
                "%s restates a token literal: %s" % (panel_name, line.strip())
            )
        imported = re.search(
            r"import \{([^}]*)\} from './ui.tokens.ts'", src
        )
        if imported:
            names = {n.strip().rstrip(",") for n in imported.group(1).splitlines() if n.strip()}
            unknown = names - exported
            assert not unknown, (
                "%s imports non-token names: %s" % (panel_name, sorted(unknown))
            )
