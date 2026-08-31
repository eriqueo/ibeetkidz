from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
B=ROOT/'src/assets/sprites/buttons'; T=ROOT/'src/assets/sprites/track3'
discrete={
 B/'btn-track-tarp-idle.png':(512,512), B/'btn-track-tarp-seated.png':(512,512),
 B/'btn-nav-map-idle.png':(512,512), B/'btn-nav-map-pressed.png':(512,512),
 B/'btn-track-ride-idle.png':(512,512), B/'btn-track-ride-pressed.png':(512,512),
 B/'btn-track-clear-idle.png':(512,512), B/'btn-track-clear-pressed.png':(512,512),
 B/'btn-transport-loop-idle.png':(512,512), B/'btn-transport-loop-pressed.png':(512,512),
 B/'btn-transport-stop-idle.png':(512,512), B/'btn-transport-stop-pressed.png':(512,512),
 B/'btn-send-song-idle.png':(512,512), B/'btn-send-song-pressed.png':(512,512),
 B/'btn-transport-slow-idle.png':(512,512), B/'btn-transport-slow-pressed.png':(512,512),
 B/'btn-transport-fast-idle.png':(512,512), B/'btn-transport-fast-pressed.png':(512,512),
 B/'track-speed-readout.png':(512,512),
 T/'tarp-cover-boxcar.png':(300,190),T/'tarp-cover-tanker.png':(300,170),T/'tarp-cover-hopper.png':(300,190),T/'tarp-cover-flatcar.png':(300,110),
 T/'tunnel-mouth-left.png':(640,640),T/'tunnel-mouth-right.png':(640,640),T/'tunnel-lamp-0.png':(96,128),T/'tunnel-lamp-1.png':(96,128),
 T/'bridge-pier.png':(160,360),T/'bridge-far-bank-left.png':(320,250),T/'bridge-far-bank-right.png':(320,250), T/'wheel.png':(76,76),T/'shadow.png':(300,44),
}
tiles={T/'tunnel-roof.png':(640,520),T/'tunnel-wall.png':(640,720),T/'bridge-deck-tile.png':(640,170),T/'bridge-water.png':(640,150)}
pairs=((B/'btn-track-tarp-idle.png',B/'btn-track-tarp-seated.png'),(B/'btn-nav-map-idle.png',B/'btn-nav-map-pressed.png'),(B/'btn-track-ride-idle.png',B/'btn-track-ride-pressed.png'),(B/'btn-track-clear-idle.png',B/'btn-track-clear-pressed.png'),(B/'btn-transport-loop-idle.png',B/'btn-transport-loop-pressed.png'),(B/'btn-transport-stop-idle.png',B/'btn-transport-stop-pressed.png'),(B/'btn-send-song-idle.png',B/'btn-send-song-pressed.png'),(B/'btn-transport-slow-idle.png',B/'btn-transport-slow-pressed.png'),(B/'btn-transport-fast-idle.png',B/'btn-transport-fast-pressed.png'),(T/'tunnel-lamp-0.png',T/'tunnel-lamp-1.png'))
def im(p): return Image.open(p).convert('RGBA')
def check_discrete(p,size):
    x=im(p); assert x.size==size,(p,x.size,size); a=x.getchannel('A'); w,h=x.size; assert all(a.getpixel(q)==0 for q in ((0,0),(w-1,0),(0,h-1),(w-1,h-1))),p; assert all(v in (0,255) for v in a.getdata()),p; print('PASS',p.relative_to(ROOT))
def check_tile(p,size):
    x=im(p); assert x.size==size,(p,x.size,size); assert [x.getpixel((0,y)) for y in range(x.height)]==[x.getpixel((x.width-1,y)) for y in range(x.height)],p; print('PASS',p.relative_to(ROOT))
for p,s in discrete.items(): check_discrete(p,s)
for p,s in tiles.items(): check_tile(p,s)
for l,r in pairs:
    assert im(l).getchannel('A').getbbox()==im(r).getchannel('A').getbbox(),(l,r); print('PASS paired bounds',l.name,r.name)
print('ALL HIGH-DETAIL AR-064–069 EXPORT CHECKS PASSED')
