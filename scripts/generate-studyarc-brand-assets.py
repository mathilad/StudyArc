from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "brand" / "studyarc-logo.png"


def render(path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as image:
        image.convert("RGB").resize(
            (size, size), Image.Resampling.LANCZOS
        ).save(path, format="PNG", optimize=True)


# Keep Expo, the top bar, splash screen and web icons on the approved artwork.
# Resizing preserves the supplied design; it does not add source detail.
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

print("Generated StudyArc brand PNG assets from", SOURCE)
