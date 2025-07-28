const { startSession, getSession } = require("../utils/connexion");

module.exports = {
    name: "connecter",
    description: "Lier un compte WhatsApp via code d'appariement",
    ownerOnly: false,
    execute: async (ctx) => {
        const { startSession, getSession } = require("../utils/connexion");
        const botManager = require("../../lib/botManager");
        
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
            return ctx.reply("❌ **Numéro invalide**\n\nLe numéro doit contenir au moins 8 chiffres.\nExemple : `/connecter 22898133388`", { parse_mode: "Markdown" });
        }

        // Vérifier si l'utilisateur a déjà un bot connecté
        const userId = ctx.from.id.toString();
        const userJid = `${userId}@s.whatsapp.net`;
        
        console.log(`🔍 Vérification utilisateur ${userId} (${userJid})`);
        
        const allBots = botManager.getAllBots();
        console.log(`📊 Total bots: ${allBots.length}`);
        allBots.forEach(bot => {
            console.log(`   Bot: ${bot.botId}, Owner: ${bot.config.ownerJid}`);
        });
        
        const userExistingBot = allBots.find(bot => 
            bot.config && bot.config.ownerJid === userJid
        );
        
        if (userExistingBot) {
            return ctx.reply(
                `❌ **Tu as déjà un bot connecté**\n\n` +
                `🤖 Bot actuel : ${userExistingBot.config.botname}\n` +
                `📱 Numéro : ${userExistingBot.botId}\n\n` +
                `Utilise /deconnecter pour le déconnecter d'abord.`,
                { parse_mode: "Markdown" }
            );
        }
        
        // Vérifier si le numéro est déjà utilisé par quelqu'un d'autre
        const existingBot = allBots.find(bot => bot.botId === number);
        if (existingBot) {
            return ctx.reply(
                `❌ **Ce numéro est déjà utilisé**\n\n` +
                `📱 Numéro : ${number}\n` +
                `👤 Utilisé par : ${existingBot.config.ownerJid.split('@')[0]}\n\n` +
                `Chaque numéro ne peut être connecté qu'une seule fois.`,
                { parse_mode: "Markdown" }
            );
        }
        
        await ctx.reply(
            `🔄 **Connexion en cours...**\n\n` +
            `📱 Numéro : ${number}\n` +
            `👤 Utilisateur : ${ctx.from.first_name}\n\n` +
            `⚠️ **Important :** Assure-toi que ce numéro n'est connecté nulle part ailleurs !`,
            { parse_mode: "Markdown" }
        );
        
        await startSession(number, ctx);
    }
};