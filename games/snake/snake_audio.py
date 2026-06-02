"""
SNAKE EVOLVED — KaiOS Complete Audio Suite
Pure Python + numpy synthesis. No external audio libs.

SFX  (9):  eat, eat_bonus, eat_golden, powerup, death,
           levelup, biome_change, ui_click, wall_buzz
MUSIC (6): menu, lab, jungle, space, lava, gameover
"""

import wave, math, os
import numpy as np

OUT = "/mnt/user-data/outputs/snake_audio"
os.makedirs(OUT, exist_ok=True)

SR   = 22050
MAX  = 32767

def save(fname, samples):
    samples = np.clip(samples, -1.0, 1.0)
    data    = (samples * MAX).astype(np.int16)
    path    = os.path.join(OUT, fname)
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2)
        w.setframerate(SR); w.writeframes(data.tobytes())
    kb = os.path.getsize(path)//1024
    print(f"  ✓  {fname:<30}  {len(samples)/SR:.2f}s  {kb}KB")

def t(dur):   return np.linspace(0,dur,int(SR*dur),endpoint=False)
def sine(f,dur,a=1.0):   return a*np.sin(2*np.pi*f*t(dur))
def sq(f,dur,a=1.0,duty=0.5):
    return a*np.where((t(dur)*f%1)<duty, 1.0, -1.0)
def tri(f,dur,a=1.0):    return a*(2*np.abs(2*(t(dur)*f%1)-1)-1)
def saw(f,dur,a=1.0):    return a*(2*(t(dur)*f%1)-1)
def noise(dur,a=1.0):    return a*(np.random.rand(int(SR*dur))*2-1)
def silence(dur):        return np.zeros(int(SR*dur))

def env(s, A=0.01, D=0.05, SL=0.7, R=0.1):
    N=len(s); a=int(A*SR); d=int(D*SR); r=int(R*SR)
    su=max(0,N-a-d-r)
    e=np.concatenate([np.linspace(0,1,a),np.linspace(1,SL,d),
                      np.full(su,SL),np.linspace(SL,0,r)])
    e=e[:N]
    if len(e)<N: e=np.pad(e,(0,N-len(e)))
    return s*e

def fade_in(s,dur=0.02):
    n=min(int(dur*SR),len(s)); s=s.copy(); s[:n]*=np.linspace(0,1,n); return s
def fade_out(s,dur=0.05):
    n=min(int(dur*SR),len(s)); s=s.copy(); s[-n:]*=np.linspace(1,0,n); return s

def mix(*args, w=None):
    L=max(len(a) for a in args)
    wt=w or [1/len(args)]*len(args)
    out=np.zeros(L)
    for arr,ww in zip(args,wt):
        out+=np.pad(arr,(0,L-len(arr)))*ww
    return out

def cat(*args): return np.concatenate(args)

def slide(f0,f1,dur,a=1.0):
    freq=np.linspace(f0,f1,int(SR*dur))
    phase=np.cumsum(2*np.pi*freq/SR)
    return a*np.sin(phase)

def lpf(s,cut=2000):
    rc=1/(2*np.pi*cut); dt=1/SR; al=dt/(rc+dt)
    out=np.zeros_like(s); out[0]=s[0]
    for i in range(1,len(s)): out[i]=out[i-1]+al*(s[i]-out[i-1])
    return out

def hpf(s,cut=60):
    rc=1/(2*np.pi*cut); dt=1/SR; al=rc/(rc+dt)
    out=np.zeros_like(s); out[0]=s[0]
    for i in range(1,len(s)): out[i]=al*(out[i-1]+s[i]-s[i-1])
    return out

def reverb(s,delay=0.05,decay=0.4,n=3):
    out=s.copy()
    for i in range(1,n+1):
        d=int(delay*i*SR)
        pad=np.pad(s,(d,0))[:len(s)]
        out+=pad*(decay**i)
    return out/(1+sum(decay**i for i in range(1,n+1)))

BPM=132; BEAT=60/BPM; BAR=BEAT*4

def note(f,dur,wv="sq",a=0.5,duty=0.3):
    if wv=="sq":  s=sq(f,dur,a,duty)
    elif wv=="tri":s=tri(f,dur,a)
    elif wv=="saw":s=saw(f,dur,a)
    else:          s=sine(f,dur,a)
    return env(s,A=0.01,D=0.05,SL=0.8,R=0.06)

def bass_note(f,dur,a=0.7):
    s=mix(sine(f,dur,a),saw(f,dur,a*0.4),w=[0.6,0.4])
    return lpf(env(s,A=0.008,D=0.1,SL=0.7,R=0.1),600)

def render(parts, total):
    N=int(total*SR); out=np.zeros(N)
    for samp,ts in parts:
        idx=int(ts*SR); end=min(N,idx+len(samp))
        if 0<=idx<N: out[idx:end]+=samp[:end-idx]
    return out

def make_drums(bpm,bars,kick=True,snare=True,hat=True):
    dur=BAR*bars; N=int(dur*SR); out=np.zeros(N)
    bt=60/bpm; br=bt*4
    def put(s,ts,a=1.0):
        i=int(ts*SR); e=min(N,i+len(s))
        if i<N: out[i:e]+=s[:e-i]*a
    # kick
    kd=0.25
    k_body=env(slide(120,38,kd,0.9),A=0.002,D=0.1,SL=0.0,R=0.14)
    k_click=env(noise(0.02,0.5),A=0.001,D=0.015,SL=0.0,R=0.004)
    kick_s=mix(k_body,np.pad(k_click,(0,len(k_body)-len(k_click)))[:len(k_body)],
               w=[0.8,0.2])
    # snare
    sn_t=env(sine(200,0.18,0.5),A=0.002,D=0.06,SL=0.0,R=0.12)
    sn_n=env(lpf(noise(0.18,0.8),6000),A=0.001,D=0.04,SL=0.2,R=0.13)
    snare_s=mix(sn_t,sn_n,w=[0.35,0.65])
    # hat
    hat_s=env(lpf(noise(0.03,0.6),9000),A=0.001,D=0.01,SL=0.0,R=0.018)

    for bar in range(bars):
        b0=bar*br
        if kick:  put(kick_s,b0+0*bt); put(kick_s,b0+2*bt,0.9); put(kick_s,b0+3*bt,0.7)
        if snare: put(snare_s,b0+1*bt); put(snare_s,b0+3*bt)
        if hat:
            for step in range(8):
                put(hat_s,b0+step*bt/2, 0.5 if step%2==0 else 0.3)
    return out

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("  SNAKE EVOLVED — Audio Generator")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
print("SFX:")

# ── 1. Eat (satisfying crunch pop, 0.18s) ─────────────────────────────────────
def sfx_eat():
    pop=env(mix(sine(440,0.12,0.7),sine(660,0.10,0.4),w=[0.6,0.4]),
            A=0.003,D=0.03,SL=0.4,R=0.12)
    tick=env(noise(0.03,0.5),A=0.001,D=0.015,SL=0.0,R=0.014)
    tick=np.pad(tick,(0,len(pop)-len(tick)))[:len(pop)]
    return fade_out(mix(pop,tick,w=[0.7,0.3])*0.8, 0.04)
save("eat.wav", sfx_eat())

# ── 2. Eat golden (shimmer chime, 0.35s) ──────────────────────────────────────
def sfx_eat_golden():
    notes=[(880,0),(1108,0.06),(1318,0.12),(1760,0.18)]
    parts=[]
    for f,onset in notes:
        s=env(mix(sine(f,0.2,0.6),sine(f*2,0.15,0.2),w=[0.8,0.2]),
              A=0.005,D=0.04,SL=0.5,R=0.12)
        parts.append((s,onset))
    out=render(parts,0.35)
    return fade_out(reverb(out,0.04,0.3,2)*0.8,0.06)
save("eat_golden.wav", sfx_eat_golden())

# ── 3. Eat bonus orb (magical sparkle, 0.45s) ─────────────────────────────────
def sfx_eat_bonus():
    # ascending + sweeping sweep
    sweep=env(slide(300,1800,0.3,0.6),A=0.01,D=0.08,SL=0.5,R=0.18)
    shimmer=env(mix(sine(1200,0.3,0.3),sine(2400,0.25,0.2),w=[0.6,0.4]),
                A=0.02,D=0.05,SL=0.4,R=0.2)
    magic=noise(0.1,0.15)
    magic=lpf(magic,5000)
    magic=env(magic,A=0.01,D=0.05,SL=0.2,R=0.04)
    magic=np.pad(magic,(0,len(sweep)-len(magic)))[:len(sweep)]
    out=mix(sweep,shimmer,magic,w=[0.45,0.35,0.2])
    return fade_out(reverb(out,0.05,0.35,2)*0.82,0.08)
save("eat_bonus.wav", sfx_eat_bonus())

# ── 4. Power-up collect (ascending fanfare, 0.5s) ─────────────────────────────
def sfx_powerup():
    notes=[523.3,659.3,784.0,1046.5]
    parts=[]
    for i,f in enumerate(notes):
        s=env(mix(sq(f,0.18,0.6),sine(f*2,0.15,0.2),w=[0.7,0.3]),
              A=0.008,D=0.04,SL=0.6,R=0.1)
        parts.append((s,i*0.08))
    out=render(parts,0.5)
    return fade_out(reverb(out,0.04,0.3,2)*0.8,0.08)
save("powerup.wav", sfx_powerup())

# ── 5. Death (descending buzz crash, 0.8s) ────────────────────────────────────
def sfx_death():
    crash=env(slide(600,60,0.5,0.7),A=0.002,D=0.15,SL=0.3,R=0.3)
    crunch=env(mix(sq(180,0.3,0.5),noise(0.3,0.4),w=[0.5,0.5]),
               A=0.002,D=0.08,SL=0.2,R=0.2)
    crunch=np.pad(crunch,(int(0.04*SR),0))[:int(0.8*SR)]
    boom=env(lpf(noise(0.4,0.6),400),A=0.002,D=0.12,SL=0.2,R=0.26)
    boom=np.pad(boom,(0,int(0.8*SR)-len(boom)))
    out=mix(crash[:int(0.8*SR)],crunch,boom,w=[0.4,0.35,0.25])
    return fade_out(out*0.85,0.15)
save("death.wav", sfx_death())

# ── 6. Level up / tier change (triumphant sting, 0.7s) ────────────────────────
def sfx_levelup():
    # rising chord C-E-G-C then big chord
    notes=[(523.3,0),(659.3,0.08),(784.0,0.16),(1046.5,0.24)]
    parts=[]
    for f,onset in notes:
        s=env(mix(sq(f,0.25,0.6),tri(f,0.22,0.3),w=[0.65,0.35]),
              A=0.01,D=0.04,SL=0.7,R=0.15)
        parts.append((s,onset))
    # final chord
    for f in [523.3,659.3,784.0]:
        s=env(mix(sine(f,0.4,0.4),tri(f,0.38,0.25),w=[0.6,0.4]),
              A=0.015,D=0.06,SL=0.7,R=0.25)
        parts.append((s,0.36))
    out=render(parts,0.7)
    return fade_out(reverb(out,0.05,0.4,2)*0.82,0.1)
save("levelup.wav", sfx_levelup())

# ── 7. Biome change (whoosh + shimmer, 0.6s) ──────────────────────────────────
def sfx_biome_change():
    whoosh=env(lpf(noise(0.4,0.7),3000),A=0.02,D=0.05,SL=0.3,R=0.3)
    sweep=env(slide(200,2000,0.35,0.5),A=0.01,D=0.08,SL=0.4,R=0.22)
    chime=env(sine(1760,0.2,0.4),A=0.005,D=0.04,SL=0.3,R=0.15)
    chime=np.pad(chime,(int(0.28*SR),0))[:int(0.6*SR)]
    out=mix(whoosh,sweep[:int(0.6*SR)],chime,w=[0.3,0.5,0.2])
    return fade_out(out*0.78,0.08)
save("biome_change.wav", sfx_biome_change())

# ── 8. UI click (menu select, 0.1s) ───────────────────────────────────────────
def sfx_ui_click():
    s=env(mix(sine(1200,0.1,0.7),sq(600,0.08,0.3,0.4),w=[0.6,0.4]),
          A=0.002,D=0.015,SL=0.2,R=0.08)
    return s*0.7
save("ui_click.wav", sfx_ui_click())

# ── 9. Wall/self collision buzz (danger, 0.25s) ────────────────────────────────
def sfx_wall_buzz():
    buzz=env(mix(sq(160,0.2,0.6,0.3),noise(0.2,0.3),w=[0.6,0.4]),
             A=0.002,D=0.05,SL=0.4,R=0.18)
    T=t(0.2); lfo=np.abs(np.sin(2*np.pi*40*T))
    buzz=buzz*lfo
    return fade_out(buzz*0.75,0.05)
save("wall_buzz.wav", sfx_wall_buzz())

# ══════════════════════════════════════════════════════════════════════════════
# MUSIC TRACKS
# ══════════════════════════════════════════════════════════════════════════════
print("\nMUSIC:")

# ── Menu — Catchy upbeat pop, 8 bars ──────────────────────────────────────────
def music_menu():
    print("    Composing menu theme ...")
    BPM2=128; bt=60/BPM2; br=bt*4; bars=8; dur=br*bars

    MEL=[(523.3,bt*0.75,0*bt),(659.3,bt*0.75,1*bt),(784.0,bt*0.5,2*bt),
         (659.3,bt*0.5,2.5*bt),(523.3,bt*0.75,3*bt),(440.0,bt*0.75,4*bt),
         (523.3,bt*0.5,5*bt),(587.3,bt*0.5,5.5*bt),(659.3,bt*1.5,6*bt),
         (784.0,bt*0.5,7*bt),(659.3,bt*0.75,7.5*bt),
         (880.0,bt*0.75,8*bt),(784.0,bt*0.5,9*bt),(698.5,bt*0.5,9.5*bt),
         (784.0,bt*0.75,10*bt),(659.3,bt*1.0,11*bt),(523.3,bt*0.5,12*bt),
         (493.9,bt*0.75,13*bt),(523.3,bt*1.5,14*bt)]
    MEL2=[(f,d,o+br*4) for f,d,o in MEL]
    mel=render([(note(f,d,"sq",0.55),o) for f,d,o in MEL+MEL2],dur)
    harm=render([(note(f*0.794,d*0.9,"tri",0.28),o+0.02) for f,d,o in MEL+MEL2],dur)

    BASS_F=[130.8,110.0,87.3,98.0,130.8,110.0,87.3,98.0]
    bp=[]
    for bar,bf in enumerate(BASS_F):
        for b in range(4): bp.append((bass_note(bf,bt*0.7),bar*br+b*bt))
    bass=render(bp,dur)

    arp_parts=[]
    chords=[[261.6,329.6,392.0],[220.0,261.6,329.6],[174.6,220.0,261.6],[196.0,246.9,294.3]]
    for rep in range(2):
        for ci,chord in enumerate(chords):
            for step in range(8):
                f=chord[step%3]
                s=note(f,bt*0.45,"tri",0.22)
                arp_parts.append((s,(rep*4+ci)*br+step*bt/2))
    arp=render(arp_parts,dur)

    drum=make_drums(BPM2,bars)[:int(dur*SR)]
    out=mix(mel,harm,bass,arp,drum,w=[0.28,0.15,0.24,0.13,0.20])
    return fade_out(lpf(hpf(out,40),7000)*0.82,0.3)

save("music_menu.wav", music_menu())

# ── Lab — Industrial techno, punchy 8 bars ────────────────────────────────────
def music_lab():
    print("    Composing Lab theme ...")
    BPM2=140; bt=60/BPM2; br=bt*4; bars=8; dur=br*bars

    MEL_LAB=[(392.0,bt*0.5,0*bt),(392.0,bt*0.25,0.5*bt),(440.0,bt*0.5,0.75*bt),
             (392.0,bt*0.5,1.5*bt),(349.2,bt*0.5,2*bt),(392.0,bt*1.0,2.5*bt),
             (392.0,bt*0.5,4*bt),(440.0,bt*0.5,4.5*bt),(466.2,bt*0.5,5*bt),
             (440.0,bt*0.5,5.5*bt),(392.0,bt*1.5,6*bt)]
    MEL2=[(f,d,o+br*4) for f,d,o in MEL_LAB]
    mel=render([(note(f,d,"sq",0.58,0.35),o) for f,d,o in MEL_LAB+MEL2],dur)

    BASS_LAB=[98.0,87.3,98.0,110.0]*2
    bp=[]
    for bar,bf in enumerate(BASS_LAB):
        for b in range(8):
            amp=1.0 if b%2==0 else 0.6
            bp.append((bass_note(bf*(2 if b%4==3 else 1),bt*0.4)*amp, bar*br+b*bt/2))
    bass=render(bp,dur)

    # industrial stabs
    stab_parts=[]
    for bar in range(bars):
        for step in [1,2.5,3]:
            f=196.0 if bar%2==0 else 185.0
            s=env(sq(f,bt*0.15,0.5,0.3),A=0.003,D=0.04,SL=0.3,R=0.1)
            stab_parts.append((s,bar*br+step*bt))
    stab=render(stab_parts,dur)

    drum=make_drums(BPM2,bars)[:int(dur*SR)]
    out=mix(mel,bass,stab,drum,w=[0.28,0.26,0.16,0.30])
    return fade_out(lpf(hpf(out,50),7000)*0.80,0.25)

save("music_lab.wav", music_lab())

# ── Jungle — Tropical bouncy groove, 8 bars ───────────────────────────────────
def music_jungle():
    print("    Composing Jungle theme ...")
    BPM2=124; bt=60/BPM2; br=bt*4; bars=8; dur=br*bars

    MEL_JNG=[(523.3,bt*0.5,0*bt),(659.3,bt*0.5,0.5*bt),(784.0,bt*0.75,1*bt),
             (698.5,bt*0.25,1.75*bt),(659.3,bt*0.5,2*bt),(587.3,bt*0.5,2.5*bt),
             (523.3,bt*0.75,3*bt),(493.9,bt*0.25,3.75*bt),
             (523.3,bt*0.5,4*bt),(659.3,bt*0.5,4.5*bt),(784.0,bt*0.5,5*bt),
             (880.0,bt*0.75,5.5*bt),(784.0,bt*0.5,6.5*bt),(659.3,bt*1.5,7*bt)]
    MEL2=[(f,d,o+br*4) for f,d,o in MEL_JNG]
    mel=render([(note(f,d,"tri",0.55),o) for f,d,o in MEL_JNG+MEL2],dur)

    # calypso bass — bouncy 8ths
    BASS_JNG=[130.8,130.8,110.0,110.0,87.3,87.3,98.0,98.0]
    bp=[]
    for bar,bf in enumerate(BASS_JNG):
        for b in range(8):
            amp=0.9 if b%2==0 else 0.55
            bp.append((bass_note(bf,bt*0.35)*amp, bar*br+b*bt/2))
    bass=render(bp,dur)

    # percussive pluck melody (marimba-ish)
    pluck_parts=[]
    for f,d,o in MEL_JNG+MEL2:
        s=env(mix(sine(f,d,0.4),sine(f*3,d*0.5,0.15),w=[0.75,0.25]),
              A=0.002,D=0.04,SL=0.3,R=0.2)
        pluck_parts.append((s,o+0.01))
    pluck=render(pluck_parts,dur)

    drum=make_drums(BPM2,bars,kick=True,snare=True,hat=True)[:int(dur*SR)]
    # extra shaker
    shaker=np.zeros(int(dur*SR))
    for bar in range(bars):
        for step in range(16):
            idx=int((bar*br+step*bt/4)*SR)
            if idx<len(shaker):
                s=env(lpf(noise(0.02,0.25),8000),A=0.001,D=0.008,SL=0.0,R=0.01)
                end=min(len(shaker),idx+len(s))
                shaker[idx:end]+=s[:end-idx]

    out=mix(mel,bass,pluck,drum,shaker,w=[0.26,0.22,0.16,0.24,0.12])
    return fade_out(lpf(hpf(out,40),7000)*0.80,0.3)

save("music_jungle.wav", music_jungle())

# ── Space — Ambient synth electronica, 8 bars ─────────────────────────────────
def music_space():
    print("    Composing Space theme ...")
    BPM2=110; bt=60/BPM2; br=bt*4; bars=8; dur=br*bars

    # ethereal pad chords
    CHORDS_SPC=[
        ([146.8,185.0,220.0,277.2],0*br),
        ([130.8,164.8,196.0,246.9],1*br),
        ([110.0,138.6,164.8,207.7],2*br),
        ([123.5,155.6,185.0,233.1],3*br),
    ]*2
    pad_parts=[]
    for chord_fs,onset in CHORDS_SPC:
        for cf in chord_fs:
            s=env(mix(sine(f,br*0.95,0.3),tri(f,br*0.9,0.2),
                      sine(f*2,br*0.85,0.1),w=[0.55,0.3,0.15]),
                  A=0.18,D=0.1,SL=0.75,R=0.5)
            pad_parts.append((s,onset))
    pad=render(pad_parts,dur)
    pad=reverb(pad,0.12,0.5,4)

    # arpeggiated lead
    arp_seq=[(220.0,bt*0.4),(277.2,bt*0.4),(329.6,bt*0.4),(440.0,bt*0.4),
             (329.6,bt*0.4),(277.2,bt*0.4),(220.0,bt*0.8),(185.0,bt*0.4)]
    arp_parts=[]
    for rep in range(bars*4//len(arp_seq)+1):
        for step,(f,d) in enumerate(arp_seq):
            onset=rep*len(arp_seq)*bt*0.4+step*bt*0.4
            if onset<dur:
                s=env(mix(sine(f,d,0.4),sine(f*2,d*0.8,0.15),w=[0.75,0.25]),
                      A=0.01,D=0.04,SL=0.55,R=0.2)
                arp_parts.append((s,onset))
    arp=render(arp_parts,dur)

    # bass pulse
    BASS_SPC=[73.4,65.4,55.0,61.7]*2
    bp=[]
    for bar,bf in enumerate(BASS_SPC):
        for b in [0,1.5,2,3]:
            bp.append((bass_note(bf,bt*0.6,0.65),bar*br+b*bt))
    bass=render(bp,dur)

    # no kick, subtle electronic drums
    drum=make_drums(BPM2,bars,kick=False,snare=True,hat=True)[:int(dur*SR)]*0.6

    # space noise atmosphere
    atmos=lpf(noise(dur,0.08),800)
    T=t(dur); lfo=0.04*np.sin(2*np.pi*0.25*T)
    atmos=atmos*(1+lfo)

    out=mix(pad,arp,bass,drum,atmos,w=[0.30,0.25,0.20,0.15,0.10])
    return fade_out(hpf(out,30)*0.78,0.4)

save("music_space.wav", music_space())

# ── Lava — Heavy metal-ish intense, 8 bars ────────────────────────────────────
def music_lava():
    print("    Composing Lava theme ...")
    BPM2=152; bt=60/BPM2; br=bt*4; bars=8; dur=br*bars

    MEL_LAV=[(220.0,bt*0.33,0*bt),(220.0,bt*0.33,0.33*bt),
             (261.6,bt*0.33,0.66*bt),(220.0,bt*0.5,1*bt),
             (196.0,bt*0.5,1.5*bt),(174.6,bt*0.5,2*bt),
             (185.0,bt*1.0,2.5*bt),(196.0,bt*0.5,3.5*bt),
             (220.0,bt*0.33,4*bt),(246.9,bt*0.33,4.33*bt),
             (261.6,bt*0.33,4.66*bt),(293.7,bt*0.75,5*bt),
             (261.6,bt*0.25,5.75*bt),(246.9,bt*0.5,6*bt),
             (220.0,bt*1.5,6.5*bt)]
    MEL2=[(f,d,o+br*4) for f,d,o in MEL_LAV]
    mel=render([(note(f,d,"saw",0.55),o) for f,d,o in MEL_LAV+MEL2],dur)

    # heavy low bass riff
    BASS_LAV=[55.0,55.0,65.4,55.0,49.0,55.0,55.0,58.3]
    bp=[]
    for bar,bf in enumerate(BASS_LAV):
        for b in range(8):
            amp=1.0 if b%2==0 else 0.7
            s=env(mix(saw(bf,bt*0.35,0.7),saw(bf*2,bt*0.3,0.25),w=[0.7,0.3]),
                  A=0.005,D=0.08,SL=0.6,R=0.08)
            bp.append((s*amp, bar*br+b*bt/2))
    bass=render(bp,dur)
    bass=lpf(bass,500)

    # power chords (distorted sq)
    pchord_parts=[]
    for bar in range(bars):
        for step,f in [(0,220.0),(2,196.0),(2.5,185.0),(3,196.0)]:
            for mult in [1,1.5,2]:
                s=env(sq(f*mult,bt*0.25,0.4,0.48),A=0.003,D=0.05,SL=0.5,R=0.12)
                pchord_parts.append((s,bar*br+step*bt))
    pchords=render(pchord_parts,dur)

    # fast drums
    drum=make_drums(BPM2,bars)[:int(dur*SR)]

    out=mix(mel,bass,pchords,drum,w=[0.24,0.26,0.20,0.30])
    return fade_out(lpf(hpf(out,50),8000)*0.78,0.25)

save("music_lava.wav", music_lava())

# ── Game Over — Sad minor descent, 3.5s ───────────────────────────────────────
def music_gameover():
    dur=3.5
    _br=60/132*4
    chords=[([220.0,261.6,329.6],0*_br),
            ([185.0,220.0,277.2],1*_br*0.7),
            ([174.6,207.7,261.6],2*_br*0.7),
            ([164.8,196.0,246.9],3*_br*0.7)]
    parts=[]
    for chord_fs,onset in chords:
        for cf in chord_fs:
            s=env(mix(sine(cf,_br*0.65,0.35),tri(cf,_br*0.6,0.25),w=[0.6,0.4]),
                  A=0.04,D=0.12,SL=0.55,R=0.4)
            parts.append((s,onset))
    SAD_MEL=[(440.0,0.456,0.0),(392.0,0.456,0.456),
             (349.2,0.456,0.912),(329.6,0.912,1.368),
             (293.7,0.456,2.28),(261.6,0.456,2.736),
             (220.0,1.52,3.192)]
    parts+=[(note(f,d,"tri",0.45),o) for f,d,o in SAD_MEL]
    out=render(parts,dur)
    out=reverb(out,0.08,0.5,3)
    return fade_out(lpf(out,4000)*0.76,0.6)

save("music_gameover.wav", music_gameover())

# ── Manifest ──────────────────────────────────────────────────────────────────
import json
manifest={
    "game":"Snake Evolved — KaiOS",
    "format":"WAV 22050Hz 16-bit Mono",
    "phaser_ce_load":[
        "game.load.audio('" + f.replace('.wav','') + "', 'snake_audio/" + f + "');"
        for f in sorted(os.listdir(OUT)) if f.endswith(".wav")
    ]
}
with open(os.path.join(OUT,"audio_manifest.json"),"w") as f:
    json.dump(manifest,f,indent=2)
print(f"\n  ✓  audio_manifest.json")

files=[f for f in os.listdir(OUT) if f.endswith(".wav")]
total=sum(os.path.getsize(os.path.join(OUT,f)) for f in files)//1024
print(f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(f"  {len(files)} WAV files  |  {total} KB total")
print(f"  Output → {OUT}/")
print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
