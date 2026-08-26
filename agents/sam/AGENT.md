# SAM — Segment Anything

SAM (Segment Anything Model) segments objects in images using point clicks, bounding boxes, or text descriptions.

## When to Use

- **Point prompt**: User clicks on object — fastest, most precise
- **Box prompt**: Bounding box around object — good for automation
- **Text prompt** (SAM 3 only): Type "yellow jacket" — no coordinates needed

## Models

| Model | Size | Speed | Text Prompt |
|-------|------|-------|-------------|
| SAM 2.1 Hiera Tiny | 39M | <10ms | No |
| SAM 2.1 Hiera Small | 46M | <15ms | No |
| SAM 2.1 Hiera Base+ | 80M | <25ms | No |
| SAM 2.1 Hiera Large | 224M | <50ms | No |
| SAM 3 ViT-B | 86M | <30ms | Yes |
| SAM 3 ViT-L | 307M | <80ms | Yes |
| SAM 3 ViT-H | 636M | <150ms | Yes |

## Prompt Types

### Point Prompt (SAM 2/3)
```
points: [[x, y, label], ...]
label: 1 = positive (include), 0 = negative (exclude)
```

### Box Prompt (SAM 2/3)
```
box: [x0, y0, x1, y1]
```

### Text Prompt (SAM 3 only)
```
text: "yellow jacket"
```

## Pipeline: Segment & Inpaint

```
Input Image
    │
    ▼
SAM 3 (text: "person")  ──► Binary Mask
    │
    ▼
Crop + Pad 64px  ──► Cropped Region + Mask
    │
    ▼
sd.cpp Inpainting  ──► Inpainted Crop
    │
    ▼
Feather + Stitch  ──► Final Image (object removed)
```

## Multi-Face Disambiguation

When two faces exist and you want only one:
1. Use **point prompt** on the specific face (not text)
2. Or use YOLO to detect faces, then filter by position, then SAM 2

## GGUF Models

Download from HuggingFace:
- `sam2.1_hiera_tiny_f16.ggml` — 39MB, fastest
- `sam3_vit_b_f16.ggml` — 350MB, supports text prompts

## Plugin

`sam3_cpp` — loads via C-ABI plugin, supports point/box/text prompts.
`crop_stitch` — crops, feathers, and alpha-blends inpainted regions.
