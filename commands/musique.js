const fetch = require("node-fetch");
const path = require("path");

module.exports = {
  name: "musique",
  keywords: [".musique"],
  category: "JEUX",
  description: "Recherche une musique sur YouTube et permet de télécharger l'audio ou la vidéo.",
  allowedForAll: true,

  async execute(riza, m, args, chatUpdate, store) {
    const text = args.join(" ");
    if (!text) {
      return riza.sendMessage(m.chat, {
        text: "🔍 Veuillez fournir le nom d'une musique.\nEx: `.musique YNW Melly`",
      }, { quoted: m });
    }

    try {
      const searchUrl = `https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(text)}`;
      const res = await fetch(searchUrl);
      const json = await res.json();

      if (!json.status || !json.data || !json.data.length) {
        return riza.sendMessage(m.chat, {
          text: "❌ Aucun résultat trouvé.",
        }, { quoted: m });
      }

      const video = json.data.find(v => v.type === "video");
      if (!video) {
        return riza.sendMessage(m.chat, { text: "❌ Aucun contenu vidéo trouvé." }, { quoted: m });
      }

      const caption = `🎵 *${video.title}*\n👤 ${video.author.name}\n⏱️ ${video.duration.timestamp}\n📎 ${video.url}\n\nRépond avec:\n1️⃣ pour *Vidéo*\n2️⃣ pour *Audio*`;

      await riza.sendMessage(m.chat, {
        image: { url: video.thumbnail },
        caption,
      }, { quoted: m });

      // On écoute la réponse utilisateur
      const collector = riza.ev.once("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.participant !== m.key.participant) return;

        const userReply = msg.message.conversation?.trim();
        const id = video.videoId;

        try {
          if (userReply === "1") {
            const r = await fetch(`https://api.siputzx.my.id/api/dl/ytv?videoId=${id}`);
            const j = await r.json();
            if (!j.status) throw "Erreur API vidéo";

            await riza.sendMessage(m.chat, {
              video: { url: j.data.url },
              mimetype: "video/mp4",
              caption: `📽️ ${j.data.title}\n💾 ${j.data.size}`,
            }, { quoted: msg });
          } else if (userReply === "2") {
            const r = await fetch(`https://api.siputzx.my.id/api/dl/yta?videoId=${id}`);
            const j = await r.json();
            if (!j.status) throw "Erreur API audio";

            await riza.sendMessage(m.chat, {
              document: { url: j.data.url },
              mimetype: "audio/mp4",
              fileName: `${j.data.title}.mp3`,
              caption: `🎧 ${j.data.title}\n💾 ${j.data.size}`,
            }, { quoted: msg });
          } else {
            await riza.sendMessage(m.chat, { text: "❌ Choix invalide. Réponds par `1` ou `2`." }, { quoted: msg });
          }
        } catch (e) {
          console.error("❌ Erreur téléchargement :", e);
          await riza.sendMessage(m.chat, { text: "❌ Échec du téléchargement." }, { quoted: msg });
        }
      });

    } catch (err) {
      console.error("❌ Erreur musique :", err);
      riza.sendMessage(m.chat, { text: "❌ Une erreur est survenue pendant la recherche." }, { quoted: m });
    }
  }
};