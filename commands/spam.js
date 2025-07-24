const fs = require("fs");
const path = require("path");

const signalsPath = path.join(__dirname, "../data/signals.json");

// Création du fichier si inexistant
if (!fs.existsSync(signalsPath)) {
  fs.writeFileSync(signalsPath, JSON.stringify([], null, 2));
}

module.exports = {
  name: "spam",
  category: "Owner",
  description: "Signaler un numéro à surveiller pour harcèlement",
  allowedForAll: true,

  async execute(riza, m, args) {
    const chat = m.chat;
    const sender = m.sender;

    // Vérification de l'argument
    if (!args[0] || !args[0].startsWith("+") || args[0].length < 8) {
      return await riza.sendMessage(chat, {
        text: `❗ *Utilisation correcte :* .spam +22997001122 harcèlement\n\nAjoutez aussi une raison si vous le souhaitez.`
      }, { quoted: m });
    }

    const number = args[0];
    const reason = args.slice(1).join(" ") || "Raison non précisée";

    const signals = JSON.parse(fs.readFileSync(signalsPath));

    // Vérifie si déjà signalé par cette personne
    const already = signals.find(
      (s) => s.number === number && s.reportedBy === sender
    );

    if (already) {
      return await riza.sendMessage(chat, {
        text: `⚠️ *Ce numéro a déjà été signalé par vous.*\nMerci de votre vigilance.`
      }, { quoted: m });
    }

    // Ajout dans la base
    signals.push({
      reportedBy: sender,
      number: number,
      reason: reason,
      date: new Date().toISOString()
    });

    fs.writeFileSync(signalsPath, JSON.stringify(signals, null, 2));

    // Message de confirmation
    await riza.sendMessage(chat, {
      text: `✅ *Le numéro ${number} a été ajouté à la liste avec succès !*\n\n🕵️ *Raison :* ${reason}\n\n📅 *Date :* ${new Date().toLocaleString()}\n\n🛑 *En attente de votre confirmation pour demander son bannissement.(exécuter la commande !ban)*`
    }, { quoted: m });
  }
};