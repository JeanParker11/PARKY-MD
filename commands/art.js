const axios = require("axios");

module.exports = {
  name: "art",
  category: "Général",
  description: "Génère une image artistique à partir d'une description",
  allowedForAll: true,
  allowPrivate: true,

  async execute(parky, m, args) {
    const prompt = args.join(" ").trim();

    // Gestion du message cité (éphemeral ou pas)
    const quotedMsg = {
      quoted: {
        key: {
          remoteJid: m.key.remoteJid,
          fromMe: m.key.fromMe,
          id: m.key.id,
          participant: m.key.participant || m.participant
        },
        message: m.message?.ephemeralMessage?.message || m.message
      }
    };

    if (!prompt) {
      return parky.sendMessage(m.chat, {
        text: "🖌️ *Écris une idée à transformer en art !*\n\n📌 Exemple : `.art un château enchanté au clair de lune`"
      }, quotedMsg);
    }

    const url = `https://api.siputzx.my.id/api/ai/magicstudio?prompt=${encodeURIComponent(prompt)}`;

    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });

      if (!response || response.status !== 200)
        throw new Error("Image non reçue.");

      const buffer = Buffer.from(response.data, "binary");

      await parky.sendMessage(m.chat, {
        image: buffer,
        mimetype: "image/jpeg",
        caption: `🧠 *Prompt :*\n「 ${prompt} 」\n\n🎨 *Image générée via PARKY AI*`
      }, quotedMsg);
    } catch (err) {
      console.error("❌ Erreur .art :", err.message);
      await parky.sendMessage(m.chat, {
        text: "❌ *Une erreur est survenue lors de la génération de l’image.*\nEssaie un autre prompt."
      }, quotedMsg);
    }
  },
};