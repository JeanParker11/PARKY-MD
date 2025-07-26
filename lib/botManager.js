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
  registerBot(botId, sock, ownerJid) {
    console.log(`📝 Enregistrement bot: ${botId} pour ${ownerJid}`);
    
    const defaultConfig = this.createDefaultConfig(botId, ownerJid);
    
    this.bots.set(botId, {
      sock,
      ownerJid,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });

    if (!this.configs.has(botId)) {
      this.configs.set(botId, defaultConfig);
      this.saveConfigs();
      console.log(`💾 Configuration créée pour bot ${botId}`);
    } else {
      // Mettre à jour l'owner si différent
      const existingConfig = this.configs.get(botId);
      if (existingConfig.ownerJid !== ownerJid) {
        existingConfig.ownerJid = ownerJid;
        existingConfig.permissions.owner = [ownerJid];
        this.configs.set(botId, existingConfig);
        this.saveConfigs();
        console.log(`🔄 Propriétaire mis à jour pour bot ${botId}: ${ownerJid}`);
      }
    }

    console.log(`🤖 Bot ${botId} enregistré pour ${ownerJid}`);
    this.emit('botRegistered', { botId, ownerJid });
    
    return this.configs.get(botId);
  }

  // Créer une configuration par défaut
  createDefaultConfig(botId, ownerJid) {
    return {
      botId,
      ownerJid,
      botname: `PARKY-BOT-${botId.slice(-4)}`,
      parkyName: "PARKY",
      creatorName: global.ownername || "Jean Parker",
      prefix: "!",
      version: "1.0.0",
      stickerPackName: "PARKY-MD",
      stickerAuthor: ownerJid.split('@')[0],
      
      // Paramètres IA individuels
      ai: {
        PARKYAI: true,
        TRANSLATOR: false,
        SUGGESTIONS: true,
        MAINTENANCE: false
      },
      
      // Permissions spéciales
      permissions: {
        owner: [ownerJid],
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
  getBotConfig(botId) {
    return this.configs.get(botId) || null;
  }

  // Mettre à jour la configuration d'un bot
  updateBotConfig(botId, updates, updatedBy = null) {
    const config = this.configs.get(botId);
    if (!config) return false;

    // Merge des updates
    const updatedConfig = this.deepMerge(config, updates);
    updatedConfig.lastModified = new Date().toISOString();
    if (updatedBy) updatedConfig.lastModifiedBy = updatedBy;

    this.configs.set(botId, updatedConfig);
    this.saveConfigs();

    // Notifier le changement
    this.emit('configUpdated', { botId, config: updatedConfig, updatedBy });
    
    console.log(`⚙️ Configuration bot ${botId} mise à jour par ${updatedBy || 'système'}`);
    return true;
  }

  // Vérifier les permissions
  checkPermission(botId, userJid, level = 'user') {
    const config = this.configs.get(botId);
    if (!config) return false;

    const userBase = userJid.split('@')[0];
    const userLid = `${userBase}@lid`;
    const userSw = `${userBase}@s.whatsapp.net`;

    // Global dev a tous les droits sur tous les bots
    if (global.dev && global.dev.some(dev => 
      [userJid, userBase, userLid, userSw].includes(dev)
    )) {
      return true;
    }

    switch (level) {
      case 'owner':
        return config.permissions.owner.some(owner => 
          [userJid, userBase, userLid, userSw].includes(owner)
        );
      
      case 'sudo':
        return this.checkPermission(botId, userJid, 'owner') ||
               config.permissions.sudo.some(sudo => 
                 [userJid, userBase, userLid, userSw].includes(sudo)
               );
      
      case 'user':
      default:
        return true;
    }
  }

  // Obtenir un bot par son ID
  getBot(botId) {
    return this.bots.get(botId);
  }

  // Obtenir tous les bots
  getAllBots() {
    return Array.from(this.bots.entries()).map(([botId, bot]) => ({
      botId,
      ...bot,
      config: this.configs.get(botId)
    }));
  }

  // Supprimer un bot
  removeBot(botId) {
    const bot = this.bots.get(botId);
    if (bot) {
      this.bots.delete(botId);
      // Garder la config pour une éventuelle reconnexion
      console.log(`🗑️ Bot ${botId} supprimé`);
      this.emit('botRemoved', { botId });
      return true;
    }
    return false;
  }

  // Mettre à jour l'activité d'un bot
  updateActivity(botId) {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.lastActivity = new Date().toISOString();
    }
  }

  // Appliquer une configuration globale à tous les bots
  applyGlobalUpdate(updates, updatedBy = 'global.dev') {
    let updatedCount = 0;
    
    for (const [botId, config] of this.configs.entries()) {
      // Pour la maintenance, forcer la mise à jour même si le bot n'est pas connecté
      if (updates.ai && updates.ai.MAINTENANCE !== undefined) {
        const maintenanceUpdate = { ai: { MAINTENANCE: updates.ai.MAINTENANCE } };
        if (this.updateBotConfig(botId, maintenanceUpdate, updatedBy)) {
          updatedCount++;
        }
      } else {
        if (this.updateBotConfig(botId, updates, updatedBy)) {
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