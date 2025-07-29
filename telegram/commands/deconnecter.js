const { removeSession, getAllSessions } = require("../utils/connexion");
const botManager = require("../../lib/botManager");
const userDataManager = require("../../lib/userDataManager");

module.exports = {
  name: "deconnecter",
  description: "Déconnecte ton bot WhatsApp",
  category: "Gestion",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userWhatsappJid = `${userId}@s.whatsapp.net`;
    
    // Vérifier si global dev
    const isGlobalDev = (global.TELEGRAM_DEV && global.TELEGRAM_DEV.includes(parseInt(userId))) ||
                       (global.dev && global.dev.some(dev => 
                         [userWhatsappJid, userId, `${userId}@lid`].includes(dev)
                       ));
    
    console.log(`🔍 Debug deconnecter:`);
    console.log(`   UserId: ${userId}`);
    console.log(`   UserWhatsappJid: ${userWhatsappJid}`);
    console.log(`   IsGlobalDev: ${isGlobalDev}`);
    
    const allBots = botManager.getAllBots();
    console.log(`📊 Total bots: ${allBots.length}`);
    allBots.forEach(bot => {
      console.log(`   BotJid: ${bot.botJid}, Owner: ${bot.config.ownerWhatsappJid}, Status: ${bot.sock ? 'online' : 'offline'}`);
    });
    
    // Trouver le bot de l'utilisateur
    const userBot = allBots.find(bot => 
      bot.config && bot.config.ownerWhatsappJid === userWhatsappJid
    );
    
    if (!userBot && !isGlobalDev) {
      return ctx.reply(
        `📱 **Tu n'as aucun bot connecté.**\n\n` +
        `Utilise /connecter <numéro> pour connecter ton bot.\n\n` +
        `🔍 **Debug:**\n` +
        `• UserWhatsappJid: ${userWhatsappJid}\n` +
        `• Total bots: ${allBots.length}\n` +
        `• IsGlobalDev: ${isGlobalDev}`,
        { parse_mode: "Markdown" }
      );
    }
    
    // Si global dev et pas de bot spécifique, demander lequel déconnecter
    if (isGlobalDev && !userBot) {
      if (allBots.length === 0) {
        return ctx.reply("📱 Aucun bot connecté actuellement.");
      }
      
      const keyboard = allBots.map(bot => [{
        text: `🔌 ${bot.config.botname} (${bot.botJid})`,
        callback_data: `DISCONNECT_${bot.botJid}`
      }]);
      
      return ctx.reply(
        "🔌 *Sélectionne le bot à déconnecter :*",
        {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: keyboard }
        }
      );
    }
    
    // Déconnecter le bot
    const botToDisconnect = userBot || allBots[0];
    await disconnectBot(ctx, botToDisconnect.botJid);
  },

  async handleCallback(ctx) {
    const data = ctx.callbackQuery.data;
    
    // Vérifier que ce callback nous concerne
    if (!data.startsWith('DISCONNECT_')) {
      return false;
    }
    
    const botJid = data.replace('DISCONNECT_', '');
    await disconnectBot(ctx, botJid);
    return true;
  }
};

async function disconnectBot(ctx, botJid) {
  const userId = ctx.from.id.toString();
  const userWhatsappJid = `${userId}@s.whatsapp.net`;
  
  const isGlobalDev = (global.TELEGRAM_DEV && global.TELEGRAM_DEV.includes(parseInt(userId))) ||
                     (global.dev && global.dev.some(dev => 
                       [userWhatsappJid, userId, `${userId}@lid`].includes(dev)
                     ));
  
  const bot = botManager.getBot(botJid);
  if (!bot) {
    return ctx.reply(`❌ Bot ${botJid} introuvable.`);
  }
  
  // Vérifier les permissions
  if (!isGlobalDev && bot.config.ownerWhatsappJid !== userWhatsappJid) {
    return ctx.reply("⛔ Tu ne peux déconnecter que ton propre bot.");
  }
  
  try {
    await ctx.reply(`🔄 Déconnexion du bot ${bot.config.botname} en cours...`);
    
    // Sauvegarder les données avant déconnexion
    console.log(`💾 Sauvegarde des données avant déconnexion de ${botJid}`);
    userDataManager.saveAllCache();
    
    // Supprimer du gestionnaire
    botManager.removeBot(botJid);
    
    // Supprimer la session
    removeSession(botJid);
    
    await ctx.reply(
      `✅ **Bot déconnecté avec succès**\n\n` +
      `🤖 Bot : ${bot.config.botname}\n` +
      `📱 Numéro : ${botJid}\n` +
      `💾 Données sauvegardées\n\n` +
      `Utilise /connecter <numéro> pour reconnecter un bot.`,
      { parse_mode: "Markdown" }
    );
    
    console.log(`✅ Bot ${botJid} déconnecté par ${ctx.from.first_name} (${userId})`);
    
  } catch (error) {
    console.error(`❌ Erreur déconnexion bot ${botJid}:`, error);
    await ctx.reply("❌ Erreur lors de la déconnexion du bot.");
  }
}