const botManager = require("../../lib/botManager");

module.exports = {
  name: "listbots",
  description: "Liste tous les bots connectés",
  category: "Gestion",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    // Vérifier si global dev
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    ) || (global.TELEGRAM_DEV && global.TELEGRAM_DEV.includes(parseInt(userId)));

    const allBots = botManager.getAllBots();
    
    console.log(`🔍 Debug listbots - Utilisateur: ${userId}, Total bots: ${allBots.length}`);
    allBots.forEach(bot => {
      console.log(`   Bot: ${bot.botId}, Owner: ${bot.config.ownerJid}, Status: ${bot.sock ? 'online' : 'offline'}`);
    });
    
    // Filtrer les bots selon les permissions
    const visibleBots = isGlobalDev ? 
      allBots : 
      allBots.filter(bot => bot.config.ownerJid === userJid);

    console.log(`🔍 Bots visibles pour ${userId}: ${visibleBots.length}`);
    if (visibleBots.length === 0) {
      return ctx.reply(
        isGlobalDev ? 
          "📱 Aucun bot connecté actuellement." :
          `📱 Tu n'as aucun bot connecté.\n\nUtilise /connecter <numéro> pour connecter ton bot.\n\n🔍 Debug: UserJid=${userJid}, TotalBots=${allBots.length}`
      );
    }

    let message = `🤖 *Bots ${isGlobalDev ? 'Connectés' : 'Tes Bots'}* (${visibleBots.length})\n\n`;

    visibleBots.forEach((bot, index) => {
      const status = bot.sock ? "🟢 En ligne" : "🔴 Hors ligne";
      const lastActivity = new Date(bot.lastActivity);
      const timeDiff = Date.now() - lastActivity.getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      
      message += `${index + 1}. *${bot.config.botname}*\n`;
      message += `   📱 ${bot.botId}\n`;
      message += `   ${status}\n`;
      message += `   🕐 Activité: ${minutesAgo}min\n`;
      
      if (isGlobalDev) {
        message += `   👤 Propriétaire: ${bot.config.ownerJid.split('@')[0]}\n`;
      }
      
      message += `   🧠 PARKY AI: ${bot.config.ai.PARKYAI ? '✅' : '❌'}\n\n`;
    });

    const keyboard = [];
    
    // Boutons pour chaque bot
    visibleBots.forEach(bot => {
      keyboard.push([{
        text: `⚙️ ${bot.config.botname}`,
        callback_data: `CONFIG_BOT_${bot.botId}`
      }]);
    });

    if (isGlobalDev) {
      keyboard.push([{
        text: "🌐 Configuration Globale",
        callback_data: "GLOBAL_CONFIG"
      }]);
    }

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard }
    });
  }
};