"""Test navigateur léger de l'interface (Playwright). Usage : UI_URL=http://localhost:8095 python3 e2e/ui_smoke.py [--shots]
Avec --shots : enregistre les captures dans artifacts/ui/. /api/narrate exige les identifiants AWS côté serveur."""
import os, sys
from playwright.sync_api import sync_playwright

URL = os.environ.get("UI_URL", "http://localhost:8095")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "artifacts", "ui")
SHOTS = "--shots" in sys.argv


def shot(page, name, full=True):
    if SHOTS:
        os.makedirs(OUT, exist_ok=True)
        page.screenshot(path=os.path.join(OUT, name), full_page=full)


def run(p, w, h, suffix):
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": w, "height": h})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(URL.rstrip("/") + "/verity/")
    pg.wait_for_selector("input[name=persona]", state="attached")
    assert pg.locator("input[name=persona]").count() == 3
    pg.locator("label.persona", has_text="Robert").click()
    assert pg.locator("#mandate-rules li").count() == 6
    shot(pg, "01-mandat.png" if w > 800 else "m1-mandat.png")
    pg.click("#build")
    pg.wait_for_selector("#alloc .bar-row")
    pg.wait_for_selector("#story .badge")
    assert pg.locator("#checks li").count() >= 6
    assert pg.locator("#chart-main svg").count() == 1
    pg.wait_for_selector(".mode-chip.claude", timeout=40000)
    shot(pg, "02-portefeuille.png" if w > 800 else "m2-portefeuille.png")
    pg.locator("#story .badge", has_text="%").first.click()
    pg.wait_for_selector(".drawer .agree")
    assert "concordent" in pg.inner_text(".drawer")
    shot(pg, "03-recu.png" if w > 800 else "m3-recu.png", full=False)
    pg.keyboard.press("Escape")
    assert pg.locator(".drawer").count() == 0
    pg.click(".crumb[data-step='3']")
    pg.click("#ask-robert")
    pg.wait_for_selector("#verdict.no")
    assert pg.locator("[data-testid=compare-without]").is_visible() and pg.locator("[data-testid=compare-with]").is_visible()
    assert pg.locator("[data-testid=compare] .badge").count() >= 3
    assert "Limite reconnue" in pg.inner_text("[data-testid=compare]")
    assert pg.locator("#viol li").count() >= 3
    assert pg.locator("#chart-req svg path").count() >= 4
    pg.wait_for_selector("#narr-state3 .mode-chip.claude", timeout=40000)
    shot(pg, "04-demande.png" if w > 800 else "m4-demande.png")
    pg.click("#panel-verify summary")
    pg.click("#verify-go")
    pg.wait_for_selector(".vres.no")
    assert "300" in pg.inner_text(".vres.no")
    pg.click("[data-ex='{{vol:p_trail}}']")
    pg.wait_for_selector(".vres.yes")
    assert not errs, errs
    b.close()


with sync_playwright() as p:
    run(p, 1440, 900, "d")
    run(p, 390, 844, "m")
print("OK")
