# PROMPT MAÎTRE POUR CODEX — Application de livre de cuisine personnalisé

## Rôle attendu de Codex

Tu es un développeur senior full-stack. Tu dois concevoir et coder progressivement une application de **livre de cuisine personnalisé intelligent**.

L’objectif n’est pas de créer une simple liste de recettes, mais une application permettant à un utilisateur de construire un véritable **carnet culinaire personnel**, enrichi avec ses recettes, ses goûts, ses contraintes alimentaires, ses ingrédients disponibles, ses notes, ses variantes, ses menus, ses listes de courses et éventuellement ses souvenirs familiaux.

Tu dois produire du code clair, maintenable, modulaire, typé autant que possible, et facile à faire évoluer.  
Tu dois éviter les fonctionnalités artificielles ou trop complexes dans la première version. Commence par un MVP solide, puis ajoute les fonctionnalités avancées par modules.

---

# 1. Vision produit

L’application doit permettre à l’utilisateur de :

1. Ajouter ses propres recettes.
2. Organiser ses recettes en chapitres comme dans un vrai livre de cuisine.
3. Rechercher rapidement une recette selon plusieurs critères.
4. Adapter les quantités selon le nombre de portions.
5. Ajouter des notes personnelles après chaque essai.
6. Générer une liste de courses depuis une ou plusieurs recettes.
7. Gérer un frigo / placard simple.
8. Obtenir des suggestions de recettes selon les ingrédients disponibles.
9. Planifier des repas sur une semaine.
10. Utiliser un mode cuisson pas-à-pas.
11. Conserver plusieurs versions d’une même recette.
12. Exporter un livre de recettes en PDF dans une future version.

La philosophie générale :  
**l’utilisateur ne stocke pas seulement des recettes ; il construit un patrimoine culinaire personnel, utilisable au quotidien.**

---

# 2. Stack technique souhaitée

Tu peux proposer une stack cohérente, mais par défaut utilise :

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Composants simples et réutilisables
- Interface responsive desktop/mobile

## Backend

Deux options possibles :

### Option A — MVP local simple

- Next.js App Router
- API routes intégrées
- SQLite
- Prisma ORM

### Option B — version plus robuste

- Next.js frontend
- Backend Node.js / Express ou API routes Next.js
- PostgreSQL
- Prisma ORM

Pour une première version, privilégier **Next.js + TypeScript + Prisma + SQLite** afin d’avoir une application facile à lancer localement.

---

# 3. Contraintes générales de développement

Respecter ces règles :

1. Le code doit être lisible.
2. Le code doit être découpé en composants, services et types.
3. Les noms de variables doivent être explicites.
4. Les commentaires doivent être rares, courts, en anglais, et uniquement utiles.
5. Ne pas mettre toute la logique dans les composants React.
6. Créer une couche `services` pour la logique métier.
7. Créer une couche `lib` pour les fonctions utilitaires.
8. Créer des types partagés.
9. Prévoir une base de données propre.
10. Ajouter des données de démo pour tester l’interface.
11. Prévoir une architecture permettant d’ajouter plus tard l’OCR, l’import URL, l’IA, l’export PDF et la synchronisation multi-utilisateur.

---

# 4. Architecture de dossier proposée

Créer une structure proche de celle-ci :

```txt
recipe-book-app/
├── app/
│   ├── page.tsx
│   ├── recipes/
│   │   ├── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       └── cook/
│   │           └── page.tsx
│   ├── chapters/
│   │   └── page.tsx
│   ├── pantry/
│   │   └── page.tsx
│   ├── shopping/
│   │   └── page.tsx
│   ├── meal-plan/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
│
├── components/
│   ├── layout/
│   ├── recipes/
│   ├── pantry/
│   ├── shopping/
│   ├── meal-plan/
│   └── ui/
│
├── lib/
│   ├── db.ts
│   ├── units.ts
│   ├── scaling.ts
│   ├── search.ts
│   ├── dates.ts
│   └── format.ts
│
├── services/
│   ├── recipeService.ts
│   ├── chapterService.ts
│   ├── pantryService.ts
│   ├── shoppingService.ts
│   ├── mealPlanService.ts
│   └── recommendationService.ts
│
├── types/
│   ├── recipe.ts
│   ├── pantry.ts
│   ├── shopping.ts
│   └── mealPlan.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── public/
│   └── demo/
│
├── README.md
└── package.json
```

---

# 5. Modèle de données principal

Créer les entités suivantes.

## 5.1 User

Même si l’application démarre en local, prévoir un modèle utilisateur pour l’avenir.

Champs :

- `id`
- `name`
- `email`
- `createdAt`
- `updatedAt`

---

## 5.2 UserProfile

Profil culinaire utilisateur.

Champs :

- `id`
- `userId`
- `householdSize`
- `defaultServings`
- `skillLevel`
- `preferredCookingTime`
- `budgetLevel`
- `dietLabels`
- `allergies`
- `dislikedIngredients`
- `likedIngredients`
- `availableEquipment`

Exemples de valeurs :

```txt
skillLevel: beginner | intermediate | advanced
budgetLevel: low | medium | high
dietLabels: vegetarian, vegan, gluten_free, dairy_free, high_protein
availableEquipment: oven, microwave, blender, air_fryer, pressure_cooker
```

---

## 5.3 Recipe

Entité principale.

Champs :

- `id`
- `userId`
- `title`
- `slug`
- `description`
- `servings`
- `prepTimeMinutes`
- `cookTimeMinutes`
- `totalTimeMinutes`
- `difficulty`
- `costLevel`
- `season`
- `sourceType`
- `sourceName`
- `sourceUrl`
- `imageUrl`
- `personalNotes`
- `createdAt`
- `updatedAt`
- `lastCookedAt`
- `averageRating`

Valeurs utiles :

```txt
difficulty: easy | medium | hard
costLevel: low | medium | high
season: spring | summer | autumn | winter | all_year
sourceType: personal | family | website | book | friend | imported
```

---

## 5.4 RecipeIngredient

Ingrédients liés à une recette.

Champs :

- `id`
- `recipeId`
- `name`
- `quantity`
- `unit`
- `notes`
- `optional`
- `groupName`
- `order`

Exemples :

```txt
name: lentilles corail
quantity: 200
unit: g
groupName: curry
notes: rincées
optional: false
```

---

## 5.5 InstructionStep

Étapes de préparation.

Champs :

- `id`
- `recipeId`
- `order`
- `text`
- `timerMinutes`
- `temperature`
- `equipment`
- `tip`

---

## 5.6 Tag

Tags libres.

Champs :

- `id`
- `name`
- `color`

Relation many-to-many avec `Recipe`.

Exemples :

```txt
rapide
végétarien
batch cooking
apéro
comfort food
sans four
petit budget
lunchbox
```

---

## 5.7 Chapter

Organisation type livre.

Champs :

- `id`
- `userId`
- `title`
- `description`
- `coverImageUrl`
- `color`
- `order`
- `createdAt`
- `updatedAt`

Relation many-to-many avec `Recipe`.

Exemples :

```txt
Plats de semaine
Apéros faciles
Desserts inratables
Recettes de famille
Batch cooking
Moins de 30 minutes
```

---

## 5.8 RecipeVersion

Historique des versions.

Champs :

- `id`
- `recipeId`
- `versionNumber`
- `title`
- `description`
- `changeNote`
- `snapshotJson`
- `createdAt`

But : conserver une copie d’une recette avant modification majeure.

---

## 5.9 CookingSession

Chaque fois qu’un utilisateur cuisine une recette.

Champs :

- `id`
- `recipeId`
- `userId`
- `cookedAt`
- `actualPrepTimeMinutes`
- `actualCookTimeMinutes`
- `rating`
- `notes`
- `wouldCookAgain`
- `servingsCooked`

Permet d’apprendre :

- temps réel ;
- note réelle ;
- modifications à faire ;
- fréquence d’utilisation.

---

## 5.10 PantryItem

Ingrédient disponible dans le frigo / placard.

Champs :

- `id`
- `userId`
- `name`
- `quantity`
- `unit`
- `location`
- `expirationDate`
- `createdAt`
- `updatedAt`

Valeurs :

```txt
location: fridge | freezer | pantry | cellar | other
```

---

## 5.11 ShoppingList

Liste de courses.

Champs :

- `id`
- `userId`
- `title`
- `status`
- `createdAt`
- `updatedAt`

Valeurs :

```txt
status: active | archived
```

---

## 5.12 ShoppingListItem

Article de liste de courses.

Champs :

- `id`
- `shoppingListId`
- `name`
- `quantity`
- `unit`
- `category`
- `checked`
- `notes`
- `sourceRecipeId`

Catégories possibles :

```txt
fruits_vegetables
fresh
meat_fish
dry_goods
spices
bakery
frozen
drinks
household
other
```

---

## 5.13 MealPlan

Planification des repas.

Champs :

- `id`
- `userId`
- `startDate`
- `endDate`
- `createdAt`
- `updatedAt`

---

## 5.14 MealPlanEntry

Entrée du planning.

Champs :

- `id`
- `mealPlanId`
- `date`
- `mealType`
- `recipeId`
- `servings`
- `notes`

Valeurs :

```txt
mealType: breakfast | lunch | dinner | snack
```

---

# 6. Fonctionnalités MVP à implémenter en premier

## 6.1 Page d’accueil

Créer une page d’accueil avec :

- titre de l’application ;
- résumé du nombre de recettes ;
- raccourcis :
  - ajouter une recette ;
  - voir les recettes ;
  - voir les chapitres ;
  - voir le frigo ;
  - générer une liste de courses ;
- bloc “recettes récentes” ;
- bloc “à cuisiner bientôt” ;
- bloc “ingrédients à utiliser rapidement”.

---

## 6.2 Bibliothèque de recettes

Créer une page `/recipes`.

Fonctions :

- afficher toutes les recettes sous forme de cartes ;
- recherche par nom ;
- filtre par tag ;
- filtre par difficulté ;
- filtre par temps maximal ;
- filtre par coût ;
- tri par :
  - plus récent ;
  - mieux noté ;
  - plus rapide ;
  - alphabétique.

Chaque carte recette affiche :

- image si disponible ;
- titre ;
- description courte ;
- temps total ;
- difficulté ;
- coût ;
- tags ;
- note moyenne ;
- bouton “voir”.

---

## 6.3 Création de recette

Créer une page `/recipes/new`.

Formulaire complet :

- titre ;
- description ;
- portions ;
- temps préparation ;
- temps cuisson ;
- difficulté ;
- coût ;
- saison ;
- tags ;
- ingrédients dynamiques ;
- étapes dynamiques ;
- notes personnelles ;
- source.

L’utilisateur doit pouvoir :

- ajouter un ingrédient ;
- supprimer un ingrédient ;
- réordonner les ingrédients ;
- ajouter une étape ;
- supprimer une étape ;
- réordonner les étapes.

Validation minimale :

- titre obligatoire ;
- au moins un ingrédient ;
- au moins une étape ;
- portions > 0.

---

## 6.4 Page détail recette

Créer `/recipes/[id]`.

Afficher :

- titre ;
- description ;
- temps ;
- difficulté ;
- coût ;
- portions ;
- tags ;
- ingrédients ;
- étapes ;
- notes personnelles ;
- source ;
- historique des sessions de cuisson ;
- bouton “modifier” ;
- bouton “cuisiner maintenant” ;
- bouton “ajouter à la liste de courses”.

Fonctions :

- ajuster le nombre de portions ;
- recalculer automatiquement les quantités ;
- afficher les quantités d’origine et ajustées.

Règle de scaling :

```txt
newQuantity = originalQuantity * targetServings / originalServings
```

Créer une fonction dédiée dans `lib/scaling.ts`.

---

## 6.5 Mode cuisson pas-à-pas

Créer `/recipes/[id]/cook`.

Fonctions :

- afficher une seule étape à la fois ;
- boutons précédent / suivant ;
- progression `étape X / Y` ;
- timers simples si `timerMinutes` existe ;
- bouton “ajouter une note pendant la cuisson” ;
- bouton “terminer la session”.

À la fin, formulaire rapide :

- note de 1 à 5 ;
- temps réel ;
- commentaire ;
- “je referais cette recette” oui/non.

Créer ensuite une `CookingSession`.

---

## 6.6 Chapitres

Créer `/chapters`.

Fonctions :

- afficher les chapitres ;
- créer un chapitre ;
- modifier un chapitre ;
- supprimer un chapitre ;
- ajouter des recettes à un chapitre ;
- afficher les recettes d’un chapitre.

Un chapitre représente une section du livre personnel.

Exemples :

- “Apéros faciles”
- “Plats de semaine”
- “Desserts”
- “Recettes de famille”
- “Batch cooking”

---

## 6.7 Frigo / placard

Créer `/pantry`.

Fonctions :

- afficher les ingrédients disponibles ;
- ajouter un ingrédient ;
- modifier quantité ;
- supprimer un ingrédient ;
- renseigner date limite ;
- filtrer par lieu :
  - frigo ;
  - congélateur ;
  - placard ;
- afficher les ingrédients qui expirent bientôt.

Règle :

```txt
Un ingrédient expire bientôt si expirationDate <= aujourd’hui + 3 jours.
```

---

## 6.8 Suggestions depuis le frigo

Créer une fonction dans `recommendationService.ts`.

But : suggérer les recettes les plus compatibles avec les ingrédients disponibles.

Algorithme MVP simple :

1. Normaliser les noms d’ingrédients en minuscules.
2. Pour chaque recette, comparer les ingrédients requis avec les ingrédients disponibles.
3. Calculer :

```txt
compatibilityScore = matchedIngredients / totalRecipeIngredients
```

4. Retourner les recettes triées par score décroissant.
5. Afficher les ingrédients disponibles et manquants.

Exemple d’objet de sortie :

```ts
type RecipeRecommendation = {
  recipeId: string;
  recipeTitle: string;
  compatibilityScore: number;
  matchedIngredients: string[];
  missingIngredients: string[];
};
```

---

## 6.9 Liste de courses

Créer `/shopping`.

Fonctions :

- créer une liste de courses active ;
- ajouter manuellement un item ;
- cocher / décocher un item ;
- supprimer un item ;
- générer une liste depuis une ou plusieurs recettes ;
- regrouper les ingrédients identiques ;
- classer par catégorie.

Algorithme de génération :

1. Récupérer toutes les recettes sélectionnées.
2. Ajuster les quantités selon les portions demandées.
3. Fusionner les ingrédients ayant le même nom normalisé et la même unité.
4. Créer les items.
5. Marquer `sourceRecipeId` si l’item vient d’une recette.

---

## 6.10 Planification des repas

Créer `/meal-plan`.

Fonctions MVP :

- vue semaine ;
- ajouter une recette à une date ;
- choisir type de repas :
  - petit-déjeuner ;
  - déjeuner ;
  - dîner ;
  - snack ;
- modifier les portions ;
- supprimer une entrée ;
- générer la liste de courses de la semaine.

---

# 7. Fonctionnalités P2 à préparer après le MVP

Ne pas tout coder immédiatement, mais structurer l’application pour pouvoir les ajouter.

## 7.1 Import texte brut

L’utilisateur colle une recette en texte libre.  
L’application tente d’extraire :

- titre ;
- ingrédients ;
- étapes ;
- temps ;
- portions.

Pour commencer, faire un parser simple basé sur des sections :

```txt
Ingrédients:
- ...
Étapes:
1. ...
```

Plus tard, brancher un modèle IA.

---

## 7.2 Substitutions d’ingrédients

Créer une table `Substitution`.

Champs :

- ingrédient source ;
- substitut ;
- ratio ;
- contexte ;
- impact goût ;
- impact texture ;
- régime compatible.

Exemple :

```txt
crème fraîche -> yaourt grec
ratio: 1:1
context: sauce froide
impact: plus acide, plus léger
```

---

## 7.3 Export PDF

Prévoir un module `bookExportService.ts`.

Fonctions futures :

- choisir un ou plusieurs chapitres ;
- choisir un style ;
- générer sommaire ;
- générer pages recette ;
- générer index par ingrédient ;
- exporter en PDF.

---

## 7.4 Import depuis URL

Prévoir un champ `sourceUrl` dans `Recipe`.

Plus tard :

- récupérer contenu d’une page ;
- détecter données structurées ;
- extraire ingrédients ;
- extraire étapes ;
- nettoyer la recette.

---

## 7.5 OCR depuis photo

Prévoir `RecipePhoto`.

Champs :

- `id`
- `recipeId`
- `imageUrl`
- `originalText`
- `ocrStatus`
- `createdAt`

Statuts :

```txt
pending | processed | failed
```

---

## 7.6 Nutrition

Prévoir `NutritionEstimate`.

Champs :

- calories ;
- proteins ;
- carbs ;
- fats ;
- fiber ;
- salt ;
- confidenceScore.

Ne pas coder le calcul nutritionnel complet dans le MVP, mais prévoir l’emplacement.

---

# 8. Fonctions utilitaires importantes

## 8.1 Normalisation d’ingrédients

Créer `lib/ingredients.ts`.

Fonctions :

```ts
normalizeIngredientName(name: string): string
```

Règles MVP :

- lower case ;
- trim ;
- retirer accents ;
- retirer pluriels simples si possible ;
- retirer mots inutiles :
  - frais ;
  - fraîche ;
  - coupé ;
  - coupée ;
  - haché ;
  - hachée.

---

## 8.2 Scaling des portions

Créer `lib/scaling.ts`.

Fonctions :

```ts
scaleQuantity(
  quantity: number | null,
  originalServings: number,
  targetServings: number
): number | null
```

Règles :

- si quantité nulle ou absente, retourner null ;
- si portions invalides, retourner quantité originale ;
- arrondir proprement :
  - grammes : entier ;
  - ml : entier ;
  - cuillères : 0.5 près ;
  - unités : 0.5 près.

---

## 8.3 Formatage temps

Créer `lib/format.ts`.

Fonction :

```ts
formatDuration(minutes: number): string
```

Exemples :

```txt
15 -> "15 min"
75 -> "1 h 15"
120 -> "2 h"
```

---

## 8.4 Catégorisation des courses

Créer `lib/shoppingCategories.ts`.

Fonction :

```ts
guessShoppingCategory(ingredientName: string): ShoppingCategory
```

MVP : mapping simple.

Exemples :

```txt
tomate, carotte, oignon -> fruits_vegetables
lait, crème, fromage -> fresh
riz, pâtes, lentilles -> dry_goods
sel, poivre, curry -> spices
```

---

# 9. UI / UX

## 9.1 Style général

Créer une interface :

- claire ;
- chaleureuse mais sobre ;
- très lisible ;
- orientée usage cuisine ;
- responsive mobile.

Style recommandé :

- fond clair ;
- cartes arrondies ;
- typographie lisible ;
- espacements généreux ;
- boutons visibles ;
- icônes discrètes ;
- couleurs par catégorie.

---

## 9.2 Composants UI à créer

Créer des composants génériques :

```txt
Button
Input
Textarea
Select
Badge
Card
Modal
Tabs
EmptyState
PageHeader
SearchBar
FilterBar
RatingInput
Timer
QuantityInput
```

Composants métier :

```txt
RecipeCard
RecipeForm
IngredientListEditor
StepListEditor
RecipeIngredients
RecipeSteps
RecipeScalingControl
CookModeStep
ChapterCard
PantryItemCard
ShoppingListItemRow
MealPlanWeekView
RecommendationCard
```

---

## 9.3 États vides

Prévoir des états vides propres :

- aucune recette ;
- aucun chapitre ;
- aucun ingrédient dans le frigo ;
- aucune liste de courses ;
- aucun repas planifié.

Exemple :

```txt
Aucune recette pour le moment.
Ajoute ta première recette pour commencer ton livre de cuisine personnalisé.
```

---

# 10. Données de démonstration

Créer un seed Prisma avec au moins :

## Recettes

1. Curry de lentilles corail
2. Omelette courgette-feta
3. Pâtes citron-parmesan
4. Chili sin carne
5. Houmous maison
6. Gratin de légumes
7. Cookies chocolat
8. Salade pois chiches concombre tomate
9. Dahl épinards coco
10. Tarte aux pommes familiale

## Chapitres

1. Plats de semaine
2. Apéros faciles
3. Desserts
4. Recettes végétariennes
5. Recettes de famille
6. Moins de 30 minutes

## Pantry items

- œufs
- courgettes
- feta
- riz
- lentilles corail
- lait de coco
- citron
- carottes
- pois chiches
- tomates

---

# 11. Critères d’acceptation du MVP

Le MVP est acceptable si :

1. L’utilisateur peut créer une recette complète.
2. L’utilisateur peut voir toutes ses recettes.
3. L’utilisateur peut ouvrir une recette.
4. Les quantités changent correctement quand les portions changent.
5. L’utilisateur peut organiser des recettes en chapitres.
6. L’utilisateur peut ajouter des ingrédients dans son frigo / placard.
7. L’app peut recommander des recettes selon les ingrédients disponibles.
8. L’utilisateur peut générer une liste de courses depuis une recette.
9. L’utilisateur peut cocher les éléments de sa liste de courses.
10. L’utilisateur peut planifier une recette dans une semaine.
11. L’utilisateur peut utiliser un mode cuisson étape par étape.
12. Une session de cuisson peut être enregistrée avec note et commentaire.
13. Le projet peut être lancé localement sans configuration complexe.
14. Le README explique clairement comment installer, migrer, seed et lancer.

---

# 12. Ordre recommandé d’implémentation

Procéder dans cet ordre :

## Étape 1 — Initialisation

1. Créer projet Next.js TypeScript.
2. Installer Tailwind.
3. Installer Prisma.
4. Configurer SQLite.
5. Créer le schéma Prisma.
6. Créer le seed.
7. Créer la navigation principale.

## Étape 2 — Recettes

1. Créer les types recette.
2. Créer les services recette.
3. Créer la page liste.
4. Créer les cartes recette.
5. Créer la page détail.
6. Créer le formulaire de création.
7. Ajouter scaling des portions.

## Étape 3 — Chapitres

1. Créer CRUD chapitre.
2. Associer recettes et chapitres.
3. Afficher les recettes par chapitre.

## Étape 4 — Pantry

1. Créer CRUD ingrédients disponibles.
2. Détecter ingrédients qui expirent bientôt.
3. Afficher suggestions simples.

## Étape 5 — Recommandations

1. Implémenter `normalizeIngredientName`.
2. Implémenter score de compatibilité.
3. Créer cartes de recommandation.
4. Afficher ingrédients présents / manquants.

## Étape 6 — Shopping list

1. Créer liste active.
2. Ajouter items manuels.
3. Générer items depuis recette.
4. Fusionner ingrédients identiques.
5. Cocher / décocher.

## Étape 7 — Meal plan

1. Créer vue semaine.
2. Ajouter recette à un jour.
3. Modifier portions.
4. Générer courses de la semaine.

## Étape 8 — Mode cuisson

1. Créer vue étape par étape.
2. Ajouter timers.
3. Enregistrer session.
4. Afficher historique dans la recette.

## Étape 9 — Nettoyage

1. Factoriser composants.
2. Ajouter validations.
3. Améliorer responsive.
4. Ajouter README.
5. Vérifier seed.
6. Vérifier erreurs.

---

# 13. README attendu

Créer un README contenant :

```txt
# Recipe Book App

Application de livre de cuisine personnalisé.

## Installation

npm install

## Base de données

npx prisma migrate dev
npx prisma db seed

## Lancement

npm run dev

## Fonctionnalités

- Gestion des recettes
- Chapitres
- Frigo / placard
- Recommandations
- Liste de courses
- Planning repas
- Mode cuisson

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
- Collaboration
```

---

# 14. Règles de qualité

Avant de considérer une étape terminée :

1. Vérifier que le projet compile.
2. Vérifier qu’il n’y a pas d’erreur TypeScript majeure.
3. Vérifier que les formulaires fonctionnent.
4. Vérifier que les données sont persistées.
5. Vérifier que les pages sont responsive.
6. Vérifier que les fonctions métier importantes sont séparées.
7. Ajouter des messages d’erreur simples.
8. Ajouter des états de chargement si nécessaire.
9. Ajouter des états vides.
10. Garder le code simple.

---

# 15. Prompt de lancement pour Codex

Utilise ce prompt pour commencer le développement :

```txt
Tu dois créer une application Next.js + TypeScript + Tailwind + Prisma + SQLite appelée "recipe-book-app".

Cette application est un livre de cuisine personnalisé intelligent. Elle doit permettre de créer, organiser, consulter et cuisiner des recettes personnelles.

Commence par implémenter un MVP solide avec :
- gestion complète des recettes ;
- ingrédients et étapes dynamiques ;
- ajustement des portions ;
- chapitres personnalisés ;
- frigo / placard ;
- recommandations selon les ingrédients disponibles ;
- liste de courses générée depuis les recettes ;
- planning hebdomadaire des repas ;
- mode cuisson étape par étape ;
- sessions de cuisson avec note et commentaire.

Respecte l’architecture suivante :
- app/ pour les pages Next.js ;
- components/ pour les composants UI et métier ;
- services/ pour la logique métier ;
- lib/ pour les fonctions utilitaires ;
- types/ pour les types partagés ;
- prisma/ pour le schéma et le seed.

Utilise Prisma avec SQLite pour la persistance locale.

Crée un schéma de base de données propre avec les modèles :
User, UserProfile, Recipe, RecipeIngredient, InstructionStep, Tag, Chapter, RecipeVersion, CookingSession, PantryItem, ShoppingList, ShoppingListItem, MealPlan, MealPlanEntry.

Crée aussi des données de démonstration avec au moins 10 recettes, plusieurs chapitres et plusieurs ingrédients dans le frigo.

Code progressivement dans cet ordre :
1. Initialisation du projet.
2. Schéma Prisma + seed.
3. Layout global + navigation.
4. CRUD recettes.
5. Page détail recette avec scaling des portions.
6. Chapitres.
7. Frigo / placard.
8. Recommandations.
9. Liste de courses.
10. Planning repas.
11. Mode cuisson.
12. README complet.

Contraintes :
- Code typé.
- Composants réutilisables.
- Logique métier hors composants React.
- Interface responsive.
- États vides propres.
- Messages d’erreur simples.
- Commentaires courts en anglais uniquement quand nécessaire.
- Ne pas ajouter d’IA externe dans le MVP.
- Préparer l’architecture pour ajouter plus tard import URL, OCR, nutrition et export PDF.

À chaque étape, vérifie que l’application compile et que les fonctionnalités principales sont testables localement.
```

---

# 16. Fonctionnalités futures à garder dans la roadmap

Après le MVP, ajouter progressivement :

1. Import de recette depuis texte brut.
2. Import depuis URL.
3. Import depuis photo avec OCR.
4. Export PDF type vrai livre de cuisine.
5. Nutrition par portion.
6. Substitutions d’ingrédients.
7. Mode événement.
8. Collaboration familiale.
9. Versioning avancé.
10. Assistant de rattrapage culinaire.
11. Score vaisselle.
12. Score budget.
13. Score anti-gaspi.
14. Générateur de menus intelligent.
15. Mode batch cooking.
16. Mode cuisine à deux.
17. Recettes avec souvenirs familiaux.
18. Généalogie des variantes de recettes.
19. Cartographie des goûts.
20. Recommandations personnalisées.

---

# 17. Direction produit finale

Toujours garder cette intention :

L’application doit être simple à utiliser au quotidien, mais suffisamment structurée pour devenir un vrai livre de cuisine personnel.

Elle doit répondre à des situations concrètes :

- Qu’est-ce que je cuisine ce soir ?
- Que puis-je faire avec ce qu’il me reste ?
- Comment organiser mes recettes préférées ?
- Comment retrouver une recette familiale ?
- Comment générer mes courses ?
- Comment adapter une recette à 2, 4 ou 8 personnes ?
- Comment garder mes modifications après chaque essai ?
- Comment transformer mes recettes en vrai livre imprimable ?

Le MVP doit être propre, fonctionnel et extensible.
