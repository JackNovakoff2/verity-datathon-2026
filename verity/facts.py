"""Faits chiffrés et « reçus ».

Chaque fait est calculé deux fois par deux implémentations écrites séparément :
  A (lecture directe des séries) et B (formules algébriquement différentes).
Un fait n'est « vérifié » que si A et B concordent. Le texte affiché à l'utilisateur
ne contient jamais un nombre qui n'est pas un fait vérifié (voir verify.py).
"""
import math, itertools
from .data import dataset

TD = 252.0


def fmt_pct(x, signed=False, nd=1):
    s = f"{abs(x) * 100:.{nd}f}".replace(".", ",")
    sign = "−" if x < 0 else ("+" if signed else "")
    return f"{sign}{s} %"


# ---------- implémentation A ----------
def series_a(w, i0, i1):
    d = dataset()
    out = []
    for k in range(i0, i1 + 1):
        out.append(sum(wt * d.px[t][k] / d.px[t][i0] for t, wt in w.items()))
    return out


def dailyret_a(w, i0, i1):
    v = series_a(w, i0, i1)
    return [v[k] / v[k - 1] - 1 for k in range(1, len(v))]


def a_ret(w, i0, i1):
    v = series_a(w, i0, i1)
    return v[-1] / v[0] - 1


def a_vol(w, i0, i1):
    r = dailyret_a(w, i0, i1)
    m = sum(r) / len(r)
    return math.sqrt(sum((x - m) ** 2 for x in r) / (len(r) - 1)) * math.sqrt(TD)


def a_mdd(w, i0, i1):
    v = series_a(w, i0, i1)
    peak, worst = v[0], 0.0
    for x in v:
        peak = max(peak, x)
        worst = min(worst, x / peak - 1)
    return worst


def a_cagr(w, i0, i1):
    yrs = (i1 - i0) / TD
    return (1 + a_ret(w, i0, i1)) ** (1 / yrs) - 1


def a_worst(w, i0, i1, n):
    v = series_a(w, i0, i1)
    best = (float('inf'), n)
    for k in range(n, len(v)):
        r = v[k] / v[k - n] - 1
        if r < best[0]:
            best = (r, k)
    return best[0], i0 + best[1] - n, i0 + best[1]


def a_risk_share(w, t, i0, i1):
    d = dataset()
    v = series_a(w, i0, i1)
    rp = [v[k] / v[k - 1] - 1 for k in range(1, len(v))]
    ci = [w[t] * (d.px[t][i0 + k] - d.px[t][i0 + k - 1]) / d.px[t][i0] / v[k - 1] for k in range(1, len(v))]
    mp, mc = sum(rp) / len(rp), sum(ci) / len(ci)
    cov = sum((a - mc) * (b - mp) for a, b in zip(ci, rp))
    var = sum((b - mp) ** 2 for b in rp)
    return cov / var


def a_corr(t1, t2, i0, i1):
    x, y = dataset().rets(t1, i0, i1), dataset().rets(t2, i0, i1)
    mx, my = sum(x) / len(x), sum(y) / len(y)
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    return sxy / math.sqrt(sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y))


# ---------- implémentation B (indépendante) ----------
def b_ret(w, i0, i1):
    d = dataset()
    return math.fsum(wt * d.px[t][i1] / d.px[t][i0] for t, wt in w.items()) - 1.0


def _b_values(w, i0, i1):
    d = dataset()
    return [math.fsum(wt * d.px[t][k] / d.px[t][i0] for t, wt in w.items()) for k in range(i0, i1 + 1)]


def b_vol(w, i0, i1):
    v = _b_values(w, i0, i1)
    lr = [math.log(b / a) for a, b in zip(v, v[1:])]          # rendements logarithmiques
    n = len(lr)
    # variance des rendements simples via moments : on convertit par développement d'ordre 2
    r = [math.expm1(x) for x in lr]
    s1, s2 = math.fsum(r), math.fsum(x * x for x in r)
    var = (s2 - s1 * s1 / n) / (n - 1)
    return math.sqrt(var * TD)


def b_mdd(w, i0, i1):
    v = _b_values(w, i0, i1)
    peaks = list(itertools.accumulate(v, max))
    return min(x / p - 1 for x, p in zip(v, peaks))


def b_cagr(w, i0, i1):
    yrs = (i1 - i0) / TD
    return math.exp(math.log1p(b_ret(w, i0, i1)) / yrs) - 1


def b_worst(w, i0, i1, n):
    v = _b_values(w, i0, i1)
    r = min(v[k] / v[k - n] - 1 for k in range(n, len(v)))
    return r


def b_risk_share(w, t, i0, i1):
    d = dataset()
    v = _b_values(w, i0, i1)
    n = len(v) - 1
    rp = [v[k] / v[k - 1] - 1 for k in range(1, n + 1)]
    ci = [w[t] * (d.px[t][i0 + k] / d.px[t][i0] - d.px[t][i0 + k - 1] / d.px[t][i0]) / v[k - 1] for k in range(1, n + 1)]
    exy = math.fsum(a * b for a, b in zip(ci, rp)) / n
    ex, ey = math.fsum(ci) / n, math.fsum(rp) / n
    exx = math.fsum(b * b for b in rp) / n
    return (exy - ex * ey) / (exx - ey * ey)


def b_corr(t1, t2, i0, i1):
    d = dataset()
    x = [d.px[t1][k] / d.px[t1][k - 1] - 1.0 for k in range(i0 + 1, i1 + 1)]
    y = [d.px[t2][k] / d.px[t2][k - 1] - 1.0 for k in range(i0 + 1, i1 + 1)]
    n = len(x)
    sx, sy = math.fsum(x), math.fsum(y)
    sxy = math.fsum(a * b for a, b in zip(x, y))
    sxx, syy = math.fsum(a * a for a in x), math.fsum(b * b for b in y)
    return (n * sxy - sx * sy) / math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy))


# ---------- registre de faits ----------
class Ledger:
    """Registre des faits d'une analyse. Chaque fait porte son reçu."""

    def __init__(self):
        self.facts = {}

    def _close(self, a, b):
        return abs(a - b) <= 1e-6 + 1e-6 * abs(a)

    def add(self, fid, label, kind, a, b, display, unit, inputs, method):
        ok = self._close(a, b)
        d = dataset()
        self.facts[fid] = {"id": fid, "label": label, "kind": kind, "value": a, "display": display, "unit": unit,
                           "impl_a": a, "impl_b": b, "verified": bool(ok), "inputs": inputs, "method": method,
                           "dataset": {"files": {k: v[:12] for k, v in d.sha.items()}, "calendar": f"{len(d.dates)} séances communes"}}
        return fid

    # --- constructeurs de faits
    def ret(self, key, label, w, i0, i1):
        d = dataset()
        a, b = a_ret(w, i0, i1), b_ret(w, i0, i1)
        return self.add(f"ret:{key}", label, "return", a, b, fmt_pct(a, True), "pct",
                        {"weights": _r(w), "from": d.dates[i0], "to": d.dates[i1]},
                        "Valeur finale / valeur initiale − 1, titres convertis en CAD, dividendes inclus (prix ajustés), sans frais.")

    def cagr(self, key, label, w, i0, i1):
        d = dataset()
        a, b = a_cagr(w, i0, i1), b_cagr(w, i0, i1)
        return self.add(f"cagr:{key}", label, "cagr", a, b, fmt_pct(a, True), "pct",
                        {"weights": _r(w), "from": d.dates[i0], "to": d.dates[i1]},
                        "Rendement annualisé = (1 + rendement total)^(252 / nombre de séances) − 1.")

    def vol(self, key, label, w, i0, i1):
        d = dataset()
        a, b = a_vol(w, i0, i1), b_vol(w, i0, i1)
        return self.add(f"vol:{key}", label, "volatility", a, b, fmt_pct(a), "pct",
                        {"weights": _r(w), "from": d.dates[i0], "to": d.dates[i1], "sessions": i1 - i0},
                        "Écart-type échantillonnal des rendements quotidiens × √252.")

    def mdd(self, key, label, w, i0, i1):
        d = dataset()
        a, b = a_mdd(w, i0, i1), b_mdd(w, i0, i1)
        return self.add(f"mdd:{key}", label, "drawdown", a, b, fmt_pct(a), "pct",
                        {"weights": _r(w), "from": d.dates[i0], "to": d.dates[i1]},
                        "Pire baisse depuis un sommet précédent, dans la période.")

    def worst(self, key, label, w, i0, i1, n=60):
        d = dataset()
        a, k0, k1 = a_worst(w, i0, i1, n)
        b = b_worst(w, i0, i1, n)
        return self.add(f"worst{n}:{key}", label, "worst_window", a, b, fmt_pct(a), "pct",
                        {"weights": _r(w), "from": d.dates[k0], "to": d.dates[k1], "window_sessions": n},
                        f"Pire rendement sur {n} séances consécutives dans la période.")

    def risk_share(self, key, label, w, t, i0, i1):
        d = dataset()
        a, b = a_risk_share(w, t, i0, i1), b_risk_share(w, t, i0, i1)
        return self.add(f"risk:{key}:{t}", label, "risk_share", a, b, fmt_pct(a, nd=0), "pct",
                        {"weights": _r(w), "ticker": t, "from": d.dates[i0], "to": d.dates[i1]},
                        "Part de la variance du portefeuille attribuable au titre (covariance de sa contribution avec le portefeuille ÷ variance).")

    def corr(self, key, label, t1, t2, i0, i1):
        d = dataset()
        a, b = a_corr(t1, t2, i0, i1), b_corr(t1, t2, i0, i1)
        return self.add(f"corr:{key}", label, "correlation", a, b, f"{a:.2f}".replace(".", ","), "ratio",
                        {"tickers": [t1, t2], "from": d.dates[i0], "to": d.dates[i1]},
                        "Corrélation de Pearson des rendements quotidiens (CAD).")

    def exact(self, fid, label, value, display, unit, inputs, method, kind="rule"):
        """Fait exact (somme de poids, comptage) : les deux implémentations sont arithmétiquement distinctes mais triviales."""
        return self.add(fid, label, kind, value, value, display, unit, inputs, method)


def _r(w):
    return {k: round(v, 4) for k, v in sorted(w.items(), key=lambda kv: -kv[1]) if v > 1e-9}
