const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

/**
 * Fonction pour zipper et envoyer le dossier data à Telegram
 * @param {TelegramBot} bot - Instance du bot Telegram
 * @param {number|string} chatId - ID du chat Telegram où envoyer le fichier
 */
module.exports = async (bot, chatId) => {
  if (!bot || !bot.telegram || typeof bot.telegram.sendDocument !== "function") {
    console.error("❌ bot ou bot.telegram.sendDocument n'est pas défini.");
    return;
  }

  const zipName = global.BACKUP_ZIP_NAME || "data.zip";
  const zipPath = path.resolve(zipName);
  const sourceDir = path.resolve(global.BACKUP_PATH || "./data");

  try {
    // Création du flux d'écriture
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    // Gestion de fin de compression
    output.on("close", async () => {
      try {
        await bot.telegram.sendDocument(chatId, {
          source: zipPath,
          filename: zipName
        });
        console.log(`✅ ${zipName} envoyé avec succès à Telegram.`);

        // Nettoyage : suppression du fichier ZIP temporaire
        fs.unlink(zipPath, (err) => {
          if (err) console.error("❌ Erreur suppression du fichier ZIP :", err);
          else console.log("🧹 Fichier ZIP supprimé après envoi.");
        });
      } catch (err) {
        console.error("❌ Erreur lors de l’envoi à Telegram :", err);
      }
    });

    archive.on("error", (err) => {
      console.error("❌ Erreur d’archivage :", err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    await archive.finalize();

  } catch (err) {
    console.error("❌ Erreur globale :", err);
  }
};