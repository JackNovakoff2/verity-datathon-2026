"""Capture déterministe des scènes motion (video/motion/index.html, window.setT(t)) à 30 i/s.
Usage : video_render_motion.py render s01_probleme [...] [--workers N]
        video_render_motion.py still s04_architecture 3.0 12.5 ...   (images de contrôle dans video/frames/_still)
        video_render_motion.py subs  <scene> [...]   (PNG de sous-titres transparents)"""
import glob, json, os, subprocess, sys
from multiprocessing import Pool
os.environ.setdefault("LD_LIBRARY_PATH", "/home/rstudio/chromelibs/usr/lib/x86_64-linux-gnu")
os.environ.setdefault("PLAYWRIGHT_HOST_PLATFORM_OVERRIDE", "ubuntu24.04-x64")
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(root, "video"); FR = os.path.join(V, "frames"); WORK = os.path.join(V, "work")
FPS = 30
TIMING = json.load(open(os.path.join(V, "motion", "timing.json")))

def browser(p):
    exe = glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell"))[0]
    return p.chromium.launch(executable_path=exe, args=["--no-sandbox", "--allow-file-access-from-files", "--font-render-hinting=none"])

def page_for(p, sid, **q):
    b = browser(p); pg = b.new_page(viewport={"width": 1920, "height": 1080})
    url = "file://" + os.path.join(V, "motion", "index.html") + "?scene=" + sid + "".join(f"&{k}={v}" for k, v in q.items())
    pg.on("pageerror", lambda e: print("PAGEERROR", sid, e, file=sys.stderr))
    pg.on("console", lambda m: print("CONSOLE", sid, m.text, file=sys.stderr) if m.type == "error" else None)
    pg.goto(url); pg.wait_for_function("document.body.dataset.ready==='1'"); pg.wait_for_timeout(200)
    return b, pg

def work(job):
    sid, a, b_, opts = job
    from playwright.sync_api import sync_playwright
    d = os.path.join(FR, sid); os.makedirs(d, exist_ok=True)
    with sync_playwright() as p:
        br, pg = page_for(p, sid, **opts)
        for i in range(a, b_):
            pg.evaluate(f"window.setT({i / FPS})")
            pg.screenshot(path=os.path.join(d, f"{i:05d}.png"))
        br.close()
    return b_ - a

def render(ids, workers):
    jobs = []
    for sid in ids:
        n = int(round(TIMING[sid]["dur"] * FPS)); k = max(1, min(workers, n // 20))
        step = -(-n // k)
        os.makedirs(os.path.join(FR, sid), exist_ok=True)
        for f in glob.glob(os.path.join(FR, sid, "*.png")): os.remove(f)
        opts = {"in": 0 if sid == "s01_probleme" else 1, "out": 0 if sid == "s14_fin" else 1}
        jobs += [(sid, a, min(n, a + step), opts) for a in range(0, n, step)]
    with Pool(workers) as pool:
        pool.map(work, jobs, chunksize=1)
    os.makedirs(WORK, exist_ok=True)
    for sid in ids:
        out = os.path.join(WORK, sid + ".mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(FR, sid, "%05d.png"),
                        "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(FPS), out], check=True)
        print("ok", sid, out)

def still(sid, ts):
    from playwright.sync_api import sync_playwright
    d = os.path.join(FR, "_still"); os.makedirs(d, exist_ok=True)
    with sync_playwright() as p:
        opts = {"in": 0 if sid == "s01_probleme" else 1, "out": 0 if sid == "s14_fin" else 1}
        br, pg = page_for(p, sid, **opts)
        for t in ts:
            pg.evaluate(f"window.setT({t})"); f = os.path.join(d, f"{sid}_{t:06.2f}.png"); pg.screenshot(path=f); print(f)
        br.close()

def subs(ids):
    from playwright.sync_api import sync_playwright
    d = os.path.join(FR, "_subs"); os.makedirs(d, exist_ok=True)
    meta = {}
    with sync_playwright() as p:
        br = browser(p); pg = br.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto("file://" + os.path.join(V, "motion", "sub.html")); pg.wait_for_function("document.body.dataset.ready==='1'")
        for sid in ids:
            meta[sid] = []
            for i, s in enumerate(TIMING[sid]["sentences"]):
                pg.evaluate("t=>window.setSub(t)", s["text"]); f = os.path.join(d, f"{sid}_{i:02d}.png")
                pg.screenshot(path=f, omit_background=True, clip={"x": 0, "y": 780, "width": 1920, "height": 300})
                meta[sid].append(f)
        br.close()
    json.dump(meta, open(os.path.join(d, "index.json"), "w"), indent=1)

if __name__ == "__main__":
    cmd, args = sys.argv[1], sys.argv[2:]
    w = 24
    if "--workers" in args: i = args.index("--workers"); w = int(args[i + 1]); del args[i:i + 2]
    if cmd == "render": render(args, w)
    elif cmd == "still": still(args[0], [float(x) for x in args[1:]])
    elif cmd == "subs": subs(args)
