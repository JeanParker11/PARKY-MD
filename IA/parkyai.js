const fs = require('fs');
const path = require('path');
const { writeExif } = require('../lib/exif');
const geminiAI = require('../lib/geminiAI');
const { generateImageFromPrompt } = require('../lib/imageGenerator');

function containsEmoji(text) {
  return /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(text);
}

async function PARKYAI(riza, m, messageType) {
  const dataDir = path.join(__dirname, "../data");
  const historyPath = path.join(dataDir, "parky-history.json");
  const stickersDir = path.join(__dirname, "../assets/stickers");

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, JSON.stringify({}));

  const isGroup = m.chat.endsWith("@g.us");
  const isNewsletter = m.chat.endsWith("@newsletter");
  const isGroupLike = isGroup || isNewsletter;

  const sender = isGroupLike
    ? m.key.participant || m.participant || m.key.remoteJid
    : m.chat;

  if (!sender || typeof sender !== 'string' || m.key.fromMe || sender.includes("broadcast")) return;

  const senderBase = sender.split("@")[0];
  const senderLid = `${senderBase}@lid`;
  const senderSw = `${senderBase}@s.whatsapp.net`;
  const senderName = m.pushName || senderBase;

  const fromJid = m.chat;
  if (!fromJid.endsWith('@s.whatsapp.net') && !fromJid.endsWith('@g.us') && !fromJid.endsWith('@newsletter')) return;

  const botLidRaw = riza.user?.lid || "";
  if (!botLidRaw) return;
  const botLidSimple = botLidRaw.split("@")[0].split(":")[0] + "@lid";

  // Extraction du texte selon le type de message
  let text = '';
  try {
    switch (messageType) {
      case 'conversation':
        text = m.message?.conversation || '';
        break;
      case 'extendedTextMessage':
        text = m.message?.extendedTextMessage?.text || '';
        break;
      case 'imageMessage':
      case 'videoMessage':
      case 'documentMessage':
        text = m.message?.[messageType]?.caption || '';
        break;
      case 'buttonsResponseMessage':
        text = m.message?.buttonsResponseMessage?.selectedButtonId || '';
        break;
      case 'listResponseMessage':
        text = m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';
        break;
      case 'templateButtonReplyMessage':
        text = m.message?.templateButtonReplyMessage?.selectedId || '';
        break;
    }
  } catch {
    text = '';
  }

  if (!text || typeof text !== "string" || text.trim().length < 2) return;

  // Anti-usurpation
  const impostorPatterns = [
    /je suis (le )?(vrai )?(jean parker|créateur|développeur|patron|boss|parky)/i,
    /c'?est moi (le )?(vrai )?(jean|créateur|boss|patron)/i,
    /je représente (parky|jean parker)/i,
    /je parle au nom de (parky|jean parker)/i,
    /je suis parky/i,
    /je suis park?y l'?assistant/i,
    /je suis le créateur/i,
    /je t'ai créé/i
  ];

  const lowerText = text.toLowerCase();
  const isImpostor = impostorPatterns.some(re => re.test(lowerText));

  if (isImpostor) {
    const warningMsg = `⚠️ Désolé ${senderName}, seul Jean Parker est mon créateur légitime. Merci de ne pas usurper son identité 🙏.`;
    await riza.sendMessage(m.chat, { text: warningMsg }, { quoted: m });
    return;
  }

  const prefix = global.prefix || '+';
  if (text.trim().startsWith(prefix)) return;

  const isOwner = Array.isArray(global.owner)
    ? global.owner.includes(senderLid) || global.owner.includes(senderSw) || global.owner.includes(senderBase)
    : [senderLid, senderSw, senderBase].includes(global.owner?.toString());

  const contextInfo = m.message?.extendedTextMessage?.contextInfo || {};
  const mentionedJids = Array.isArray(contextInfo?.mentionedJid) ? contextInfo.mentionedJid : [];
  const mentionJidsSimple = mentionedJids
    .filter(jid => typeof jid === 'string' && jid.includes('@'))
    .map(jid => jid.split("@")[0] + "@lid");

  const isMentioned = mentionJidsSimple.includes(botLidSimple);
  const quotedSender = typeof contextInfo?.participant === 'string' ? contextInfo.participant : "";
  const isReplyToBot = quotedSender === botLidRaw;

  const botNames = ["parky", "parky-md"];
  const nameDetected = botNames.some(name => lowerText.includes(name));

  const shouldRespond = !isGroupLike || isMentioned || isReplyToBot || nameDetected;
  if (!shouldRespond) return;

  let history = {};
  try {
    history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
  } catch (e) {
    console.error("Erreur lecture historique:", e.message);
  }

  const chatId = isGroupLike ? `${m.chat}_${senderBase}` : senderSw;
  if (!history[chatId]) history[chatId] = [];

  const lastMsg = history[chatId].slice(-1)[0];
  if (lastMsg && lastMsg.role === "user" && lastMsg.sender === sender && lastMsg.content === text) return;

  history[chatId].push({ role: "user", sender, senderName, content: text });
  if (history[chatId].length > 30) {
    history[chatId] = history[chatId].slice(-30);
  }

  const contextPrompt = history[chatId]
    .map(msg => msg.role === "user" ? `${msg.senderName || msg.sender}: ${msg.content}` : `Parky: ${msg.content}`)
    .join("\n");

  // 🎨 Génération d’image avec API Flux
  const demandeImageRegex = /(dessine|imagine|crée|génère|montre|fais).{0,20}(image|photo|illustration|dessin|scène)/i;
  const isImageRequest = demandeImageRegex.test(text);

  if (isImageRequest) {
    try {
      const promptImg = text.replace(demandeImageRegex, '').trim();

      if (!promptImg || promptImg.length < 4) {
        return await riza.sendMessage(m.chat, {
          text: `❌ *Prompt d'image trop court ou vide.*\nExemple : "Dessine un robot dans une ville futuriste."`,
          quoted: m
        });
      }

      await riza.sendMessage(
        m.chat,
        { text: `D'accord ${senderName}, un instant je génère l'image...` },
        {
          quoted: {
            key: {
              remoteJid: m.key.remoteJid,
              fromMe: m.key.fromMe,
              id: m.key.id,
              participant: m.key.participant || m.participant
            },
            message: m.message.ephemeralMessage?.message || m.message
          }
        }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      const imageBuffer = await generateImageFromPrompt(promptImg);

      await riza.sendMessage(
        m.chat,
        {
          image: imageBuffer,
          mimetype: "image/jpeg"
        },
        {
          quoted: {
            key: {
              remoteJid: m.key.remoteJid,
              fromMe: m.key.fromMe,
              id: m.key.id,
              participant: m.key.participant || m.participant
            },
            message: m.message.ephemeralMessage?.message || m.message
          }
        }
      );
    } catch (err) {
      console.error("❌ Erreur image IA:", err.message);
      await riza.sendMessage(m.chat, {
        text: "❌ *Impossible de générer l’image.*\nEssaie une autre description.",
        quoted: m
      });
    }
    return;
  }

  // 🤖 Réponse texte IA
  const prompt = `${isOwner
    ? `Tu es Parky, assistant personnel fidèle, conçu par Jean Parker (ton créateur).`
    : `Tu es Parky, assistant IA bienveillant et utile, créé par Jean Parker.`}
Tu échanges ${isGroupLike ? "dans un groupe WhatsApp" : "en privé"}.
Sois naturel, poli, et amical.
Voici la discussion :
${contextPrompt}
Réponds:`;

  try {
    let reply = await geminiAI.generateParkyResponse(null, prompt.slice(-1500));

    reply = reply
      .replace(/(Gemini|Bard|Google\s*AI|IA de Google|modèle de langage)/gi, "Parky")
      .replace(/je suis (une )?(IA|intelligence artificielle|modèle)/gi, "je suis Parky, l’assistant personnel de Jean Parker")
      .replace(/(créé|développé) (par|par les équipes de)?\s?Google/gi, "créé par Jean Parker");

    history[chatId].push({ role: "bot", content: reply });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    await riza.sendMessage(m.chat, { text: reply }, { quoted: m });

    const stickerFiles = fs.existsSync(stickersDir)
      ? fs.readdirSync(stickersDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      : [];

    if (stickerFiles.length > 0) {
      const randomFile = stickerFiles[Math.floor(Math.random() * stickerFiles.length)];
      const stickerPath = path.join(stickersDir, randomFile);
      const stickerData = fs.readFileSync(stickerPath);

      const webpSticker = await writeExif(
        { mimetype: 'image/' + path.extname(randomFile).slice(1), data: stickerData },
        {
          packname: global.stickerPackName || "PARKY-MD",
          author: global.stickerAuthor || "Jean Parker 🐼",
          categories: ["🤖"]
        }
      );

      await riza.sendMessage(m.chat, { sticker: webpSticker });
    }
  } catch (err) {
    console.error("❌ Erreur ParkyAI:", err.message);
    await riza.sendMessage(m.chat, {
      text: `Erreur avec Gemini AI (${geminiAI.model})\nRéessaie plus tard !\n\n*Erreur:* ${err.message}`
    }, { quoted: m });
  }
}

module.exports = { PARKYAI };