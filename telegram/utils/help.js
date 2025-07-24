const { getAllCommands } = require("../utils/handler");

module.exports = async function handleHelpButtonCallback(ctx) {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("HELP_")) return;

  const commandName = data.replace("HELP_", "");
  const allCommands = getAllCommands();
  const userId = ctx.from.id.toString();
  const ownerIds = (global.TELEGRAM_OWNER || []).map(id => id.toString());

  // Si on demande la liste complète
  if (commandName === "all") {
    // Filtrer les commandes selon droits ownerOnly
    const visibleCommands = allCommands.filter(cmd =>
      !cmd.ownerOnly || ownerIds.includes(userId)
    );

    if (visibleCommands.length === 0) {
      await ctx.answerCbQuery("❌ Aucune commande disponible.", { show_alert: true });
      return;
    }

    let text = "📚 *Liste des commandes disponibles :*\n\n";
    visibleCommands.forEach(cmd => {
      text += `• /${cmd.name} — ${cmd.description || "Pas de description"}\n`;
    });

    await ctx.answerCbQuery(); // Ferme la popup "chargement"
    return ctx.reply(text, { parse_mode: "Markdown" });
  }

  // Sinon on affiche les détails d'une commande précise
  const command = allCommands.find(cmd => cmd.name === commandName);

  if (!command) {
    return ctx.answerCbQuery("❌ Commande introuvable.", { show_alert: true });
  }

  // Vérifie que l'utilisateur a accès à cette commande
  if (command.ownerOnly && !ownerIds.includes(userId)) {
    return ctx.answerCbQuery("⛔ Commande réservée au propriétaire.", { show_alert: true });
  }

  const desc = `📘 *Commande : /${command.name}*\n\n` +
               `📝 ${command.description || "Aucune description"}\n` +
               `📁 Catégorie : ${command.category || "Inconnue"}`;

  await ctx.answerCbQuery(); // Ferme la popup "chargement"
  return ctx.reply(desc, { parse_mode: "Markdown" });
};