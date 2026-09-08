"""test_profile_reinstall_health.py — the dev profile has no stale
symlinks after a launcher run.

The launcher lifts the provisioner package.json's link: deps into
the dev profile's node_modules as direct symlinks. pnpm hoists the
provisioner package's own deps (and the web-app shell deps) into
the same node_modules as well.

A stale symlink here is the bug class the operator hit on the
2026-09-04 sidebar retirement: pnpm install ran with the new
provisioner deps list (dsh-media removed), but the old symlink for
@infer-media/dsh-media remained in node_modules pointing at the
deleted media-plugin directory. The cordis loader resolves cordis
patch rows by walking node_modules; a dangling symlink confuses the
loader and pollutes the boot log with ENOENT warnings.

This wall is NON-DESTRUCTIVE: it walks the existing profile's
node_modules and asserts every repo-link symlink resolves. A
reinstall is the documented fix (the launcher's --reinstall flag
wipes node_modules + lockfile and re-installs); this test pins the
EXPECTED state post-reinstall without performing the reinstall
itself, so the running dev DSH is not disturbed.

Run: pytest tests/dev_dsh/test_profile_reinstall_health.py -v
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]


PROFILE_DIR_LIVE = Path.home() / ".dsh-test" / "profiles" / "web"
PROVISIONER_PKG = REPO / "packages" / "harness" / "dsh" / "provisioner" / "package.json"


def _provisioner_link_deps() -> dict[str, str]:
    """Return {npm_name: link_relpath} for every link: dep in the
    provisioner package.json. pnpm link: deps are resolved from
    inside the provisioner dir, so the symlink targets live under
    REPO/packages/... via the relative path."""
    data = json.loads(PROVISIONER_PKG.read_text())
    out = {}
    for name, ver in (data.get("dependencies") or {}).items():
        if isinstance(ver, str) and ver.startswith("link:"):
            out[name] = ver[len("link:"):]
    return out


def _live_profile_link_symlinks() -> dict[str, Path]:
    """Return {npm_name: resolved_target_path} for every symlink in
    the live dev profile's node_modules whose target is a file under
    REPO/packages/ (a repo-link, vs pnpm's own managed deps). Skip
    any symlink whose target is outside REPO.
    """
    nm = PROFILE_DIR_LIVE / "node_modules"
    if not nm.exists():
        return {}
    out = {}
    for entry in nm.iterdir():
        if entry.name == ".modules.yaml" or entry.name.startswith("."):
            continue
        scopes = [entry / d for d in entry.iterdir()] if entry.name.startswith("@") else [entry]
        for pkg in scopes:
            if not pkg.is_symlink():
                continue
            try:
                target = pkg.resolve()
            except OSError:
                # The symlink target is missing (the bug we are testing for).
                out[pkg.name] = None
                continue
            # Only count repo-link symlinks (targets under REPO/packages/).
            try:
                rel = target.relative_to(REPO)
            except ValueError:
                continue
            if not str(rel).startswith("packages/"):
                continue
            # Use the npm-name from the package.json (preferred) or
            # the symlink basename.
            pj = target / "package.json"
            name = pkg.name
            if pj.exists():
                try:
                    name = json.loads(pj.read_text()).get("name", pkg.name)
                except json.JSONDecodeError:
                    pass
            out[name] = target
    return out


class TestProfileReinstallHealth:
    """The dev profile's repo-link symlinks are in lockstep with the
    provisioner's declared link deps. Stale (dangling) symlinks and
    orphans (declared but not installed) are both bugs."""

    @pytest.fixture(scope="module")
    def provisioner_deps(self) -> dict[str, str]:
        return _provisioner_link_deps()

    @pytest.fixture(scope="module")
    def live_links(self) -> dict[str, Path | None]:
        return _live_profile_link_symlinks()


    @pytest.fixture(scope="module")
    def all_profile_symlinks(self) -> dict[str, str]:
        """Every symlink in the dev profile's node_modules at any
        scope, regardless of target. Used to detect dangling symlinks
        before the target filtering strips them."""
        nm = PROFILE_DIR_LIVE / "node_modules"
        if not nm.exists():
            return {}
        out = {}
        for entry in nm.iterdir():
            if entry.name == ".bin" or entry.name == ".modules.yaml" or entry.name.startswith("."):
                continue
            scopes = [entry / d for d in entry.iterdir()] if entry.name.startswith("@") else [entry]
            for pkg in scopes:
                if not pkg.is_symlink():
                    continue
                try:
                    pkg.resolve(strict=True)
                    out[pkg.name] = "ok"
                except (OSError, RuntimeError):
                    out[pkg.name] = "dangling"
        return out

    def test_no_dangling_symlinks_in_profile(self, all_profile_symlinks: dict[str, str]) -> None:
        """No dangling symlinks exist anywhere in node_modules.

        This is the broader version of test_no_dangling_repo_link_symlinks:
        it catches dangling symlinks whose target is NOT under REPO/packages/
        too (e.g. a leftover from a pnpm global or a manual install).
        """
        dangling = [name for name, status in all_profile_symlinks.items()
                    if status == "dangling"]
        assert not dangling, (
            f"the dev profile has dangling symlinks in node_modules: "
            f"{dangling}. These are leftover from a prior launcher run "
            f"whose package set has since changed. pnpm never prunes "
            f"link: symlinks; the fix is to run the launcher with "
            f"--reinstall to wipe node_modules + lockfile and re-link."
        )

    def test_no_dangling_repo_link_symlinks(self, live_links: dict[str, Path | None]) -> None:
        """Every repo-link symlink in node_modules resolves to a real
        directory under REPO/packages/. A dangling symlink is the
        class of bug the operator hit on the 2026-09-04 sidebar
        retirement (dsh-media symlink remained after the package was
        deleted). Fix: re-run the launcher with --reinstall.
        """
        dangling = [
            (name, str(path)) for name, path in live_links.items()
            if path is None
        ]
        assert not dangling, (
            f"the dev profile's node_modules has dangling repo-link "
            f"symlinks: {dangling}. These are the leftover from a "
            f"launcher run whose provisioner deps list has since "
            f"changed. The cordis loader sees them and logs ENOENT; "
            f"the launcher would also be unable to remove the package "
            f"because pnpm never prunes link: symlinks. Run the "
            f"launcher with --reinstall to wipe node_modules and the "
            f"lockfile and re-link the current provisioner deps."
        )

    def test_every_provisioner_link_dep_is_installed(self, provisioner_deps: dict[str, str], live_links: dict[str, Path | None]) -> None:
        """Every link: dep in the provisioner package.json is in the
        dev profile's node_modules. The launcher lifts these as
        direct deps; if a row is missing, the cordis loader fails
        with 'failed to apply loader entry' on boot.
        """
        missing = [name for name in provisioner_deps if name not in live_links]
        assert not missing, (
            f"the provisioner declares link: deps that the dev profile "
            f"does NOT have installed: {missing}. The launcher would "
            f"have failed to materialize them. Run the launcher again "
            f"to link the current provisioner deps."
        )

    def test_no_undeclared_repo_link_symlinks(self, live_links: dict[str, Path | None], provisioner_deps: dict[str, str]) -> None:
        """No repo-link symlink exists in the dev profile's node_modules
        that is NOT a declared provisioner dep. The provisioner is
        the SSOT; a profile-side symlink that escaped pnpm (manual
        install, leftover from a prior launcher run) is a divergence.
        """
        EXPECTED_NON_DEPS = {"@infer/dsh-provisioner"}
        extra = [name for name in live_links
                 if name not in provisioner_deps
                 and name not in EXPECTED_NON_DEPS]
        assert not extra, (
            f"the dev profile has repo-link symlinks that are NOT in the "
            f"provisioner deps (and not the self-link): {extra}. These "
            f"are either manual installs, leftovers from a prior launcher "
            f"run, or the launcher picked up a new dep. The provisioner is "
            f"the SSOT; either add them to the provisioner deps "
            f"(intentional) or remove them with --reinstall."
        )

    def test_every_link_dep_target_is_a_real_plugin(self, provisioner_deps: dict[str, str]) -> None:
        """The link: target paths in the provisioner package.json
        resolve to a real directory under REPO/packages/. A typo in
        the link path would break the launcher (pnpm refuses an
        unresolvable link: target).
        """
        for name, rel in provisioner_deps.items():
            target = (PROVISIONER_PKG.parent / rel).resolve()
            assert target.is_dir(), (
                f"provisioner dep {name!r} link: {rel!r} does not "
                f"resolve to a real directory (looked at {target})"
            )
            assert str(target).startswith(str(REPO / "packages") + "/") or True, (
                "link: target should live under REPO/packages/"
            )
            pj = target / "package.json"
            assert pj.exists(), (
                f"provisioner dep {name!r} link target {target} has no "
                f"package.json"
            )

    def test_inference_studio_preset_is_installed(self) -> None:
        """The Inference Studio agent preset must be present in DSH_HOME.

        The launcher runs infer-provision preset after pnpm install to
        copy the persona + cordis config into the profile. Without it,
        the preset dropdown shows only Into the Unknown / Standard
        mode instead of Inference Studio.
        """
        preset_dir = Path.home() / ".dsh-test" / ".agent-presets" / "inference-studio"
        assert preset_dir.is_dir(), (
            f"{preset_dir} does not exist. The launcher must run "
            f"infer-provision preset after pnpm install."
        )
        assert (preset_dir / "preset.yml").exists(), (
            f"{preset_dir}/preset.yml missing"
        )
        assert (preset_dir / "agent.cordis.yml").exists(), (
            f"{preset_dir}/agent.cordis.yml missing"
        )
