const { Markup } = require("telegraf");

module.exports = {
  name: "start",
  description: "Démarre une conversation avec le bot",
  category: "Général",
  ownerOnly: false,

  async execute(ctx) {
    const firstName = ctx.from.first_name || "utilisateur";

    await ctx.reply(
      `👋 Bonjour ${firstName} !\n\nBienvenue sur ${global.botname}.`,
      Markup.inlineKeyboard([
        Markup.button.callback("📋 Voir le menu", "CMD_menu")
      ]),
      { parse_mode: "Markdown" }
    );
  }
};