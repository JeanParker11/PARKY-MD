const fs = require("fs");
const path = require("path");
const sharedData = require("../lib/sharedData");


module.exports = {
  name: "addreward",
  description: "Ajouter une récompense au fichier recompense.json",
  category: "Owner",
  onlyOwner: true,
  usage: ".addreward <service>|<email>|<password>",
  async execute(riza, m, args) {
    if (args.length === 0) {
      return riza.sendMessage(m.chat, { text: `❌ Usage : ${this.usage}` }, { quoted: m });
    }

    const input = args.join(" ").split("|");
    if (input.length < 3) {
      return riza.sendMessage(m.chat, { text: `❌ Format invalide. Utilise :\n${this.usage}` }, { quoted: m });
    }

    const [service, email, password] = input.map(s => s.trim());

    if (!service || !email || !password) {
      return riza.sendMessage(m.chat, { text: `❌ Tous les champs doivent être remplis.` }, { quoted: m });
    }

    const success = sharedData.addSharedReward({ service, email, password });

    if (success) {
      await riza.sendMessage(m.chat, { text: `✅ Récompense partagée ajoutée pour le service ${service}.` }, { quoted: m });
    } else {
      await riza.sendMessage(m.chat, { text: `❌ Erreur lors de l'ajout de la récompense.` }, { quoted: m });
    }
  },
};