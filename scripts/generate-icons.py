"""Original vector-like chalk marks rendered to local PNG installation icons."""
from pathlib import Path
from PIL import Image, ImageDraw

output = Path(__file__).resolve().parents[1] / "public" / "icons"
output.mkdir(parents=True, exist_ok=True)
for name, size, maskable in [("icon-192", 192, False), ("icon-512", 512, False),
                              ("maskable-512", 512, True), ("apple-touch-180", 180, False)]:
    scale = 4
    canvas = Image.new("RGB", (size * scale, size * scale), "#173E35")
    draw = ImageDraw.Draw(canvas)
    def point(x, y):
        return (round(x * size * scale), round(y * size * scale))
    if not maskable:
        draw.rounded_rectangle([point(.045, .045), point(.955, .955)], radius=size * scale * .1,
                               outline="#B77927", width=round(size * scale * .07))
    # Both shapes fit inside the central maskable safe circle.
    width = round(size * scale * .055)
    draw.line([point(.23, .33), point(.43, .67)], fill="#E8D76A", width=width)
    draw.line([point(.43, .33), point(.23, .67)], fill="#E8D76A", width=width)
    draw.ellipse([point(.55, .34), point(.77, .66)], outline="#B5A4D8", width=width)
    canvas.resize((size, size), Image.Resampling.LANCZOS).save(output / f"{name}.png")
    print(f"Generated {name}.png ({size}x{size})")
