const fs = require("fs");
const path = require("path");

module.exports = {
  name: "stats",
  description: "Affiche les statistiques générales",
  category: "Général",

  async execute(ctx) {
    try {
      const getDataCount = (filepath, isObject = false) => {
        if (!fs.existsSync(filepath)) return 0;
        const data = JSON.parse(fs.readFileSync(filepath));
        return isObject ? Object.keys(data).length : Array.isArray(data) ? data.length : 0;
      };

      const getTotalAmount = (filepath) => {
        if (!fs.existsSync(filepath)) return 0;
        const data = JSON.parse(fs.readFileSync(filepath));
        return Object.values(data).reduce((sum, val) => sum + (val || 0), 0);
      };

      const totalQuestions = getDataCount(path.join(__dirname, "../../data/quizz.json"));
      const totalImageQuestions = getDataCount(path.join(__dirname, "../../data/quizz_image.json"));
      const pendingQuestions = getDataCount(path.join(__dirname, "../../data/quizz_pending.json"));
      const pendingImageQuestions = getDataCount(path.join(__dirname, "../../data/quizz_image_pending.json"));
      const totalFiches = getDataCount(path.join(__dirname, "../../data/fiches.json"), true);
      const totalBattles = getDataCount(path.join(__dirname, "../../data/battle.json"), true);
      const totalArgent = getTotalAmount(path.join(__dirname, "../../data/banque.json"));

      const statsText = `
📊 *STATISTIQUES ${botname}*

🎯 *QUIZ & CONTENU*
• Questions texte : ${totalQuestions}
• Questions images : ${totalImageQuestions}
• Total validé : ${totalQuestions + totalImageQuestions}
• En attente : ${pendingQuestions + pendingImageQuestions}

👥 *COMMUNAUTÉ*
• Participants battles : ${totalBattles}

🤖 *SYSTÈME*
• IA : PARKY AI
• Version : ${global.botversion || "2.0.0"}
• Uptime : ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m
• RAM : ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB

🌐 *PLATEFORME*
• WhatsApp : Actif
• Telegram : Actif
• Interface Web : Disponible

Dernière mise à jour : ${new Date().toLocaleString('fr-FR')}
      `.trim();

      await ctx.reply(statsText, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("[❌] Erreur dans stats.js :", err);
      await ctx.reply("❌ Une erreur est survenue lors de la récupération des statistiques.");
    }
  }
};