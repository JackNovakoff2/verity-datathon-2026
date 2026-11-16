import csv, os, random, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from verity.data import dataset, DATA_DIR
from verity import facts as F
from verity.mandate import PERSONAS, check_rules, validate_mandate
from verity.construct import construct
from verity.governor import evaluate
from verity.verify import check_text
from verity import service


def raw(ticker, date):
    for r in csv.DictReader(open(os.path.join(DATA_DIR, "prices_daily.csv"))):
        if r["ticker"] == ticker and r["date"] == date:
            return float(r["adj_close"])


def fx(date):
    last = None
    for r in csv.DictReader(open(os.path.join(DATA_DIR, "fx_usdcad_daily.csv"))):
        if r["date"] <= date:
            last = float(r["usdcad"])
    return last


class DataTests(unittest.TestCase):
    def test_calendar(self):
        d = dataset()
        self.assertEqual((len(d.dates), d.dates[0], d.dates[-1]), (1228, "2021-11-12", "2026-11-12"))

    def test_usd_converted_to_cad_with_last_known_rate(self):
        d = dataset()
        dt = "2023-01-03"
        self.assertAlmostEqual(d.px["SPY"][d.idx[dt]], raw("SPY", dt) * fx(dt), places=6)
        self.assertAlmostEqual(d.px["XIU.TO"][d.idx[dt]], raw("XIU.TO", dt), places=6)


class FactTests(unittest.TestCase):
    def test_hand_computed_return(self):
        d = dataset()
        a, b = "2023-01-03", "2023-12-29"
        exp = (raw("SPY", b) * fx(b)) / (raw("SPY", a) * fx(a)) - 1
        got = F.a_ret({"SPY": 1.0}, d.idx[a], d.idx[b])
        self.assertAlmostEqual(got, exp, places=9)

    def test_two_implementations_agree_on_random_portfolios(self):
        d = dataset()
        rnd = random.Random(7)
        for _ in range(25):
            ts = rnd.sample(d.tickers, 5)
            ws = [rnd.random() for _ in ts]
            w = {t: x / sum(ws) for t, x in zip(ts, ws)}
            i0 = rnd.randrange(0, 600)
            i1 = i0 + rnd.randrange(100, 500)
            L = F.Ledger()
            for fid in (L.ret("x", "r", w, i0, i1), L.vol("x", "v", w, i0, i1), L.mdd("x", "m", w, i0, i1),
                        L.cagr("x", "c", w, i0, i1), L.worst("x", "w", w, i0, i1), L.risk_share("x", "s", w, ts[0], i0, i1),
                        L.corr("x", "k", ts[0], ts[1], i0, i1)):
                self.assertTrue(L.facts[fid]["verified"], fid)

    def test_ledger_flags_disagreement(self):
        L = F.Ledger()
        L.add("bad", "x", "t", 1.0, 1.1, "1", "pct", {}, "")
        self.assertFalse(L.facts["bad"]["verified"])


class MandateTests(unittest.TestCase):
    def test_personas_feasible_on_many_dates(self):
        d = dataset()
        for pid, m in PERSONAS.items():
            for dt in ("2022-12-01", "2023-01-03", "2024-03-01", "2025-06-02", "2026-11-12"):
                r = construct(m, d.i(dt))
                self.assertTrue(r["feasible"], (pid, dt))
                self.assertAlmostEqual(sum(r["weights"].values()), 1.0, places=6)
                self.assertTrue(all(c["ok"] for c in r["checks"]), (pid, dt, [c for c in r["checks"] if not c["ok"]]))

    def test_mateo_exclusions(self):
        d = dataset()
        r = construct(PERSONAS["mateo"], d.i("2023-01-03"))["weights"]
        for t in ("XOM", "ENB.TO", "CNQ.TO", "BTC-USD", "ETH-USD", "TSLA"):
            self.assertNotIn(t, r)
        self.assertGreaterEqual(r["ESGV"], 0.1499)

    def test_point_in_time_no_lookahead(self):
        d = dataset()
        i = d.i("2023-06-01")
        base = construct(PERSONAS["amira"], i)["weights"]
        saved = {t: list(v) for t, v in d.px.items()}
        try:
            rnd = random.Random(1)
            for t in d.px:
                for k in range(i + 1, len(d.dates)):
                    d.px[t][k] *= 0.2 + 3 * rnd.random()      # on détruit le futur
            again = construct(PERSONAS["amira"], i)["weights"]
        finally:
            d.px.update(saved)
        self.assertEqual({k: round(v, 12) for k, v in base.items()}, {k: round(v, 12) for k, v in again.items()})

    def test_schema_rejects_bad_mandates(self):
        self.assertTrue(validate_mandate({"rules": [{"id": "a", "type": "max_weight", "scope": "ticker:ZZZ", "limit": 0.1, "text": "x"}]}))
        self.assertTrue(validate_mandate({"rules": [{"id": "a", "type": "boom", "limit": 0.1, "text": "x"}]}))
        self.assertTrue(validate_mandate({"rules": []}))


class GovernorTests(unittest.TestCase):
    def test_robert_nvidia(self):
        d = dataset()
        m = PERSONAS["robert"]
        i = d.i("2023-01-03")
        base = construct(m, i)["weights"]
        g = evaluate(m, base, i, "NVDA", 0.5)
        self.assertGreaterEqual(len(g["violations"]), 3)
        self.assertTrue(all(c["ok"] for c in g["counter_checks"]))
        self.assertLess(g["max_ok_weight"], 0.05)


class VerifierTests(unittest.TestCase):
    def test_numbers_must_be_tokens(self):
        a = service.analyze("robert")
        facts = {k: v for k, v in a["facts"].items()}
        self.assertTrue(check_text("Volatilité {{vol:p_trail}}.", facts)[0])
        self.assertFalse(check_text("Volatilité 8 %.", facts)[0])
        self.assertFalse(check_text("Volatilité {{vol:zzz}}.", facts)[0])
        self.assertFalse(check_text("Au {{d:2023-01-01}}.", facts)[0])   # un dimanche : pas une séance

    def test_all_template_sentences_verified(self):
        for p in PERSONAS:
            a = service.analyze(p, request={"ticker": "NVDA", "weight": 0.3})
            self.assertTrue(all(x["ok"] for s in a["sections"] for x in s["sentences"]), p)
            self.assertTrue(all(f["verified"] for f in a["facts"].values()), p)


if __name__ == "__main__":
    unittest.main()
