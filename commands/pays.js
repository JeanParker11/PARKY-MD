const axios = require("axios");
const fs = require("fs");
const path = require("path");

const drapeauxPath = path.join(__dirname, "..", "data", "drapeaux.json");
const emojiToCountry = fs.existsSync(drapeauxPath)
  ? JSON.parse(fs.readFileSync(drapeauxPath, "utf-8"))
  : {};

module.exports = {
  name: "pays",
  category: "Général",
  desc: "🌍 Récupère les infos d’un pays à partir du nom ou du drapeau",
  allowedForAll: true,
  allowPrivate: true,

  async execute(riza, m, args) {
    let input = args.join(" ").trim();

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

    if (!input) {
      return riza.sendMessage(m.chat, {
        text: "🌍 *Donne-moi un nom de pays ou un drapeau !*\n\n📌 Exemple : `.pays 🇹🇬` ou `.pays Togo`"
      }, quotedMsg);
    }

    if (emojiToCountry[input]) {
      input = emojiToCountry[input];
    }

    const url = `https://api.siputzx.my.id/api/tools/countryInfo?name=${encodeURIComponent(input)}`;

    try {
      const res = await axios.get(url);

      if (!res.data.status) {
        return riza.sendMessage(m.chat, {
          text: "❌ *Pays non trouvé ou introuvable.*"
        }, quotedMsg);
      }

      const data = res.data.data;

      const msg = `
🐼 *Informations sur ${data.name}*

📍 *Capitale* : ${data.capital}
🌍 *Continent* : ${data.continent.name} ${data.continent.emoji}
📞 *Indicatif* : ${data.phoneCode}
💸 *Monnaie* : ${data.currency}
🧭 *Position* : ${data.coordinates.latitude}, ${data.coordinates.longitude}
🌐 *Nom de domaine* : \`${data.internetTLD}\`
🛣️ *Conduite* : à *${data.drivingSide === "left" ? "gauche" : "droite"}*
🗺️ *Superficie* : ${data.area.squareKilometers.toLocaleString()} km²

🗣️ *Langue(s)* : ${data.languages.native.join(", ")}
🧾 *Régime* : ${data.constitutionalForm}
🍷 *Alcool* : ${data.alcoholProhibition === "none" ? "Autorisé" : "Restriction régionale"}
🎯 *Connu pour* : ${data.famousFor}

🧭 *Google Maps* : https://www.google.com/maps/place/${encodeURIComponent(data.name)}/@${data.coordinates.latitude},${data.coordinates.longitude},6z

🌐 *Pays voisins* :
${data.neighbors.map((n, i) => `   ${i + 1}. ${n.name}`).join("\n")}

🔖 *Code ISO* : ${data.isoCode.alpha2} / ${data.isoCode.alpha3} / ${data.isoCode.numeric}
`;

      await riza.sendMessage(m.chat, {
        image: { url: data.flag },
        caption: msg.trim()
      }, quotedMsg);
    } catch (err) {
      console.error("❌ Erreur .pays :", err.message);
      await riza.sendMessage(m.chat, {
        text: "❌ *Erreur lors de la récupération des infos du pays.*"
      }, quotedMsg);
    }
  },
};