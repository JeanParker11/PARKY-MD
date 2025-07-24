const fs = require("fs");
const path = require("path");

// Paths
const quizPath = path.join(__dirname, "../data/quizz.json");
const quizImgPath = path.join(__dirname, "../data/quizz_image.json");
const usersPath = path.join(__dirname, "../data/users.json");
const historyPath = path.join(__dirname, "../data/quiz_history.json");

// Maps en mémoire
const quizSetupMap = new Map();
const ongoingQuizzes = new Map();
const quizCooldown = new Map();

// Utils
function loadJson(path, fallback = {}) {
  if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify(fallback, null, 2));
  return JSON.parse(fs.readFileSync(path));
}
function saveJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Configuration Steps
const stepTexts = [
  {
    title: "🌀 *ÉTAPE 1/6* ▰▱▱▱▱▱\n*Genre du Quiz* :",
    options: [
      { emoji: "1️⃣", label: "`Image` 🌌", value: "image" },
      { emoji: "2️⃣", label: "`Texte` 📚", value: "texte" },
      { emoji: "3️⃣", label: "`Mixte` 💥", value: "mixte" },
    ]
  },
  {
    title: "🌀 *ÉTAPE 2/6* ▰▰▱▱▱▱\n*Nombre de Questions* :",
    options: [
      { emoji: "1️⃣", label: "5 Questions", value: 5 },
      { emoji: "2️⃣", label: "10 Questions", value: 10 },
      { emoji: "3️⃣", label: "Personnalisé 🔢", value: "custom" },
    ]
  },
  {
    title: "🌀 *ÉTAPE 3/6* ▰▰▰▱▱▱\n*Temps de réponse par question* :",
    options: [
      { emoji: "1️⃣", label: "10s ⏱️", value: 10 },
      { emoji: "2️⃣", label: "20s ⏳", value: 20 },
      { emoji: "3️⃣", label: "Personnalisé 🔢", value: "custom" },
    ]
  },
  {
    title: "🌀 *ÉTAPE 4/6* ▰▰▰▰▱▱\n*Modération* :",
    options: [
      { emoji: "1️⃣", label: "Bot auto-modo 🤖", value: "bot" },
      { emoji: "2️⃣", label: "Admin modo 👑", value: "admin" },
      { emoji: "3️⃣", label: "Sudo modo 🛡️", value: "sudo" },
    ]
  },
  {
    title: "🌀 *ÉTAPE 5/6* ▰▰▰▰▰▱\n*Affichage des scores* :",
    options: [
      { emoji: "1️⃣", label: "Après chaque question 📈", value: "after_each" },
      { emoji: "2️⃣", label: "Seulement à la fin 🏁", value: "final" },
      { emoji: "3️⃣", label: "Stats avancées 📊", value: "advanced" },
    ]
  },
  {
    title: "🌀 *ÉTAPE 6/6* ▰▰▰▰▰▰\n*Prêt à lancer le Quiz ?*",
    options: [
      { emoji: "✅", label: "Lancer le Quiz !", value: "start" },
      { emoji: "❌", label: "Annuler", value: "cancel" },
    ]
  }
];

// Format Steps
function formatStep(stepIdx, customPrompt = "") {
  const step = stepTexts[stepIdx];
  let optionsText = step.options.map((opt, i) => `${opt.emoji} ┃ ${opt.label}`).join("\n");
  return `${step.title}\n${optionsText}${customPrompt ? "\n\n" + customPrompt : ""}\n\nRéponds avec le chiffre ou symbole correspondant.`;
}

// Format Questions
function formatQuestion(q, timeLeft, idx, total) {
  const keys = Object.keys(q.options);
  const optionsText = keys.map((key, i) => `${i+1}. ${q.options[key]}`).join("\n");
  let header = `*Question ${idx+1}/${total}*`;
  return `${header}\n*${q.question}*\n\n${optionsText}\n\n_🕒 ${timeLeft}s_`;
}
function formatImageQuestion(q, timeLeft, idx, total) {
  const keys = Object.keys(q.options);
  const optionsText = keys.map((key, i) => `${i+1}. ${q.options[key]}`).join("\n");
  let header = `*Image Quiz ${idx+1}/${total}*`;
  return `${header}\n*${q.question}*\n\n${optionsText}\n\n_🕒 ${timeLeft}s_`;
}

// MAIN COMMAND MODULE
module.exports = {
  name: "quizz",
  description: "Quiz ultra avancé : config, lancement auto, score, stats",
  category: "JEUX",
  onlyAdmin: true,
  async execute(riza, m) {
    const from = m.chat;
    const sender = m.sender;
    if (!from.endsWith("@g.us")) return riza.sendMessage(from, { text: "❌ Groupe seulement." }, { quoted: m });

    // Anti spam cooldown
    const COOLDOWN = 10000;
    const now = Date.now();
    if (quizCooldown.has(from) && now - quizCooldown.get(from) < COOLDOWN) {
      return riza.sendMessage(from, { text: "⏳ Patiente avant de relancer." }, { quoted: m });
    }
    quizCooldown.set(from, now);

    // Configuration interactive
    quizSetupMap.set(from, { step: 0, config: {} });
    await riza.sendMessage(from, { text: formatStep(0) }, { quoted: m });

    // SETUP INTERACTION
    const onSetupResponse = async (response) => {
      for (const message of response.messages || []) {
        if (message.key.remoteJid !== from) continue;
        const body = message.message.conversation || message.message.extendedTextMessage?.text;
        let setup = quizSetupMap.get(from); if (!setup) return;
        let step = setup.step, opt = stepTexts[step].options, idx = parseInt(body)-1;
        if (opt[idx] && opt[idx].value === "custom") {
          await riza.sendMessage(from, { text: "📝 Entre une valeur personnalisée :" }, { quoted: message });
          setup.expectCustom = true; quizSetupMap.set(from, setup); return;
        }
        if (setup.expectCustom) {
          setup.config[step] = body.trim();
          setup.expectCustom = false; step++;
        } else if (opt[idx]) {
          setup.config[step] = opt[idx].value; step++;
        } else {
          await riza.sendMessage(from, { text: "❌ Réponse non valide." }, { quoted: message }); return;
        }
        if (step < stepTexts.length) {
          setup.step = step; quizSetupMap.set(from, setup);
          await riza.sendMessage(from, { text: formatStep(step) }, { quoted: message });
        } else {
          quizSetupMap.delete(from);
          await sleep(1000);
          await launchQuiz(riza, m, from, setup.config, sender);
          riza.ev.off("messages.upsert", onSetupResponse);
        }
      }
    };
    riza.ev.on("messages.upsert", onSetupResponse);
  }
};

// LANCEMENT DU QUIZ ULTRA AVANCÉ
async function launchQuiz(riza, m, from, config, adminId) {
  // Sélection questions selon config
  let quizData = [], total = 0;
  if (config[0] === "image") quizData = loadJson(quizImgPath, []);
  else if (config[0] === "texte") quizData = loadJson(quizPath, []);
  else if (config[0] === "mixte") quizData = [...loadJson(quizPath, []), ...loadJson(quizImgPath, [])];
  total = Number(config[1]) || 5;
  quizData = quizData.sort(() => 0.5-Math.random()).slice(0, total);

  let timePerQ = Number(config[2]) || 10;
  let scoreMap = {};
  let stats = { bonus: {}, penalties: {}, fastest: {}, slowest: {} };

  // Historique (pour stats, anti-cheat, etc.)
  let quizHistory = loadJson(historyPath, {});

  // MODERATION
  let moderatorMode = config[3] || "bot";
  let scoreDisplayMode = config[4] || "final";

  for (let i = 0; i < quizData.length; i++) {
    let q = quizData[i], timeLeft = timePerQ;
    let sentMsg;
    if (q.imageUrl) {
      sentMsg = await riza.sendMessage(from, {
        image: { url: q.imageUrl },
        caption: formatImageQuestion(q, timeLeft, i, total)
      }, { quoted: m });
    } else {
      sentMsg = await riza.sendMessage(from, {
        text: formatQuestion(q, timeLeft, i, total)
      }, { quoted: m });
    }

    let answered = false, winnerId = null, responseTime = null, respondedUsers = new Set(), startTime = Date.now();

    // Réponses
    const onQuizResponse = async (response) => {
      for (const msg of response.messages || []) {
        if (msg.key.remoteJid !== from) continue;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const userId = msg.key.participant || msg.key.remoteJid;
        if (respondedUsers.has(userId)) {
          await riza.sendMessage(from, { text: `⚠️ @${userId.split("@")[0]} tu as déjà répondu !`, mentions: [userId] }, { quoted: msg });
          continue;
        }
        const userChoice = parseInt(body.trim());
        const keys = Object.keys(q.options);
        const chosen = keys[userChoice-1];
        if (userChoice >= 1 && userChoice <= keys.length) respondedUsers.add(userId);
        if (chosen === q.answer && !answered) {
          winnerId = userId;
          answered = true;
          responseTime = Math.round((Date.now() - startTime)/1000);
          scoreMap[winnerId] = (scoreMap[winnerId]||0)+1;
          if (!stats.fastest[winnerId] || responseTime < stats.fastest[winnerId]) stats.fastest[winnerId] = responseTime;
          if (!stats.slowest[winnerId] || responseTime > stats.slowest[winnerId]) stats.slowest[winnerId] = responseTime;
          // Bonus
          if (responseTime <= 3) {
            scoreMap[winnerId] += 1;
            stats.bonus[winnerId] = (stats.bonus[winnerId]||0)+1;
            await riza.sendMessage(from, { text: `⚡️ +1 bonus rapidité @${winnerId.split("@")[0]} !`, mentions: [winnerId] }, { quoted: msg });
          }
          await riza.sendMessage(from, { text: `✅ Bonne réponse @${winnerId.split("@")[0]} !`, mentions: [winnerId] }, { quoted: msg });
        } else if (!answered && userChoice >= 1 && userChoice <= keys.length) {
          // Mauvaise réponse
          scoreMap[userId] = (scoreMap[userId]||0)-1;
          stats.penalties[userId] = (stats.penalties[userId]||0)+1;
          await riza.sendMessage(from, { text: `❌ Mauvaise réponse @${userId.split("@")[0]}`, mentions: [userId] }, { quoted: msg });
        }
      }
    };
    riza.ev.on("messages.upsert", onQuizResponse);

    for (let t = timeLeft; t > 0 && !answered; t--) {
      await sleep(1000);
      timeLeft--;
      if (timeLeft === 5 || timeLeft === 3 || timeLeft === 1) {
        // Edition du message pour afficher le temps restant
        if (q.imageUrl) {
          await riza.sendMessage(from, {
            image: { url: q.imageUrl },
            caption: formatImageQuestion(q, timeLeft, i, total),
            edit: sentMsg.key
          });
        } else {
          await riza.sendMessage(from, {
            text: formatQuestion(q, timeLeft, i, total),
            edit: sentMsg.key
          });
        }
      }
    }
    riza.ev.off("messages.upsert", onQuizResponse);
    if (!answered) {
      await riza.sendMessage(from, { text: `⏰ Temps écoulé ! La bonne réponse était : *${q.options[q.answer]}*.` });
    }
    if (scoreDisplayMode === "after_each") {
      await displayScores(riza, from, scoreMap, false);
    }
    await sleep(1000);
  }

  // Historique
  quizHistory[from] = quizHistory[from] || [];
  quizHistory[from].push({ date: new Date().toISOString(), scores: scoreMap, stats });
  saveJson(historyPath, quizHistory);

  // Score final & stats
  await displayScores(riza, from, scoreMap, true, stats);
}

// Affichage des scores et stats
async function displayScores(riza, from, scoreMap, isFinal, stats = {}) {
  let classement = Object.entries(scoreMap)
    .sort((a,b) => b[1]-a[1])
    .map(([uid, sc], i) => `${i===0?"🥇":"•"} @${uid.split("@")[0]} : ${sc} pts`)
    .join("\n");
  let text = isFinal ?
    `🏁 *Quiz terminé !*\n\n*Classement :*\n${classement}` :
    `📊 *Scores provisoires :*\n${classement}`;
  if (isFinal && stats && Object.keys(stats).length) {
    let bonus = Object.entries(stats.bonus||{}).map(([u,n])=>`⚡️ @${u.split("@")[0]} : ${n} bonus`).join("\n");
    let penalties = Object.entries(stats.penalties||{}).map(([u,n])=>`🚫 @${u.split("@")[0]} : ${n} pénalités`).join("\n");
    let fastest = Object.entries(stats.fastest||{}).map(([u,v])=>`⚡️ @${u.split("@")[0]} : ${v}s`).join("\n");
    let slowest = Object.entries(stats.slowest||{}).map(([u,v])=>`🐢 @${u.split("@")[0]} : ${v}s`).join("\n");
    text += `\n\n*Bonus rapidité :*\n${bonus || "Aucun"}\n\n*Pénalités :*\n${penalties || "Aucune"}\n\n*Réponse la plus rapide :*\n${fastest || "Aucune"}\n\n*La plus lente :*\n${slowest || "Aucune"}`;
  }
  await riza.sendMessage(from, { text, mentions: Object.keys(scoreMap) });
}