const chokidar = require("chokidar");
const zipAndSend = require("../utils/zipAndSend");

let watcher = null;

module.exports = {
  name: "autosauvegarde",
  description: "Active ou désactive la sauvegarde automatique dès qu'un fichier change",
  ownerOnly: true,

  async execute(ctx) {
    try {
      if (watcher) {
        watcher.close();
        watcher = null;
        await ctx.reply("⏸️ Sauvegarde automatique désactivée.");
        console.log("🔴 Sauvegarde automatique arrêtée.");
        return;
      }

      watcher = chokidar.watch(global.BACKUP_PATH, {
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: true,
        depth: 99,
      });

      watcher.on("all", async (event, pathChanged) => {
        console.log(`📁 Modification détectée (${event}) : ${pathChanged}`);
        try {
          await zipAndSend(ctx.bot, global.TELEGRAM_ADMIN_ID);
        } catch (err) {
          console.error("❌ Erreur lors de l’envoi de la sauvegarde automatique :", err);
        }
      });

      await ctx.reply("▶️ Sauvegarde automatique activée. Je surveille les changements dans le dossier 'data'.");
      console.log("🟢 Sauvegarde automatique activée.");
    } catch (err) {
      console.error("❌ Erreur dans la commande autosauvegarde :", err);
      await ctx.reply("❌ Une erreur est survenue lors de l'activation/désactivation de la sauvegarde automatique.");
    }
  }
};