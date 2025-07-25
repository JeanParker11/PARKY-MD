const fs = require('fs');
const path = require('path');

/**
 * 🗄️ Gestionnaire de données individuelles par utilisateur
 * Chaque bot a ses propres données séparées
 */
class UserDataManager {
  constructor() {
    this.userDataDir = path.join(__dirname, '../user-data');
    this.ensureUserDataDirectory();
    
    // Cache pour améliorer les performances
    this.cache = new Map();
    
    console.log('📊 Gestionnaire de données utilisateur initialisé');
  }

  ensureUserDataDirectory() {
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
  }

  // Obtenir le dossier de données pour un bot spécifique
  getBotDataDir(botId) {
    const botDir = path.join(this.userDataDir, botId);
    if (!fs.existsSync(botDir)) {
      fs.mkdirSync(botDir, { recursive: true });
    }
    return botDir;
  }

  // Obtenir le chemin d'un fichier de données pour un bot
  getDataPath(botId, dataType) {
    return path.join(this.getBotDataDir(botId), `${dataType}.json`);
  }

  // Lire les données d'un type spécifique pour un bot
  readBotData(botId, dataType, defaultValue = {}) {
    const cacheKey = `${botId}_${dataType}`;
    
    // Vérifier le cache d'abord
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const filePath = this.getDataPath(botId, dataType);
      
      if (!fs.existsSync(filePath)) {
        // Créer le fichier avec la valeur par défaut
        this.writeBotData(botId, dataType, defaultValue);
        return defaultValue;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Mettre en cache
      this.cache.set(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error(`❌ Erreur lecture données ${dataType} pour bot ${botId}:`, error.message);
      this.cache.set(cacheKey, defaultValue);
      return defaultValue;
    }
  }

  // Écrire les données d'un type spécifique pour un bot
  writeBotData(botId, dataType, data) {
    try {
      const filePath = this.getDataPath(botId, dataType);
      
      // Backup avant écriture
      if (fs.existsSync(filePath)) {
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
      }

      // Écrire les données
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      // Mettre à jour le cache
      const cacheKey = `${botId}_${dataType}`;
      this.cache.set(cacheKey, data);
      
      console.log(`💾 Données ${dataType} sauvegardées pour bot ${botId}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur écriture données ${dataType} pour bot ${botId}:`, error.message);
      return false;
    }
  }

  // Obtenir les scores d'un bot
  getBotScores(botId) {
    return this.readBotData(botId, 'users', {});
  }

  // Mettre à jour le score d'un utilisateur pour un bot
  updateUserScore(botId, userJid, scoreChange) {
    const scores = this.getBotScores(botId);
    if (!scores[userJid]) {
      scores[userJid] = { score: 0 };
    }
    scores[userJid].score += scoreChange;
    return this.writeBotData(botId, 'users', scores);
  }

  // Obtenir les données de bataille d'un bot
  getBotBattles(botId) {
    return this.readBotData(botId, 'battle', {});
  }

  // Mettre à jour les victoires de bataille
  updateBattleVictory(botId, userJid) {
    const battles = this.getBotBattles(botId);
    if (!battles[userJid]) {
      battles[userJid] = { victories: 0 };
    }
    battles[userJid].victories += 1;
    return this.writeBotData(botId, 'battle', battles);
  }

  // Obtenir l'historique PARKY AI d'un bot
  getBotParkyHistory(botId) {
    return this.readBotData(botId, 'parky-history', {});
  }

  // Sauvegarder l'historique PARKY AI
  saveParkyHistory(botId, chatId, history) {
    const allHistory = this.getBotParkyHistory(botId);
    allHistory[chatId] = history;
    return this.writeBotData(botId, 'parky-history', allHistory);
  }

  // Obtenir les rappels d'un bot
  getBotRappels(botId) {
    return this.readBotData(botId, 'rappels', []);
  }

  // Ajouter un rappel pour un bot
  addBotRappel(botId, rappel) {
    const rappels = this.getBotRappels(botId);
    rappels.push(rappel);
    return this.writeBotData(botId, 'rappels', rappels);
  }

  // Obtenir les signalements d'un bot
  getBotSignals(botId) {
    return this.readBotData(botId, 'signals', []);
  }

  // Ajouter un signalement pour un bot
  addBotSignal(botId, signal) {
    const signals = this.getBotSignals(botId);
    signals.push(signal);
    return this.writeBotData(botId, 'signals', signals);
  }

  // Obtenir les récompenses d'un bot
  getBotRewards(botId) {
    return this.readBotData(botId, 'recompense', []);
  }

  // Ajouter une récompense pour un bot
  addBotReward(botId, reward) {
    const rewards = this.getBotRewards(botId);
    rewards.push(reward);
    return this.writeBotData(botId, 'recompense', rewards);
  }

  // Supprimer une récompense utilisée
  removeBotReward(botId, rewardIndex) {
    const rewards = this.getBotRewards(botId);
    if (rewardIndex >= 0 && rewardIndex < rewards.length) {
      rewards.splice(rewardIndex, 1);
      return this.writeBotData(botId, 'recompense', rewards);
    }
    return false;
  }

  // Migrer les données globales vers un bot spécifique
  migrateToBotData(botId, globalDataPath, dataType) {
    try {
      if (fs.existsSync(globalDataPath)) {
        const globalData = JSON.parse(fs.readFileSync(globalDataPath, 'utf-8'));
        this.writeBotData(botId, dataType, globalData);
        console.log(`📦 Données ${dataType} migrées vers bot ${botId}`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Erreur migration ${dataType} pour bot ${botId}:`, error.message);
    }
    return false;
  }

  // Obtenir les statistiques d'un bot
  getBotStats(botId) {
    const users = this.getBotScores(botId);
    const battles = this.getBotBattles(botId);
    const rappels = this.getBotRappels(botId);
    const signals = this.getBotSignals(botId);
    const rewards = this.getBotRewards(botId);

    return {
      totalUsers: Object.keys(users).length,
      totalBattles: Object.keys(battles).length,
      totalRappels: rappels.length,
      totalSignals: signals.length,
      totalRewards: rewards.length,
      totalScore: Object.values(users).reduce((sum, user) => sum + (user.score || 0), 0),
      totalVictories: Object.values(battles).reduce((sum, battle) => sum + (battle.victories || 0), 0)
    };
  }

  // Nettoyer les données d'un bot supprimé
  cleanupBotData(botId) {
    try {
      const botDir = this.getBotDataDir(botId);
      if (fs.existsSync(botDir)) {
        fs.rmSync(botDir, { recursive: true, force: true });
        
        // Nettoyer le cache
        for (const [key] of this.cache.entries()) {
          if (key.startsWith(`${botId}_`)) {
            this.cache.delete(key);
          }
        }
        
        console.log(`🗑️ Données du bot ${botId} supprimées`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Erreur suppression données bot ${botId}:`, error.message);
    }
    return false;
  }

  // Sauvegarder toutes les données en cache
  saveAllCache() {
    let saved = 0;
    for (const [key, data] of this.cache.entries()) {
      const [botId, dataType] = key.split('_');
      if (this.writeBotData(botId, dataType, data)) {
        saved++;
      }
    }
    if (saved > 0) {
      console.log(`💾 ${saved} donnée(s) utilisateur sauvegardée(s)`);
    }
  }

  // Créer une sauvegarde complète d'un bot
  createBotBackup(botId) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.userDataDir, `backup-${botId}-${timestamp}`);
      
      fs.mkdirSync(backupDir, { recursive: true });
      
      const botDir = this.getBotDataDir(botId);
      const files = fs.readdirSync(botDir);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const sourcePath = path.join(botDir, file);
          const destPath = path.join(backupDir, file);
          fs.copyFileSync(sourcePath, destPath);
        }
      });
      
      console.log(`📦 Sauvegarde bot ${botId} créée: ${backupDir}`);
      return backupDir;
    } catch (error) {
      console.error(`❌ Erreur sauvegarde bot ${botId}:`, error.message);
      return null;
    }
  }
}

// Instance singleton
const userDataManager = new UserDataManager();

// Auto-save toutes les 5 minutes
setInterval(() => {
  userDataManager.saveAllCache();
}, 5 * 60 * 1000);

module.exports = userDataManager;