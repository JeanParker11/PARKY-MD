const fs = require("fs");
const path = require("path");
const userDataManager = require("../lib/userDataManager");
const botManager = require("../lib/botManager");


const waitingBattles = new Map();
const ongoingBattles = new Map();

// Chargement des données globales (partagées)
const loadQuiz = () => {
  const quizPath = path.join(__dirname, "../data/quizz.json");
  return JSON.parse(fs.readFileSync(quizPath));
};

function formatQuestion(q, joueur, numero, total) {
  const keys = Object.keys(q.options);
  const optionsText = keys.map((key, i) => `${i + 1}. ${q.options[key]}`).join("\n");
  return `*📜 Question ${numero}/${total} pour @${joueur.split("@")[0]} :*\n\n${q.question}\n\n${optionsText}\n\n_⏱️ Réponds avec le chiffre correspondant._`;
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = {
  name: "battle",
  description: "Duel de quiz entre deux joueurs",
  category: "JEUX",
  allowedForAll: true,
  async execute(riza, m) {
    // Obtenir la configuration du bot
    const botConfig = riza.botConfig || getBotConfigFromSocket(riza);
    const botId = botConfig?.botId || 'default';
    
    const from = m.chat;
    const sender = m.sender;

    if (!from.endsWith("@g.us")) {
      return riza.sendMessage(from, { text: "❌ Cette commande fonctionne uniquement dans les groupes." }, { quoted: m });
    }

    if (ongoingBattles.has(from)) {
      return riza.sendMessage(from, { text: "⚔️ Un duel est déjà en cours dans ce groupe." }, { quoted: m });
    }

    if (!waitingBattles.has(from)) {
      waitingBattles.set(from, sender);
      console.log(`[Battle] ${sender} attend un adversaire dans ${from}`);
      return riza.sendMessage(from, {
        text: `🕹️ *Attente d'un adversaire...*\n\n@${sender.split("@")[0]} veut faire un duel.\n\nTapez *!battle* pour l'affronter.`,
        mentions: [sender],
      });
    }

    const challenger = waitingBattles.get(from);
    const opponent = sender;

    if (challenger === opponent) {
      return riza.sendMessage(from, { text: "🤨 Tu es déjà en attente d’un adversaire." }, { quoted: m });
    }

    waitingBattles.delete(from);
    ongoingBattles.set(from, true);
    console.log(`[Battle] Duel lancé entre ${challenger} et ${opponent} dans ${from}`);

    const quizData = loadQuiz();
    if (quizData.length < 20) {
      ongoingBattles.delete(from);
      return riza.sendMessage(from, { text: "❌ Pas assez de questions (minimum 20)." }, { quoted: m });
    }

    const questions = [...quizData].sort(() => 0.5 - Math.random()).slice(0, 20);
    const players = [challenger, opponent];
    const scores = { [challenger]: 0, [opponent]: 0 };

    await riza.sendMessage(from, {
      text: `🎮 *Défi lancé !*\n\n@${challenger.split("@")[0]} défie @${opponent.split("@")[0]} pour un quiz manga en 20 questions !\n\nBonne chance aux deux ! 🍀`,
      mentions: [challenger, opponent],
    });

    for (let i = 0; i < questions.length; i++) {
      const joueur = players[i % 2];
      const question = questions[i];
      let answered = false;
      const keys = Object.keys(question.options);

      await riza.sendMessage(from, {
        text: formatQuestion(question, joueur, i + 1, 20),
        mentions: [joueur],
      });

      const onResponse = async (res) => {
        if (!res.messages) return;

        for (const msg of res.messages) {
          const user = msg.key.participant || msg.key.remoteJid;
          const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

          if (!body || user !== joueur || msg.key.remoteJid !== from) return;

          const userAnswer = parseInt(body.trim());
          if (!userAnswer || userAnswer < 1 || userAnswer > keys.length) return;

          const letter = keys[userAnswer - 1];
          const correct = letter === question.answer;
          answered = true;

          riza.ev.off("messages.upsert", onResponse);

          if (correct) {
            scores[joueur]++;
            await riza.sendMessage(from, {
              text: `✅ Bonne réponse @${joueur.split("@")[0]} !\n+1 point !`,
              mentions: [joueur],
            });
          } else {
            await riza.sendMessage(from, {
              text: `❌ Mauvaise réponse @${joueur.split("@")[0]}.`,
              mentions: [joueur],
            });
          }
        }
      };

      riza.ev.on("messages.upsert", onResponse);

      let waited = 0;
      while (!answered && waited < 15000) {
        await sleep(1000);
        waited += 1000;
      }

      if (!answered) {
        riza.ev.off("messages.upsert", onResponse);
        await riza.sendMessage(from, {
          text: `⌛ Temps écoulé @${joueur.split("@")[0]} !`,
          mentions: [joueur],
        });
      }

      await sleep(1000);
    }

    const scoresData = userDataManager.getBotBattles(botId);
    [challenger, opponent].forEach((jid) => {
      if (!scoresData[jid]) scoresData[jid] = { victories: 0 };
    });

    const scoreChallenger = scores[challenger];
    const scoreOpponent = scores[opponent];

    let winnerJid = null;
    if (scoreChallenger > scoreOpponent) {
      scoresData[challenger].victories++;
      userDataManager.updateBattleVictory(botId, challenger);
      winnerJid = challenger;
    } else if (scoreOpponent > scoreChallenger) {
      scoresData[opponent].victories++;
      userDataManager.updateBattleVictory(botId, opponent);
      winnerJid = opponent;
    }


    let result = `🏁 *Résultat du Duel*\n\n`;
    result += `@${challenger.split("@")[0]} : ${scoreChallenger} pts\n`;
    result += `@${opponent.split("@")[0]} : ${scoreOpponent} pts\n\n`;

    if (winnerJid) {
      result += `🥇 Victoire de @${winnerJid.split("@")[0]} !\n`;
      const gotReward = await sendReward(riza, winnerJid, from, botId);
      if (gotReward) {
        result += `🎉 @${winnerJid.split("@")[0]} a reçu une récompense en privé !`;
      }
    } else {
      result += `🤝 Match nul ! Belle égalité.`;
    }

    await riza.sendMessage(from, {
      text: result,
      mentions: [challenger, opponent],
    });

    ongoingBattles.delete(from);
    console.log(`[Battle] Duel terminé dans ${from}`);
  },
};

async function sendReward(riza, winnerJid, groupJid, botId) {
  const scoresData = userDataManager.getBotBattles(botId);
  const rewards = userDataManager.getBotRewards(botId);

  const victories = scoresData[winnerJid]?.victories || 0;

  if (victories > 0 && victories % 10 === 0) {
    if (rewards.length === 0) return false;

    // Prendre une récompense aléatoire
    const rewardIndex = Math.floor(Math.random() * rewards.length);
    const reward = rewards[rewardIndex];

    const rewardText =
`🎊 *FÉLICITATIONS, CHAMPION !* 🎊

🥳 Tu viens d’atteindre *${victories} victoires* en duel !

🎁 *Récompense Crunchyroll :*
╭───────────────
📧 Email : ${reward.email}
🔑 Mot de passe : ${reward.password}
╰───────────────

Amuse-toi bien sur *${reward.service}* !`;

    // Envoi privé de la récompense
    await riza.sendMessage(winnerJid, { text: rewardText });

    // Notification dans le groupe
    await riza.sendMessage(groupJid, {
      text: `🎉 @${winnerJid.split("@")[0]} a reçu une récompense privée pour ses ${victories} victoires !`,
      mentions: [winnerJid]
    });

    console.log(`[Battle] Récompense envoyée à ${winnerJid} pour ${victories} victoires.`);

    // Supprimer la récompense utilisée et sauvegarder
    userDataManager.removeBotReward(botId, rewardIndex);

    return true;
  }

  return false;
}
// Fonction pour obtenir la config du bot depuis le socket
function getBotConfigFromSocket(sock) {
  const botManager = require("../lib/botManager");
  if (sock.botConfig) return sock.botConfig;
  if (sock.botId) return botManager.getBotConfig(sock.botId);
  return null;
}