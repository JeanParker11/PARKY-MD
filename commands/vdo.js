const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'vdo',
  category: 'Owner',
  desc: 'Renvoie une vidéo citée en mode PTV (Push To View)',
  usage: '.vdo [numéro]',
  onlyOwner: true,

  async execute(riza, m, args) {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || !quoted.videoMessage) {
      return riza.sendMessage(m.chat, {
        text: '❌ Réponds à une *vidéo* pour la convertir en PTV.'
      }, { quoted: m });
    }

    if (!args[0]) {
      return riza.sendMessage(m.chat, {
        text: '📩 Veuillez fournir un numéro. Exemple : *.vdo 22890123456*'
      }, { quoted: m });
    }

    // 📞 Conversion du numéro vers jid complet
    const rawNumber = args[0].replace(/[^0-9]/g, '');
    const targetJid = rawNumber.includes('@s.whatsapp.net') ? rawNumber : `${rawNumber}@s.whatsapp.net`;

    try {
      // 📥 Télécharger la vidéo depuis le message cité
      const stream = await downloadContentFromMessage(quoted.videoMessage, 'video');
      const buffer = [];
      for await (const chunk of stream) buffer.push(chunk);
      const videoBuffer = Buffer.concat(buffer);

      // 📤 Envoyer la vidéo en mode PTV (Push to View)
      await riza.sendMessage(targetJid, {
        video: videoBuffer,
        mimetype: 'video/mp4',
        caption: quoted.videoMessage.caption || '',
        gifPlayback: false,
        ptv: true
      });

      // ✅ Confirmation dans le chat
      await riza.sendMessage(m.chat, {
        text: `✅ Vidéo envoyée à ${rawNumber}`
      }, { quoted: m });

    } catch (err) {
      console.error('❌ Erreur envoi PTV :', err);
      await riza.sendMessage(m.chat, {
        text: `⚠️ Erreur lors de l’envoi : ${err.message || err}`
      }, { quoted: m });
    }
  }
};