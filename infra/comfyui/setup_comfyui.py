"""ComfyUI image build setup — the lane installer (infra/docker/Dockerfile.comfyui).

Runs inside the Docker build (Phase 1 of the only inference image). Strict
SSOT: custom_nodes/ is fully replaced from the per-plugin custom-node lane
(plugins/<id>/nodes/extensions.yaml — §16 E-EXTENSIONS; the Dockerfile stages
the plugins subtree at /tmp/melite-plugins and extension_lane.py merges it in
deterministic plugin-id order) on every build. Any directory not declared in
the lane is removed. This guarantees the image is reproducible from the lane
and prevents leftover extensions from the base image (the yanwk megapak
ships ~30 community extensions that we don't want) leaking into production.

The ComfyUI One Way rule: this image is the ONLY place ComfyUI inference
runs. The plugin lane is the ONLY place extensions are declared. Everything
in custom_nodes/ after this script runs is fully derivable from the lane.
"""
import shutil
import subprocess
import os
import sys

# Ensure core deps (the megapak base may be missing some for newer ComfyUI)
subprocess.run([sys.executable, "-m", "pip", "install", "--no-cache-dir", "psutil"], check=False)

# The base may not have yaml installed; install if missing.
# The megapak's system python3 may lack the pip module while the `pip` binary
# on PATH belongs to a different python. Strategy: try -m pip → ensurepip →
# cross-interpreter --target install. Re-exec once so sys.path picks up the
# fresh site-packages.
def _install_pyyaml():
    import site
    if subprocess.run([sys.executable, "-m", "pip", "install", "pyyaml"], check=False).returncode == 0:
        return
    subprocess.run([sys.executable, "-m", "ensurepip", "--upgrade"], check=False)
    if subprocess.run([sys.executable, "-m", "pip", "install", "pyyaml"], check=False).returncode == 0:
        return
    sp = site.getsitepackages()[0]
    if subprocess.run(["pip", "install", "--no-cache-dir", "--target", sp, "pyyaml"], check=False).returncode == 0:
        return
    raise SystemExit("setup_comfyui: could not install pyyaml for " + sys.executable)

try:
    import yaml
except ImportError:
    _install_pyyaml()
    if os.environ.get("_SETUP_COMFYUI_REEXEC") != "1":
        os.environ["_SETUP_COMFYUI_REEXEC"] = "1"
        os.execv(sys.executable, [sys.executable] + sys.argv)
    import yaml

CUSTOM_NODES = "/root/ComfyUI/custom_nodes"
PLUGINS_ROOT = "/tmp/melite-plugins"
# Files/dirs in custom_nodes/ that are NOT extension dirs but should be
# preserved across the purge (ComfyUI runtime artifacts).
KEEP_ENTRIES = {"__pycache__"}


def purge_undeclared(declared_names):
    """Strict SSOT enforcement — remove anything not declared in the lane.

    The yanwk megapak base image ships ~30 community extensions that we
    don't use (cg-use-everywhere, Jovimetrix, PuLID_ComfyUI, mikey_nodes,
    sd-dynamic-thresholding, etc.). Without this purge they leak into
    production and register hundreds of phantom nodes that break the
    schema-driven builder (server-js preflight + object_info contract) and
    confuse the ComfyUI-Manager mapping. Also removes ".disabled" suffix
    dirs — the YAML is the source of truth; nothing is "disabled but
    still there".

    Idempotent: a second run is a no-op because the purge already cleaned
    everything not in the YAML.
    """
    if not os.path.isdir(CUSTOM_NODES):
        return
    removed = []
    for entry in sorted(os.listdir(CUSTOM_NODES)):
        if entry in KEEP_ENTRIES:
            continue
        if entry in declared_names:
            continue
        path = os.path.join(CUSTOM_NODES, entry)
        try:
            if os.path.islink(path) or os.path.isfile(path):
                os.unlink(path)
            else:
                shutil.rmtree(path)
            removed.append(entry)
        except OSError as e:
            print(f"  [purge] WARNING: could not remove {entry}: {e}", file=sys.stderr)
    if removed:
        print(f"  [purge] removed {len(removed)} undeclared entries:")
        for name in removed:
            print(f"    - {name}")


def refresh_clone(name, url, ref, target):
    """Re-clone git extensions on every build (idempotent + ref-pinned).

    The previous logic skipped dirs with a `.git` subdir, which meant
    image rebuilds NEVER picked up new refs and case-duplicate dirs
    (e.g. `comfyui-impact-pack` + `ComfyUI-Impact-Pack` — both shipping
    the same nodes registered twice) survived across rebuilds. Strict
    SSOT: drop the target, clone fresh from the pinned ref every time.
    """
    if os.path.isdir(target):
        shutil.rmtree(target)
    print(f"  [{name}] cloning {url}@{ref or 'HEAD'}...")
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0"}
    cmd = ["git", "clone"]
    if not ref:
        cmd.append("--depth=1")
    cmd.extend([url, target])
    result = subprocess.run(cmd, env=env)
    if result.returncode != 0:
        print(f"  [{name}] CLONE FAILED", file=sys.stderr)
        return False
    if ref:
        print(f"  [{name}] pinning to {ref}...")
        subprocess.run(["git", "checkout", ref], cwd=target, check=True)
    return True


def install_pip_deps(name, pkgs):
    for pkg in pkgs:
        print(f"  [{name}] pip install {pkg}...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--no-cache-dir", pkg],
            check=False,
        )


def apply_patches(name, patches_rel, target):
    """Run a post-clone patch script against a freshly cloned extension.

    The ``patches`` field in a plugin nodes/extensions.yaml entry names a shell script
    (relative to infra/comfyui/patches/) that applies melite-fork patches to
    the upstream clone. The Dockerfile COPYs infra/comfyui/patches/ →
    /tmp/patches/. This function runs the script with the extension's
    custom_nodes/ directory as the working tree.

    Idempotent: apply.sh scripts use sentinel markers / git apply --check
    so a second invocation is a no-op.
    """
    script = os.path.join("/tmp/patches", patches_rel)
    if not os.path.isfile(script):
        print(f"  [{name}] WARNING: patch script {script} not found", file=sys.stderr)
        return
    print(f"  [{name}] applying patches from {patches_rel}...")
    result = subprocess.run(
        ["bash", script],
        cwd=target,
        env={**os.environ, "NODES_DIR": target},
    )
    if result.returncode != 0:
        print(f"  [{name}] WARNING: patch script exited {result.returncode}", file=sys.stderr)


def main():
    os.makedirs(CUSTOM_NODES, exist_ok=True)

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from extension_lane import merge_plugin_extensions

    extensions = merge_plugin_extensions(PLUGINS_ROOT)
    declared = {ext["name"] for ext in extensions}

    # Phase 1 — purge anything the YAML doesn't declare.
    purge_undeclared(declared)

    # Phase 2 — install/refresh every YAML-declared extension.
    for ext in extensions:
        name = ext["name"]
        url = ext.get("url")
        target = os.path.join(CUSTOM_NODES, name)

        if not url:
            # In-tree extension (no git repo to clone). Copy from the
            # Docker build context staging directory into custom_nodes/.
            # The Dockerfile COPYs plugins/comfyui/custom_nodes/<name> →
            # /tmp/in-tree-packs/<name> (ONE PATTERN: the url-less lane
            # entries in plugins/comfyui/nodes/extensions.yaml are the
            # authoritative list).
            source = os.path.join("/tmp/in-tree-packs", name)
            if os.path.isdir(target):
                shutil.rmtree(target)
            if os.path.isdir(source):
                shutil.copytree(source, target)
                print(f"  [{name}] in-tree → copied from {source}")
                install_pip_deps(name, ext.get("pip", []))
            else:
                print(
                    f"  [{name}] WARNING: in-tree extension but source "
                    f"{source} not found in build context",
                    file=sys.stderr,
                )
            continue

        if refresh_clone(name, url, ext.get("ref"), target):
            patches = ext.get("patches")
            if patches:
                apply_patches(name, patches, target)
            install_pip_deps(name, ext.get("pip", []))

    # Fix transformers if ltx-video downgraded it
    result = subprocess.run(
        [sys.executable, "-c", "import transformers; print(transformers.__version__)"],
        capture_output=True, text=True,
    )
    if result.returncode == 0 and result.stdout.strip().startswith("4."):
        print("Re-upgrading transformers to >=5 (downgraded by ltx-video)")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--no-cache-dir", "transformers>=5"],
            check=False,
        )

    # Set up extra_model_paths.yaml from the melite-managed SSOT
    # (plugins/melite-manager/manager/extra_model_paths.yaml, staged as
    # /tmp by Dockerfile.comfyui). This is
    # the single source of truth for where ComfyUI looks for models and must
    # match the registry download paths. docker-compose.yml mounts the same
    # file into the running container (`:ro`), so build + runtime agree.
    # Falls back to an inline copy only if the staged config is missing.
    ssot_path = "/tmp/extra_model_paths.yaml"
    if os.path.isfile(ssot_path):
        with open(ssot_path) as f:
            config = yaml.safe_load(f)
        print("extra_model_paths.yaml sourced from config SSOT")
    else:
        print("WARNING: staged extra_model_paths.yaml missing — using inline fallback")
        config = {
            "ray_models": {
                "base_path": "/mnt/data/models/image-gen/comfyui",
                "checkpoints": "checkpoints",
                "vae": "vae",
                "loras": "loras",
                "upscale_models": "latent_upscale_models",
                "controlnet": "controlnet",
                "clip": "clip",
                "clip_vision": "clip_vision",
                "unet": "unet",
                "diffusion_models": "diffusion_models",
                "text_encoders": "text_encoders",
            },
            "vendor_models": {
                "base_path": "/mnt/data/models",
                "sams": "mask",
                "audio_encoders": "wav2vec",
            },
        }
    with open("/root/ComfyUI/extra_model_paths.yaml", "w") as f:
        yaml.dump(config, f)
    print("extra_model_paths.yaml written")

    print("Setup complete - volume mounts handle model paths")


if __name__ == "__main__":
    main()
