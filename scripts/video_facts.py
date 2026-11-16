"""Extrait de l'engin tous les chiffres montrés dans les scènes motion -> video/motion/facts.json."""
import csv, json, os, random, subprocess, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, root)
from verity.data import dataset, DATA_DIR
from verity.mandate import PERSONAS
from verity.construct import construct

S = json.load(open(os.path.join(root, "artifacts", "sample_robert_nvda.json")))
F = S["facts"]
d = dataset()
assets = list(csv.DictReader(open(os.path.join(DATA_DIR, "assets_universe.csv"))))

# destruction du futur (même logique que tests/test_engine.py::test_point_in_time_no_lookahead)
pid = "robert"
i = d.i(S["as_of"])
before = construct(PERSONAS[pid], i)["weights"]
saved = {t: list(v) for t, v in d.px.items()}
rnd = random.Random(1)
for t in d.px:
    for k in range(i + 1, len(d.dates)):
        d.px[t][k] *= 0.2 + 3 * rnd.random()
after = construct(PERSONAS[pid], i)["weights"]
d.px.update(saved)
top = sorted(before, key=lambda t: -before[t])[:6]
name = {a["ticker"]: a["name"] for a in assets}
diff = max(abs(before[t] - after.get(t, 0)) for t in before)

def units():
    out = subprocess.run([sys.executable, "-m", "pytest", "-q", "tests"], cwd=root, capture_output=True, text=True).stdout
    return int(out.strip().splitlines()[-1].split()[0])
e2e = sum(1 for l in open(os.path.join(root, "e2e", "README.md")) if l[:2].strip().rstrip(".").isdigit() and l[1:3] in (". ", "."))
grp = {"Actions canadiennes": 0, "Actions américaines": 0, "FNB d'actions": 0, "Obligations": 0, "Or": 0, "Cryptomonnaie": 0}
for a in assets:
    c, m = a["asset_class"], a["market"]
    k = ("Cryptomonnaie" if c == "crypto" else "Obligations" if c == "etf_bond" else "Or" if c == "etf_commodity"
         else "FNB d'actions" if c == "etf_equity" else "Actions canadiennes" if m == "TSX" else "Actions américaines")
    grp[k] += 1
spy = [r for r in csv.DictReader(open(os.path.join(DATA_DIR, "prices_daily.csv"))) if r["ticker"] == "SPY"]
spark = [float(r["adj_close"]) for r in spy[::5]]
b = S["bench"]["weights"]
facts = {
  "story": S["mandate"]["story"], "rules": [r["text"] for r in S["mandate"]["rules"]],
  "groups": grp, "spark": {"ticker": "SPY", "values": spark, "first": spy[0]["date"], "last": spy[-1]["date"]},
  "files": S["facts"]["n_pos"]["dataset"]["files"],
  "bench": {"bonds": round(sum(v for k, v in b.items() if k.startswith("XBB")) * 100), "equity": round(sum(v for k, v in b.items() if not k.startswith("XBB")) * 100)},
  "personas": {k: {"name": v["name"], "age": v["age"], "horizon": v["horizon_years"], "job": v["job"]} for k, v in PERSONAS.items()},
  "n_assets": len(assets), "classes": sorted({a["asset_class"] for a in assets}),
  "years": round((len(d.dates)) / 252), "sessions": S["calendar"]["sessions"],
  "first": S["calendar"]["first"], "last": S["calendar"]["last"], "as_of": S["as_of"],
  "robert": {"vol": F["vol:p_trail"]["display"], "vol_limit": F["rule:vol:limit"]["display"],
             "cagr": F["cagr:p_wf"]["display"], "mdd_hist": F["mdd:p_hist"]["display"],
             "vol_req": F["vol:req_trail"]["display"], "req_w": F["req:w"]["display"],
             "nvda_mdd": F["mdd:tk_hist"]["display"], "risk_share": F["risk:req:NVDA"]["display"],
             "n_pos": F["n_pos"]["display"], "a": F["vol:p_trail"]["impl_a"], "b": F["vol:p_trail"]["impl_b"],
             "ret22": F["ret:p22"]["display"], "ret22_bench": F["ret:b22"]["display"], "w_ok": F["w_ok"]["display"]},
  "violations": S["governance"]["violations"], "checks": [{"text": c["text"], "display": c["display"], "ok": c["ok"]} for c in S["checks"]],
  "trace": S["trace"], "limits": S["limits"], "sources": S["sources"],
  "future": {"as_of": S["as_of"], "top": [{"ticker": t, "name": name.get(t, t), "before": round(before[t] * 100, 1), "after": round(after.get(t, 0) * 100, 1)} for t in top],
             "max_abs_diff": diff, "n_positions": len(before)},
  "tests": {"unit": units(), "e2e": e2e},
  "aws": json.load(open(os.path.join(root, "artifacts", "deployment.json"))).get("region"),
}
json.dump(facts, open(os.path.join(root, "video", "motion", "facts.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps({k: facts[k] for k in ("n_assets", "classes", "years", "tests", "future")}, ensure_ascii=False, indent=1))
