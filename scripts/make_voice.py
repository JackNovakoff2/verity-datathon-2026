"""Voix de la vidéo : Amazon Polly (moteur génératif, fr-CA). Écrit video/audio/<id>.mp3 et video/audio/durations.json."""
import json, os, subprocess, sys
import boto3
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
voice = os.environ.get("VOICE", "Gabrielle")
out = os.path.join(root, "video", "audio"); os.makedirs(out, exist_ok=True)
polly = boto3.client("polly", region_name="us-east-1")
script = json.load(open(os.path.join(root, "video", "script.json")))
dur = {}
for s in script:
    if len(sys.argv) > 1 and s["id"] not in sys.argv[1:]:
        continue
    ssml = "<speak>" + s["text"].replace("&", "et") + "</speak>"
    r = polly.synthesize_speech(Text=ssml, TextType="ssml", OutputFormat="mp3", VoiceId=voice, Engine="generative", LanguageCode="fr-CA", SampleRate="24000")
    p = os.path.join(out, s["id"] + ".mp3")
    open(p, "wb").write(r["AudioStream"].read())
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).decode())
    dur[s["id"]] = round(d, 2)
    print(s["id"], dur[s["id"]], "s")
dp = os.path.join(out, "durations.json")
old = json.load(open(dp)) if os.path.exists(dp) else {}
old.update(dur); json.dump(old, open(dp, "w"), indent=1)
print("total", round(sum(old.values()), 1), "s")
