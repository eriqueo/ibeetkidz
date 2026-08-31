from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
TRACK = ROOT / 'src/assets/sprites/track3'
OUT = ROOT / 'design/registration'
OUT.mkdir(parents=True, exist_ok=True)
wheel = Image.open(TRACK / 'wheel.png').convert('RGBA')
records = [
    ('boxcar', 'car-boxcar.png', ((77,160,30,'A'),(223,160,30,'B'))),
    ('tanker', 'car-tanker.png', ((77,140,30,'A'),(223,140,30,'B'))),
    ('hopper', 'car-hopper.png', ((77,160,30,'A'),(223,160,30,'B'))),
    ('flatcar', 'car-flatcar.png', ((77,80,30,'A'),(223,80,30,'B'))),
    ('locomotive', 'loco.png', ((78,190,30,'DRIVER'),(277,201,19,'PILOT'))),
]
for name, file, axles in records:
    car = Image.open(TRACK / file).convert('RGBA')
    w,h=car.size
    # Wide technical sheet keeps native source coordinates visible and overlays
    # the new high-detail turning wheel at the renderer’s actual centre points.
    sheet=Image.new('RGBA',(w,h+64),(31,29,34,255)); sheet.alpha_composite(car,(0,0))
    d=ImageDraw.Draw(sheet)
    d.line((0,h-1,w-1,h-1),fill=(255,204,62,255),width=2)
    d.text((6,h+12),f'{name.upper()}  RAILHEAD y={h}',fill=(251,243,217,255))
    for x,y,r,label in axles:
        disp=wheel.resize((r*2,r*2),Image.Resampling.NEAREST)
        sheet.alpha_composite(disp,(x-r,y-r))
        d.line((x-10,y,x+10,y),fill=(232,80,58,255),width=1)
        d.line((x,y-10,x,y+10),fill=(232,80,58,255),width=1)
        d.text((max(2,x-18),max(2,y-r-15)),f'{label} ({x},{y}) r{r}',fill=(251,243,217,255))
    sheet.convert('RGB').save(OUT / f'wheel-registration-{name}.png')
    print(name, axles)
