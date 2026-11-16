"""Phase 2 — enregistrement de la vraie interface (scènes s05 à s11) sur l'URL AWS (video/DEMO_URL.txt), piloté par Playwright.
Usage : video_record_demo.py [--url URL] [scène ...]
Sortie : video/work/<id>_raw.webm (1920x1080, interface agrandie à 150 %) + video/work/<id>_marks.json (repères, en secondes de vidéo).
Le montage (accélérés, zooms, durée) est fait par video_edit_demo.py."""
import glob, json, os, sys, time
os.environ.setdefault("LD_LIBRARY_PATH", "/home/rstudio/chromelibs/usr/lib/x86_64-linux-gnu")
os.environ.setdefault("PLAYWRIGHT_HOST_PLATFORM_OVERRIDE", "ubuntu24.04-x64")
from playwright.sync_api import sync_playwright
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(root, "video"); WORK = os.path.join(V, "work")
ZOOM = 1.5
INIT = """
document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.zoom='%s';const st=document.createElement('style');st.textContent='.host-bar-preview{position:sticky;top:0;z-index:50}';document.head.appendChild(st);
const c=document.createElement('div');c.style.cssText='position:fixed;z-index:2147483647;left:0;top:0;width:40px;height:40px;pointer-events:none;filter:drop-shadow(0 2px 3px #0007);transform:translate(-100px,-100px)';
c.innerHTML='<svg viewBox="0 0 24 24" width="40" height="40"><path d="M3 2l7 19 3-8 8-3z" fill="#151719" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';document.body.appendChild(c);
const r=document.createElement('div');r.style.cssText='position:fixed;z-index:2147483646;width:60px;height:60px;border-radius:50%%;border:5px solid #c40023;pointer-events:none;opacity:0;left:0;top:0';document.body.appendChild(r);
const z=%s;document.addEventListener('mousemove',e=>{c.style.transform='translate('+(e.clientX/z)+'px,'+(e.clientY/z)+'px)'},true);
document.addEventListener('mousedown',e=>{r.style.left=(e.clientX/z-30)+'px';r.style.top=(e.clientY/z-30)+'px';r.animate([{transform:'scale(.4)',opacity:1},{transform:'scale(1.6)',opacity:0}],{duration:500})},true);});
""" % (ZOOM, ZOOM)
LAB = """
document.addEventListener('DOMContentLoaded',()=>{const zz=parseFloat(document.documentElement.style.zoom||1);const d=document.createElement('div');
d.style.cssText='position:fixed;z-index:2147483645;right:'+(24/zz)+'px;top:'+(78/zz)+'px;background:#c40023;color:#fff;font:700 '+(30/zz)+'px/1.2 system-ui,sans-serif;padding:'+(10/zz)+'px '+(20/zz)+'px;border-radius:'+(8/zz)+'px;box-shadow:0 4px 14px #0005;max-width:'+(760/zz)+'px;pointer-events:none;transition:opacity .25s;opacity:0';
document.body.appendChild(d);window.__lab=t=>{d.style.opacity=0;setTimeout(()=>{d.textContent=t;d.style.opacity=1},180)}});
"""
INIT = INIT + LAB
INIT_PLATEFORME = INIT.replace("style.zoom='%s'" % ZOOM, "style.zoom='1'").replace("const z=%s;" % ZOOM, "const z=1;")

class Rec:
    def __init__(s, page, t0): s.p, s.t0, s.m = page, t0, {}
    def mark(s, name): s.m[name] = round(time.time() - s.t0, 2)
    def wait(s, sec): s.p.wait_for_timeout(int(sec * 1000))
    def center(s, sel):
        el = s.p.locator(sel).first; el.scroll_into_view_if_needed(); b = el.bounding_box(); return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
    def frame(s, sel):
        """Fait défiler en douceur pour que l'élément soit dans la bande centrale de l'écran (hors bandeau fixe du bas)."""
        b = s.p.locator(sel).first.bounding_box()
        if b and not (200 < b["y"] + b["height"] / 2 < 700):
            s.p.evaluate("([q])=>{const e=document.querySelector(q)||document.querySelector('[data-testid]');}", [sel]) if False else None
            s.p.evaluate("dy=>window.scrollBy({top:dy,behavior:'smooth'})", b["y"] + b["height"] / 2 - 420); s.wait(1.0)
    def go(s, sel, pause=.3, steps=32, dx=0, dy=0):
        s.frame(sel); x, y = s.center(sel); s.p.mouse.move(x + dx, y + dy, steps=steps); s.wait(pause)
    def click(s, sel, pause=.5, **k): s.go(sel, **k); s.p.mouse.click(*[v + d for v, d in zip(s.center(sel), (k.get("dx", 0), k.get("dy", 0)))]); s.wait(pause)
    def scroll(s, y, dur=1.2):
        s.p.evaluate("y=>window.scrollTo({top:y,behavior:'smooth'})", y); s.wait(dur)
    def scroll_to(s, sel, off=120, dur=1.4):
        s.p.evaluate("([q,o])=>{const e=document.querySelector(q);const y=e.getBoundingClientRect().top+window.scrollY-o;window.scrollTo({top:y,behavior:'smooth'})}", [sel, off]); s.wait(dur)
    def label(s, text):
        s.p.evaluate("t=>window.__lab&&window.__lab(t)", text)
    def narr_done(s, timeout=60):
        for _ in range(timeout * 2):
            t = s.p.evaluate("document.getElementById('narr-state')?.textContent||''")
            if "Rédigé" in t or "conservé" in t: return
            s.wait(.5)

ROBERT_STORY = None
def setup_built(r, who="robert", narr=True):
    r.p.click(f"[data-testid=persona-{who}]"); r.wait(.4); r.p.click("[data-testid=build-portfolio]")
    r.p.wait_for_selector("[data-testid=story] button[data-fact]", timeout=60000)
    if narr: r.narr_done()
    r.p.evaluate("window.scrollTo(0,0)"); r.wait(.5)

def s05(r):
    r.mark("start"); r.label("Les profils de clients"); r.wait(3.8)
    r.mark("go"); r.label("1 · Je choisis Robert"); r.click("[data-testid=persona-robert]", pause=3.0)
    r.label("2 · Son histoire devient des règles"); r.scroll_to("#mandate-card", off=90); r.mark("rules"); r.wait(6.3)
    r.mark("build"); r.label("3 · Je construis le portefeuille"); r.click("[data-testid=build-portfolio]", pause=3.5); r.mark("end")

def s06(r):
    setup_built(r); r.mark("start"); r.label("Les règles sont respectées"); r.wait(.6)
    r.scroll_to("#checks", off=140, dur=1.2); r.wait(2.0)
    r.mark("story"); r.label("Chaque nombre est un badge"); r.scroll_to("[data-testid=story]", off=110, dur=1.4); r.wait(2.4)
    r.mark("go"); r.label("Un clic : le reçu"); r.click("[data-testid=story] button[data-fact='vol:p_trail']", pause=.8)
    r.mark("open"); r.label("Formule · période · titres"); r.wait(2.4); r.p.mouse.move(1500, 700, steps=20)
    r.mark("scroll"); r.label("Deux calculs indépendants")
    for _ in range(3): r.p.mouse.wheel(0, 260); r.wait(.8)
    try: r.click("[data-testid=receipt-drawer] summary", pause=1.5)
    except Exception: pass
    r.p.mouse.wheel(0, 400); r.wait(3.0); r.mark("end")

def s07(r):
    setup_built(r); r.mark("start"); r.label("La machine à remonter le temps"); r.wait(.8)
    sl = "[data-testid=date-slider]"; r.scroll_to("#step2 h2, #t2", off=60, dur=.8); r.wait(1.2)
    x, y = r.center(sl); b = r.p.locator(sl).first.bounding_box()
    r.mark("drag"); r.label("Je recule la date de décision")
    r.p.mouse.move(b["x"] + b["width"] * .30, y, steps=30); r.wait(.4); r.p.mouse.down()
    r.p.mouse.move(b["x"] + b["width"] * .10, y, steps=60); r.wait(1.5)
    r.p.mouse.move(b["x"] + b["width"] * .55, y, steps=60); r.p.mouse.up(); r.wait(1.0); r.mark("moved")
    r.label("Ce qui s'est réellement passé"); r.scroll_to("[data-testid=chart-main]", off=140, dur=1.4); r.wait(5)
    r.mark("story"); r.label("Le bilan de la période"); r.scroll_to("[data-testid=story]", off=110, dur=1.4); r.wait(5.2); r.mark("end")

def s08(r):
    setup_built(r, narr=False); r.mark("start"); r.label("Étape 3 · Une demande du client"); r.wait(.8)
    r.click("#to3", pause=1.0); r.wait(3.0)
    r.mark("ask"); r.label("Je clique sur « Essayer le cas de Robert »")
    r.go("[data-testid=try-robert]"); r.p.mouse.click(*r.center("[data-testid=try-robert]"))
    r.p.wait_for_selector("[data-testid=verdict]", state="visible", timeout=60000); r.label("Le gouverneur refuse"); r.wait(1.0)
    r.scroll_to("[data-testid=verdict]", off=120, dur=1.2); r.wait(2.0)
    r.mark("compare"); r.label("Sans l'agent · avec Verity"); r.scroll_to("[data-testid=compare]", off=150, dur=1.2); r.wait(5.0)
    r.mark("viol"); r.label("Le risque est chiffré"); r.scroll_to("#viol", off=200, dur=1.2); r.wait(1.2)
    r.mark("story"); r.label("Chaque nombre a son reçu"); r.scroll_to("[data-testid=story-governor]", off=110, dur=1.4); r.wait(6.0)
    r.mark("counter"); r.label("La contre-proposition"); r.scroll_to("#counter", off=120, dur=1.6); r.wait(4.0)
    r.scroll_to("[data-testid=chart-req]", off=140, dur=1.4); r.wait(3); r.mark("end")

def s09(r):
    setup_built(r, narr=False); r.p.click("#to3"); r.wait(.5); r.p.click("[data-testid=try-robert]")
    r.p.wait_for_selector("[data-testid=verdict]", state="visible", timeout=60000); r.narr_done_3 = None
    for _ in range(80):
        if "Rédigé" in r.p.evaluate("document.getElementById('narr-state3')?.textContent||''") or "conservé" in r.p.evaluate("document.getElementById('narr-state3')?.textContent||''"): break
        r.wait(.5)
    r.mark("start"); r.label("Avec le recul"); r.scroll_to("[data-testid=story-governor]", off=110, dur=1.4); r.wait(4.5)
    r.mark("story"); r.label("Le recul n'est pas une stratégie"); r.scroll_to("[data-testid=chart-req]", off=140, dur=1.4); r.wait(5); r.mark("end")

def s10(r):
    r.mark("start"); r.wait(.8)
    for who in ("amira", "mateo"):
        if who == "mateo": r.mark("mateo")
        r.label("Je choisis " + who.capitalize()); r.click(f"[data-testid=persona-{who}]", pause=1.0)
        r.click("[data-testid=build-portfolio]", pause=.6)
        r.p.wait_for_selector("[data-testid=story] button[data-fact]", timeout=60000)
        r.scroll_to("[data-testid=allocation]", off=130, dur=1.4); r.wait(3.5)
        if who == "amira":
            r.p.evaluate("window.scrollTo({top:0,behavior:'smooth'})"); r.wait(1.0); r.click("[data-testid=step-1]", pause=.8)
    r.mark("end")

def s11(r):
    setup_built(r, narr=False); r.mark("start"); r.label("Un agent peut-il inventer un chiffre ?"); r.wait(2.2)
    r.p.evaluate("document.getElementById('panel-verify').open=false")
    r.mark("open"); r.label("J'ouvre le vérificateur"); r.scroll_to("#panel-verify", off=300, dur=1.4); r.wait(.5)
    r.click("#panel-verify summary", pause=1.0)
    r.label("Je colle une phrase avec un chiffre inventé"); r.click("[data-testid=verify-example-fake]", pause=2.0)
    r.mark("submit"); r.label("Je clique sur Vérifier"); r.click("[data-testid=verify-submit]", pause=.3); r.p.wait_for_selector("[data-testid=verify-result]:not(:empty)", timeout=30000); r.wait(.8)
    r.label("Rejeté : ce nombre n'a pas de reçu"); r.wait(6); r.mark("end")

def s04b(r):
    """Scène plateforme : la racine (/) est la plateforme de courtage ; entrée « Ouvrir un compte · Mon mandat » puis panneau Verity."""
    r.p.wait_for_selector("[data-testid=open-mandate-banner]"); r.mark("start"); r.label("La plateforme de courtage du client"); r.wait(3.0)
    r.mark("go"); r.label("Un clic : Ouvrir un compte · Mon mandat"); r.click("[data-testid=open-mandate-banner]", pause=0.8)
    r.p.wait_for_selector("dialog.verity-host[open]"); r.p.frame_locator("dialog.verity-host iframe").locator("input[name=persona]").first.wait_for(state="attached", timeout=30000)
    r.mark("open"); r.label("Verity s'ouvre dans la plateforme"); r.wait(5.5); r.mark("end")

SCENES = {"s04b_plateforme": s04b, "s05_mandat": s05, "s06_recus": s06, "s07_temps": s07, "s08_gouverneur": s08, "s09_recul": s09, "s10_contexte": s10, "s11_triche": s11}

def record(pw, br, sid, url):
    d = os.path.join(WORK, "rec_" + sid); [os.remove(f) for f in glob.glob(d + "/*")] if os.path.isdir(d) else None
    ctx = br.new_context(viewport={"width": 1920, "height": 1080}, record_video_dir=d, record_video_size={"width": 1920, "height": 1080})
    ctx.add_init_script(INIT_PLATEFORME if sid == "s04b_plateforme" else INIT); t0 = time.time(); page = ctx.new_page(); page.goto(url); page.wait_for_timeout(1200)
    r = Rec(page, t0)
    try: SCENES[sid](r)
    finally:
        ctx.close()
    for f in glob.glob(os.path.join(d, "*.webm")): os.replace(f, os.path.join(WORK, sid + "_raw.webm"))
    json.dump(r.m, open(os.path.join(WORK, sid + "_marks.json"), "w"), indent=1); print(sid, r.m)

def main():
    args = sys.argv[1:]; url = None
    if "--url" in args: i = args.index("--url"); url = args[i + 1]; del args[i:i + 2]
    url = url or open(os.path.join(V, "DEMO_URL.txt")).read().strip()
    os.makedirs(WORK, exist_ok=True)
    exe = glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell"))[0]
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=exe, args=["--no-sandbox"])
        for sid in (args or list(SCENES)):
            try: record(pw, br, sid, url if sid == "s04b_plateforme" else url.rstrip("/") + "/verity/?embedded=1&bar=1")
            except Exception as e: print("ECHEC", sid, repr(e)[:400])
        br.close()
if __name__ == "__main__": main()
