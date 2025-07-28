# 🤖 PARKY-MD - Bot WhatsApp Multi-Utilisateurs Intelligent

## 📋 Description

PARKY-MD est un bot WhatsApp avancé avec support multi-utilisateurs, intelligence artificielle PARKY AI, et interface de gestion Telegram. Chaque utilisateur peut connecter son propre bot WhatsApp avec une configuration personnalisée.

## ✨ Fonctionnalités Principales

### 🎯 **Multi-Bots & Multi-Utilisateurs**
- **Un bot par utilisateur Telegram** - Chaque utilisateur connecte son propre bot WhatsApp
- **Configuration individuelle** - Paramètres personnalisés par bot
- **Données isolées** - Scores, batailles, historique séparés par utilisateur
- **Données partagées** - Base de quiz commune à tous les bots

### 🧠 **Intelligence Artificielle PARKY**
- **PARKY AI personnalisé** - Chaque utilisateur configure son assistant IA
- **Reconnaissance hiérarchique** - Créateur (Jean Parker) vs Propriétaire (utilisateur)
- **Génération d'images** - Création d'images via IA Flux
- **Traduction automatique** - Détection et traduction des langues
- **Suggestions intelligentes** - Aide à la saisie des commandes

### 🎮 **Système de Quiz Avancé**
- **Quiz texte et image** - Questions manga/anime avec images
- **Batailles 1v1** - Duels entre utilisateurs
- **Système de points** - Classements et récompenses
- **Interface web** - Création et gestion des quiz via navigateur

### 📱 **Interface Telegram Complète**
- **Gestion des bots** - Connexion, déconnexion, configuration
- **Monitoring en temps réel** - Surveillance des messages de tous les bots
- **Configuration globale** - Contrôle centralisé pour les développeurs
- **Sauvegarde/Restauration** - Backup automatique des données

### 🌐 **Interface Web**
- **Création de quiz** - Interface intuitive pour proposer des questions
- **Assistant PARKY** - Chat avec l'IA directement sur le web
- **Code de pairing** - Génération de codes de connexion WhatsApp
- **Panel admin** - Validation et gestion des quiz

## 🚀 Installation

### Prérequis
- Node.js 16+ 
- NPM ou Yarn
- Compte Google (pour Gemini AI)
- Bot Telegram (optionnel)

### Installation rapide
```bash
# Cloner le projet
git clone https://github.com/JeanParker11/PARKY-MD.git
cd PARKY-MD

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# Démarrer le bot
npm start
```

## ⚙️ Configuration

### Variables d'environnement importantes
```env
# Gemini AI (Obligatoire)
GEMINI_API_KEY=votre_cle_gemini_ai

# Telegram (Optionnel)
TELEGRAM_BOT_TOKEN=votre_token_bot_telegram
TELEGRAM_ADMIN_ID=votre_id_telegram

# Web (Optionnel)
PORT=3000
ADMIN_PASSWORD=votre_mot_de_passe_admin

# NGROK (Optionnel)
NGROK_TOKEN=votre_token_ngrok
```

### Configuration dans settings.js
```javascript
// Propriétaires principaux
global.owner = ["237693686208"];
global.dev = ["237693686208", "1849519763"]; // Global dev

// Bot principal
global.botname = 'PARKY-MD';
global.ownername = 'Jean Parker';
global.prefix = "!";

// Telegram
global.TELEGRAM_DEV = [1849519763]; // Droits dev sur Telegram
```

## 📱 Commandes Telegram

### 👤 **Utilisateur Standard**
- `/start` - Démarrer le bot
- `/connecter <numéro>` - Connecter ton bot WhatsApp
- `/deconnecter` - Déconnecter ton bot
- `/parkyconfig` - Configurer ton PARKY AI
- `/mystats` - Tes statistiques personnelles
- `/backup` - Sauvegarder tes données
- `/restore` - Restaurer depuis sauvegarde

### 🛡️ **Global Dev (Jean Parker)**
- `/globalconfig` - Configuration globale de tous les bots
- `/monitor` - Monitoring des messages de tous les bots
- `/listbots` - Liste de tous les bots connectés
- `/cleandata <botId>` - Supprimer définitivement les données d'un bot

## 🎮 Commandes WhatsApp

### 🎯 **Quiz & Jeux**
- `!quizz` - Lancer un quiz texte (admin uniquement)
- `!quizzid` - Lancer un quiz image (admin uniquement)
- `!battle` - Défier un autre joueur en duel
- `!score` - Voir ton score ou le classement
- `!topbattle` - Classement des victoires en bataille

### 🤖 **PARKY AI**
- Mention `@parky` ou parle naturellement à PARKY
- `!art <description>` - Générer une image artistique
- Traduction automatique des messages non-français

### 🛠️ **Utilitaires**
- `!menu` - Afficher le menu des commandes
- `!aide` - Liste détaillée des commandes
- `!ping` - Tester la latence du bot
- `!meteo <ville>` - Météo d'une ville
- `!pays <pays>` - Informations sur un pays

### 👑 **Administration**
- `!param <paramètre> on/off` - Activer/désactiver les fonctionnalités IA
- `!autoriser` - Autoriser un groupe à utiliser les commandes UNIROLIST
- `!interdire` - Interdire un groupe
- `!rappel <heure> | <groupe> | <message>` - Programmer un rappel

## 🌐 Interface Web

Accédez à l'interface web via `http://localhost:3000` ou votre URL de déploiement.

### Fonctionnalités web :
- **Création de quiz** - Proposer des questions texte et image
- **Assistant PARKY** - Chat avec l'IA
- **Code de pairing** - Générer des codes de connexion WhatsApp
- **Panel admin** - Valider les quiz proposés
- **Statistiques** - Voir les stats en temps réel

## 🏗️ Architecture

### Structure du projet
```
PARKY-MD/
├── commands/           # Commandes WhatsApp
├── IA/                # Modules d'intelligence artificielle
├── lib/               # Bibliothèques et utilitaires
├── telegram/          # Bot et commandes Telegram
├── web/               # Interface web
├── data/              # Données partagées (quiz, etc.)
├── user-data/         # Données individuelles par bot
├── sessions/          # Sessions WhatsApp
└── assets/            # Ressources (stickers, images)
```

### Composants principaux
- **BotManager** - Gestion centralisée des bots
- **UserDataManager** - Données individuelles par utilisateur
- **MessageMonitor** - Surveillance des messages
- **GeminiAI** - Interface avec l'IA Google
- **SharedData** - Données communes (quiz)

## 🔧 Développement

### Ajouter une commande WhatsApp
```javascript
// commands/macommande.js
module.exports = {
  name: "macommande",
  category: "Général",
  description: "Description de ma commande",
  allowedForAll: true,

  async execute(riza, m, args) {
    await riza.sendMessage(m.chat, {
      text: "Hello World!"
    }, { quoted: m });
  }
};
```

### Ajouter une commande Telegram
```javascript
// telegram/commands/macommande.js
module.exports = {
  name: "macommande",
  description: "Description de ma commande",
  category: "Général",

  async execute(ctx) {
    await ctx.reply("Hello World!");
  }
};
```

## 🚀 Déploiement

### Heroku
```bash
# Créer l'app Heroku
heroku create mon-parky-md

# Configurer les variables
heroku config:set GEMINI_API_KEY=votre_cle

# Déployer
git push heroku main
```

### Railway
```bash
# Connecter à Railway
railway login
railway init

# Déployer
railway up
```

### VPS/Serveur dédié
```bash
# Cloner et installer
git clone https://github.com/JeanParker11/PARKY-MD.git
cd PARKY-MD
npm install

# Utiliser PM2 pour la production
npm install -g pm2
pm2 start index.js --name "parky-md"
pm2 startup
pm2 save
```

## 🔒 Sécurité

### Permissions
- **Global Dev** - Droits sur tous les bots (Jean Parker)
- **Owner** - Propriétaire du bot spécifique
- **Sudo** - Utilisateurs privilégiés par bot
- **Admin** - Administrateurs de groupes WhatsApp

### Isolation des données
- Chaque utilisateur a ses propres données
- Vérifications de propriété strictes
- Sauvegarde automatique avant modifications
- Nettoyage sécurisé des données

## 📊 Monitoring

### Console
```javascript
// Contrôler le monitoring via console
monitor.toggle()              // Activer/désactiver
monitor.setBot("botId")       // Surveiller un bot spécifique
monitor.setBot("all")         // Surveiller tous les bots
monitor.listBots()            // Lister les bots disponibles
```

### Telegram
Utilisez `/monitor` pour contrôler le monitoring via Telegram avec une interface graphique.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence ISC. Voir le fichier `LICENSE` pour plus de détails.

## 👨‍💻 Créateur

**Jean Parker** - Développeur principal
- GitHub: [@JeanParker11](https://github.com/JeanParker11)
- WhatsApp: +22898133388
- Email: parjjean@gmail.com

## 🙏 Remerciements

- **Baileys** - Bibliothèque WhatsApp Web
- **Telegraf** - Framework Telegram Bot
- **Google Gemini AI** - Intelligence artificielle
- **Communauté UNIROLIST** - Tests et feedback

---

*Développé avec ❤️ par Jean Parker pour la communauté manga/anime*