const fs = require('fs');
const path = require('path');
const RAPPEL_PATH = path.join(__dirname, '../data/rappels.json');

module.exports = {
  name: "suppevenement",
  category: "Général",
  description: "Supprime un événement programmé à une heure précise.",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const heureCible = args[0];
    if (!heureCible || !heureCible.includes(":")) {
      return riza.sendMessage(m.chat, {
        text: "❌ Format invalide.\nUtilise `.supprimevenement 18:00`"
      }, { quoted: m });
    }

    const [hh, mm] = heureCible.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm)) {
      return riza.sendMessage(m.chat, { text: "⛔ Heure invalide." }, { quoted: m });
    }

    if (!fs.existsSync(RAPPEL_PATH)) {
      return riza.sendMessage(m.chat, { text: "📭 Aucun événement à supprimer." }, { quoted: m });
    }

    const rappels = JSON.parse(fs.readFileSync(RAPPEL_PATH));
    const avant = rappels.length;

    const filtré = rappels.filter(ev => {
      const date = new Date(ev.time);
      return !(date.getHours() === hh && date.getMinutes() === mm && ev.chatId === m.chat);
    });

    if (filtré.length === avant) {
      return riza.sendMessage(m.chat, { text: `❌ Aucun événement trouvé à ${heureCible} dans ce salon.` }, { quoted: m });
    }

    fs.writeFileSync(RAPPEL_PATH, JSON.stringify(filtré, null, 2));
    await riza.sendMessage(m.chat, { text: `✅ Événement à ${heureCible} supprimé avec succès.` }, { quoted: m });
  }
};