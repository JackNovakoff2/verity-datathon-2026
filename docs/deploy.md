# Déploiement AWS de Verity

Architecture : API Gateway HTTP API (`$default`) -> Lambda Python 3.12 (`app.handler`, 1024 Mo, 28 s) qui sert `web/` et `/api/*` ; Bedrock (profils `us.anthropic.*`) ; CloudFront optionnel devant (statique 5 min, `/api/*` non caché). Région us-east-1 uniquement.

## Commandes
```bash
. <chemin>/.secrets/aws.env                 # exporte AWS_* (ne jamais committer)
python3 scripts/deploy.py                   # pile verity-jcx202-demo (idempotent)
python3 scripts/deploy.py --stack verity-jcx202-e2e
python3 scripts/deploy.py --cdn             # + CloudFront
python3 scripts/deploy.py --delete [--purge-bucket]
E2E_URL=<url> python3 -m unittest e2e.test_api -v
```
`deploy.py` zippe `app.py`, `verity/`, `web/` et 4 CSV de `data/` vers `artifacts/verity.zip` (reproductible), le dépose dans le bucket privé `verity-<compte>-artifacts` (pile d'amorçage `verity-artifacts`, expiration 14 j), crée/met à jour la pile, puis écrit `artifacts/deployment*.json` (sans secret). CloudFormation exige le code dans S3 (inline limité à 4 Ko), d'où le bucket.

Variables optionnelles : `VERITY_MODEL`, `VERITY_FAST_MODEL`. Tags : Owner=jc-x202, Ticket=BOILERROOM-20, Expires=2026-11-16. Throttling API : 10 req/s, rafale 20.

## Limites
- Limite dure API Gateway 29 s ; `/api/narrate` mesuré ~18 s, `/api/compile` ~9 s.
- Compte jetable, expire le 2026-11-16 : supprimer les piles (`--delete --purge-bucket`).
