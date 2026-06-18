# Configurer la synchro pCloud (à faire une seule fois)

L'application est 100 % statique : pas de serveur, pas de base de données.
La synchronisation familiale (lecture **et** écriture, sur PC **et** mobile) passe
uniquement par l'API pCloud via OAuth. Voici comment l'activer.

## 1. Créer un compte pCloud « famille »

Le plus simple : **un seul compte pCloud partagé** pour toute la famille
(par ex. `cuisine.famille@…`). Tout le monde se connectera à ce compte depuis l'app.

> Variante possible : chacun son compte + un dossier pCloud partagé en écriture.
> C'est faisable mais plus compliqué à mettre en place. Le compte unique est recommandé.

## 2. Enregistrer une application pCloud (gratuit, ~5 min)

1. Va sur https://docs.pcloud.com/ et connecte-toi.
2. Ouvre **My Applications** → **New application**.
3. Donne un nom (ex. `Carnet repas`).
4. Dans **Redirect URIs**, ajoute **exactement** l'URL de l'app publiée :

   ```
   https://mlposuphy.github.io/carnet-repas/
   ```

   (La barre oblique finale compte. Si tu testes en local, ajoute aussi
   `http://localhost:8080/` ou l'URL que tu utilises.)
5. Active le flux **Implicit / token** (réponse de type `token`).
6. Note le **Client ID** (aussi appelé *app key*).

## 3. Renseigner le Client ID dans l'app

Deux possibilités :

- **Rapide** : ouvre l'app → onglet **Synchro** → champ **Client ID pCloud** →
  colle la valeur → **Enregistrer les réglages**. Le Client ID est sauvegardé
  dans les données (donc partagé avec les autres appareils via pCloud).
- **En dur** : édite `docs/app.js`, remplace la constante
  `PCLOUD_CLIENT_ID = "PCLOUD_CLIENT_ID_A_REMPLACER"` par ton Client ID, puis
  pousse sur GitHub. (Le Client ID n'est pas secret.)

## 4. Connecter chaque appareil

Sur chaque téléphone / PC de la famille :

1. Ouvre l'app → **Synchro** → **Connecter pCloud**.
2. Connecte-toi au compte pCloud famille et autorise l'application.
3. C'est tout : les ajouts et modifications se synchronisent automatiquement.

## Comment ça marche

- Le fichier `carnet-recettes.json` est stocké dans le dossier pCloud
  **`/Carnet repas`** (modifiable dans les réglages).
- Chaque modification est : sauvegardée localement (instantané), puis
  **téléversée dans pCloud** (anti-rebond ~1 s).
- Toutes les ~20 s, l'app vérifie si quelqu'un d'autre a modifié le fichier
  et récupère la dernière version (basée sur le numéro de révision `rev`).
- Les photos téléversées vont dans `/Carnet repas/images`.

## Sécurité / bon à savoir

- Le **jeton** d'accès pCloud est stocké dans le navigateur de chaque appareil
  (`localStorage`). Quiconque a accès physique à un appareil connecté peut donc
  lire/écrire le carnet. Pour un usage familial, c'est acceptable.
- En cas de doute, **Déconnecter** depuis l'onglet Synchro supprime le jeton.
- Garde l'habitude d'un **export JSON** de temps en temps (onglet Synchro) :
  c'est un filet de sécurité indépendant de pCloud.

## Conflits / multi-appareils

La règle est « la dernière révision gagne » (`rev` le plus élevé). Si deux
personnes modifient hors-ligne au même moment, la version enregistrée en dernier
l'emporte. Pour un carnet de cuisine familial, ce comportement simple suffit ;
l'export JSON régulier protège contre toute perte accidentelle.
