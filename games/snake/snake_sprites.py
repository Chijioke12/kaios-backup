"""
SNAKE EVOLVED — KaiOS Complete 2D Sprite Sheet
Target: 240×320, Phaser CE, KaiOS d-pad
Style: Sharp flat-2D, 3-tone shading, ink outlines, specular highlights
Grid: 16×16 tiles

Sprites generated:
  SNAKE T1 (worm):    head ×4, body_h, body_v, corner ×4, tail ×4  = 14
  SNAKE T2 (serpent): head ×4                                        =  4
  SNAKE T3 (dragon):  head ×4                                        =  4
  FOOD:               apple, golden_apple, cherry, strawberry, orb   =  5
  POWER-UPS:          ghost, magnet, speed, shield                   =  4
  BIOME TILES (×4):   wall, floor, deco                              = 12
  PARTICLES:          eat, spark, glow                               =  3
  UI:                 hud, gameover, score_popup, banner,
                      biome_badge ×4, level_up, menu_panel           = 10
  Total: 56 sprites
"""

import json, math
from PIL import Image, ImageDraw

SHEET_W, SHEET_H = 512, 640
TRANSPARENT = (0,0,0,0)
sheet = Image.new("RGBA", (SHEET_W, SHEET_H), TRANSPARENT)
atlas = {}

# ── PALETTE ───────────────────────────────────────────────────────────────────
P = {
    # ── Snake Tier 1 — Emerald Worm ───────────────────────────────────────────
    "s1_hi":    (160, 240, 120),   # bright highlight
    "s1":       (80,  190,  60),   # main green
    "s1_shad":  (40,  120,  25),   # shadow
    "s1_belly": (200, 240, 160),   # belly/underside
    "s1_scale": (60,  160,  40),   # scale detail
    "s1_eye_w": (240, 250, 255),   # eye white
    "s1_eye":   (20,   20,  30),   # pupil
    "s1_tongue":(220,  40,  60),   # tongue

    # ── Snake Tier 2 — Golden Serpent ─────────────────────────────────────────
    "s2_hi":    (255, 248, 160),
    "s2":       (220, 180,  20),
    "s2_shad":  (150, 110,   0),
    "s2_belly": (255, 240, 180),
    "s2_scale": (190, 145,  10),
    "s2_eye":   (220,  60,  20),   # red-orange eye
    "s2_horn":  (200, 160,  10),

    # ── Snake Tier 3 — Crimson Dragon ────────────────────────────────────────
    "s3_hi":    (255, 180, 140),
    "s3":       (200,  40,  30),
    "s3_shad":  (120,  10,   5),
    "s3_belly": (255, 200, 160),
    "s3_scale": (170,  25,  18),
    "s3_eye":   (255, 220,  20),   # gold eye
    "s3_spine": (255, 120,  20),   # orange spines

    # ── Food ──────────────────────────────────────────────────────────────────
    "apple_r":  (220,  50,  40),
    "apple_rh": (255, 120, 100),
    "apple_rd": (150,  20,  10),
    "apple_g":  (60,  160,  30),   # leaf
    "apple_s":  (255, 240, 220),   # shine

    "gold_apple":(255, 210,  20),
    "gold_hi":  (255, 248, 160),
    "gold_shad":(180, 140,   0),

    "cherry_r": (190,  30,  40),
    "cherry_rh":(240,  80,  80),
    "cherry_s": (160,  10,  20),
    "cherry_st":(60,  130,  20),   # stem

    "straw_r":  (220,  50,  40),
    "straw_h":  (255, 120, 100),
    "straw_g":  (50,  150,  20),
    "straw_seed":(255,230,150),

    "orb_c":    (140, 100, 220),   # bonus orb purple
    "orb_hi":   (220, 180, 255),
    "orb_glow": (180, 140, 255),

    # ── Power-ups ─────────────────────────────────────────────────────────────
    "ghost_c":  ( 80, 160, 240),
    "ghost_hi": (180, 220, 255),
    "ghost_t":  (140, 200, 255),   # transparent fill

    "mag_r":    (200,  40,  40),
    "mag_rh":   (240, 100,  80),
    "mag_b":    ( 40,  80, 200),
    "mag_bh":   (100, 150, 240),
    "mag_p":    (220, 220, 230),   # pole silver

    "spd_y":    (255, 220,  20),
    "spd_hi":   (255, 248, 140),
    "spd_shad": (180, 150,   0),

    "shld_c":   ( 50, 180, 230),
    "shld_hi":  (160, 230, 255),
    "shld_shad":(20,  110, 170),

    # ── Biome: Lab ────────────────────────────────────────────────────────────
    "lab_w":    ( 42,  48,  70),   # wall main
    "lab_wh":   ( 62,  72, 100),   # wall hi
    "lab_ws":   ( 22,  26,  42),   # wall shadow
    "lab_f":    ( 52,  58,  80),   # floor
    "lab_fh":   ( 72,  82, 110),   # floor hi
    "lab_fs":   ( 30,  34,  52),   # floor shadow
    "lab_rivet":(100, 110, 140),
    "lab_panel":( 30,  36,  58),
    "lab_led_g":( 60, 220,  80),
    "lab_led_r":(220,  60,  60),

    # ── Biome: Jungle ─────────────────────────────────────────────────────────
    "jng_w":    ( 30,  80,  30),
    "jng_wh":   ( 60, 130,  50),
    "jng_ws":   ( 10,  45,  10),
    "jng_f":    ( 90,  55,  20),   # dirt brown
    "jng_fh":   (130,  85,  40),
    "jng_fs":   ( 55,  30,   8),
    "jng_leaf": ( 50, 170,  40),
    "jng_leaf2":( 30, 120,  20),
    "jng_root": ( 80,  50,  15),
    "jng_flower":(255,180,  40),

    # ── Biome: Space ──────────────────────────────────────────────────────────
    "spc_w":    (  8,   8,  22),   # deep space
    "spc_wh":   ( 25,  25,  60),
    "spc_ws":   (  3,   3,  12),
    "spc_f":    ( 18,  22,  42),
    "spc_fh":   ( 35,  42,  75),
    "spc_fs":   (  8,  10,  22),
    "spc_star": (255, 255, 255),
    "spc_star2":(200, 200, 255),
    "spc_nebula":(80,  40, 120),
    "spc_planet":(60, 100, 200),

    # ── Biome: Lava ───────────────────────────────────────────────────────────
    "lav_w":    ( 60,  20,  10),
    "lav_wh":   (100,  40,  15),
    "lav_ws":   ( 30,   5,   2),
    "lav_f":    ( 40,  18,   8),
    "lav_fh":   ( 70,  32,  12),
    "lav_fs":   ( 20,   6,   2),
    "lav_lava": (255, 100,  10),
    "lav_lavh": (255, 200,  50),
    "lav_crack":(220,  60,  10),
    "lav_rock": ( 80,  40,  20),

    # ── UI ────────────────────────────────────────────────────────────────────
    "ui_bg":    ( 10,  12,  24),
    "ui_panel": ( 18,  22,  40),
    "ui_border":(  80,180, 255),
    "ui_border2":( 50,120, 200),
    "ui_gold":  (255, 210,  30),
    "ui_green": ( 50, 210,  90),
    "ui_red":   (220,  50,  50),
    "ui_text":  (220, 235, 255),
    "ui_muted": ( 90, 110, 160),

    # ── Biome badge colours ───────────────────────────────────────────────────
    "badge_lab":  ( 60, 130, 220),
    "badge_jng":  ( 50, 180,  50),
    "badge_spc":  ( 80,  50, 180),
    "badge_lav":  (220,  80,  20),

    # ── Particles ─────────────────────────────────────────────────────────────
    "ptcl_y":   (255, 230,  60),
    "ptcl_g":   ( 80, 220,  80),
    "ptcl_w":   (255, 255, 255),

    "ink":      ( 12,  10,   8),
}

# ── HELPERS ───────────────────────────────────────────────────────────────────
def reg(name, x, y, w, h):
    atlas[name] = {"x":x,"y":y,"w":w,"h":h}

def sp(w,h):
    return Image.new("RGBA",(w,h),TRANSPARENT)

def D(img): return ImageDraw.Draw(img)

def place(name, img, ox, oy):
    sheet.paste(img,(ox,oy),img)
    w,h = img.size
    reg(name,ox,oy,w,h)

def rr(d,x0,y0,x1,y1,r,fill,out=None,lw=1):
    d.rounded_rectangle([x0,y0,x1,y1],radius=r,fill=fill,outline=out,width=lw)

def el(d,x0,y0,x1,y1,fill,out=None,lw=1):
    d.ellipse([x0,y0,x1,y1],fill=fill,outline=out,width=lw)

def pl(d,pts,fill,out=None,lw=1):
    d.polygon(pts,fill=fill,outline=out)

def ln(d,pts,fill,lw=1):
    d.line(pts,fill=fill,width=lw)

def spts(cx,cy,outer,inner,n=5,off=-90):
    pts=[]
    for i in range(n*2):
        a=math.radians(off+i*180/n)
        r=outer if i%2==0 else inner
        pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    return pts

# ══════════════════════════════════════════════════════════════════════════════
# SNAKE BODY PIECES — 16×16
# ══════════════════════════════════════════════════════════════════════════════
W = H = 16

def snake_colors(tier=1):
    if tier==1: return P["s1"],P["s1_hi"],P["s1_shad"],P["s1_belly"],P["s1_scale"]
    if tier==2: return P["s2"],P["s2_hi"],P["s2_shad"],P["s2_belly"],P["s2_scale"]
    return     P["s3"],P["s3_hi"],P["s3_shad"],P["s3_belly"],P["s3_scale"]

def make_body_h(tier=1):
    """Horizontal body segment."""
    img=sp(W,H); d=D(img); ink=P["ink"]
    c,hi,shad,belly,scale=snake_colors(tier)
    # main body bar
    d.rectangle([0,3,W-1,H-4],fill=shad,outline=ink)
    d.rectangle([0,3,W-2,H-5],fill=c)
    d.rectangle([1,4,W-3,5],fill=hi)     # top shine strip
    d.rectangle([0,H-5,W-2,H-5],fill=belly)  # belly line
    # scale diamonds
    for sx in [3,9]:
        d.polygon([(sx,6),(sx+2,5),(sx+4,6),(sx+2,7)],fill=scale,outline=ink)
    return img

def make_body_v(tier=1):
    img=make_body_h(tier)
    return img.rotate(90,expand=False)

def make_corner(tier=1,corner="tl"):
    """Corner piece — arc from one direction to another."""
    img=sp(W,H); d=D(img); ink=P["ink"]
    c,hi,shad,belly,scale=snake_colors(tier)
    # Draw thick L-shape
    rotmap={"tl":0,"tr":270,"br":180,"bl":90}
    rot=rotmap[corner]
    # build at tl then rotate
    tmp=sp(W,H); td=D(tmp)
    # horizontal segment into left
    td.rectangle([0,3,9,H-4],fill=shad,outline=ink)
    td.rectangle([0,3,8,H-5],fill=c)
    td.rectangle([1,4,7,5],fill=hi)
    # vertical segment going up
    td.rectangle([3,0,H-4,9],fill=shad,outline=ink)
    td.rectangle([3,0,H-5,8],fill=c)
    td.rectangle([4,1,5,7],fill=hi)
    # corner fill
    td.rectangle([3,3,9,9],fill=c,outline=ink)
    td.rectangle([4,4,8,8],fill=hi)
    result=tmp.rotate(-rot,expand=False)
    return result

def make_tail(tier=1,direction="right"):
    """Tapered tail end."""
    img=sp(W,H); d=D(img); ink=P["ink"]
    c,hi,shad,belly,scale=snake_colors(tier)
    # pointed tail facing right
    pts=[(W-1,H//2),(4,4),(2,3),(0,4),(0,H-5),(2,H-4),(4,H-5)]
    pl(d,pts,shad,ink)
    pts2=[(W-2,H//2),(5,5),(3,4),(1,5),(1,H-6),(3,H-5),(5,H-6)]
    pl(d,pts2,c)
    d.line([(3,6),(W-3,H//2-1)],fill=hi,width=1)
    rotmap={"right":0,"down":270,"left":180,"up":90}
    return img.rotate(rotmap[direction],expand=False)

# ── SNAKE HEADS ───────────────────────────────────────────────────────────────

def make_head(tier=1, direction="right"):
    img=sp(W,H); d=D(img); ink=P["ink"]
    c,hi,shad,belly,scale=snake_colors(tier)
    eye_c  = P["s1_eye"] if tier==1 else (P["s2_eye"] if tier==2 else P["s3_eye"])
    tongue = P["s1_tongue"]

    # head body — rounded rect facing right
    rr(d,1,2,W-2,H-3,3,shad,ink,1)
    rr(d,1,2,W-3,H-4,3,c,ink,1)
    # forehead highlight
    rr(d,2,3,10,7,2,hi)
    # belly underside
    d.rectangle([2,H-5,W-4,H-4],fill=belly)

    # eye
    ex = W-5
    el(d,ex-1,4,ex+3,8,P["s1_eye_w"],ink,1)
    el(d,ex,5,ex+2,7,eye_c)
    d.ellipse([ex+1,5,ex+2,6],fill=(255,255,255,160))  # shine

    # nostril
    d.ellipse([W-3,H-6,W-2,H-5],fill=shad)

    # tongue (forked)
    d.line([(W-1,H//2),(W+2,H//2)],fill=tongue,width=1)
    d.line([(W+2,H//2),(W+4,H//2-1)],fill=tongue,width=1)
    d.line([(W+2,H//2),(W+4,H//2+1)],fill=tongue,width=1)

    # tier 2: add horn nubs
    if tier==2:
        pl(d,[(5,2),(7,2),(6,0)],P["s2_horn"],ink)
        pl(d,[(9,2),(11,2),(10,0)],P["s2_horn"],ink)

    # tier 3: add spines + bigger eye
    if tier==3:
        for sp_x in [3,6,9,12]:
            pl(d,[(sp_x,2),(sp_x+2,2),(sp_x+1,0)],P["s3_spine"])
        d.rectangle([2,H-4,W-3,H-3],fill=P["s3_spine"])  # underbelly fire stripe

    rotmap={"right":0,"down":270,"left":180,"up":90}
    return img.rotate(rotmap[direction],expand=False)

# ── Layout row 0 (y=4): Tier 1 heads ─────────────────────────────────────────
for i,drn in enumerate(["right","down","left","up"]):
    place(f"head_t1_{drn}", make_head(1,drn), 4+i*18, 4)

# body pieces
place("body_h_t1", make_body_h(1),  76, 4)
place("body_v_t1", make_body_v(1),  96, 4)

# corners
for i,cn in enumerate(["tl","tr","br","bl"]):
    place(f"corner_{cn}_t1", make_corner(1,cn), 116+i*18, 4)

# tails
for i,drn in enumerate(["right","down","left","up"]):
    place(f"tail_t1_{drn}", make_tail(1,drn), 4+i*18, 24)

# ── Layout row 1 (y=44): Tier 2 heads ────────────────────────────────────────
for i,drn in enumerate(["right","down","left","up"]):
    place(f"head_t2_{drn}", make_head(2,drn), 4+i*18, 44)

place("body_h_t2", make_body_h(2), 76, 44)
place("body_v_t2", make_body_v(2), 96, 44)
for i,cn in enumerate(["tl","tr","br","bl"]):
    place(f"corner_{cn}_t2", make_corner(2,cn), 116+i*18, 44)
for i,drn in enumerate(["right","down","left","up"]):
    place(f"tail_t2_{drn}", make_tail(2,drn), 4+i*18, 64)

# ── Layout row 2 (y=84): Tier 3 heads ────────────────────────────────────────
for i,drn in enumerate(["right","down","left","up"]):
    place(f"head_t3_{drn}", make_head(3,drn), 4+i*18, 84)

place("body_h_t3", make_body_h(3), 76, 84)
place("body_v_t3", make_body_v(3), 96, 84)
for i,cn in enumerate(["tl","tr","br","bl"]):
    place(f"corner_{cn}_t3", make_corner(3,cn), 116+i*18, 84)
for i,drn in enumerate(["right","down","left","up"]):
    place(f"tail_t3_{drn}", make_tail(3,drn), 4+i*18, 104)

# ══════════════════════════════════════════════════════════════════════════════
# FOOD ITEMS — 14×14
# ══════════════════════════════════════════════════════════════════════════════
FW = 14

def make_apple():
    img=sp(FW,FW); d=D(img); ink=P["ink"]
    # body
    el(d,1,3,FW-2,FW-1,P["apple_rd"],ink,1)
    el(d,1,2,FW-3,FW-2,P["apple_r"],ink,1)
    # highlight
    el(d,3,3,7,7,P["apple_rh"])
    d.arc([3,3,6,6],start=210,end=320,fill=P["apple_s"],width=1)
    # leaf
    pl(d,[(FW//2-1,1),(FW//2+1,1),(FW//2+3,0),(FW//2+2,3),(FW//2-2,3)],
       P["apple_g"],ink)
    # stem
    d.line([(FW//2,2),(FW//2,0)],fill=P["apple_s"],width=1)
    return img

def make_golden_apple():
    img=sp(FW,FW); d=D(img); ink=P["ink"]
    el(d,1,3,FW-2,FW-1,P["gold_shad"],ink,1)
    el(d,1,2,FW-3,FW-2,P["gold_apple"],ink,1)
    el(d,3,3,7,7,P["gold_hi"])
    d.arc([3,3,6,6],start=210,end=320,fill=(255,255,255),width=1)
    pl(d,[(FW//2-1,1),(FW//2+3,0),(FW//2+2,3),(FW//2-2,3)],P["apple_g"],ink)
    # gold star
    pts=spts(FW//2,FW//2+1,3,1,n=5)
    pl(d,pts,(200,140,0))
    return img

def make_cherry():
    img=sp(FW,FW); d=D(img); ink=P["ink"]
    # two cherries
    el(d,1,5,6,FW-1, P["cherry_s"],ink,1)
    el(d,1,4,5,FW-2, P["cherry_r"],ink,1)
    el(d,2,5,4,7,P["cherry_rh"])
    el(d,7,5,FW-2,FW-1,P["cherry_s"],ink,1)
    el(d,7,4,FW-3,FW-2,P["cherry_r"],ink,1)
    el(d,8,5,10,7,P["cherry_rh"])
    # stems
    d.line([(3,4),(5,2),(9,2),(11,4)],fill=P["cherry_st"],width=1)
    return img

def make_strawberry():
    img=sp(FW,FW); d=D(img); ink=P["ink"]
    pts=[(FW//2,FW-2),(1,5),(3,2),(FW-3,2),(FW-1,5)]
    pl(d,pts,P["straw_r"],ink,1)
    # highlight
    pl(d,[(FW//2-1,4),(FW//2+1,4),(FW//2-1,8)],P["straw_h"])
    # seeds
    for sx,sy in [(4,6),(7,5),(10,7),(5,9),(9,9)]:
        d.ellipse([sx,sy,sx+1,sy+1],fill=P["straw_seed"])
    # leaves
    for lx in [4,FW//2,FW-4]:
        pl(d,[(lx,3),(lx+1,0),(lx+2,3)],P["straw_g"],ink)
    return img

def make_bonus_orb():
    img=sp(FW,FW); d=D(img); ink=P["ink"]
    # glow ring
    el(d,0,0,FW-1,FW-1,(*P["orb_glow"][:3],80))
    el(d,1,1,FW-2,FW-2,P["orb_c"],ink,1)
    el(d,2,2,FW-4,FW-4,P["orb_hi"])
    # inner star
    pts=spts(FW//2,FW//2,4,2,n=5)
    pl(d,pts,(255,255,255,200))
    d.arc([4,4,9,9],start=210,end=320,fill=(255,255,255),width=1)
    return img

place("apple",       make_apple(),        4,  124)
place("golden_apple",make_golden_apple(), 22, 124)
place("cherry",      make_cherry(),       40, 124)
place("strawberry",  make_strawberry(),   58, 124)
place("bonus_orb",   make_bonus_orb(),    76, 124)

# ══════════════════════════════════════════════════════════════════════════════
# POWER-UPS — 16×16
# ══════════════════════════════════════════════════════════════════════════════

def make_pu_ghost():
    """Ghost trail power-up — snake becomes semi-transparent."""
    img=sp(W,H); d=D(img); ink=P["ink"]
    # ghost shape (Pac-Man style)
    d.ellipse([2,1,W-3,9],fill=P["ghost_c"],outline=ink)
    d.rectangle([2,5,W-3,H-2],fill=P["ghost_c"],outline=ink)
    # scalloped bottom
    for gx in [2,6,10]:
        d.ellipse([gx,H-4,gx+3,H-1],fill=P["ui_bg"])
    # eyes
    el(d,4,3,7,7,  P["s1_eye_w"])
    el(d,9,3,12,7, P["s1_eye_w"])
    d.ellipse([5,4,7,6],fill=P["ghost_c"])
    d.ellipse([10,4,12,6],fill=P["ghost_c"])
    # shine
    d.rectangle([3,2,W-4,3],fill=P["ghost_hi"])
    return img

def make_pu_magnet():
    """Horseshoe magnet — pulls food toward snake."""
    img=sp(W,H); d=D(img); ink=P["ink"]
    # left arm
    d.rectangle([2,2,5,12],fill=P["mag_r"],outline=ink)
    d.rectangle([3,3,4,8], fill=P["mag_rh"])
    # right arm
    d.rectangle([10,2,13,12],fill=P["mag_b"],outline=ink)
    d.rectangle([11,3,12,8],fill=P["mag_bh"])
    # bridge
    d.rectangle([2,2,13,6],fill=P["mag_r"],outline=ink)
    d.rectangle([3,3,12,5],fill=P["mag_rh"])
    # silver poles
    rr(d,2,11,5,15,2,P["mag_p"],ink,1)
    rr(d,10,11,13,15,2,P["mag_p"],ink,1)
    # field arcs
    d.arc([4,4,11,11],start=200,end=340,fill=P["ptcl_y"],width=1)
    return img

def make_pu_speed():
    """Lightning bolt — speed burst."""
    img=sp(W,H); d=D(img); ink=P["ink"]
    el(d,0,0,W-1,H-1,(*P["spd_shad"][:3],60))
    el(d,1,1,W-2,H-2,P["spd_shad"],ink,1)
    el(d,1,1,W-2,H-2,P["spd_y"],ink,1)
    el(d,2,2,8,8,P["spd_hi"])
    # bolt
    pl(d,[(10,2),(7,8),(10,8),(6,14),(9,14),(13,7),(10,7),(13,2)],
       ink,ink)
    pl(d,[(10,3),(8,8),(11,8),(7,13),(9,13),(12,7),(9,7),(12,3)],
       (255,255,200))
    return img

def make_pu_shield():
    """Shield bubble."""
    img=sp(W,H); d=D(img); ink=P["ink"]
    el(d,0,0,W-1,H-1,(*P["shld_c"][:3],50))
    el(d,1,1,W-2,H-2,P["shld_shad"],ink,1)
    el(d,1,1,W-2,H-2,P["shld_c"],ink,1)
    el(d,2,2,8,8,P["shld_hi"])
    # shield symbol
    pl(d,[(8,3),(5,5),(5,10),(8,13),(11,10),(11,5)],
       (200,240,255,180),ink,1)
    d.arc([6,6,10,10],start=210,end=320,fill=(255,255,255),width=1)
    return img

place("pu_ghost",  make_pu_ghost(),  4,  144)
place("pu_magnet", make_pu_magnet(), 24, 144)
place("pu_speed",  make_pu_speed(),  44, 144)
place("pu_shield", make_pu_shield(), 64, 144)

# ══════════════════════════════════════════════════════════════════════════════
# BIOME TILES — 16×16 each
# ══════════════════════════════════════════════════════════════════════════════

# ── LAB ───────────────────────────────────────────────────────────────────────
def make_lab_wall():
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["lab_w"])
    d.rectangle([1,1,W-2,H-2],fill=P["lab_wh"],outline=P["lab_ws"])
    # rivets
    for rx,ry in [(2,2),(W-4,2),(2,H-4),(W-4,H-4)]:
        el(d,rx,ry,rx+2,ry+2,P["lab_ws"])
        d.ellipse([rx,ry,rx+1,ry+1],fill=P["lab_rivet"])
    return img

def make_lab_floor():
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["lab_f"])
    d.rectangle([0,0,W-1,1],fill=P["lab_fh"])
    d.rectangle([0,H-2,W-1,H-1],fill=P["lab_fs"])
    d.line([(W//2,0),(W//2,H-1)],fill=P["lab_fs"],width=1)
    d.line([(0,H//2),(W-1,H//2)],fill=P["lab_fs"],width=1)
    d.rectangle([1,1,2,2],fill=P["lab_fh"])
    d.rectangle([W-3,1,W-2,2],fill=P["lab_fh"])
    return img

def make_lab_deco():
    """Control panel deco tile."""
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["lab_panel"])
    rr(d,2,2,W-3,H-3,2,P["lab_w"],P["lab_ws"],1)
    # LED dots
    for lx,lc in [(4,P["lab_led_g"]),(8,P["lab_led_r"]),(12,P["lab_led_g"])]:
        el(d,lx,6,lx+2,8,lc)
        el(d,lx,6,lx+1,7,(255,255,255,160))
    d.rectangle([3,10,W-4,12],fill=P["lab_rivet"])
    return img

# ── JUNGLE ────────────────────────────────────────────────────────────────────
def make_jng_wall():
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["jng_w"])
    # bark lines
    for bx in range(0,W,4):
        d.line([(bx,0),(bx+1,H-1)],fill=P["jng_ws"],width=1)
    # leaf cluster
    for lx,ly in [(2,1),(8,0),(12,2),(5,3)]:
        el(d,lx,ly,lx+4,ly+4,P["jng_leaf"])
        el(d,lx+1,ly+1,lx+3,ly+3,P["jng_leaf2"])
    return img

def make_jng_floor():
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["jng_f"])
    d.rectangle([0,0,W-1,2],fill=P["jng_fh"])
    # roots
    for rx in [2,7,12]:
        d.line([(rx,2),(rx+1,H-2)],fill=P["jng_root"],width=1)
    # grass tufts
    for gx in [1,6,11]:
        d.line([(gx,0),(gx,2)],fill=P["jng_leaf"],width=1)
        d.line([(gx+2,0),(gx+1,3)],fill=P["jng_leaf"],width=1)
    return img

def make_jng_deco():
    """Flower / mushroom deco."""
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["jng_f"])
    # mushroom
    el(d,4,2,12,9,P["apple_r"],P["ink"],1)
    el(d,5,3,9,6,P["apple_rh"])
    for dx in [6,10]:
        el(d,dx,4,dx+2,6,(255,255,255,180))
    d.rectangle([7,8,9,H-2],fill=P["jng_root"],outline=P["ink"])
    # flower
    el(d,2,10,5,13,P["jng_flower"])
    el(d,3,11,4,12,(255,255,200))
    return img

# ── SPACE ──────────────────────────────────────────────────────────────────────
def make_spc_wall():
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["spc_w"])
    # nebula hint
    d.rectangle([0,0,W-1,H-1],fill=(*P["spc_nebula"][:3],30))
    # stars
    for sx,sy in [(2,2),(6,5),(12,1),(14,9),(3,12),(10,14),(8,7)]:
        d.point([(sx,sy)],fill=P["spc_star"])
    # star with cross
    for sx,sy in [(5,10),(13,4)]:
        d.point([(sx,sy)],fill=P["spc_star2"])
        d.line([(sx-1,sy),(sx+1,sy)],fill=(*P["spc_star2"][:3],120),width=1)
        d.line([(sx,sy-1),(sx,sy+1)],fill=(*P["spc_star2"][:3],120),width=1)
    return img

def make_spc_floor():
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["spc_f"])
    d.rectangle([0,0,W-1,1],fill=P["spc_fh"])
    # grid lines
    d.line([(W//2,0),(W//2,H-1)],fill=P["spc_ws"],width=1)
    d.line([(0,H//2),(W-1,H//2)],fill=P["spc_ws"],width=1)
    # blue tint corner dots
    for cx,cy in [(1,1),(W-3,1),(1,H-3),(W-3,H-3)]:
        d.ellipse([cx,cy,cx+1,cy+1],fill=P["spc_star2"])
    return img

def make_spc_deco():
    """Planet/asteroid deco."""
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["spc_w"])
    # planet
    el(d,3,3,13,13,P["spc_planet"],P["spc_ws"],1)
    el(d,4,4,8,8,(*P["spc_wh"][:3],180))
    # ring
    d.arc([1,6,15,10],start=0,end=180,fill=P["spc_star2"],width=1)
    d.ellipse([3,3,5,5],fill=P["spc_star"])
    return img

# ── LAVA ──────────────────────────────────────────────────────────────────────
def make_lav_wall():
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["lav_w"])
    # rock texture
    for rx,ry in [(1,1),(5,4),(10,2),(3,9),(12,7),(7,12)]:
        d.rectangle([rx,ry,rx+3,ry+2],fill=P["lav_rock"])
    # lava crack
    d.line([(2,0),(4,4),(3,8),(5,12),(4,16)],fill=P["lav_crack"],width=1)
    d.line([(3,0),(5,4),(4,8),(6,12),(5,16)],fill=P["lav_lavh"],width=1)
    return img

def make_lav_floor():
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["lav_f"])
    # lava pools
    for lx,lw in [(1,5),(8,4),(13,2)]:
        d.rectangle([lx,H-4,lx+lw,H-1],fill=P["lav_lava"])
        d.rectangle([lx+1,H-4,lx+lw-1,H-3],fill=P["lav_lavh"])
    d.rectangle([0,0,W-1,1],fill=P["lav_fh"])
    return img

def make_lav_deco():
    """Fire/ember deco."""
    img=sp(W,H); d=D(img)
    d.rectangle([0,0,W-1,H-1],fill=P["lav_f"])
    # fire flame
    pl(d,[(8,14),(5,9),(4,6),(6,3),(8,7),(10,3),(12,6),(11,9),(11,14)],
       P["lav_lava"],P["ink"],1)
    pl(d,[(8,13),(6,9),(6,6),(8,8),(10,6),(10,9),(10,13)],P["lav_lavh"])
    pl(d,[(8,11),(7,9),(8,7),(9,9)],P["s1_eye_w"])
    return img

# Place biome tiles — row by row from y=168
biome_tiles = [
    ("lab_wall",make_lab_wall()), ("lab_floor",make_lab_floor()), ("lab_deco",make_lab_deco()),
    ("jng_wall",make_jng_wall()), ("jng_floor",make_jng_floor()), ("jng_deco",make_jng_deco()),
    ("spc_wall",make_spc_wall()), ("spc_floor",make_spc_floor()), ("spc_deco",make_spc_deco()),
    ("lav_wall",make_lav_wall()), ("lav_floor",make_lav_floor()), ("lav_deco",make_lav_deco()),
]
for i,(name,img) in enumerate(biome_tiles):
    place(name, img, 4+i*18, 168)

# ══════════════════════════════════════════════════════════════════════════════
# PARTICLES — 8×8
# ══════════════════════════════════════════════════════════════════════════════
PW=8

def make_particle(col1,col2):
    img=sp(PW,PW); d=D(img)
    pl(d,[(4,0),(6,3),(8,4),(6,6),(4,8),(2,6),(0,4),(2,3)],col1)
    el(d,2,2,6,6,col2)
    return img

place("ptcl_eat",   make_particle(P["ptcl_y"], P["ptcl_w"]),  4, 192)
place("ptcl_spark", make_particle(P["ptcl_g"], P["ptcl_y"]), 16, 192)
place("ptcl_glow",  make_particle(P["orb_glow"],P["orb_hi"]),28, 192)

# ══════════════════════════════════════════════════════════════════════════════
# UI ELEMENTS
# ══════════════════════════════════════════════════════════════════════════════

# ── HUD bar  240×28 ───────────────────────────────────────────────────────────
def make_hud():
    W2,H2=240,28; img=sp(W2,H2); d=D(img)
    d.rectangle([0,0,W2-1,H2-1],fill=(*P["ui_bg"][:3],220))
    d.rectangle([0,0,W2-1,1],fill=P["ui_border"])
    d.rectangle([0,H2-2,W2-1,H2-1],fill=P["ui_border2"])
    # Score box
    rr(d,2,3,70,H2-4,3,P["ui_panel"],P["ui_border2"],1)
    # Length/distance box
    rr(d,74,3,160,H2-4,3,P["ui_panel"],P["ui_border2"],1)
    # biome badge box
    rr(d,164,3,W2-20,H2-4,3,P["ui_panel"],P["ui_border2"],1)
    # pause icon
    rr(d,W2-18,3,W2-3,H2-4,3,P["ui_panel"],P["ui_border2"],1)
    d.rectangle([W2-15,7,W2-13,H2-8],fill=P["ui_text"])
    d.rectangle([W2-11,7,W2-9,H2-8],fill=P["ui_text"])
    # apple icon stub
    el(d,5,7,11,13,P["apple_r"],P["ink"],1)
    return img

place("hud", make_hud(), 4, 208)

# ── Game over panel  200×96 ───────────────────────────────────────────────────
def make_gameover():
    W2,H2=200,96; img=sp(W2,H2); d=D(img)
    rr(d,2,2,W2-3,H2-3,10,P["ui_bg"],P["ui_border"],3)
    rr(d,4,4,W2-5,H2-5,8,P["ui_panel"])
    rr(d,4,4,W2-5,20,7,P["ui_red"])
    d.rectangle([4,16,W2-5,20],fill=P["ui_red"])
    # score area
    rr(d,10,24,W2-11,50,4,P["ui_bg"],P["ui_border2"],1)
    # best area
    rr(d,10,54,W2-11,75,4,P["ui_bg"],P["ui_gold"],1)
    # retry btn
    rr(d,28,80,W2-29,H2-8,5,P["ui_green"],P["ink"],2)
    # stars
    for sx,sy in [(12,H2-16),(W2-14,H2-16),(W2//2,6)]:
        pts=spts(sx,sy,7,3,n=5)
        pl(d,pts,P["ui_gold"],P["ink"],1)
    return img

place("gameover", make_gameover(), 4, 240)

# ── Score popup  56×18 ────────────────────────────────────────────────────────
def make_score_popup():
    W2,H2=56,18; img=sp(W2,H2); d=D(img)
    rr(d,0,0,W2-1,H2-1,4,P["ui_panel"],P["ui_gold"],2)
    rr(d,1,1,W2-2,8,3,(*P["ui_gold"][:3],60))
    return img

place("score_popup", make_score_popup(), 4, 344)

# ── Biome transition banner  200×24 ───────────────────────────────────────────
def make_biome_banner(color):
    W2,H2=200,24; img=sp(W2,H2); d=D(img)
    rr(d,0,0,W2-1,H2-1,6,(*P["ui_bg"][:3],220),color,2)
    rr(d,2,2,W2-3,H2-3,5,(*color[:3],40))
    d.rectangle([2,H2-4,W2-3,H2-3],fill=color)
    return img

place("banner_lab", make_biome_banner(P["badge_lab"]), 4,  366)
place("banner_jng", make_biome_banner(P["badge_jng"]), 4,  394)
place("banner_spc", make_biome_banner(P["badge_spc"]), 4,  422)
place("banner_lav", make_biome_banner(P["badge_lav"]), 4,  450)

# ── Level-up flash  200×28 ────────────────────────────────────────────────────
def make_levelup():
    W2,H2=200,28; img=sp(W2,H2); d=D(img)
    rr(d,0,0,W2-1,H2-1,6,(*P["ui_gold"][:3],230),P["ui_gold"],2)
    rr(d,1,1,W2-2,H2//2,5,(*[255,255,255][:3],40))
    # star bursts
    for sx in [14,W2-14]:
        pts=spts(sx,H2//2,10,4,n=8)
        pl(d,pts,P["ui_gold"],P["ink"],1)
    return img

place("levelup", make_levelup(), 4, 482)

# ── Menu panel  200×120 ───────────────────────────────────────────────────────
def make_menu():
    W2,H2=200,120; img=sp(W2,H2); d=D(img)
    rr(d,2,2,W2-3,H2-3,10,P["ui_bg"],P["ui_border"],3)
    rr(d,4,4,W2-5,H2-5,8,P["ui_panel"])
    # title bar
    rr(d,4,4,W2-5,32,7,P["s1"])
    d.rectangle([4,28,W2-5,32],fill=P["s1"])
    # snake icon in title
    for sx in range(20,W2-20,12):
        d.rectangle([sx,14,sx+8,20],fill=P["s1_hi"],outline=P["ink"])
    # head
    rr(d,W2-42,12,W2-22,22,3,P["s1_hi"],P["ink"],1)
    el(d,W2-32,14,W2-28,18,P["s1_eye_w"])
    # play button
    rr(d,30,42,W2-31,62,5,P["ui_green"],P["ink"],2)
    rr(d,32,43,W2-60,60,4,(*P["ui_green"][:3],160))
    # best score box
    rr(d,10,70,W2-11,90,4,P["ui_bg"],P["ui_gold"],1)
    # biome selector dots
    for i,col in enumerate([P["badge_lab"],P["badge_jng"],P["badge_spc"],P["badge_lav"]]):
        cx=50+i*28
        el(d,cx-6,98,cx+6,110,P["ui_panel"],col,2)
        el(d,cx-4,100,cx+4,108,col)
    return img

place("menu", make_menu(), 4, 514)

# ══════════════════════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════════════════════
OUT_PNG   = "/mnt/user-data/outputs/snake_sprites.png"
OUT_ATLAS = "/mnt/user-data/outputs/snake_atlas.json"

sheet.save(OUT_PNG, "PNG")

atlas_json = {
    "meta": {
        "image":   "snake_sprites.png",
        "size":    {"w": SHEET_W, "h": SHEET_H},
        "scale":   1, "format": "RGBA",
        "target":  "KaiOS 2.4-inch 240×320",
        "engine":  "Phaser CE",
        "grid":    "16×16 tiles",
        "biomes":  ["lab","jungle","space","lava"],
        "tiers":   3
    },
    "frames": {
        name: {
            "frame":            {"x":v["x"],"y":v["y"],"w":v["w"],"h":v["h"]},
            "rotated":          False, "trimmed": False,
            "spriteSourceSize": {"x":0,"y":0,"w":v["w"],"h":v["h"]},
            "sourceSize":       {"w":v["w"],"h":v["h"]}
        }
        for name,v in atlas.items()
    }
}

with open(OUT_ATLAS,"w") as f:
    json.dump(atlas_json, f, indent=2)

print(f"✓  Sprite sheet  →  {OUT_PNG}  ({SHEET_W}×{SHEET_H})")
print(f"✓  Atlas JSON    →  {OUT_ATLAS}  ({len(atlas)} sprites)")
print()
for name,v in atlas.items():
    print(f"   {name:<28}  {v['w']:>4}×{v['h']:<4}  @({v['x']},{v['y']})")
