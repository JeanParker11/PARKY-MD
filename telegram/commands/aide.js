const { getAllCommands } = require("../utils/handler");

module.exports = {
  name: "aide",
  description: "Affiche l’aide avec des boutons",
  category: "Général",

  async execute(ctx) {
    const allCommands = getAllCommands();
    const userId = ctx.from.id.toString();

    // Corrigé : comparer userId string avec global.owner converti en string
    const visibleCommands = allCommands.filter(
      cmd => !cmd.ownerOnly || global.TELEGRAM_OWNER.map(String).includes(userId)
    );

    if (visibleCommands.length === 0) {
      return await ctx.reply("❌ Aucune commande disponible.");
    }

    // Créer les boutons inline (1 bouton par ligne)
    const buttons = visibleCommands.map(cmd => [
      { text: `${cmd.name}`, callback_data: `HELP_${cmd.name}` }
    ]);

    // Envoie le message avec l'image si définie
    if (global.menuImageUrl) {
      try {
        return await ctx.replyWithPhoto(
          { url: global.menuImageUrl },
          {
            caption: "*Liste des commandes disponibles :*",
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: buttons
            }
          }
        );
      } catch (e) {
        console.error("Erreur chargement image aide :", e.message);
      }
    }

    // Sinon juste le texte avec les boutons
    await ctx.reply("*Liste des commandes disponibles :*", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  }
};