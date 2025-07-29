const userDataManager = require("../../lib/userDataManager");
const botManager = require("../../lib/botManager");

module.exports = {
  name: "mystats",
  description: "Affiche tes statistiques personnelles sur tes bots",
  category: "Personnel",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    const isGlobalDev = (global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    )) || (global.TELEGRAM_DEV && global.TELEGRAM_DEV.includes(parseInt(userId)));
    
    console.log(`🔍 Debug mystats:`);
    console.log(`   UserId: ${userId}`);
    console.log(`   UserJid: ${userJid}`);
    console.log(`   IsGlobalDev: ${isGlobalDev}`);
    
    const allBots = botManager.getAllBots();
    const userBots = allBots.filter(bot => {
      const match = bot.config.ownerJid === userJid;
      console.log(`   Checking bot ${bot.botId}: ${bot.config.ownerJid} === ${userJid} ? ${match}`);
      return match;
    });

    console.log(`📊 Stats debug - User: ${userId}, UserJid: ${userJid}, UserBots: ${userBots.length}`);
    
    if (userBots.length === 0 && !isGlobalDev) {
      return ctx.reply(
        `📊 **Tu n'as aucun bot connecté.**\n\n` +
        `🔍 **Debug:**\n` +
        `• UserJid: ${userJid}\n` +
        `• TotalBots: ${allBots.length}\n` +
        `• IsGlobalDev: ${isGlobalDev}\n\n` +
        "Utilise /connecter <numéro> pour connecter ton bot WhatsApp.",
        { parse_mode: "Markdown" }
      );
    }

    let message = `📊 **Tes Statistiques PARKY-MD**\n\n`;
    message += `👤 **Utilisateur :** ${ctx.from.first_name}\n`;
    message += `🆔 **ID Telegram :** ${userId}\n`;
    
    if (isGlobalDev) {
      message += `🌟 **Statut :** Développeur Global\n`;
      message += `🤖 **Accès :** Tous les bots (${allBots.length})\n`;
    } else {
      message += `🤖 **Tes bots :** ${userBots.length}\n`;
    }
    
    message += `📅 **Première connexion :** ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    // Statistiques globales de l'utilisateur
    let totalUsers = 0;
    let totalBattles = 0;
    let totalScore = 0;
    let totalVictories = 0;
    let totalRappels = 0;
    let totalRewards = 0;

    const botsToAnalyze = isGlobalDev ? allBots : userBots;

    message += `📈 **Statistiques de tes bots :**\n\n`;

    botsToAnalyze.forEach(bot => {
      const stats = userDataManager.getBotStats(bot.botId);
      const status = bot.sock ? "🟢" : "🔴";
      
      message += `${status} **${bot.config.botname}**\n`;
      message += `   📱 ${bot.botId}\n`;
      message += `   👥 ${stats.totalUsers} utilisateurs\n`;
      message += `   🎮 ${stats.totalBattles} batailles\n`;
      message += `   🏆 ${stats.totalVictories} victoires\n`;
      message += `   📝 ${stats.totalRappels} rappels\n`;
      message += `   🎁 ${stats.totalRewards} récompenses\n\n`;

      totalUsers += stats.totalUsers;
      totalBattles += stats.totalBattles;
      totalScore += stats.totalScore;
      totalVictories += stats.totalVictories;
      totalRappels += stats.totalRappels;
      totalRewards += stats.totalRewards;
    });

    // Résumé global
    message += `🌟 **Résumé Global :**\n`;
    message += `• Total utilisateurs : ${totalUsers}\n`;
    message += `• Total batailles : ${totalBattles}\n`;
    message += `• Score communauté : ${totalScore}\n`;
    message += `• Total victoires : ${totalVictories}\n`;
    message += `• Rappels actifs : ${totalRappels}\n`;
    message += `• Récompenses disponibles : ${totalRewards}\n\n`;

    // Calcul du niveau d'activité
    const activityLevel = calculateActivityLevel(totalUsers, totalBattles, totalScore);
    message += `📊 **Niveau d'activité :** ${activityLevel}\n`;

    // Badges et achievements
    const badges = calculateBadges(totalUsers, totalBattles, totalVictories, userBots.length);
    if (badges.length > 0) {
      message += `\n🏅 **Badges obtenus :**\n`;
      badges.forEach(badge => {
        message += `${badge.emoji} ${badge.name}\n`;
      });
    }

    const keyboard = [
      [
        { text: "🤖 Mes Bots", callback_data: "MY_BOTS_LIST" },
        { text: "📊 Détails", callback_data: "MY_STATS_DETAILS" }
      ],
      [
        { text: "🔄 Actualiser", callback_data: "MY_STATS_REFRESH" }
      ]
    ];

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });
  },

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    
    if (!data.startsWith('MY_STATS_') && !data.startsWith('MY_BOTS_')) {
      return false;
    }
    
    switch (data) {
      case 'MY_STATS_REFRESH':
        await this.execute(ctx);
        break;
      
      case 'MY_STATS_DETAILS':
        await showDetailedStats(ctx);
        break;
      
      case 'MY_BOTS_LIST':
        await showBotsList(ctx);
        break;
    }

    return true;
  }
};

function calculateActivityLevel(users, battles, score) {
  const totalActivity = users * 10 + battles * 5 + Math.floor(score / 100);
  
  if (totalActivity >= 1000) return "🔥 Très Actif";
  if (totalActivity >= 500) return "⚡ Actif";
  if (totalActivity >= 100) return "📈 Modéré";
  if (totalActivity >= 10) return "🌱 Débutant";
  return "😴 Inactif";
}

function calculateBadges(users, battles, victories, botCount) {
  const badges = [];
  
  if (botCount >= 5) badges.push({ emoji: "🏭", name: "Collectionneur de Bots" });
  if (botCount >= 10) badges.push({ emoji: "🌐", name: "Empire PARKY" });
  
  if (users >= 100) badges.push({ emoji: "👥", name: "Communauté Active" });
  if (users >= 500) badges.push({ emoji: "🌟", name: "Influenceur PARKY" });
  
  if (battles >= 50) badges.push({ emoji: "⚔️", name: "Maître des Batailles" });
  if (battles >= 200) badges.push({ emoji: "🏆", name: "Champion Quiz" });
  
  if (victories >= 100) badges.push({ emoji: "👑", name: "Roi des Victoires" });
  if (victories >= 500) badges.push({ emoji: "🎯", name: "Légende PARKY" });
  
  return badges;
}

async function showDetailedStats(ctx) {
  await ctx.editMessageText("📊 Statistiques détaillées en cours de développement...");
}

async function showBotsList(ctx) {
  await ctx.editMessageText("🤖 Liste détaillée des bots en cours de développement...");
  }
