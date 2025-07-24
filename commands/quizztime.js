const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../data/quizConfig.json");  // <-- même fichier que dans quizz.js

module.exports = {
  name: "quizztime",
  description: "Définit le temps de réponse du quiz (en secondes)",
  category: "JEUX",

  allowedForAll: false,
  onlyOwner: false,
  onlySudo: true,
  onlyAdmin: false,

  async execute(riza, m, args) {
    const newTime = parseInt(args[0]);
    if (isNaN(newTime) || newTime < 5 || newTime > 60) {
      return riza.sendMessage(m.chat, {
        text: "❌ Veuillez entrer un temps entre 5 et 60 secondes, par exemple : `.quizztime 15`"
      }, { quoted: m });
    }

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify({ quizTime: 10 }, null, 2));
    }

    const config = JSON.parse(fs.readFileSync(configPath));
    config.quizTime = newTime;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await riza.sendMessage(m.chat, {
      text: `⏱️ Temps du quiz mis à jour à *${newTime} secondes*.`,
    }, { quoted: m });
  }
};