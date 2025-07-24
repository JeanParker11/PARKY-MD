const fs = require("fs");
const path = require("path");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const filePath = path.join(__dirname, "../data/filles.json");

module.exports = {
  name: "lancer",
  category: "JEUX",
  description: "Lancer du bouquet avec tirage parmi les filles inscrites",
  allowedForAll: true,

  async execute(riza, m) {
    const chat = m.chat;

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }

    const filles = JSON.parse(fs.readFileSync(filePath));

    if (filles.length === 0) {
      return await riza.sendMessage(chat, {
        text: "❌ *Aucune fille inscrite pour le lancer de bouquet !*\nAjoutez des prénoms dans `data/filles.json`."
      }, { quoted: m });
    }

    const animations = [
      "💐 *La mariée s'avance lentement...*",
      "🎶 *Une douce musique s'élève...*",
      "👀 *Toutes les filles se rassemblent derrière elle...*",
      "🙈 *Elle se retourne sans regarder...*",
      "🔄 *Elle fait un tour sur elle-même...*",
      "📢 *Et elle lance... LE BOUQUET !* 💐",
      "🎯 *Dans les airs... Qui va l’attraper ?!*"
    ];

    const sent = await riza.sendMessage(chat, { text: animations[0] }, { quoted: m });

    for (let i = 1; i < animations.length; i++) {
      await delay(2000);
      await riza.sendMessage(chat, {
        edit: sent.key,
        text: animations[i]
      });
    }

    await delay(2500);
    const gagnante = filles[Math.floor(Math.random() * filles.length)];

    await riza.sendMessage(chat, {
      edit: sent.key,
      text: `💐 *LE BOUQUET A ÉTÉ ATTRAPÉ PAR...*\n\n👰 *${gagnante.toUpperCase()}* 🎉\n\n*Félicitations ! Tu es la prochaine à te marier 💍💘*`
    });
  }
};