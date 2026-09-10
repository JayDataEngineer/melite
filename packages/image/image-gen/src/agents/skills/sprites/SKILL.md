---
name: sprites
description: Generate animated sprite sheets - character design, frame generation, background removal, sprite sheet assembly.
genre: image
---

# Sprite Flow

Generate pixel-art or illustrated sprite sheets for games. The flow
generates individual frames, removes backgrounds, and assembles a
transparent sprite sheet grid.

## Workflow

### 1. Generate Frames

Each action/pose is generated as a separate z-image call — `melite_flow`
with `card="image-gen", model="z-image"` (no curl — the `:33081` door
died with the gateway):

```
{
  "prompt": "pixel art style, a knight in silver armor, standing still, neutral pose, front view, transparent background, clean edges, game sprite",
  "seed": 42,
  "negative_prompt": "blurry, low quality, text, watermark, complex background"
}
```

Poll `run_status` until done:

### 2. Remove Backgrounds

Use rembg to strip backgrounds from each frame:

```python
from rembg import remove
from PIL import Image

img = Image.open("frame.png")
result = remove(img)
result.save("frame_nobg.png")
```

### 3. Assemble Sprite Sheet

Arrange frames in a grid with transparent padding:

```python
from PIL import Image

frames = [Image.open(f) for f in sorted(glob("frames/*.png"))]
cols = 5
max_w = max(f.width for f in frames)
max_h = max(f.height for f in frames)
rows = (len(frames) + cols - 1) // cols

sheet = Image.new("RGBA", (cols * max_w, rows * max_h), (0, 0, 0, 0))
for i, f in enumerate(frames):
    x = (i % cols) * max_w
    y = (i // cols) * max_h
    sheet.paste(f, (x, y), f)

sheet.save("sprite_sheet.png")
```

## One-Command Generation

```bash
python3 scripts/sprite_sheet.py \
  --character "a knight in silver armor" \
  --actions "idle,walk_left,walk_right,jump,attack" \
  --output sprites/knight_sheet.png \
  --seed 42
```

## Action Presets

| Action | Prompt Suffix |
|--------|---------------|
| idle | standing still, neutral pose, front view |
| walk_left | walking to the left, side view, mid-stride |
| walk_right | walking to the right, side view, mid-stride |
| jump | jumping in the air, dynamic action pose |
| attack | attacking with a weapon, dynamic action pose |
| crouch | crouching down, low stance |
| defend | defensive stance, shield raised |

## Tips

- Use consistent seeds for style consistency across frames
- The pixel art style prompt prefix helps maintain sprite aesthetics
- Add transparent background, clean edges, game sprite to every prompt
- Use negative_prompt to exclude complex backgrounds
- For animation loops: generate even number of frames (walk cycle: 4-8 frames)
- Sprite sheet size: keep frames under 256x256 for pixel art, 512x512 for illustrated
