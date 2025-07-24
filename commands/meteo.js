const fetch = require('node-fetch');
const axios = require('axios');

module.exports = {
  name: "meteo",
  alias: ["weather"],
  category: "Général",
  desc: "Affiche la météo actuelle d'une ville.",
  allowedForAll: true,
  usage: ".meteo <ville>",
  
  async execute(riza, m, args) {
    const reply = (text) => riza.sendMessage(m.chat, { text }, { quoted: m });

    if (!args || args.length === 0) {
      return reply('⚠️ Veuillez fournir le nom d\'une ville.\n\nExemple : `.meteo Lomé`');
    }

    const city = args.join(" ");
    const apiKey = '8044b9a239193d667183ab85fea38ca9';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=fr`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.cod !== 200 || !data.weather || data.weather.length === 0) {
        return reply(`❌ Ville introuvable ou données météo indisponibles pour : *${city}*`);
      }

      const weather = data.weather[0];
      const main = data.main || {};
      const wind = data.wind || {};

      const weatherDescription = weather.description || 'N/A';
      const temperature = main.temp !== undefined ? main.temp : 'N/A';
      const humidity = main.humidity !== undefined ? main.humidity : 'N/A';
      const pressure = main.pressure !== undefined ? main.pressure : 'N/A';
      const windSpeed = wind.speed !== undefined ? wind.speed : 'N/A';

      const title = `📍 Météo à ${data.name}`;
      const description = 
        `📝 Description : ${weatherDescription}\n` +
        `🌡️ Température : ${temperature}°C\n` +
        `💧 Humidité : ${humidity}%\n` +
        `🔽 Pression : ${pressure} hPa\n` +
        `💨 Vent : ${windSpeed} m/s`;

      // Image météo custom ou icône OpenWeatherMap
      const imageUrl = `https://files.catbox.moe/nvfeib.jpeg`;
      // const imageUrl = `https://openweathermap.org/img/wn/${weather.icon}@4x.png`;

      const thumbnailBuffer = (await axios.get(imageUrl, { responseType: 'arraybuffer' })).data;

      const sourceUrl = `https://openweathermap.org/city/${data.id}`;

      await riza.sendMessage(m.chat, {
        text: title + "\n\n" + description + `\n\n🐼 𝗣𝗔𝗥𝗞𝗬 𝗠𝗘𝗧𝗘𝗢`,
        contextInfo: {
          externalAdReply: {
            title,
            body: description,
            thumbnail: thumbnailBuffer,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl,
            mediaUrl: sourceUrl
          }
        }
      }, { quoted: m });

    } catch (error) {
      console.error("❌ Erreur météo :", error);
      reply("❌ Une erreur est survenue lors de la récupération de la météo. Réessaie plus tard.");
    }
  }
};