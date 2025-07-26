const chalk = require('chalk');

/**
 * 👁️ Système de monitoring des messages pour tous les bots
 * Permet de voir les messages de tous les bots ou d'un bot spécifique
 */
class MessageMonitor {
  constructor() {
    this.enabled = true;
    this.selectedBot = 'all'; // 'all' ou botId spécifique
    this.messageTypes = {
      incoming: true,
      outgoing: true,
      reaction: true,
      newsletter: true
    };
    this.bots = new Map(); // Stockage des infos des bots
  }

  initialize() {
    console.log(chalk.cyan('👁️ Système de monitoring des messages initialisé'));
    console.log(chalk.gray('   Commandes disponibles:'));
    console.log(chalk.gray('   - monitor.setBot("botId") - Surveiller un bot spécifique'));
    console.log(chalk.gray('   - monitor.setBot("all") - Surveiller tous les bots'));
    console.log(chalk.gray('   - monitor.toggle() - Activer/désactiver le monitoring'));
    console.log(chalk.gray('   - monitor.listBots() - Lister les bots disponibles'));
    
    // Rendre accessible globalement pour la console
    global.monitor = this;
  }

  registerBot(botId, botName, ownerJid) {
    this.bots.set(botId, {
      name: botName,
      owner: ownerJid,
      messageCount: 0,
      lastActivity: new Date()
    });
    
    if (this.enabled) {
      console.log(chalk.green(`📱 Bot enregistré dans le monitoring: ${botName} (${botId})`));
    }
  }

  unregisterBot(botId) {
    const bot = this.bots.get(botId);
    if (bot) {
      this.bots.delete(botId);
      if (this.enabled) {
        console.log(chalk.red(`📱 Bot retiré du monitoring: ${bot.name} (${botId})`));
      }
    }
  }

  logMessage(botId, type, sender, content, chat = '', msgType = '') {
    if (!this.enabled) return;
    if (!this.messageTypes[type]) return;
    if (this.selectedBot !== 'all' && this.selectedBot !== botId) return;

    // Mettre à jour les stats du bot
    const bot = this.bots.get(botId);
    if (bot) {
      bot.messageCount++;
      bot.lastActivity = new Date();
    }

    const botInfo = bot ? `[${bot.name}]` : `[${botId}]`;
    const timestamp = new Date().toLocaleTimeString();

    switch (type) {
      case 'incoming':
        console.log(
          chalk.blue(`📥 ${timestamp} ${botInfo}`) +
          ` de ${chalk.yellow(sender)} dans ${chalk.cyan(chat)} (${chalk.magenta(msgType)}) : ${chalk.white(content)}`
        );
        break;
      
      case 'outgoing':
        console.log(
          chalk.green(`📤 ${timestamp} ${botInfo}`) +
          ` à ${chalk.cyan(chat)} (${chalk.magenta(msgType)}) : ${chalk.white(content)}`
        );
        break;
      
      case 'reaction':
        console.log(
          chalk.magenta(`💟 ${timestamp} ${botInfo}`) +
          ` ${chalk.white(content)} par ${chalk.yellow(sender)} dans ${chalk.cyan(chat)} (${msgType})`
        );
        break;
      
      case 'newsletter':
        console.log(
          chalk.magentaBright(`📰 ${timestamp} ${botInfo}`) +
          ` Message chaîne de ${chalk.yellow(sender)} : ${chalk.white(content)}`
        );
        break;
    }
  }

  // Méthodes de contrôle
  toggle() {
    this.enabled = !this.enabled;
    console.log(chalk.cyan(`👁️ Monitoring ${this.enabled ? 'activé' : 'désactivé'}`));
    return this.enabled;
  }

  setBot(botId) {
    if (botId === 'all') {
      this.selectedBot = 'all';
      console.log(chalk.cyan('👁️ Monitoring de tous les bots activé'));
    } else if (this.bots.has(botId)) {
      this.selectedBot = botId;
      const bot = this.bots.get(botId);
      console.log(chalk.cyan(`👁️ Monitoring du bot ${bot.name} (${botId}) activé`));
    } else {
      console.log(chalk.red(`❌ Bot ${botId} introuvable`));
      this.listBots();
    }
  }

  setMessageTypes(types) {
    this.messageTypes = { ...this.messageTypes, ...types };
    console.log(chalk.cyan('👁️ Types de messages mis à jour:'), this.messageTypes);
  }

  listBots() {
    if (this.bots.size === 0) {
      console.log(chalk.yellow('📱 Aucun bot enregistré'));
      return;
    }

    console.log(chalk.cyan('📱 Bots disponibles:'));
    for (const [botId, bot] of this.bots.entries()) {
      const isSelected = this.selectedBot === botId ? chalk.green('●') : chalk.gray('○');
      const lastActivity = bot.lastActivity.toLocaleTimeString();
      console.log(`   ${isSelected} ${chalk.white(bot.name)} (${chalk.gray(botId)}) - ${bot.messageCount} messages - ${lastActivity}`);
    }
    console.log(`   ${this.selectedBot === 'all' ? chalk.green('●') : chalk.gray('○')} ${chalk.white('Tous les bots')}`);
  }

  getStats() {
    const stats = {
      totalBots: this.bots.size,
      totalMessages: 0,
      selectedBot: this.selectedBot,
      enabled: this.enabled
    };

    for (const bot of this.bots.values()) {
      stats.totalMessages += bot.messageCount;
    }

    return stats;
  }
}

const messageMonitor = new MessageMonitor();
module.exports = messageMonitor;