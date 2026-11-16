"""Chargement du jeu de données officiel (starter AlphaForge) et alignement CAD.

Tout est en Python pur (aucune dépendance) pour tourner tel quel dans une Lambda.
Les prix sont des clôtures ajustées (dividendes et fractionnements) ; les titres
en USD sont convertis en CAD au dernier taux Banque du Canada connu à la date.
"""
import csv, hashlib, os, bisect

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
_CACHE = {}


def _read(name):
    with open(os.path.join(DATA_DIR, name), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def file_sha256(name):
    h = hashlib.sha256()
    with open(os.path.join(DATA_DIR, name), "rb") as f:
        h.update(f.read())
    return h.hexdigest()


class Dataset:
    def __init__(self):
        meta_rows = _read("assets_universe.csv")
        self.meta = {r["ticker"]: {"id": r["asset_id"], "name": r["name"], "cls": r["asset_class"],
                                   "market": r["market"], "ccy": r["currency"], "sector": r["sector"]}
                     for r in meta_rows}
        self.tickers = [r["ticker"] for r in meta_rows]
        fx_rows = _read("fx_usdcad_daily.csv")
        fx_dates = [r["date"] for r in fx_rows]
        fx_vals = [float(r["usdcad"]) for r in fx_rows]
        raw = {t: {} for t in self.tickers}
        for r in _read("prices_daily.csv"):
            raw[r["ticker"]][r["date"]] = float(r["adj_close"])
        # calendrier commun = intersection des dates observées pour les 31 actifs (pas de remplissage de prix)
        common = None
        for t in self.tickers:
            s = set(raw[t])
            common = s if common is None else common & s
        self.dates = sorted(common)
        self.px = {}
        for t in self.tickers:
            col = []
            for d in self.dates:
                p = raw[t][d]
                if self.meta[t]["ccy"] == "USD":
                    i = bisect.bisect_right(fx_dates, d) - 1
                    p = p * fx_vals[max(i, 0)]
                col.append(p)
            self.px[t] = col
        self.idx = {d: i for i, d in enumerate(self.dates)}
        self.raw_rows = {t: len(raw[t]) for t in self.tickers}
        self.sha = {n: file_sha256(n) for n in ("prices_daily.csv", "fx_usdcad_daily.csv", "assets_universe.csv")}

    def i(self, date, side="le"):
        """Indice de séance pour une date (la dernière séance <= date, ou la première >= date)."""
        if date in self.idx:
            return self.idx[date]
        k = bisect.bisect_right(self.dates, date)
        return max(k - 1, 0) if side == "le" else min(k, len(self.dates) - 1)

    def rets(self, t, i0, i1):
        """Rendements simples quotidiens de la séance i0+1 à i1."""
        p = self.px[t]
        return [p[k] / p[k - 1] - 1.0 for k in range(i0 + 1, i1 + 1)]


def dataset():
    if "d" not in _CACHE:
        _CACHE["d"] = Dataset()
    return _CACHE["d"]
