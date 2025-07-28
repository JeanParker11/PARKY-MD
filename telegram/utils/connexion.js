// utils/connexion.js

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const botManager = require("../../lib/botManager");
const messageMonitor = require("../../lib/messageMonitor");

const SESSIONS_FILE = "./sessions.json";
const sessions = {};

// 💬 Envoi de message simple
function simpleSender(ctx, text) {
    return ctx?.reply?.(text, { parse_mode: "Markdown" });
}

function saveSessionNumber(number) {
    let sessionsList = [];
    if (fs.existsSync(SESSIONS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(SESSIONS_FILE));
            sessionsList = Array.isArray(data.sessions) ? data.sessions : [];
        } catch (err) {
            console.error("Erreur lecture fichier sessions :", err);
        }
    }

    if (!sessionsList.includes(number)) {
        sessionsList.push(number);
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: sessionsList }, null, 2));
    }
}

function removeSession(number) {
    console.log(`❌ Suppression session ${number}`);
    if (fs.existsSync(SESSIONS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(SESSIONS_FILE));
            const sessionsList = Array.isArray(data.sessions) ? data.sessions : [];
            const updatedList = sessionsList.filter(num => num !== number);
            fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: updatedList }, null, 2));
        } catch (err) {
            console.error("Erreur suppression session :", err);
        }
    }

    const sessionPath = `./sessions/${number}`;
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    if (sessions[number] && sessions[number].ws?.readyState === 1) {
        sessions[number].ws.close();
    }

    delete sessions[number];
    console.log(`✅ Session ${number} supprimée.`);
}

async function startSession(targetNumber, ctx) {
    try {
        console.log("📲 Démarrage session :", targetNumber);
        if (ctx) await simpleSender(ctx, `🔄 Connexion à WhatsApp pour ${targetNumber}...\n⚠️ Assure-toi que ce numéro n'est pas déjà connecté ailleurs !`);

        const sessionPath = `./sessions/${targetNumber}`;
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        sessions[targetNumber] = sock;
        
        // Ajouter les méthodes nécessaires comme le bot principal
        sock.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const { jidDecode } = require("@whiskeysockets/baileys");
                const decode = jidDecode(jid) || {};
                return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
            }
            return jid;
        };
        
        sock.sendText = (jid, text, options = {}) =>
            sock.sendMessage(jid, { text, ...options });
        
        // Ajouter downloadMediaMessage comme le bot principal
        sock.downloadMediaMessage = async (msg) => {
            try {
                const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
                const content = msg?.msg || msg?.message?.[msg?.mtype] || msg?.message;
                const type = msg?.mtype?.replace(/Message/gi, '') || (content?.mimetype?.split('/')[0]);

                if (!content || !content.mediaKey) {
                    throw new Error("⛔ Média invalide ou champ mediaKey manquant.");
                }

                const stream = await downloadContentFromMessage(content, type);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                return Buffer.concat(chunks);
            } catch (e) {
                throw new Error(`❌ Échec téléchargement : ${e.message}`);
            }
        };
        
        // Initialiser les objets nécessaires
        sock.contacts = sock.contacts || {};
        sock.groupMetadata = sock.groupMetadata || {};

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = reason !== DisconnectReason.loggedOut && reason !== DisconnectReason.deviceLoggedOut;

                // Ne pas reconnecter si device_removed (401) ou loggedOut
                if (shouldReconnect && reason !== 401) {
                    console.log("🔁 Tentative de reconnexion...");
                    await startSession(targetNumber, ctx);
                } else {
                    const errorMsg = reason === 401 ? "Numéro déjà connecté ailleurs" : "Session fermée";
                    console.log(`❌ Déconnecté (${errorMsg}). Suppression session ${targetNumber}`);
                    botManager.removeBot(targetNumber);
                    messageMonitor.unregisterBot(targetNumber);
                    removeSession(targetNumber);
                    if (ctx) await simpleSender(ctx, `❌ Session ${targetNumber} déconnectée.\n\n${reason === 401 ? "⚠️ Ce numéro est déjà connecté sur un autre appareil. Déconnecte-le d'abord." : "Session fermée par WhatsApp."}`);
                }
            }

            if (connection === "open") {
                console.log(`✅ Session connectée pour ${targetNumber}`);
                
                // Créer l'ownerJid correct basé sur l'utilisateur Telegram
                const telegramUserId = ctx ? ctx.from.id.toString() : targetNumber;
                const ownerJid = `${telegramUserId}@s.whatsapp.net`;
                
                console.log(`📝 Association bot ${targetNumber} → utilisateur Telegram ${telegramUserId}`);
                
                const config = botManager.registerBot(targetNumber, sock, ownerJid);
                
                // Appliquer la configuration au socket
                sock.botConfig = config;
                sock.botId = targetNumber;
                
                // Ajouter les fonctions nécessaires comme le bot principal
                sock.decodeJid = (jid) => {
                    if (!jid) return jid;
                    if (/:\d+@/gi.test(jid)) {
                        const decode = require('@whiskeysockets/baileys').jidDecode(jid) || {};
                        return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
                    }
                    return jid;
                };

                sock.downloadMediaMessage = async (msg) => {
                    try {
                        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                        const content = msg?.msg || msg?.message?.[msg?.mtype] || msg?.message;
                        const type = msg?.mtype?.replace(/Message/gi, '') || (content?.mimetype?.split('/')[0]);

                        if (!content || !content.mediaKey) {
                            throw new Error("⛔ Média invalide ou champ mediaKey manquant.");
                        }

                        const stream = await downloadContentFromMessage(content, type);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        return Buffer.concat(chunks);
                    } catch (e) {
                        throw new Error(`❌ Échec téléchargement : ${e.message}`);
                    }
                };

                // Initialiser les objets nécessaires
                sock.contacts = sock.contacts || {};
                sock.groupMetadata = sock.groupMetadata || {};
                
                // Enregistrer dans le monitoring
                messageMonitor.registerBot(targetNumber, config.botname, ownerJid);
                
                // Configurer les événements pour ce bot
                if (global.setupBotEvents) {
                    global.setupBotEvents(sock);
                }
                
                // Envoyer le message de démarrage au propriétaire
                const getStartupMessage = require('../../lib/startupMessage');
                try {
                    await sock.sendMessage(ownerJid, { text: getStartupMessage(config) });
                    console.log(`📨 Message de démarrage envoyé à ${ownerJid}`);
                } catch (err) {
                    console.error(`❌ Erreur envoi message démarrage à ${ownerJid}:`, err.message);
                }
                
                // Envoyer le message de démarrage
                try {
                    const startupMessage = require('../../lib/startupMessage');
                    await sock.sendMessage(ownerJid, { text: startupMessage() });
                    console.log(`📨 Message de démarrage envoyé à ${ownerJid}`);
                } catch (err) {
                    console.error(`❌ Erreur envoi message démarrage:`, err.message);
                }
                
                console.log(`🤖 Bot ${targetNumber} enregistré pour l'utilisateur Telegram ${telegramUserId}`);
                
                if (ctx) await simpleSender(ctx, `✅ ${targetNumber} connecté avec succès à WhatsApp !\n\n🎮 Utilise /listbots pour voir ton bot\n🧠 Utilise /parkyconfig pour configurer PARKY AI`);
            }
        });

        setTimeout(async () => {
            if (!state.creds.registered) {
                const code = await sock.requestPairingCode(targetNumber);
                const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
                if (ctx) simpleSender(ctx, `🔐 **Code de connexion WhatsApp :**\n\n\`${formattedCode}\`\n\n📱 Va dans WhatsApp → Appareils connectés → Connecter un appareil → Entrer le code`);
            }
        }, 5000);

        setTimeout(async () => {
            if (!state.creds.registered) {
                console.log(`⏰ Appairage échoué pour ${targetNumber}`);
                if (ctx) simpleSender(ctx, `❌ **Échec de l'appairage pour ${targetNumber}**\n\nPossibles causes :\n• Code non saisi dans les 60 secondes\n• Numéro déjà connecté ailleurs\n• Problème de réseau\n\nRéessaie avec /connecter ${targetNumber}`);
                removeSession(targetNumber);
            }
        }, 90000); // 90 secondes au lieu de 60

        saveSessionNumber(targetNumber);
        return sock;
    } catch (err) {
        console.error("❗ Erreur lors de la création de session :", err);
        if (ctx) await simpleSender(ctx, `❌ **Erreur de connexion**\n\nNuméro : ${targetNumber}\nErreur : \`${err.message}\`\n\n💡 Vérifications :\n• Le numéro est-il correct ?\n• N'est-il pas déjà connecté ailleurs ?`);
        return null;
    }
}

async function loadAndStartAllSessions() {
    let sessionsList = [];
    if (fs.existsSync(SESSIONS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(SESSIONS_FILE));
            sessionsList = Array.isArray(data.sessions) ? data.sessions : [];
        } catch (err) {
            console.error("Erreur lecture fichier sessions au démarrage :", err);
        }
    }

    for (const number of sessionsList) {
        console.log(`Attempting to restart session for ${number}`);
        await startSession(number, null);
    }
}

function getSession(number) {
    return sessions[number];
}

module.exports = {
    startSession,
    removeSession,
    loadAndStartAllSessions,
    getSession,
    getAllSessions: () => Object.values(sessions)
};