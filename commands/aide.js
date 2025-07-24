const fs = require("fs");
const path = require("path");

module.exports = {
  name: "aide",
  description: "Affiche la liste des commandes et leurs descriptions.",
  category: "Général",
  allowedForAll: true,

  async execute(riza, m) {
    try {
      const commandsPath = path.join(__dirname);
      const files = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

      let helpText = "📜 *Liste des commandes :*\n\n";

      for (const file of files) {
        const command = require(path.join(commandsPath, file));
        if (!command.name || !command.description) continue;

        const perms = [];
        if (command.onlyOwner) perms.push("Owner");
        if (command.onlySudo) perms.push("Sudo");
        if (command.onlyAdmin) perms.push("Admin");
        if (command.allowedForAll) perms.push("Tous");

        helpText += `*${global.prefix || "."}${command.name}* : ${command.description}`;
        if (perms.length) helpText += ` _(Perms : ${perms.join(", ")})_`;
        helpText += "\n\n"; // ← espacement ici
      }

      if (helpText.trim() === "📜 *Liste des commandes :*") {
        helpText = "❌ Aucune commande disponible.";
      }

      await riza.sendMessage(m.chat, { text: helpText.trim() }, { quoted: m });
    } catch (error) {
      console.error("Erreur aide.js :", error);
      await riza.sendMessage(m.chat, { text: "❌ Une erreur est survenue lors de l'affichage de l'aide." }, { quoted: m });
    }
  }
};