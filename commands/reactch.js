module.exports = {
  name: "reactch",
  category: "Général",
  onlySudo: true, // Réservé aux sudoers
  description: "Réagit à un message spécifique dans un canal WhatsApp.",
  usage: ".reactch <lien_du_channel> <emoji>",
  keywords: [],

  async execute(riza, m, args) {
    const lien = args[0];
    const emoji = args[1] || "😀";

    if (!lien || !lien.includes("https://whatsapp.com/channel/")) {
      return riza.sendMessage(m.chat, {
        text: "❌ Veuillez fournir un lien de canal WhatsApp valide.",
      }, { quoted: m });
    }

    const match = lien.match(/https:\/\/whatsapp\.com\/channel\/([\w\d]+)(?:\/(\d+))?/);
    if (!match) {
      return riza.sendMessage(m.chat, {
        text: "❌ Lien invalide. Format attendu : https://whatsapp.com/channel/<channelId>/<messageId>",
      }, { quoted: m });
    }

    const channelId = match[1];
    const messageId = match[2];

    if (!messageId) {
      return riza.sendMessage(m.chat, {
        text: "❌ Lien incomplet : l'identifiant du message est manquant.",
      }, { quoted: m });
    }

    try {
      const channelJid = `${channelId}@newsletter`;

      // On tente d'envoyer une réaction au message du canal
      await riza.sendMessage(channelJid, {
        react: {
          text: emoji,
          key: {
            remoteJid: channelJid,
            id: messageId,
            fromMe: false
          }
        }
      });

      return riza.sendMessage(m.chat, {
        text: `✅ Réaction "${emoji}" envoyée avec succès sur le message ${messageId} du canal.`,
      }, { quoted: m });
    } catch (err) {
      console.error("❌ Erreur en réagissant au message de canal :", err);
      return riza.sendMessage(m.chat, {
        text: "❌ Une erreur est survenue. Assurez-vous que le bot est abonné au canal et que le message existe.",
      }, { quoted: m });
    }
  }
};