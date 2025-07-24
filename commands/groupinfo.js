module.exports = {
  name: "groupinfo",
  keywords: [".groupinfo", "!groupinfo", "$groupinfo"],
  description: "Affiche les informations du groupe",
  category: "Général",
  onlyAdmin: false,
  botAdmin: false,
  group: true,

  execute: async (conn, m, args) => {
    try {
      const metadata = await conn.groupMetadata(m.chat);
      const creationDate = new Date(metadata.creation * 1000);
      const admins = metadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
      const participantsCount = metadata.participants.length;
      const adminsCount = admins.length;

      let msg = `📋 *Infos du groupe*\n`;
      msg += `• Nom : ${metadata.subject}\n`;
      msg += `• ID : ${metadata.id}\n`;
      msg += `• Créé le : ${creationDate.toLocaleString()}\n`;
      msg += `• Participants : ${participantsCount}\n`;
      msg += `• Admins : ${adminsCount}\n`;
      msg += `• Description : ${metadata.desc || "Aucune"}\n`;

      await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
    } catch (e) {
      await conn.sendMessage(m.chat, { text: `❌ Impossible d'obtenir les infos du groupe.` }, { quoted: m });
    }
  }
};