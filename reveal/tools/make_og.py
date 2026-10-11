#!/usr/bin/env python3
"""Compose the 1200x630 link-preview card (public/og.jpg) from the key art and the site's own fonts.

  python reveal/tools/make_og.py
"""
from __future__ import annotations

import io
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFilter, ImageFont

REVEAL = Path(__file__).resolve().parents[1]
FONTS = REVEAL / "node_modules" / "@fontsource-variable"
W, H = 1200, 630


def font(package: str, file: str, size: int, weight: int) -> ImageFont.FreeTypeFont:
    ttf = io.BytesIO()
    TTFont(FONTS / package / "files" / file).save(ttf)  # woff2 -> sfnt
    ttf.seek(0)
    f = ImageFont.truetype(ttf, size)
    f.set_variation_by_axes([weight])
    return f


def main() -> None:
    art = Image.open(REVEAL / "public" / "slots" / "keyart.jpg").convert("RGB")
    scale = W / art.width
    art = art.resize((W, round(art.height * scale)), Image.LANCZOS)
    top = max(0, (art.height - H) // 2 - 8)
    card = art.crop((0, top, W, top + H))

    # A soft pool of shadow under the title, upper left.
    shade = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shade).ellipse((-260, -220, 720, 330), fill=190)
    shade = shade.filter(ImageFilter.GaussianBlur(70))
    card = Image.composite(Image.new("RGB", (W, H), (6, 5, 14)), card, shade)

    d = ImageDraw.Draw(card)
    serif = font("fraunces", "fraunces-latin-wght-normal.woff2", 84, 420)
    serif_i = font("fraunces", "fraunces-latin-wght-italic.woff2", 84, 420)
    sans = font("inter-tight", "inter-tight-latin-wght-normal.woff2", 25, 520)
    kicker = font("inter-tight", "inter-tight-latin-wght-normal.woff2", 17, 650)

    x, y = 64, 58
    d.text((x, y), "FREE  ·  OPEN SOURCE  ·  VIBECODED  ·  ANY PLATFORM", font=kicker, fill=(240, 162, 75))
    y += 40
    d.text((x, y), "VibeCode", font=serif, fill=(244, 236, 220))
    y += 88
    d.text((x, y), "Arcade", font=serif_i, fill=(240, 162, 75))
    y += 112
    d.text((x, y), "The shelf is empty on purpose.", font=sans, fill=(232, 222, 205))
    d.text((x, y + 34), "Bring your games.", font=sans, fill=(244, 236, 220))

    out = REVEAL / "public" / "og.jpg"
    card.save(out, "JPEG", quality=88, optimize=True, progressive=True)
    print(out)


if __name__ == "__main__":
    main()
