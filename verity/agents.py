"""Agents à base de modèle (Amazon Bedrock). Les modèles proposent ; le code vérifie.

 - Agent d'accueil : récit libre -> mandat JSON, validé par un schéma strict (jamais utilisé tel quel s'il est invalide).
 - Agent narrateur : réécrit le récit en phrases claires, uniquement avec des jetons de faits ; le vérificateur rejette tout nombre libre.
Aucun raisonnement interne du modèle n'est conservé ni affiché : seules les actions observables le sont.
"""
import json, os, re, time
from .data import dataset
from .mandate import validate_mandate, rule_text
from .verify import check_text, facts_in

MODEL = os.environ.get("VERITY_MODEL", "us.anthropic.claude-sonnet-5-5")
FAST_MODEL = os.environ.get("VERITY_FAST_MODEL", "us.anthropic.claude-haiku-5-5")
_client = None


def client():
    global _client
    if _client is None:
        import boto3
        from botocore.config import Config
        _client = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"),
                               config=Config(read_timeout=24, connect_timeout=5, retries={"max_attempts": 1}))
    return _client


def converse(system, user, model=None, max_tokens=1800):
    r = client().converse(modelId=model or MODEL, system=[{"text": system}],
                          messages=[{"role": "user", "content": [{"text": user}]}],
                          inferenceConfig={"maxTokens": max_tokens},
                          **({"additionalModelRequestFields": {"thinking": {"type": "disabled"}}} if "haiku" in (model or MODEL) else {}))
    return "".join(b["text"] for b in r["output"]["message"]["content"] if "text" in b), r.get("usage", {})


def _json(txt):
    m = re.search(r"\{.*\}", txt, re.S)
    if not m:
        raise ValueError("pas de JSON")
    return json.loads(m.group(0))


SECTORS = sorted({v["sector"] for v in dataset().meta.values()})

COMPILE_SYS = """Tu es l'agent d'accueil d'un courtier. Tu traduis le récit d'un client en MANDAT D'INVESTISSEMENT CODÉ (simulation seulement, jamais de conseil).
Réponds par UN SEUL objet JSON, sans texte autour : {"name":str,"horizon_years":int,"rules":[...], "questions":[str]}.
Chaque règle : {"id":str court,"type":T,"limit":nombre,"scope":S (si applicable),"text":"phrase française avec {limit} à la place du nombre"}.
Types permis : max_vol (limit 0.05–0.40, volatilité annuelle), max_drawdown (limit 0.05–0.50, baisse historique tolérée), max_weight, min_weight (limit entre 0 et 1, avec scope), min_positions (limit = entier).
Portées (scope) permises : "single" (tout titre individuel), "stocks", "etf_eq", "bonds", "gold", "crypto", "sector:<secteur>" avec secteur parmi %s, "ticker:<SYMBOLE>" parmi %s.
Règles : 4 à 8 règles ; toujours max_vol et max_drawdown ; plus l'horizon est court, plus les limites sont serrées ; 'aucun/pas de X' = max_weight limit 0 ; une préférence = min_weight raisonnable.
Si une information essentielle manque (horizon, tolérance à la baisse), mets une question courte dans "questions" et fais l'hypothèse la plus prudente.""" % (SECTORS, list(dataset().tickers))


def compile_mandate(story, hint=None):
    t0 = time.time()
    txt, usage = converse(COMPILE_SYS, "Récit du client :\n" + story.strip()[:1500], model=MODEL, max_tokens=1500)
    m = _json(txt)
    questions = m.pop("questions", [])
    m.setdefault("name", "Client")
    m.setdefault("horizon_years", int(hint or 10))
    m["id"] = "custom"
    m["story"] = story.strip()[:1500]
    errs = validate_mandate(m)
    if errs:
        raise ValueError("mandat invalide : " + "; ".join(errs))
    return {"mandate": m, "questions": questions[:2], "ms": int((time.time() - t0) * 1000),
            "rules": [{"id": r["id"], "text": rule_text(r)} for r in m["rules"]]}


NARR_SYS = """Tu es l'agent narrateur d'un outil de simulation d'investissement pour des clients non spécialistes.
Tu reçois des sections de phrases-gabarits et la liste des FAITS vérifiés (id, libellé, valeur affichée).
Réécris chaque section en phrases françaises COMPLÈTES, simples et chaleureuses, sans jargon inutile (explique volatilité, baisse maximale en mots courants), une idée par phrase.
RÈGLES ABSOLUES :
- Tout nombre, pourcentage ou année doit être écrit par un jeton {{id_du_fait}} ou {{d:AAAA-MM-JJ}} copié des gabarits ; AUCUN chiffre écrit directement, aucun nombre en lettres.
- N'utilise que les ids de faits fournis. N'invente aucune cause, aucune prévision, aucun conseil.
- Garde les mêmes sections (même titre) et couvre tous les faits du gabarit.
Réponds par UN SEUL JSON : {"sections":[{"title":str,"sentences":[str,...]}]}"""


def narrate(ctx, sections):
    L = ctx["L"]
    ids = sorted({f for s in sections for x in s["sentences"] for f in facts_in(x if isinstance(x, str) else x["text"])})
    facts = [{"id": k, "label": L.facts[k]["label"], "valeur": L.facts[k]["display"]} for k in ids if k in L.facts]
    skel = [{"title": s["title"], "sentences": [x["text"] if isinstance(x, dict) else x for x in s["sentences"]]} for s in sections]
    notes, feedback = [], ""
    for attempt in (1, 2):
        user = json.dumps({"client": ctx["m"]["name"], "sections": skel, "faits": facts}, ensure_ascii=False) + feedback
        txt, usage = converse(NARR_SYS, user, model=FAST_MODEL, max_tokens=2200)
        try:
            out = _json(txt)["sections"]
        except Exception as e:
            feedback = "\nTa réponse précédente n'était pas un JSON valide."
            notes.append(f"tentative {attempt} : JSON invalide")
            continue
        bad = []
        for s in out:
            for x in s.get("sentences", []):
                ok, issues, _ = check_text(x, L.facts)
                if not ok:
                    bad.append({"phrase": x[:140], "problèmes": issues})
        if not bad and len(out) >= max(1, len(skel) - 1):
            notes.append(f"tentative {attempt} : toutes les phrases vérifiées")
            return {"sections": [{"title": s["title"], "sentences": s["sentences"]} for s in out], "notes": notes}
        notes.append(f"tentative {attempt} : {len(bad)} phrase(s) rejetée(s) par le vérificateur")
        feedback = "\nLe vérificateur a rejeté ces phrases (corrige : jetons uniquement, aucun chiffre libre) : " + json.dumps(bad[:6], ensure_ascii=False)
    return {"sections": None, "notes": notes}
