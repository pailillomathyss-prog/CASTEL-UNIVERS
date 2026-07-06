# 🗡️ Castel Univers — Bot Discord Demon Slayer

Bot Discord communautaire sur le thème Demon Slayer. Il installe automatiquement toute la structure d'un serveur, gère les rôles, les souffles, le XP et génère des cartes de rang personnalisées.

---

## ✨ Fonctionnalités

- **Installation automatique** du serveur (catégories, salons, permissions)
- **Rôles thématiques** : factions (Pourfendeur / Démon / Civil) et Souffles
- **Panel de choix de rôles** interactif avec boutons
- **Système d'entraînement** avec quiz, test de rapidité, mémoire et combat
- **Système XP** avec anti-spam et niveaux progressifs
- **Commande `!rank`** avec carte de profil générée (canvas)
- **Classement** mis à jour automatiquement
- **Logs** complets dans un salon dédié

---

## 🚀 Installation

### Prérequis

- Node.js 18+
- Un bot Discord avec les intentions `GUILDS`, `GUILD_MESSAGES`, `GUILD_MEMBERS`

### Étapes

```bash
cd discord-bot
npm install
cp .env.example .env
# Remplissez DISCORD_TOKEN et CLIENT_ID dans .env
node index.js
```

### Permissions Discord requises

Le bot doit avoir les permissions suivantes sur le serveur :
- Gérer les rôles
- Gérer les salons
- Envoyer des messages
- Intégrer des liens
- Joindre des fichiers
- Lire l'historique des messages

---

## ⚙️ Utilisation

### Installation du serveur

Seuls les administrateurs peuvent lancer l'installation :

```
!install
```

Le bot crée automatiquement toute la structure, les rôles et les panels.

### Commandes membres

| Commande | Description |
|----------|-------------|
| `!rank` | Affiche votre carte de profil personnalisée |

### Panels interactifs

- **#choix-rôles** → Choisissez votre faction (Pourfendeur / Démon / Civil)
- **#entraînement** → Commencez l'entraînement pour obtenir un Souffle

---

## 📁 Structure du projet

```
discord-bot/
├── index.js                  # Point d'entrée
├── src/
│   ├── database/db.js        # Base de données SQLite
│   ├── setup/
│   │   ├── installer.js      # Installation du serveur
│   │   └── roles.js          # Création des rôles
│   ├── panels/
│   │   ├── rolePanel.js      # Panel choix de faction
│   │   └── trainingPanel.js  # Panel entraînement
│   ├── systems/
│   │   ├── xp.js             # Système XP et niveaux
│   │   ├── training.js       # Système d'entraînement
│   │   └── leaderboard.js    # Classement
│   ├── commands/rank.js      # Commande !rank
│   ├── events/
│   │   ├── messageCreate.js  # Gestion des messages
│   │   ├── interactionCreate.js # Gestion des interactions
│   │   └── guildMemberAdd.js # Accueil des nouveaux membres
│   └── utils/
│       ├── logger.js         # Logs dans Discord
│       └── rankCard.js       # Génération image !rank
```

---

## 📊 Système de niveaux

| Niveau | Rang |
|--------|------|
| 1 | 🌱 Nouveau membre |
| 5 | ⚔️ Recrue |
| 15 | 🗡️ Pourfendeur confirmé |
| 30 | 🔥 Guerrier d'élite |
| 50 | 🌸 Tsuguko |
| 75 | 👑 Pilier |

---

## 🌬️ Souffles disponibles

| Souffle | Rareté | Progression requise |
|---------|--------|---------------------|
| 🌊 Eau | Commun | 100 |
| 🔥 Flamme | Commun | 100 |
| ⚡ Foudre | Commun | 120 |
| 🌪️ Vent | Commun | 120 |
| 🌫️ Brume | Peu commun | 150 |
| 🌸 Amour | Peu commun | 150 |
| 🦋 Insecte | Rare | 200 |
| 🐍 Serpent | Rare | 200 |
| 🪨 Roche | Rare | 200 |
| ☀️ Soleil | Légendaire | 300 |
