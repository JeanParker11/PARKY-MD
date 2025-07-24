const { getAllCommands } = require("../utils/handler");
const axios = require("axios");

module.exports = {
  name: "menu",
  description: "Affiche le menu avec boutons",
  category: "Général",

  async execute(ctx) {
    const allCommands = getAllCommands();
    const userId = ctx.from.id.toString();
    const ownerIds = global.TELEGRAM_OWNER.map(id => id.toString());

    const visibleCommands = allCommands.filter(
      (cmd) => !cmd.ownerOnly || ownerIds.includes(userId)
    );

    if (visibleCommands.length === 0) {
      return await ctx.reply("❌ Aucune commande disponible pour vous.");
    }

    // Organise les boutons deux par deux
    const keyboard = [];
    for (let i = 0; i < visibleCommands.length; i += 2) {
      const row = visibleCommands.slice(i, i + 2).map((cmd) => ({
        text: `${cmd.name}`,
        callback_data: `CMD_${cmd.name}`,
      }));
      keyboard.push(row);
    }

    const menuText = `*Bienvenue dans le menu de ${global.botname}*\n\n` +
      `Utilise les boutons ci-dessous pour explorer les commandes disponibles.\n` +
      `Total : ${visibleCommands.length} commande(s)\n\n` +
      `ℹ️ Tape */aide* pour voir les descriptions de chaque commande.`;

    if (
      global.menuImageUrl &&
      typeof global.menuImageUrl === "string" &&
      global.menuImageUrl.startsWith("http")
    ) {
      try {
        const res = await axios.get(global.menuImageUrl, {
          responseType: "arraybuffer",
        });
        const imageBuffer = Buffer.from(res.data, "binary");

        await ctx.replyWithPhoto({ source: imageBuffer }, {
          caption: menuText,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: keyboard,
          },
        });

        return;
      } catch (err) {
        console.warn("⚠️ Impossible de charger l'image. Menu texte seul utilisé.");
      }
    }

    await ctx.reply(menuText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  },
};