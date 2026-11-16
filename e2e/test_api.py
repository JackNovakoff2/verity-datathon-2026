"""Contrats HTTP contre une pile déployée : E2E_URL=https://... python -m unittest e2e.test_api -v"""
import json, os, unittest, urllib.request, urllib.error

URL = os.environ.get("E2E_URL", "").rstrip("/")


def call(path, body=None):
    req = urllib.request.Request(URL + path, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"content-type": "application/json"}, method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


@unittest.skipUnless(URL, "E2E_URL requis")
class Api(unittest.TestCase):
    def test_health(self):
        s, b = call("/api/health")
        self.assertEqual(s, 200)
        self.assertEqual(b["sessions"], 1228)

    def test_robert_nvidia_refused(self):
        s, a = call("/api/analyze", {"persona": "robert", "request": {"ticker": "NVDA", "weight": 0.5}})
        self.assertEqual(s, 200)
        g = a["governance"]
        self.assertEqual(g["verdict"], "refusée")
        self.assertGreaterEqual(len(g["violations"]), 3)
        self.assertLess(g["max_ok_weight"], 0.05)
        self.assertTrue(all(x["ok"] for sec in a["sections"] for x in sec["sentences"]))

    def test_every_displayed_fact_verified(self):
        for p in ("amira", "mateo", "robert"):
            s, a = call("/api/analyze", {"persona": p})
            self.assertEqual(s, 200)
            self.assertTrue(all(f["verified"] for f in a["facts"].values()))
            self.assertTrue(all(c["ok"] for c in a["checks"]))

    def test_personas_differ(self):
        _, a = call("/api/analyze", {"persona": "amira"})
        _, m = call("/api/analyze", {"persona": "mateo"})
        wa = {w["ticker"]: w["weight"] for w in a["portfolio"]["weights"]}
        wm = {w["ticker"]: w["weight"] for w in m["portfolio"]["weights"]}
        self.assertLessEqual(wa.get("BTC-USD", 0) + wa.get("ETH-USD", 0), 0.0801)
        for t in ("XOM", "ENB.TO", "CNQ.TO", "BTC-USD", "ETH-USD", "TSLA"):
            self.assertNotIn(t, wm)
        self.assertGreaterEqual(wm["ESGV"], 0.1499)

    def test_verifier_rejects_cheating(self):
        s, r = call("/api/verify", {"persona": "robert", "text": "Ce portefeuille a rendu +300 % sur la période."})
        self.assertFalse(r["ok"])
        s, r = call("/api/verify", {"persona": "robert", "text": "Volatilité : {{vol:inventé}}."})
        self.assertFalse(r["ok"])
        s, r = call("/api/verify", {"persona": "robert", "text": "Volatilité : {{vol:p_trail}}."})
        self.assertTrue(r["ok"])

    def test_point_in_time(self):
        _, a = call("/api/analyze", {"persona": "robert", "as_of": "2023-01-03"})
        _, b = call("/api/analyze", {"persona": "robert", "as_of": "2024-06-03"})
        self.assertNotEqual(a["portfolio"]["weights"], b["portfolio"]["weights"])
        self.assertEqual(a["as_of"], "2023-01-03")

    def test_bad_inputs(self):
        self.assertEqual(call("/api/analyze", {"persona": "x"})[0], 400)
        self.assertEqual(call("/api/analyze", {"persona": "robert", "as_of": "2021-12-01"})[0], 400)
        self.assertEqual(call("/api/compile", {"story": "court"})[0], 400)

    def test_custom_mandate_compiled(self):
        s, c = call("/api/compile", {"story": "J'ai 35 ans, deux enfants, je veux acheter une maison dans 3 ans et je ne supporte pas de perdre plus de 8 %."})
        self.assertEqual(s, 200)
        self.assertGreaterEqual(len(c["rules"]), 4)
        s, a = call("/api/analyze", {"mandate": c["mandate"]})
        self.assertEqual(s, 200)
        self.assertTrue(all(x["ok"] for x in a["checks"]))


if __name__ == "__main__":
    unittest.main()
