const { Telegraf } = require("telegraf");  
const path = require("path");  
const chokidar = require("chokidar");  
  
const { setupHandlers, getAllCommands } = require("./utils/handler");  
const zipAndSend = require("./utils/zipAndSend");  
const handleHelpButtonCallback = require("./utils/help");  
const messageMonitor = require("../lib/messageMonitor");
  
const bot = new Telegraf(global.TELEGRAM_BOT_TOKEN);  
const ownerIds = global.TELEGRAM_OWNER.map(id => id.toString());  
  
// Vérification de token  
if (!global.TELEGRAM_BOT_TOKEN) {  
  throw new Error("❌ TOKEN Telegram non défini dans les paramètres globaux !");  
}  
  
// Commandes dynamiques  
setupHandlers(bot, {  
  commandsPath: path.join(__dirname, "commands"),  
  ownerIds  
});  
  
// Gestion des boutons inline  
bot.on("callback_query", async (ctx) => {  
  try {  
    const data = ctx.callbackQuery?.data;  
    if (!data) return;  
  
    console.log("➡️ Bouton cliqué :", data);  
    
    // Vérifier les permissions pour les boutons sensibles
    const userId = ctx.from.id.toString();
    const isGlobalDev = global.TELEGRAM_DEV && global.TELEGRAM_DEV.includes(parseInt(userId));
  
    // Gestion simplifiée des boutons
    let handled = false;
    
    // 1. Boutons de commandes principales
    if (data.startsWith("CMD_")) {
      const cmdName = data.replace("CMD_", "");
      const command = getAllCommands().find(c => c.name === cmdName);
      if (command) {
        if (command.ownerOnly && !isGlobalDev) {
          return await ctx.answerCbQuery("⛔ Réservé au développeur.", { show_alert: true });
        }
        await command.execute(ctx);
        return await ctx.answerCbQuery("✅ Exécuté !");
      }
    }
    
    // 2. Boutons d'aide
    if (data.startsWith("HELP_")) {
      return await handleHelpButtonCallback(ctx);
    }
    
    // 3. Essayer toutes les commandes avec handleCallback
    const commands = getAllCommands();
    for (const command of commands) {
      if (typeof command.handleCallback === "function") {
        try {
          const result = await command.handleCallback(ctx);
          if (result === true) {
            handled = true;
            break;
          }
        } catch (e) {
          console.error(`❌ Erreur callback ${command.name}:`, e);
        }
      }
    }
    
    if (handled) {
      return await ctx.answerCbQuery();
    }

    console.log(`❓ Bouton non géré: ${data}`);
    return await ctx.answerCbQuery("❔ Bouton non reconnu.", { show_alert: true });
  
  } catch (error) {  
    console.error("❌ Erreur callback bouton :", error);  
    try {  
      await ctx.reply("❌ Une erreur est survenue.");  
      await ctx.answerCbQuery("Erreur.", { show_alert: true });  
    } catch {}  
  }  
});  
  
// Gestion des messages texte "normaux" pour handleMessage des commandes  
bot.on("text", async (ctx) => {  
  const commands = getAllCommands();  
  for (const cmd of commands) {  
    if (typeof cmd.handleMessage === "function") {  
      try {  
        await cmd.handleMessage(ctx);  
      } catch (e) {  
        console.error(`❌ Erreur dans handleMessage de ${cmd.name}:`, e);  
      }  
    }  
  }  
});  
  
// Lancement du bot  
bot.launch()  
  .then(() => {
    console.log("✅ Bot Telegram lancé avec succès");
    console.log(`📱 Bot Telegram @${bot.botInfo?.username || 'inconnu'} est maintenant en ligne`);
    
    // Initialiser le monitoring si pas déjà fait
    if (!global.monitor) {
      messageMonitor.initialize();
    }
  })
  .catch(err => console.error("❌ Erreur lancement bot :", err));  
  
// Surveillance des changements  
const dataPath = path.join(__dirname, "..", "data");  
chokidar.watch(dataPath, { ignoreInitial: true }).on("all", async (event, filePath) => {  
  console.log(`📦 Changement détecté : ${event} → ${filePath}`);  
  try {  
    await zipAndSend(bot, global.TELEGRAM_ADMIN_ID);  
  } catch (e) {  
    console.error("❌ Erreur envoi zip :", e);  
  }  
});  
  
// Arrêt propre  
process.once("SIGINT", () => bot.stop("SIGINT"));  