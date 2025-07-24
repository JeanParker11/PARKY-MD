const os = require("os");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
  name: "menu",
  category: "Général",
  description: "Affiche le menu des commandes",
  allowedForAll: true,

  async execute(riza, m, args) {
    const prefix = global.prefix || "!";
    const botName = global.botname || "ᴘᴀʀᴋʏ-ᴍᴅ";
    const version = global.botversion || "1.0.0";
    const userName = m.pushName || "Utilisateur";
    const ramUsed = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const ramTotal = (os.totalmem() / 1024 / 1024).toFixed(1);
    const uptimeSeconds = process.uptime();
    const uptime = formatUptime(uptimeSeconds);
    const platform = os.platform();

    const now = new Date();
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const dayName = dayNames[now.getDay()];
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const pluginsDir = path.join(__dirname, "../commands");
    if (!fs.existsSync(pluginsDir)) {
      return await riza.sendMessage(m.chat, { text: "Erreur : dossier commands introuvable." }, { quoted: m });
    }

    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith(".js"));
    const commands = [];

    for (const file of files) {
      try {
        const plugin = require(path.join(pluginsDir, file));
        if (plugin.name) {
          commands.push({
            name: plugin.name,
            category: plugin.category || "Autres"
          });
        }
      } catch (e) {
        console.error("Erreur chargement plugin", file, e);
      }
    }

    const categories = {};
    for (const cmd of commands) {
      if (!categories[cmd.category]) categories[cmd.category] = [];
      categories[cmd.category].push(cmd.name);
    }

    let menuText = `
╭════[${botName.toUpperCase()}]═════⊷
┃𖦹╭──────────────◉
┃𖦹│ Préfixe : ${prefix}
┃𖦹│ Utilisateur : ${userName}
┃𖦹│ Heure : ${timeStr}
┃𖦹│ Jour : ${dayName}
┃𖦹│ Date : ${dateStr}
┃𖦹│ Version : ${version}
┃𖦹│ RAM : ${ramUsed}/${ramTotal} MB
┃𖦹│ Activité : ${uptime}
┃𖦹│ Plateforme : ${platform}
┃𖦹╰───────────────◉
╰═════════════════⊷
`;

    for (const [category, cmds] of Object.entries(categories)) {
      menuText += `\n╭─❏ ${stylizeCategory(category)} ❏\n`;
      for (const c of cmds) {
        menuText += `│ ⬡ ${stylizeFancy(c)}\n`;
      }
      menuText += "╰─────────────────⊷\n";
    }

    const imageUrl = global.menuImageUrl || "https://files.catbox.moe/9glxaf.jpeg";
    const newsletterJid = global.menuNewsletterJid || "120363400129137847@newsletter";
    const newsletterName = global.menuNewsletterName || "🍃‣UNIROLIST";
    const sourceUrl = global.menuChannelLink || "https://whatsapp.com/channel/0029VbB8oYs6LwHdYRLglh17";

    try {
      const imageBuffer = (await axios.get(imageUrl, { responseType: 'arraybuffer' })).data;

      async function replymenu(teks) {
        await riza.sendMessage(m.chat, {
          image: imageBuffer,
          caption: teks,
          sourceUrl: sourceUrl,
          contextInfo: {
            forwardingScore: 9,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: newsletterName
            }
          }
        }, {
          quoted: m
        });
      }

      await replymenu(menuText.trim());

    } catch (err) {
      console.error("Erreur envoi menu enrichi:", err);
      await riza.sendMessage(m.chat, { text: menuText.trim() }, { quoted: m });
    }

    // Fonctions utilitaires
    function formatUptime(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return `${h}h ${m}m ${s}s`;
    }

    function stylizeFancy(str) {
      const normal = "abcdefghijklmnopqrstuvwxyz";
      const fancy = "ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ";
      return str.split("").map(l => {
        const index = normal.indexOf(l.toLowerCase());
        return index > -1 ? fancy[index] : l;
      }).join("");
    }

    function stylizeCategory(str) {
      const normal = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
      const boldFancy = {
        A: "𝗔", B: "𝗕", C: "𝗖", D: "𝗗", E: "𝗘", F: "𝗙", G: "𝗚", H: "𝗛", I: "𝗜", J: "𝗝",
        K: "𝗞", L: "𝗟", M: "𝗠", N: "𝗡", O: "𝗢", P: "𝗣", Q: "𝗤", R: "𝗥", S: "𝗦", T: "𝗧",
        U: "𝗨", V: "𝗩", W: "𝗪", X: "𝗫", Y: "𝗬", Z: "𝗭",
        a: "𝗮", b: "𝗯", c: "𝗰", d: "𝗱", e: "𝗲", f: "𝗳", g: "𝗴", h: "𝗵", i: "𝗶", j: "𝗷",
        k: "𝗸", l: "𝗹", m: "𝗺", n: "𝗻", o: "𝗼", p: "𝗽", q: "𝗾", r: "𝗿", s: "𝘀", t: "𝘁",
        u: "𝘂", v: "𝘃", w: "𝘄", x: "𝘅", y: "𝘆", z: "𝘇"
      };
      return str.split("").map(c => boldFancy[c] || c).join("");
    }
  }
};