"""Génère le one-pager et la note technique de Verity (HTML puis PDF via Chromium headless local).
Tous les chiffres viennent du moteur (registre de faits) ou des artefacts du dépôt (artifacts/validation.json, e2e_report.md).
Captures : docs/assets/s*.png = captures réelles de l'application déployée sur AWS (voir shots dans NOTES) ; recadrées ici."""
import json, math, os, sys, glob, hashlib, io, base64
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root)
from verity import service
from verity.data import dataset

FONT = os.path.join(root, "web", "assets", "fonts")
ASSETS = os.path.join(root, "docs", "assets")
RED, SLATE, BG, INK, GREY = "#c40023", "#365e7e", "#f4f2f0", "#1d2530", "#6b7480"
pct = lambda x, nd=1: f"{x*100:.{nd}f}".replace(".", ",") + " %"

CSS = f"""
@font-face{{font-family:NS;src:url('file://{FONT}/NationaleSans-regular.otf');font-weight:400}}
@font-face{{font-family:NS;src:url('file://{FONT}/NationaleSans-medium.otf');font-weight:500}}
@font-face{{font-family:NS;src:url('file://{FONT}/NationaleSans-bold.otf');font-weight:700}}
@page{{size:A4;margin:0}}
*{{box-sizing:border-box}} html,body{{margin:0;background:{BG}}}
body{{font:400 9pt/1.38 NS,Roboto,Arial,sans-serif;color:{INK}}}
.page{{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;background:{BG}}}
.page:last-child{{page-break-after:auto}}
.dots{{position:absolute;left:0;top:0;pointer-events:none}}
.top{{position:absolute;left:13mm;right:13mm;top:9mm;display:flex;align-items:center;justify-content:space-between;font-size:8pt;color:{SLATE}}}
.brand{{display:flex;align-items:center;gap:2.2mm;font:700 12pt NS;color:{SLATE}}}
.brand svg{{width:6mm;height:6mm}}
.top>div:not(.brand){{background:{BG};padding:.6mm 1.6mm;border-radius:1mm}} .sim{{font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:{RED};font-size:7.2pt}}
.body{{position:absolute;left:13mm;right:13mm;top:20mm}}
h1{{font:700 27pt/1.05 NS;color:{INK};margin:0 0 3mm;letter-spacing:-.01em}} h1 em{{font-style:normal;color:{RED}}}
h2{{font:700 11.5pt/1.2 NS;color:{SLATE};margin:0 0 2mm}} h3{{font:700 8.6pt/1.2 NS;color:{SLATE};margin:0 0 1mm;text-transform:uppercase;letter-spacing:.05em}}
p{{margin:0 0 1.8mm}} .lead{{font-size:11pt;line-height:1.35;color:{SLATE};max-width:118mm}}
.card{{background:#fff;border:.25mm solid #e4e0dc;border-radius:1.6mm;padding:2.6mm 3.2mm}}
.k{{border-top:.7mm solid {RED}}}
.cols2{{display:grid;grid-template-columns:1fr 1fr;gap:4mm}} .cols3{{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm}} .cols4{{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}}
ul{{margin:0;padding:0 0 0 3.6mm}} li{{margin:0 0 .9mm}}
table{{border-collapse:collapse;width:100%;font-size:8.4pt;background:#fff}} th{{background:#ebe7e3;color:{SLATE};text-align:left;font-weight:700}} td,th{{border:.2mm solid #ddd8d3;padding:1.2mm 2mm;vertical-align:top}}
code{{font:400 8pt 'JetBrains Mono','DejaVu Sans Mono',monospace;background:#ebe7e3;padding:0 .8mm;border-radius:.5mm}}
.foot{{position:absolute;left:13mm;right:13mm;bottom:6mm;display:flex;justify-content:space-between;font-size:7pt;color:{GREY};border-top:.2mm solid #d9d4cf;padding-top:1.5mm}}
.tag{{display:inline-block;font:700 6.6pt NS;letter-spacing:.05em;text-transform:uppercase;padding:.3mm 1.6mm;border-radius:.8mm;color:#fff}}
.f{{background:{SLATE}}} .h{{background:#8a6d3b}} .u{{background:{RED}}}
.shot{{border:.25mm solid #d9d4cf;border-radius:1.2mm;overflow:hidden;background:#fff}} .shot img{{display:block;width:100%}} .shot[style*="height"] img{{height:100%;object-fit:cover;object-position:top left}}
.cap{{font-size:7.3pt;color:{GREY};margin-top:1mm;line-height:1.3}}
"""

LOGO = f"""<svg viewBox="0 0 24 24"><path d="M3 1h18v22l-3-2-3 2-3-2-3 2-3-2-3 2z" fill="{SLATE}"/><path d="M7.5 11.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>"""


def dots(w, h, blobs, step=2.4, seed=1, thresh=.12, red_ratio=.38):
    """Nuage de points (dot-matrix) rouge/gris sur grille w x h mm ; blobs = (cx, cy, sigma, poids)."""
    out = []
    ny, nx = int(h / step) + 1, int(w / step) + 1
    for j in range(ny):
        for i in range(nx):
            x, y = i * step + (step / 2 if j % 2 else 0), j * step
            d = sum(wt * math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s)) for cx, cy, s, wt in blobs)
            hh = int(hashlib.md5(f"{seed}{i},{j}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
            if d < thresh or hh > d * 1.15 + .12: continue
            r = .16 + .5 * min(d, 1) ** .8
            red = (int(hashlib.md5(f"c{seed}{i},{j}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF) < red_ratio * (.5 + d)
            out.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}" fill="{RED if red else "#aaa39d"}" fill-opacity="{.85 if red else .6}"/>')
    return f'<svg class="dots" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}">{"".join(out)}</svg>'


def crop(name, box, width=900):
    """Recadre une capture réelle (docs/assets/<name>) et la renvoie en data-URI JPEG."""
    from PIL import Image
    im = Image.open(os.path.join(ASSETS, name)).convert("RGB").crop(box)
    im = im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=86)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


def qr_svg(url):
    import segno
    q = segno.make(url, error="m")
    b = io.BytesIO(); q.save(b, kind="svg", scale=4, border=1, dark=INK, light="#ffffff", xmldecl=False, svgns=True)
    return b.getvalue().decode().replace('<svg ', '<svg style="display:block;width:100%;height:auto" ', 1)


def header(sub):
    return f'<div class="top"><div class="brand">{LOGO}<span>Verity</span></div><div>{sub}</div><div class="sim">Simulation uniquement</div></div>'


def footer(n, label):
    return f'<div class="foot"><span>Simulation uniquement : aucun ordre réel, aucun conseil financier personnalisé. Les rendements passés ne prédisent rien.</span><span>{label} · {n}</span></div>'


def arch_svg(detailed=False):
    """Schéma d'architecture AWS réellement déployé (CloudFormation infra/template.yaml)."""
    W = 640 if detailed else 600
    return f"""<svg viewBox="0 0 {W} 214" width="100%" role="img" aria-label="Architecture AWS de Verity" font-family="NS,Arial" font-size="10.5" fill="{INK}">
<defs><marker id="ar" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0,0L6,3L0,6z" fill="{SLATE}"/></marker></defs>
<rect x="2" y="2" width="{W-4}" height="210" rx="6" fill="none" stroke="#cfc9c3" stroke-dasharray="3 3"/><text x="10" y="16" font-size="8.5" fill="{GREY}">AWS · us-east-1 · pile CloudFormation unique</text>
<rect x="10" y="78" width="78" height="56" rx="5" fill="#fff" stroke="{SLATE}"/><text x="49" y="100" text-anchor="middle" font-weight="700">Navigateur</text><text x="49" y="114" text-anchor="middle" font-size="8">plateforme + Verity</text><text x="49" y="125" text-anchor="middle" font-size="8">(HTML/JS statique)</text>
<rect x="112" y="78" width="86" height="56" rx="5" fill="#fff" stroke="{SLATE}"/><text x="155" y="100" text-anchor="middle" font-weight="700">API Gateway</text><text x="155" y="114" text-anchor="middle" font-size="8">HTTP API</text><text x="155" y="125" text-anchor="middle" font-size="8">limite 10 req/s</text>
<rect x="222" y="30" width="226" height="154" rx="6" fill="#fff" stroke="{RED}" stroke-width="1.4"/><text x="335" y="48" text-anchor="middle" font-weight="700" fill="{RED}">AWS Lambda · Python 3.12</text>
<rect x="234" y="58" width="202" height="60" rx="4" fill="#f4f2f0" stroke="#cfc9c3"/><text x="335" y="74" text-anchor="middle" font-weight="700" font-size="9.5">Code déterministe (aucun modèle)</text><text x="335" y="88" text-anchor="middle" font-size="8.2">Constructeur · Analyste A/B · Gouverneur</text><text x="335" y="100" text-anchor="middle" font-size="8.2">Vérificateur · registre de faits (reçus)</text><text x="335" y="112" text-anchor="middle" font-size="8.2">données CSV embarquées + empreintes</text>
<rect x="234" y="126" width="202" height="48" rx="4" fill="#f4f2f0" stroke="#cfc9c3"/><text x="335" y="142" text-anchor="middle" font-weight="700" font-size="9.5">Agents à modèle (appels Bedrock)</text><text x="335" y="156" text-anchor="middle" font-size="8.2">Accueil : récit → mandat (schéma strict)</text><text x="335" y="167" text-anchor="middle" font-size="8.2">Narrateur : phrases à jetons de faits</text>
<rect x="476" y="46" width="118" height="62" rx="5" fill="#fff" stroke="{SLATE}"/><text x="535" y="66" text-anchor="middle" font-weight="700">Amazon Bedrock</text><text x="535" y="80" text-anchor="middle" font-size="8">Claude Sonnet 5.5 (Accueil)</text><text x="535" y="92" text-anchor="middle" font-size="8">Claude Haiku 5.5 (Narrateur)</text>
<rect x="476" y="124" width="118" height="50" rx="5" fill="#fff" stroke="{SLATE}"/><text x="535" y="144" text-anchor="middle" font-weight="700">CloudWatch Logs</text><text x="535" y="158" text-anchor="middle" font-size="8">journaux · 7 jours</text>
<rect x="222" y="192" width="226" height="14" rx="3" fill="none"/><text x="335" y="203" text-anchor="middle" font-size="8" fill="{GREY}">Code déployé via S3 (bucket privé) · rôle IAM limité à Bedrock InvokeModel</text>
<g stroke="{SLATE}" stroke-width="1.3" fill="none" marker-end="url(#ar)"><path d="M88 106H110"/><path d="M198 106H220"/><path d="M448 77H474"/><path d="M448 148H474"/></g></svg>"""


def arch_small():
    return f"""<svg viewBox="0 0 330 205" width="100%" role="img" aria-label="Architecture AWS simplifiée" font-family="NS,Arial" font-size="11" fill="{INK}">
<defs><marker id="as" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto"><path d="M0,0L6,3L0,6z" fill="{SLATE}"/></marker></defs>
<rect x="1" y="1" width="328" height="203" rx="6" fill="none" stroke="#cfc9c3" stroke-dasharray="3 3"/><text x="8" y="14" font-size="8.5" fill="{GREY}">AWS · us-east-1 · CloudFormation</text>
<rect x="8" y="26" width="96" height="40" rx="5" fill="#fff" stroke="{SLATE}"/><text x="56" y="44" text-anchor="middle" font-weight="700">Navigateur</text><text x="56" y="58" text-anchor="middle" font-size="9">plateforme + Verity</text>
<rect x="126" y="26" width="96" height="40" rx="5" fill="#fff" stroke="{SLATE}"/><text x="174" y="44" text-anchor="middle" font-weight="700">API Gateway</text><text x="174" y="58" text-anchor="middle" font-size="9">HTTP API</text>
<rect x="8" y="90" width="214" height="104" rx="6" fill="#fff" stroke="{RED}" stroke-width="1.5"/><text x="115" y="107" text-anchor="middle" font-weight="700" fill="{RED}">AWS Lambda (Python 3.12)</text>
<rect x="16" y="114" width="198" height="34" rx="4" fill="#f4f2f0"/><text x="115" y="128" text-anchor="middle" font-size="9.4" font-weight="700">Code déterministe</text><text x="115" y="140" text-anchor="middle" font-size="8.6">construire · calculer A/B · gouverner · vérifier</text>
<rect x="16" y="153" width="198" height="34" rx="4" fill="#f4f2f0"/><text x="115" y="167" text-anchor="middle" font-size="9.4" font-weight="700">Agents à modèle</text><text x="115" y="179" text-anchor="middle" font-size="8.6">Accueil (récit → mandat) · Narrateur</text>
<rect x="244" y="90" width="78" height="104" rx="5" fill="#fff" stroke="{SLATE}"/><text x="283" y="118" text-anchor="middle" font-weight="700">Amazon</text><text x="283" y="132" text-anchor="middle" font-weight="700">Bedrock</text><text x="283" y="150" text-anchor="middle" font-size="8.8">Claude</text><text x="283" y="162" text-anchor="middle" font-size="8.8">Sonnet 5.5</text><text x="283" y="174" text-anchor="middle" font-size="8.8">Haiku 5.5</text>
<g stroke="{SLATE}" stroke-width="1.3" fill="none" marker-end="url(#as)"><path d="M104 46H124"/><path d="M174 66V88"/><path d="M222 168H242"/></g></svg>"""


def build():
    d = dataset()
    AS = "2022-12-30"
    rob = service.analyze("robert", AS, request={"ticker": "NVDA", "weight": 0.5})
    ami = service.analyze("amira", AS)
    mat = service.analyze("mateo", AS, request={"ticker": "XOM", "weight": 0.10})
    F = rob["facts"]
    val = json.load(open(os.path.join(root, "artifacts", "validation.json")))
    url = val["url"] + "/?entry=mandat"
    nfacts, nsess, nasset = len(F), len(d.dates), len(d.tickers)
    vol0, vol1, vlim = F["vol:p_trail"]["display"], F["vol:req_trail"]["display"], F["rule:vol:limit"]["display"]
    wok, nvda_dd, risk_nv = F["w_ok"]["display"], F["mdd:tk_hist"]["display"], F["risk:req:NVDA"]["display"]
    nviol = len(rob["governance"]["violations"]); nrules = len(rob["mandate"]["rules"])
    fv = F["vol:p_trail"]; inp = fv["inputs"]
    d_from, d_to = d.dates[0], d.dates[-1]
    qr = qr_svg(url)
    img_mandat = crop("s1-mandat.png", (60, 335, 1090, 905), 1000)
    img_mandat_w = crop("s1-mandat.png", (100, 190, 2000, 1090), 1000)
    img_recu = crop("s2-recu.png", (1520, 0, 2560, 1350), 700)
    img_verdict = crop("s3b-verdict.png", (60, 30, 1460, 1190), 760)

    # ---------------------------------------------------------------- ONE-PAGER
    cloud1 = dots(210, 120, [(190, 28, 22, 1.0), (202, 58, 18, .8), (166, 10, 16, .7), (8, 118, 14, .6)], seed=3)
    steps = [("1", "Récit", "Le client raconte sa situation, ou choisit un profil fictif."),
             ("2", "Mandat confirmé", "L'agent d'accueil le code en règles ; le client les relit et les confirme avant toute simulation."),
             ("3", "Portefeuille simulé", "Construit avec les seules données connues à la date de décision."),
             ("4", "Demande", "Le gouverneur la confronte au mandat et chiffre l'écart."),
             ("5", "Bilan", "Un récit où chaque nombre ouvre son reçu.")]
    stp = "".join(f'<div class="card" style="padding:2mm 2.4mm"><div style="font:700 13pt NS;color:{RED};line-height:1">{n}</div><div style="font:700 8.6pt NS;color:{SLATE};margin:.6mm 0">{t}</div><div style="font-size:7.5pt;line-height:1.28">{x}</div></div>' for n, t, x in steps)
    diff = [("Mandat confirmé au début", "Règles vérifiables (plafond de volatilité, part maximale par titre, exclusions) codées, puis confirmées par le client : tout le reste en dépend."),
            ("Reçus recalculés", f"Chaque chiffre est calculé par deux implémentations indépendantes (A et B) ; le badge ouvre formule, période, titres et empreintes des données."),
            ("Gouverneur", "Toute demande hors mandat est refusée avec les règles enfreintes chiffrées, et une contre-proposition compatible."),
            ("Vérificateur", "Un texte contenant un nombre sans reçu est rejeté, y compris s'il vient d'un modèle de langage.")]
    dif = "".join(f'<div class="card k" style="padding:2.2mm 2.6mm"><h3 style="text-transform:none;font-size:9pt;letter-spacing:0">{t}</h3><div style="font-size:7.7pt;line-height:1.3">{x}</div></div>' for t, x in diff)
    kp = [(f"{vol0} → {vol1}", f"volatilité si 50 % en NVIDIA (plafond {vlim})"), (f"{nviol} règles", "enfreintes sur " + str(nrules) + " : demande refusée"), (wok, "poids maximal compatible (contre-proposition)"), (f"{nfacts}", "faits du cas, tous vérifiés A = B")]
    kpi = "".join(f'<div style="border-left:.9mm solid {RED};padding:.4mm 2.4mm;background:#fff"><div style="font:700 12.5pt NS;color:{INK};line-height:1.1">{a}</div><div style="font-size:7.2pt;color:{GREY};line-height:1.25">{b}</div></div>' for a, b in kp)
    grid = [("Innovation · 20 %", "mandat confirmé + reçus"), ("Agentique · 20 %", "6 agents, explicabilité par reçu"), ("Données · 20 %", f"{nasset} actifs, {nsess:,} séances".replace(",", "\u00a0")), ("UX · 10 %", "3 étapes, badges cliquables"), ("AWS · 15 %", "Lambda, API Gateway, Bedrock"), ("Présentation · 15 %", "business, film, ce document")]
    grd = "".join(f'<div style="font-size:7.1pt;line-height:1.25"><b style="color:{SLATE};white-space:nowrap">{a}</b><br>{b}</div>' for a, b in grid)
    op = f"""<!doctype html><meta charset="utf-8"><title>Verity — One-pager</title><style>{CSS}
.page .body{{top:19mm}}</style>
<div class="page">{cloud1}{header("Datathon 2026 · AlphaForge AI · finaliste")}
<div class="body">
<div style="height:47mm"><h1 style="font-size:25pt">Chaque chiffre a un <em>reçu</em>.</h1>
<p class="lead" style="font-size:10.4pt;max-width:112mm">Verity fixe un mandat avec le client dès l'ouverture de compte, simule un portefeuille, puis prouve chaque nombre affiché.</p><div class="card" style="max-width:128mm;margin-top:2.5mm;padding:2mm 3mm;font-size:7.9pt"><b style="color:{SLATE}">Le problème.</b> Un assistant IA répond avec aplomb, mais personne ne peut vérifier ses chiffres, et il ignore le contexte de l'investisseur. <b style="color:{SLATE}">Notre réponse.</b> Le modèle propose, le code dispose : chiffres, règles et refus viennent d'un code déterministe, avec un reçu par nombre.</div></div>
<h3>Le parcours client, de l'ouverture de compte au bilan</h3><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:2.4mm;margin-bottom:5mm">{stp}</div>
<h3>Ce qui est différent</h3><div class="cols4" style="margin-bottom:3.5mm">{dif}</div>
<h3>Application réelle déployée sur AWS · cas de Robert (30 déc. 2022)</h3>
<div class="cols3" style="grid-template-columns:1.2fr .85fr 1.2fr;margin-bottom:1mm">
<div><div class="shot" style="height:auto;background:#fff"><img src="{img_mandat}" style="height:auto;object-fit:initial"></div><div class="cap"><b>1 · Mandat</b> : six règles codées pour Robert, relues par lui.</div></div>
<div><div class="shot" style="height:53mm"><img src="{img_recu}"></div><div class="cap"><b>2 · Reçu</b> : un clic sur un nombre ouvre le double calcul.</div></div>
<div><div class="shot"><img src="{img_verdict}"></div><div class="cap"><b>3 · Gouverneur</b> : « 50 % en NVIDIA » refusé, sans et avec Verity.</div></div></div>
<div class="cols4" style="grid-template-columns:1.5fr 1fr 1.3fr 1fr;margin:1.5mm 0 2.4mm">{kpi}</div>
<div class="cols3" style="grid-template-columns:1.05fr 1.2fr .55fr;gap:3.5mm">
<div><h3>Architecture AWS</h3>{arch_small()}</div>
<div><h3>Preuves et limites</h3><ul style="font-size:7.6pt;line-height:1.3"><li><b>12 tests unitaires</b> réussis (double calcul sur 25 portefeuilles aléatoires, futur détruit sans effet sur le portefeuille).</li><li><b>E2E sur pile AWS dédiée : 8/8</b> contrats HTTP et <b>7/7</b> parcours navigateur.</li><li><b>Limites</b> : prix ajustés après coup (pas du point-in-time strict), biais du survivant, {nasset} actifs, plafonds = hypothèses de démonstration, sans frais ni impôt.</li><li><b>Inconnu</b> : la tolérance réelle d'un client ; aucun effet sur des clients n'est mesuré.</li></ul></div>
<div style="text-align:center"><h3 style="text-align:left">Essayer</h3><div style="width:24mm;margin:0 auto;border:.25mm solid #d9d4cf;padding:.6mm;background:#fff">{qr}</div><div style="font-size:7pt;margin-top:1mm;line-height:1.25;text-align:left">Démo en ligne jusqu'au 16 nov. 2026 (compte AWS jetable).</div></div></div>
<div style="margin-top:3mm;border-top:.2mm solid #d9d4cf;padding-top:1.6mm"><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:2mm">{grd}</div></div>
</div>{footer(1, "Verity · one-pager")}</div>"""

    # ---------------------------------------------------------------- NOTE TECHNIQUE
    cloud_c = dots(210, 60, [(198, 14, 16, 1.0), (206, 40, 14, .7), (176, 4, 12, .6)], seed=11)
    hd = lambda n: header(f"Note technique · Datathon 2026 · AlphaForge AI") 
    def row(a): return ", ".join(f"{w['ticker']} {pct(w['weight'])}" for w in a["portfolio"]["weights"][:4])
    def prow(a, nm): return f"<tr><td>{nm}</td><td>{a['mandate']['horizon_years']} ans</td><td>{len(a['mandate']['rules'])}</td><td style='text-align:right'>{a['facts']['vol:p_trail']['display']}</td><td style='text-align:right'>{a['facts']['mdd:p_hist']['display']}</td><td>{row(a)}</td></tr>"
    viol = "".join(f"<tr><td>{c['text']}</td><td style='text-align:right'>{c['display']}</td><td style='color:{RED};font-weight:700'>enfreinte</td></tr>" for c in rob["governance"]["violations"])
    sens = F["sens_min"]["display"]
    wts = ", ".join(f"{k} {pct(v)}" for k, v in list(inp["weights"].items())[:3])
    P1 = f"""<div class="page">{cloud_c}{hd(1)}<div class="body">
<h1 style="font-size:23pt">Verity : <em>chaque chiffre a un reçu</em></h1>
<p class="lead" style="max-width:128mm">Note technique. Un mandat client codé et confirmé, un portefeuille simulé, des reçus recalculés par deux implémentations, un gouverneur et un vérificateur. Simulation uniquement.</p>
<h2 style="margin-top:6mm">1. Architecture : le modèle propose, le code dispose</h2>
{arch_svg(True)}
<table style="margin-top:2.5mm"><tr><th style="width:22mm">Agent</th><th>Rôle</th><th style="width:36mm">Nature</th><th>Contrôle</th></tr>
<tr><td><b>Accueil</b></td><td>Récit libre → mandat JSON (plafond de volatilité, baisse tolérée, parts maximales/minimales, exclusions)</td><td>Claude Sonnet 5.5 (Bedrock)</td><td>Schéma strict : un mandat invalide n'est jamais utilisé ; le client relit et confirme</td></tr>
<tr><td><b>Constructeur</b></td><td>Poches (actions, FNB, obligations, or, crypto), pondération par l'inverse de la volatilité plafonnée, curseur de croissance maximal compatible avec toutes les règles</td><td>Code déterministe</td><td>Aucune donnée postérieure à la date de décision</td></tr>
<tr><td><b>Analyste</b></td><td>Rendement, volatilité, baisse maximale, corrélation, part de risque, sensibilité</td><td>Deux implémentations A et B</td><td>« Vérifié » seulement si A = B</td></tr>
<tr><td><b>Narrateur</b></td><td>Phrases claires pour un non-spécialiste</td><td>Claude Haiku 5.5 ; repli sur gabarit</td><td>N'écrit aucun nombre : uniquement des jetons de faits</td></tr>
<tr><td><b>Vérificateur</b></td><td>Relit chaque phrase</td><td>Code déterministe</td><td>Rejette chiffre libre, fait inconnu ou non vérifié, date hors calendrier</td></tr>
<tr><td><b>Gouverneur</b></td><td>Confronte une demande au mandat, chiffre l'écart, cherche le plus grand poids compatible</td><td>Code déterministe</td><td>Refus fondé sur des règles que le client a confirmées</td></tr></table>
<p style="margin-top:2mm;font-size:8.4pt">Sur six agents, <b>quatre sont du code déterministe</b>. Les deux appels de modèle sont encadrés : l'un par un schéma, l'autre par le vérificateur. Aucun raisonnement interne du modèle n'est conservé ni affiché ; seules les actions observables le sont.</p>
<h2 style="margin-top:4mm">2. Données et point-in-time</h2>
<table><tr><th>Donnée</th><th>Origine</th><th>Traitement</th></tr>
<tr><td>Prix quotidiens ajustés de {nasset} actifs (actions, FNB, Bitcoin, Ether)</td><td>Jeu de départ AlphaForge AI (Yahoo Finance), {d_from} → {d_to}</td><td>Calendrier commun = intersection des dates observées : {nsess:,} séances, aucun remplissage de prix. Empreinte SHA-256 de chaque fichier</td></tr>
<tr><td>Taux USD/CAD</td><td>Banque du Canada, même extraction</td><td>Titres USD convertis au dernier taux connu ; tous les calculs en CAD</td></tr>
<tr><td>Mandats, personas</td><td>Fictifs, définis par l'équipe d'après les trois profils du défi</td><td>Plafonds = hypothèses de démonstration</td></tr></table>
</div>{footer(1, "Verity · note technique")}</div>""".replace(f"{nsess:,}", f"{nsess:,}".replace(",", "\u00a0"))

    P2 = f"""<div class="page">{dots(210, 24, [(196, 2, 12, .9), (172, -4, 10, .5)], seed=5)}{hd(2)}<div class="body">
<p style="margin-top:2mm;font-size:8.6pt"><b>Point-in-time.</b> Le portefeuille d'une date de décision n'utilise que les prix ≤ cette date : volatilité = écart-type des rendements quotidiens × √252 sur les 252 séances qui précèdent. Un test détruit tous les prix postérieurs (multipliés par 0,2 à 3,2 au hasard) : les poids restent identiques à 10⁻¹² près. La date par défaut est le <b>30 décembre 2022</b>, fin d'une année où actions et obligations ont baissé ensemble. Hypothèses : achat à la date de décision, conservation, sans frais, impôt ni rééquilibrage.</p>
<h2 style="margin-top:4mm">3. Double calcul et reçus</h2>
<div class="cols2" style="grid-template-columns:1.5fr 1fr;align-items:start"><div><div class="card" style="font-size:8.4pt;background:#fff"><b>Phrase publiée :</b> « Sa volatilité annuelle, mesurée sur l'année qui précède, est de <b>{vol0}</b>, sous le plafond de {vlim} fixé par le mandat. »<br>
<b>Reçu <code>{fv['id']}</code> :</b> {fv['method']} Période du {inp['from']} au {inp['to']} ({inp['sessions']} séances), {len(inp['weights'])} titres (dont {wts}…).<br>
<b>Calcul A</b> = {fv['impl_a']:.10f} · <b>calcul B</b> = {fv['impl_b']:.10f} · concordance : <b>{'oui' if fv['verified'] else 'non'}</b>.<br>
<b>Données :</b> prix <code>{fv['dataset']['files']['prices_daily.csv'][:12]}</code>, change <code>{fv['dataset']['files']['fx_usdcad_daily.csv'][:12]}</code> (SHA-256 tronqués).</div>
<p style="margin-top:2mm;font-size:8.4pt">Chaque phrase du récit contient des jetons <code>{{{{fait}}}}</code>. Le vérificateur remplace le jeton par la valeur du fait et rejette le texte s'il reste un chiffre libre. Le cas de Robert produit <b>{nfacts} faits</b>, tous vérifiés. Le bouton « Tester la vérification » de l'application montre trois rejets : chiffre inventé (« +300 % »), jeton inconnu, et un jeton valide accepté.</p>
</div><div><div class="shot"><img src="{img_recu}"></div><div class="cap">Le reçu ouvert dans l'application : double calcul, formule, période, titres, empreintes.</div></div></div>
<h2 style="margin-top:4mm">4. Gouverneur : le cas Robert / NVIDIA</h2>
<div class="cols2" style="grid-template-columns:1.25fr 1fr;align-items:start"><div>
<p style="font-size:8.4pt">Robert (59 ans, horizon {rob['mandate']['horizon_years']} ans) a {nrules} règles. Il demande 50 % de NVIDIA ; le gouverneur compare à son mandat :</p>
<table><tr><th>Règle</th><th>Avec la demande</th><th>Verdict</th></tr>{viol}</table>
<p style="font-size:8.4pt;margin-top:2mm">Volatilité <b>{vol0} → {vol1}</b> ; NVIDIA porterait {risk_nv} du risque ; sa baisse historique seule avant la décision était de {nvda_dd}. Contre-proposition : <b>{wok} au plus</b>. Avec le recul, la demande aurait rapporté {F['ret:req_wf']['display']} en passant par {F['mdd:req_wf']['display']} ; Verity le dit et rappelle que choisir le gagnant après coup n'est pas une stratégie.</p></div>
<div><div class="shot"><img src="{img_verdict}"></div><div class="cap">Capture de l'application déployée : refus, sans et avec Verity.</div></div></div>
<h2 style="margin-top:3.5mm">5. Un même moteur, trois contextes</h2>
<table><tr><th>Profil</th><th>Horizon</th><th>Règles</th><th>Volatilité</th><th>Pire baisse passée</th><th>Quatre plus grandes positions</th></tr>{prow(ami, 'Amira')}{prow(mat, 'Mateo')}{prow(rob, 'Robert')}</table>
<p class="cap" style="margin-top:1mm">Amira : technologies ≤ 30 %, crypto ≤ 8 %. Mateo : ni énergie, ni crypto, ni Tesla ; ≥ 15 % de FNB filtré ESG. Robert : ≥ 40 % d'obligations, pas de crypto. La demande de Mateo pour Exxon Mobil est refusée au titre de la règle Énergie.</p>
</div>{footer(2, "Verity · note technique")}</div>"""

    P3 = f"""<div class="page">{dots(210, 24, [(198, 2, 12, .8), (176, -4, 10, .4)], seed=8)}{hd(3)}<div class="body">
<h2 style="margin-top:2mm">6. Services AWS réellement utilisés</h2>
<table><tr><th style="width:36mm">Service</th><th>Usage dans Verity</th></tr>
<tr><td>AWS Lambda</td><td>Python 3.12, 1 024 Mo, délai 28 s : sert l'interface statique et <code>/api/*</code> ; moteur sans dépendance lourde (<code>boto3</code> seulement pour Bedrock)</td></tr>
<tr><td>Amazon API Gateway</td><td>HTTP API devant la fonction ; limitation 10 requêtes/s, rafale 20</td></tr>
<tr><td>Amazon Bedrock</td><td>Claude Sonnet 5.5 (agent d'accueil) et Claude Haiku 5.5 (narrateur), via profils d'inférence <code>us.anthropic.*</code></td></tr>
<tr><td>CloudFormation, S3, IAM</td><td>Infrastructure décrite dans <code>infra/template.yaml</code> ; code déposé dans un bucket privé (expiration 14 jours) ; rôle limité à <code>bedrock:InvokeModel</code> sur les modèles Anthropic</td></tr>
<tr><td>CloudWatch Logs</td><td>Journal de la fonction, conservé 7 jours</td></tr></table>
<p class="cap" style="margin-top:1mm">CloudFront est prévu dans le modèle (option) mais n'est pas activé dans le déploiement évalué. Compte jetable de l'événement : expire le 16 novembre 2026.</p>
<h2 style="margin-top:4mm">7. Sécurité et conformité</h2>
<div class="cols2"><ul style="font-size:8.3pt"><li><b>Rôle de moindre privilège</b> : la fonction ne peut qu'invoquer les modèles Bedrock Anthropic.</li><li><b>Entrées validées</b> : mandat compilé par le modèle accepté seulement s'il passe le schéma strict ; récit tronqué à 1 500 caractères.</li><li><b>Aucun identifiant bancaire</b> : l'application ne collecte aucun champ de ce type (scénario E2E 7).</li><li><b>Pas de secret dans le code</b> ni dans les documents ; les accès AWS sont fournis par le rôle d'exécution.</li></ul>
<ul style="font-size:8.3pt"><li><b>Données fictives</b> : profils inventés ; le récit saisi par l'utilisateur est transmis à Bedrock pour être traduit en règles.</li><li><b>Pas de conseil</b> : bandeau « Simulation uniquement » toujours visible ; aucun ordre n'est exécuté.</li><li><b>Auditabilité</b> : règles, refus et reçus sont rejouables depuis les empreintes des données.</li><li><b>Non revendiqué</b> : aucune conformité réglementaire (valeurs mobilières, vie privée) n'est évaluée ici.</li></ul></div>
<h2 style="margin-top:4mm">8. Tests et preuves</h2>
<table><tr><th style="width:36mm">Contrôle</th><th>Méthode</th><th style="width:28mm">Résultat</th></tr>
<tr><td>Exactitude</td><td>Rendement calculé à la main depuis les CSV bruts ; conversion de change ligne par ligne</td><td>réussi</td></tr>
<tr><td>Deux implémentations</td><td>25 portefeuilles aléatoires × 7 types de faits : A et B concordent ; un désaccord marque le fait « non vérifié »</td><td>réussi</td></tr>
<tr><td>Pas de futur</td><td>Prix postérieurs détruits : portefeuille identique à 10⁻¹² près</td><td>réussi</td></tr>
<tr><td>Respect des mandats</td><td>3 profils × 5 dates : règles respectées, portefeuille réalisable ; exclusions de Mateo</td><td>réussi</td></tr>
<tr><td>Vérificateur</td><td>Nombres libres, jetons inconnus, mandats invalides rejetés ; gabarits acceptés</td><td>réussi</td></tr>
<tr><td><b>Total unitaire</b></td><td><code>python -m unittest discover -s tests</code></td><td><b>12 tests</b></td></tr>
<tr><td>Bout en bout AWS</td><td>Pile dédiée, testeur indépendant : contrats HTTP et parcours navigateur (Robert refusé, reçu, triche rejetée, adaptation, voyage dans le temps, mandat sur mesure, mobile)</td><td><b>8/8</b> HTTP, <b>7/7</b> navigateur</td></tr>
<tr><td>Robustesse</td><td>Fenêtre de volatilité 126 / 252 / 504 séances</td><td>≥ {sens} du portefeuille identique</td></tr></table>
<p class="cap" style="margin-top:1mm">Sources : <code>artifacts/e2e_report.md</code>, <code>artifacts/validation.json</code>, <code>tests/test_engine.py</code>. Le rapport E2E note aussi des anomalies mineures (libellés de boutons, tickers bruts dans un récit, tiroir de reçu plein écran à 390 px).</p>
</div>{footer(3, "Verity · note technique")}</div>"""

    P4 = f"""<div class="page">{dots(210, 24, [(196, 2, 12, .9), (170, -4, 10, .5)], seed=13)}{hd(4)}<div class="body">
<h2 style="margin-top:2mm">9. Faits, hypothèses, inconnues</h2>
<div class="cols3"><div class="card"><span class="tag f">Faits vérifiés</span><ul style="font-size:8pt;margin-top:1.5mm"><li>{nasset} actifs, {nsess:,} séances, du {d_from} au {d_to}.</li><li>Robert : volatilité {vol0} → {vol1}, {nviol} règles enfreintes, contre-proposition {wok}.</li><li>{nfacts} faits du cas Robert, chacun A = B.</li><li>12 tests unitaires ; E2E 8/8 et 7/7.</li><li>Déployé sur Lambda, API Gateway, Bedrock.</li></ul></div>
<div class="card"><span class="tag h">Hypothèses</span><ul style="font-size:8pt;margin-top:1.5mm"><li>Achat à la date de décision, puis conservation, sans frais ni impôt.</li><li>Volatilité sur 252 séances précédentes.</li><li>Plafonds des mandats : valeurs de démonstration.</li><li>Univers de 31 actifs représentatif pour la démonstration.</li></ul></div>
<div class="card"><span class="tag u">Inconnues</span><ul style="font-size:8pt;margin-top:1.5mm"><li>La tolérance réelle au risque d'un client, qu'un récit ne mesure pas.</li><li>Le comportement hors de l'échantillon : rien n'est prédit.</li><li>L'effet sur de vrais clients ou courtiers : non mesuré ; la valeur visée (explication auditable) reste un objectif.</li></ul></div></div>
<h2 style="margin-top:4mm">10. Limites honnêtes</h2>
<ul style="font-size:8.5pt"><li><b>Pas de point-in-time strict sur les prix</b> : les cours sont ajustés a posteriori (dividendes, fractionnements) ; seule l'absence de regard vers le futur est garantie et testée.</li>
<li><b>Biais du survivant</b> (univers choisi en 2026), chevauchement des FNB, {nasset} actifs seulement.</li>
<li><b>Pas de données ESG, de nouvelles ni de fondamentaux</b> : l'exclusion « Énergie » est un substitut simple, sans accusation de controverse.</li>
<li><b>Aucune prévision de rendement</b> et aucune performance future promise ; le « recul » décrit une période passée.</li>
<li><b>Latence</b> : la rédaction par Claude prend environ 18 s et la compilation d'un récit libre environ 9 s (mesures de déploiement), sous la limite de 29 s d'API Gateway ; un gabarit déterministe prend le relais si le modèle échoue.</li>
<li><b>Démo éphémère</b> : le compte AWS jetable expire le 16 novembre 2026 ; le film et les PDF restent les preuves durables.</li>
<li>La date de décision de l'étape 3 s'affiche « 1 janv. 2023 » alors que les reçus citent la séance du 30 déc. 2022 (dernière séance de l'année) : écart d'affichage constaté, sans effet sur les calculs.</li></ul>
<h2 style="margin-top:4mm">11. Pistes</h2>
<div class="cols2"><ul style="font-size:8.4pt"><li>ESG et fondamentaux depuis des sources publiques (SEDAR+, EDGAR).</li><li>Données point-in-time strictes (prix non révisés).</li><li>Frais, impôts, rééquilibrage dans la simulation.</li></ul>
<ul style="font-size:8.4pt"><li>Mandat multi-objectifs (achat à court terme et retraite).</li><li>Signature cryptographique des reçus pour un audit externe.</li><li>Évaluation de la compréhension par un panel de clients, seule façon de mesurer un bénéfice réel.</li></ul></div>
<div class="cols2" style="margin-top:4mm;grid-template-columns:1fr 1.2fr;align-items:center"><div style="display:flex;gap:4mm;align-items:center"><div style="width:30mm;border:.25mm solid #d9d4cf;padding:.8mm;background:#fff">{qr}</div><div style="font-size:8pt"><b>Essayer l'application</b><br>Parcours à partir de la plateforme (compte AWS jetable, en ligne jusqu'au 16 nov. 2026).<br><code style="font-size:6.4pt;word-break:break-all">{url}</code></div></div>
<div class="shot"><img src="{img_mandat_w}"></div></div>
<p class="cap" style="margin-top:2mm">Document produit par <code>scripts/build_docs.py</code> ; les chiffres viennent du registre de faits du moteur et des artefacts du dépôt. Captures prises sur l'application déployée.</p>
</div>{footer(4, "Verity · note technique")}</div>"""
    tech = f"<!doctype html><meta charset='utf-8'><title>Verity — Note technique</title><style>{CSS}</style>{P1}{P2}{P3}{P4}".replace(f"{nsess:,}", f"{nsess:,}".replace(",", "\u00a0"))
    op = op
    open(os.path.join(root, "docs", "Verity_documentation_technique.html"), "w").write(tech)
    open(os.path.join(root, "docs", "Verity_one_pager.html"), "w").write(op)


def pdf():
    os.environ.setdefault("PLAYWRIGHT_HOST_PLATFORM_OVERRIDE", "ubuntu24.04-x64")
    from playwright.sync_api import sync_playwright
    exe = glob.glob(os.path.expanduser("~/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell"))[0]
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe, args=["--no-sandbox", "--allow-file-access-from-files"])
        for n in ("Verity_documentation_technique", "Verity_one_pager"):
            pg = b.new_page()
            pg.goto("file://" + os.path.join(root, "docs", n + ".html"))
            pg.wait_for_timeout(500)
            pg.pdf(path=os.path.join(root, "docs", n + ".pdf"), format="A4", print_background=True, prefer_css_page_size=True)
            print("PDF", n)
        b.close()


if __name__ == "__main__":
    build()
    if "--pdf" in sys.argv:
        pdf()
