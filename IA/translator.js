const axios = require('axios');
const fs = require('fs');
const path = require('path');

const frenchWordsPath = path.join(__dirname, '../data/mots-francais.json');
const frenchWords = new Set();

// Chargement des mots français
try {
  const json = JSON.parse(fs.readFileSync(frenchWordsPath, 'utf-8'));
  if (Array.isArray(json.words)) {
    json.words.forEach(word => frenchWords.add(word.toLowerCase()));
    console.log(`[✅] ${frenchWords.size} mots français chargés.`);
  } else {
    console.error("❌ Fichier mots-francais.json mal formé : clé 'words' absente ou non tableau.");
  }
} catch (err) {
  console.error('❌ Erreur chargement mots-francais.json :', err.message);
}

// Configuration Gemini AI pour la traduction
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAu4uwnPGgT_f3zkqJ5B4Lk-zU8ErToRW8';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

async function translateWithGemini(text, targetLang = 'français') {
  try {
    const prompt = `Traduis ce texte en ${targetLang} de manière naturelle et fluide. Si le texte est déjà en ${targetLang}, réponds simplement "ALREADY_IN_TARGET_LANGUAGE". Texte à traduire: "${text}"`;

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 512,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const translation = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translation) throw new Error('Réponse invalide de Gemini');

    if (translation === "ALREADY_IN_TARGET_LANGUAGE") return null;

    return translation;
  } catch (error) {
    console.error('❌ Erreur traduction Gemini:', error.message);

    // Fallback vers ancienne API
    try {
      const res = await axios.get('https://api.siputzx.my.id/api/tools/translate', {
        params: { text, source: 'auto', target: 'fr' },
        timeout: 8000,
      });
      if (res.data?.success && typeof res.data.translatedText === 'string') {
        return res.data.translatedText.trim();
      }
    } catch (fallbackError) {
      console.error('[❌] Erreur traduction fallback :', fallbackError.message);
    }

    return null;
  }
}

// Vérifie si une ligne contient au moins un mot français
function hasAnyFrenchWord(text) {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = normalized.split(/\W+/).filter(w => w.length > 1);
  return words.some(word => frenchWords.has(word));
}

// Fonction principale de traduction automatique
async function TRANSLATOR(conn, m) {
  try {
    const text =
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      m.message?.videoMessage?.caption ||
      m.message?.documentMessage?.caption ||
      m.message?.buttonsResponseMessage?.selectedButtonId ||
      m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      m.message?.templateButtonReplyMessage?.selectedId ||
      '';

    if (!text || typeof text !== 'string') return;
    if (m.key.fromMe) return;
    if (text.length > 1500) return;

    const words = text.trim().split(/\s+/);
    if (words.length < 3) return;

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(l => l.length > 0);

    // Ne pas traduire si déjà du français détecté
    if (lines.some(hasAnyFrenchWord)) return;

    const translation = await translateWithGemini(text);

    if (translation && translation.toLowerCase() !== text.toLowerCase()) {
      await conn.sendMessage(m.chat, {
        text: `🌐 *TRADUCTION AUTOMATIQUE* :\n\n_${translation}_`
      }, { quoted: m });
    }
  } catch (err) {
    console.error('[❌] TRANSLATOR() crash :', err.message);
  }
}

module.exports = { TRANSLATOR };