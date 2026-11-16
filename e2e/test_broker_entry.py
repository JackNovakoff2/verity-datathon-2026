"""Intégration plateforme : E2E_URL=https://... python3 -I e2e/test_broker_entry.py  (Playwright, navigateur sur l'URL AWS)."""
import os, re, sys, urllib.request
from playwright.sync_api import sync_playwright

URL = os.environ["E2E_URL"].rstrip("/")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artifacts", "ui")
SHOTS = "--shots" in sys.argv


def get(path):
    with urllib.request.urlopen(URL + path, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def shot(pg, name):
    if SHOTS:
        os.makedirs(OUT, exist_ok=True)
        pg.screenshot(path=os.path.join(OUT, name))


# 8 + 11 : racine = plateforme ; pas de marque interdite
root = get("/")
assert "NBDB" in root or "mockup-root" in root, "la racine doit être la plateforme"
for path in ("/", "/verity/", "/assets/brokerage.js", "/js/broker-entry.js", "/assets/mockup-data.js"):
    txt = get(path)
    assert not re.search("pi" + "wwop|decision" + "lens", txt, re.I), f"marque interdite dans {path}"

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL + "/")
    pg.wait_for_selector(".bank-nav button")
    assert "Accounts" in pg.inner_text(".bank-nav")
    # 10 : changer de vue avant d'ouvrir le mandat
    pg.locator(".bank-nav button", has_text="Markets").click()
    pg.locator("[data-menu-item], #bank-navigation-dropdown button").first.click()
    heading = pg.inner_text("#broker-page-title")
    url_before = pg.url
    # 9 : entrée visible
    entry = pg.locator("[data-testid=open-mandate]")
    assert entry.is_visible()
    shot(pg, "i1-plateforme.png")
    entry.click()
    pg.wait_for_selector("dialog.verity-host[open]")
    fr = pg.frame_locator("dialog.verity-host iframe")
    fr.locator("input[name=persona]").first.wait_for(state="attached", timeout=20000)
    fr.locator("label.persona", has_text="Robert").click()
    fr.locator("#build").click()
    fr.locator("#story .badge").first.wait_for(timeout=40000)
    fr.locator("#story .badge").first.click()
    fr.locator(".drawer .agree").wait_for()
    shot(pg, "i2-mandat-dans-plateforme.png")
    # retour au contexte
    pg.locator("dialog.verity-host [data-testid=back-to-platform]").click()
    pg.wait_for_selector("dialog.verity-host[open]", state="detached")
    assert pg.inner_text("#broker-page-title") == heading and pg.url == url_before
    # Échap ferme aussi
    entry.click()
    pg.wait_for_selector("dialog.verity-host[open]")
    pg.keyboard.press("Escape")
    pg.wait_for_selector("dialog.verity-host[open]", state="detached")
    assert pg.inner_text("#broker-page-title") == heading
    # 12 : lien direct
    pg.goto(URL + "/?entry=mandat")
    pg.wait_for_selector("dialog.verity-host[open]")
    # 8 : application autonome toujours joignable
    pg.goto(URL + "/verity/")
    pg.wait_for_selector("input[name=persona]", state="attached")
    # petit écran : pas de défilement horizontal de la page hôte, retour accessible
    m = b.new_page(viewport={"width": 390, "height": 844})
    m.goto(URL + "/")
    m.wait_for_selector("[data-testid=open-mandate]")
    assert m.evaluate("document.documentElement.scrollWidth") <= 390, "défilement horizontal à 390 px"
    m.locator("[data-testid=open-mandate]").click()
    m.wait_for_selector("dialog.verity-host[open]")
    m.locator("[data-testid=back-to-platform]").click()
    m.wait_for_selector("dialog.verity-host[open]", state="detached")
    assert not errs, errs
    b.close()
print("OK")
