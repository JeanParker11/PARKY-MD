const axios = require("axios");

function toFancy(str = "") {
  const map = (c) => {
    if (c >= "A" && c <= "Z") return String.fromCodePoint(0x1d400 + (c.charCodeAt(0) - 0x41));
    if (c >= "a" && c <= "z") return String.fromCodePoint(0x1d41a + (c.charCodeAt(0) - 0x61));
    if (c >= "0" && c <= "9") return String.fromCodePoint(0x1d7ce + (c.charCodeAt(0) - 0x30));
    return c;
  };
  return [...str].map(map).join("");
}

module.exports = {
  name: "couplepp",
  category: "Général",
  description: toFancy("Génère des jolies PP de couple"),
  allowedForAll: true,
  allowPrivate: true,

  async execute(riza, m) {
    try {
      const res = await axios.get("https://raw.githubusercontent.com/iamriz7/kopel_/main/kopel.json");
      const couples = res.data;

      if (!Array.isArray(couples) || !couples.length) {
        return riza.sendMessage(m.chat, {
          text: toFancy("❌ Impossible de récupérer les images."),
          quoted: m.key,
        });
      }

      // 💬 Demander prénom garçon
      await riza.sendMessage(m.chat, {
        text: toFancy("💬 Quel est le prénom du garçon ?"),
        quoted: m.key,
      });
      const repG = await waitForUserReply(riza, m);
      const nomGarcon = repG || "Lui";

      // 💬 Demander prénom fille
      await riza.sendMessage(m.chat, {
        text: toFancy("💬 Et le prénom de la fille ?"),
        quoted: m.key,
      });
      const repF = await waitForUserReply(riza, m);
      const nomFille = repF || "Elle";

      const choix = couples[Math.floor(Math.random() * couples.length)];

      // 👦 Garçon
      await riza.sendMessage(m.chat, {
        image: { url: choix.male },
        caption: toFancy(`👦 ${nomGarcon}\n\n💖 Le prince du duo`),
        quoted: m.key,
      });

      // 👧 Fille
      await riza.sendMessage(m.chat, {
        image: { url: choix.female },
        caption: toFancy(`👧 ${nomFille}\n\n💖 La princesse du duo`),
        quoted: m.key,
      });

      // 💑 Résumé
      await riza.sendMessage(m.chat, {
        text: toFancy(`✨💑 Couple : ${nomGarcon} ❤️ ${nomFille}\n\n🥰 Vos PP sont prêtes !`),
        quoted: m.key,
      });

    } catch (err) {
      console.error("Erreur couplepp:", err);
      await riza.sendMessage(m.chat, {
        text: toFancy("❌ Une erreur est survenue."),
        quoted: m.key,
      });
    }
  },
};

/**
 * 🔄 Attend une seule réponse de l’auteur du message original
 */
function waitForUserReply(riza, chatMessage) {
  return new Promise((resolve) => {
    const sender = chatMessage.sender || chatMessage.key.participant || chatMessage.key.remoteJid;
    const chat = chatMessage.chat || chatMessage.key.remoteJid;
    const timeout = setTimeout(() => {
      riza.ev.off("messages.upsert", listener);
      resolve(null); // timeout
    }, 30000);

    const listener = async ({ messages }) => {
      const msg = messages[0];
      const from = msg.key.participant || msg.key.remoteJid;
      if (msg.key.remoteJid === chat && from === sender && !msg.key.fromMe) {
        riza.ev.off("messages.upsert", listener);
        clearTimeout(timeout);
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
        resolve(text.trim());
      }
    };

    riza.ev.on("messages.upsert", listener);
  });
}