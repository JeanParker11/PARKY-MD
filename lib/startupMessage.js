const fs = require('fs');

function getStartupMessage() {
  const commandsDir = './commands';
  const pluginCount = fs.existsSync(commandsDir)
    ? fs.readdirSync(commandsDir).filter(f => f.endsWith('.js')).length
    : 0;

  // Utiliser la configuration du bot spécifique si disponible
  const botConfig = arguments[0]; // Passer la config en paramètre
  const aiConfig = botConfig?.ai || global.parametres || {};
  
  const parametres = Object.keys(aiConfig).length > 0
    ? Object.entries(aiConfig)
        .map(([name, active]) => `• ${name} : ${active ? "✅" : "❌"}`)
        .join('\n')
    : "⚠️ Aucune fonctionnalité IA active.";

  return `
┏━━━━━━━━━━━━━━━━━⊷
┃ 𖦹 ${botConfig?.botname || global.botname || "Bot"}
┣━━━━━━━━━━━━━━━━━⊷
┃ 𖦹 *Créateur* : ${botConfig?.creatorName || global.ownername || "Inconnu"}
┃ 𖦹 *Prefix* : [ ${botConfig?.prefix || global.prefix || "."} ]
┃ 𖦹 *Plugins* : ${pluginCount}
┃ 𖦹 *Version* : ${botConfig?.version || global.botversion || "1.0.0"}
┗━━━━━━━━━━━━━━━━━⊷

🔧 *Paramètres IA* 🔧

${parametres}
`.trim();
}

module.exports = getStartupMessage;