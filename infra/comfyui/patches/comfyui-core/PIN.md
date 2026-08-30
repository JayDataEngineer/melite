# ComfyUI core pin — the production host lane (h3-timeline queue pipeline)

Base commit (public upstream):
  2f35f4a  ComfyUI v0.33.0 (the io-schema release)

Apply, in order, after `git checkout 2f35f4a`:
  0001-H3-timeline-latent-seam-first_frame_latent-input-Sav.patch
  0002-H3-audio-only-keyframe-guides-grid-rows-cond-collect.patch
  0003-h3-seam-context-multi-frame-head-pin-keyframes-backw.patch
  9001-audio-vae-torchaudio-abi-guard.patch
  9002-minimax-model-packedlayout-len-shape.patch

Realized host state (2026-08-30 audit): /opt/ComfyUI HEAD = b518a90 —
commits 0001..0003 are that machine's local commits exported here by
`git format-patch 2f35f4a..HEAD` (they existed on NO remote before this
export); 9001/9002 are its uncommitted working-tree fixes exported by
`git diff` (torchaudio ABI guard dated 2026-08-29; the model.py
PackedLayout `z.dim() == 5` → `len(z.shape) == 5` stub fix previously
re-created by a sed one-liner in the retired scripts/comfyui-setup.sh).

bootstrap.sh --core reproduces this state on a fresh machine:
clone @2f35f4a → checkout → `git apply` the five patches in order.
Any patch that fails to apply aborts the bootstrap LOUDLY (these
patches carry MiniMaxH3MotionContext latent-seam, audio-only keyframe
guides, AddGuide backport, SaveLatent/LoadLatent .h3latent nodes —
pipelines/h3-timeline/window*_t4.json reference these node classes
directly; without them the lane cannot run).

Docker image pin (Dockerfile.comfyui ARG COMFYUI_COMMIT) is e01fb4c —
a PUBLIC upstream commit with a different feature set (music fix
03fa4e4, AddGuide #15439). The two pins are NOT interchangeable:
host lane = 2f35f4a + patches above; image = e01fb4c. Unifying them is
an open item (see BOOTSTRAP_AUDIT.md §3.1).
