<!--
SPDX-FileCopyrightText: 2025-2026 Guy Genestoux <guy.genestoux@insa-lyon.fr>

SPDX-License-Identifier: CECILL-2.1
-->

# Contributing

Merci de l'intérêt que vous portez à ce projet ! Ce guide décrit le processus
de contribution afin de garantir une qualité de code élevée et une
collaboration fluide.

## 🤝 Code de conduite

Nous adhérons au [Contributor Covenant](https://www.contributor-covenant.org/).
En contribuant, vous acceptez de respecter ce code de conduite.

## 🛠️ Environnement de développement

Aucune dépendance ni étape de build : le widget est du HTML/CSS/JavaScript
vanilla. Un simple `node` suffit pour vérifier la syntaxe :

```bash
node --check script.js
```

### Garde-fous pre-commit

Le projet utilise **[pre-commit](https://pre-commit.com/)** pour l'hygiène du
dépôt, la conformité REUSE et l'ajout automatique des emojis Gitmoji. Installez
les hooks une seule fois par clone :

```bash
# Installation de l'outil (Python)
uv tool install pre-commit
# — ou — pipx install pre-commit

# Activation des hooks (commit + commit-msg pour les emojis)
pre-commit install
pre-commit install --hook-type commit-msg
```

Le hook `commit-msg` ajoute automatiquement l'emoji Gitmoji correspondant au
type Conventional Commit (hors-ligne si besoin). Lancez une vérification
complète avec :

```bash
pre-commit run --all-files
```

## 📜 Processus de contribution

1. **Ouvrez une Issue** pour discuter du changement proposé avant de coder.
2. **Créez une branche** dédiée nommée `<type>/<sujet-court>` (`feat/radio-ref`,
   `fix/upload-attachments`). Le `<type>` reprend le type Conventional Commits
   du changement.
3. **Commits** : suivez la convention [Conventional Commits](#convention-de-commit).
4. **Validation** : `node --check script.js` doit passer et le comportement doit
   être vérifié sur le document de test Grist (voir [Vérification](#-vérification)).
5. **Pull Request** sur GitHub : décrivez vos changements et référencez
   l'Issue concernée.

## ✔️ Vérification sur le document de test

Le widget est testé manuellement sur Grist (doc `TEST_V11_MISSION_FORM`, table
`T_MIS_MISSION`). Le protocole de validation :

- La console du widget affiche `tableId: T_MIS_MISSION`.
- Après saisie et enregistrement, la ligne est bien créée dans
  `T_MIS_MISSION`.
- Les cas couverts : colonnes de référence (libellés, styles de champ),
  choix Choice/ChoiceList, pièces jointes, configurations de largeurs/ordre.

## 🧑‍💻 Convention de commit

Nous suivons les **[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)**
enrichis de **Gitmoji** :

| Type       | Emoji | Description                                                        |
|------------|:-----:|--------------------------------------------------------------------|
| `feat:`    | ✨    | Nouvelle fonctionnalité                                            |
| `fix:`     | 🐛    | Correction de bug                                                  |
| `docs:`    | 📝    | Modification de la documentation                                   |
| `refactor:`| ♻️    | Amélioration du code sans changement de logique                    |
| `chore:`   | 🔧    | Maintenance, dépendances, outils                                   |
| `style:`   | 💄    | Formatage, espacements (aucune logique)                            |
| `ci:`      | 👷    | Modification de la configuration CI (GitHub Actions)               |
| `revert:`  | ⏪    | Annulation d'un changement                                         |

```bash
git commit -m "feat(core): ajoute la gestion des secrets"
# → devient « ✨ feat(core): ajoute la gestion des secrets »
```

Les messages de commit sont rédigés en anglais ; le code, les commentaires et
les textes affichés à l'utilisateur en français.

## ⚖️ Licence et attribution

Le projet est distribué sous licence **CeCILL-2.1** et suit le standard
**[REUSE](https://reuse.software/)**. Les fichiers portent un en-tête
`SPDX-License-Identifier`. Le fichier `AUTHORS` crédite les contributeurs ;
pensez à l'actualiser si vous ajoutez un contributeur (ou via
`template authors --project-dir .`).

---

Merci pour votre contribution ! 🙏
