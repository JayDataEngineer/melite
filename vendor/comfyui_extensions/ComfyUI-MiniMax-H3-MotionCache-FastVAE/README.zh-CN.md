# ComfyUI MiniMax H3 MotionCache

[English](README.md) | [简体中文](README.zh-CN.md)

面向 ComfyUI MiniMax H3 的运动感知去噪缓存与实验性批量视频 VAE 解码节点。

本项目包含两个相互独立的节点：

- **MiniMax H3 MotionCache**：当运动感知变化较小时复用视频/音频模型残差，减少昂贵的 H3 去噪调用。
- **MiniMax H3 Fast VAE Decode**：在一个 GPU batch 中计算多个空间切片，同时保留 H3 原有的时间分块和切片融合；它并非在所有 GPU 上都更快。

MotionCache 是受 [MotionCache 论文与参考代码](https://github.com/MAC-AutoML/MotionCache)启发、针对 MiniMax H3 独立实现的适配版本，不是 MAC-AutoML 或 MiniMax 的官方实现。

## 环境要求

- ComfyUI 0.30.0 或更高版本，并包含原生 MiniMax H3 支持
- MiniMax H3 扩散模型和视频 VAE
- Python 3.10 或更高版本
- 推荐使用支持 CUDA 的 GPU

除 ComfyUI 自带依赖外，不需要安装其他 Python 包。节点不会下载模型，也不会发起网络请求。

## 安装

### ComfyUI Manager

发布到 Comfy Registry 后，搜索 **MiniMax H3 MotionCache**。

### 手动安装

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/starsFriday/ComfyUI-MiniMax-H3-MotionCache.git
```

安装或更新后请重启 ComfyUI。

## 示例工作流

导入 [examples/minimax_h3_i2v_motioncache.json](examples/minimax_h3_i2v_motioncache.json)。示例包含 MotionCache 和 Fast VAE Decode，由原生 MiniMax H3 图生视频模板改造，并保留 Video Helper Suite、ComfyUI-Easy-Use 和 KJNodes 的可选工具节点。

## MiniMax H3 MotionCache

将节点放在 H3 模型加载器或注意力补丁与采样器之间：

```text
MiniMax H3 模型 → MiniMax H3 MotionCache → 采样器
```

节点在采样过程中同时观察视频与音频 latent 的变化。预热结束后，如果累计运动感知变化低于阈值，就可能复用上一次模型残差。

| 输入 | 默认值 | 说明 |
|---|---:|---|
| `reuse_threshold` | `0.15` | 越高越容易复用，近似误差也可能越大 |
| `motion_strength` | `1.0` | 提高运动区域对复用判断的影响 |
| `warmup_steps` | `4` | 开始阶段强制完整计算的调用数 |
| `max_consecutive_skips` | `2` | 最大连续复用次数 |
| `start_percent` | `0.15` | 缓存生效区间起点 |
| `end_percent` | `0.95` | 缓存生效区间终点 |
| `subsample_factor` | `8` | 变化估计使用的降采样比例 |
| `verbose` | `false` | 输出每一步完整计算或复用日志 |

建议先使用默认参数，并与绕过节点的输出对比。如果人脸、手部、快速运动、口型、音效或细节不稳定，请降低 `reuse_threshold`。

## MiniMax H3 Fast VAE Decode

使用本节点替换 MiniMax H3 视频 VAE 后面的标准 `VAEDecode`：

```text
H3 视频 latent ─┐
                ├→ MiniMax H3 Fast VAE Decode → IMAGE 帧
H3 视频 VAE ────┘
```

| 输入 | 默认值 | 说明 |
|---|---:|---|
| `samples` | — | MiniMax H3 视频 latent，或联合 latent 中的视频部分 |
| `vae` | — | MiniMax H3 视频 VAE |
| `tile_batch_size` | `4` | 每个 GPU batch 解码的横向切片数量，范围 1–8 |

更大的 batch 不保证更快，而且会占用更多显存。如果批量解码显存不足，节点会清理临时缓存并用 batch `1` 重试。

节点注册 ID 保持为 `MiniMaxH3FastVAEDecode`。虽然显示名称保留 “Fast”，同条件测试已证明：解码器调用次数减少不代表耗时一定缩短，请在自己的 GPU 上与标准 `VAEDecode` 对照测试。

## 使用与不使用节点的区别

| 指标 | 标准路径 | 节点路径 | 说明 |
|---|---:|---:|---|
| 20 步 H3 去噪示例 | 完整计算 20 次 | 计算 14 次、复用 6 次 | DiT 调用减少 30%，估算 DiT 阶段 `1.43×` |
| 1344×768 下每个时间块的 VAE 工作 | 28 次串行切片调用 | batch 4 合并为 8 次 | 调用次数减少，切片总计算量基本不变 |
| 相同设置 5 秒 VAE 对照 | 10.36 秒，1.34 GB | 11.15 秒，1.34 GB | 批量路径慢 0.79 秒 / 7.6% |

以上不是通用 benchmark。比较时应保持模型、提示词、种子、分辨率、帧数、采样器、dtype、显存模式和 GPU 一致。MotionCache 日志只是模型调用次数估算，不代表整个工作流加速比。当前 5 秒测试建议使用标准 `VAEDecode`。

### 为什么批量 VAE 没有更快？

1344×768 下，H3 会把每个时间块拆成 4 行 × 7 列，共 28 个空间切片。batch 4 会合并成 8 次调用，但每次调用同时计算多个切片，因此 VAE 总计算量几乎不变。

在测试 GPU 上，单个 256×256 切片已经能提供足够计算量。节省的 Python 和 kernel launch 开销不足以抵消批处理、拼接、拆分和显存访问。多个时间块仍需顺序处理，之后还要进行重叠融合和帧拼接。

## 质量与兼容性

- MotionCache 属于近似加速，请检查运动边界、人脸、手部、口型、快速镜头和同步音频。
- Fast VAE Decode 不主动丢弃信息，但当前测试没有获得速度收益。
- MotionCache 只接受 MiniMax H3 扩散模型。
- Fast VAE Decode 只接受 MiniMax H3 视频 VAE。
- 不要在同一个模型上同时使用 MotionCache 与 EasyCache。
- 参考结果应绕过 MotionCache，并使用标准 `VAEDecode`。

## 日志

```text
MiniMax H3 MotionCache - skipped 6/20 model calls (estimated 1.43x DiT speedup)
MiniMax H3 Fast VAE Decode - tile batch 4 finished in 11.15s
```

## 致谢与引用

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

- [MotionCache 参考仓库](https://github.com/MAC-AutoML/MotionCache)
- [ComfyUI](https://github.com/Comfy-Org/ComfyUI)

## 许可证

本节点包使用 [MIT License](LICENSE)。
