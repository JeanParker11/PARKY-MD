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
        if (ctx) await simpleSender(ctx, `🔄 Connexion à WhatsApp pour ${targetNumber}...\nPatiente pour recevoir le code.`);

        const sessionPath = `./sessions/${targetNumber}`;
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            syncFullHistory: false,
            markOnlineOnConnect: false
        });

        sessions[targetNumber] = sock;

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = reason !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    console.log("🔁 Tentative de reconnexion...");
                    await startSession(targetNumber, ctx);
                } else {
                    console.log(`❌ Déconnecté. Suppression session ${targetNumber}`);
                    botManager.removeBot(targetNumber);
                    removeSession(targetNumber);
                    if (ctx) await simpleSender(ctx, `❌ Session ${targetNumber} déconnectée.`);
                }
            }

            if (connection === "open") {
                console.log(`✅ Session connectée pour ${targetNumber}`);
                
                // Enregistrer le bot dans le manager avec configuration individuelle
                const ownerJid = ctx ? `${ctx.from.id}@s.whatsapp.net` : `${targetNumber}@s.whatsapp.net`;
                const config = botManager.registerBot(targetNumber, sock, ownerJid);
                
                // Appliquer la configuration au socket
                sock.botConfig = config;
                sock.botId = targetNumber;
                
                // Enregistrer dans le monitoring
                messageMonitor.registerBot(targetNumber, config.botname, ownerJid);
                
                // Configurer les événements pour ce bot
                if (global.setupBotEvents) {
                    global.setupBotEvents(sock);
                }
                
                console.log(`🤖 Bot ${targetNumber} enregistré pour l'utilisateur ${ownerJid}`);
                
                if (ctx) await simpleSender(ctx, `✅ ${targetNumber} connecté avec succès à WhatsApp !`);
            }
        });

        setTimeout(async () => {
            if (!state.creds.registered) {
                const code = await sock.requestPairingCode(targetNumber);
                if (ctx) simpleSender(ctx, `🔐 Ton code de connexion est :\n\n*${code}*`);
            }
        }, 5000);

        setTimeout(async () => {
            if (!state.creds.registered) {
                console.log(`⏰ Appairage échoué pour ${targetNumber}`);
                if (ctx) simpleSender(ctx, `❌ Échec ou expiration de l’appairage pour ${targetNumber}. Réessaie.`);
                removeSession(targetNumber);
            }
        }, 60000);

        saveSessionNumber(targetNumber);
        return sock;
    } catch (err) {
        console.error("❗ Erreur lors de la création de session :", err);
        if (ctx) await simpleSender(ctx, `❌ Une erreur est survenue.\nNuméro invalide ?\n\nErreur : \`${err.message}\``);
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