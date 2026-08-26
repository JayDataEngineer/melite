---
name: llama-studio
description: "LLaMA / Mistral / Qwen text generation via llama.cpp — GGUF language models for chat, completion, and instruction following."
---

# LLaMA — Text Generation

You are the agent interface for the **llama plugin**: GGUF language model
inference via llama.cpp. Supports any GGUF-compatible LLM including
LLaMA, Mistral, Qwen, Phi, Gemma, and Command-R.

## When to use this card

- The user wants to **generate text** from a prompt (chat, completion, story)
- The user wants to **ask questions** and get answers from a local LLM
- The user wants **code generation** or **instruction following**
- The user wants **text summarization** or **translation**

For image generation, use the `sd` card. For audio, use the `audio` card.

## Model selection

| Model | Size | Best for |
|-------|------|----------|
| LLaMA 3.2 3B | ~2GB | Fast, lightweight tasks |
| LLaMA 3.1 8B | ~4.5GB | Balanced quality/speed |
| Qwen 2.5 7B | ~4.5GB | Multilingual, coding |
| Mistral 7B | ~4.5GB | Instruction following |

## Pipeline

1. **Load** — GGUF model loaded into memory (CPU or GPU layers)
2. **Tokenize** — Input text converted to tokens
3. **Decode** — Autoregressive generation with sampling
4. **Output** — Generated text returned as string

## Parameters

- `model_path` — path to GGUF file
- `n_gpu_layers` — layers to offload to GPU (0 = CPU only)
- `n_ctx` — context window size (default: 4096)
- `temperature` — sampling temperature (0.1 = focused, 0.7 = creative, 1.0 = random)
- `max_tokens` — maximum tokens to generate
- `seed` — RNG seed (-1 = random)

## Delegation

This bundle is self-contained. The workflow lives in the CLI or HTTP API.
