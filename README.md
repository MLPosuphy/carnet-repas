# Carnet repas

Carnet de recettes **familial**, 100 % statique, synchronisé via **pCloud**.
Pas de serveur, pas de base de données, pas de build : tout est dans `docs/`.

## Lancer en local

Sers le dossier `docs/` avec n'importe quel serveur statique, par ex. :

```bash
cd docs
python -m http.server 8080
# puis ouvre http://localhost:8080/
```

> Ouvrir `index.html` en `file://` ne suffit pas (service worker + fetch).

## Déploiement

GitHub Pages depuis le dossier `/docs` de la branche `main`.
URL : `https://mlposuphy.github.io/carnet-repas/`.
Détails : [`docs/README-GITHUB-PAGES.md`](docs/README-GITHUB-PAGES.md).

## Synchronisation pCloud

Lecture **et** écriture, sur PC **et** mobile, pour toute la famille,
via l'API pCloud (OAuth). Configuration en une fois :
[`docs/PCLOUD-SETUP.md`](docs/PCLOUD-SETUP.md).

## Fonctionnalités

- Recettes : ingrédients & étapes, photos, chapitres, tags, recherche, filtres
- Ajustement des portions (recalcul des quantités)
- Liste de courses intelligente (fusion des doublons + regroupement par rayon)
- Placard / frigo + recommandations « que cuisiner ? »
- Planning de la semaine (navigation par semaine, envoi vers les courses)
- Mode cuisson plein écran avec minuteurs
- Notation & historique de cuisson
- Thème clair / sombre, PWA installable, annulation des suppressions
- Sauvegarde manuelle export / import JSON

## Structure

```
docs/
  index.html      coquille HTML + anti-flash thème
  style.css       design (clair + sombre, responsive, impression)
  app.js          toute la logique (données, synchro pCloud, vues)
  sw.js           service worker (hors-ligne)
  manifest.webmanifest, icon.svg
  carnet-recettes.json   graine de premier chargement
  PCLOUD-SETUP.md        guide de configuration pCloud
```
