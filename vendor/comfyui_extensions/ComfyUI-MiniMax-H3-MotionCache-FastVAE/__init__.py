from __future__ import annotations

from typing_extensions import override

from comfy_api.latest import ComfyExtension

from .fast_vae_decode import MiniMaxH3FastVAEDecode
from .motion_cache import MiniMaxH3MotionCache


class MiniMaxH3MotionCacheExtension(ComfyExtension):
    @override
    async def get_node_list(self):
        return [MiniMaxH3MotionCache, MiniMaxH3FastVAEDecode]


async def comfy_entrypoint() -> MiniMaxH3MotionCacheExtension:
    return MiniMaxH3MotionCacheExtension()


__all__ = ["comfy_entrypoint"]
