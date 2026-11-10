# Les tests de Lagon Arena dans le navigateur

```bash
node outils/tests/tout.mjs                 # tous les parcours, en mode démo (≈ 3 min 30)
node outils/tests/tout.mjs seance bac      # seulement certains parcours
LAGON_DB=http://localhost:3300 node outils/tests/tout.mjs    # + les parcours contre une base locale
node outils/tests/captures.mjs [--reference]                 # captures aux 5 tailles d'écran
```

Prérequis : Node 18 ou plus, Playwright et Chromium (`npm i -D playwright && npx playwright install chromium`).
Les tests ne touchent jamais la vraie base : en mode démo, `js/config.js` est remplacé par une configuration sans base.

- `tout.mjs` : le serveur de test et le lanceur (résumé ✔ / ✘, code de sortie 1 en cas d'échec).
- `lib.mjs` : les outils communs et les gestes d'une séance.
- `parcours/` : un fichier par parcours.
- `captures.mjs` : les captures d'écran, comparées à la série de référence (`captures/`, non versionné).

Le détail de chaque parcours : [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md#les-tests-outilstests).
