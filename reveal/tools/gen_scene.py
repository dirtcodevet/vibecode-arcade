#!/usr/bin/env python3
"""Generate the painted scene layers with Grok Imagine: the valley backdrop, the dreamer, and the ledge rock.

Writes into reveal/public/slots/scene/. Each layer is optional; the procedural scene stays if a file is missing.

  XAI_API_KEY=... python reveal/tools/gen_scene.py               # all layers
  python reveal/tools/gen_scene.py --env-file ../.env backdrop   # one layer
"""
from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).parent))
from gen_art import MODEL, RAW, REVEAL, fetch, load_key, post  # noqa: E402

OUT = REVEAL / "public" / "slots" / "scene"
CLEAN = "No text, no letters, no logos, no watermark, no signature, no frame or border."

LAYERS = {
    "backdrop": ("16:9", (
        "Matte painting for a game backdrop: the view from a high mountain overlook at dusk, looking out over a deep "
        "valley with a long winding lake far below, layered mountain ridges receding into soft blue-violet haze, distant "
        "snow-capped peaks catching the last pink light, the sun just set behind the right-hand ridge leaving a warm amber "
        "glow on the horizon, low mist pooling in the valley, sky fading from peach at the horizon through violet to deep "
        "night blue at the top with the first faint stars, thin wispy clouds lit from below. The horizon sits a little below "
        "the middle of the frame. Nothing in the foreground: no ledge, no rocks, no people, no animals, no buildings. "
        "Painterly yet richly detailed, cinematic, serene, hopeful."
    )),
    "dreamer": ("1:1", (
        "A lone person in a dark hooded traveler's cloak sitting on the ground hugging their knees, seen from directly behind "
        "and slightly to the left, head tilted up toward the sky, warm orange firelight rim-lighting the right edge of the cloak "
        "and hood, cool violet dusk light on the left. Painterly concept-art style. The full figure is centered with generous "
        "space around it, isolated on a perfectly flat, uniform pure green (#00FF00) chroma-key background. No ground, no "
        "shadow, no fire, no rocks, no props."
    )),
    "ground": ("1:1", (
        "Seamless tileable texture seen straight from above: dark weathered mountain rock with cracks, patches of dry golden "
        "grass, moss, lichen and small pebbles, evenly lit with no cast shadows from large objects, painterly realism, the "
        "pattern fills the entire square edge to edge."
    )),
}


def chroma_key(im: Image.Image) -> Image.Image:
    """Pure-green background to alpha, with despill so the cloak edges don't glow green."""
    a = np.asarray(im.convert("RGB")).astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenness = g - np.maximum(r, b)
    alpha = 1.0 - np.clip((greenness - 0.12) / 0.25, 0.0, 1.0)
    g2 = np.minimum(g, np.maximum(r, b) * 1.02)  # despill
    rgb = np.stack([r, g2, b], axis=-1)
    out = np.dstack([rgb, alpha])
    img = Image.fromarray((out * 255).astype(np.uint8), "RGBA")
    # Soften the matte edge a touch and trim to content.
    alpha_img = img.getchannel("A").filter(ImageFilter.GaussianBlur(0.8))
    img.putalpha(alpha_img)
    bbox = alpha_img.point(lambda v: 255 if v > 24 else 0).getbbox()
    if bbox:
        pad = 12
        img = img.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad)))
    return img


def generate(key: str, name: str) -> str:
    aspect, prompt = LAYERS[name]
    body = {"model": MODEL, "prompt": f"{prompt} {CLEAN}", "n": 1, "aspect_ratio": aspect,
            "resolution": "2k", "quality": "medium", "response_format": "url"}
    raw = fetch(post(key, "/images/generations", body)["data"][0]["url"])
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / f"scene-{name}.raw").write_bytes(raw)
    im = Image.open(io.BytesIO(raw))
    OUT.mkdir(parents=True, exist_ok=True)
    if name == "dreamer":
        cut = chroma_key(im)
        cut.thumbnail((900, 900), Image.LANCZOS)
        out = OUT / "dreamer.png"
        cut.save(out, optimize=True)
    elif name == "ground":
        im = im.convert("RGB").resize((1024, 1024), Image.LANCZOS)
        out = OUT / "ground.jpg"
        im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
    else:
        im = im.convert("RGB")
        out = OUT / f"{name}.jpg"
        im.save(out, "JPEG", quality=88, optimize=True, progressive=True)
    return f"{out} {im.size if name != 'dreamer' else cut.size}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("layers", nargs="*")
    ap.add_argument("--env-file")
    args = ap.parse_args()
    key = load_key(args.env_file)
    for name in args.layers or list(LAYERS):
        print(f"{name} -> {generate(key, name)}", flush=True)


if __name__ == "__main__":
    main()
