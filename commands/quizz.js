const fs = require("fs");
const path = require("path");

const quizPath = path.join(__dirname, "../data/quizz.json");
const usersPath = path.join(__dirname, "../data/users.json");
const configPath = path.join(__dirname, "../data/quizConfig.json");

let ongoingQuizzes = new Map();
let quizCooldown = new Map();

function loadQuiz() {
  return JSON.parse(fs.readFileSync(quizPath));
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

function loadUsers() {
  if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, "{}");
  return JSON.parse(fs.readFileSync(usersPath));
}

function loadConfig() {
  if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify({ quizTime: 10 }, null, 2));
  return JSON.parse(fs.readFileSync(configPath));
}

function formatQuestion(q, timeLeft) {
  const keys = Object.keys(q.options);
  const optionsText = keys.map((key, i) => `${i + 1}. ${q.options[key]}`).join("\n");

  return `*🎯 Question :* ${q.question}\n\n${optionsText}\n\n_🕒 Temps restant : ${timeLeft}s pour répondre avec le bon chiffre._`;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: "quizz",
  description: "Lance un quiz manga",
  category: "JEUX",
  allowedForAll: false,
  onlyOwner: false,
  onlySudo: false,
  onlyAdmin: true,

  async execute(riza, m) {
    const from = m.chat;
    const sender = m.sender;

    if (!from.endsWith("@g.us")) {
      return riza.sendMessage(from, { text: "❌ Cette commande ne peut être utilisée que dans un groupe." }, { quoted: m });
    }

    const COOLDOWN = 15000;
    const now = Date.now();

    if (quizCooldown.has(from) && now - quizCooldown.get(from) < COOLDOWN) {
      return riza.sendMessage(from, { text: "⏳ Patiente un peu avant de relancer un quiz." }, { quoted: m });
    }
    quizCooldown.set(from, now);

    if (ongoingQuizzes.has(from)) {
      return riza.sendMessage(from, { text: "⏳ Un quiz est déjà en cours dans ce groupe." }, { quoted: m });
    }

    const quizData = loadQuiz();
    const users = loadUsers();
    const config = loadConfig();
    let timeLeft = config.quizTime || 10;

    if (!quizData || quizData.length === 0) {
      return riza.sendMessage(from, { text: "❌ Aucune question disponible." }, { quoted: m });
    }

    const questionIndex = Math.floor(Math.random() * quizData.length);
    const currentQuestion = quizData[questionIndex];

    const sentMsg = await riza.sendMessage(from, { text: formatQuestion(currentQuestion, timeLeft) }, { quoted: m });

    let intervalId, timeoutId;

    function endQuiz(reasonText) {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      ongoingQuizzes.delete(from);
      riza.ev.off("messages.upsert", onResponse);
      if (reasonText) riza.sendMessage(from, { text: reasonText });
    }

    intervalId = setInterval(async () => {
      timeLeft--;
      if (timeLeft > 0 && (timeLeft === 10 || timeLeft === 5)) {
        try {
          await riza.sendMessage(from, {
            text: formatQuestion(currentQuestion, timeLeft),
            edit: sentMsg.key,
          });
        } catch {}
      }
    }, 1000);

    timeoutId = setTimeout(() => {
      const correctAnswerText = currentQuestion.options[currentQuestion.answer];
      endQuiz(`⌛ Temps écoulé ! \n\nLa bonne réponse était : *${correctAnswerText}*.`);
    }, timeLeft * 1000);

    ongoingQuizzes.set(from, {
      question: currentQuestion,
      intervalId,
      timeoutId,
      respondedUsers: new Set()
    });

    const onResponse = async (response) => {
      if (!response.messages) return;

      for (const message of response.messages) {
        if (!message.message || message.key.remoteJid !== from) continue;

        const body =
          message.message.conversation ||
          message.message.extendedTextMessage?.text ||
          message.message.imageMessage?.caption ||
          message.message.videoMessage?.caption;

        if (!body) continue;

        const quizInfo = ongoingQuizzes.get(from);
        if (!quizInfo) return;

        const { question, respondedUsers } = quizInfo;
        const keys = Object.keys(question.options);
        const userChoice = parseInt(body.trim());
        const userId = message.key.participant || message.key.remoteJid;

        if (respondedUsers.has(userId)) {
          // ⚠️ Déjà répondu
          await riza.sendMessage(from, {
            text: `⚠️ @${userId.split("@")[0]}, On ne répond pas deux fois à une question !`,
            mentions: [userId]
          }, { quoted: message });
          continue;
        }

        if (userChoice >= 1 && userChoice <= keys.length) {
          respondedUsers.add(userId); // Bloque les prochaines réponses

          const chosenLetter = keys[userChoice - 1];

          if (chosenLetter === question.answer) {
            // ✅ Bonne réponse
            await riza.sendMessage(from, {
              react: { text: "✅", key: message.key },
            });

            clearInterval(intervalId);
            clearTimeout(timeoutId);
            riza.ev.off("messages.upsert", onResponse);
            ongoingQuizzes.delete(from);

            if (!users[userId]) users[userId] = { score: 0 };
            users[userId].score += 1;
            saveUsers(users);

            await sleep(1500);
            await riza.sendMessage(from, {
              text: `✅ Bonne réponse !\n\n+1 point pour @${userId.split("@")[0]}.`,
              mentions: [userId],
            });
          } else {
            // ❌ Mauvaise réponse
            await riza.sendMessage(from, {
              react: { text: "❌", key: message.key },
            });
          }
        }
      }
    };

    riza.ev.on("messages.upsert", onResponse);
  }
};