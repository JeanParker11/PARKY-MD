module.exports = {
  name: "groupeid",
  description: "Affiche le GID du groupe actuel",
  category: "Owner",
  onlyOwner: true,
  async execute(riza, m) {
    if (!m.chat.endsWith("@g.us")) {
      return riza.sendMessage(m.chat, { text: "❌ Cette commande doit être utilisée dans un groupe." }, { quoted: m });
    }

    const jid = m.chat;
    await riza.sendMessage(m.chat, { text: `📌 Le JID de ce groupe est :\n\n${jid}` }, { quoted: m });
  },
};