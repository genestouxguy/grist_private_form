<!--
SPDX-FileCopyrightText: 2025-2026 Guy Genestoux <guy.genestoux@insa-lyon.fr>

SPDX-License-Identifier: CECILL-2.1
-->

# ✨ grist_private_form

Widget personnalisé pour [Grist](https://www.getgrist.com/) permettant de
saisir un **formulaire privé** : une page de saisie propre, avec libellés
personnalisables, références vers d'autres tables et pièces jointes.

[![Licence](https://img.shields.io/badge/Licence-CeCILL--2.1-blue.svg)](http://www.cecill.info/licences/Licence_CeCILL_V2.1-fr.html)
[![REUSE](https://img.shields.io/badge/REUSE-3.3%20compliant-orange.svg)](https://reuse.software/)

## 🚀 Déploiement

Le widget est un ensemble statique (`index.html`, `script.js`, `style.css`)
déployé automatiquement par **GitHub Pages** via le workflow
[`.github/workflows/static.yml`](.github/workflows/static.yml) à chaque push
sur `main` :

```
https://genestouxguy.github.io/grist_private_form/
```

## 📥 Installation dans Grist

1. Créez une page **Custom widget** dans votre document.
2. Choisissez *Custom URL* et collez l'URL GitHub Pages du widget.
3. **Maplez les colonnes** à afficher dans le formulaire — la table cible est
   détectée automatiquement à partir des colonnes mappées.
4. Définissez les droits d'accès (**Full access** requis pour enregistrer).

## ✨ Fonctionnalités

- **Formulaire privé** : rendu des champs selon le type Grist (Texte, Nombre,
  Date, Booléen, Choice/ChoiceList, Référence, Attachments…).
- **Personnalisation** : bouton **✏️ Éditer les libellés** pour renommer les
  champs, choisir leur largeur (grille 12 colonnes), réordonner par glisser-déposer.
- **Colonnes de référence** (`Ref:` / `RefList:`) :
  - libellés résolus intelligent (colonne d'affichage configurée par
    l'utilisateur, `visibleCol` de Grist, puis heuristiques de noms) ;
  - **style de champ configurable** par colonne : liste déroulante, boutons
    radio (optionnellement avec « Aucun »), cases à cocher pour les `RefList`.
- **Pièces jointes** : téléversement via l'API REST Grist, liste visible des
  fichiers sélectionnés.
- **Références multiples** : les colonnes `ReferenceList` (jointure gérée par
  Grist) acceptent plusieurs valeurs par enregistrement.

## ✔️ Vérification

Le widget est vérifié sur le document de test Grist (`TEST_V11_MISSION_FORM`,
table `T_MIS_MISSION`) : la console doit afficher `tableId: T_MIS_MISSION` et
la ligne créée à l'enregistrement. Détails dans
[`CONTRIBUTING.md`](CONTRIBUTING.md).

## 🛠️ Contribution

Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) pour le processus de contribution,
la convention de commits (Conventional Commits + Gitmoji) et les règles de
qualité.

## 📄 Licence

Ce projet est distribué sous la licence **CeCILL-2.1**
(voir [`LICENSE`](LICENSE)). Texte de référence :
[cecill.info](http://www.cecill.info/licences/Licence_CeCILL_V2.1-fr.html).

## 👥 Auteurs

Voir [`AUTHORS`](AUTHORS).
