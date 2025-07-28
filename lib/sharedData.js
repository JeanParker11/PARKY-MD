const fs = require('fs');
const path = require('path');

/**
 * 🗄️ Gestionnaire de données partagées entre tous les bots
 * Quiz et récompenses sont partagés, le reste est individuel
 */
class SharedDataManager {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.ensureDataDirectory();
    
    // Cache pour améliorer les performances
    this.cache = new Map();
    
    console.log('🌐 Gestionnaire de données partagées initialisé');
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getFilePath(collection) {
    return path.join(this.dataDir, `${collection}.json`);
  }

  /**
   * Lire une collection partagée
   */
  read(collection) {
    try {
      // Vérifier le cache d'abord
      if (this.cache.has(collection)) {
        return this.cache.get(collection);
      }

      const filePath = this.getFilePath(collection);
      
      if (!fs.existsSync(filePath)) {
        // Créer le fichier s'il n'existe pas
        const defaultData = collection.includes('pending') ? [] : 
                           collection === 'recompense' ? [] : {};
        this.write(collection, defaultData);
        return defaultData;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Mettre en cache
      this.cache.set(collection, data);
      
      return data;
    } catch (error) {
      console.error(`❌ Erreur lecture ${collection}:`, error.message);
      const defaultData = collection.includes('pending') ? [] : 
                         collection === 'recompense' ? [] : {};
      this.cache.set(collection, defaultData);
      return defaultData;
    }
  }

  /**
   * Écrire dans une collection partagée
   */
  write(collection, data) {
    try {
      const filePath = this.getFilePath(collection);
      
      // Backup avant écriture
      if (fs.existsSync(filePath)) {
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
      }

      // Écrire les données
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      // Mettre à jour le cache
      this.cache.set(collection, data);
      
      console.log(`💾 ${collection} partagé sauvegardé`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur écriture ${collection}:`, error.message);
      return false;
    }
  }

  /**
   * Ajouter un élément à une collection array partagée
   */
  push(collection, item) {
    const data = this.read(collection);
    if (Array.isArray(data)) {
      data.push(item);
      return this.write(collection, data);
    }
    return false;
  }

  /**
   * Supprimer un élément d'une collection array partagée
   */
  remove(collection, predicate) {
    const data = this.read(collection);
    if (Array.isArray(data)) {
      const index = data.findIndex(predicate);
      if (index !== -1) {
        data.splice(index, 1);
        return this.write(collection, data);
      }
    }
    return false;
  }

  /**
   * Obtenir les récompenses partagées
   */
  getSharedRewards() {
    return this.read('recompense');
  }

  /**
   * Ajouter une récompense partagée
   */
  addSharedReward(reward) {
    return this.push('recompense', reward);
  }

  /**
   * Supprimer une récompense utilisée
   */
  removeSharedReward(rewardIndex) {
    const rewards = this.getSharedRewards();
    if (rewardIndex >= 0 && rewardIndex < rewards.length) {
      rewards.splice(rewardIndex, 1);
      return this.write('recompense', rewards);
    }
    return false;
  }

  /**
   * Obtenir les quiz partagés
   */
  getSharedQuiz() {
    return this.read('quizz');
  }

  /**
   * Obtenir les quiz images partagés
   */
  getSharedImageQuiz() {
    return this.read('quizz_image');
  }

  /**
   * Obtenir les statistiques partagées
   */
  getSharedStats() {
    const stats = {};
    
    // Quiz validés (partagés)
    stats.totalQuestions = this.read('quizz').length;
    stats.totalImageQuestions = this.read('quizz_image').length;
    
    // Quiz en attente (partagés)
    stats.pendingQuestions = this.read('quizz_pending').length;
    stats.pendingImageQuestions = this.read('quizz_image_pending').length;
    
    // Récompenses (partagées)
    stats.totalRewards = this.read('recompense').length;
    
    return stats;
  }
}

// Instance singleton
const sharedData = new SharedDataManager();

module.exports = sharedData;