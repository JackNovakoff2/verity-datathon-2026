"""Montage v4.
  compose.py demo <scene>...   : rushes d'écran calés phrase par phrase + fenêtre arrondie sur papier + sous-titres karaoké -> out/<scene>.mp4
  compose.py audio             : ajoute la voix (décalée du lead) à chaque scène -> out/<scene>_av.mp4
  compose.py final             : concatène + nappe musicale -> final/Verity_demo.mp4 (+ .srt)"""
import glob, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter
here = os.path.dirname(os.path.abspath(__file__)); V = os.path.dirname(here); WORK = os.path.join(V, "work"); OUT = os.path.join(here, "out"); FR = os.path.join(here, "frames")
os.makedirs(OUT, exist_ok=True); os.makedirs(os.path.join(here, "final"), exist_ok=True)
T = json.load(open(os.path.join(here, "timing.json"))); ORDER = json.loads(open(os.path.join(here, "data.js")).read().split("\n")[0].split("=", 1)[1].rstrip(";"))
FADE = 0.25; WX, WY, WW, WH = 160, 40, 1600, 900
DEMO = {  # scène v4 -> (rush v3, repères alignés sur le début de chaque phrase de narration)
    "d1_plateforme": ("s04b_plateforme", ["start", "go", "open", "end"]),
    "d2_mandat": ("s05_mandat", ["start", "go", "rules", "build", "end"]),
    "d3_recus": ("s06_recus", ["start", "story", "go", "open", "scroll", "end"]),
    "d4_temps": ("s07_temps", ["start", "drag", "moved", "story", "end"]),
    "d5_gouverneur": ("s08_gouverneur", ["start", "ask", "compare", "viol", "story", "counter", "end"]),
    "d6_recul": ("s09_recul", ["start", "story", "end"]),
    "d7_triche": ("s11_triche", ["start", "open", "submit", "end"]),
    "d8_autres": ("s10_contexte", ["start", "mateo", "end"]),
}
def sh(c): subprocess.run(c, check=True)

def assets():
    bgp = os.path.join(here, "demo_bg.png"); mp = os.path.join(here, "demo_mask.png")
    if os.path.exists(bgp) and os.path.exists(mp): return bgp, mp
    bg = Image.new("RGB", (1920, 1080), "#f4f2f0"); sh_ = Image.new("L", (1920, 1080), 0); d = ImageDraw.Draw(sh_)
    d.rounded_rectangle((WX, WY + 14, WX + WW, WY + WH + 14), 26, fill=70); sh_ = sh_.filter(ImageFilter.GaussianBlur(26))
    bg.paste(Image.new("RGB", (1920, 1080), "#3a2f2a"), (0, 0), sh_); d2 = ImageDraw.Draw(bg)
    d2.rounded_rectangle((WX - 2, WY - 2, WX + WW + 2, WY + WH + 2), 22, outline="#d9d4cf", width=3); bg.save(bgp)
    m = Image.new("L", (WW, WH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, WW - 1, WH - 1), 20, fill=255); m.save(mp); return bgp, mp

def demo(sid):
    rush, marks = DEMO[sid]; m = json.load(open(os.path.join(WORK, rush + "_marks.json"))); raw = os.path.join(WORK, rush + "_raw.webm")
    D = T[sid]["dur"]; S = T[sid]["sents"]; assert len(marks) == len(S) + 1, (sid, len(marks), len(S))
    bounds = [0.0] + [s["s"] - .15 for s in S[1:]] + [D]; segs = []
    for i in range(len(S)):
        a, b = m[marks[i]], m[marks[i + 1]]; slot = bounds[i + 1] - bounds[i]; sp = min(max((b - a) / slot, .9), 6.0)
        o = os.path.join(here, "work_" + sid + f"_{i}.mp4")
        sh(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(a), "-t", str(b - a), "-i", raw, "-vf",
            f"setpts=(PTS-STARTPTS)/{sp},fps=30,scale={WW}:{WH}:flags=lanczos,tpad=stop_mode=clone:stop_duration={slot},trim=duration={slot:.3f},setpts=PTS-STARTPTS",
            "-an", "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-pix_fmt", "yuv420p", "-r", "30", o])
        print(sid, i, marks[i], "->", marks[i + 1], "raw", round(b - a, 2), "slot", round(slot, 2), "x", round(sp, 2)); segs.append(o)
    lst = os.path.join(here, "work_" + sid + ".txt"); open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
    cat = os.path.join(here, "work_" + sid + "_cat.mp4"); sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", cat])
    bgp, mp = assets(); sub = os.path.join(FR, sid + "_sub", "%05d.png"); out = os.path.join(OUT, sid + ".mp4")
    fl = (f"[1:v]fps=30,format=yuva420p[c];[2:v]format=gray[mk];[c][mk]alphamerge[cm];[0:v][cm]overlay={WX}:{WY}:shortest=1[b];[b][3:v]overlay=0:0:shortest=1[o];"
          f"[o]trim=duration={D},setpts=PTS-STARTPTS,fade=t=in:st=0:d={FADE},fade=t=out:st={D - FADE:.3f}:d={FADE}[v]")
    sh(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", bgp, "-i", cat, "-loop", "1", "-framerate", "30", "-i", mp, "-framerate", "30", "-i", sub, "-filter_complex", fl, "-map", "[v]",
        "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", "-t", str(D), out]); print("ok", out)

def fade_motion(sid):   # fondu d'entrée/sortie sur les scènes motion
    src = os.path.join(OUT, sid + ".mp4"); D = T[sid]["dur"]; dst = os.path.join(OUT, sid + "_f.mp4")
    ent = 0.0 if sid == "m0_avert" else FADE
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", f"fade=t=in:st=0:d={max(ent, .01)}:alpha=0,fade=t=out:st={D - FADE:.3f}:d={FADE}", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", dst])
    return dst

def audio(sid):
    v = os.path.join(OUT, sid + ".mp4") if sid in DEMO else fade_motion(sid); D = T[sid]["dur"]; out = os.path.join(OUT, sid + "_av.mp4"); mp3 = os.path.join(here, "audio", sid + ".mp3")
    if os.path.exists(mp3):
        lead = int(T[sid]["lead"] * 1000)
        sh(["ffmpeg", "-y", "-loglevel", "error", "-i", v, "-i", mp3, "-filter_complex", f"[1:a]aresample=48000,adelay={lead}|{lead},apad=whole_dur={D},atrim=duration={D}[a]", "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", str(D), out])
    else:
        sh(["ffmpeg", "-y", "-loglevel", "error", "-i", v, "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", str(D), out])
    print("av", out)

def pad(total):
    p = os.path.join(here, "final", "pad.wav")
    notes = [(110.0, .30), (164.81, .20), (220.0, .22), (277.18, .12), (329.63, .10)]
    ins = []; fl = []
    for i, (f, g) in enumerate(notes):
        ins += ["-f", "lavfi", "-i", f"sine=f={f}:d={total}:sample_rate=48000"]; fl.append(f"[{i}:a]volume={g},tremolo=f={0.1 + .04 * i}:d=.35[n{i}]")
    fl.append("".join(f"[n{i}]" for i in range(len(notes))) + f"amix=inputs={len(notes)},lowpass=f=900,aecho=0.8:0.7:420|700:0.35|0.25,afade=t=in:d=6,afade=t=out:st={total - 8}:d=8[p]")
    sh(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", ";".join(fl), "-map", "[p]", "-ac", "2", p]); return p

def final():
    parts = [os.path.join(OUT, s + "_av.mp4") for s in ORDER]; lst = os.path.join(here, "final", "list.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    cat = os.path.join(here, "final", "concat.mp4"); sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", cat])
    total = sum(T[s]["dur"] for s in ORDER); p = pad(total); out = os.path.join(here, "final", "Verity_demo.mp4")
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", cat, "-i", p, "-filter_complex", "[0:a]aformat=sample_rates=48000:channel_layouts=stereo[v];[1:a]volume=0.55[m];[v][m]amix=inputs=2:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[a]",
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out])
    # sous-titres .srt par phrase
    def ts(x): h, r = divmod(x, 3600); m, s = divmod(r, 60); return "%02d:%02d:%06.3f" % (h, m, s)
    off, n, srt = 0.0, 1, []
    for sid in ORDER:
        W_ = T[sid]["words"]
        for c in T[sid]["sents"]:
            srt.append(f"{n}\n{ts(off + c['s']).replace('.', ',')} --> {ts(off + c['e'] + .25).replace('.', ',')}\n{' '.join(w['w'] for w in W_[c['i0']:c['i1'] + 1])}\n"); n += 1
        off += T[sid]["dur"]
    open(os.path.join(here, "final", "Verity_demo.srt"), "w").write("\n".join(srt)); print("final", round(total, 1), "s", os.path.getsize(out) // 1024, "Ko")

if __name__ == "__main__":
    cmd, a = sys.argv[1], sys.argv[2:]
    if cmd == "demo": [demo(s) for s in (a or DEMO)]
    elif cmd == "audio": [audio(s) for s in (a or ORDER)]
    elif cmd == "final": final()
