# Déploiement GitHub Pages

Cette application est **100 % statique** : elle vit entièrement dans `docs/`.
Aucun serveur, aucune base de données, aucun build.

## Activer GitHub Pages

1. Pousse le dossier `docs/` sur GitHub (branche `main`).
2. Dans le dépôt : `Settings` → `Pages`.
3. `Build and deployment` → `Deploy from a branch`.
4. Branche `main`, dossier `/docs`.
5. URL obtenue : `https://mlposuphy.github.io/carnet-repas/`.

## Données & synchro

- `docs/carnet-recettes.json` est la **graine** : les recettes affichées au
  tout premier chargement, avant toute connexion pCloud.
- Ensuite, les données vivent :
  - dans le **navigateur** (`localStorage`) pour un accès instantané et hors-ligne ;
  - dans **pCloud** (`/Carnet repas/carnet-recettes.json`) pour la synchro
    familiale (lecture + écriture, PC + mobile).
- L'**export / import JSON** (onglet Synchro) sert de sauvegarde manuelle.

➡️ Mise en place de la synchro : voir [`PCLOUD-SETUP.md`](PCLOUD-SETUP.md).

## Téléphone

L'app s'installe comme une PWA (Ajouter à l'écran d'accueil). Une fois pCloud
connecté, on peut consulter **et** modifier les recettes depuis le téléphone,
et tout se synchronise avec les autres appareils de la famille.
