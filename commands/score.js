const fs = require("fs");
const path = require("path");
const userDataManager = require("../lib/userDataManager");
const botManager = require("../lib/botManager");


// 🔧 Fonction pour corriger les jid @lid
function normalizeJid(jidOrObj) {
  if (!jidOrObj) return "";
  if (typeof jidOrObj === "string") return jidOrObj;
  return jidOrObj.phone_number || jidOrObj.jid || "";
}

module.exports = {
  name: "score",
  description: "Affiche ton score, celui d’un joueur ou le classement",
  category: "JEUX",

  // Permissions
  allowedForAll: true,
  onlyOwner: false,
  onlySudo: false,
  onlyAdmin: false,

  async execute(riza, m, args) {
    // Obtenir la configuration du bot
    const botConfig = riza.botConfig || getBotConfigFromSocket(riza);
    const botId = botConfig?.botId || 'default';
    
    const from = m.chat;
    const sender = normalizeJid(m.sender);
    const users = userDataManager.getBotScores(botId);

    // -- Top classement
    if (args[0] === "top") {
      const sorted = Object.entries(users)
        .sort((a, b) => (b[1].score || 0) - (a[1].score || 0))
        .slice(0, 10);

      if (sorted.length === 0) {
        return riza.sendMessage(from, {
          text: "❌ Aucun score enregistré.",
        }, { quoted: m });
      }

      let text = "*🏆 Classement Quiz :*\n\n";
      for (let i = 0; i < sorted.length; i++) {
        const [jid, data] = sorted[i];
        const tag = `@${jid.split("@")[0]}`;
        text += `${i + 1}. ${tag} - ${data.score || 0} pts\n`;
      }

      return riza.sendMessage(from, {
        text,
        mentions: sorted.map(u => normalizeJid(u[0])),
      }, { quoted: m });
    }

    // -- Score d’un autre utilisateur mentionné
    let target = sender;

    if (m.mentionedJid && m.mentionedJid.length > 0) {
      target = normalizeJid(m.mentionedJid[0]);
    } else if (args[0]) {
      const num = args[0].replace(/[^0-9]/g, "");
      if (num.length > 4) target = `${num}@s.whatsapp.net`;
    }

    const score = users[target]?.score || 0;
    const pseudo = target === sender ? "Ton" : `Le score de @${target.split("@")[0]}`;

    return riza.sendMessage(from, {
      text: `📊 ${pseudo} score est de : *${score}* point(s)`,
      mentions: [target],
    }, { quoted: m });
  },
};
// Fonction pour obtenir la config du bot depuis le socket
function getBotConfigFromSocket(sock) {
  if (sock.botConfig) return sock.botConfig;
  if (sock.botId) return botManager.getBotConfig(sock.botId);
  return null;
}