const botManager = require("../../lib/botManager");
const userDataManager = require("../../lib/userDataManager");

module.exports = {
  name: "botinfo",
  description: "Affiche les informations détaillées d'un bot",
  category: "Gestion",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    );

    const allBots = botManager.getAllBots();
    const userBots = isGlobalDev ? 
      allBots : 
      allBots.filter(bot => bot.config.ownerJid === userJid);

    if (userBots.length === 0) {
      return ctx.reply("📱 Aucun bot disponible.");
    }

    // Si un seul bot, afficher ses infos directement
    if (userBots.length === 1) {
      await showBotInfo(ctx, userBots[0].botId);
      return;
    }

    // Plusieurs bots, demander lequel afficher
    const keyboard = userBots.map(bot => [{
      text: `📊 ${bot.config.botname} (${bot.botId})`,
      callback_data: `BOTINFO_${bot.botId}`
    }]);

    await ctx.reply(
      "📊 *Sélectionne le bot à analyser :*",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  },

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    
    if (data.startsWith('BOTINFO_')) {
      const botId = data.replace('BOTINFO_', '');
      await showBotInfo(ctx, botId);
      return ctx.answerCbQuery();
    }
  }
};

async function showBotInfo(ctx, botId) {
  const bot = botManager.getBot(botId);
  const config = botManager.getBotConfig(botId);
  const stats = userDataManager.getBotStats(botId);

  if (!config) {
    return ctx.reply("❌ Configuration bot introuvable.");
  }

  const status = bot ? "🟢 En ligne" : "🔴 Hors ligne";
  const uptime = bot ? Math.floor((Date.now() - new Date(bot.connectedAt).getTime()) / 1000) : 0;
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

  let message = `🤖 **Informations détaillées**\n\n`;
  
  // Informations générales
  message += `📱 **Numéro :** ${botId}\n`;
  message += `🏷️ **Nom :** ${config.botname}\n`;
  message += `📊 **Statut :** ${status}\n`;
  message += `👤 **Propriétaire :** ${config.ownerJid.split('@')[0]}\n`;
  message += `🔧 **Préfixe :** ${config.prefix}\n`;
  message += `📦 **Version :** ${config.version}\n`;
  
  if (bot) {
    message += `⏱️ **Uptime :** ${uptimeStr}\n`;
    message += `🕐 **Dernière activité :** ${new Date(bot.lastActivity).toLocaleString('fr-FR')}\n`;
  }
  
  message += `📅 **Créé le :** ${new Date(config.createdAt).toLocaleDateString('fr-FR')}\n\n`;

  // Statistiques d'utilisation
  message += `📊 **Statistiques d'utilisation :**\n`;
  message += `• Utilisateurs actifs : ${stats.totalUsers}\n`;
  message += `• Batailles jouées : ${stats.totalBattles}\n`;
  message += `• Score total communauté : ${stats.totalScore}\n`;
  message += `• Victoires totales : ${stats.totalVictories}\n`;
  message += `• Rappels programmés : ${stats.totalRappels}\n`;
  message += `• Signalements : ${stats.totalSignals}\n`;
  message += `• Récompenses disponibles : ${stats.totalRewards}\n\n`;

  // Configuration IA
  message += `🧠 **Intelligence Artificielle :**\n`;
  for (const [key, value] of Object.entries(config.ai)) {
    const emoji = value ? "✅" : "❌";
    message += `${emoji} ${key}\n`;
  }
  message += `\n`;

  // Catégories de commandes
  message += `🎮 **Catégories de commandes :**\n`;
  for (const [key, value] of Object.entries(config.commands.categories)) {
    const emoji = value ? "✅" : "❌";
    message += `${emoji} ${key}\n`;
  }
  message += `\n`;

  // Permissions
  message += `👥 **Permissions :**\n`;
  message += `• Propriétaires : ${config.permissions.owner.length}\n`;
  message += `• Sudo : ${config.permissions.sudo.length}\n`;
  
  // Limites et configuration
  message += `\n⚙️ **Configuration :**\n`;
  message += `• Temps quiz : ${config.limits.quizTime}s\n`;
  message += `• Questions max/soumission : ${config.limits.maxQuestionsPerSubmission}\n`;
  message += `• Cooldown : ${config.limits.cooldownTime}ms\n`;

  const keyboard = [
    [
      { text: "⚙️ Configurer", callback_data: `CONFIG_BOT_${botId}` },
      { text: "🔄 Actualiser", callback_data: `BOTINFO_${botId}` }
    ]
  ];

  // Ajouter boutons dev si applicable
  const userId = ctx.from.id.toString();
  const isGlobalDev = global.dev && global.dev.some(dev => 
    [userId, `${userId}@lid`].includes(dev)
  );

  if (isGlobalDev) {
    keyboard.push([
      { text: "🔌 Déconnecter", callback_data: `DISCONNECT_${botId}` },
      { text: "🗑️ Supprimer données", callback_data: `CLEAN_CONFIRM_${botId}` }
    ]);
  }

  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}