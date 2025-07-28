const botManager = require("../../lib/botManager");

module.exports = {
  name: "configbot",
  description: "Configure ton bot WhatsApp personnel",
  category: "Configuration",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    // Vérifier si l'utilisateur a un bot connecté
    const userBots = botManager.getAllBots().filter(bot => 
      bot.config.ownerJid === userJid || 
      botManager.checkPermission(bot.botId, userJid, 'owner')
    );

    if (userBots.length === 0) {
      return ctx.reply(
        "❌ Tu n'as aucun bot connecté.\n\n" +
        "Utilise /connecter <numéro> pour connecter ton bot WhatsApp d'abord."
      );
    }

    // Si plusieurs bots, demander lequel configurer
    if (userBots.length > 1) {
      const keyboard = userBots.map(bot => [{
        text: `🤖 ${bot.config.botname} (${bot.botId})`,
        callback_data: `CONFIG_BOT_${bot.botId}`
      }]);

      return ctx.reply(
        "🤖 *Sélectionne le bot à configurer :*",
        {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard }
        }
      );
    }

    // Un seul bot, afficher sa configuration
    const bot = userBots[0];
    await showBotConfig(ctx, bot.botId);
  },

  // Gestion des callbacks pour la configuration
  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    
    // Vérifier que ce callback nous concerne
    if (!data.startsWith('CONFIG_BOT_') && !data.startsWith('TOGGLE_') && !data.startsWith('EDIT_')) {
      return false;
    }
    
    if (data.startsWith('CONFIG_BOT_')) {
      const botId = data.replace('CONFIG_BOT_', '');
      
      // Vérifier les permissions
      const userId = ctx.from.id.toString();
      const userJid = `${userId}@s.whatsapp.net`;
      const isGlobalDev = global.TELEGRAM_DEV && global.TELEGRAM_DEV.includes(parseInt(userId));
      
      const bot = botManager.getBot(botId);
      if (!bot && !isGlobalDev) {
        await ctx.answerCbQuery("❌ Bot introuvable", { show_alert: true });
        return true;
      }
      
      if (!isGlobalDev && bot.config.ownerJid !== userJid) {
        await ctx.answerCbQuery("⛔ Tu ne peux configurer que ton propre bot", { show_alert: true });
        return true;
      }
      
      await showBotConfig(ctx, botId);
      return true;
    }

    if (data.startsWith('CONFIG_AI_')) {
      const botId = data.replace('CONFIG_AI_', '');
      await showAIConfig(ctx, botId);
      return true;
    }

    if (data.startsWith('CONFIG_CMD_')) {
      const botId = data.replace('CONFIG_CMD_', '');
      await showCommandConfig(ctx, botId);
      return true;
    }

    if (data.startsWith('TOGGLE_AI_')) {
      const parts = data.split('_');
      const botId = parts[2];
      const setting = parts[3];
      await toggleAISetting(ctx, botId, setting);
      return true;
    }

    if (data.startsWith('TOGGLE_CMD_')) {
      const parts = data.split('_');
      const botId = parts[2];
      const category = parts[3];
      await toggleCommandCategory(ctx, botId, category);
      return true;
    }

    if (data.startsWith('EDIT_')) {
      const parts = data.split('_');
      const botId = parts[1];
      const field = parts[2];
      await editField(ctx, botId, field);
      return true;
    }
    
    return false;
  }
};

async function showAIConfig(ctx, botId) {
  const config = botManager.getBotConfig(botId);
  if (!config) return;

  let message = `🧠 *Configuration IA - ${config.botname}*\n\n`;
  
  for (const [key, value] of Object.entries(config.ai)) {
    const emoji = value ? "✅" : "❌";
    const description = getAIDescription(key);
    message += `${emoji} **${key}** - ${description}\n`;
  }

  const keyboard = [];
  for (const [key] of Object.entries(config.ai)) {
    keyboard.push([{
      text: `${config.ai[key] ? '❌ Désactiver' : '✅ Activer'} ${key}`,
      callback_data: `TOGGLE_AI_${botId}_${key}`
    }]);
  }
  
  keyboard.push([{
    text: "🔙 Retour",
    callback_data: `CONFIG_BOT_${botId}`
  }]);

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function showCommandConfig(ctx, botId) {
  const config = botManager.getBotConfig(botId);
  if (!config) return;

  let message = `🎮 *Catégories de Commandes - ${config.botname}*\n\n`;
  
  for (const [key, value] of Object.entries(config.commands.categories)) {
    const emoji = value ? "✅" : "❌";
    message += `${emoji} **${key}**\n`;
  }

  const keyboard = [];
  for (const [key] of Object.entries(config.commands.categories)) {
    keyboard.push([{
      text: `${config.commands.categories[key] ? '❌ Désactiver' : '✅ Activer'} ${key}`,
      callback_data: `TOGGLE_CMD_${botId}_${key}`
    }]);
  }
  
  keyboard.push([{
    text: "🔙 Retour",
    callback_data: `CONFIG_BOT_${botId}`
  }]);

  await ctx.editMessageText(message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function toggleAISetting(ctx, botId, setting) {
  const config = botManager.getBotConfig(botId);
  if (!config) return;

  const userId = ctx.from.id.toString();
  const userJid = `${userId}@s.whatsapp.net`;

  // Vérifier les permissions
  if (!botManager.checkPermission(botId, userJid, 'owner')) {
    return ctx.answerCbQuery("⛔ Seul le propriétaire peut modifier cette configuration.", { show_alert: true });
  }

  const updates = {
    ai: { ...config.ai }
  };
  updates.ai[setting] = !config.ai[setting];

  botManager.updateBotConfig(botId, updates, userJid);
  
  await ctx.answerCbQuery(`${setting} ${updates.ai[setting] ? 'activé' : 'désactivé'}`);
  await showAIConfig(ctx, botId);
}

async function toggleCommandCategory(ctx, botId, category) {
  const config = botManager.getBotConfig(botId);
  if (!config) return;

  const userId = ctx.from.id.toString();
  const userJid = `${userId}@s.whatsapp.net`;

  if (!botManager.checkPermission(botId, userJid, 'owner')) {
    return ctx.answerCbQuery("⛔ Seul le propriétaire peut modifier cette configuration.", { show_alert: true });
  }

  const updates = {
    commands: {
      categories: { ...config.commands.categories }
    }
  };
  updates.commands.categories[category] = !config.commands.categories[category];

  botManager.updateBotConfig(botId, updates, userJid);
  
  await ctx.answerCbQuery(`Catégorie ${category} ${updates.commands.categories[category] ? 'activée' : 'désactivée'}`);
  await showCommandConfig(ctx, botId);
}

function getAIDescription(key) {
  const descriptions = {
    PARKYAI: "Assistant IA conversationnel",
    TRANSLATOR: "Traduction automatique des messages",
    SUGGESTIONS: "Suggestions de commandes",
    MAINTENANCE: "Mode maintenance du bot"
  };
  return descriptions[key] || "Fonctionnalité IA";
}
async function showBotConfig(ctx, botId) {
  const config = botManager.getBotConfig(botId);
  if (!config) {
    return ctx.editMessageText ? 
      ctx.editMessageText("❌ Configuration introuvable.") :
      ctx.reply("❌ Configuration introuvable.");
  }

  const bot = botManager.getBot(botId);
  const status = bot ? "🟢 En ligne" : "🔴 Hors ligne";

  let message = `🤖 *Configuration de ${config.botname}*\n\n`;
  message += `📱 *Numéro :* ${botId}\n`;
  message += `📊 *Statut :* ${status}\n`;
  message += `🏷️ *Préfixe :* ${config.prefix}\n`;
  message += `📦 *Version :* ${config.version}\n\n`;

  message += `🧠 *Intelligence Artificielle :*\n`;
  for (const [key, value] of Object.entries(config.ai)) {
    const emoji = value ? "✅" : "❌";
    message += `${emoji} ${key}\n`;
  }

  message += `\n🎮 *Catégories de commandes :*\n`;
  for (const [key, value] of Object.entries(config.commands.categories)) {
    const emoji = value ? "✅" : "❌";
    message += `${emoji} ${key}\n`;
  }

  const keyboard = [
    [
      { text: "🧠 Configuration IA", callback_data: `CONFIG_AI_${botId}` },
      { text: "🎮 Catégories Commandes", callback_data: `CONFIG_CMD_${botId}` }
    ],
    [
      { text: "⚙️ Paramètres Bot", callback_data: `CONFIG_SETTINGS_${botId}` },
      { text: "🎨 Personnalisation", callback_data: `CONFIG_THEME_${botId}` }
    ],
    [
      { text: "👥 Permissions", callback_data: `CONFIG_PERMS_${botId}` },
      { text: "🔄 Actualiser", callback_data: `CONFIG_BOT_${botId}` }
    ]
  ];

  const method = ctx.editMessageText || ctx.reply;
  await method.call(ctx, message, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function toggleSetting(ctx, botId, category, setting) {
  const config = botManager.getBotConfig(botId);
  if (!config) return;

  const userId = ctx.from.id.toString();
  const userJid = `${userId}@s.whatsapp.net`;

  // Vérifier les permissions
  if (!botManager.checkPermission(botId, userJid, 'owner')) {
    return ctx.reply("⛔ Seul le propriétaire peut modifier cette configuration.");
  }

  const updates = {};
  if (category === 'ai') {
    updates.ai = { ...config.ai };
    updates.ai[setting] = !config.ai[setting];
  } else if (category === 'cmd') {
    updates.commands = { ...config.commands };
    updates.commands.categories = { ...config.commands.categories };
    updates.commands.categories[setting] = !config.commands.categories[setting];
  }

  botManager.updateBotConfig(botId, updates, userJid);
  
  // Rafraîchir l'affichage
  await showBotConfig(ctx, botId);
}

async function editField(ctx, botId, field) {
  const config = botManager.getBotConfig(botId);
  if (!config) return;

  const userId = ctx.from.id.toString();
  const userJid = `${userId}@s.whatsapp.net`;

  if (!botManager.checkPermission(botId, userJid, 'owner')) {
    return ctx.reply("⛔ Seul le propriétaire peut modifier cette configuration.");
  }

  let promptMessage = "";
  switch (field) {
    case 'botname':
      promptMessage = "📝 Envoie le nouveau nom de ton bot :";
      break;
    case 'prefix':
      promptMessage = "📝 Envoie le nouveau préfixe (ex: !, ., $) :";
      break;
    case 'stickerAuthor':
      promptMessage = "📝 Envoie le nouveau nom d'auteur pour les stickers :";
      break;
    default:
      return ctx.reply("❌ Champ non modifiable.");
  }

  await ctx.reply(promptMessage);
  
  // Attendre la réponse de l'utilisateur
  // Note: Dans une vraie implémentation, tu aurais besoin d'un système de session
  // pour gérer les réponses en attente
}