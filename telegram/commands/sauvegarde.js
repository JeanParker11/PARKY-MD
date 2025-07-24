const zipAndSend = require("../utils/zipAndSend");

// Supposons que tu as exporté ton bot global quelque part,
// sinon tu peux faire comme ci-dessous :

// Importe ton bot global si possible (exemple)
const bot = require("../index").bot; // adapte le chemin et export dans index.js

module.exports = {
  name: "sauvegarde",
  description: "Envoie une sauvegarde manuelle",
  ownerOnly: true,

  async execute(ctx) {
    try {
      await ctx.reply("🕐 Préparation de la sauvegarde...");
      // Passe l'instance globale du bot (et non ctx)
      await zipAndSend(bot, global.TELEGRAM_ADMIN_ID);
      await ctx.reply("✅ Sauvegarde envoyée !");
    } catch (e) {
      console.error("❌ Erreur sauvegarde :", e);
      await ctx.reply("❌ Erreur lors de la sauvegarde.");
    }
  }
};