#!/usr/bin/env python3
"""Generate the reveal's soundtrack with Google Lyria (Gemini API).

Writes reveal/public/slots/music.mp3. Optional: without it the site plays its procedural Web Audio score.

  GEMINI_API_KEY=... python reveal/tools/gen_music.py
  python reveal/tools/gen_music.py --env-file ../.env --model lyria-3-pro-preview
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://generativelanguage.googleapis.com/v1beta"
OUT = Path(__file__).resolve().parents[1] / "public" / "slots" / "music.mp3"

PROMPT = (
    "Instrumental cinematic ambient score, about two minutes, for a quiet scene: a lone dreamer by a small "
    "campfire on a mountain ledge at dusk, embers rising into a starry sky over a valley lake. "
    "Warm felt piano motif, soft analog synth pads, gentle low strings, distant shimmering bells, a slow "
    "heartbeat-like pulse that builds into a hopeful, wonder-filled swell in the second half, then settles. "
    "Key of D major, around 72 BPM, spacious reverb, intimate and hopeful. No vocals, no drums kit, no lyrics. "
    "Ending resolves softly so it can loop."
)


def load_key(env_file: str | None) -> str:
    key = os.environ.get("GEMINI_API_KEY")
    if not key and env_file:
        for raw in Path(env_file).read_text(encoding="utf-8-sig").splitlines():
            name, _, value = raw.strip().partition("=")
            if name.strip() == "GEMINI_API_KEY" and value:
                key = value.strip().strip('"').strip("'")
                break
    if not key:
        sys.exit("missing GEMINI_API_KEY (or pass --env-file)")
    return key


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--env-file")
    ap.add_argument("--model", default="lyria-3.5")
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()
    key = load_key(args.env_file)
    body = json.dumps({"contents": [{"parts": [{"text": PROMPT}]}]}).encode()
    req = urllib.request.Request(
        f"{API}/models/{args.model}:generateContent",
        data=body,
        headers={"x-goog-api-key": key, "Content-Type": "application/json"},
    )
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                data = json.loads(r.read())
            break
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:400]
            if e.code == 429 or e.code >= 500:
                print(f"retry {attempt}: {e.code}", flush=True)
                time.sleep(35)
                continue
            sys.exit(f"lyria failed: {e.code} {detail}")
    else:
        sys.exit("lyria kept failing")

    parts = data["candidates"][0]["content"]["parts"]
    audio = [p["inlineData"] for p in parts if "inlineData" in p]
    notes = [p["text"] for p in parts if "text" in p]
    if not audio:
        sys.exit(f"no audio returned: {notes}")
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(audio[0]["data"]))
    print(f"{audio[0].get('mimeType')} -> {out} ({out.stat().st_size // 1024} KB)")
    for n in notes:
        print("note:", n[:300])


if __name__ == "__main__":
    main()
