const { spawn } = require("child_process");

function loadingBar(step, total) {
  const filled = "■".repeat(step);
  const empty = "□".repeat(total - step);
  const percent = Math.floor((step / total) * 100);
  return `[${filled}${empty}] ${percent}%`;
}

module.exports = {
  name: "$shell",
  category: "Owner",
  onlyOwner: true,
  keywords: ["$"],
  desc: "Exécute une commande shell avec animation live",
  async execute(riza, m, args) {
    const sender = m.key.participant || m.key.remoteJid || "";
    const isOwner = Array.isArray(global.owner)
      ? global.owner.includes(sender) || global.owner.includes(sender.split("@")[0])
      : [sender, sender.split("@")[0]].includes(global.owner?.toString());

    if (!isOwner) {
      return riza.sendMessage(m.chat, { text: "⛔ Seul le propriétaire peut utiliser cette commande." }, { quoted: m });
    }

    const fullCommand = args.join(" ").trim();
    if (!fullCommand) {
      return riza.sendMessage(m.chat, { text: "❌ Tu dois entrer une commande shell après `$`." }, { quoted: m });
    }

    const parts = fullCommand.split(" ");
    const cmd = parts[0];
    const cmdArgs = parts.slice(1);

    const sentMsg = await riza.sendMessage(m.chat, {
      text: `💻 *Exécution de :*\n\`\`\`${fullCommand}\`\`\`\n\n⌛ Initialisation...`,
    }, { quoted: m });

    let output = "";
    let editing = false;
    let step = 0;
    const totalSteps = 10;
    const startTime = Date.now();

    const child = spawn(cmd, cmdArgs, { shell: true });

    const updateInterval = setInterval(async () => {
      if (editing) return;
      editing = true;
      step = (step + 1) % (totalSteps + 1);
      const durationSec = Math.floor((Date.now() - startTime) / 1000);
      const preview = output.slice(-3000) || "⌛ En attente de sortie...";

      const bar = loadingBar(step, totalSteps);
      const newText =
        `💻 *Exécution de :*\n\`\`\`${fullCommand}\`\`\`\n` +
        `⏱️ *Durée* : ${durationSec}s\n` +
        `📊 *Progression* : ${bar}\n\n` +
        `🧾 *Sortie en direct :*\n\`\`\`${preview}\`\`\``;

      try {
        await riza.sendMessage(m.chat, { edit: sentMsg.key, text: newText });
      } catch (e) {
        console.log("✖️ Échec édition message live :", e.message);
      }
      editing = false;
    }, 1500); // Mise à jour toutes les 1.5 secondes

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      output += data.toString();
    });

    child.on("close", async () => {
      clearInterval(updateInterval);
      const durationSec = Math.floor((Date.now() - startTime) / 1000);
      if (!output.trim()) output = "✅ Commande exécutée sans sortie.";

      const finalText =
        `💻 *PARKY CONSOLE* 💻\n\nCommande: *${fullCommand}*\n\n` +
        `⏱️ *Durée totale* : ${durationSec}s\n\n` +
        `📤 *Sortie finale :*\n\n\`\`\`${output.slice(-3500)}\`\`\``;

      await riza.sendMessage(m.chat, { edit: sentMsg.key, text: finalText });
    });
  }
};