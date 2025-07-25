const userDataManager = require("../../lib/userDataManager");
const botManager = require("../../lib/botManager");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "backup",
  description: "Crée et envoie une sauvegarde de tes données",
  category: "Gestion",
  ownerOnly: false,

  async execute(ctx) {
    const userId = ctx.from.id.toString();
    const userJid = `${userId}@s.whatsapp.net`;
    
    const isGlobalDev = global.dev && global.dev.some(dev => 
      [userJid, userId, `${userId}@lid`].includes(dev)
    );

    const allBots = botManager.getAllBots();
    const userBots = isGlobalDev ? allBots : allBots.filter(bot => bot.config.ownerJid === userJid);

    if (userBots.length === 0) {
      return ctx.reply("📱 Aucun bot à sauvegarder.");
    }

    await ctx.reply("📦 Création de la sauvegarde en cours...");

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${userId}-${timestamp}.zip`;
      const backupPath = path.resolve(backupName);

      // Créer le fichier ZIP
      const output = fs.createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', async () => {
        try {
          // Envoyer le fichier
          await ctx.replyWithDocument({
            source: backupPath,
            filename: backupName
          }, {
            caption: `📦 **Sauvegarde PARKY-MD**\n\n` +
                    `👤 Utilisateur : ${ctx.from.first_name}\n` +
                    `🤖 Bots inclus : ${userBots.length}\n` +
                    `📅 Date : ${new Date().toLocaleString('fr-FR')}\n` +
                    `📊 Taille : ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`,
            parse_mode: "Markdown"
          });

          // Supprimer le fichier temporaire
          fs.unlinkSync(backupPath);
          
          console.log(`📦 Sauvegarde envoyée à ${ctx.from.first_name} (${userId})`);
          
        } catch (error) {
          console.error("❌ Erreur envoi sauvegarde:", error);
          await ctx.reply("❌ Erreur lors de l'envoi de la sauvegarde.");
        }
      });

      archive.on('error', (err) => {
        console.error("❌ Erreur création archive:", err);
        ctx.reply("❌ Erreur lors de la création de la sauvegarde.");
      });

      archive.pipe(output);

      // Ajouter les données de chaque bot
      for (const bot of userBots) {
        const botDataDir = userDataManager.getBotDataDir(bot.botId);
        
        if (fs.existsSync(botDataDir)) {
          // Ajouter tous les fichiers JSON du bot
          const files = fs.readdirSync(botDataDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(botDataDir, file);
              archive.file(filePath, { name: `${bot.botId}/${file}` });
            }
          }
        }

        // Ajouter la configuration du bot
        const config = botManager.getBotConfig(bot.botId);
        if (config) {
          archive.append(JSON.stringify(config, null, 2), { name: `${bot.botId}/config.json` });
        }
      }

      // Ajouter un fichier de métadonnées
      const metadata = {
        backupDate: new Date().toISOString(),
        userId: userId,
        userName: ctx.from.first_name,
        botsCount: userBots.length,
        bots: userBots.map(bot => ({
          botId: bot.botId,
          botName: bot.config.botname,
          status: bot.sock ? 'online' : 'offline',
          stats: userDataManager.getBotStats(bot.botId)
        })),
        version: global.botversion || "1.0.0"
      };

      archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });

      await archive.finalize();

    } catch (error) {
      console.error("❌ Erreur sauvegarde:", error);
      await ctx.reply("❌ Erreur lors de la création de la sauvegarde.");
    }
  }
};