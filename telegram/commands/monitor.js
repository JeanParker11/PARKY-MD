const messageMonitor = require("../../lib/messageMonitor");
const botManager = require("../../lib/botManager");

module.exports = {
  name: "monitor",
  description: "Contrôle le monitoring des messages des bots",
  category: "Développement",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    // Vérifier si global dev
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    );

    if (!isGlobalDev) {
      return ctx.reply("⛔ Cette commande est réservée aux développeurs globaux.");
    }

    const stats = messageMonitor.getStats();
    const allBots = botManager.getAllBots();

    let message = `👁️ **Monitoring des Messages**\n\n`;
    message += `📊 **Statut :** ${stats.enabled ? '🟢 Activé' : '🔴 Désactivé'}\n`;
    message += `🎯 **Bot sélectionné :** ${stats.selectedBot === 'all' ? 'Tous les bots' : stats.selectedBot}\n`;
    message += `📱 **Bots enregistrés :** ${stats.totalBots}\n`;
    message += `💬 **Messages traités :** ${stats.totalMessages}\n\n`;

    message += `🤖 **Bots disponibles :**\n`;
    allBots.forEach(bot => {
      const status = bot.sock ? "🟢" : "🔴";
      const isSelected = stats.selectedBot === bot.botId ? "👁️" : "  ";
      message += `${isSelected}${status} ${bot.config.botname} (${bot.botId})\n`;
    });

    const keyboard = [
      [
        { text: stats.enabled ? "🔴 Désactiver" : "🟢 Activer", callback_data: "MONITOR_TOGGLE" },
        { text: "👁️ Tous les bots", callback_data: "MONITOR_ALL" }
      ]
    ];

    // Ajouter boutons pour chaque bot
    allBots.forEach(bot => {
      keyboard.push([{
        text: `👁️ ${bot.config.botname}`,
        callback_data: `MONITOR_BOT_${bot.botId}`
      }]);
    });

    keyboard.push([
      { text: "📊 Statistiques", callback_data: "MONITOR_STATS" },
      { text: "🔄 Actualiser", callback_data: "MONITOR_REFRESH" }
    ]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });
  },

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    // Vérifier que ce callback nous concerne
    if (!data.startsWith('MONITOR_')) {
      return false;
    }
    
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    );

    if (!isGlobalDev) {
      await ctx.answerCbQuery("⛔ Accès refusé", { show_alert: true });
      return true;
    }

    switch (data) {
      case 'MONITOR_TOGGLE':
        const newState = messageMonitor.toggle();
        await ctx.answerCbQuery(`Monitoring ${newState ? 'activé' : 'désactivé'}`);
        await this.execute(ctx);
        break;
      
      case 'MONITOR_ALL':
        messageMonitor.setBot('all');
        await ctx.answerCbQuery("Monitoring de tous les bots activé");
        await this.execute(ctx);
        break;
      
      case 'MONITOR_STATS':
        await showDetailedStats(ctx);
        break;
      
      case 'MONITOR_REFRESH':
        await this.execute(ctx);
        break;
      
      default:
        if (data.startsWith('MONITOR_BOT_')) {
          const botId = data.replace('MONITOR_BOT_', '');
          messageMonitor.setBot(botId);
          const bot = botManager.getBot(botId);
          await ctx.answerCbQuery(`Monitoring du bot ${bot?.config.botname || botId} activé`);
          await this.execute(ctx);
        }
        break;
    }

    return true;
  }
};

async function showDetailedStats(ctx) {
  const stats = messageMonitor.getStats();
  const allBots = botManager.getAllBots();

  let message = `📊 **Statistiques Détaillées du Monitoring**\n\n`;
  
  message += `⚙️ **Configuration :**\n`;
  message += `• Statut : ${stats.enabled ? '🟢 Activé' : '🔴 Désactivé'}\n`;
  message += `• Bot sélectionné : ${stats.selectedBot}\n`;
  message += `• Messages totaux : ${stats.totalMessages}\n\n`;

  message += `🤖 **Détails par bot :**\n`;
  allBots.forEach(bot => {
    const status = bot.sock ? "🟢 En ligne" : "🔴 Hors ligne";
    const lastActivity = new Date(bot.lastActivity).toLocaleTimeString();
    message += `• **${bot.config.botname}**\n`;
    message += `  📱 ${bot.botId}\n`;
    message += `  ${status}\n`;
    message += `  🕐 Dernière activité : ${lastActivity}\n\n`;
  });

  message += `💡 **Commandes console disponibles :**\n`;
  message += `• \`monitor.toggle()\` - Activer/désactiver\n`;
  message += `• \`monitor.setBot("botId")\` - Surveiller un bot\n`;
  message += `• \`monitor.listBots()\` - Lister les bots\n`;

  await ctx.editMessageText(message, { parse_mode: "Markdown" });
}