"""Calcule les repères temporels de narration (phrases, ponctuation) en s'appuyant sur les silences réels de
l'audio (ffmpeg silencedetect), répartis proportionnellement aux caractères entre deux silences.
Écrit video/motion/data.js (FACTS, TIMING, SCRIPT) lu par les pages de motion design."""
import json, os, re, subprocess
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(root, "video")
LEAD, TAIL = 0.30, 0.30
PAD = {"s01_probleme": 1.6, "s02_probleme2": 1.2, "s03_solution": 1.6, "s04_architecture": 2.0, "s04b_plateforme": 3.0, "s05_mandat": 2.0, "s06_recus": 5.0, "s07_temps": 3.0,
       "s08_gouverneur": 5.0, "s09_recul": 3.0, "s10_contexte": 2.0, "s11_triche": 5.0, "s12_preuves": 3.2, "s13_limites": 3.0, "s14_fin": 4.2}
script = json.load(open(os.path.join(V, "script.json")))
dur = json.load(open(os.path.join(V, "audio", "durations.json")))

def silences(path):
    err = subprocess.run(["ffmpeg", "-i", path, "-af", "silencedetect=noise=-38dB:d=0.10", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    s = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
    e = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    return list(zip(s, e + [None] * (len(s) - len(e))))

out = {}
for sc in script:
    sid, text = sc["id"], sc["text"]
    D = dur[sid]
    sil = silences(os.path.join(V, "audio", sid + ".mp3"))
    # début / fin de parole
    t0 = sil[0][1] if sil and sil[0][0] < 0.05 and sil[0][1] else 0.0
    t1 = sil[-1][0] if sil and sil[-1][1] is None else D
    mids = [(a + (b if b else D)) / 2 for a, b in sil if a > t0 + 0.05 and (b is not None) and b < t1 + 0.01]
    n = len(text)
    # points de rupture : après . , : ; ? !
    brk = [m.end() for m in re.finditer(r"[.,:;?!](?=\s)", text)]
    span = t1 - t0
    pred = {p: t0 + span * p / n for p in brk}
    anchors = [(0, t0)]
    used = set()
    for p in brk:
        c = [m for m in mids if abs(m - pred[p]) < 0.9 and m not in used]
        if c:
            m = min(c, key=lambda m: abs(m - pred[p])); used.add(m)
            if m > anchors[-1][1] + 0.05: anchors.append((p, m)); continue
    anchors.append((n, t1))
    def at(pos):
        for (p0, a), (p1, b) in zip(anchors, anchors[1:]):
            if pos <= p1:
                return LEAD + a + (b - a) * (pos - p0) / max(1, p1 - p0)
        return LEAD + t1
    # phrases d'affichage (sous-titres)
    sents = []
    for m in re.finditer(r"[^.?!]+[.?!]", text):
        s = m.group(0).strip(); a = m.start() + (len(m.group(0)) - len(m.group(0).lstrip()))
        parts = [(a, s)]
        if len(s) > 150:        # phrase très longue : coupée à la virgule/deux-points le plus proche du milieu
            cuts = [q.end() for q in re.finditer(r"[,:](?=\s)", s)]
            k = min(cuts, key=lambda q: abs(q - len(s) / 2))
            parts = [(a, s[:k].strip()), (a + k + 1, s[k:].strip())]
        for pa, ps in parts:
            sents.append({"text": ps, "start": at(pa), "end": at(pa + len(ps))})
    for i, s in enumerate(sents):        # les sous-titres restent affichés jusqu'à la phrase suivante
        s["end"] = sents[i + 1]["start"] - 0.02 if i + 1 < len(sents) else LEAD + t1 + 0.25
    total = round(LEAD + D + TAIL + PAD.get(sid, 0), 2)
    out[sid] = {"dur": total, "narr": D, "lead": LEAD, "speech_end": LEAD + t1, "text": text, "sentences": sents,
                "anchors": [{"pos": p, "t": LEAD + t} for p, t in anchors]}
tm = os.path.join(V, "motion")
facts = json.load(open(os.path.join(tm, "facts.json")))
open(os.path.join(tm, "data.js"), "w").write(
    "window.FACTS=%s;\nwindow.TIMING=%s;\nwindow.DEMO_URL=%s;\n" % (json.dumps(facts, ensure_ascii=False), json.dumps(out, ensure_ascii=False), json.dumps(open(os.path.join(V, "DEMO_URL.txt")).read().strip() if os.path.exists(os.path.join(V, "DEMO_URL.txt")) else "")))
json.dump(out, open(os.path.join(tm, "timing.json"), "w"), ensure_ascii=False, indent=1)
for k, v in out.items():
    print(k, v["dur"], [round(s["start"], 1) for s in v["sentences"]])
