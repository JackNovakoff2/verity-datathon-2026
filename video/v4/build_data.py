"""Construit data.js : timings par scène (mots ElevenLabs, phrases, lignes de sous-titres karaoké). Scène = lead + audio + tail."""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
script = json.load(open(os.path.join(here, "script.json")))
LEAD = 0.5; TAIL = {"m8_fin": 4.2, "m4_solution": 1.2, "m2_hook": 1.0, "d6_recul": 0.8}
ORDER = ["m0_avert", "m2_hook", "m3_clients", "m4_solution", "d1_plateforme", "d2_mandat", "d3_recus", "d4_temps", "d5_gouverneur", "d6_recul", "d7_triche", "d8_autres", "m4b_valeur", "m5_agents", "m6_aws", "m7_limites", "m8_fin"]
T = {}
for sid in ORDER:
    if sid == "m0_avert":
        T[sid] = {"dur": 4.6, "lead": 0, "words": [], "sents": [], "chunks": [], "text": ""}; continue
    d = json.load(open(os.path.join(here, "audio", sid + ".json")))
    words = [{"w": w["w"], "s": round(w["s"] + LEAD, 3), "e": round(w["e"] + LEAD, 3)} for w in d["words"]]
    sents, i0 = [], 0
    for i, w in enumerate(words):
        if re.search(r"[.?!]$", w["w"].rstrip("»\"")) or i == len(words) - 1:
            sents.append({"i0": i0, "i1": i, "s": words[i0]["s"], "e": w["e"]}); i0 = i + 1
    chunks, cur, n = [], [], 0
    for i, w in enumerate(words):
        if cur and (n + 1 + len(w["w"]) > 44 or (n > 22 and re.search(r"[,:;.?!]$", words[i - 1]["w"]))):
            chunks.append(cur); cur, n = [], 0
        cur.append(i); n += len(w["w"]) + 1
    if cur: chunks.append(cur)
    ch = [{"i0": c[0], "i1": c[-1]} for c in chunks]
    dur = round(LEAD + d["dur"] + TAIL.get(sid, 0.9), 3)
    T[sid] = {"dur": dur, "lead": LEAD, "adur": d["dur"], "words": words, "sents": sents, "chunks": ch}
open(os.path.join(here, "data.js"), "w").write("window.ORDER=%s;\nwindow.TIMING=%s;\n" % (json.dumps(ORDER), json.dumps(T, ensure_ascii=False)))
json.dump(T, open(os.path.join(here, "timing.json"), "w"), ensure_ascii=False)
tot = 0
for sid in ORDER: tot += T[sid]["dur"]; print(sid, T[sid]["dur"], len(T[sid]["sents"]), "phr")
print("total", round(tot, 1), "s")
