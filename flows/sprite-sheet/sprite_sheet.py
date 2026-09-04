#!/usr/bin/env python3
"""
sprite_sheet.py — Generate animated sprite sheets via inference.cpp.

Usage:
  python3 sprite_sheet.py --character "a knight in silver armor" \
    --actions "idle,walk_left,walk_right,jump,attack" \
    --output sprites/knight_sheet.png \
    --cols 5

Or use programmatically:
  from sprite_sheet import generate_sprite_sheet
  generate_sprite_sheet(
      character="a knight in silver armor",
      actions=["idle", "walk_left", "walk_right", "jump", "attack"],
      output_path="sprites/knight_sheet.png",
      cols=5
  )

Requires:
  - inference.cpp server running on :18090
  - rembg + pillow (pip install rembg pillow)
  - z-image model available on the server
"""
import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

SERVER = os.environ.get("INFERENCE_SERVER", "http://127.0.0.1:18090")

# Action -> prompt suffix mapping
ACTION_PROMPTS = {
    "idle":      "standing still, neutral pose, front view",
    "walk_left":  "walking to the left, side view, mid-stride",
    "walk_right": "walking to the right, side view, mid-stride",
    "run_left":   "running to the left, side view, dynamic pose",
    "run_right":  "running to the right, side view, dynamic pose",
    "jump":      "jumping in the air, dynamic action pose",
    "crouch":    "crouching down, low stance",
    "attack":    "attacking with a weapon, dynamic action pose",
    "defend":    "defensive stance, shield raised",
    "die":       "falling backward, defeated pose",
}


def check_server():
    """Verify inference.cpp server is running."""
    try:
        req = urllib.request.urlopen(f"{SERVER}/v1/health", timeout=5)
        data = json.loads(req.read())
        return data.get("status") == "ok"
    except Exception:
        return False


def generate_frame(character, action, seed, output_dir):
    """Generate a single sprite frame via inference.cpp."""
    suffix = ACTION_PROMPTS.get(action, action)
    prompt = f"pixel art style, {character}, {suffix}, transparent background, clean edges, game sprite"

    body = json.dumps({
        "model": "z-image",
        "prompt": prompt,
        "seed": seed,
        "negative_prompt": "blurry, low quality, text, watermark, complex background, photorealistic"
    }).encode()

    req = urllib.request.Request(
        f"{SERVER}/v1/flows/start",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        resp = urllib.request.urlopen(req, timeout=30)
        data = json.loads(resp.read())
        run_id = data["run_id"]
        print(f"  [{action}] started: {run_id}")
        return run_id
    except Exception as e:
        print(f"  [{action}] FAILED: {e}")
        return None


def wait_for_run(run_id, timeout=120):
    """Poll until run completes, return artifacts list."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.urlopen(f"{SERVER}/v1/flows/status/{run_id}", timeout=10)
            data = json.loads(req.read())
            status = data.get("status", "unknown")
            if status in ("success", "error"):
                return data
        except Exception:
            pass
        time.sleep(2)
    return {"status": "timeout", "error": f"Run {run_id} timed out after {timeout}s"}


def remove_background(image_path):
    """Remove background from an image using rembg."""
    from rembg import remove
    from PIL import Image
    import io

    img = Image.open(image_path)
    result = remove(img)

    # Convert to RGBA if not already
    if result.mode != "RGBA":
        result = result.convert("RGBA")

    # Save with transparency
    result.save(image_path, "PNG")
    return image_path


def assemble_sheet(frames, cols, output_path, padding=2):
    """Assemble frames into a sprite sheet grid."""
    from PIL import Image

    if not frames:
        print("No frames to assemble!")
        return None

    # Load all frames
    images = [Image.open(f) for f in frames]
    n = len(images)

    # Find max dimensions
    max_w = max(img.width for img in images)
    max_h = max(img.height for img in images)

    # Calculate grid
    rows = (n + cols - 1) // cols
    sheet_w = cols * (max_w + padding) + padding
    sheet_h = rows * (max_h + padding) + padding

    # Create sheet with transparency
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    for i, img in enumerate(images):
        row = i // cols
        col = i % cols
        x = padding + col * (max_w + padding)
        y = padding + row * (max_h + padding)
        # Center the frame in its cell
        x += (max_w - img.width) // 2
        y += (max_h - img.height) // 2
        sheet.paste(img, (x, y), img)

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    sheet.save(output_path, "PNG")
    print(f"Sprite sheet saved: {output_path} ({sheet_w}x{sheet_h}, {n} frames, {cols} cols)")
    return output_path


def generate_sprite_sheet(character, actions, output_path, cols=None,
                          base_seed=42, skip_generation=False, frames_dir=None):
    """
    End-to-end sprite sheet generation.

    Args:
        character: Character description (e.g. "a knight in silver armor")
        actions: List of action names (e.g. ["idle", "walk_left", "jump"])
        output_path: Where to save the sprite sheet PNG
        cols: Number of columns in the sheet (default: len(actions))
        base_seed: Starting seed for generation (each frame gets base_seed + i)
        skip_generation: If True, skip generation and just process existing frames
        frames_dir: Directory containing existing frame PNGs (for skip_generation)
    """
    if cols is None:
        cols = len(actions)

    if not skip_generation:
        if not check_server():
            print(f"ERROR: inference.cpp server not reachable at {SERVER}")
            print("Start it: cd build && ./inference_cli serve --port 18090 --plugin-dir . --catalog-dir ..")
            return None

        # Generate all frames
        print(f"Generating {len(actions)} frames for: {character}")
        run_ids = []
        for i, action in enumerate(actions):
            seed = base_seed + i
            run_id = generate_frame(character, action, seed, None)
            if run_id:
                run_ids.append((action, run_id))
            time.sleep(1)  # Brief pause between submissions

        # Wait for all frames
        print(f"Waiting for {len(run_ids)} frames...")
        frame_paths = []
        for action, run_id in run_ids:
            result = wait_for_run(run_id)
            if result["status"] == "success":
                # Find the PNG artifact
                artifacts = result.get("artifacts", [])
                if not artifacts:
                    # Try sidecar
                    sidecar_path = f"./output/{run_id}/_flow.json"
                    if os.path.exists(sidecar_path):
                        sidecar = json.load(open(sidecar_path))
                        artifacts = sidecar.get("artifacts", [])
                if artifacts:
                    frame_paths.append(artifacts[0])
                    print(f"  [{action}] done: {artifacts[0]}")
                else:
                    # Look in output dir
                    out_dir = f"./output/{run_id}"
                    pngs = sorted(Path(out_dir).glob("*.png"))
                    if pngs:
                        frame_paths.append(str(pngs[0]))
                        print(f"  [{action}] done: {pngs[0]}")
                    else:
                        print(f"  [{action}] no artifact found")
            else:
                print(f"  [{action}] failed: {result.get('error', 'unknown')}")
    else:
        # Use existing frames
        if not frames_dir:
            frames_dir = "./output"
        frame_paths = sorted(str(p) for p in Path(frames_dir).glob("*.png"))
        print(f"Using {len(frame_paths)} existing frames from {frames_dir}")

    if not frame_paths:
        print("No frames generated!")
        return None

    # Remove backgrounds
    print(f"Removing backgrounds from {len(frame_paths)} frames...")
    clean_paths = []
    for fp in frame_paths:
        out = fp.replace(".png", "_nobg.png")
        try:
            remove_background(fp)
            # rembg overwrites in place
            clean_paths.append(fp)
            print(f"  cleaned: {os.path.basename(fp)}")
        except Exception as e:
            print(f"  background removal failed for {fp}: {e}")
            clean_paths.append(fp)  # Use original

    # Assemble sheet
    return assemble_sheet(clean_paths, cols, output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate sprite sheets via inference.cpp")
    parser.add_argument("--character", "-c", required=True,
                        help="Character description (e.g. 'a knight in silver armor')")
    parser.add_argument("--actions", "-a", default="idle,walk_left,walk_right,jump,attack",
                        help="Comma-separated action list")
    parser.add_argument("--output", "-o", default="sprites/sheet.png",
                        help="Output sprite sheet path")
    parser.add_argument("--cols", type=int, default=None,
                        help="Columns in sheet (default: number of actions)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Base seed for generation")
    parser.add_argument("--server", default=None,
                        help="Inference server URL")
    parser.add_argument("--skip-generation", action="store_true",
                        help="Skip generation, process existing frames")
    parser.add_argument("--frames-dir", default=None,
                        help="Directory with existing frames (for --skip-generation)")

    args = parser.parse_args()
    if args.server:
        SERVER = args.server

    actions = [a.strip() for a in args.actions.split(",")]
    generate_sprite_sheet(
        character=args.character,
        actions=actions,
        output_path=args.output,
        cols=args.cols,
        base_seed=args.seed,
        skip_generation=args.skip_generation,
        frames_dir=args.frames_dir,
    )
