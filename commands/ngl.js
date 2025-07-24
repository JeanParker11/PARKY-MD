const axios = require("axios");

module.exports = {
  name: "ngl",
  category: "Général",
  description: "Envoie un message anonyme via NGL.link",
  allowedForAll: true,
  allowPrivate: true,

  async execute(riza, m, args) {
    const quotedMsg = {
      quoted: {
        key: {
          remoteJid: m.key.remoteJid,
          fromMe: m.key.fromMe,
          id: m.key.id,
          participant: m.key.participant || m.participant,
        },
        message: m.message?.ephemeralMessage?.message || m.message,
      },
    };

    const text = args.join(" ").trim();

    if (!text.includes("ngl.link") || !text.includes(" ")) {
      return riza.sendMessage(
        m.chat,
        {
          text: "📥 *Utilisation correcte :*\n`.ngl https://ngl.link/username Message à envoyer`",
        },
        quotedMsg
      );
    }

    const [rawLink, ...messageParts] = text.split(" ");
    const nglLink = rawLink.trim();
    const msgToSend = messageParts.join(" ").trim();

    const apiURL = `https://api.siputzx.my.id/api/tools/ngl?link=${encodeURIComponent(
      nglLink
    )}&text=${encodeURIComponent(msgToSend)}`;

    try {
      const res = await axios.get(apiURL);

      if (!res.data.status || !res.data.data || !res.data.data.questionId) {
        return riza.sendMessage(
          m.chat,
          {
            text: "❌ *Échec de l’envoi du message. Vérifie le lien NGL ou réessaie.*",
          },
          quotedMsg
        );
      }

      const id = res.data.data.questionId;
      await riza.sendMessage(
        m.chat,
        {
          text: `✅ *Message envoyé anonymement !*\n\n🆔 Question ID : \`${id}\``,
        },
        quotedMsg
      );
    } catch (err) {
      console.error("❌ Erreur .ngl :", err.message);
      await riza.sendMessage(
        m.chat,
        {
          text: "❌ Une erreur s’est produite lors de l’envoi. Essaie encore.",
        },
        quotedMsg
      );
    }
  },
};