"""Construction d'un portefeuille simulé SOUS un mandat, sans regarder au-delà de la date de décision.

Méthode (volontairement simple et explicable) :
 1. cinq poches (actions, FNB actions, obligations, or, crypto) ; un curseur de croissance g mélange un profil
    défensif et un profil croissance ;
 2. dans chaque poche, les titres admissibles pèsent l'inverse de leur volatilité (calculée sur 252 séances AVANT la date), plafonnés ;
 3. on retient le g le plus élevé pour lequel toutes les règles du mandat sont respectées.
"""
import math
from .data import dataset
from .mandate import SLEEVES, category, scope_members, check_rules
from . import facts as F

KEEP = {"stocks": 8, "etf_eq": 4, "bonds": 3, "gold": 1, "crypto": 2}
DEF = {"stocks": .05, "etf_eq": .15, "bonds": .65, "gold": .10, "crypto": 0.0}
GRO = {"stocks": .45, "etf_eq": .35, "bonds": .05, "gold": .05, "crypto": .10}


def _constraints(m):
    tcap, gcap, gmin = {}, [], []
    for r in m["rules"]:
        if r["type"] == "max_weight":
            mem = scope_members(r["scope"])
            if r["scope"] == "single" or r["scope"].startswith("ticker:"):
                for t in mem:
                    tcap[t] = min(tcap.get(t, 1.0), r["limit"])
            else:
                gcap.append((mem, r["limit"], r["scope"]))
        elif r["type"] == "min_weight":
            gmin.append((scope_members(r["scope"]), r["limit"], r["scope"]))
    return tcap, gcap, gmin


def _fill(names, invvol, total, cap):
    """Répartit `total` entre `names` au prorata de invvol, avec plafonds individuels (water-filling)."""
    w = {n: 0.0 for n in names}
    free = list(names)
    rest = total
    for _ in range(len(names) + 1):
        if not free or rest <= 1e-12:
            break
        s = sum(invvol[n] for n in free)
        capped = [n for n in free if w[n] + rest * invvol[n] / s > cap[n] + 1e-12]
        if not capped:
            for n in free:
                w[n] += rest * invvol[n] / s
            rest = 0.0
            break
        for n in capped:
            rest -= cap[n] - w[n]
            w[n] = cap[n]
            free.remove(n)
    return w, rest


def build(m, i_asof, g, window=252):
    d = dataset()
    i0 = max(i_asof - window, 0)
    tcap, gcap, gmin = _constraints(m)
    vol = {}
    for t in d.tickers:
        r = d.rets(t, i0, i_asof)
        mu = sum(r) / len(r)
        vol[t] = math.sqrt(sum((x - mu) ** 2 for x in r) / (len(r) - 1)) * math.sqrt(252)
    cap = {t: tcap.get(t, 1.0) for t in d.tickers}
    for mem, lim, _ in gcap:
        for t in mem:
            cap[t] = min(cap[t], lim if lim > 0 else 0.0)
    elig = {s: [t for t in d.tickers if category(t) == s and cap[t] > 1e-9] for s in SLEEVES}
    prefs = m.get("prefs", {})
    pm = {}
    for t in d.tickers:
        k = prefs.get("sectors", {}).get(d.meta[t]["sector"], 1.0) * prefs.get("tickers", {}).get(t, 1.0)
        pm[t] = k
    musts = {mem[0] for mem, lim, scope in gmin if scope.startswith("ticker:")}
    for s_ in SLEEVES:  # on retient les K meilleurs candidats par poche (préférence / volatilité)
        ranked = sorted(elig[s_], key=lambda t: -(pm[t] / vol[t]))
        keep = ranked[:KEEP[s_]]
        for t in elig[s_]:
            if t in musts and t not in keep:
                keep.append(t)
        elig[s_] = keep
    sl = {s: (1 - g) * DEF[s] + g * GRO[s] for s in SLEEVES}
    for s in SLEEVES:
        if not elig[s]:
            sl[s] = 0.0
    # contraintes de groupe portant sur une poche entière
    for mem, lim, scope in gcap:
        if scope in SLEEVES:
            sl[scope] = min(sl[scope], lim)
    for mem, lim, scope in gmin:
        if scope in SLEEVES:
            sl[scope] = max(sl[scope], lim)
    tot = sum(sl.values())
    sl = {s: v / tot for s, v in sl.items()}
    for mem, lim, scope in gmin:           # la normalisation a pu repasser sous le minimum
        if scope in SLEEVES and sl[scope] < lim:
            others = [s for s in SLEEVES if s != scope and sl[s] > 0]
            sc = (1 - lim) / sum(sl[s] for s in others)
            for s in others:
                sl[s] *= sc
            sl[scope] = lim
    for mem, lim, scope in gcap:
        if scope in SLEEVES and sl[scope] > lim + 1e-12:
            ex = sl[scope] - lim
            sl[scope] = lim
            others = [s for s in SLEEVES if s != scope and sl[s] > 0]
            for s in others:
                sl[s] += ex * sl[s] / sum(sl[x] for x in others)
    w = {}
    leftover = 0.0
    for s in SLEEVES:
        if sl[s] <= 0:
            continue
        part, rest = _fill(elig[s], {t: pm[t] / vol[t] for t in elig[s]}, sl[s], cap)
        w.update(part)
        leftover += rest
    # le surplus des poches saturées va aux FNB actions puis obligations puis actions (jamais aux poches plafonnées)
    for s in ("etf_eq", "bonds", "stocks"):
        if leftover <= 1e-12:
            break
        names = [t for t in elig[s] if w.get(t, 0) < cap[t] - 1e-12]
        if not names:
            continue
        room = {t: cap[t] - w.get(t, 0) for t in names}
        add, leftover = _fill(names, {t: pm[t] / vol[t] for t in names}, leftover, room)
        for t, v in add.items():
            w[t] = w.get(t, 0) + v
    # minimums par titre (ex. fonds ESG)
    for mem, lim, scope in gmin:
        if scope.startswith("ticker:"):
            t = mem[0]
            cur = w.get(t, 0.0)
            if cur < lim:
                others = [x for x in w if x != t and w[x] > 0 and category(x) in ("etf_eq", "stocks")]
                take = lim - cur
                base = sum(w[x] for x in others)
                for x in others:
                    w[x] -= take * w[x] / base
                w[t] = lim
    # plafonds de groupe (secteurs, crypto agrégée) par réduction proportionnelle
    for _ in range(6):
        changed = False
        for mem, lim, scope in gcap:
            if scope in SLEEVES:
                continue
            tot_g = sum(w.get(t, 0) for t in mem)
            if tot_g > lim + 1e-9:
                f = lim / tot_g if tot_g > 0 else 0
                ex = 0.0
                for t in mem:
                    if t in w:
                        ex += w[t] * (1 - f)
                        w[t] *= f
                outside = [t for t in elig["etf_eq"] + elig["bonds"] if t not in mem and w.get(t, 0) < cap[t] - 1e-12]
                if outside:
                    room = {t: cap[t] - w.get(t, 0) for t in outside}
                    add, rest = _fill(outside, {t: pm[t] / vol[t] for t in outside}, ex, room)
                    for t, v in add.items():
                        w[t] = w.get(t, 0) + v
                changed = True
        if not changed:
            break
    s = sum(w.values())
    return {t: v / s for t, v in w.items() if v / s > 1e-6}


def construct(m, i_asof, window=252, step=0.02):
    """Retient le curseur de croissance le plus élevé qui respecte toutes les règles."""
    best = None
    g = 1.0
    tried = 0
    while g >= -1e-9:
        w = build(m, i_asof, max(g, 0.0), window)
        checks = check_rules(m, w, i_asof)
        tried += 1
        if all(c["ok"] for c in checks):
            return {"weights": w, "growth": round(max(g, 0.0), 2), "feasible": True, "checks": checks, "tried": tried}
        if best is None:
            best = (w, checks)
        g -= step
    w = build(m, i_asof, 0.0, window)
    return {"weights": w, "growth": 0.0, "feasible": False, "checks": check_rules(m, w, i_asof), "tried": tried}


def overlap(a, b):
    return sum(min(a.get(t, 0), b.get(t, 0)) for t in set(a) | set(b))


def sensitivity(m, i_asof, base_w):
    out = []
    for win in (126, 252, 504):
        win_eff = min(win, i_asof)
        r = construct(m, i_asof, window=win_eff)
        out.append({"label": f"volatilité mesurée sur {win_eff} séances", "overlap": overlap(base_w, r["weights"]), "feasible": r["feasible"], "growth": r["growth"]})
    return out
