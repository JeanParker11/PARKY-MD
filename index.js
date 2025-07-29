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
const messageMonitor = require('./lib/messageMonitor');

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
            logInfo("✅ La connexion principale du bot a été établie ou tentée.");
        }

        // 3. Démarrer le serveur web
        require('./web/server');
        logInfo("🌐 Serveur web démarré");

        // 4. Démarrer le bot Telegram
        require('./telegram/index');
        logInfo("📱 Bot Telegram démarré");

        // 5. Initialiser le monitoring des messages
        messageMonitor.initialize();
        logInfo("👁️ Monitoring des messages initialisé");

        // Gestion unifiée des événements pour tous les bots
        const activeSockets = getAllSessions();

        if (activeSockets.length === 0 && !mainSock) { // Check if mainSock is also not active
            logInfo("Aucune session WhatsApp active pour le moment. Utilisez /connecter via Telegram ou attendez la connexion principale.");
        }

        // Combine mainSock with activeSockets for unified event handling
        const allSocketsToProcess = mainSock ? [mainSock, ...activeSockets] : activeSockets;

        // Attacher les événements pour tous les bots existants
        for (const sock of allSocketsToProcess) {
            if (sock) {
                setupBotEvents(sock);
            }
        }

    } catch (err) {
        logError("❌ Erreur critique dans main() :\n" + (err?.stack || err.message));
        setTimeout(() => main(), 5000);
    }
}

// 🔧 Configuration des événements pour un bot
function setupBotEvents(sock) {
    if (!sock) return;
    
    sock.contacts = sock.contacts || {};
    sock.groupMetadata = sock.groupMetadata || {};

    // Enregistrer le bot dans le gestionnaire si pas déjà fait
    if (sock.user && sock.user.id) {
        const botId = sock.user.id.split('@')[0].split(':')[0];
        const ownerJid = sock.user.id;
        
        // Vérifier si le bot n'est pas déjà enregistré
        if (!botManager.getBot(botId)) {
            console.log(`📱 Enregistrement du bot ${botId} dans le gestionnaire`);
            const config = botManager.registerBot(botId, sock, ownerJid);
            sock.botConfig = config;
            sock.botId = botId;
        }
    }

    // Événements contacts
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

    // Charger les rappels
    try {
        chargerRappels(sock);
    } catch (e) {
        logError(`❌ Erreur chargement rappels pour ${sock.user.id}: ` + e.message);
    }

    // Messages entrants
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const mek = messages?.[0];
            if (!mek?.message || mek.key?.remoteJid === 'status@broadcast') return;

            if (mek.key.remoteJid?.endsWith("@newsletter")) {
                const newsletterJid = mek.key.remoteJid;
                const messageContent = mek.message?.conversation || mek.message?.extendedTextMessage?.text || "[Message chaîne]";
                messageMonitor.logMessage(sock.botId || 'main', 'newsletter', newsletterJid, messageContent);
                return;
            }

            mek.message = mek.message?.ephemeralMessage?.message || mek.message;

            let m;
            try {
                m = await smsg(sock, mek);
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

            // Log via le système de monitoring
            messageMonitor.logMessage(sock.botId || 'main', 'incoming', senderName, contentPreview, chatName, msgType);

            try {
                await maintenance(sock, m);
            } catch (e) {
                if (e.message.includes("⛔ Maintenance active")) return;
                logError("❌ Erreur maintenance.js : " + (e.stack || e.message));
                return;
            }

            await handleAllIA(sock, m);
            require('./lib/plugins')(sock, m, messages);

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

                messageMonitor.logMessage(sock.botId || 'main', 'reaction', senderName, `${emoji} → ${reactedMsgId}`, chatName, type);
            }

        } catch (err) {
            logError(`❌ Erreur gestion des réactions pour session ${sock.user.id}: ` + (err?.stack || err.message));
        }
    });

    // Messages sortants avec monitoring
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

            messageMonitor.logMessage(sock.botId || 'main', 'outgoing', 'Bot', preview, name, msgType);

            return await originalSendMessage(jid, content, options);

        } catch (err) {
            logError(`❌ Erreur sendMessage pour session ${sock.user.id}:\n` + (err?.stack || err.message));
        }
    };
}

// Export pour utilisation dans d'autres modules
global.setupBotEvents = setupBotEvents;

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
