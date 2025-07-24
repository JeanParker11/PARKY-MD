const { startSession, getSession } = require("../utils/connexion");

module.exports = {
    name: "connecter",
    description: "Lier un compte WhatsApp via code d'appariement",
    ownerOnly: false,
    execute: async (ctx) => {
        let number;

        // ✅ Si la commande vient d’un message texte (ex: /connecter 229xxxxxxx)
        if (ctx.message && ctx.message.text) {
            const args = ctx.message.text.trim().split(" ");
            number = args[1]?.replace(/\D/g, "");
        }

        // ✅ Si la commande vient d’un bouton (ex: callback_data: "connecter:229xxxxxxx")
        else if (ctx.callbackQuery && ctx.callbackQuery.data) {
            const data = ctx.callbackQuery.data;
            const parts = data.split(":");
            number = parts[1]?.replace(/\D/g, "");
        }

        // ❌ Si aucun numéro valide
        if (!number) {
            return ctx.reply("❌ Fournis un numéro.\n\nUsage : /connecter <numéro>", { parse_mode: "Markdown" });
        }

        if (number.length < 8) {
            return ctx.reply("❌ Numéro invalide.", { parse_mode: "Markdown" });
        }

        if (getSession(number)) {
            return ctx.reply(`ℹ️ Le numéro ${number} est déjà connecté.`, { parse_mode: "Markdown" });
        }

        await startSession(number, ctx);
    }
};