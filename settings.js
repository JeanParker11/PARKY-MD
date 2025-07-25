const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 📌 Infos globales
global.owner = ["237693686208", "15483994640452@lid"];
global.sudo = ["22898133388"];
global.dev = ["237693686208", "22898133388"]; // Global dev - droits sur tous les bots
global.ownername = '𝙹𝚎𝚊𝚗 𝙿𝚊𝚛𝚔𝚎𝚛 🐼';
global.botname = '𝙿𝙰𝚁𝙺𝚈-𝙼𝙳';
global.botversion = '1.0.0';
global.prefix = "!";
global.stickerPackName = "ᴘᴀʀᴋʏ-ᴍᴅ";
global.stickerAuthor = "𝙹𝚎𝚊𝚗 𝙿𝚊𝚛𝚔𝚎𝚛 🐼";
global.menuImageUrl = "https://i.postimg.cc/RhH1M73G/uwp4820695.jpg";
global.menuNewsletterJid = "120363402059357562@newsletter";
global.menuNewsletterName = "🩵‣ᴘᴀʀᴋʏ-ᴍᴅ";
global.menuChannelLink = "https://whatsapp.com/channel/0029VbB8HEnGZNCkf0BPG01o";
global.imgthumb = "https://i.postimg.cc/RhH1M73G/uwp4820695.jpg";
global.menuGroupLink = "https://whatsapp.com/channel/0029VbB8HEnGZNCkf0BPG01o";
global.QUETE_GROUP_JID = "120363366068015316@g.us"; // ← remplace par le jid réel de ton groupe

// 🤖 Configuration Gemini AI avec nouvelle bibliothèque @google/genai
global.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAu4uwnPGgT_f3zkqJ5B4Lk-zU8ErToRW8";
global.GEMINI_MODEL = "gemini-2.0-flash-exp"; // Modèle le plus récent et performant
global.GEMINI_LIBRARY = "@google/genai"; // Nouvelle bibliothèque recommandée

// 🌐 Configuration du site web
global.WEB_PORT = process.env.PORT || 3000;
global.WEB_HOST = process.env.HOST || "0.0.0.0";
global.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "parker";

// 🔗 URLs du site (automatiquement détectées selon l'environnement)
global.SITE_URL = process.env.RAILWAY_STATIC_URL || 
                  process.env.RENDER_EXTERNAL_URL ||
                  (process.env.HEROKU_APP_NAME ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com` : null) ||
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                  `http://localhost:${global.WEB_PORT}`;

// 📱 Configuration Telegram
global.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7856983867:AAETSwPXwQh-5m0gViewTeSAwWgM0D7137Q";
global.TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || 1849519763;
global.TELEGRAM_OWNER = [1849519763];
// 📦 Configuration de sauvegarde
global.BACKUP_ZIP_NAME = "Données";
global.BACKUP_PATH = "./data";

// 🌐 Configuration NGROK
global.ngrokToken = '2zHnvO0SzojvgL0L27jq0owgikV_2BCdZD3a1Zvwo7a7QMSjb'; // Ton token NGROK
global.portNgrok = 3000; // Le port sur lequel tu veux exposer (ex: 3000 ou 5000)
global.regionNgrok = 'us'; // Région : 'us', 'eu', 'ap', etc.

module.exports = {
  ngrokToken: global.ngrokToken,
  portNgrok: global.portNgrok,
  regionNgrok: global.regionNgrok
};

// 🔐 Configuration de sécurité
global.SESSION_SECRET = process.env.SESSION_SECRET || "parky-md-secret-key-2024";
global.JWT_SECRET = process.env.JWT_SECRET || "parky-jwt-secret-2024";

// 🎮 Configuration des quiz
global.QUIZ_TIME_LIMIT = 30; // secondes
global.QUIZ_POINTS_CORRECT = 10;
global.QUIZ_POINTS_WRONG = 0;

// 📊 Configuration des limites
global.MAX_QUESTIONS_PER_SUBMISSION = 10;
global.MAX_QUIZ_LENGTH = 500; // caractères
global.MAX_OPTION_LENGTH = 100; // caractères

// 🎨 Configuration de l'interface
global.THEME_COLOR = "#6366f1";
global.SUCCESS_COLOR = "#10b981";
global.ERROR_COLOR = "#ef4444";
global.WARNING_COLOR = "#f59e0b";

// 📁 Chemins
const dataFolder = path.join(__dirname, "data");
const paramPath = path.join(dataFolder, "parametres.json");
const iaFolder = path.join(__dirname, "IA");

// 📦 S'assurer que le dossier ./data existe
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

// 🔄 Fonction de chargement
function loadParams() {
  try {
    if (fs.existsSync(paramPath)) {
      return JSON.parse(fs.readFileSync(paramPath, 'utf-8'));
    }
  } catch (e) {
    console.error(chalk.red("❌ Erreur lecture parametres.json :"), e.message);
  }
  return {};
}

// 💾 Fonction de sauvegarde
function saveParams(params) {
  try {
    fs.writeFileSync(paramPath, JSON.stringify(params, null, 2));
  } catch (e) {
    console.error(chalk.red("❌ Erreur écriture parametres.json :"), e.message);
  }
}

// 🔍 Détection automatique des IA
let iaFunctions = [];
try {
  iaFunctions = fs.readdirSync(iaFolder)
    .filter(f => f.endsWith(".js") && f !== "index.js")
    .map(f => path.basename(f, ".js").toUpperCase());
} catch (e) {
  console.error(chalk.red("❌ Erreur lecture dossier IA :"), e.message);
}

// ⚙️ Synchronisation des paramètres
let existingParams = loadParams();
let updated = false;

for (const ia of iaFunctions) {
  if (!Object.prototype.hasOwnProperty.call(existingParams, ia)) {
    existingParams[ia] = true; // Par défaut activé
    updated = true;
  }
}

if (updated) saveParams(existingParams);

global.parametres = existingParams;

// 🔁 Surveillance du fichier paramètres
fs.watchFile(paramPath, () => {
  console.log(chalk.yellow("🔄 parametres.json modifié, rechargement..."));
  global.parametres = loadParams();
});

// 📊 Affichage de la configuration au démarrage
console.log(chalk.cyan("🔧 Configuration PARKY-MD chargée:"));
console.log(chalk.green(`   📱 Bot: ${global.botname} v${global.botversion}`));
console.log(chalk.green(`   👤 Créateur: ${global.ownername}`));
console.log(chalk.green(`   🌐 Site: ${global.SITE_URL}`));
console.log(chalk.green(`   🗄️ Base de données: JSON persistants`));
console.log(chalk.green(`   🤖 Gemini AI: ${global.GEMINI_MODEL} (${global.GEMINI_LIBRARY})`));
console.log(chalk.green(`   🔑 API Key: ${global.GEMINI_API_KEY !== 'AIzaSyDipWRFerNNmOy_bcKjWKjjgKjjJgKjjgK' ? '✅ Configurée' : '⚠️ Clé par défaut'}`));
console.log(chalk.green(`   📱 Telegram: ${global.TELEGRAM_BOT_TOKEN !== '7971834283:AAEqG4_H1ZOiwVaL7KpaIA7UipH9YyTkjog' ? '✅ Configuré' : '⚠️ Token par défaut'}`));

if (global.GEMINI_API_KEY === 'AIzaSyDipWRFerNNmOy_bcKjWKjjgKjjJgKjjgK') {
  console.log(chalk.yellow("⚠️ Utilisez votre propre clé Gemini AI pour de meilleures performances."));
  console.log(chalk.yellow("📚 Nouvelle bibliothèque: npm install @google/genai"));
}

// 🔁 Surveillance de ce fichier
const file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`🔄 Fichier mis à jour : '${__filename}'`));
  delete require.cache[file];
  require(file);
});

module.exports = {
  // Export des configurations pour utilisation dans d'autres modules
  gemini: {
    apiKey: global.GEMINI_API_KEY,
    model: global.GEMINI_MODEL,
    library: global.GEMINI_LIBRARY
  },
  web: {
    port: global.WEB_PORT,
    host: global.WEB_HOST,
    adminPassword: global.ADMIN_PASSWORD,
    siteUrl: global.SITE_URL
  },
  telegram: {
    botToken: global.TELEGRAM_BOT_TOKEN,
    adminId: global.TELEGRAM_ADMIN_ID
  },
  quiz: {
    timeLimit: global.QUIZ_TIME_LIMIT,
    pointsCorrect: global.QUIZ_POINTS_CORRECT,
    pointsWrong: global.QUIZ_POINTS_WRONG
  },
  limits: {
    maxQuestionsPerSubmission: global.MAX_QUESTIONS_PER_SUBMISSION,
    maxQuizLength: global.MAX_QUIZ_LENGTH,
    maxOptionLength: global.MAX_OPTION_LENGTH
  },
  theme: {
    primaryColor: global.THEME_COLOR,
    successColor: global.SUCCESS_COLOR,
    errorColor: global.ERROR_COLOR,
    warningColor: global.WARNING_COLOR
  }
};