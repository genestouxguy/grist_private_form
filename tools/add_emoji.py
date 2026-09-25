"""
Ajoute automatiquement un emoji correspondant au type de commit Conventional Commits dans le
message de commit.
"""
#!/usr/bin/env python
# -*- coding: utf-8 -*-

# SPDX-License-Identifier: CECILL-2.1
# SPDX-FileCopyrightText: 2025-2026 Guy Genestoux <guy.genestoux@insa-lyon.fr>

import json
import re
import sys
import urllib.error
import urllib.request

# Mappage des types Conventional Commits vers les "code/names" officiels de Gitmoji
# https://raw.githubusercontent.com/carloscuesta/gitmoji/master/packages/gitmojis/src/gitmojis.json
CONVENTIONAL_TO_GITMOJI_NAME = {
    "feat": "sparkles",  # ✨
    "fix": "bug",  # 🐛
    "docs": "memo",  # 📝
    "style": "lipstick",  # 💄
    "refactor": "recycle",  # ♻️
    "test": "rotating_light",  # 🚨
    "chore": "wrench",  # 🔧
    "ci": "construction_worker",  # 👷
    "build": "package",  # 📦
    "perf": "zap",  # ⚡
    "revert": "rewind",  # ⏪
}

# Fallback local en cas d'absence de connexion Internet
FALLBACK_EMOJI_MAP = {
    "feat": "✨",
    "fix": "🐛",
    "docs": "📝",
    "style": "💄",
    "refactor": "♻️",
    "test": "🚨",
    "chore": "🔧",
    "ci": "👷",
    "build": "📦",
    "perf": "⚡",
    "revert": "⏪",
}


def fetch_official_gitmojis() -> dict[str, str]:
    """Récupère la liste officielle des emojis depuis le dépôt gitmoji de Carlos Cuesta."""
    url = (
        "https://raw.githubusercontent.com/carloscuesta/gitmoji/master/packages/gitmojis/"
        "src/gitmojis.json"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Python-urllib"})
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode("utf-8"))
            # Construit un dictionnaire { 'sparkles': '✨', 'bug': '🐛', ... }
            name_to_emoji = {g["name"]: g["emoji"] for g in data["gitmojis"]}

            # Associe les types Conventional Commits aux emojis récupérés
            mapping = {}
            for conv_type, gitmoji_name in CONVENTIONAL_TO_GITMOJI_NAME.items():
                if gitmoji_name in name_to_emoji:
                    mapping[conv_type] = name_to_emoji[gitmoji_name]
            return mapping
    except (
        TimeoutError,
        OSError,
        urllib.error.URLError,
        json.JSONDecodeError,
        KeyError,
    ):
        # En cas de timeout, de réseau indisponible ou de réponse invalide, on utilise le fallback
        return FALLBACK_EMOJI_MAP


def main() -> None:
    """Point d'entrée pour le hook de commit.

    Ce script est destiné à être utilisé comme hook de commit Git. Il lit le message de commit,
    vérifie s'il correspond à un type de commit Conventional Commits, et ajoute l'emoji
    correspondant au début du message si aucun emoji n'est déjà présent.


    Args:
        commit_msg_filepath (str): Le chemin vers le fichier contenant le message de commit.
    Returns:
        None
    """
    if len(sys.argv) < 2:
        return

    commit_msg_filepath = sys.argv[1]
    emoji_map = fetch_official_gitmojis()

    with open(commit_msg_filepath, "r+", encoding="utf-8") as f:
        content = f.read()

        # Ne rien faire si un emoji existe déjà dans le message
        if any(emoji in content for emoji in emoji_map.values()):
            return

        # Regex pour intercepter : type(scope): message
        pattern = r"^(" + "|".join(emoji_map.keys()) + r")(\(.*\))?:"
        match = re.match(pattern, content)

        if match:
            commit_type = match.group(1)
            emoji = emoji_map[commit_type]
            f.seek(0)
            f.write(f"{emoji} {content}")


if __name__ == "__main__":
    main()
