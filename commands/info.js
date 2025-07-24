const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { getDevice } = require('../lib/utils');

module.exports = {
  name: 'info',
  alias: ['userinfo', 'profilinfo'],
  category: 'information',
  desc: 'Affiche toutes les informations d’un utilisateur.',
  async execute(m, { conn, args }) {
    try {
      let target =
        m.quoted?.sender ||
        (m.mentionedJid && m.mentionedJid[0]) ||
        m.sender;

      const pp = await conn.profilePictureUrl(target, 'image').catch(() => null);
      const name = await conn.getName(target);
      const status = await conn.fetchStatus(target).catch(() => ({ status: "Indisponible" }));
      const presence = conn.presence?.[target]?.lastKnownPresence || "Inconnu";
      const isGroup = m.chat.endsWith('@g.us');
      const metadata = isGroup ? await conn.groupMetadata(m.chat) : {};
      const participant = isGroup ? metadata.participants.find(p => p.id === target) : null;
      const isAdmin = participant?.admin ? 'Oui' : 'Non';
      const isBot = target.endsWith('@g.us') ? 'Groupe' : 'Individuel';

      const device = getDevice(m.id);
      const userInfo = `
┌─「 👤 Infos utilisateur 」
▢ 🧿 Nom: ${name}
▢ 🪪 ID: ${target}
▢ 📸 PP: ${pp ? 'Disponible' : 'Non disponible'}
▢ ✏️ Statut: ${status.status}
▢ 💬 Présence: ${presence}
▢ 👑 Admin: ${isAdmin}
▢ 🤖 Type: ${isBot}
▢ 📱 Appareil: ${device}
▢ ⏰ Heure: ${new Date().toLocaleString()}
▢ 🌐 Locale: ${m.lang || 'fr'}
▢ 🛜 Source Msg: ${m.isGroup ? 'Groupe' : 'PV'}
▢ 🔎 Message ID: ${m.id}
▢ 🧷 Mentionné: ${m.mentionedJid?.[0] || 'Aucun'}
▢ 🔁 Cité: ${m.quoted?.sender || 'Aucun'}
▢ 🗣️ Sender: ${m.sender}
▢ 💢 Is Owner: ${global.owner.includes(m.sender.split('@')[0]) ? 'Oui' : 'Non'}
▢ 📌 Is Group: ${isGroup ? 'Oui' : 'Non'}
▢ 🗳️ Groupe: ${m.chat}
▢ 📦 Nom Groupe: ${metadata?.subject || '-'}
└───────
      `.trim();

      if (pp) {
        await conn.sendMessage(m.chat, {
          image: { url: pp },
          caption: userInfo
        }, { quoted: m });
      } else {
        await m.reply(userInfo);
      }

    } catch (err) {
      console.error("Erreur info.js:", err);
      await m.reply("❌ Une erreur est survenue lors de la récupération des infos.");
    }
  }
}