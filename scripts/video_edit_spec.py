"""Plan de montage des scènes de démo : (repère_début, repère_fin, vitesse, cadrage (cx, cy, zoom[, durée_de_glissement])).
Repères = noms de video/work/<id>_marks.json (ou secondes). Attentes réelles accélérées ; démos clés à vitesse 1.
Règle de cadrage : jamais de texte coupé par le bord. La colonne de l'interface fait x 54-1866 : plein cadre (zoom 1) ou léger avancé (<= 1,06),
et zoom fort seulement sur des blocs étroits (carte de profil, panneau de gauche, tiroir de reçu)."""
F = (960, 540, 1.0)
P = (960, 540, 1.0)
SPEC = {
 "s04b_plateforme": [("start", "open", 1.0, F), ("open", "back", 2.2, F), ("back", "end", 1.0, F)],
 "s05_mandat": [("start", "story", 1.0, F), ("story", "rules", 1.0, P), ("rules", "end", 1.0, F)],
 "s06_recus": [("start", "checks", 1.6, F), ("checks", "story", 1.3, F), ("story", "open", 1.0, F),
               ("open", "scroll", 1.5, (1530, 540, 1.25)), ("scroll", "titles", 1.5, (1530, 540, 1.25)), ("titles", "close", 1.0, (1530, 540, 1.25)),
               ("close", "end", 1.6, (1530, 540, 1.25))],
 "s07_temps": [("start", "slider", 1.0, F), ("slider", "back", 1.0, F), ("back", "moved", 1.0, F),
               ("moved", "story", 1.0, P), ("story", "end", 1.0, P)],
 "s08_gouverneur": [("start", "ask", 3.0, F), ("ask", "verdict", 1.0, F), ("verdict", "compare", 1.0, F), ("compare", "viol", 1.0, F),
                    ("viol", "story", 1.4, F), ("story", "counter", 1.5, F), ("counter", "end", 1.0, (960, 540, 1.0, 4.0))],
 "s09_recul": [("start", "story", 1.0, (800, 470, 1.25)), ("story", "end", 1.0, (960, 540, 1.0, 5.0))],
 "s10_contexte": [("start", 10.3, 2.4, F), (10.3, "alloc_amira", 1.0, P), ("alloc_amira", 23.3, 2.8, F), (23.3, "alloc_mateo", 1.0, P)],
 "s11_triche": [("start", "open", 2.0, F), ("open", "typed", 1.4, F), ("typed", "result", 1.6, F), ("result", "end", 1.0, (960, 540, 1.0, 5.0))],
}
