const fs = require('fs');
const path = require('path');
const RAPPEL_PATH = path.join(__dirname, '../data/rappels.json');

module.exports = {
  name: "evenements",
  category: "Général",
  description: "📅 Affiche la liste des événements programmés.",
  onlyAdmin: false,

  async execute(riza, m) {
    if (!fs.existsSync(RAPPEL_PATH)) {
      return riza.sendMessage(m.chat, {
        text: "📭 Aucun événement programmé pour l'instant."
      }, { quoted: m });
    }

    let rappels = [];
    try {
      rappels = JSON.parse(fs.readFileSync(RAPPEL_PATH));
    } catch (err) {
      return riza.sendMessage(m.chat, {
        text: "❌ Erreur lors de la lecture des événements."
      }, { quoted: m });
    }

    const now = Date.now();
    const àVenir = rappels
      .filter(ev => ev.time > now)
      .sort((a, b) => a.time - b.time);

    if (àVenir.length === 0) {
      return riza.sendMessage(m.chat, {
        text: "📭 Aucun événement à venir."
      }, { quoted: m });
    }

    let msg = `📅 *ÉVÉNEMENTS À VENIR* 📅\n\n`;

    for (let i = 0; i < àVenir.length; i++) {
      const ev = àVenir[i];
      const date = new Date(ev.time);
      const heure = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

      let groupeNom = "🕵️ Groupe inconnu";
      try {
        const metadata = await riza.groupMetadata(ev.chatId);
        groupeNom = `👥 ${metadata.subject}`;
      } catch (e) {
        // peut être en PV ou groupe quitté
        groupeNom = ev.chatId.endsWith('@g.us') ? "🚪 Groupe inaccessible" : "👤 Message privé";
      }

      msg += `🔹 *${heure}* — ${ev.message}\n   ${groupeNom}\n\n`;
    }

    await riza.sendMessage(m.chat, {
      text: msg.trim()
    }, { quoted: m });
  }
};