These are generated SVG placeholder images included for quick use in the project.

Files:
- 1200x600.svg — large hero placeholder
- 800x600.svg — medium placeholder
- 400x300.svg — small/content placeholder

Convert to PNG (examples):

Using `cairosvg` (Python):

```bash
pip install cairosvg
python3 -m pip install --user cairosvg
cairosvg images/1200x600.svg -o images/1200x600.png
```

Using `rsvg-convert` (librsvg package):

```bash
sudo apt install librsvg2-bin
rsvg-convert -w 1200 -h 600 images/1200x600.svg -o images/1200x600.png
```

Or run `scripts/convert_svgs.py` if you have `cairosvg` installed.
