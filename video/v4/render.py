"""Rendu v4. render.py still <scene> t1 t2 ... | render <scene>... [--overlay] [--workers N]
render : PNG 30 i/s dans frames/<scene>/ puis mp4 (scène motion) ; --overlay : sous-titres seuls en PNG transparents (scènes de démo)."""
import glob, json, os, subprocess, sys
os.environ.setdefault("LD_LIBRARY_PATH", "/home/rstudio/chromelibs/usr/lib/x86_64-linux-gnu"); os.environ.setdefault("PLAYWRIGHT_HOST_PLATFORM_OVERRIDE", "ubuntu24.04-x64")
from multiprocessing import Pool
here = os.path.dirname(os.path.abspath(__file__)); FR = os.path.join(here, "frames"); OUT = os.path.join(here, "out"); os.makedirs(OUT, exist_ok=True)
TIMING = json.load(open(os.path.join(here, "timing.json"))); FPS = 30
def browser(p):
    exe = glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell"))[0]
    return p.chromium.launch(executable_path=exe, args=["--no-sandbox", "--allow-file-access-from-files", "--font-render-hinting=none"])
def page(p, sid, overlay):
    b = browser(p); pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.on("pageerror", lambda e: print("PAGEERROR", sid, e, file=sys.stderr)); pg.on("console", lambda m: print("CONSOLE", sid, m.text, file=sys.stderr) if m.type == "error" else None)
    pg.goto("file://" + os.path.join(here, "index.html") + "?scene=" + sid + ("&overlay=1" if overlay else "")); pg.wait_for_function("document.body.dataset.ready==='1'", timeout=60000); return b, pg
def work(job):
    sid, a, b_, overlay = job; from playwright.sync_api import sync_playwright
    d = os.path.join(FR, sid + ("_sub" if overlay else "")); os.makedirs(d, exist_ok=True)
    with sync_playwright() as p:
        br, pg = page(p, sid, overlay)
        for i in range(a, b_):
            pg.evaluate(f"window.setT({i / FPS})"); pg.screenshot(path=os.path.join(d, f"{i:05d}.png"), omit_background=overlay)
        br.close()
    return b_ - a
def render(ids, workers, overlay):
    jobs = []
    for sid in ids:
        n = int(round(TIMING[sid]["dur"] * FPS)); k = max(1, min(workers, n // 15)); step = -(-n // k); d = os.path.join(FR, sid + ("_sub" if overlay else ""))
        os.makedirs(d, exist_ok=True); [os.remove(f) for f in glob.glob(d + "/*.png")]
        jobs += [(sid, a, min(n, a + step), overlay) for a in range(0, n, step)]
    with Pool(workers) as pool: pool.map(work, jobs, chunksize=1)
    if not overlay:
        for sid in ids:
            out = os.path.join(OUT, sid + ".mp4")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(FR, sid, "%05d.png"), "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(FPS), out], check=True); print("ok", out)
def still(sid, ts, overlay=False):
    from playwright.sync_api import sync_playwright
    d = os.path.join(FR, "_still"); os.makedirs(d, exist_ok=True)
    with sync_playwright() as p:
        br, pg = page(p, sid, overlay)
        for t in ts: pg.evaluate(f"window.setT({t})"); f = os.path.join(d, f"{sid}_{t:06.2f}.png"); pg.screenshot(path=f); print(f)
        br.close()
if __name__ == "__main__":
    cmd, args = sys.argv[1], sys.argv[2:]; w = 40
    if "--workers" in args: i = args.index("--workers"); w = int(args[i + 1]); del args[i:i + 2]
    ov = "--overlay" in args; args = [a for a in args if a != "--overlay"]
    if cmd == "render": render(args, w, ov)
    elif cmd == "still": still(args[0], [float(x) for x in args[1:]])
