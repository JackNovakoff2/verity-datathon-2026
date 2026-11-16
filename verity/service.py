"""Orchestration : mandat → portefeuille → faits → récit vérifié. Renvoie un JSON prêt pour l'interface."""
import time, copy
from .data import dataset
from .mandate import PERSONAS, validate_mandate, check_rules, rule_text, category
from .construct import construct, sensitivity
from .governor import evaluate
from .facts import Ledger, fmt_pct
from .verify import check_text, facts_in

BENCH = {"XIU.TO": 0.30, "SPY": 0.30, "XBB.TO": 0.40}
BENCH_NAME = "mélange classique actions-obligations"
DEFAULT_ASOF = "2023-01-03"

SOURCES = [
    {"name": "Prix quotidiens ajustés (31 actifs)", "origin": "Yahoo Finance via le jeu de départ AlphaForge AI", "date": "extrait le 13 nov. 2026", "note": "dividendes et fractionnements inclus ; ajustés rétrospectivement"},
    {"name": "Taux de change USD/CAD", "origin": "Banque du Canada (Valet)", "date": "extrait le 13 nov. 2026", "note": "dernier taux connu à la date d'observation"},
    {"name": "Univers d'actifs", "origin": "assets_universe.csv du jeu de départ", "date": "choisi en 2026", "note": "biais du survivant possible"},
]
LIMITS = [
    "Simulation seulement : aucun ordre réel, aucun conseil financier personnalisé.",
    "Les prix sont ajustés après coup : ce ne sont pas des données « point-in-time » au sens strict, mais aucune donnée postérieure à la date de décision n'est utilisée pour construire le portefeuille.",
    "Les règles du mandat (plafonds, tolérances) sont des hypothèses de démonstration, pas des normes réglementaires.",
    "Portefeuille sans frais, sans impôt et sans rééquilibrage ; les rendements passés ne prédisent pas l'avenir.",
]


def _ws(w, d):
    rows = []
    for t, v in sorted(w.items(), key=lambda kv: -kv[1]):
        m = d.meta[t]
        rows.append({"ticker": t, "name": m["name"], "cls": category(t), "sector": m["sector"], "weight": round(v, 6)})
    return rows


def _series(wmap, i0, i1, step=5):
    d = dataset()
    out = {"dates": [], **{k: [] for k in wmap}}
    for k in list(range(i0, i1 + 1, step)) + ([i1] if (i1 - i0) % step else []):
        out["dates"].append(d.dates[k])
        for name, w in wmap.items():
            v = sum(wt * d.px[t][k] / d.px[t][i0] for t, wt in w.items())
            out[name].append(round(v * 100, 3))
    return out


def get_mandate(pid_or_mandate):
    if isinstance(pid_or_mandate, str):
        return copy.deepcopy(PERSONAS[pid_or_mandate])
    m = copy.deepcopy(pid_or_mandate)
    errs = validate_mandate(m)
    if errs:
        raise ValueError("; ".join(errs))
    return m


def analyze(pid, as_of=DEFAULT_ASOF, request=None, narrator=None):
    d = dataset()
    trace = []

    def step(agent, action, detail, t0):
        trace.append({"agent": agent, "action": action, "detail": detail, "ms": int((time.time() - t0) * 1000)})

    t0 = time.time()
    m = get_mandate(pid)
    i = d.i(as_of)
    E = len(d.dates) - 1
    step("Accueil", "Mandat chargé et validé par le schéma", f"{len(m['rules'])} règles · horizon {m['horizon_years']} ans", t0)
    t0 = time.time()
    res = construct(m, i)
    P = res["weights"]
    step("Constructeur", "Portefeuille construit avec les données jusqu'au " + d.dates[i],
         f"{len(P)} positions · croissance {res['growth']:.2f} · {res['tried']} essais · aucune donnée après la décision", t0)

    t0 = time.time()
    L = Ledger()
    i0 = max(i - 252, 0)
    L.vol("p_trail", "Volatilité annuelle du portefeuille sur les 252 séances précédentes", P, i0, i)
    L.mdd("p_hist", "Pire baisse historique du portefeuille avant la décision", P, 0, i)
    for r in m["rules"]:
        lim = r["limit"]
        L.exact(f"rule:{r['id']}:limit", f"Limite fixée par le mandat : {rule_text(r)}", lim,
                (f"{int(lim)}" if r["type"] == "min_positions" else fmt_pct(lim, nd=0 if lim * 100 == int(lim * 100) else 1)), "pct",
                {"source": "mandat confirmé par l'utilisateur"}, "Valeur saisie ou confirmée dans le mandat ; non calculée.", kind="mandate")
    L.exact("n_rules", "Nombre de règles du mandat", len(m["rules"]), str(len(m["rules"])), "count", {}, "Dénombrement.", kind="mandate")
    L.exact("n_pos", "Nombre de positions", len(P), str(len(P)), "count", {"weights": {k: round(v, 4) for k, v in P.items()}}, "Positions de poids supérieur à 0,0001.")
    L.exact("growth", "Niveau de croissance retenu", res["growth"], fmt_pct(res["growth"], nd=0), "pct", {}, "Plus haut curseur respectant toutes les règles du mandat.")
    top = sorted(P.items(), key=lambda kv: -kv[1])[:3]
    for t, v in top:
        L.exact(f"w:{t}", f"Poids de {d.meta[t]['name']}", v, fmt_pct(v), "pct", {"ticker": t}, "Poids à la date de décision.")
    bonds = sum(v for t, v in P.items() if category(t) == "bonds")
    L.exact("w:bonds", "Part d'obligations", bonds, fmt_pct(bonds, nd=0), "pct", {}, "Somme des poids des FNB obligataires.")
    step("Analyste", "Faits calculés par deux implémentations indépendantes", f"{len(L.facts)} faits, {sum(1 for f in L.facts.values() if f['verified'])} concordants", t0)

    # 2022 : actions et obligations ont baissé ensemble
    sentences_2022 = False
    a22, b22 = d.i("2022-01-03", "ge"), d.i("2022-12-30")
    D22A, D22B = d.dates[a22], d.dates[b22]
    if i >= b22:
        sentences_2022 = True
        L.ret("spy22", "Rendement de SPY du 3 janv. au 30 déc. 2022", {"SPY": 1.0}, a22, b22)
        L.ret("xbb22", "Rendement de XBB.TO du 3 janv. au 30 déc. 2022", {"XBB.TO": 1.0}, a22, b22)
        L.corr("spy_xbb22", "Corrélation SPY / XBB.TO en 2022", "SPY", "XBB.TO", a22, b22)
        L.ret("p22", "Rendement du portefeuille rejoué sur 2022", P, a22, b22)
        L.ret("b22", f"Rendement du {BENCH_NAME} rejoué sur 2022", BENCH, a22, b22)
        L.mdd("p22", "Pire baisse du portefeuille rejoué sur 2022", P, a22, b22)
        L.mdd("b22", f"Pire baisse du {BENCH_NAME} sur 2022", BENCH, a22, b22)
    wf = None
    if i < E - 60:
        L.ret("p_wf", "Rendement du portefeuille de la décision à aujourd'hui", P, i, E)
        L.cagr("p_wf", "Rendement annualisé du portefeuille", P, i, E)
        L.mdd("p_wf", "Pire baisse du portefeuille depuis la décision", P, i, E)
        L.ret("b_wf", f"Rendement du {BENCH_NAME}", BENCH, i, E)
        L.mdd("b_wf", f"Pire baisse du {BENCH_NAME}", BENCH, i, E)
        wf = True
    t0 = time.time()
    sens = sensitivity(m, i, P)
    smin = min(s["overlap"] for s in sens)
    L.exact("sens_min", "Part du portefeuille inchangée dans le pire test de sensibilité", smin, fmt_pct(smin, nd=0), "pct",
            {"tests": [{"label": s["label"], "overlap": round(s["overlap"], 4)} for s in sens]}, "Chevauchement Σ min(poids A, poids B) entre le portefeuille de base et chaque variante.")
    step("Auditeur de sensibilité", "Hypothèses modifiées", f"{len(sens)} variantes · recouvrement minimal {smin:.0%}", t0)

    gov = None
    wmap = {"portefeuille": P, "reference": BENCH}
    if request:
        t0 = time.time()
        tk, wt = request["ticker"], float(request["weight"])
        g = evaluate(m, P, i, tk, wt)
        R, C = g["request"], g["counter"]
        L.exact("req:w", f"Pondération demandée pour {d.meta[tk]['name']}", wt, fmt_pct(wt, nd=0), "pct", {"ticker": tk}, "Saisie de l'utilisateur (hypothèse).", kind="request")
        L.vol("req_trail", "Volatilité annuelle du portefeuille avec la demande", R, i0, i)
        L.mdd("req_hist", "Pire baisse historique avec la demande", R, 0, i)
        L.risk_share("req", f"Part du risque due à {d.meta[tk]['name']} avec la demande", R, tk, i0, i)
        L.mdd("tk_hist", f"Pire baisse historique de {d.meta[tk]['name']} seul", {tk: 1.0}, 0, i)
        L.exact("w_ok", f"Poids maximal de {d.meta[tk]['name']} compatible avec le mandat", g["max_ok_weight"], fmt_pct(g["max_ok_weight"]), "pct", {"ticker": tk}, "Recherche dichotomique du plus grand poids qui respecte toutes les règles.")
        if i < E - 60:
            L.ret("req_wf", "Rendement de la demande de la décision à aujourd'hui", R, i, E)
            L.mdd("req_wf", "Pire baisse de la demande depuis la décision", R, i, E)
            L.ret("ctr_wf", "Rendement de la contre-proposition", C, i, E)
            L.mdd("ctr_wf", "Pire baisse de la contre-proposition", C, i, E)
        wmap["demande"] = R
        wmap["contre_proposition"] = C
        gov = {"ticker": tk, "name": d.meta[tk]["name"], "weight": wt, "verdict": "refusée" if g["violations"] else "acceptée",
               "violations": [{"id": c["id"], "text": c["text"], "display": c["display"]} for c in g["violations"]],
               "max_ok_weight": g["max_ok_weight"], "counter": _ws(C, d), "request_weights": _ws(R, d),
               "counter_checks": [{"id": c["id"], "text": c["text"], "ok": c["ok"], "display": c["display"]} for c in g["counter_checks"]]}
        step("Gouverneur", f"Demande « {wt:.0%} {tk} » confrontée au mandat",
             f"{len(g['violations'])} règle(s) enfreinte(s) · poids maximal conforme {g['max_ok_weight']:.1%}", t0)

    t0 = time.time()
    ctx = {"m": m, "as_of": d.dates[i], "last": d.dates[E], "P": P, "res": res, "L": L, "top": top, "gov": gov,
           "y22": sentences_2022, "d22a": d.dates[a22], "d22b": d.dates[b22], "wf": wf, "request": request, "sens": sens}
    sections = narrate_template(ctx)
    mode = "gabarit déterministe"
    if narrator:
        try:
            alt = narrator(ctx, sections)
            for n in alt.get("notes", []):
                trace.append({"agent": "Narrateur", "action": "Essai du modèle", "detail": n, "ms": 0})
            if alt.get("sections"):
                sections, mode = alt["sections"], "agent Claude (Bedrock), vérifié"
        except Exception as e:  # le repli ne doit jamais casser la démo
            trace.append({"agent": "Narrateur", "action": "Repli sur le gabarit", "detail": str(e)[:160], "ms": 0})
    sections = finalize(sections, L.facts)
    step("Narrateur", "Récit rédigé (" + mode + ")", f"{sum(len(s['sentences']) for s in sections)} phrases", t0)
    t0 = time.time()
    bad = sum(1 for s in sections for x in s["sentences"] if not x["ok"])
    step("Vérificateur", "Chaque nombre du texte relié à un fait vérifié", f"{bad} phrase(s) rejetée(s)", t0)

    series = _series(wmap, i, E, 5) if i < E - 60 else None
    used = set(f for s in sections for x in s["sentences"] for f in x["facts"])
    return {
        "mandate": {"id": m.get("id"), "name": m["name"], "age": m.get("age"), "job": m.get("job"), "horizon_years": m["horizon_years"], "story": m.get("story", ""),
                    "rules": [{"id": r["id"], "text": rule_text(r)} for r in m["rules"]]},
        "as_of": d.dates[i], "last_date": d.dates[E], "calendar": {"first": d.dates[0], "last": d.dates[-1], "sessions": len(d.dates)},
        "portfolio": {"weights": _ws(P, d), "growth": res["growth"], "feasible": res["feasible"]},
        "checks": [{"id": c["id"], "text": c["text"], "ok": c["ok"], "display": c["display"]} for c in res["checks"]],
        "sections": sections, "facts": {k: L.facts[k] for k in sorted(used | {"p_trail", "p_hist"}) if k in L.facts},
        "series": series, "sensitivity": [{"label": s["label"], "overlap": round(s["overlap"], 4), "feasible": s["feasible"]} for s in sens],
        "governance": gov, "trace": trace, "narration_mode": mode, "sources": SOURCES, "limits": LIMITS,
        "bench": {"name": BENCH_NAME, "weights": BENCH},
    }


def finalize(sections, facts):
    for s in sections:
        out = []
        for t in s["sentences"]:
            text = t if isinstance(t, str) else t["text"]
            ok, issues, rendered = check_text(text, facts)
            out.append({"text": text, "rendered": rendered if ok else None, "ok": ok, "issues": issues, "facts": facts_in(text)})
        s["sentences"] = [x for x in out if x["ok"]] + [x for x in out if not x["ok"]]
    return sections


def name_of(t):
    n = dataset().meta[t]["name"]
    return t if any(ch.isdigit() for ch in n) else n


def narrate_template(c):
    m, L, P = c["m"], c["L"], c["P"]
    nm = m["name"]
    asof = "{{d:" + c["as_of"] + "}}"
    secs = []
    secs.append({"title": "Le mandat, traduit en règles", "sentences": [
        f"À partir de l'histoire de {nm}, l'agent d'accueil a codé {{{{n_rules}}}} règles vérifiables que {nm} peut relire et corriger avant toute simulation.",
        f"L'horizon de placement de {nm} guide la prudence de ces règles : plus il est court, plus les baisses tolérées sont serrées."]})
    tops = ", ".join(f"{name_of(t)} ({'{{w:' + t + '}}'})" for t, _ in c["top"])
    ps = [f"À la date de décision, le {asof}, le portefeuille compte {{{{n_pos}}}} positions ; les trois plus importantes sont {tops}.",
          "Sa volatilité annuelle, mesurée sur l'année qui précède, est de {{vol:p_trail}}" + (", sous le plafond de {{rule:vol:limit}} fixé par le mandat." if "rule:vol:limit" in L.facts else "."),
          "Dans le pire des cas observés avant cette date, il aurait connu une baisse de {{mdd:p_hist}}" + (", pour une tolérance de {{rule:mdd:limit}}." if "rule:mdd:limit" in L.facts else "."),
          ("Le niveau de croissance a été monté jusqu'à {{growth}} de l'échelle, le point au-delà duquel au moins une règle du mandat n'aurait plus été respectée." if c["res"]["growth"] < 0.995 else "Le niveau de croissance a pu être poussé au maximum de l'échelle : aucune règle du mandat ne l'en empêchait.")]
    if any(category(t) == "bonds" for t in P):
        ps.append("Les obligations pèsent {{w:bonds}} du portefeuille.")
    secs.append({"title": "Le portefeuille simulé", "sentences": ps})
    if c["y22"]:
        secs.append({"title": "Ce que l'année difficile nous apprend", "sentences": [
            "Du {{d:" + c["d22a"] + "}} au {{d:" + c["d22b"] + "}}, les actions américaines (SPY) ont fait {{ret:spy22}} et les obligations canadiennes (XBB) {{ret:xbb22}} : les deux ont baissé ensemble, avec une corrélation de {{corr:spy_xbb22}}.",
            "Rejoué sur cette période, le portefeuille aurait fait {{ret:p22}}, avec une pire baisse de {{mdd:p22}}, contre {{ret:b22}} et {{mdd:b22}} pour un " + BENCH_NAME + "."]})
    if c["wf"]:
        secs.append({"title": "Ce qui s'est passé ensuite", "sentences": [
            "Du {{d:" + c["as_of"] + "}} au {{d:" + c["last"] + "}}, le portefeuille a fait {{ret:p_wf}} (soit {{cagr:p_wf}} par an), avec une pire baisse de {{mdd:p_wf}}.",
            "Sur la même période, le " + BENCH_NAME + " a fait {{ret:b_wf}}, avec une pire baisse de {{mdd:b_wf}}.",
            "Ce résultat décrit une période passée ; il ne prédit rien."]})
    secs.append({"title": "Robustesse", "sentences": [
        "En changeant la fenêtre qui sert à mesurer la volatilité, au moins {{sens_min}} du portefeuille reste identique."]})
    if c["gov"]:
        g = c["gov"]
        tk = g["ticker"]
        nmk = g["name"]
        gs = ["Le gouverneur compare la demande ({{req:w}} du portefeuille sur le titre " + nmk + ") aux règles du mandat avant toute simulation."]
        if g["violations"]:
            gs.append("La demande est refusée : elle enfreint des règles que " + nm + " a lui-même confirmées.")
            gs.append("La volatilité du portefeuille passerait de {{vol:p_trail}} à {{vol:req_trail}}" + (", pour un plafond de {{rule:vol:limit}}." if "rule:vol:limit" in L.facts else "."))
            gs.append("Ce titre représenterait à lui seul {{risk:req:" + tk + "}} du risque du portefeuille.")
            gs.append("Avant cette date, ce titre seul avait déjà subi une baisse de {{mdd:tk_hist}}.")
            if g["max_ok_weight"] < 0.0005:
                gs.append("Aucun poids n'est compatible avec le mandat pour ce titre : la contre-proposition est de ne pas l'acheter.")
            else:
                gs.append("Le plus grand poids compatible avec le mandat est {{w_ok}} : c'est la contre-proposition.")
            if "ret:req_wf" in L.facts:
                gs.append("Avec le recul, la demande a rapporté {{ret:req_wf}}, mais en passant par une baisse de {{mdd:req_wf}} ; la contre-proposition a fait {{ret:ctr_wf}}, avec une baisse de {{mdd:ctr_wf}}.")
                gs.append("Choisir après coup le titre qui a gagné n'est pas une stratégie : au moment de la décision, rien ne garantissait ce résultat.")
        else:
            gs.append("La demande respecte toutes les règles du mandat.")
        secs.append({"title": "Gouverneur : la demande face au mandat", "sentences": gs})
    return secs
