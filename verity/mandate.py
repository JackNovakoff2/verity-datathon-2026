"""Mandat d'investissement « as code » : des règles vérifiables, lisibles par un humain."""
from .data import dataset
from . import facts as F

SLEEVES = ("stocks", "etf_eq", "bonds", "gold", "crypto")


def category(t):
    c = dataset().meta[t]["cls"]
    return {"equity": "stocks", "etf_equity": "etf_eq", "etf_bond": "bonds", "etf_commodity": "gold", "crypto": "crypto"}[c]


def scope_members(scope):
    d = dataset()
    if scope == "single":
        return [t for t in d.tickers if category(t) == "stocks"]
    if scope in SLEEVES:
        return [t for t in d.tickers if category(t) == scope]
    if scope.startswith("sector:"):
        s = scope[7:]
        return [t for t in d.tickers if d.meta[t]["sector"] == s]
    if scope.startswith("ticker:"):
        return [scope[7:]]
    raise ValueError(scope)


PERSONAS = {
    "amira": {
        "id": "amira", "name": "Amira", "age": 26, "job": "ingénieure logiciel", "horizon_years": 15,
        "prefs": {"sectors": {"Information Technology": 4.0, "Communication Services": 3.0, "Consumer Discretionary": 2.0}, "tickers": {"QQQ": 2.0, "BTC-USD": 1.5}},
        "story": "Je veux faire croître mon capital sur 15 ans. J'aime l'IA et les technologies émergentes, "
                 "je supporte les fortes variations et la crypto m'intéresse, mais je ne veux pas tout miser sur la techno.",
        "rules": [
            {"id": "vol", "type": "max_vol", "limit": 0.22, "text": "Volatilité annuelle d'au plus {limit}"},
            {"id": "single", "type": "max_weight", "scope": "single", "limit": 0.12, "text": "Aucun titre individuel au-delà de {limit}"},
            {"id": "tech", "type": "max_weight", "scope": "sector:Information Technology", "limit": 0.30, "text": "Technologies de l'information : {limit} au plus (diversification)"},
            {"id": "crypto", "type": "max_weight", "scope": "crypto", "limit": 0.08, "text": "Crypto-actifs : {limit} au plus"},
            {"id": "mdd", "type": "max_drawdown", "limit": 0.35, "text": "Baisse historique maximale tolérée : {limit}"},
            {"id": "pos", "type": "min_positions", "limit": 10, "text": "Au moins {limit_i} positions"},
        ],
    },
    "mateo": {
        "id": "mateo", "name": "Mateo", "age": 41, "job": "directeur des opérations", "horizon_years": 10,
        "prefs": {"sectors": {"Health Care": 1.5, "Utilities": 1.5, "Industrials": 1.3}, "tickers": {"ESGV": 2.0}},
        "story": "Je veux une croissance équilibrée sur 8 à 12 ans. Les critères ESG comptent beaucoup pour moi : "
                 "pas d'entreprises dans de grosses controverses, et peu d'intérêt pour la spéculation.",
        "rules": [
            {"id": "vol", "type": "max_vol", "limit": 0.13, "text": "Volatilité annuelle d'au plus {limit}"},
            {"id": "single", "type": "max_weight", "scope": "single", "limit": 0.07, "text": "Aucun titre individuel au-delà de {limit}"},
            {"id": "energy", "type": "max_weight", "scope": "sector:Energy", "limit": 0.0, "text": "Aucun titre du secteur Énergie (préférence ESG)"},
            {"id": "spec", "type": "max_weight", "scope": "crypto", "limit": 0.0, "text": "Aucun crypto-actif (peu d'intérêt pour la spéculation)"},
            {"id": "tsla", "type": "max_weight", "scope": "ticker:TSLA", "limit": 0.0, "text": "Pas de Tesla (titre jugé spéculatif pour ce mandat)"},
            {"id": "esg", "type": "min_weight", "scope": "ticker:ESGV", "limit": 0.15, "text": "Au moins {limit} dans le fonds filtré ESG (ESGV)"},
            {"id": "bonds", "type": "min_weight", "scope": "bonds", "limit": 0.25, "text": "Au moins {limit} en obligations"},
            {"id": "mdd", "type": "max_drawdown", "limit": 0.18, "text": "Baisse historique maximale tolérée : {limit}"},
        ],
    },
    "robert": {
        "id": "robert", "name": "Robert", "age": 59, "job": "professionnel de la santé", "horizon_years": 4,
        "prefs": {"sectors": {"Health Care": 1.5, "Consumer Staples": 1.5, "Financials": 1.3, "Utilities": 1.3}},
        "story": "Je pense à la retraite d'ici quelques années. Je veux protéger mon capital tout en gardant un peu de croissance, "
                 "avec des entreprises établies que je comprends. Pas de crypto.",
        "rules": [
            {"id": "vol", "type": "max_vol", "limit": 0.085, "text": "Volatilité annuelle d'au plus {limit}"},
            {"id": "single", "type": "max_weight", "scope": "single", "limit": 0.05, "text": "Aucun titre individuel au-delà de {limit}"},
            {"id": "crypto", "type": "max_weight", "scope": "crypto", "limit": 0.0, "text": "Aucun crypto-actif"},
            {"id": "tsla", "type": "max_weight", "scope": "ticker:TSLA", "limit": 0.0, "text": "Pas de titre à la réputation très spéculative (Tesla)"},
            {"id": "bonds", "type": "min_weight", "scope": "bonds", "limit": 0.40, "text": "Au moins {limit} en obligations"},
            {"id": "mdd", "type": "max_drawdown", "limit": 0.10, "text": "Baisse historique maximale tolérée : {limit}"},
        ],
    },
}


def rule_text(r):
    lim = r.get("limit", 0)
    pct = f"{lim * 100:.0f} %".replace(".", ",") if lim >= 0.01 or lim == 0 else F.fmt_pct(lim)
    if r["type"] == "max_vol":
        pct = F.fmt_pct(lim)
    if r["type"] == "min_positions":
        pct = str(int(lim))
    return r["text"].replace("{limit}", pct).replace("{limit_i}", str(int(lim)))


def validate_mandate(m):
    """Schéma strict : toute sortie d'agent (ou saisie) doit passer ici avant d'être utilisée."""
    ok_types = {"max_vol", "max_weight", "min_weight", "max_drawdown", "min_positions"}
    d = dataset()
    errs = []
    if not isinstance(m, dict) or not isinstance(m.get("rules"), list) or not m["rules"]:
        return ["mandat vide"]
    seen = set()
    for r in m["rules"]:
        if r.get("type") not in ok_types:
            errs.append(f"type inconnu : {r.get('type')}")
            continue
        if r.get("id") in seen:
            errs.append(f"id en double : {r.get('id')}")
        seen.add(r.get("id"))
        lim = r.get("limit")
        if not isinstance(lim, (int, float)) or lim < 0 or (r["type"] != "min_positions" and lim > 1):
            errs.append(f"limite invalide pour {r.get('id')}")
        if r["type"] in ("max_weight", "min_weight"):
            try:
                scope_members(r.get("scope", ""))
            except Exception:
                errs.append(f"portée inconnue : {r.get('scope')}")
            else:
                if r["scope"].startswith("ticker:") and r["scope"][7:] not in d.meta:
                    errs.append(f"titre inconnu : {r['scope']}")
        if not r.get("text"):
            errs.append(f"texte manquant : {r.get('id')}")
    return errs


def check_rules(m, w, i_asof, led=None):
    """Évalue chaque règle sur un portefeuille. Renvoie la liste des contrôles, avec les faits associés."""
    d = dataset()
    out = []
    i0 = max(i_asof - 252, 0)
    for r in m["rules"]:
        t = r["type"]
        row = {"id": r["id"], "text": rule_text(r), "type": t, "limit": r["limit"]}
        if t in ("max_weight", "min_weight"):
            mem = scope_members(r["scope"])
            act = sum(w.get(x, 0.0) for x in mem)
            row["actual"] = act
            row["ok"] = act <= r["limit"] + 1e-6 if t == "max_weight" else act >= r["limit"] - 1e-6
            row["display"] = F.fmt_pct(act)
            row["members"] = mem if len(mem) <= 12 else mem[:12]
            if r["scope"] == "single":  # le plus gros titre individuel
                big = max(mem, key=lambda x: w.get(x, 0.0))
                row["actual"] = w.get(big, 0.0)
                row["ok"] = row["actual"] <= r["limit"] + 1e-6
                row["display"] = f"{F.fmt_pct(row['actual'])} ({big})"
                row["ticker"] = big
        elif t == "max_vol":
            a = F.a_vol(w, i0, i_asof)
            row.update(actual=a, ok=a <= r["limit"] + 1e-9, display=F.fmt_pct(a))
        elif t == "max_drawdown":
            a = -F.a_mdd(w, 0, i_asof)
            row.update(actual=a, ok=a <= r["limit"] + 1e-9, display=F.fmt_pct(a))
        elif t == "min_positions":
            n = sum(1 for v in w.values() if v >= 0.005)
            row.update(actual=n, ok=n >= r["limit"], display=str(n))
        out.append(row)
    return out
