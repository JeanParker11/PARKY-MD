const userDataManager = require("../../lib/userDataManager");
const botManager = require("../../lib/botManager");

module.exports = {
  name: "cleandata",
  description: "Supprime définitivement les données d'un bot (dev uniquement)",
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

    const args = ctx.message.text.split(' ');
    const botId = args[1];

    if (!botId) {
      return ctx.reply(
        "❌ Usage: /cleandata <botId>\n\n" +
        "⚠️ **ATTENTION**: Cette action est irréversible !\n" +
        "Toutes les données du bot seront définitivement supprimées."
      );
    }

    // Vérifier si le bot existe (même déconnecté)
    const userDataDir = userDataManager.getBotDataDir(botId);
    const fs = require('fs');
    
    if (!fs.existsSync(userDataDir)) {
      return ctx.reply(`❌ Aucune donnée trouvée pour le bot ${botId}.`);
    }

    // Demander confirmation
    const keyboard = [
      [
        { text: "✅ OUI, SUPPRIMER", callback_data: `CLEAN_CONFIRM_${botId}` },
        { text: "❌ Annuler", callback_data: "CLEAN_CANCEL" }
      ]
    ];

    const stats = userDataManager.getBotStats(botId);
    let message = `⚠️ **SUPPRESSION DÉFINITIVE**\n\n`;
    message += `🤖 Bot : ${botId}\n`;
    message += `📊 Données à supprimer :\n`;
    message += `• ${stats.totalUsers} utilisateurs\n`;
    message += `• ${stats.totalBattles} batailles\n`;
    message += `• ${stats.totalRappels} rappels\n`;
    message += `• ${stats.totalSignals} signalements\n`;
    message += `• ${stats.totalRewards} récompenses\n\n`;
    message += `🚨 **Cette action est IRRÉVERSIBLE !**\n`;
    message += `Confirmes-tu la suppression ?`;

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
    if (!data.startsWith('CLEAN_')) {
      return false;
    }
    
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    );

    if (!isGlobalDev) {
      await ctx.answerCbQuery("⛔ Accès refusé", { show_alert: true });
      return true;
    }

    if (data.startsWith('CLEAN_CONFIRM_')) {
      const botId = data.replace('CLEAN_CONFIRM_', '');
      
      try {
        // Supprimer les données
        const success = userDataManager.cleanupBotData(botId);
        
        if (success) {
          await ctx.editMessageText(
            `✅ **Données supprimées avec succès**\n\n` +
            `🗑️ Toutes les données du bot ${botId} ont été définitivement supprimées.\n` +
            `📅 Suppression effectuée le ${new Date().toLocaleString('fr-FR')}`
          );
          
          console.log(`🗑️ Données bot ${botId} supprimées par ${ctx.from.first_name} (${userId})`);
        } else {
          await ctx.editMessageText("❌ Erreur lors de la suppression des données.");
        }
        
      } catch (error) {
        console.error(`❌ Erreur suppression données bot ${botId}:`, error);
        await ctx.editMessageText("❌ Erreur lors de la suppression des données.");
      }
      
    } else if (data === 'CLEAN_CANCEL') {
      await ctx.editMessageText("❌ Suppression annulée.");
    }

    return true;
  }
};