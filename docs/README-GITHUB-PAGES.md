# Déploiement GitHub Pages

Cette version statique vit dans `docs/`. Elle fonctionne sans serveur Next.js, sans Prisma et sans SQLite.

## Activer GitHub Pages

1. Pousse le dossier `docs/` sur GitHub.
2. Dans le dépôt GitHub, ouvre `Settings` puis `Pages`.
3. Dans `Build and deployment`, choisis `Deploy from a branch`.
4. Sélectionne la branche principale, puis le dossier `/docs`.
5. GitHub donnera une URL du type `https://compte.github.io/depot/`.

## Données

- `docs/carnet-recettes.json` contient les recettes initiales importées depuis Excel.
- Les modifications sont sauvegardées dans le navigateur avec `localStorage`.
- Le bouton `Exporter` télécharge un JSON complet.
- Le bouton `Importer` remplace les données locales par un JSON.
- Sur Chrome ou Edge, `Synchro > Dossier` peut écrire directement dans un dossier local synchronisé par pCloud, OneDrive ou équivalent.

## Téléphone

Sur téléphone, l'application reste accessible via GitHub Pages même quand l'ordinateur est éteint. Les modifications sont locales au navigateur du téléphone, sauf si ce navigateur permet l'accès à un dossier partagé ou si tu importes/exportes le JSON.
