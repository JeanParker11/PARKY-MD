const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeExif } = require('../lib/exif');

module.exports = {
  name: "sticker",
  category: "Général",
  description: "Crée un sticker à partir d’une image ou vidéo courte.",
  usage: ".sticker (en réponse à un média)",
  onlyAdmin: false,

  async execute(riza, m) {
    try {
      const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      // 🧾 Récupérer le pseudo de l'auteur
      const senderJid = m.sender;
      const contact = riza.contacts?.[senderJid] || {};
      const authorName = contact.name || contact.notify || senderJid.split("@")[0];

      if (!quotedMsg) {
        return riza.sendMessage(m.chat, {
          text: "❌ Réponds à une *image* ou une *vidéo courte* pour créer un sticker."
        }, { quoted: m });
      }

      let mediaType = null;
      let content = null;

      if (quotedMsg.imageMessage) {
        mediaType = 'image';
        content = quotedMsg.imageMessage;
      } else if (quotedMsg.videoMessage) {
        mediaType = 'video';
        content = quotedMsg.videoMessage;
      } else {
        return riza.sendMessage(m.chat, {
          text: "❌ Le message cité doit contenir une *image* ou une *vidéo courte*."
        }, { quoted: m });
      }

      // 📥 Téléchargement du média
      const stream = await downloadContentFromMessage(content, mediaType);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // 🖼️ Création du sticker avec exif personnalisé
      const stickerBuffer = await writeExif({
        mimetype: content.mimetype,
        data: buffer
      }, {
        packname: global.stickerPackName || "PARKY-MD",
        author: authorName
      });

      // 📤 Envoi du sticker
      await riza.sendMessage(m.chat, {
        sticker: stickerBuffer
      }, { quoted: m });

    } catch (err) {
      console.error("❌ Erreur sticker :", err);
      await riza.sendMessage(m.chat, {
        text: "❌ Impossible de créer le sticker. Assure-toi de répondre à une image/vidéo valide."
      }, { quoted: m });
    }
  }
};