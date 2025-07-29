const botManager = require("../../lib/botManager");

module.exports = {
  name: "listbots",
  description: "Liste tous les bots connectés",
  category: "Gestion",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userWhatsappJid = `${userId}@s.whatsapp.net`;

    // Vérifier si global dev
    const isGlobalDev =
      (global.TELEGRAM_DEV && global.TELEGRAM_DEV.includes(parseInt(userId))) ||
      (global.dev &&
        global.dev.some((dev) =>
          [userWhatsappJid, userId, `${userId}@lid`].includes(dev)
        ));

    console.log(`🔍 Debug listbots:`);
    console.log(`   UserId: ${userId}`);
    console.log(`   UserWhatsappJid: ${userWhatsappJid}`);
    console.log(`   IsGlobalDev: ${isGlobalDev}`);
    console.log(`   global.dev: ${JSON.stringify(global.dev)}`);
    console.log(`   global.TELEGRAM_DEV: ${JSON.stringify(global.TELEGRAM_DEV)}`);

    const allBots = botManager.getAllBots();

    console.log(`📊 Total bots: ${allBots.length}`);
    allBots.forEach((bot) => {
      console.log(
        `   BotJid: ${bot.botJid}, Owner: ${bot.config.ownerWhatsappJid}, Status: ${
          bot.sock ? "online" : "offline"
        }`
      );
    });

    // Filtrer les bots selon les permissions
    const visibleBots = isGlobalDev
      ? allBots
      : allBots.filter((bot) => {
          const match = bot.config.ownerWhatsappJid === userWhatsappJid;
          console.log(
            `   Checking botJid ${bot.botJid}: ${bot.config.ownerWhatsappJid} === ${userWhatsappJid} ? ${match}`
          );
          return match;
        });

    console.log(`🔍 Bots visibles pour ${userId}: ${visibleBots.length}`);

    if (visibleBots.length === 0) {
      return ctx.reply(
        isGlobalDev
          ? "📱 **Aucun bot connecté actuellement.**\n\nUtilise /connecter <numéro> pour connecter un bot."
          : `📱 **Tu n'as aucun bot connecté.**\n\n` +
              `Utilise /connecter <numéro> pour connecter ton bot.\n\n` +
              `🔍 **Debug:**\n` +
              `• UserWhatsappJid: ${userWhatsappJid}\n` +
              `• Total bots: ${allBots.length}\n` +
              `• IsGlobalDev: ${isGlobalDev}`,
        { parse_mode: "Markdown" }
      );
    }

    let message = `🤖 **Bots ${isGlobalDev ? "Connectés" : "Tes Bots"}** (${visibleBots.length})\n\n`;

    visibleBots.forEach((bot, index) => {
      const status = bot.sock ? "🟢 En ligne" : "🔴 Hors ligne";
      const lastActivity = new Date(bot.lastActivity);
      const timeDiff = Date.now() - lastActivity.getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);

      message += `${index + 1}. **${bot.config.botname}**\n`;
      message += `   📱 ${bot.botJid}\n`;
      message += `   ${status}\n`;
      message += `   🕐 Activité: ${minutesAgo}min\n`;

      if (isGlobalDev) {
        message += `   👤 Propriétaire: ${bot.config.ownerWhatsappJid.split("@")[0]}\n`;
      }

      message += `   🧠 PARKY AI: ${bot.config.ai.PARKYAI ? "✅" : "❌"}\n\n`;
    });

    const keyboard = [];

    // Boutons pour chaque bot
    visibleBots.forEach((bot) => {
      keyboard.push([
        {
          text: `⚙️ ${bot.config.botname}`,
          callback_data: `CONFIG_BOT_${bot.botJid}`,
        },
      ]);
    });

    if (isGlobalDev) {
      keyboard.push([
        {
          text: "🌐 Configuration Globale",
          callback_data: "GLOBAL_CONFIG",
        },
      ]);
    }

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  },
};
