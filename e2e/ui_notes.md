# Interface Verity : notes de test

## Lancer
`PORT=8095 python3 app.py` (avec les identifiants AWS dans l'environnement pour /api/narrate et /api/compile), puis ouvrir http://localhost:8095/.

## Parcours manuel (vérifié avec des captures, voir artifacts/ui/)
1. Étape 1 : trois profils chargés ; choisir Robert affiche 6 règles avec coche. Saisir un récit (plus de 20 caractères) puis « Traduire en règles » : état de chargement « L'agent d'accueil traduit votre récit en règles… », puis mandat et « Hypothèses retenues ».
2. « Construire mon portefeuille simulé » : le résultat déterministe s'affiche tout de suite, puis le bandeau de narration passe de « réécrit… » à « Rédigé par Claude, chaque nombre vérifié » (ou « Texte de base conservé » avec la raison en cas d'échec).
3. Cliquer un badge bleu : tiroir « Reçu » (valeur, calculs A et B, méthode, entrées, empreintes). Échap ferme et rend le focus au badge.
4. Curseur « Date de décision » : le portefeuille, le récit et le graphique sont recalculés (délai de 300 ms).
5. Étape 3 : « Essayer le cas de Robert : 50 % NVIDIA » : verdict « refusée », 3 règles enfreintes, contre-proposition (~1,5 %), graphique à 4 courbes.
6. « Tester la vérification » : la phrase « +300 % » est rejetée (nombre « 300 » non sourcé) ; « {{vol:p_trail}} » est acceptée.
7. Clavier : Tab parcourt les profils (flèches pour changer), badges, curseurs ; focus visible ; le tiroir piège le focus.

## Test automatisé
`UI_URL=http://localhost:8095 python3 e2e/ui_smoke.py [--shots]` (Playwright, 1440 px puis 390 px). Écrit pour le parcours ci-dessus ; non exécuté dans l'environnement de construction (bibliothèques système de Chromium absentes). Les captures ont été faites avec le navigateur MCP, mobile via un iframe de 390 px.

## Limites connues
- Si la narration échoue, l'interface garde le texte de base et affiche la raison (corrigé côté serveur : narration avec et sans demande vérifiée).
- La narration prend de 5 à 20 s selon les essais.
- Le schéma « Comment ça marche » est en HTML/CSS (pas SVG) pour rester lisible à 390 px.
- Le graphique à 4 courbes (étape 3) est en échelle logarithmique, avec une note sous le graphique.

## Ancres stables (data-testid)
- Étapes : `step-1`, `step-2`, `step-3` ; profils : `persona-amira`, `persona-mateo`, `persona-robert`
- Récit libre : `story-input`, `compile-button` ; construire : `build-portfolio`
- Étape 2 : `date-slider`, `allocation`, `story`, `chart-main` ; chaque badge fait : `button[data-fact="<id>"]` (ex. `vol:p_trail`)
- Tiroir reçu : `receipt-drawer`
- Étape 3 : `ask-ticker`, `ask-weight`, `ask-submit`, `try-robert`, `verdict`, `story-governor`, `chart-req`
- Vérification : `verify-input`, `verify-submit`, `verify-example-fake`, `verify-example-token`, `verify-result`
