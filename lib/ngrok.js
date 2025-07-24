const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ngrok = require('ngrok');

// ✅ Charge les variables globales
require('../settings');

const startNgrok = async () => {
  try {
    // 🔍 Vérifie si ngrok est installé localement
    const ngrokBin = path.join(__dirname, '..', 'node_modules', 'ngrok', 'bin', 'ngrok');
    if (fs.existsSync(ngrokBin)) {
      execSync(`chmod +x "${ngrokBin}"`);
    }

    // 🔐 Authentifie avec le token défini dans settings
    if (global.ngrokToken) {
      await ngrok.authtoken(global.ngrokToken);
    } else {
      console.warn('⚠️ Aucun token NGROK défini dans settings.js');
    }

    // 🌐 Lance le tunnel
    const url = await ngrok.connect({
      addr: global.portNgrok || 3000,
      region: global.regionNgrok || 'us',
    });

    console.log('✅ NGROK prêt à l\'adresse :', url);
    return url;
  } catch (e) {
    console.error('❌ Erreur NGROK :', e.message || e);
    return null;
  }
};

module.exports = startNgrok;