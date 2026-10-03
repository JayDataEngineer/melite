from __future__ import annotations

import logging
import time

import torch

import comfy.ldm.minimax.vae
import comfy.model_management
from comfy_api.latest import io


def h3_fast_tiled_decode(model, z, tile_batch_size):
    height, width = z.shape[-2] * model.vae_ratio, z.shape[-1] * model.vae_ratio
    y_idx, y_len, y_overlap = model.split_tiles(height)
    x_idx, x_len, x_overlap = model.split_tiles(width)

    canvas = None
    row_tails = []
    out_y = 0
    for i, (i_pos, i_len) in enumerate(zip(y_idx, y_len)):
        zi, zl = i_pos // model.vae_ratio, i_len // model.vae_ratio
        new_tails = []
        left_tail = None
        out_x = 0
        row_height = 0
        for batch_start in range(0, len(x_idx), tile_batch_size):
            batch_end = min(batch_start + tile_batch_size, len(x_idx))
            latent_tiles = []
            for j in range(batch_start, batch_end):
                zj = x_idx[j] // model.vae_ratio
                zw = x_len[j] // model.vae_ratio
                latent_tiles.append(z[..., zi : zi + zl, zj : zj + zw])
            decoded = model._decode_pixels(torch.cat(latent_tiles, dim=0))
            tiles = decoded.split(z.shape[0], dim=0)

            for j, tile in zip(range(batch_start, batch_end), tiles):
                if i < len(y_idx) - 1:
                    new_tails.append(tile[..., -y_overlap[i] :, :].clone())
                next_left_tail = (
                    tile[..., :, -x_overlap[j] :].clone()
                    if j < len(x_idx) - 1
                    else None
                )
                if i > 0:
                    tile = model.blend(row_tails[j], tile, y_overlap[i - 1], dim=-2)
                if j > 0:
                    tile = model.blend(left_tail, tile, x_overlap[j - 1], dim=-1)
                left_tail = next_left_tail
                if i < len(y_idx) - 1:
                    tile = tile[..., : -y_overlap[i], :]
                if j < len(x_idx) - 1:
                    tile = tile[..., :, : -x_overlap[j]]
                if canvas is None:
                    canvas = torch.empty(
                        *tile.shape[:-2],
                        height,
                        width,
                        dtype=tile.dtype,
                        device=tile.device,
                    )
                canvas[
                    ..., out_y : out_y + tile.shape[-2], out_x : out_x + tile.shape[-1]
                ].copy_(tile)
                out_x += tile.shape[-1]
                row_height = tile.shape[-2]
        row_tails = new_tails
        out_y += row_height
    return canvas


def h3_fast_adaptive_decode(model, z, tile_batch_size):
    if model.tiling:
        return h3_fast_tiled_decode(model, z, tile_batch_size)
    return model._decode_pixels(z)


def h3_fast_decode_temporal(model, z, tile_batch_size):
    chunk_dec = model.tokens_chunk_size * model.vae_ratio_t
    split_count = int(model.token_drop > 0) + 1
    pseudo_total_tokens = z.shape[2] + model.token_drop

    pad_tokens = 0
    remainder = pseudo_total_tokens % model.tokens_chunk_size
    if remainder != 0:
        pad_tokens = model.tokens_chunk_size - remainder
        pseudo_total_tokens += pad_tokens

    num_chunks = pseudo_total_tokens // model.tokens_chunk_size - int(
        model.token_drop > 0
    )
    if num_chunks < 1:
        pad_tokens += model.tokens_chunk_size
        num_chunks += 1

    if pad_tokens > 0:
        pad_z = z[:, :, -1:, :, :].repeat(1, 1, pad_tokens, 1, 1)
        z = torch.cat([z, pad_z], dim=2)

    output_frames = model._decode_temporal_frame_plan(
        z.shape[2], num_chunks, pad_tokens
    )
    dec = None
    dec_overlap = None
    write_pos = 0

    def write_part(part):
        nonlocal dec, write_pos
        part_frames = part.shape[2]
        if part_frames <= 0:
            return
        if dec is None:
            out_shape = list(part.shape)
            out_shape[2] = output_frames
            dec = torch.empty(out_shape, dtype=part.dtype, device=part.device)
        copy_frames = min(part_frames, max(0, dec.shape[2] - write_pos))
        if copy_frames > 0:
            dec[:, :, write_pos : write_pos + copy_frames, :, :].copy_(
                part[:, :, :copy_frames, :, :]
            )
            write_pos += copy_frames

    for i in range(num_chunks):
        t_start_idx = i * model.tokens_chunk_size
        t_end_idx = t_start_idx + model.tokens_chunk_size + model.token_overlap
        clip_z = z[:, :, t_start_idx:t_end_idx, :, :]
        clip_dec = h3_fast_adaptive_decode(model, clip_z, tile_batch_size)

        for j in range(split_count):
            f_start_idx = j * chunk_dec
            f_end_idx = min(f_start_idx + chunk_dec, clip_dec.shape[2])
            clip_dec_chunk = clip_dec[:, :, f_start_idx:f_end_idx, :, :]
            clip_dec_chunk = clip_dec_chunk[:, :, model.frame_pre_padding :, :, :]
            if j == 0:
                if dec_overlap is not None:
                    clip_dec_chunk = model.blend(
                        dec_overlap, clip_dec_chunk, model.frame_overlap, dim=-3
                    )
                    dec_overlap = None
                write_part(clip_dec_chunk)
            else:
                dec_overlap = clip_dec_chunk.contiguous()

        if i == num_chunks - 1 and dec_overlap is not None:
            write_part(dec_overlap)
            dec_overlap = None

    return dec


def h3_fast_decode_model(model, z, tile_batch_size):
    latents_mean = model.latents_mean.view(1, -1, 1, 1, 1).to(z)
    latents_std = model.latents_std.view(1, -1, 1, 1, 1).to(z)
    z = z * latents_std + latents_mean

    if z.shape[2] == 1:
        dec = h3_fast_adaptive_decode(model, z, tile_batch_size)
        dec = dec[:, :, -1:, :, :]
    else:
        dec = h3_fast_decode_temporal(model, z, tile_batch_size)

    dec = dec.float()
    dec.mul_(model.pixel_std.to(dec)).add_(model.pixel_mean.to(dec)).clamp_(0.0, 1.0)
    return dec


def h3_fast_decode(vae, latent, tile_batch_size):
    tile_batch_size = max(1, int(tile_batch_size))
    vae.throw_exception_if_invalid()
    memory_used = vae.memory_used_decode(latent.shape, vae.vae_dtype)
    with comfy.model_management.cuda_device_context(vae.device):
        comfy.model_management.load_models_gpu(
            [vae.patcher],
            memory_required=memory_used,
            force_full_load=vae.disable_offload,
        )
        latent = latent.to(device=vae.device, dtype=vae.vae_dtype)
        retry = False
        try:
            images = h3_fast_decode_model(
                vae.first_stage_model, latent, tile_batch_size
            )
        except Exception as error:
            comfy.model_management.raise_non_oom(error)
            logging.warning(
                "MiniMax H3 Fast VAE Decode ran out of memory at tile batch %d; retrying with 1",
                tile_batch_size,
            )
            retry = True
        if retry:
            comfy.model_management.soft_empty_cache()
            images = h3_fast_decode_model(vae.first_stage_model, latent, 1)

        images = images.to(
            device=vae.output_device, dtype=vae.vae_output_dtype(), copy=True
        )
        vae.process_output(images)
    return images.movedim(1, -1)


class MiniMaxH3FastVAEDecode(io.ComfyNode):
    @classmethod
    def define_schema(cls):
        return io.Schema(
            node_id="MiniMaxH3FastVAEDecode",
            display_name="MiniMax H3 Fast VAE Decode",
            category="model/latent/minimax",
            description="Experimental batched-tile H3 VAE decoder. Benchmark against the standard VAEDecode on your GPU.",
            is_experimental=True,
            inputs=[
                io.Latent.Input(
                    "samples", tooltip="MiniMax H3 video or joint video/audio latent."
                ),
                io.Vae.Input("vae", tooltip="MiniMax H3 video VAE."),
                io.Int.Input(
                    "tile_batch_size",
                    default=4,
                    min=1,
                    max=8,
                    step=1,
                    tooltip="Tiles per GPU batch. Larger values are not always faster and use more VRAM.",
                ),
            ],
            outputs=[io.Image.Output(display_name="images")],
        )

    @classmethod
    def execute(cls, samples, vae, tile_batch_size):
        if not isinstance(
            vae.first_stage_model, comfy.ldm.minimax.vae.MiniMaxH3VideoVAE
        ):
            raise ValueError(
                "MiniMax H3 Fast VAE Decode requires the MiniMax H3 video VAE"
            )

        latent = samples["samples"]
        if latent.is_nested:
            latent = latent.unbind()[0]

        start_time = time.perf_counter()
        images = h3_fast_decode(vae, latent, int(tile_batch_size))
        if images.ndim == 5:
            images = images.reshape(
                -1, images.shape[-3], images.shape[-2], images.shape[-1]
            )
        logging.info(
            "MiniMax H3 Fast VAE Decode - tile batch %d finished in %.2fs",
            tile_batch_size,
            time.perf_counter() - start_time,
        )
        return io.NodeOutput(images)
