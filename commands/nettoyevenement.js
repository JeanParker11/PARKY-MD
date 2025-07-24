const fs = require('fs');
const path = require('path');

const RAPPEL_PATH = path.join(__dirname, '../data/rappels.json');

module.exports = {
  name: "nettoyevenements",
  category: "Général",
  description: "Supprime tous les rappels programmés.",
  onlyAdmin: true,

  async execute(riza, m) {
    try {
      if (!fs.existsSync(RAPPEL_PATH)) {
        return riza.sendMessage(m.chat, {
          text: "📭 Aucun rappel n'est programmé pour le moment."
        }, { quoted: m });
      }

      const data = JSON.parse(fs.readFileSync(RAPPEL_PATH));
      if (!Array.isArray(data) || data.length === 0) {
        return riza.sendMessage(m.chat, {
          text: "📭 Aucun rappel actif à supprimer."
        }, { quoted: m });
      }

      fs.writeFileSync(RAPPEL_PATH, '[]');
      await riza.sendMessage(m.chat, {
        text: "✅ Tous les événements ont été *supprimés avec succès*."
      }, { quoted: m });

    } catch (err) {
      console.error("❌ Erreur lors de la suppression des rappels :", err);
      await riza.sendMessage(m.chat, {
        text: "❌ Une erreur est survenue lors du nettoyage des événements."
      }, { quoted: m });
    }
  }
};