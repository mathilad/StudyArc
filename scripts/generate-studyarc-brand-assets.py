from pathlib import Path
import shutil
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "assets" / "brand" / "studyarc-logo.svg"


def render(path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(
        url=str(SVG),
        write_to=str(path),
        output_width=size,
        output_height=size,
    )


# Expo/Android source assets. Use a high-resolution true PNG generated on the
# build runner so Jimp/Expo never has to consume a damaged binary committed to git.
main_icon = ROOT / "assets" / "images" / "icon.png"
render(main_icon, 1024)

for target in [
    ROOT / "assets" / "images" / "study-arc-icon.png",
    ROOT / "assets" / "images" / "study-arc-brand.png",
    ROOT / "assets" / "images" / "splash-icon.png",
    ROOT / "public" / "icon.png",
]:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(main_icon, target)

render(ROOT / "assets" / "images" / "favicon.png", 256)
render(ROOT / "public" / "favicon.png", 256)

print("Generated StudyArc brand PNG assets from", SVG)
