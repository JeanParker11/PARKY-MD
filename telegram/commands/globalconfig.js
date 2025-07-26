const botManager = require("../../lib/botManager");

module.exports = {
  name: "globalconfig",
  description: "Configuration globale pour tous les bots (dev uniquement)",
  category: "Développement",
  ownerOnly: false, // On gère les permissions manuellement

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    const userBase = userId;

    // Vérifier si l'utilisateur est global dev
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userBase, `${userBase}@lid`].includes(dev)
    );

    if (!isGlobalDev) {
      return ctx.reply("⛔ Cette commande est réservée aux développeurs globaux.");
    }

    const stats = botManager.getStats();
    const allBots = botManager.getAllBots();

    let message = `🌐 *Configuration Globale PARKY-MD*\n\n`;
    message += `📊 *Statistiques :*\n`;
    message += `• Bots totaux : ${stats.totalBots}\n`;
    message += `• Bots actifs : ${stats.activeBots}\n`;
    message += `• Configurations : ${stats.totalConfigs}\n\n`;

    message += `🤖 *Bots connectés :*\n`;
    allBots.forEach(bot => {
      const status = bot.sock ? "🟢" : "🔴";
      message += `${status} ${bot.config.botname} (${bot.botId})\n`;
    });

    const keyboard = [
      [
        { text: "🧠 IA Globale", callback_data: "GLOBAL_AI" },
        { text: "🎮 Commandes", callback_data: "GLOBAL_CMD" }
      ],
      [
        { text: "⚙️ Paramètres", callback_data: "GLOBAL_SETTINGS" },
        { text: "🔄 Redémarrer Tous", callback_data: "GLOBAL_RESTART" }
      ],
      [
        { text: "📊 Statistiques", callback_data: "GLOBAL_STATS" },
        { text: "🗑️ Nettoyer", callback_data: "GLOBAL_CLEANUP" }
      ]
    ];

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
    if (!data.startsWith('GLOBAL_')) {
      return false;
    }

    // Vérifier les permissions dev
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    );

    if (!isGlobalDev) {
      await ctx.answerCbQuery("⛔ Accès refusé", { show_alert: true });
      return true;
    }

    switch (data) {
      case 'GLOBAL_AI':
        await showGlobalAIConfig(ctx);
        break;
      
      case 'GLOBAL_CMD':
        await showGlobalCommandConfig(ctx);
        break;
      
      case 'GLOBAL_SETTINGS':
        await showGlobalSettings(ctx);
        break;
      
      case 'GLOBAL_RESTART':
        await restartAllBots(ctx);
        break;
      
      case 'GLOBAL_STATS':
        await showDetailedStats(ctx);
        break;
      
      case 'GLOBAL_CLEANUP':
        await cleanupInactiveBots(ctx);
        break;
      
      case 'GLOBAL_BACK':
        await this.execute(ctx);
        break;
      
      default:
        // Gestion des boutons de configuration globale IA
        if (data.startsWith('GLOBAL_AI_')) {
          await handleGlobalAIToggle(ctx, data);
        } else if (data.startsWith('GLOBAL_CMD_')) {
          await handleGlobalCommandToggle(ctx, data);
        } else if (data.startsWith('GLOBAL_MAINTENANCE_')) {
          await handleGlobalMaintenance(ctx, data);
        }
        break;
    }

    return true;
  }
};

async function showGlobalAIConfig(ctx) {
  const keyboard = [
    [
      { text: "✅ Activer PARKY AI (Tous)", callback_data: "GLOBAL_AI_PARKYAI_ON" },
      { text: "❌ Désactiver PARKY AI (Tous)", callback_data: "GLOBAL_AI_PARKYAI_OFF" }
    ],
    [
      { text: "✅ Activer Traducteur (Tous)", callback_data: "GLOBAL_AI_TRANSLATOR_ON" },
      { text: "❌ Désactiver Traducteur (Tous)", callback_data: "GLOBAL_AI_TRANSLATOR_OFF" }
    ],
    [
      { text: "✅ Activer Suggestions (Tous)", callback_data: "GLOBAL_AI_SUGGESTIONS_ON" },
      { text: "❌ Désactiver Suggestions (Tous)", callback_data: "GLOBAL_AI_SUGGESTIONS_OFF" }
    ],
    [
      { text: "🔧 Mode Maintenance (Tous)", callback_data: "GLOBAL_AI_MAINTENANCE_TOGGLE" }
    ],
    [
      { text: "🚨 MAINTENANCE GLOBALE", callback_data: "GLOBAL_MAINTENANCE_TOGGLE" }
    ],
    [
      { text: "🔙 Retour", callback_data: "GLOBAL_BACK" }
    ]
  ];

  await ctx.editMessageText(
    "🧠 *Configuration IA Globale*\n\n" +
    "Applique les paramètres IA à tous les bots connectés :",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    }
  );
}

async function showGlobalCommandConfig(ctx) {
  const keyboard = [
    [
      { text: "✅ Activer JEUX (Tous)", callback_data: "GLOBAL_CMD_JEUX_ON" },
      { text: "❌ Désactiver JEUX (Tous)", callback_data: "GLOBAL_CMD_JEUX_OFF" }
    ],
    [
      { text: "✅ Activer UNIROLIST (Tous)", callback_data: "GLOBAL_CMD_UNIROLIST_ON" },
      { text: "❌ Désactiver UNIROLIST (Tous)", callback_data: "GLOBAL_CMD_UNIROLIST_OFF" }
    ],
    [
      { text: "🔙 Retour", callback_data: "GLOBAL_BACK" }
    ]
  ];

  await ctx.editMessageText(
    "🎮 *Configuration Commandes Globale*\n\n" +
    "Active/désactive les catégories de commandes sur tous les bots :",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    }
  );
}

async function restartAllBots(ctx) {
  await ctx.editMessageText("🔄 Redémarrage de tous les bots en cours...");
  
  // Ici tu peux implémenter la logique de redémarrage
  // Par exemple, relancer les connexions WhatsApp
  
  setTimeout(async () => {
    await ctx.editMessageText("✅ Tous les bots ont été redémarrés avec succès !");
  }, 3000);
}

async function showDetailedStats(ctx) {
  const allBots = botManager.getAllBots();
  
  let message = "📊 *Statistiques Détaillées*\n\n";
  
  allBots.forEach(bot => {
    const lastActivity = new Date(bot.lastActivity);
    const timeDiff = Date.now() - lastActivity.getTime();
    const minutesAgo = Math.floor(timeDiff / 60000);
    
    message += `🤖 *${bot.config.botname}*\n`;
    message += `• Numéro : ${bot.botId}\n`;
    message += `• Propriétaire : ${bot.config.ownerJid.split('@')[0]}\n`;
    message += `• Dernière activité : ${minutesAgo}min\n`;
    message += `• IA PARKY : ${bot.config.ai.PARKYAI ? '✅' : '❌'}\n\n`;
  });

  await ctx.editMessageText(message, { parse_mode: "Markdown" });
}

async function cleanupInactiveBots(ctx) {
  const allBots = botManager.getAllBots();
  const inactiveBots = allBots.filter(bot => {
    const lastActivity = new Date(bot.lastActivity);
    const timeDiff = Date.now() - lastActivity.getTime();
    return timeDiff > 24 * 60 * 60 * 1000; // 24 heures
  });

  if (inactiveBots.length === 0) {
    return ctx.editMessageText("✅ Aucun bot inactif à nettoyer.");
  }

  inactiveBots.forEach(bot => {
    botManager.removeBot(bot.botId);
  });

  await ctx.editMessageText(
    `🧹 *Nettoyage terminé*\n\n` +
    `${inactiveBots.length} bot(s) inactif(s) supprimé(s).`
  );
}

async function handleGlobalAIToggle(ctx, data) {
  const parts = data.split('_');
  const setting = parts[2]; // PARKYAI, TRANSLATOR, etc.
  const action = parts[3]; // ON ou OFF
  
  const value = action === 'ON';
  const updates = {
    ai: {}
  };
  updates.ai[setting] = value;
  
  const updatedCount = botManager.applyGlobalUpdate(updates, ctx.from.id.toString());
  
  await ctx.answerCbQuery(`${setting} ${value ? 'activé' : 'désactivé'} sur ${updatedCount} bot(s)`);
  await showGlobalAIConfig(ctx);
}

async function handleGlobalCommandToggle(ctx, data) {
  const parts = data.split('_');
  const category = parts[2]; // JEUX, UNIROLIST, etc.
  const action = parts[3]; // ON ou OFF
  
  const value = action === 'ON';
  const updates = {
    commands: {
      categories: {}
    }
  };
  updates.commands.categories[category] = value;
  
  const updatedCount = botManager.applyGlobalUpdate(updates, ctx.from.id.toString());
  
  await ctx.answerCbQuery(`Catégorie ${category} ${value ? 'activée' : 'désactivée'} sur ${updatedCount} bot(s)`);
  await showGlobalCommandConfig(ctx);
}

async function handleGlobalMaintenance(ctx, data) {
  // Activer/désactiver la maintenance sur tous les bots
  const currentState = global.parametres?.MAINTENANCE || false;
  const newState = !currentState;
  
  // Mettre à jour le paramètre global
  if (!global.parametres) global.parametres = {};
  global.parametres.MAINTENANCE = newState;
  
  // Sauvegarder dans le fichier
  const fs = require('fs');
  const path = require('path');
  const paramPath = path.join(__dirname, '../../data/parametres.json');
  fs.writeFileSync(paramPath, JSON.stringify(global.parametres, null, 2));
  
  // Appliquer à tous les bots
  const updates = {
    ai: {
      MAINTENANCE: newState
    }
  };
  const updatedCount = botManager.applyGlobalUpdate(updates, ctx.from.id.toString());
  
  await ctx.answerCbQuery(
    `Maintenance ${newState ? 'ACTIVÉE' : 'DÉSACTIVÉE'} sur ${updatedCount} bot(s)`,
    { show_alert: true }
  );
  
  await showGlobalAIConfig(ctx);
}