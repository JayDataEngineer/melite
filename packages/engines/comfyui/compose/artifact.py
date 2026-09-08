"""artifact.py — THE ARTIFACT-REF PRIMITIVE (plugin-shared).

ONE law for every reference to a thing a prior run (or the user)
deposited on disk — the operator's five kinds:

    IMAGE    rendered stills, guide images
    VIDEO    rendered films, clips
    AUDIO    rendered sound
    LATENT   model state (context strips of clips) — server-local,
             NEVER uploaded; may be DIRECTORY-shaped (a strip)
    QVOICE   a voice sample for cloning (CustomVoice) — audio media
             whose KIND is the role, not the bytes

The law (same walk for all five):

    resolve(ref, kind, input_dir, output_dir) -> Artifact | None
        empty ref            -> None (absence is caller policy)
        direct absolute path -> that path
        else                 -> output mount -> input mount
        wrong-kind file      -> LOUD refusal (an image ref that lands
                                on a .wav is a 4xx, never a mystery
                                executor failure)
        latent               -> file OR directory (a strip of clips)

    uploads(kind)            transport policy SSOT: image/video/audio/
                             qvoice ride the upload pass; latent never
    upload_extensions()      the union table for uploading kinds —
                             native.py's submit-time walk consumes
                             THIS, no local extension blobs

Interpretation stays lane knowledge (an image ref feeds LoadImage;
a latent ref flips a film's opening window to the chain family) —
the RESOLUTION and the KIND CONTRACT are here, once.
"""

import base64
import os
import re
from enum import Enum
from typing import Optional, Tuple

from pydantic import BaseModel, ConfigDict


class Kind(str, Enum):
    """Closed vocabulary — the six artifact kinds."""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    LATENT = "latent"
    QVOICE = "qvoice"
    MESH = "mesh"


# The extension SSOT. qvoice shares the audio set: a voice sample IS
# audio media; the kind names the ROLE (clone anchor). mesh carries
# the container family python/flow.py's Kind names (glb/obj/fbx/usd) —
# the submit-time walk stages them into ComfyUI's input store so
# rig/mesh nodes read input/<name> (the body-to-somax bridge,
# 2026-09-06: without the row a .glb rode the workflow untouched and
# the node refused "source_glb not found" — checked abs, then the
# input store, and the file was in neither).
_EXTS = {
    Kind.IMAGE: frozenset((".png", ".jpg", ".jpeg", ".webp", ".gif",
                           ".bmp", ".avif", ".tiff")),
    Kind.VIDEO: frozenset((".mp4", ".webm", ".mov", ".mkv", ".avi")),
    Kind.AUDIO: frozenset((".wav", ".mp3", ".flac", ".ogg", ".m4a",
                           ".aac", ".aiff")),
    Kind.LATENT: frozenset((".safetensors", ".pt", ".pth")),
    Kind.QVOICE: frozenset((".wav", ".mp3", ".flac", ".ogg", ".m4a",
                            ".aac", ".aiff")),
    Kind.MESH: frozenset((".glb", ".gltf", ".obj", ".fbx", ".usd",
                          ".usdz")),
}


class Artifact(BaseModel):
    """One resolved artifact reference. `ref` stays VERBATIM as
    authored on the wire (it may already be server-space); `path` is
    the absolute location on OUR mount."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    kind: Kind
    ref: str
    path: str


def uploads(kind: Kind) -> bool:
    """Transport policy: everything but latent rides the upload pass
    at submit time. Latent is server-local state — uploading it would
    move it away from the executor that wrote it."""
    return kind is not Kind.LATENT


def upload_extensions() -> Tuple[str, ...]:
    """The union of extensions for uploading kinds. The submit-time
    walk (native.py) consumes this table — the single source."""
    exts = set()
    for kind, e in _EXTS.items():
        if uploads(kind):
            exts |= e
    return tuple(sorted(exts))


# Wire-JSON shape: ref dicts ({file: ...}) ride decoded JSON.
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]


# ── data: URL uploads (the editor's attach shape) ────────────────────
# readAsDataURL lands file bytes on the wire as data:<mime>;base64,….
# The mime is the BROWSER's claim (empty for unknown extensions — a
# dropped .glb usually arrives as data:;base64,…), so admission NEVER
# trusts it: parse validates the base64 SHAPE, and kind admission
# sniffs the decoded MAGIC. (input_prep's schema.py carries an older
# local copy requiring a non-empty mime — consolidation debt, not
# this stroke.)
_DATA_URL_RE = re.compile(r"^data:([^;,]*)(;base64)?,(.*)$", re.DOTALL)

# mime → staged extension. Unknown/empty mimes fall through to the
# magic sniff (staged_name_for takes the decoded bytes for exactly
# this); truly unknowable bytes stage as .bin and refuse at kind
# admission downstream.
_MIME_EXTS = {
    "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    "image/gif": "gif", "image/bmp": "bmp", "image/tiff": "tiff",
    "image/avif": "avif", "model/gltf-binary": "glb",
}

# magic → extension (the honest bytes behind the mime claim).
_MAGIC_EXTS = (
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"\xff\xd8\xff", "jpg"),
    (b"GIF87a", "gif"), (b"GIF89a", "gif"),
    (b"BM", "bmp"),
    (b"glTF", "glb"),
)


def parse_data_url(ref: str) -> Tuple[str, bytes]:
    """Split a data: URL into (mime, raw bytes). Raises ValueError
    naming the defect — the phase-1 refusal quotes it. Empty mime
    (data:;base64,…) is VALID (unknown extension drops); the kind
    check downstream sniffs the magic."""
    m = _DATA_URL_RE.match(ref or "")
    if not m:
        raise ValueError("malformed data: URL (expected "
                         "data:<mime>;base64,<payload>)")
    mime, b64flag, payload = m.group(1).lower(), m.group(2), m.group(3)
    if not b64flag:
        raise ValueError("data: URL must be base64-encoded "
                         "(missing ;base64 flag)")
    if not payload:
        raise ValueError("data: URL carries an empty payload")
    try:
        raw = base64.b64decode(payload, validate=True)
    except Exception:
        raise ValueError("data: URL payload is not valid base64")
    if not raw:
        raise ValueError("data: URL decodes to zero bytes")
    return mime, raw


def sniff_ext(raw: bytes) -> Optional[str]:
    """The magic-byte extension (png/jpg/gif/bmp/glb), or None when
    the bytes match nothing known. WEBP (RIFF….WEBP) sniffs as None —
    the mime table above still stages a claimed image/webp; a WEBP
    with an empty mime refuses as unknowable rather than guessing."""
    for magic, ext in _MAGIC_EXTS:
        if raw[:len(magic)] == magic:
            return ext
    return None


def staged_name_for(mime: str, raw: bytes, run_id: str) -> str:
    """Deterministic staged filename for decoded upload bytes — the
    extension follows the mime, falling back to the magic sniff, then
    .bin; the run id scopes it (no cross-run collisions in the shared
    input dir)."""
    ext = _MIME_EXTS.get(mime or "") or sniff_ext(raw) or "bin"
    return "input_%s.%s" % ((run_id or "norun").replace("-", "")[:16], ext)


def _ref_str(ref: str | dict[str, JsonValue] | None) -> str:
    if isinstance(ref, str):
        return ref.strip()
    if isinstance(ref, dict) and isinstance(ref.get("file"), str):
        return ref["file"].strip()
    return ""


def resolve(ref: str | dict[str, JsonValue] | None, kind: Kind, *, input_dir: str = "",
            output_dir: str = "") -> Optional[Artifact]:
    """The walk. Returns None for an absent ref; raises ValueError
    LOUD for a stated ref that resolves nowhere or lands on the
    wrong kind."""
    r = _ref_str(ref)
    if not r:
        return None

    candidates = [r] if os.path.isabs(r) else [
        os.path.join(output_dir, r) if output_dir else "",
        os.path.join(input_dir, r) if input_dir else "",
    ]
    path = next((c for c in candidates if c and os.path.exists(c)), "")
    if not path:
        raise ValueError(
            "%s ref %r resolves nowhere (mounts: output=%r input=%r)"
            % (kind.value, r, output_dir, input_dir))

    if os.path.isdir(path):
        if kind is not Kind.LATENT:
            raise ValueError(
                "%s ref %r resolved to a directory (%s) — only latent "
                "strips are directory-shaped" % (kind.value, r, path))
        return Artifact(kind=kind, ref=r, path=path)

    ext = os.path.splitext(path)[1].lower()
    if ext not in _EXTS[kind]:
        raise ValueError(
            "%s ref %r resolved to %r — extension %r is not a %s "
            "artifact" % (kind.value, r, path, ext, kind.value))
    return Artifact(kind=kind, ref=r, path=path)
