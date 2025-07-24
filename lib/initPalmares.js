const fs = require('fs');
const path = require('path');

const FICHE_PATH = path.join(__dirname, '../data/fiches.json');
const PALMARES_PATH = path.join(__dirname, '../data/palmares.json');

function loadFiches() {
  if (!fs.existsSync(FICHE_PATH)) return {};
  return JSON.parse(fs.readFileSync(FICHE_PATH));
}

function loadPalmares() {
  if (!fs.existsSync(PALMARES_PATH)) return {};
  return JSON.parse(fs.readFileSync(PALMARES_PATH));
}

function savePalmares(data) {
  fs.writeFileSync(PALMARES_PATH, JSON.stringify(data, null, 2));
}

function initPalmares() {
  const fiches = loadFiches();
  const palmares = loadPalmares();

  let updated = false;

  for (const jid of Object.keys(fiches)) {
    if (!(jid in palmares)) {
      palmares[jid] = {
        victoires: 0,
        defaites: 0,
        nuls: 0
      };
      updated = true;
    }
  }

  if (updated) {
    savePalmares(palmares);
    console.log('[PALMARES] Initialisé pour les nouveaux joueurs.');
  } else {
    console.log('[PALMARES] Aucun nouveau joueur à ajouter.');
  }
}

module.exports = { initPalmares };