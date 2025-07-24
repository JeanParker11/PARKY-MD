module.exports = {
  name: "ping",
  description: "Teste la latence du bot et son statut",
  ownerOnly: false,

  execute: async (ctx) => {
    try {
      const start = Date.now();
      const message = await ctx.reply("🏓 Calcul de la latence...");
      const latency = Date.now() - start;

      const uptime = process.uptime();
      const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

      const pingText = `
🏓 *PONG !*

⚡ Latence : ${latency}ms
🤖 Bot : En ligne
🧠 IA : PARKY AI
⏱️ Uptime : ${uptimeStr}

Status : ✅ Opérationnel
`.trim();

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        message.message_id,
        undefined,
        pingText,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error("Erreur ping.js :", error);
      await ctx.reply("❌ Une erreur est survenue lors du test de latence.");
    }
  }
};