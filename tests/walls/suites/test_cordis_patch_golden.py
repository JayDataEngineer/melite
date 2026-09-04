"""test_cordis_patch_golden.py — the provisioner patch is the SSOT.

The @infer/dsh-provisioner's cordis.patch.yml inserts into ANY profile
and is the contract by which the inference estate mounts in DSH. Drift
here is the class of bug the operator has hit twice this session:

  * 2026-08-26: dsh-better-sidebar declared in dependencies but not
    in dsh.profile.bundles — the cordis loader only mounts bundles,
    so the right-sidebar registry never registered and the web boot
    failed with 'pending (waiting for service: betterSidebar)'.
  * 2026-09-04: @infer-media/dsh-media removed from cordis.patch.yml
    but the bin/infer-provision.mjs webRows list still named it for
    the headless-disabled path. Drift between the two surfaces.

This wall pins the cross-surface invariants the loader relies on.
The provisioner itself is the source of truth; the bin script and
the provisioner package.json are derived views that MUST stay in
lockstep. No network, no GPU, no DSH.

Run: pytest tests/walls/suites/test_cordis_patch_golden.py -v
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from _anchor import REPO

PROVISIONER = REPO / "plugins" / "harness" / "dsh" / "provisioner"
PATCH = PROVISIONER / "cordis.patch.yml"
PROVISIONER_PKG = PROVISIONER / "package.json"
BIN = PROVISIONER / "bin" / "infer-provision.mjs"


def _parse_patch_ids_and_names():
    text = PATCH.read_text()
    rows = []
    in_insert = False
    cur = None
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("- insert:"):
            in_insert = True
            continue
        if not in_insert:
            continue
        if s.startswith("- id:"):
            if cur and cur.get("id"):
                rows.append(cur)
            cur = {"id": s[len("- id:"):].strip(), "name": ""}
        elif s.startswith("name:") and cur is not None:
            cur["name"] = s[len("name:"):].strip().strip(chr(39) + chr(34))
    if cur and cur.get("id"):
        rows.append(cur)
    return rows


def _parse_bin_web_rows():
    text = BIN.read_text()
    m = re.search(
        r"const\s+webRows\s*=\s*\[(.*?)\]",
        text, re.DOTALL,
    )
    assert m, f"{BIN} does not declare a const webRows = [...]"
    return [s.strip().strip(chr(39) + chr(34)) for s in m.group(1).split(",") if s.strip()]


class TestCordisPatchGolden:
    @pytest.fixture(scope="module")
    def patch_rows(self):
        return _parse_patch_ids_and_names()

    def test_patch_parses_with_unique_ids(self, patch_rows):
        ids = [r["id"] for r in patch_rows]
        dups = {i for i in ids if ids.count(i) > 1}
        assert not dups, f"cordis.patch.yml has duplicate row ids: {sorted(dups)}"
        assert ids, "cordis.patch.yml declares no rows"

    def test_every_row_has_an_npm_name(self, patch_rows):
        bad = []
        for r in patch_rows:
            n = r["name"]
            if not n:
                bad.append(f"{r['id']!r}: <missing name>")
                continue
            if not re.match(r"^@?[a-z0-9][a-z0-9._-]*(?:/[a-z0-9][a-z0-9._-]*)?$", n):
                bad.append(f"{r['id']!r}: {n!r} is not an npm-name shape")
        assert not bad, f"patch rows with invalid names: {bad}"

    def test_every_row_name_is_a_provisioner_dep(self, patch_rows):
        prov = json.loads(PROVISIONER_PKG.read_text())
        deps = set(prov.get("dependencies", {}).keys())
        missing = [r["name"] for r in patch_rows if r["name"] not in deps]
        assert not missing, f"patch names not declared in provisioner deps: {missing}"

    def test_bin_web_rows_is_a_subset_of_patch_ids(self):
        web = set(_parse_bin_web_rows())
        patch_ids = {r["id"] for r in _parse_patch_ids_and_names()}
        orphans = web - patch_ids
        assert not orphans, f"bin webRows references ids not in patch: {sorted(orphans)}"

    def test_every_web_mount_row_appears_in_bin_web_rows(self):
        web_mount_ids = {
            "infer-card-deck",
            "infer-card-view-host",
            "infer-card-view-client",
            "infer-gallery-host",
        }
        non_web_mount_ids = {"infer-tools"}
        web = set(_parse_bin_web_rows())
        missing_in_bin = web_mount_ids - web
        assert not missing_in_bin, f"web-mount rows NOT in bin webRows: {sorted(missing_in_bin)}"
        non_web_in_bin = non_web_mount_ids & web
        assert not non_web_in_bin, f"non-web rows listed in bin webRows: {sorted(non_web_in_bin)}"


class TestProvisionerBinBundleList:
    def test_provisioner_declares_its_bundle_patch(self):
        prov = json.loads(PROVISIONER_PKG.read_text())
        b = prov.get("dsh", {}).get("bundle", {})
        assert b, f"{PROVISIONER_PKG} does not declare dsh.bundle"
        patch_path = PROVISIONER / b.get("patch", "")
        assert patch_path.exists(), f"dsh.bundle.patch = {b.get('patch')!r} does not resolve"
        assert patch_path == PATCH, f"dsh.bundle.patch points at {patch_path.name} not the golden {PATCH.name}"

    def test_bin_exists_and_is_executable(self):
        b = BIN
        assert b.exists(), f"{b} missing"
        import stat
        mode = b.stat().st_mode
        assert mode & stat.S_IXUSR, f"{b} is not user-executable"
