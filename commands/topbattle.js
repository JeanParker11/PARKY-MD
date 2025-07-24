const fs = require("fs");
const path = require("path");

const scoresPath = path.join(__dirname, "../data/battle.json");

const loadScores = () => {
  if (!fs.existsSync(scoresPath)) return {};
  return JSON.parse(fs.readFileSync(scoresPath));
};

module.exports = {
  name: "topbattle",
  description: "Afficher le classement des victoires en Battle",
  category: "JEUX",
  allowedForAll: true,
  async execute(riza, m) {
    const from = m.chat;

    const scores = loadScores();
    const entries = Object.entries(scores);

    if (entries.length === 0) {
      return riza.sendMessage(from, { text: "Aucun duel enregistré pour le moment." }, { quoted: m });
    }

    entries.sort((a, b) => (b[1].victories || 0) - (a[1].victories || 0));
    const top = entries.slice(0, 10);

    let text = "🏆 *Top 10 des Victoires en Battle*\n\n";

    const medals = ["🥇", "🥈", "🥉"];
    top.forEach(([jid, data], i) => {
      const medal = medals[i] || `${i + 1}.`;
      text += `${medal} @${jid.split("@")[0]} - ${data.victories || 0} victoires\n`;
    });

    await riza.sendMessage(from, {
      text,
      mentions: top.map(([jid]) => jid),
    });
  },
};