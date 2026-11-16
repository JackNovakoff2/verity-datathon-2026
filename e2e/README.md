# Scénarios d'acceptation de bout en bout (énoncés avant le code de l'interface)

Chaque scénario s'exécute contre une pile AWS dédiée (`E2E_URL`), jamais contre un serveur local.

1. **Robert refusé** — ouvrir l'application, choisir Robert, lancer « Et si je mettais 50 % sur NVIDIA ? » : le verdict « refusée » apparaît avec ≥ 3 règles enfreintes, la volatilité passe de ≈ 8 % à ≈ 26 %, une contre-proposition (poids ≈ 1 %) est affichée.
2. **Un reçu pour chaque chiffre** — cliquer un chiffre du récit : un tiroir « reçu » s'ouvre avec la formule, la période, les titres, les deux calculs (A et B) concordants et les empreintes des fichiers.
3. **Tentative de triche rejetée** — le bouton « Tester une fausse phrase » envoie « Ce portefeuille a rendu +300 % » : le vérificateur la rejette, nomme le nombre non sourcé ; une phrase avec un faux jeton est rejetée aussi.
4. **Adaptation au contexte** — Amira (tech, crypto autorisée) et Mateo (ESG, pas d'énergie) obtiennent des portefeuilles différents ; Mateo n'a ni énergie, ni crypto, ni Tesla ; ESGV ≥ 15 % ; Amira ≤ 8 % de crypto et ≤ 30 % de technologies.
5. **Machine à remonter le temps** — changer la date de décision modifie le portefeuille et le récit ; aucune donnée postérieure à la date n'est utilisée (le test API compare avec un jeu tronqué).
6. **Mandat sur mesure** — saisir un récit libre : un mandat de 4 à 8 règles est compilé par l'agent d'accueil, validé par le schéma, puis analysé ; un récit trop court est refusé avec un message clair.
7. **Responsive et simulation** — l'interface reste lisible à 390 px de large ; la mention « Simulation uniquement » est toujours visible ; aucun formulaire ne collecte d'identifiants bancaires.

## Intégration dans la plateforme de courtage (round 1 master — énoncés avant le code)

8. **La racine est la plateforme** — `/` sert le mockup NBDB (navigation Accounts/Markets/…), pas une page Verity autonome ; l'application autonome reste joignable sur `/verity/`.
9. **Entrée « Ouvrir un compte · Mon mandat »** — visible dans l'en-tête de la plateforme ; un clic ouvre le parcours Verity dans un panneau plein écran sur la plateforme (mandat → portefeuille → reçu), sans quitter la page.
10. **Retour et contexte préservés** — après avoir ouvert une autre vue de la plateforme (ex. Markets), ouvrir le mandat puis « Retour à la plateforme » (ou Échap) ramène à la même vue, même URL, sans rechargement.
11. **Aucune marque tierce** — aucune ressource servie (HTML, JS, CSS) ne contient de nom de marque interdit ; DA Banque nationale.
12. **Lien direct** — `/?entry=mandat` ouvre directement le panneau (pour la vidéo et les liens de démonstration).
13. **Petit écran** — à 390 px la plateforme hôte ne défile pas horizontalement et « Retour à la plateforme » reste cliquable.
14. **Sans / avec l'agent** — après « Essayer le cas de Robert », une carte « Le même parcours, sans et avec Verity » compare les deux parcours ; ses nombres sont des badges (reçus) et la limite reconnue est écrite ; la carte n'apparaît pas quand la demande est acceptée.
