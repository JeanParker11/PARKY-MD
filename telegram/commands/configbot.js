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
    
    if (data.startsWith('CONFIG_BOT_')) {
      const botId = data.replace('CONFIG_BOT_', '');
      await showBotConfig(ctx, botId);
      return ctx.answerCbQuery();
    }

    if (data.startsWith('TOGGLE_')) {
      const [, botId, category, setting] = data.split('_');
      await toggleSetting(ctx, botId, category, setting);
      return ctx.answerCbQuery("✅ Paramètre modifié");
    }

    if (data.startsWith('EDIT_')) {
      const [, botId, field] = data.split('_');
      await editField(ctx, botId, field);
      return ctx.answerCbQuery();
    }
  }
};

async function showBotConfig(ctx, botId) {
  const config = botManager.getBotConfig(botId);
  if (!config) {
    return ctx.reply("❌ Configuration introuvable.");
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
      { text: "🧠 IA", callback_data: `CONFIG_AI_${botId}` },
      { text: "🎮 Commandes", callback_data: `CONFIG_CMD_${botId}` }
    ],
    [
      { text: "⚙️ Paramètres", callback_data: `CONFIG_SETTINGS_${botId}` },
      { text: "🎨 Thème", callback_data: `CONFIG_THEME_${botId}` }
    ],
    [
      { text: "👥 Permissions", callback_data: `CONFIG_PERMS_${botId}` }
    ]
  ];

  await ctx.reply(message, {
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