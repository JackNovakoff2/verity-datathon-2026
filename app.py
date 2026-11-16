"""Adaptateur HTTP : Lambda (API Gateway HTTP API v2) et serveur de développement identiques."""
import base64, json, mimetypes, os, sys, time, traceback
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from verity import service, agents
from verity.mandate import PERSONAS, rule_text, validate_mandate
from verity.data import dataset
from verity.verify import check_text

WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
_CACHE = {}


def _resp(code, body, ctype="application/json", b64=False, cache=None):
    h = {"content-type": ctype + ("; charset=utf-8" if ctype.startswith("text/") or ctype == "application/json" else ""),
         "x-content-type-options": "nosniff"}
    if cache:
        h["cache-control"] = cache
    return {"statusCode": code, "headers": h, "body": body, "isBase64Encoded": b64}


def _json(code, obj):
    return _resp(code, json.dumps(obj, ensure_ascii=False))


def _params(b):
    pid = b.get("persona") or "robert"
    mand = b.get("mandate")
    key_p = mand if mand else pid
    if not mand and pid not in PERSONAS:
        raise ValueError("persona inconnue")
    req = b.get("request")
    if req:
        t = req.get("ticker")
        if t not in dataset().meta:
            raise ValueError("titre inconnu")
        w = float(req.get("weight", 0))
        if not 0 < w <= 0.9:
            raise ValueError("pondération hors limites")
        req = {"ticker": t, "weight": w}
    as_of = b.get("as_of") or service.DEFAULT_ASOF
    if not (isinstance(as_of, str) and len(as_of) == 10 and as_of >= "2022-11-01"):
        raise ValueError("date de décision : au plus tôt le 2022-11-01 (il faut une année d'historique)")
    return key_p, as_of, req


def route(method, path, body):
    if path == "/api/health":
        d = dataset()
        return _json(200, {"ok": True, "sessions": len(d.dates), "first": d.dates[0], "last": d.dates[-1]})
    if path == "/api/personas" and method == "GET":
        return _json(200, [{"id": p["id"], "name": p["name"], "age": p["age"], "job": p["job"], "horizon_years": p["horizon_years"],
                            "story": p["story"], "rules": [{"id": r["id"], "text": rule_text(r)} for r in p["rules"]]} for p in PERSONAS.values()])
    if path == "/api/assets" and method == "GET":
        d = dataset()
        return _json(200, [{"ticker": t, "name": d.meta[t]["name"], "sector": d.meta[t]["sector"], "cls": d.meta[t]["cls"]} for t in d.tickers])
    if method != "POST":
        return _json(404, {"error": "introuvable"})
    b = json.loads(body or "{}")
    if path == "/api/analyze":
        p, as_of, req = _params(b)
        return _json(200, service.analyze(p, as_of, req))
    if path == "/api/narrate":
        p, as_of, req = _params(b)
        return _json(200, service.analyze(p, as_of, req, narrator=agents.narrate))
    if path == "/api/compile":
        story = (b.get("story") or "").strip()
        if len(story) < 20:
            return _json(400, {"error": "Décrivez votre situation en une ou deux phrases."})
        return _json(200, agents.compile_mandate(story))
    if path == "/api/verify":
        p, as_of, req = _params(b)
        a = service.analyze(p, as_of, req)
        facts = a["facts"]
        ok, issues, rendered = check_text(str(b.get("text", ""))[:600], facts)
        return _json(200, {"ok": ok, "issues": issues, "rendered": rendered if ok else None})
    return _json(404, {"error": "introuvable"})


def _static(path):
    # « / » = plateforme de courtage (hôte) ; l'application Verity autonome est sur /verity/
    rel = {"/": "broker.html", "": "broker.html", "/verity": "index.html", "/verity/": "index.html"}.get(path) or path.lstrip("/")
    fp = os.path.normpath(os.path.join(WEB, rel))
    if not fp.startswith(WEB + os.sep) and fp != WEB or not os.path.isfile(fp):
        return _json(404, {"error": "introuvable"})
    ctype = mimetypes.guess_type(fp)[0] or "application/octet-stream"
    with open(fp, "rb") as f:
        data = f.read()
    if ctype.startswith("text/") or ctype in ("application/javascript", "application/json", "image/svg+xml"):
        return _resp(200, data.decode("utf-8"), ctype, cache="public, max-age=300")
    return _resp(200, base64.b64encode(data).decode(), ctype, True, cache="public, max-age=86400")


def handler(event, context=None):
    try:
        rc = event.get("requestContext", {}).get("http", {})
        method, path = rc.get("method", event.get("httpMethod", "GET")), event.get("rawPath", event.get("path", "/"))
        if path.startswith("/api/"):
            body = event.get("body") or ""
            if event.get("isBase64Encoded"):
                body = base64.b64decode(body).decode()
            return route(method, path, body)
        return _static(path)
    except ValueError as e:
        return _json(400, {"error": str(e)})
    except Exception as e:
        traceback.print_exc()
        return _json(500, {"error": "erreur interne", "type": type(e).__name__})


if __name__ == "__main__":
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    class H(BaseHTTPRequestHandler):
        def _do(self):
            n = int(self.headers.get("content-length") or 0)
            ev = {"requestContext": {"http": {"method": self.command}}, "rawPath": self.path.split("?")[0], "body": self.rfile.read(n).decode() if n else ""}
            r = handler(ev)
            data = base64.b64decode(r["body"]) if r["isBase64Encoded"] else r["body"].encode()
            self.send_response(r["statusCode"])
            for k, v in r["headers"].items():
                self.send_header(k, v)
            self.send_header("content-length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        do_GET = do_POST = _do

        def log_message(self, *a):
            pass
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "8080"))), H).serve_forever()
