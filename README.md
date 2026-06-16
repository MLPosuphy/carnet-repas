# Recipe Book App

Application de livre de cuisine personnalisé.

## Installation

```bash
npm install
```

## Base de données

```bash
npx prisma migrate dev
npx prisma db seed
```

## Lancement

```bash
npm run dev
```

L'application sera disponible sur `http://127.0.0.1:3000` si tu gardes le port par défaut.

## Version GitHub Pages

Une version statique gratuite est disponible dans `docs/`.
Elle peut être publiée avec GitHub Pages en choisissant le dossier `/docs`.
Voir `docs/README-GITHUB-PAGES.md`.

Pour une prévisualisation stable sur ce workspace Windows, tu peux aussi lancer :

```bash
npm run build
npm run start
```

## Note Windows

Les scripts `dev`, `build` et `start` chargent `scripts/patch-readlink-eisdir.cjs`.
Ce petit correctif contourne un comportement du lecteur `P:` où Node renvoie `EISDIR`
quand Next/Webpack vérifie certains fichiers avec `readlink`.

Évite de créer un fichier de log dans la racine du projet pendant `npm run dev` :
Next surveille le dossier et peut recompiler en boucle si le log change en continu.

## Fonctionnalités

- Gestion des recettes
- Ingrédients et étapes dynamiques
- Ajustement des portions
- Chapitres
- Frigo / placard
- Recommandations
- Liste de courses
- Planning repas
- Mode cuisson
- Sessions de cuisson avec note et commentaire

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- SQLite

## Roadmap

- Import texte
- Import URL
- OCR
- Export PDF
- Nutrition
- Collaboration familiale
