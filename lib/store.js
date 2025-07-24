const fs = require("fs");
const path = require("path");
const storeFile = path.join(__dirname, "../session/store.json");

const { logInfo, logError } = require('./logger'); // ✅ Ajout du logger stylé

class CustomStore {
  constructor() {
    this.chats = new Map();
    this.messages = {
      insert: (id, msg) => {
        if (!this.messages._store.has(id)) this.messages._store.set(id, []);
        this.messages._store.get(id).push(msg);
      },
      _store: new Map(),
    };
    this.contacts = new Map();
  }

  bind() {
    // Simulation de binding
  }

  readFromFile() {
    if (fs.existsSync(storeFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(storeFile));
        this.chats = new Map(data.chats || []);
        this.contacts = new Map(data.contacts || []);
        this.messages._store = new Map(data.messages || []);
        logInfo("✅ Store restauré depuis store.json");
      } catch (e) {
        logError("❌ Erreur de lecture du store : " + e.message);
      }
    }
  }

  writeToFile() {
    const data = {
      chats: [...this.chats],
      contacts: [...this.contacts],
      messages: [...this.messages._store],
    };
    try {
      fs.writeFileSync(storeFile, JSON.stringify(data, null, 2));
    } catch (e) {
      logError("❌ Erreur lors de la sauvegarde du store : " + e.message);
    }
  }
}

const store = new CustomStore();
store.readFromFile();
setInterval(() => store.writeToFile(), 10_000);

// Simule `jidNormalizedUser`
const jidNormalizedUser = (jid) =>
  jid && jid.endsWith("@s.whatsapp.net") ? jid : `${jid.replace(/\D/g, "")}@s.whatsapp.net`;

module.exports = {
  store,
  jidNormalizedUser,
};