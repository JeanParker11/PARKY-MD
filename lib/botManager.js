const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class BotManager extends EventEmitter {
  constructor() {
    super();
    this.bots = new Map(); // Map des bots connectés
    this.configs = new Map(); // Map des configurations par bot
    this.configsPath = path.join(__dirname, '../data/bot-configs.json');
    this.loadConfigs();
  }

  // Charger les configurations sauvegardées
  loadConfigs() {
    try {
      if (fs.existsSync(this.configsPath)) {
        const data = JSON.parse(fs.readFileSync(this.configsPath, 'utf-8'));
        for (const [botId, config] of Object.entries(data)) {
          this.configs.set(botId, config);
        }
        console.log(`📊 ${this.configs.size} configuration(s) de bot chargée(s)`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement configurations bots:', error.message);
    }
  }

  // Sauvegarder les configurations
  saveConfigs() {
    try {
      const data = Object.fromEntries(this.configs);
      fs.writeFileSync(this.configsPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Erreur sauvegarde configurations bots:', error.message);
    }
  }

  // Enregistrer un nouveau bot
  registerBot(botJid, sock, ownerWhatsappJid) {
    console.log(`📝 Enregistrement botJid: ${botJid} pour ${ownerWhatsappJid}`);
    
    const defaultConfig = this.createDefaultConfig(botJid, ownerWhatsappJid);
    
    this.bots.set(botJid, {
      sock,
      ownerWhatsappJid,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });

    if (!this.configs.has(botJid)) {
      this.configs.set(botJid, defaultConfig);
      this.saveConfigs();
      console.log(`💾 Configuration créée pour botJid ${botJid}`);
    } else {
      // Mettre à jour l'owner si différent
      const existingConfig = this.configs.get(botJid);
      if (existingConfig.ownerWhatsappJid !== ownerWhatsappJid) {
        existingConfig.ownerWhatsappJid = ownerWhatsappJid;
        existingConfig.permissions.owner = [ownerWhatsappJid];
        this.configs.set(botJid, existingConfig);
        this.saveConfigs();
        console.log(`🔄 Propriétaire mis à jour pour botJid ${botJid}: ${ownerWhatsappJid}`);
      }
    }

    console.log(`🤖 BotJid ${botJid} enregistré pour ${ownerWhatsappJid}`);
    this.emit('botRegistered', { botJid, ownerWhatsappJid });
    
    return this.configs.get(botJid);
  }

  // Créer une configuration par défaut
  createDefaultConfig(botJid, ownerWhatsappJid) {
    return {
      botJid,
      ownerWhatsappJid,
      telegramUserId: null, // Sera défini lors de la connexion via Telegram
      botname: `PARKY-BOT-${botJid.slice(-4)}`,
      parkyName: "PARKY",
      creatorName: global.ownername || "Jean Parker",
      prefix: "!",
      version: "1.0.0",
      stickerPackName: "PARKY-MD",
      stickerAuthor: ownerWhatsappJid.split('@')[0],
      
      // Paramètres IA individuels
      ai: {
        PARKYAI: true,
        TRANSLATOR: false,
        SUGGESTIONS: true,
        MAINTENANCE: false
      },
      
      // Permissions spéciales
      permissions: {
        owner: [ownerWhatsappJid],
        sudo: [],
        dev: global.dev || [] // Global dev a tous les droits
      },
      
      // Configuration des commandes
      commands: {
        enabled: true,
        categories: {
          GENERAL: true,
          JEUX: true,
          OWNER: true,
          UNIROLIST: false
        }
      },
      
      // Limites et restrictions
      limits: {
        quizTime: 15,
        maxQuestionsPerSubmission: 10,
        cooldownTime: 5000
      },
      
      // Personnalisation
      theme: {
        menuImageUrl: global.menuImageUrl,
        primaryColor: "#6366f1",
        successColor: "#10b981"
      },
      
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }

  // Obtenir la configuration d'un bot
  getBotConfig(botJid) {
    return this.configs.get(botJid) || null;
  }

  // Mettre à jour la configuration d'un bot
  updateBotConfig(botJid, updates, updatedBy = null) {
    const config = this.configs.get(botJid);
    if (!config) return false;

    // Merge des updates
    const updatedConfig = this.deepMerge(config, updates);
    updatedConfig.lastModified = new Date().toISOString();
    if (updatedBy) updatedConfig.lastModifiedBy = updatedBy;

    this.configs.set(botJid, updatedConfig);
    this.saveConfigs();

    // Notifier le changement
    this.emit('configUpdated', { botJid, config: updatedConfig, updatedBy });
    
    console.log(`⚙️ Configuration botJid ${botJid} mise à jour par ${updatedBy || 'système'}`);
    return true;
  }

  // Vérifier les permissions
  checkPermission(botJid, userWhatsappJid, level = 'user') {
    const config = this.configs.get(botJid);
    if (!config) return false;

    const userBase = userWhatsappJid.split('@')[0];
    const userLid = `${userBase}@lid`;
    const userSw = `${userBase}@s.whatsapp.net`;

    // Global dev a tous les droits sur tous les bots
    if (global.dev && global.dev.some(dev => 
      [userWhatsappJid, userBase, userLid, userSw].includes(dev)
    )) {
      return true;
    }

    switch (level) {
      case 'owner':
        return config.permissions.owner.some(owner => 
          [userWhatsappJid, userBase, userLid, userSw].includes(owner)
        );
      
      case 'sudo':
        return this.checkPermission(botJid, userWhatsappJid, 'owner') ||
               config.permissions.sudo.some(sudo => 
                 [userWhatsappJid, userBase, userLid, userSw].includes(sudo)
               );
      
      case 'user':
      default:
        return true;
    }
  }

  // Obtenir un bot par son ID
  getBot(botJid) {
    return this.bots.get(botJid);
  }

  // Obtenir tous les bots
  getAllBots() {
    return Array.from(this.bots.entries()).map(([botJid, bot]) => ({
      botJid,
      ...bot,
      config: this.configs.get(botJid)
    }));
  }

  // Supprimer un bot
  removeBot(botJid) {
    const bot = this.bots.get(botJid);
    if (bot) {
      this.bots.delete(botJid);
      // Garder la config pour une éventuelle reconnexion
      console.log(`🗑️ BotJid ${botJid} supprimé`);
      this.emit('botRemoved', { botJid });
      return true;
    }
    return false;
  }

  // Mettre à jour l'activité d'un bot
  updateActivity(botJid) {
    const bot = this.bots.get(botJid);
    if (bot) {
      bot.lastActivity = new Date().toISOString();
    }
  }

  // Appliquer une configuration globale à tous les bots
  applyGlobalUpdate(updates, updatedBy = 'global.dev') {
    let updatedCount = 0;
    
    for (const [botJid, config] of this.configs.entries()) {
      // Pour la maintenance, forcer la mise à jour même si le bot n'est pas connecté
      if (updates.ai && updates.ai.MAINTENANCE !== undefined) {
        const maintenanceUpdate = { ai: { MAINTENANCE: updates.ai.MAINTENANCE } };
        if (this.updateBotConfig(botJid, maintenanceUpdate, updatedBy)) {
          updatedCount++;
        }
      } else {
        if (this.updateBotConfig(botJid, updates, updatedBy)) {
          updatedCount++;
        }
      }
    }
    
    console.log(`🌐 Mise à jour globale appliquée à ${updatedCount} bot(s)`);
    return updatedCount;
  }

  // Fonction utilitaire pour merge profond
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // Obtenir les statistiques
  getStats() {
    return {
      totalBots: this.bots.size,
      totalConfigs: this.configs.size,
      activeBots: Array.from(this.bots.values()).filter(bot => 
        Date.now() - new Date(bot.lastActivity).getTime() < 300000 // 5 minutes
      ).length
    };
  }
}

// Instance singleton
const botManager = new BotManager();

module.exports = botManager;