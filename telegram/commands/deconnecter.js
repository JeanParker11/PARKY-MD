const { removeSession, getAllSessions } = require("../utils/connexion");
const botManager = require("../../lib/botManager");
const userDataManager = require("../../lib/userDataManager");

module.exports = {
  name: "deconnecter",
  description: "Déconnecte un bot WhatsApp",
  category: "Gestion",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    // Vérifier si global dev
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    );

    const allBots = botManager.getAllBots();
    
    // Filtrer les bots selon les permissions
    const userBots = isGlobalDev ? 
      allBots : 
      allBots.filter(bot => bot.config.ownerJid === userJid);

    if (userBots.length === 0) {
      return ctx.reply(
        isGlobalDev ? 
          "📱 Aucun bot connecté actuellement." :
          "📱 Tu n'as aucun bot connecté à déconnecter."
      );
    }

    // Si un seul bot, le déconnecter directement
    if (userBots.length === 1) {
      const bot = userBots[0];
      await disconnectBot(ctx, bot.botId, isGlobalDev);
      return;
    }

    // Plusieurs bots, demander lequel déconnecter
    const keyboard = userBots.map(bot => [{
      text: `🔌 ${bot.config.botname} (${bot.botId})`,
      callback_data: `DISCONNECT_${bot.botId}`
    }]);

    keyboard.push([{
      text: "🚫 Déconnecter TOUS mes bots",
      callback_data: isGlobalDev ? "DISCONNECT_ALL_GLOBAL" : "DISCONNECT_ALL_USER"
    }]);

    await ctx.reply(
      "🔌 *Sélectionne le bot à déconnecter :*",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  },

  // Gestion des callbacks
  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    // Vérifier que ce callback nous concerne
    if (!data.startsWith('DISCONNECT_')) {
      return false;
    }
    
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    );

    if (data.startsWith('DISCONNECT_')) {
      const botId = data.replace('DISCONNECT_', '');
      
      if (botId === 'ALL_GLOBAL' && isGlobalDev) {
        await disconnectAllBots(ctx, true);
      } else if (botId === 'ALL_USER') {
        await disconnectAllBots(ctx, false);
      } else {
        // Vérifier les permissions pour ce bot spécifique
        const bot = botManager.getBot(botId);
        if (!bot) {
          await ctx.answerCbQuery("❌ Bot introuvable", { show_alert: true });
          return true;
        }

        if (!isGlobalDev && bot.config.ownerJid !== userJid) {
          await ctx.answerCbQuery("⛔ Tu ne peux déconnecter que tes propres bots", { show_alert: true });
          return true;
        }

        await disconnectBot(ctx, botId, isGlobalDev);
      }
      
      return true;
    }
    
    return false;
  }
};

async function disconnectBot(ctx, botId, isGlobalDev = false) {
  try {
    const bot = botManager.getBot(botId);
    if (!bot) {
      return ctx.reply("❌ Bot introuvable.");
    }

    const botName = bot.config.botname;
    
    // Créer une sauvegarde avant déconnexion
    const backupPath = userDataManager.createBotBackup(botId);
    
    // Fermer la connexion WhatsApp
    if (bot.sock && bot.sock.ws && bot.sock.ws.readyState === 1) {
      bot.sock.ws.close();
    }
    
    // Supprimer de la session
    removeSession(botId);
    
    // Supprimer du gestionnaire de bots
    botManager.removeBot(botId);
    
    let message = `✅ *Bot déconnecté avec succès*\n\n`;
    message += `🤖 Bot : ${botName}\n`;
    message += `📱 Numéro : ${botId}\n`;
    
    if (backupPath) {
      message += `💾 Sauvegarde créée : ${path.basename(backupPath)}\n`;
    }
    
    message += `\n📊 *Statistiques finales :*\n`;
    const stats = userDataManager.getBotStats(botId);
    message += `• Utilisateurs : ${stats.totalUsers}\n`;
    message += `• Batailles : ${stats.totalBattles}\n`;
    message += `• Score total : ${stats.totalScore}\n`;
    
    if (isGlobalDev) {
      message += `\n🗑️ Utilise /cleandata ${botId} pour supprimer définitivement les données.`;
    } else {
      message += `\n💡 Tes données sont conservées. Reconnecte-toi avec /connecter pour les récupérer.`;
    }

    await ctx.reply(message, { parse_mode: "Markdown" });
    
    console.log(`🔌 Bot ${botId} (${botName}) déconnecté par ${ctx.from.first_name}`);
    
  } catch (error) {
    console.error(`❌ Erreur déconnexion bot ${botId}:`, error);
    await ctx.reply("❌ Erreur lors de la déconnexion du bot.");
  }
}

async function disconnectAllBots(ctx, isGlobalDev = false) {
  try {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    const allBots = botManager.getAllBots();
    const botsToDisconnect = isGlobalDev ? 
      allBots : 
      allBots.filter(bot => bot.config.ownerJid === userJid);

    if (botsToDisconnect.length === 0) {
      return ctx.reply("📱 Aucun bot à déconnecter.");
    }

    let disconnectedCount = 0;
    let backupPaths = [];

    for (const bot of botsToDisconnect) {
      try {
        // Créer sauvegarde
        const backupPath = userDataManager.createBotBackup(bot.botId);
        if (backupPath) backupPaths.push(backupPath);
        
        // Fermer connexion
        if (bot.sock && bot.sock.ws && bot.sock.ws.readyState === 1) {
          bot.sock.ws.close();
        }
        
        // Supprimer
        removeSession(bot.botId);
        botManager.removeBot(bot.botId);
        
        disconnectedCount++;
        console.log(`🔌 Bot ${bot.botId} déconnecté (déconnexion massive)`);
        
      } catch (error) {
        console.error(`❌ Erreur déconnexion bot ${bot.botId}:`, error);
      }
    }

    let message = `✅ *Déconnexion massive terminée*\n\n`;
    message += `🔌 Bots déconnectés : ${disconnectedCount}/${botsToDisconnect.length}\n`;
    message += `💾 Sauvegardes créées : ${backupPaths.length}\n`;
    
    if (isGlobalDev) {
      message += `\n🌐 Tous les bots ont été déconnectés.`;
    } else {
      message += `\n👤 Tous tes bots ont été déconnectés.`;
    }

    await ctx.reply(message, { parse_mode: "Markdown" });
    
  } catch (error) {
    console.error("❌ Erreur déconnexion massive:", error);
    await ctx.reply("❌ Erreur lors de la déconnexion massive.");
  }
}