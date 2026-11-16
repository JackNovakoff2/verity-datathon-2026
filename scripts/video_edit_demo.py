"""Montage des scènes de démo : video/work/<id>_raw.webm + <id>_marks.json -> video/work/<id>.mp4 (1920x1080, 30 i/s, silencieux, durée exacte de la scène).
Chaque scène = liste de segments (repère_début, repère_fin, vitesse, cadrage) ; cadrage = (cx, cy, zoom) en pixels de l'enregistrement ;
le zoom glisse en douceur (0,6 s) depuis le cadrage précédent. Si la somme est plus courte que la scène, la dernière image est prolongée.
Image intégrée dans un cadre (80 %) pour laisser la bande basse aux sous-titres. Transitions identiques aux scènes motion (essuie-glace ardoise + liseré rouge)."""
import json, os, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(root, "video"); WORK = os.path.join(V, "work")
T = json.load(open(os.path.join(V, "motion", "timing.json")))
FULL = (960, 540, 1.0)

def sh(cmd): subprocess.run(cmd, check=True)

def seg_filter(v0, v1, ramp=0.6):
    e = f"(1-pow(1-min(on/30/{ramp},1),3))"
    Z = f"({v0[2]}+({v1[2]}-{v0[2]})*{e})"
    CX = f"({v0[0]}+({v1[0]}-{v0[0]})*{e})"; CY = f"({v0[1]}+({v1[1]}-{v0[1]})*{e})"
    return (f"zoompan=z='{Z}':x='min(max({CX}-iw/zoom/2,0),iw-iw/zoom)':y='min(max({CY}-ih/zoom/2,0),ih-ih/zoom)':d=1:s=1536x864:fps=30")

def wipe_filters(D):
    R, C = .26, .22
    p1 = f"(t/{R})"; e1 = f"({p1}*{p1}*(3-2*{p1}))"
    p2 = f"((t-{D - C})/{C})"; e2 = f"({p2}*{p2}*(3-2*{p2}))"
    return (f"drawbox=x='{e1}*1920':y=0:w='1920-{e1}*1920':h=1080:color=0x365e7e:t=fill:enable='lt(t,{R})',"
            f"drawbox=x='{e1}*1920':y=0:w=18:h=1080:color=0xc40023:t=fill:enable='lt(t,{R})',"
            f"drawbox=x=0:y=0:w='{e2}*1920':h=1080:color=0x365e7e:t=fill:enable='gt(t,{D - C})',"
            f"drawbox=x='{e2}*1920-18':y=0:w=18:h=1080:color=0xc40023:t=fill:enable='gt(t,{D - C})'")

MARKS = {  # repères d'enregistrement alignés sur le début de chaque phrase de narration (len = phrases + 1, le dernier = fin)
 "s04b_plateforme": ["start", "go", "open", "end"],
 "s05_mandat": ["start", "go", "rules", "build", "end"],
 "s06_recus": ["start", "story", "go", "open", "scroll", "end"],
 "s07_temps": ["start", "drag", "moved", "story", "end"],
 "s08_gouverneur": ["start", "ask", "compare", "viol", "story", "counter", "end"],
 "s09_recul": ["start", "story", "end"],
 "s10_contexte": ["start", "mateo", "end"],
 "s11_triche": ["start", "open", "submit", "end"],
}
VIEWS = {}

def build(sid):
    """Chaque phrase de narration = une tranche de l'enregistrement, étirée/accélérée pour durer exactement la phrase : l'image montre ce que la voix décrit."""
    D = T[sid]["dur"]; m = json.load(open(os.path.join(WORK, sid + "_marks.json"))); raw = os.path.join(WORK, sid + "_raw.webm")
    S = T[sid]["sentences"]; bounds = [0.0] + [s["start"] for s in S[1:]] + [D]
    marks = MARKS[sid]; assert len(marks) == len(S) + 1, (sid, len(marks), len(S))
    segs = []; prev = FULL
    for i in range(len(S)):
        a, b = m[marks[i]], m[marks[i + 1]]; slot = bounds[i + 1] - bounds[i]; view = VIEWS.get(sid, {}).get(i, FULL)
        sp = (b - a) / slot; sp = min(max(sp, 0.9), 6.0)
        if (b - a) / sp > slot + .05: print("  ATTENTION", sid, "phrase", i, "trop courte", round((b - a) / sp, 2), ">", round(slot, 2))
        out = os.path.join(WORK, f"{sid}_seg{i}.mp4")
        sh(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(a), "-t", str(b - a), "-i", raw,
            "-vf", f"setpts=(PTS-STARTPTS)/{sp},fps=30," + seg_filter(prev, view, 0.6) + f",tpad=stop_mode=clone:stop_duration={slot},trim=duration={slot:.3f},setpts=PTS-STARTPTS",
            "-an", "-c:v", "libx264", "-crf", "15", "-preset", "fast", "-pix_fmt", "yuv420p", "-r", "30", out])
        print(sid, i, marks[i], "->", marks[i + 1], "raw", round(b - a, 2), "slot", round(slot, 2), "vitesse", round(sp, 2))
        segs.append(out); prev = view
    lst = os.path.join(WORK, sid + "_segs.txt"); open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
    cat = os.path.join(WORK, sid + "_cat.mp4"); sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", cat])
    out = os.path.join(WORK, sid + ".mp4")
    sh(["ffmpeg", "-y", "-loglevel", "error", "-i", cat, "-vf", f"tpad=stop_mode=clone:stop_duration=1,trim=duration={D},setpts=PTS-STARTPTS,pad=1920:1080:192:16:color=0xeef4f7,drawbox=x=190:y=14:w=1540:h=868:color=0xc2d1db:t=2," + wipe_filters(D),
        "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "30", out])
    print("ok", out)

if __name__ == "__main__":
    for sid in (sys.argv[1:] or list(MARKS)): build(sid)
