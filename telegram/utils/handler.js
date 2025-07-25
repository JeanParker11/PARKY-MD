const fs = require("fs");
const path = require("path");
const botManager = require("../../lib/botManager");

// Liste des commandes enregistrées
const registeredCommands = [];

/**
 * Enregistre une commande dans le tableau global
 * @param {Object} command
 */
function registerCommand(command) {
  if (!registeredCommands.some(cmd => cmd.name === command.name)) {
    registeredCommands.push(command);
  }
}

/**
 * Retourne toutes les commandes enregistrées
 * @returns {Array}
 */
function getAllCommands() {
  return registeredCommands;
}

/**
 * Charge les commandes depuis un dossier et les enregistre dans Telegram
 * @param {Telegraf} bot
 * @param {Object} options
 */
function setupHandlers(bot, options = {}) {
  const commandsPath = options.commandsPath || path.join(__dirname, "..", "commands");
  const ownerIds = (global.TELEGRAM_OWNER || []).map(id => id.toString());

  // Vide la liste des commandes pour éviter les doublons en cas de reload
  registeredCommands.length = 0;

  // Lire tous les fichiers .js du dossier de commandes
  fs.readdirSync(commandsPath).forEach(file => {
    if (file.endsWith(".js")) {
      const filePath = path.join(commandsPath, file);
      delete require.cache[require.resolve(filePath)]; // Clear cache (hot reload)
      const command = require(filePath);

      if (command && command.name && typeof command.execute === "function") {
        registerCommand(command);

        // Enregistrement de la commande Telegram
        bot.command(command.name, async (ctx) => {
          const userId = ctx.from.id.toString();

          // Vérifie si commande réservée au propriétaire
          if (command.ownerOnly && !ownerIds.includes(userId)) {
            return ctx.reply("⛔ Cette commande est réservée au propriétaire.");
          }

          try {
            await command.execute(ctx);
          } catch (e) {
            console.error(`❌ Erreur dans la commande ${command.name} :`, e);
            await ctx.reply("❌ Une erreur est survenue pendant l'exécution.");
          }
        });

        console.log(`✅ Commande Telegram enregistrée : /${command.name}`);
      }
    }
  });
  
  console.log(`📚 ${registeredCommands.length} commande(s) Telegram chargée(s)`);
}

module.exports = {
  setupHandlers,
  registerCommand,
  getAllCommands
};