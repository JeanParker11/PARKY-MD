const fs = require('fs');
const path = require('path');

const paramPath = path.join(__dirname, '..', 'data', 'parametres.json');

function saveParams(params) {
  fs.writeFileSync(paramPath, JSON.stringify(params, null, 2));
}

module.exports = {
  name: 'param',
  description: 'Afficher, activer ou désactiver les paramètres IA',
  category: 'Owner',
  onlyOwner: true,
  allowedForAll: false,

  async execute(parky, m, args) {
    // Obtenir la configuration du bot spécifique
    const botConfig = parky.botConfig || getBotConfigFromSocket(parky);
    const botJid = botConfig?.botJid || 'default';
    
    let params = botConfig?.ai || global.parametres || {};

    if (!args.length) {
      let list = '🔧 *Paramètres IA actuels* 🔧\n\n';
      for (const [key, value] of Object.entries(params)) {
        list += `• ${key} : ${value ? '✅ Activé' : '❌ Désactivé'}\n`;
      }
      return parky.sendMessage(m.chat, { text: list.trim() }, { quoted: m });
    }

    const paramName = args[0].toUpperCase();
    const action = args[1]?.toLowerCase();

    if (!(paramName in params)) {
      return parky.sendMessage(m.chat, { text: `❌ Le paramètre *${paramName}* n'existe pas.` }, { quoted: m });
    }

    const updates = { ai: { ...params } };
    
    if (action === 'on') {
      updates.ai[paramName] = true;
    } else if (action === 'off') {
      updates.ai[paramName] = false;
    } else {
      return parky.sendMessage(m.chat, { text: `❌ Syntaxe invalide. Utilise :\n.param ${paramName} on\n.param ${paramName} off` }, { quoted: m });
    }

    // Mettre à jour la configuration du bot
    if (botConfig) {
      const botManager = require('../lib/botManager');
      botManager.updateBotConfig(botJid, updates, m.sender);
    } else {
      // Fallback pour le bot principal
      global.parametres = updates.ai;
      saveParams(updates.ai);
    }

    return parky.sendMessage(m.chat, { text: `⚙️ Paramètre *${paramName}* ${action === 'on' ? 'activé' : 'désactivé'}.` }, { quoted: m });
  }
}