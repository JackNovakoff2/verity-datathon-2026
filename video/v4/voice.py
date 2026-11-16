"""Voix ElevenLabs (eleven_v4, voix premade Sarah) avec alignement caractère -> mots. Usage: voice.py <id> [...]  Écrit audio/<id>.mp3 et audio/<id>.json (mots + temps)."""
import base64, json, os, re, subprocess, sys, urllib.request
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.abspath(os.path.join(here, "../../.."))
KEY = open(os.path.join(root, ".secrets/eleven2")).read().strip(); VOICE = "EXAVITQu4vr4xnSDxMaL"
script = {s["id"]: s["text"] for s in json.load(open(os.path.join(here, "script.json")))}
os.makedirs(os.path.join(here, "audio"), exist_ok=True)
for sid in sys.argv[1:]:
    text = script[sid]
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps({"text": text, "model_id": "eleven_v4", "language_code": "fr", "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.35, "speed": 1.0}}).encode(),
        headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=120))
    open(os.path.join(here, "audio", sid + ".mp3"), "wb").write(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]; ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur = [], None   # mots = suites de caractères non-espace ; les balises [..] sont ignorées à l'affichage
    for c, a, b in zip(ch, st, en):
        if c.isspace():
            if cur: words.append(cur); cur = None
        else:
            if cur is None: cur = {"w": "", "s": a, "e": b}
            cur["w"] += c; cur["e"] = b
    if cur: words.append(cur)
    out = []; intag = False
    for w in words:
        t = w["w"]
        if t.startswith("["): intag = True
        if not intag: out.append(w)
        if t.endswith("]"): intag = False
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(here, "audio", sid + ".mp3")]).decode())
    json.dump({"id": sid, "dur": dur, "words": out}, open(os.path.join(here, "audio", sid + ".json"), "w"), ensure_ascii=False)
    print(sid, round(dur, 2), "s", len(out), "mots", len(text), "car.")
