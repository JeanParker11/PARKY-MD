// 🟩 Initialisation
require('./lib/watcher');
require('./settings');
require('./web/server');
require('./telegram/index');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const { smsg } = require('./lib/fonction');
global.smsg = smsg;

const {
    fancyStartLog,
    logInfo,
    logError,
} = require('./lib/logger');

// Importe les fonctions de gestion de session
const { startSession, removeSession, loadAndStartAllSessions, getSession, getAllSessions } = require('./telegram/utils/connexion'); // Assure-toi du bon chemin

const maintenance = require('./IA/maintenance');
const handleAllIA = require('./IA');
const { chargerRappels } = require('./commands/rappel');
const startConnection = require('./lib/connexion'); // Ceci semble être la connexion principale du bot

// 🔧 Obtenir le nom lisible d’un utilisateur/groupe
const getDisplayName = async (sock, jid) => {
    try {
        if (!jid) return 'Inconnu';
        if (jid.endsWith('@g.us')) {
            if (!sock.groupMetadata[jid]) {
                try {
                    const metadata = await sock.groupMetadata(jid);
                    sock.groupMetadata[jid] = metadata;
                } catch {
                    return jid.split('@')[0];
                }
            }
            return sock.groupMetadata[jid]?.subject || jid.split('@')[0];
        }
        const contact = sock.contacts?.[jid];
        return (
            contact?.name ||
            contact?.notify ||
            jid.split("@")[0]
        );
    } catch {
        return jid?.split('@')[0] || 'Inconnu';
    }
};

async function main() {
    try {
        fancyStartLog();

        // --- Suppression du relancement des sessions via startSession ---
        // 1. Démarrer toutes les sessions WhatsApp enregistrées au démarrage
        await loadAndStartAllSessions();
        logInfo("🚀 Toutes les sessions WhatsApp enregistrées ont été tentées de démarrer.");

        // 2. Démarrer la session principale si aucune session n'est active ou pour une session dédiée
        const mainSock = await startConnection(); // *** THIS IS THE KEY CHANGE ***
        if (mainSock) {
            mainSock.contacts = mainSock.contacts || {};
            mainSock.groupMetadata = mainSock.groupMetadata || {};
            // Add the mainSock to the list of active sockets if it's not already managed
            // by getAllSessions, or ensure that startConnection adds it to the managed list.
            // For now, we'll just process it directly.
            // You might want to add a mechanism to ensure it's part of `getAllSessions()`
            // if you want unified event handling.
            logInfo("✅ La connexion principale du bot a été établie ou tentée.");
        }


        // Pour l'exemple, nous allons itérer sur toutes les sessions actives gérées par `connecter.js`
        // et appliquer la logique de gestion des messages et événements à chacune.
        const activeSockets = getAllSessions();

        if (activeSockets.length === 0 && !mainSock) { // Check if mainSock is also not active
            logInfo("Aucune session WhatsApp active pour le moment. Utilisez /connecter via Telegram ou attendez la connexion principale.");
            // If the bot's core functionality relies on a WhatsApp connection,
            // you might want to prevent further execution here or put a retry mechanism.
            // For now, we'll let it continue to ensure telegram is still active.
        }

        // Combine mainSock with activeSockets for unified event handling
        const allSocketsToProcess = mainSock ? [mainSock, ...activeSockets] : activeSockets;


        // Boucle sur toutes les sessions pour attacher les écouteurs d'événements
        // Ceci est une simplification. Dans une architecture réelle, tu pourrais
        // vouloir gérer les écouteurs de manière plus dynamique à la connexion.
        for (const sock of allSocketsToProcess) { // Use allSocketsToProcess here
            if (!sock) continue; // S'assurer que l'objet sock est valide

            sock.contacts = sock.contacts || {};
            sock.groupMetadata = sock.groupMetadata || {};

            sock.ev.on("contacts.update", updates => {
                try {
                    for (let update of updates) {
                        const id = update.id;
                        sock.contacts[id] = { ...(sock.contacts[id] || {}), ...update };
                    }
                } catch (e) {
                    logError(`❌ Erreur mise à jour des contacts pour ${sock.user.id}: ` + e.message);
                }
            });

            try {
                chargerRappels(sock);
            } catch (e) {
                logError(`❌ Erreur chargement rappels pour ${sock.user.id}: ` + e.message);
            }

            sock.ev.on("messages.upsert", async ({ messages }) => {
                try {
                    const mek = messages?.[0];
                    if (!mek?.message || mek.key?.remoteJid === 'status@broadcast') return;

                    if (mek.key.remoteJid?.endsWith("@newsletter")) {
                        const newsletterJid = mek.key.remoteJid;
                        const messageContent = mek.message?.conversation || mek.message?.extendedTextMessage?.text || "[Message chaîne]";
                        console.log(
                            chalk.magentaBright("📰 Message chaîne :"),
                            chalk.yellow(newsletterJid),
                            "\nContenu :", chalk.white(messageContent)
                        );
                        return;
                    }

                    mek.message = mek.message?.ephemeralMessage?.message || mek.message;

                    let m;
                    try {
                        m = await smsg(sock, mek); // Important: passer le sock de la session courante
                    } catch (e) {
                        logError(`❌ Message illisible de ${mek.key?.remoteJid} pour ${sock.user.id}: ${e.message}`);
                        return;
                    }

                    const senderJid = m.sender || m.key?.participant || m.key?.remoteJid;
                    const chatJid = m.chat || m.key?.remoteJid;

                    const senderName = await getDisplayName(sock, senderJid);
                    const chatName = await getDisplayName(sock, chatJid);
                    const msgType = Object.keys(m.message || {})[0] || "unknown";

                    const contentPreview =
                        m.text ||
                        m.message?.conversation ||
                        m.message?.extendedTextMessage?.text ||
                        m.message?.imageMessage?.caption ||
                        m.message?.videoMessage?.caption ||
                        '[Contenu non affichable]';

                    console.log(
                        chalk.greenBright("📥 Message reçu") +
                        ` de ${chalk.yellow(senderName)} dans ${chalk.cyan(chatName)} (${chalk.magenta(msgType)}) : ${chalk.white(contentPreview)}`
                    );

                    try {
                        await maintenance(sock, m); // Passer le sock approprié
                    } catch (e) {
                        if (e.message.includes("⛔ Maintenance active")) return;
                        logError("❌ Erreur maintenance.js : " + (e.stack || e.message));
                        return;
                    }

                    await handleAllIA(sock, m); // Passer le sock approprié
                    require('./lib/plugins')(sock, m, messages); // Passer le sock approprié

                } catch (err) {
                    logError(`❌ Erreur messages.upsert pour session ${sock.user.id}:\n` + (err?.stack || err.message));
                }
            });

            // Réactions
            sock.ev.on("messages.reaction", async (reactionEvent) => {
                try {
                    const reactions = Array.isArray(reactionEvent) ? reactionEvent : [reactionEvent];
                    for (const reaction of reactions) {
                        const { key, reaction: emoji, sender } = reaction;
                        const chat = key.remoteJid;
                        const reactedMsgId = key.id;

                        const chatName = await getDisplayName(sock, chat);
                        const senderName = await getDisplayName(sock, sender);

                        const type = chat.endsWith("@g.us")
                            ? "👥 Groupe"
                            : chat.endsWith("@newsletter")
                                ? "📢 Chaîne"
                                : "💬 Privé";

                        console.log(
                            chalk.magentaBright("💟 Réaction détectée :"),
                            chalk.white(`${emoji} par ${senderName}`),
                            `dans ${chalk.yellow(chatName)} (${type}),`,
                            `→ ID msg: ${chalk.gray(reactedMsgId)}`
                        );
                    }

                } catch (err) {
                    logError(`❌ Erreur gestion des réactions pour session ${sock.user.id}: ` + (err?.stack || err.message));
                }
            });

            // Messages sortants : hook sendMessage pour log
            const originalSendMessage = sock.sendMessage.bind(sock);
            sock.sendMessage = async (jid, content, options = {}) => {
                try {
                    const name = await getDisplayName(sock, jid);
                    const msgType = Object.keys(content || {})[0] || 'unknown';
                    const preview =
                        content?.text ||
                        content?.caption ||
                        content?.extendedTextMessage?.text ||
                        '[Contenu non affichable]';

                    console.log(
                        chalk.blueBright("📤 Message envoyé") +
                        ` à ${chalk.cyan(name)} (${chalk.magenta(msgType)}) : ${chalk.white(preview)}`
                    );

                    return await originalSendMessage(jid, content, options);

                } catch (err) {
                    logError(`❌ Erreur sendMessage pour session ${sock.user.id}:\n` + (err?.stack || err.message));
                }
            };
        }

    } catch (err) {
        logError("❌ Erreur critique dans main() :\n" + (err?.stack || err.message));
        setTimeout(() => main(), 5000);
    }
}

main().catch(err => {
    logError("❌ Erreur lors de l'initialisation :\n" + (err?.stack || err));
    setTimeout(() => main(),
 5000);
});

// Hot reload
let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    logInfo(`🛠 Mise à jour détectée : ${__filename}`);
    delete require.cache[file];
    require(file);
});