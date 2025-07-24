const axios = require('axios');

module.exports = {
  name: "site",
  keywords: [".site", "!site", "$site"],
  description: "Affiche le lien NGROK actuel et l'utilité du site",
  category: "Owner",
  onlyOwner: true,

  execute: async (riza, m) => {
    try {
      const url = global.ngrokUrl;

      if (!url) {
        return await riza.sendMessage(m.chat, {
          text: "❌ Aucun tunnel NGROK actif actuellement. Le site n'est pas disponible.",
        }, { quoted: m });
      }

      const description = `🔗 *Lien du site actif :* ${url}

🌐 *Utilité du site :*
Ce site est l'interface web du bot WhatsApp *PARKY-MD*. Il vous permet de :

🛠️ *Gérer les quiz* :
• Créer ou proposer des quiz texte ou image

🤖 *Utiliser l’assistant PARKY-AI* :
• Obtenir de l’aide par chat pour créer des quiz
• Générer des suggestions automatiques

📱 *Connexion WhatsApp* :
• Générer un *code d’appariement* pour connecter le bot via Baileys

📊 *Consulter les statistiques* :
• Nombre total de quiz texte & image disponibles sur le bot

⚠️ *Note importante* :
Seuls les liens directs d’images hébergées (comme les .url générés par bots) sont valides pour les quiz image.`;

      const thumbnailUrl = global.imgthumb || "https://files.catbox.moe/9glxaf.jpeg";
      let imageBuffer = null;

      try {
        const res = await axios.get(thumbnailUrl, { responseType: 'arraybuffer' });
        imageBuffer = res.data;
      } catch (e) {
        console.warn("⚠️ Image non chargée :", e.message);
      }

      await riza.sendMessage(m.chat, {
        text: description,
        contextInfo: {
          externalAdReply: {
            title: "PARKY-MD • Interface Web",
            body: "Clique ici pour ouvrir le site",
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: url,
            mediaUrl: url,
            thumbnail: imageBuffer
          }
        }
      }, { quoted: m });

    } catch (err) {
      console.error("❌ Erreur commande site :", err);
      await riza.sendMessage(m.chat, {
        text: "❌ Erreur lors de l'affichage du lien NGROK.",
      }, { quoted: m });
    }
  }
};