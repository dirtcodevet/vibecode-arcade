#!/usr/bin/env python3
"""Generate the reveal's replaceable art with Grok Imagine.

Writes optimized JPEGs into reveal/public/slots/. Every slot has a procedural fallback, so this is optional.

  XAI_API_KEY=... python reveal/tools/gen_art.py            # all slots
  python reveal/tools/gen_art.py --env-file ../.env 03 04   # some slots, key from a dotenv file
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

API = "https://api.x.ai/v1"
MODEL = "grok-imagine-image-2.0"
REVEAL = Path(__file__).resolve().parents[1]
OUT = REVEAL / "public" / "slots" / "worlds"
RAW = REVEAL.parent / ".work" / "gen"

STYLE = (
    "Cinematic still from a video game world, painterly and richly lit, wide 16:9 composition, "
    "strong depth, inviting and full of wonder. No HUD, no UI, no text, no letters, no logos, no watermark, "
    "no recognizable franchise characters. Not neon, not cyberpunk."
)

# Windows into games that could be made. Nine kinds of play, none of them a real or fake listing.
WORLDS = {
    "01": "A cozy stylized island farm at golden hour: patchwork crops, a tiny windmill, a wooden dock, chickens, soft low-poly shapes, warm light over a calm sea.",
    "02": "A hand-crafted pixel-art platformer cave, chunky pixels, glowing amber mushrooms, a small hero with a lantern leaping between mossy ledges, waterfalls in the background.",
    "03": "A space dogfight above a ringed gas giant lit by a warm sun, two small ships trailing contrails through glittering ring ice, deep blue space, dramatic scale.",
    "04": "A fantasy castle on a sea cliff at dusk, warm windows glowing, a dragon gliding past the tower, crashing waves below, epic and painterly.",
    "05": "Sunken temple ruins underwater, shafts of sunlight through blue-green water, a little brass submarine with a headlamp exploring between carved pillars and coral.",
    "06": "An off-road desert rally at sunset, a dusty buggy kicking up a long golden dust trail between red mesas, low camera, speed and heat haze.",
    "07": "A blocky voxel forest village at dawn, cube trees, paper lanterns, a stream with a waterwheel, morning mist, charming handmade feel.",
    "08": "A minimalist puzzle world of floating stone islands joined by thin bridges and stairs that loop impossibly, soft pastel dusk sky, a tiny traveler crossing.",
    "09": "A top-down stealth game over a rainy old harbor town at night, warm sodium streetlamps, wet cobblestones reflecting light, a cloaked figure slipping between crates.",
}

# Key art for link previews and the no-WebGL fallback: the reveal's own scene, painted.
KEYART = (
    "Cinematic wide key art: a lone hooded figure sitting beside a small campfire on a rocky mountain ledge at dusk, "
    "seen from behind, overlooking a misty valley lake between layered mountain ridges. Embers rise from the fire into a "
    "violet-blue sky with the first stars and turn into a loose arc of glowing wooden-framed windows floating in the sky, "
    "each window showing a different tiny video game world: a pixel-art cave, a castle on a cliff, a spaceship over a ringed "
    "planet, a cozy farm. Warm amber firelight against cool dusk, painterly, atmospheric, hopeful. Keep the upper-left sky "
    "darker and emptier."
)

# Remix: the fork of window 04, same world reimagined.
FORKS = {
    "04b": ("04", "The exact same castle, cliff, and composition, remixed into deep winter at night: heavy snow, frozen sea, aurora in the sky, the dragon now made of ice. Keep the layout identical."),
}


def load_key(env_file: str | None) -> str:
    key = os.environ.get("XAI_API_KEY") or os.environ.get("GROK_API_KEY")
    if not key and env_file:
        for raw in Path(env_file).read_text(encoding="utf-8-sig").splitlines():
            name, _, value = raw.strip().partition("=")
            if name.strip() in ("XAI_API_KEY", "GROK_API_KEY") and value:
                key = value.strip().strip('"').strip("'")
                break
    if not key:
        sys.exit("missing XAI_API_KEY (or pass --env-file)")
    return key


def post(key: str, path: str, body: dict) -> dict:
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": "vibecode-arcade-art/0.1"},
    )
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:300]
            if e.code in (402, 403) and ("credit" in detail.lower() or "spending" in detail.lower()):
                sys.exit(f"xAI credits exhausted: {e.code} {detail}")
            if e.code == 429 or e.code >= 500:
                time.sleep(15 * attempt)
                continue
            raise SystemExit(f"{path} failed: {e.code} {detail}")
    raise SystemExit(f"{path} kept failing")


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "vibecode-arcade-art/0.1"}), timeout=240) as r:
        return r.read()


def save(name: str, data: bytes) -> Path:
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / f"{name}.raw").write_bytes(data)
    im = Image.open(io.BytesIO(data)).convert("RGB")
    im.thumbnail((1600, 900), Image.LANCZOS)
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{name}.jpg"
    im.save(out, "JPEG", quality=84, optimize=True, progressive=True)
    return out


def generate(key: str, name: str) -> str:
    body = {"model": MODEL, "prompt": f"{WORLDS[name]} {STYLE}", "n": 1, "aspect_ratio": "16:9",
            "resolution": "2k", "quality": "medium", "response_format": "url"}
    data = post(key, "/images/generations", body)
    return str(save(name, fetch(data["data"][0]["url"])))


def keyart(key: str) -> str:
    body = {"model": MODEL, "prompt": f"{KEYART} {STYLE}", "n": 1, "aspect_ratio": "16:9",
            "resolution": "2k", "quality": "medium", "response_format": "url"}
    data = post(key, "/images/generations", body)
    raw = fetch(data["data"][0]["url"])
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / "keyart.raw").write_bytes(raw)
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    im.thumbnail((1920, 1080), Image.LANCZOS)
    out = REVEAL / "public" / "slots" / "keyart.jpg"
    im.save(out, "JPEG", quality=84, optimize=True, progressive=True)
    return str(out)


def fork(key: str, name: str) -> str:
    parent, prompt = FORKS[name]
    src = (RAW / f"{parent}.raw").read_bytes()
    mime = "image/png" if src[:4] == b"\x89PNG" else "image/jpeg"
    body = {"model": MODEL, "prompt": f"{prompt} {STYLE}", "images": [{"type": "image_url", "url": f"data:{mime};base64,{base64.b64encode(src).decode()}"}],
            "aspect_ratio": "16:9", "resolution": "2k", "quality": "medium", "response_format": "url"}
    data = post(key, "/images/edits", body)
    return str(save(name, fetch(data["data"][0]["url"])))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("slots", nargs="*", help="slot names (default: all)")
    ap.add_argument("--env-file")
    args = ap.parse_args()
    key = load_key(args.env_file)
    wanted = args.slots or [*WORLDS, *FORKS, "keyart"]
    worlds = [s for s in wanted if s in WORLDS]
    forks = [s for s in wanted if s in FORKS]
    with ThreadPoolExecutor(max_workers=4) as pool:
        for name, path in zip(worlds, pool.map(lambda s: generate(key, s), worlds)):
            print(f"{name} -> {path}", flush=True)
    for name in forks:
        print(f"{name} -> {fork(key, name)}", flush=True)
    if "keyart" in wanted:
        print(f"keyart -> {keyart(key)}", flush=True)


if __name__ == "__main__":
    main()
