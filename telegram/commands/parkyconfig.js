const botManager = require("../../lib/botManager");

module.exports = {
  name: "parkyconfig",
  description: "Configure ton PARKY AI personnel",
  category: "IA",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    const allBots = botManager.getAllBots();
    const userBots = allBots.filter(bot => bot.config.ownerJid === userJid);

    if (userBots.length === 0) {
      return ctx.reply(
        "🤖 Tu n'as aucun bot connecté.\n\n" +
        "Utilise /connecter <numéro> pour connecter ton bot WhatsApp d'abord."
      );
    }

    // Si un seul bot, configurer directement
    if (userBots.length === 1) {
      await showParkyConfig(ctx, userBots[0].botId);
      return;
    }

    // Plusieurs bots, demander lequel configurer
    const keyboard = userBots.map(bot => [{
      text: `🧠 ${bot.config.botname} (${bot.botId})`,
      callback_data: `PARKY_CONFIG_${bot.botId}`
    }]);

    await ctx.reply(
      "🧠 *Sélectionne le bot PARKY à configurer :*",
      {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  },

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;

    // Vérifier que ce callback nous concerne
    if (!data.startsWith('PARKY_')) {
      return false;
    }

    if (data.startsWith('PARKY_CONFIG_')) {
      const botId = data.replace('PARKY_CONFIG_', '');
      
      // Vérifier les permissions
      const bot = botManager.getBot(botId);
      if (!bot || bot.config.ownerJid !== userJid) {
        await ctx.answerCbQuery("⛔ Tu ne peux configurer que tes propres bots", { show_alert: true });
        return true;
      }

      await showParkyConfig(ctx, botId);
      return true;
    }

    if (data.startsWith('PARKY_TOGGLE_')) {
      const [, botId, setting] = data.split('_').slice(2);
      await toggleParkySetting(ctx, botId, setting);
      return true;
    }

    if (data.startsWith('PARKY_PERSONALITY_')) {
      const [, botId, personality] = data.split('_').slice(2);
      await setParkyPersonality(ctx, botId, personality);
      return true;
    }
    
    return false;
  }
};

async function showParkyConfig(ctx, botId) {
  const config = botManager.getBotConfig(botId);
  if (!config) {
    return ctx.reply("❌ Configuration introuvable.");
  }

  const bot = botManager.getBot(botId);
  const status = bot ? "🟢 En ligne" : "🔴 Hors ligne";

  let message = `🧠 **Configuration PARKY AI**\n\n`;
  message += `🤖 **Bot :** ${config.botname}\n`;
  message += `📊 **Statut :** ${status}\n`;
  message += `👤 **Propriétaire :** ${config.ownerJid.split('@')[0]}\n`;
  message += `🎨 **Créateur :** ${config.creatorName || global.ownername}\n\n`;

  // Paramètres IA actuels
  message += `⚙️ **Paramètres IA :**\n`;
  for (const [key, value] of Object.entries(config.ai)) {
    const emoji = value ? "✅" : "❌";
    const description = getAIDescription(key);
    message += `${emoji} **${key}** - ${description}\n`;
  }

  // Configuration PARKY
  message += `\n🤖 **Configuration PARKY :**\n`;
  message += `• Nom : ${config.parkyName || 'PARKY'}\n`;
  message += `• Pack stickers : ${config.stickerPackName}\n`;
  message += `• Auteur stickers : ${config.stickerAuthor}\n`;

  // Statistiques d'utilisation IA
  const aiStats = getAIUsageStats(botId);
  message += `\n📊 **Utilisation IA :**\n`;
  message += `• Messages traités : ${aiStats.messagesProcessed}\n`;
  message += `• Images générées : ${aiStats.imagesGenerated}\n`;
  message += `• Traductions : ${aiStats.translations}\n`;

  const keyboard = [
    [
      { text: config.ai.PARKYAI ? "❌ Désactiver PARKY" : "✅ Activer PARKY", callback_data: `PARKY_TOGGLE_${botId}_PARKYAI` },
      { text: config.ai.TRANSLATOR ? "❌ Désactiver Traducteur" : "✅ Activer Traducteur", callback_data: `PARKY_TOGGLE_${botId}_TRANSLATOR` }
    ],
    [
      { text: config.ai.SUGGESTIONS ? "❌ Désactiver Suggestions" : "✅ Activer Suggestions", callback_data: `PARKY_TOGGLE_${botId}_SUGGESTIONS` },
      { text: config.ai.MAINTENANCE ? "❌ Désactiver Maintenance" : "✅ Activer Maintenance", callback_data: `PARKY_TOGGLE_${botId}_MAINTENANCE` }
    ],
    [
      { text: "🏷️ Changer nom PARKY", callback_data: `PARKY_NAME_${botId}` },
      { text: "🎨 Personnalisation", callback_data: `PARKY_CUSTOM_${botId}` }
    ],
    [
      { text: "📊 Statistiques IA", callback_data: `PARKY_STATS_${botId}` },
      { text: "🔄 Actualiser", callback_data: `PARKY_CONFIG_${botId}` }
    ]
  ];

  await ctx.reply(message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function toggleParkySetting(ctx, botId, setting) {
  const config = botManager.getBotConfig(botId);
  if (!config) return;

  const updates = {
    ai: { ...config.ai }
  };
  updates.ai[setting] = !config.ai[setting];

  const success = botManager.updateBotConfig(botId, updates, ctx.from.id.toString());
  
  if (success) {
    await showParkyConfig(ctx, botId);
  } else {
    await ctx.reply("❌ Erreur lors de la mise à jour.");
  }
}

async function setParkyPersonality(ctx, botId, personality) {
  const updates = {
    parkyPersonality: personality
  };

  const success = botManager.updateBotConfig(botId, updates, ctx.from.id.toString());
  
  if (success) {
    await ctx.reply(`✅ Personnalité PARKY mise à jour : ${getPersonalityEmoji(personality)} ${personality}`);
    await showParkyConfig(ctx, botId);
  } else {
    await ctx.reply("❌ Erreur lors de la mise à jour.");
  }
}

function getAIDescription(key) {
  const descriptions = {
    PARKYAI: "Assistant IA conversationnel",
    TRANSLATOR: "Traduction automatique",
    SUGGESTIONS: "Suggestions de commandes",
    MAINTENANCE: "Mode maintenance"
  };
  return descriptions[key] || "Fonctionnalité IA";
}

function getPersonalityEmoji(personality) {
  const emojis = {
    amical: "😊",
    professionnel: "🤵",
    drole: "😄",
    sage: "🧙‍♂️",
    energique: "⚡",
    calme: "😌",
    mysterieux: "🕵️‍♂️"
  };
  return emojis[personality] || "🤖";
}

function getAIUsageStats(botId) {
  // Ici tu peux implémenter la récupération des vraies stats
  // Pour l'instant, des valeurs d'exemple
  return {
    messagesProcessed: Math.floor(Math.random() * 1000),
    imagesGenerated: Math.floor(Math.random() * 100),
    translations: Math.floor(Math.random() * 200)
  };
}