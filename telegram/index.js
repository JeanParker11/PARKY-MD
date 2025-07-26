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
  
    // Gestion des boutons de commandes spécifiques
    const commands = getAllCommands();
    for (const command of commands) {
      if (typeof command.handleCallback === "function") {
        try {
          const handled = await command.handleCallback(ctx);
          if (handled) {
            return await ctx.answerCbQuery("✅ Exécuté !");
          }
        } catch (e) {
          console.error(`❌ Erreur callback ${command.name}:`, e);
        }
      }
    }

    if (data.startsWith("CMD_")) {  
      const cmdName = data.replace("CMD_", "");  
      const command = getAllCommands().find(c => c.name === cmdName);  
      if (!command) return await ctx.answerCbQuery("❌ Commande introuvable.", { show_alert: true });  
  
      const userId = ctx.from.id.toString();  
      if (command.ownerOnly && !ownerIds.includes(userId)) {  
        return await ctx.answerCbQuery("⛔ Réservée au propriétaire.", { show_alert: true });  
      }  
  
      await command.execute(ctx);  
      return await ctx.answerCbQuery("✅ Exécuté !");  
    }  
  
    if (data.startsWith("HELP_")) {  
      return await handleHelpButtonCallback(ctx);  
    }  
  
    // Gestion des boutons globaux
    if (data.startsWith("GLOBAL_")) {
      const globalConfigCommand = getAllCommands().find(c => c.name === "globalconfig");
      if (globalConfigCommand && typeof globalConfigCommand.handleCallback === "function") {
        await globalConfigCommand.handleCallback(ctx);
        return await ctx.answerCbQuery();
      }
    }

    // Gestion des boutons de configuration bot
    if (data.startsWith("CONFIG_") || data.startsWith("PARKY_") || data.startsWith("BOTINFO_")) {
      const configCommands = ["configbot", "parkyconfig", "botinfo"];
      for (const cmdName of configCommands) {
        const command = getAllCommands().find(c => c.name === cmdName);
        if (command && typeof command.handleCallback === "function") {
          try {
            await command.handleCallback(ctx);
            return await ctx.answerCbQuery();
          } catch (e) {
            console.error(`❌ Erreur callback ${cmdName}:`, e);
          }
        }
      }
    }

    // Gestion des boutons de déconnexion et nettoyage
    if (data.startsWith("DISCONNECT_") || data.startsWith("CLEAN_")) {
      const disconnectCommands = ["deconnecter", "cleandata"];
      for (const cmdName of disconnectCommands) {
        const command = getAllCommands().find(c => c.name === cmdName);
        if (command && typeof command.handleCallback === "function") {
          try {
            await command.handleCallback(ctx);
            return await ctx.answerCbQuery();
          } catch (e) {
            console.error(`❌ Erreur callback ${cmdName}:`, e);
          }
        }
      }
    }

    // Gestion des boutons de statistiques
    if (data.startsWith("MY_STATS_") || data.startsWith("MY_BOTS_")) {
      const statsCommand = getAllCommands().find(c => c.name === "mystats");
      if (statsCommand && typeof statsCommand.handleCallback === "function") {
        await statsCommand.handleCallback(ctx);
        return await ctx.answerCbQuery();
      }
    }

    // Gestion des boutons de monitoring
    if (data.startsWith("MONITOR_")) {
      const monitorCommand = getAllCommands().find(c => c.name === "monitor");
      if (monitorCommand && typeof monitorCommand.handleCallback === "function") {
        await monitorCommand.handleCallback(ctx);
        return await ctx.answerCbQuery();
      }
    }

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