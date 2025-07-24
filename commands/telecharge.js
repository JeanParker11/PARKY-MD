const yt = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");

const tempSearches = new Map();

module.exports = {
  name: "telecharge",
  category: "Général",
  description: "Recherche une vidéo YouTube et télécharge audio ou vidéo.",
  allowedForAll: true,

  async execute(riza, m, args) {
    const text = args.join(" ").trim();

    if (!text) {
      return await riza.sendMessage(m.chat, {
        text: "❗ Fournis un mot-clé.\nExemple : `.telecharge mbappe`"
      }, { quoted: m });
    }

    await riza.sendMessage(m.chat, {
      text: "🔎 Recherche YouTube en cours..."
    }, { quoted: m });

    let video;
    try {
      const result = await yt.search(text);
      video = result.videos[0];
      if (!video) {
        return await riza.sendMessage(m.chat, { text: "❌ Aucun résultat trouvé." }, { quoted: m });
      }
    } catch (e) {
      return await riza.sendMessage(m.chat, { text: "❌ Erreur de recherche YouTube." }, { quoted: m });
    }

    tempSearches.set(m.chat, {
      url: video.url,
      title: video.title,
      requester: m.sender,
      timestamp: Date.now()
    });

    const caption =
      `🔍 *Résultat YouTube*\n\n` +
      `📌 *Titre :* ${video.title}\n` +
      `⏳ *Durée :* ${video.timestamp}\n` +
      `👤 *Chaîne :* ${video.author.name}\n` +
      `👀 *Vues :* ${video.views.toLocaleString()}\n\n` +
      `🟢 Réponds avec :\n` +
      `1️⃣ pour *Audio*\n2️⃣ pour *Vidéo*\n\n` +
      `⏳ *Réponse valable 2 minutes.*`;

    await riza.sendMessage(m.chat, {
      image: { url: video.thumbnail },
      caption
    }, { quoted: m });

    const timeout = setTimeout(() => {
      tempSearches.delete(m.chat);
      riza.sendMessage(m.chat, { text: "⌛ Temps écoulé. Refais `.telecharge <mot-clé>` pour réessayer." });
      riza.ev.off("messages.upsert", handler);
    }, 2 * 60 * 1000);

    const handler = async ({ messages }) => {
      const msg = messages[0];
      if (!msg || !msg.message) return;

      const from = msg.key.remoteJid;
      const sender = msg.key.participant || msg.key.remoteJid;

      if (from !== m.chat || sender !== m.sender) return;

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const trimmed = content.trim();
      if (!["1", "2"].includes(trimmed)) return;

      clearTimeout(timeout);
      tempSearches.delete(m.chat);
      riza.ev.off("messages.upsert", handler);

      const isAudio = trimmed === "1";
      const apiUrl = isAudio
        ? `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`
        : `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(video.url)}`;

      await riza.sendMessage(m.chat, {
        text: `⏳ Téléchargement ${isAudio ? "audio" : "vidéo"} en cours...`
      });

      try {
        const res = await axios.get(apiUrl, { responseType: "arraybuffer" });

        // Vérifie si le serveur renvoie bien un fichier
        const contentType = res.headers['content-type'] || "";
        if (!contentType.includes(isAudio ? "audio" : "video")) {
          return await riza.sendMessage(m.chat, {
            text: "❌ Le fichier reçu n'est pas un média valide. Lien ou vidéo peut-être bloqué."
          });
        }

        const ext = isAudio ? "mp3" : "mp4";
        const filename = `yt_${Date.now()}.${ext}`;
        const filepath = path.join(os.tmpdir(), filename);
        fs.writeFileSync(filepath, res.data);

        const options = {
          fileName: filename,
          quoted: m
        };

        if (isAudio) {
          await riza.sendMessage(m.chat, {
            audio: { url: filepath },
            mimetype: "audio/mpeg",
            ...options
          });
        } else {
          await riza.sendMessage(m.chat, {
            video: { url: filepath },
            mimetype: "video/mp4",
            ...options
          });
        }

        fs.unlinkSync(filepath);

      } catch (err) {
        console.error("❌ Erreur:", err);
        await riza.sendMessage(m.chat, {
          text: "❌ Une erreur s'est produite lors du téléchargement. Vérifie si la vidéo est accessible."
        });
      }
    };

    riza.ev.on("messages.upsert", handler);
  }
};