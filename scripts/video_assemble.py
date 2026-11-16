"""Montage : scène vidéo (work/<id>.mp4, silencieuse) + sous-titres (PNG) + narration (décalée de 0,3 s) -> out/Verity_demo.mp4/.srt/poster.png.
Les scènes manquantes (démo, phase 2) rendent le résultat partiel : sortie nommée Verity_demo_partiel.mp4."""
import json, os, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(root, "video"); OUT = os.path.join(V, "out"); WORK = os.path.join(V, "work"); os.makedirs(OUT, exist_ok=True)
script = json.load(open(os.path.join(V, "script.json"))); T = json.load(open(os.path.join(V, "motion", "timing.json")))
subs = json.load(open(os.path.join(V, "frames", "_subs", "index.json")))
FPS = 30
def run(cmd): subprocess.run(cmd, check=True)
def ts(x): h, r = divmod(x, 3600); m, s = divmod(r, 60); return "%02d:%02d:%06.3f" % (h, m, s)
parts, srt, off, n = [], [], 0.0, 1
missing = []
for sc in script:
    sid = sc["id"]; v = os.path.join(WORK, sid + ".mp4")
    if not os.path.exists(v): missing.append(sid); continue
    d = T[sid]["dur"]; seg = os.path.join(WORK, sid + "_final.mp4")
    ins = ["-i", v, "-i", os.path.join(V, "audio", sid + ".mp3")]; flt = []; last = "0:v"
    for i, s in enumerate(T[sid]["sentences"]):
        ins += ["-loop", "1", "-framerate", str(FPS), "-i", subs[sid][i]]
        end = min(s["end"], d - 0.22)
        flt.append(f"[{last}][{i + 2}:v]overlay=0:780:enable='between(t,{s['start']:.3f},{end:.3f})':shortest=0[o{i}]"); last = f"o{i}"
        srt.append(f"{n}\n{ts(off + s['start'])} --> {ts(off + end)}\n{s['text']}\n"); n += 1
    flt.append(f"[1:a]adelay={int(T[sid]['lead'] * 1000)}|{int(T[sid]['lead'] * 1000)},apad=whole_dur={d}[a]")
    run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", ";".join(flt), "-map", f"[{last}]", "-map", "[a]", "-t", str(d),
         "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", seg])
    parts.append(seg); off += d
lst = os.path.join(WORK, "list.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
name = "Verity_demo" if not missing else "Verity_demo_partiel"
tmp = os.path.join(WORK, "concat.mp4"); run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", tmp])
mp4 = os.path.join(OUT, name + ".mp4")
run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", mp4])
open(os.path.join(OUT, name + ".srt"), "w").write("\n".join(srt))
run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "8", "-i", os.path.join(WORK, "s03_solution_final.mp4"), "-frames:v", "1", os.path.join(OUT, "poster.png")]) if os.path.exists(os.path.join(WORK, "s03_solution_final.mp4")) else None
print(name, round(off, 1), "s", "manquantes:", missing, os.path.getsize(mp4) // 1024, "Ko")
