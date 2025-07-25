const userDataManager = require("../../lib/userDataManager");
const botManager = require("../../lib/botManager");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { pipeline } = require("stream");
const unzipper = require("unzipper");

module.exports = {
  name: "restore",
  description: "Restaure tes données depuis une sauvegarde",
  category: "Gestion",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    
    // Vérifier si un fichier est attaché
    if (!ctx.message.document) {
      return ctx.reply(
        "📁 **Restauration de sauvegarde**\n\n" +
        "Pour restaurer tes données :\n" +
        "1. Envoie ton fichier de sauvegarde (.zip)\n" +
        "2. Utilise la commande /restore en réponse au fichier\n\n" +
        "⚠️ **Attention :** Cette action remplacera tes données actuelles."
      );
    }

    const document = ctx.message.document;
    
    // Vérifier que c'est un fichier ZIP
    if (!document.file_name.endsWith('.zip')) {
      return ctx.reply("❌ Le fichier doit être une sauvegarde au format .zip");
    }

    await ctx.reply("📦 Restauration en cours...");

    try {
      // Télécharger le fichier
      const fileLink = await ctx.telegram.getFileLink(document.file_id);
      const response = await fetch(fileLink.href);
      const buffer = await response.arrayBuffer();
      
      const tempZipPath = path.resolve(`temp-restore-${userId}-${Date.now()}.zip`);
      fs.writeFileSync(tempZipPath, Buffer.from(buffer));

      // Extraire et traiter le ZIP
      const extractDir = path.resolve(`temp-extract-${userId}-${Date.now()}`);
      fs.mkdirSync(extractDir, { recursive: true });

      await new Promise((resolve, reject) => {
        fs.createReadStream(tempZipPath)
          .pipe(unzipper.Extract({ path: extractDir }))
          .on('close', resolve)
          .on('error', reject);
      });

      // Lire les métadonnées de sauvegarde
      const metadataPath = path.join(extractDir, 'backup-metadata.json');
      let metadata = null;
      
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      }

      // Vérifier que la sauvegarde appartient à l'utilisateur
      if (metadata && metadata.userId !== userId) {
        // Nettoyer les fichiers temporaires
        fs.rmSync(tempZipPath, { force: true });
        fs.rmSync(extractDir, { recursive: true, force: true });
        
        return ctx.reply("⛔ Cette sauvegarde ne t'appartient pas.");
      }

      let restoredBots = 0;
      let restoredData = 0;

      // Restaurer les données de chaque bot
      const botDirs = fs.readdirSync(extractDir).filter(dir => 
        fs.statSync(path.join(extractDir, dir)).isDirectory()
      );

      for (const botId of botDirs) {
        const botExtractDir = path.join(extractDir, botId);
        const files = fs.readdirSync(botExtractDir);

        // Restaurer la configuration du bot
        const configFile = path.join(botExtractDir, 'config.json');
        if (fs.existsSync(configFile)) {
          const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
          
          // Vérifier que l'utilisateur est bien le propriétaire
          if (config.ownerJid === `${userId}@s.whatsapp.net`) {
            // Restaurer la configuration
            botManager.configs.set(botId, config);
            botManager.saveConfigs();
            restoredBots++;
          }
        }

        // Restaurer les données utilisateur
        for (const file of files) {
          if (file.endsWith('.json') && file !== 'config.json') {
            const sourceFile = path.join(botExtractDir, file);
            const dataType = path.basename(file, '.json');
            const data = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
            
            userDataManager.writeBotData(botId, dataType, data);
            restoredData++;
          }
        }
      }

      // Nettoyer les fichiers temporaires
      fs.rmSync(tempZipPath, { force: true });
      fs.rmSync(extractDir, { recursive: true, force: true });

      let message = `✅ **Restauration terminée avec succès**\n\n`;
      message += `🤖 Bots restaurés : ${restoredBots}\n`;
      message += `📊 Fichiers de données : ${restoredData}\n`;
      
      if (metadata) {
        message += `📅 Sauvegarde du : ${new Date(metadata.backupDate).toLocaleString('fr-FR')}\n`;
        message += `📦 Version : ${metadata.version}\n`;
      }
      
      message += `\n💡 Utilise /connecter <numéro> pour reconnecter tes bots.`;

      await ctx.reply(message, { parse_mode: "Markdown" });
      
      console.log(`📦 Restauration effectuée pour ${ctx.from.first_name} (${userId}): ${restoredBots} bots, ${restoredData} fichiers`);

    } catch (error) {
      console.error("❌ Erreur restauration:", error);
      await ctx.reply("❌ Erreur lors de la restauration. Vérifie que le fichier est une sauvegarde valide.");
    }
  }
};