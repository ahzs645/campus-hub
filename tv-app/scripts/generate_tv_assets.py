from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageColor, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
PLAY_CONSOLE = ROOT / "play-console"

BG_TOP = "#0A1721"
BG_BOTTOM = "#102737"
PANEL = "#122637"
PANEL_STROKE = "#355067"
GOLD = "#B79527"
TEAL = "#16A085"
WHITE = "#F6F8FB"
MUTED = "#B5C3D1"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def vertical_gradient(width: int, height: int, top: str, bottom: str) -> Image.Image:
    top_rgb = ImageColor.getrgb(top)
    bottom_rgb = ImageColor.getrgb(bottom)
    image = Image.new("RGB", (width, height), top)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        blend = y / max(height - 1, 1)
        color = tuple(
            int(top_rgb[i] + (bottom_rgb[i] - top_rgb[i]) * blend) for i in range(3)
        )
        draw.line((0, y, width, y), fill=color)
    return image


def rounded_panel(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    radius: int,
    fill: str,
    outline: str | None = None,
    outline_width: int = 1,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=outline_width)


def add_glow(base: Image.Image, box: tuple[int, int, int, int], color: str, blur: int) -> None:
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(box, fill=color)
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(glow)


def make_icon(size: int, round_icon: bool = False) -> Image.Image:
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    rounded_panel(draw, (0, 0, size - 1, size - 1), max(size // 5, 18), BG_TOP)

    background = Image.new("RGBA", (size, size), BG_BOTTOM)
    background_draw = ImageDraw.Draw(background)
    background_draw.ellipse(
        (-size // 5, -size // 5, size // 2, size // 2), fill=(22, 160, 133, 54)
    )
    background_draw.ellipse(
        (size // 2, size // 3, size + size // 6, size + size // 6), fill=(183, 149, 39, 64)
    )
    background = background.filter(ImageFilter.GaussianBlur(max(size // 18, 4)))
    image.alpha_composite(background)

    inset = int(size * 0.12)
    rounded_panel(
        draw,
        (inset, inset, size - inset, size - inset),
        max(size // 7, 14),
        PANEL,
        outline=PANEL_STROKE,
        outline_width=max(size // 48, 2),
    )

    screen_left = int(size * 0.26)
    screen_top = int(size * 0.22)
    screen_right = int(size * 0.74)
    screen_bottom = int(size * 0.58)
    rounded_panel(
        draw,
        (screen_left, screen_top, screen_right, screen_bottom),
        max(size // 14, 8),
        "#0D1A25",
        outline=GOLD,
        outline_width=max(size // 36, 3),
    )

    tile_gap = max(size // 48, 2)
    tile_width = (screen_right - screen_left - tile_gap * 4) // 3
    tile_height = max(int(size * 0.075), 6)
    tile_y = screen_top + max(size // 14, 8)
    tile_colors = [TEAL, GOLD, "#4CC9F0"]
    for index, color in enumerate(tile_colors):
        x0 = screen_left + tile_gap * (index + 1) + tile_width * index
        rounded_panel(
            draw,
            (x0, tile_y, x0 + tile_width, tile_y + tile_height),
            max(size // 50, 2),
            color,
        )

    line_top = tile_y + tile_height + max(size // 18, 7)
    line_height = max(size // 64, 2)
    for index, width_factor in enumerate((0.72, 0.52, 0.64)):
        length = int((screen_right - screen_left) * width_factor)
        x0 = screen_left + max(size // 16, 6)
        y = line_top + index * max(size // 14, 8)
        rounded_panel(draw, (x0, y, x0 + length, y + line_height), line_height, "#3A5164")

    stand_y = int(size * 0.66)
    draw.rounded_rectangle(
        (int(size * 0.43), stand_y, int(size * 0.57), int(size * 0.72)),
        radius=max(size // 60, 2),
        fill=GOLD,
    )
    draw.rounded_rectangle(
        (int(size * 0.30), int(size * 0.72), int(size * 0.70), int(size * 0.79)),
        radius=max(size // 24, 4),
        fill="#284255",
    )

    node_radius = max(size // 18, 6)
    center_y = int(size * 0.80)
    nodes = [
        (int(size * 0.28), center_y),
        (int(size * 0.50), int(size * 0.88)),
        (int(size * 0.72), center_y),
    ]
    draw.line((nodes[0], nodes[1], nodes[2]), fill=TEAL, width=max(size // 48, 3))
    for x, y in nodes:
        add_glow(image, (x - node_radius * 2, y - node_radius * 2, x + node_radius * 2, y + node_radius * 2), "#1AC7AA88", max(size // 18, 5))
        draw.ellipse((x - node_radius, y - node_radius, x + node_radius, y + node_radius), fill=PANEL, outline=WHITE, width=max(size // 64, 2))

    if round_icon:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        image.putalpha(ImageChops.multiply(image.getchannel("A"), mask))

    return image


def make_banner(width: int, height: int) -> Image.Image:
    base = Image.new("RGBA", (width, height), BG_TOP)
    gradient = Image.new("RGBA", (width, height), BG_TOP)
    grad_draw = ImageDraw.Draw(gradient)
    for y in range(height):
        mix = y / max(height - 1, 1)
        color = (
            int(10 + (16 - 10) * mix),
            int(23 + (39 - 23) * mix),
            int(33 + (55 - 33) * mix),
            255,
        )
        grad_draw.line((0, y, width, y), fill=color)
    base.alpha_composite(gradient)

    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.ellipse(
        (-width * 0.12, -height * 0.20, width * 0.38, height * 0.55),
        fill=(22, 160, 133, 64),
    )
    overlay_draw.ellipse(
        (width * 0.58, height * 0.10, width * 1.08, height * 0.95),
        fill=(183, 149, 39, 48),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(height // 8))
    base.alpha_composite(overlay)

    draw = ImageDraw.Draw(base)
    for x in range(0, width, width // 14):
        draw.line((x, 0, x, height), fill=(255, 255, 255, 10), width=1)
    for y in range(0, height, height // 8):
        draw.line((0, y, width, y), fill=(255, 255, 255, 8), width=1)

    padding = int(width * 0.055)
    icon_size = int(height * 0.52)
    panel_height = int(height * 0.68)
    panel_top = (height - panel_height) // 2
    rounded_panel(
        draw,
        (padding, panel_top, width - padding, panel_top + panel_height),
        height // 12,
        (10, 24, 36, 210),
        outline=PANEL_STROKE,
        outline_width=max(width // 640, 2),
    )

    icon = make_icon(icon_size, round_icon=False)
    icon_x = padding + int(width * 0.04)
    icon_y = (height - icon_size) // 2
    base.alpha_composite(icon, (icon_x, icon_y))

    title_font = font(int(height * 0.085), bold=True)
    subtitle_font = font(int(height * 0.045), bold=False)
    chip_font = font(int(height * 0.038), bold=True)
    detail_font = font(int(height * 0.034), bold=False)

    text_x = icon_x + icon_size + int(width * 0.045)
    chip_y = panel_top + int(height * 0.12)
    chip_text = "ANDROID TV"
    draw.text((text_x, chip_y), chip_text, font=chip_font, fill=GOLD)

    title_y = chip_y + int(height * 0.09)
    draw.text((text_x, title_y), "Campus Hub TV", font=title_font, fill=WHITE)

    subtitle_y = title_y + int(height * 0.12)
    draw.text((text_x, subtitle_y), "Android TV signage shell", font=subtitle_font, fill=MUTED)

    accent_y = subtitle_y + int(height * 0.09)
    draw.rounded_rectangle(
        (text_x, accent_y, text_x + int(width * 0.22), accent_y + max(height // 64, 4)),
        radius=max(height // 90, 2),
        fill=TEAL,
    )
    draw.text(
        (text_x, accent_y + int(height * 0.035)),
        "Direct local setup · QR pairing · Kiosk-ready",
        font=detail_font,
        fill=WHITE,
    )

    return base.convert("RGB")


def save_icon_assets() -> None:
    icon_sizes = {
        "mdpi": 80,
        "hdpi": 120,
        "xhdpi": 160,
        "xxhdpi": 240,
        "xxxhdpi": 320,
    }
    for density, size in icon_sizes.items():
        target_dir = ANDROID_RES / f"mipmap-{density}"
        target_dir.mkdir(parents=True, exist_ok=True)
        make_icon(size, round_icon=False).save(target_dir / "ic_launcher.png")
        make_icon(size, round_icon=True).save(target_dir / "ic_launcher_round.png")


def save_banner_assets() -> None:
    banner_sizes = {
        "mdpi": (160, 90),
        "hdpi": (240, 135),
        "xhdpi": (320, 180),
        "xxhdpi": (480, 270),
        "xxxhdpi": (640, 360),
    }
    for density, (width, height) in banner_sizes.items():
        target_dir = ANDROID_RES / f"drawable-{density}"
        target_dir.mkdir(parents=True, exist_ok=True)
        make_banner(width, height).save(target_dir / "tv_banner.png")

    listing_dir = PLAY_CONSOLE / "graphics"
    listing_dir.mkdir(parents=True, exist_ok=True)
    make_banner(1280, 720).save(listing_dir / "android-tv-banner-1280x720.png")


def main() -> None:
    save_icon_assets()
    save_banner_assets()


if __name__ == "__main__":
    main()
