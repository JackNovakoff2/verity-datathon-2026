"""Vérificateur : un texte n'est publiable que si chaque nombre est un fait vérifié.

Un texte contient des jetons {{fact_id}} (valeur d'un fait) et {{d:AAAA-MM-JJ}} (date du calendrier de données).
Tout autre chiffre dans le texte est refusé : on n'accepte pas un nombre « de mémoire » d'un modèle.
"""
import re
from .data import dataset

TOKEN = re.compile(r"\{\{([^{}]+)\}\}")
MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]


def fmt_date(iso):
    y, m, d = iso.split("-")
    return f"{int(d)} {MOIS[int(m) - 1]} {y}"


def check_text(text, facts):
    """Renvoie (ok, problèmes, rendu)."""
    issues = []
    d = dataset()

    def sub(mo):
        k = mo.group(1).strip()
        if k.startswith("d:"):
            iso = k[2:]
            if iso not in d.idx:
                issues.append({"kind": "date_inconnue", "token": k})
                return "⟦?⟧"
            return fmt_date(iso)
        f = facts.get(k)
        if f is None:
            issues.append({"kind": "fait_inconnu", "token": k})
            return "⟦?⟧"
        if not f.get("verified"):
            issues.append({"kind": "fait_non_verifie", "token": k})
        return f["display"]

    rendered = TOKEN.sub(sub, text)
    leftover = TOKEN.sub("", text)
    for mo in re.finditer(r"[0-9]+(?:[.,][0-9]+)?", leftover):
        issues.append({"kind": "nombre_non_source", "token": mo.group(0)})
    return (len(issues) == 0), issues, rendered


def facts_in(text):
    return [k.strip() for k in TOKEN.findall(text) if not k.strip().startswith("d:")]
