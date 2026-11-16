"""Gouverneur : confronte une demande à un mandat, chiffre la tension, propose le plus petit écart conforme."""
from .data import dataset
from .mandate import check_rules, PERSONAS
from . import facts as F


def apply_request(base, ticker, weight):
    """Finance la demande en puisant d'abord dans les positions de croissance (actions, FNB actions, or, crypto), ensuite seulement dans les obligations."""
    from .mandate import category
    w = dict(base)
    need = weight - w.get(ticker, 0.0)
    if need <= 0:
        w[ticker] = weight
        return w
    for pool in (("stocks", "etf_eq", "gold", "crypto"), ("bonds",)):
        names = [t for t in w if t != ticker and category(t) in pool and w[t] > 0]
        avail = sum(w[t] for t in names)
        if avail <= 0 or need <= 1e-12:
            continue
        take = min(need, avail)
        for t in names:
            w[t] -= take * w[t] / avail
        need -= take
        w[ticker] = w.get(ticker, 0.0) + take
    s = sum(w.values())
    return {t: v / s for t, v in w.items() if v > 1e-9}


def evaluate(m, base, i_asof, ticker, weight):
    """Renvoie la demande, ses violations, et la plus grande pondération conforme."""
    req = apply_request(base, ticker, weight)
    checks = check_rules(m, req, i_asof)
    viol = [c for c in checks if not c["ok"]]
    lo, hi = 0.0, weight
    ok_w = None
    if not viol:
        ok_w = weight
    else:
        for _ in range(30):
            mid = (lo + hi) / 2
            c = check_rules(m, apply_request(base, ticker, mid), i_asof)
            if all(x["ok"] for x in c):
                lo = mid
            else:
                hi = mid
        ok_w = lo
    counter = apply_request(base, ticker, ok_w) if ok_w is not None else dict(base)
    return {"request": req, "checks": checks, "violations": viol, "max_ok_weight": ok_w, "counter": counter,
            "counter_checks": check_rules(m, counter, i_asof)}
