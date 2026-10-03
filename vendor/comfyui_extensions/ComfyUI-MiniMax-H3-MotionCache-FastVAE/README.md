# ComfyUI MiniMax H3 MotionCache

[English](README.md) | [简体中文](README.zh-CN.md)

Motion-aware denoising cache and experimental batched video VAE decoder for MiniMax H3 in ComfyUI.

This project provides two independent nodes:

- **MiniMax H3 MotionCache** reduces expensive H3 denoiser calls by reusing a motion-weighted video/audio residual when the estimated change is small.
- **MiniMax H3 Fast VAE Decode** evaluates multiple spatial VAE tiles in one GPU batch while preserving H3 temporal chunking and tile blending. It is not faster on every GPU.

MotionCache is an independent MiniMax H3 adaptation inspired by the [MotionCache paper and reference code](https://github.com/MAC-AutoML/MotionCache). It is not an official MAC-AutoML or MiniMax implementation.

## Requirements

- ComfyUI 0.30.0 or newer with native MiniMax H3 support
- MiniMax H3 diffusion model and video VAE
- Python 3.10 or newer
- A CUDA-capable GPU is recommended

No additional Python package is required. The node pack does not download models or make network requests.

## Installation

### ComfyUI Manager

After publication to the Comfy Registry, search for **MiniMax H3 MotionCache**.

### Manual installation

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/starsFriday/ComfyUI-MiniMax-H3-MotionCache.git
```

Restart ComfyUI after installing or updating.

## Example workflow

Import [examples/minimax_h3_i2v_motioncache.json](examples/minimax_h3_i2v_motioncache.json). The workflow includes MotionCache and Fast VAE Decode and was derived from the native MiniMax H3 image-to-video template. It retains optional Video Helper Suite, ComfyUI-Easy-Use, and KJNodes utility nodes.

## MiniMax H3 MotionCache

Insert the node between the H3 model loader or attention patch and the sampler:

```text
MiniMax H3 model → MiniMax H3 MotionCache → sampler
```

The node observes joint video/audio latent changes during sampling. After warm-up, it may reuse the previous model residual when the accumulated motion-aware change remains below the threshold.

| Input | Default | Description |
|---|---:|---|
| `reuse_threshold` | `0.15` | Higher values allow more reuse and may increase approximation error |
| `motion_strength` | `1.0` | Gives moving regions more influence over reuse decisions |
| `warmup_steps` | `4` | Initial model calls that are always computed |
| `max_consecutive_skips` | `2` | Maximum consecutive reused calls |
| `start_percent` | `0.15` | Start of the active sampling range |
| `end_percent` | `0.95` | End of the active sampling range |
| `subsample_factor` | `8` | Subsampling used by the change estimator |
| `verbose` | `false` | Logs every computed and reused call |

Recommended starting point: keep the defaults and compare against a run with the node bypassed. Lower `reuse_threshold` if faces, hands, fast motion, lip sync, sound effects, or fine details become unstable.

## MiniMax H3 Fast VAE Decode

Use this node in place of standard `VAEDecode` for the MiniMax H3 video VAE:

```text
H3 video latent ─┐
                 ├→ MiniMax H3 Fast VAE Decode → IMAGE frames
H3 video VAE ────┘
```

| Input | Default | Description |
|---|---:|---|
| `samples` | — | MiniMax H3 video latent or the video part of a joint latent |
| `vae` | — | MiniMax H3 video VAE |
| `tile_batch_size` | `4` | Horizontal spatial tiles decoded per GPU batch; range 1–8 |

A larger batch is not guaranteed to be faster and uses more VRAM. If batched decode runs out of memory, the node clears its temporary cache and retries with batch `1`.

The registered node ID remains `MiniMaxH3FastVAEDecode`. Despite the display name, controlled testing shows that fewer decoder invocations do not necessarily reduce wall time. Benchmark it against standard `VAEDecode` on your GPU.

## Enabled vs. disabled

| Measurement | Standard path | Node path | Interpretation |
|---|---:|---:|---|
| 20-step H3 denoising example | 20 computed calls | 14 computed, 6 reused | 30% fewer DiT calls; estimated DiT-only `1.43×` |
| Spatial VAE work at 1344×768 per temporal chunk | 28 serial tile calls | 8 batched calls at batch 4 | Fewer calls, almost unchanged tile math |
| Same-setting 5-second VAE comparison | 10.36 s, 1.34 GB | 11.15 s, 1.34 GB | Batched path was 0.79 s / 7.6% slower |

These numbers are not universal benchmarks. Compare with the same model, prompt, seed, resolution, frame count, sampler, dtype, VRAM mode, and GPU. MotionCache's log is a model-call estimate, not total workflow speed. For the tested 5-second case, standard `VAEDecode` is recommended.

### Why was batched VAE not faster?

At 1344×768, H3 divides each temporal chunk into 4 rows × 7 columns, or 28 spatial tiles. Batch 4 reduces this to 8 decoder invocations, but each invocation computes several tiles, so total VAE math is almost unchanged.

A single 256×256 tile already supplies enough work for the tested GPU. Saving Python and kernel-launch overhead did not offset batching, concatenation, splitting, and memory traffic. Temporal chunks also remain sequential before overlap blending and frame assembly.

## Quality and compatibility

- MotionCache is approximate. Review motion boundaries, faces, hands, lip sync, fast camera movement, and synchronized audio.
- Fast VAE Decode does not deliberately discard information, but the tested case showed no speed benefit.
- MotionCache accepts MiniMax H3 diffusion models only.
- Fast VAE Decode accepts the MiniMax H3 video VAE only.
- Do not combine MotionCache and EasyCache on the same model.
- For a reference result, bypass MotionCache and use standard `VAEDecode`.

## Logging

```text
MiniMax H3 MotionCache - skipped 6/20 model calls (estimated 1.43x DiT speedup)
MiniMax H3 Fast VAE Decode - tile batch 4 finished in 11.15s
```

## Acknowledgements and citation

```bibtex
@misc{xu2026motionawarecachingefficientautoregressive,
  title={Motion-Aware Caching for Efficient Autoregressive Video Generation},
  author={Jing Xu and Yuexiao Ma and Xuzhe Zheng and Xing Wang and Shiwei Liu and Chenqian Yan and Xiawu Zheng and Rongrong Ji and Fei Chao and Songwei Liu},
  year={2026},
  eprint={2605.01725},
  archivePrefix={arXiv},
  primaryClass={cs.CV},
  url={https://arxiv.org/abs/2605.01725}
}
```

- [MotionCache reference repository](https://github.com/MAC-AutoML/MotionCache)
- [ComfyUI](https://github.com/Comfy-Org/ComfyUI)

## License

This node pack is released under the [MIT License](LICENSE).
