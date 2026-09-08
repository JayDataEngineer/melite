"""Workspace-laws tripwires (no server needed).

Laws codified: secrets stay ignored, study clones stay ignored, no
packages glob in pnpm-workspace, no derived artifact at web root,
gen-registry.ts --check reports zero drift, pnpm parses.

STRUCTURE: every test takes the root `repo` fixture (tests/conftest.py)
explicitly -- no hidden state, no local second derivation (fixture
audit 2026-09-04, F1).
"""
import json
import os
import subprocess
from pathlib import Path

import pytest


def _read(rel: str, repo: Path) -> str:
    with open(os.path.join(repo, rel), encoding="utf-8") as f:
        return f.read()


def _exists(rel: str, repo: Path) -> bool:
    return os.path.exists(os.path.join(repo, rel))


class TestSecretSafety:
    def test_keystore_ignored(self, repo: Path) -> None:
        for rel in ("data/llm_keystore.json", "data/llm_keystore.key"):
            r = subprocess.run(
                ["git", "check-ignore", "-v", rel],
                cwd=repo, capture_output=True, text=True)
            assert r.returncode == 0, \
                f"{rel} is NOT ignored: {r.stderr}"
            assert "data/**" in r.stdout, \
                f"unexpected rule for {rel}: {r.stdout}"

    def test_study_clone_ignored(self, repo: Path) -> None:
        r = subprocess.run(
            ["git", "check-ignore", "-v", "references/comfy-mcp/README.md"],
            cwd=repo, capture_output=True, text=True)
        assert r.returncode == 0, f"study clone not ignored: {r.stderr}"


class TestPnpmWorkspace:
    def test_packages_domain_globs(self, repo: Path) -> None:
        # RE-DERIVED 2026-09-08 (operator order: 'do the full
        # restructure'; canon docs/dsh-homolog/structure.md): the old
        # no-packages law pinned the pnpm-era straggler dir; packages/
        # is now THE domain root (DSH shape: packages/<domain>/<pkg>).
        # The wall pins the NEW invariant instead: the domain globs
        # exist and no root-level plugin stragglers remain.
        body = _read("pnpm-workspace.yaml", repo)
        assert "'packages/*'" in body, \
            "pnpm-workspace.yaml lost the packages/* domain glob"
        assert "'plugins/*'" not in body, \
            "pnpm-workspace.yaml still globs the retired plugins/* root"

    def test_workspace_parses(self, repo: Path) -> None:
        r = subprocess.run(
            ["pnpm", "ls", "-r", "--depth", "-1"],
            cwd=repo, capture_output=True, text=True, timeout=60)
        assert r.returncode == 0, f"pnpm ls failed: {r.stderr[:300]}"
        n = sum(1 for ln in r.stdout.splitlines()
                if ln.lstrip().startswith(("@", "|")) or "PRIVATE" in ln)
        assert n > 18, f"only {n} members -- workspace regressed?"

    def test_gen_registry_dry_run(self, repo: Path) -> None:
        # RE-POINTED 2026-09-08 (generators STEP 1): the registry
        # generator is TS-native now (the SSOT is TS package exports);
        # the wall keeps its leg and swaps only the reader.
        r = subprocess.run(
            ["node", "--experimental-strip-types", "--no-warnings",
             "packages/web-kit/scripts/gen-registry.ts", "--check"],
            cwd=repo, capture_output=True, text=True, timeout=120)
        assert r.returncode == 0, \
            f"registry drift: stdout={r.stdout[:200]} stderr={r.stderr[:200]}"
        assert "matches the packages" in r.stdout


class TestDerivedArtifactHome:
    def test_no_registry_at_web_root(self, repo: Path) -> None:
        assert not _exists("web/registry.json", repo), \
            "web/registry.json exists at the web root"

    def test_generated_registry_present(self, repo: Path) -> None:
        assert _exists("packages/web-kit/generated/registry.json", repo)
        data = json.loads(_read("packages/web-kit/generated/registry.json", repo))
        assert "items" in data
        assert len(data["items"]) > 0
        for it in data["items"][:3]:
            assert "name" in it
            assert "package" in it

    def test_packages_domain_root(self, repo: Path) -> None:
        # RE-DERIVED 2026-09-08: packages/ is the DSH-shape domain
        # root (structure.md); the straggler-dir law died with the
        # plugins/ -> packages/ restructure. The root kit lives at
        # packages/web-kit/ (the generic @melite kit above pathways).
        assert _exists("packages/gateway", repo), \
            "packages/gateway missing -- the domain root broke"
        assert not _exists("web", repo), \
            "root web/ straggler is back -- the kit lives at packages/web-kit/"
        assert not _exists("plugins", repo), \
            "root plugins/ straggler is back -- the restructure renamed it"
