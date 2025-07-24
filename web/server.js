const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const session = require('express-session');

// Charger la configuration depuis settings.js
require('../settings');
const db = require('../lib/database');
const geminiAI = require('../lib/geminiAI');

const app = express();
const PORT = global.WEB_PORT;
const HOST = global.WEB_HOST;
const ADMIN_PASS = global.ADMIN_PASSWORD;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Configuration des sessions avec stockage en mémoire
app.use(session({
  secret: global.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true en production avec HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
  }
}));

// Middleware pour CORS et headers de sécurité (CORRIGÉ)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Headers corrigés sans caractères spéciaux
  res.header('X-Powered-By', 'PARKY-MD-JSON-Database');
  res.header('X-API-Version', global.botversion || '2.0.0');
  res.header('X-Creator', 'Jean-Parker');
  res.header('X-Gemini-Library', geminiAI.getInfo().library);
  res.header('X-Gemini-Model', geminiAI.getInfo().model);
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Route pour les métadonnées Open Graph (Link Preview)
app.get('/', (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
  
  if (isBot) {
    // Servir les métadonnées pour les bots
    const metaHTML = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${global.SITE_URL}/">
    <meta property="og:title" content="${global.botname} - Bot WhatsApp Intelligent avec PARKY AI ${geminiAI.model}">
    <meta property="og:description" content="Plateforme complète pour créer et jouer à des quiz manga/anime. Propulsé par PARKY AI ${geminiAI.model} avec bibliothèque ${geminiAI.getInfo().library}. Créé par ${global.ownername}">
    <meta property="og:image" content="${global.menuImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="${global.botname}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${global.SITE_URL}/">
    <meta property="twitter:title" content="${global.botname} - Bot WhatsApp Intelligent avec PARKY AI ${geminiAI.model}">
    <meta property="twitter:description" content="Plateforme complète pour créer et jouer à des quiz manga/anime. Propulsé par PARKY AI ${geminiAI.model} avec bibliothèque ${geminiAI.getInfo().library}.">
    <meta property="twitter:image" content="${global.menuImageUrl}">
    
    <title>${global.botname} - Bot WhatsApp Intelligent avec PARKY AI ${geminiAI.model}</title>
    
    <!-- Favicon -->
    <link rel="icon" href="${global.menuImageUrl}" type="image/jpeg">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="${global.SITE_URL}/">
</head>
<body>
    <h1>${global.botname} - Bot WhatsApp Intelligent avec PARKY AI ${geminiAI.model}</h1>
    <p>Plateforme complète pour créer et jouer à des quiz manga/anime. Propulsé par PARKY AI ${geminiAI.model} avec bibliothèque ${geminiAI.getInfo().library}.</p>
    <p>Créé par ${global.ownername}</p>
    <script>window.location.href = '/';</script>
</body>
</html>`;
    res.send(metaHTML);
  } else {
    // Servir le fichier HTML normal
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const stats = db.getStats();
  const geminiInfo = geminiAI.getInfo();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: global.botversion,
    bot: global.botname,
    creator: global.ownername,
    database: 'JSON Files',
    ai: {
      provider: 'Gemini AI',
      model: geminiInfo.model,
      library: geminiInfo.library,
      version: geminiInfo.version,
      available: geminiInfo.available,
      configured: geminiInfo.apiKeyConfigured
    },
    site_url: global.SITE_URL,
    stats: stats
  });
});

// POST générer code de pairing RÉEL avec Baileys
app.post('/api/pairing/generate', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || !/^\d{8,15}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false,
        error: 'Numéro de téléphone invalide. Format attendu: 8-15 chiffres sans espaces ni symboles' 
      });
    }
    
    // Importer Baileys dynamiquement
    const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
    const pino = require('pino');
    
    try {
      // Créer une session temporaire pour le pairing
      const sessionPath = path.join(__dirname, '../session-temp');
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }
      
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: false,
      });
      
      // Générer le code de pairing
      const code = await sock.requestPairingCode(phoneNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
      
      // Nettoyer la session temporaire
      setTimeout(() => {
        try {
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          }
        } catch (e) {
          console.error('Erreur nettoyage session temp:', e);
        }
      }, 5000);
      
      console.log(`📱 Code de pairing RÉEL généré pour ${phoneNumber}: ${formattedCode}`);
      
      res.json({ 
        success: true, 
        code: formattedCode,
        phoneNumber,
        message: 'Code de pairing généré avec succès',
        bot: global.botname,
        creator: global.ownername
      });
      
    } catch (baileyError) {
      console.error('Erreur Baileys:', baileyError);
      res.status(500).json({ 
        success: false,
        error: 'Erreur lors de la génération du code de pairing avec Baileys' 
      });
    }
    
  } catch (error) {
    console.error('Erreur génération pairing code:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la génération du code de pairing' 
    });
  }
});

// POST proposition quizz avec JSON
app.post('/api/quizz/propose', async (req, res) => {
  try {
    const quiz = req.body;
    
    if (!quiz || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Quiz invalide: questions manquantes ou format incorrect' 
      });
    }

    if (quiz.questions.length > global.MAX_QUESTIONS_PER_SUBMISSION) {
      return res.status(400).json({ 
        success: false,
        error: `Maximum ${global.MAX_QUESTIONS_PER_SUBMISSION} questions par soumission` 
      });
    }

    if (!quiz.proposedBy || quiz.proposedBy.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Le nom du proposant est requis' 
      });
    }

    // Validation des questions
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      if (!q.question || !q.options || !q.answer) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: champs manquants (question, options, answer)`
        });
      }

      if (q.question.length > global.MAX_QUIZ_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: trop longue (max ${global.MAX_QUIZ_LENGTH} caractères)`
        });
      }
      
      if (!q.options.a || !q.options.b || !q.options.c || !q.options.d) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: toutes les options (a, b, c, d) sont requises`
        });
      }

      // Vérifier la longueur des options
      for (const [key, value] of Object.entries(q.options)) {
        if (value.length > global.MAX_OPTION_LENGTH) {
          return res.status(400).json({
            success: false,
            error: `Question ${i + 1}, option ${key}: trop longue (max ${global.MAX_OPTION_LENGTH} caractères)`
          });
        }
      }
      
      if (!['a', 'b', 'c', 'd'].includes(q.answer)) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: la réponse doit être a, b, c ou d`
        });
      }
    }

    // Sauvegarder dans JSON
    const quizData = {
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      proposedBy: quiz.proposedBy.trim(),
      questions: quiz.questions,
      proposedAt: new Date().toISOString(),
      status: 'pending',
      bot: global.botname,
      creator: global.ownername,
      ai: geminiAI.getInfo()
    };

    db.push('quizz_pending', quizData);

    console.log(`✅ Quiz proposé par ${quiz.proposedBy}: ${quiz.questions.length} questions - Sauvegardé`);
    res.json({ 
      success: true, 
      id: quizData.id,
      message: `Quiz avec ${quiz.questions.length} question(s) proposé avec succès et sauvegardé`,
      questionsCount: quiz.questions.length,
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
  } catch (error) {
    console.error('Erreur proposition quiz:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la proposition du quiz' 
    });
  }
});

// POST proposition quiz image avec JSON
app.post('/api/quizz-image/propose', async (req, res) => {
  try {
    const quiz = req.body;
    
    if (!quiz || !quiz.question || !quiz.imageUrl || !quiz.options) {
      return res.status(400).json({ 
        success: false,
        error: 'Quiz image invalide - champs manquants (question, imageUrl, options)' 
      });
    }

    if (!quiz.proposedBy || quiz.proposedBy.trim() === '') {
      return res.status(400).json({ 
        success: false,
        error: 'Le nom du proposant est requis' 
      });
    }

    if (quiz.question.length > global.MAX_QUIZ_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Question trop longue (max ${global.MAX_QUIZ_LENGTH} caractères)`
      });
    }

    if (!quiz.options.a || !quiz.options.b || !quiz.options.c || !quiz.options.d) {
      return res.status(400).json({ 
        success: false,
        error: 'Toutes les options (a, b, c, d) sont requises' 
      });
    }

    // Vérifier la longueur des options
    for (const [key, value] of Object.entries(quiz.options)) {
      if (value.length > global.MAX_OPTION_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Option ${key}: trop longue (max ${global.MAX_OPTION_LENGTH} caractères)`
        });
      }
    }

    if (!quiz.answer || !['a', 'b', 'c', 'd'].includes(quiz.answer)) {
      return res.status(400).json({ 
        success: false,
        error: 'La réponse doit être a, b, c ou d' 
      });
    }

    // Validation de l'URL de l'image
    try {
      new URL(quiz.imageUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'URL de l\'image invalide'
      });
    }

    // Sauvegarder dans JSON
    const quizData = {
      id: `qi_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      proposedBy: quiz.proposedBy.trim(),
      imageUrl: quiz.imageUrl,
      question: quiz.question,
      options: quiz.options,
      answer: quiz.answer,
      category: quiz.category || '',
      proposedAt: new Date().toISOString(),
      status: 'pending',
      bot: global.botname,
      creator: global.ownername,
      ai: geminiAI.getInfo()
    };

    db.push('quizz_image_pending', quizData);

    console.log(`✅ Quiz image proposé par ${quiz.proposedBy}: ${quiz.question} - Sauvegardé`);
    res.json({ 
      success: true, 
      id: quizData.id, 
      message: 'Quiz image proposé avec succès et sauvegardé',
      category: quiz.category || 'Non spécifiée',
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
    
  } catch (error) {
    console.error('Erreur proposition quiz image:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la proposition du quiz image' 
    });
  }
});

// POST login admin avec session persistante
app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ 
        success: false,
        error: 'Mot de passe requis' 
      });
    }
    
    if (password === ADMIN_PASS) {
      // Générer un token sécurisé
      const token = crypto.randomBytes(32).toString('hex');
      const adminId = 'admin_' + Date.now();
      
      // Sauvegarder dans la session Express
      req.session.adminToken = token;
      req.session.adminId = adminId;
      req.session.isAdmin = true;
      req.session.loginTime = new Date().toISOString();
      
      return res.json({ 
        success: true,
        token,
        adminId,
        message: 'Connexion administrateur réussie - Session sauvegardée',
        bot: global.botname,
        creator: global.ownername,
        ai: geminiAI.getInfo()
      });
    }
    
    return res.status(401).json({ 
      success: false,
      error: 'Mot de passe incorrect' 
    });
  } catch (error) {
    console.error('Erreur login admin:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la connexion' 
    });
  }
});

// GET vérifier session admin
app.get('/api/admin/check-session', async (req, res) => {
  try {
    const token = req.headers['authorization'] || req.session.adminToken;
    
    if (!token || !req.session.isAdmin) {
      return res.status(401).json({ 
        success: false,
        error: 'Aucune session trouvée' 
      });
    }
    
    return res.json({ 
      success: true,
      adminId: req.session.adminId,
      loginTime: req.session.loginTime,
      message: 'Session valide',
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
  } catch (error) {
    console.error('Erreur vérification session:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la vérification' 
    });
  }
});

// POST logout admin
app.post('/api/admin/logout', async (req, res) => {
  try {
    // Détruire la session Express
    req.session.destroy((err) => {
      if (err) {
        console.error('Erreur destruction session:', err);
      }
    });
    
    res.json({ 
      success: true,
      message: 'Déconnexion réussie',
      bot: global.botname
    });
  } catch (error) {
    console.error('Erreur logout admin:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la déconnexion' 
    });
  }
});

// Middleware auth admin pour routes suivantes
app.use('/api/admin', async (req, res, next) => {
  try {
    const token = req.headers['authorization'] || req.session.adminToken;
    
    if (!token || !req.session.isAdmin) {
      return res.status(401).json({ 
        success: false,
        error: 'Token d\'authentification requis' 
      });
    }
    
    req.adminId = req.session.adminId;
    next();
  } catch (error) {
    console.error('Erreur auth admin:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de l\'authentification' 
    });
  }
});

// GET quiz en attente (admin) avec JSON
app.get('/api/admin/quizz/pending', async (req, res) => {
  try {
    const pendingQuizzes = db.read('quizz_pending');
    
    res.json({
      success: true,
      count: pendingQuizzes.length,
      quizzes: pendingQuizzes,
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
  } catch (error) {
    console.error('Erreur récupération quiz pending:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des quiz en attente' 
    });
  }
});

// GET quiz images en attente (admin) avec JSON
app.get('/api/admin/quizz-image/pending', async (req, res) => {
  try {
    const pendingQuizzes = db.read('quizz_image_pending');
    
    res.json({
      success: true,
      count: pendingQuizzes.length,
      quizzes: pendingQuizzes,
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
  } catch (error) {
    console.error('Erreur récupération quiz image pending:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des quiz images en attente' 
    });
  }
});

// PUT modifier quiz (admin) - NOUVELLE ROUTE AJOUTÉE
app.put('/api/admin/quizz/edit/:id', async (req, res) => {
  try {
    const quizId = req.params.id;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Questions manquantes ou format incorrect' 
      });
    }

    // Validation des questions modifiées
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.options || !q.answer) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: champs manquants (question, options, answer)`
        });
      }
      
      if (!q.options.a || !q.options.b || !q.options.c || !q.options.d) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: toutes les options (a, b, c, d) sont requises`
        });
      }
      
      if (!['a', 'b', 'c', 'd'].includes(q.answer)) {
        return res.status(400).json({
          success: false,
          error: `Question ${i + 1}: la réponse doit être a, b, c ou d`
        });
      }
    }

    const pending = db.read('quizz_pending');
    const quizIndex = pending.findIndex(q => q.id === quizId);
    
    if (quizIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Quiz non trouvé' 
      });
    }

    // Mettre à jour les questions
    pending[quizIndex].questions = questions;
    pending[quizIndex].lastModified = new Date().toISOString();
    pending[quizIndex].modifiedBy = req.adminId;
    pending[quizIndex].ai = geminiAI.getInfo();

    db.write('quizz_pending', pending);

    console.log(`✏️ Quiz ${quizId} modifié par ${req.adminId} - Sauvegardé`);
    res.json({ 
      success: true,
      message: 'Quiz modifié avec succès et sauvegardé',
      questionsCount: questions.length,
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
  } catch (error) {
    console.error('Erreur modification quiz:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la modification' 
    });
  }
});

// PUT modifier quiz image (admin) - NOUVELLE ROUTE AJOUTÉE
app.put('/api/admin/quizz-image/edit/:id', async (req, res) => {
  try {
    const quizId = req.params.id;
    const { imageUrl, question, options, answer, category } = req.body;
    
    if (!imageUrl || !question || !options || !answer) {
      return res.status(400).json({ 
        success: false,
        error: 'Champs manquants (imageUrl, question, options, answer)' 
      });
    }

    if (!options.a || !options.b || !options.c || !options.d) {
      return res.status(400).json({ 
        success: false,
        error: 'Toutes les options (a, b, c, d) sont requises' 
      });
    }

    if (!['a', 'b', 'c', 'd'].includes(answer)) {
      return res.status(400).json({ 
        success: false,
        error: 'La réponse doit être a, b, c ou d' 
      });
    }

    // Validation de l'URL de l'image
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'URL de l\'image invalide'
      });
    }

    const pending = db.read('quizz_image_pending');
    const quizIndex = pending.findIndex(q => q.id === quizId);
    
    if (quizIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Quiz image non trouvé' 
      });
    }

    // Mettre à jour le quiz image
    pending[quizIndex].imageUrl = imageUrl;
    pending[quizIndex].question = question;
    pending[quizIndex].options = options;
    pending[quizIndex].answer = answer;
    pending[quizIndex].category = category || '';
    pending[quizIndex].lastModified = new Date().toISOString();
    pending[quizIndex].modifiedBy = req.adminId;
    pending[quizIndex].ai = geminiAI.getInfo();

    db.write('quizz_image_pending', pending);

    console.log(`✏️ Quiz image ${quizId} modifié par ${req.adminId} - Sauvegardé`);
    res.json({ 
      success: true,
      message: 'Quiz image modifié avec succès et sauvegardé',
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
  } catch (error) {
    console.error('Erreur modification quiz image:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la modification' 
    });
  }
});

// POST valider quiz (admin) avec JSON
app.post('/api/admin/quizz/validate', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: 'ID du quiz requis' 
      });
    }

    const pending = db.read('quizz_pending');
    const quizIndex = pending.findIndex(q => q.id === id);
    
    if (quizIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Quiz non trouvé' 
      });
    }

    const quiz = pending[quizIndex];
    const validQuizz = db.read('quizz');

    // Ajouter chaque question individuellement
    quiz.questions.forEach(question => {
      validQuizz.push({
        ...question,
        proposedBy: quiz.proposedBy,
        validatedAt: new Date().toISOString(),
        validatedBy: req.adminId,
        bot: global.botname,
        creator: global.ownername,
        ai: geminiAI.getInfo()
      });
    });

    // Sauvegarder et supprimer de pending
    db.write('quizz', validQuizz);
    pending.splice(quizIndex, 1);
    db.write('quizz_pending', pending);

    console.log(`✅ Quiz ${id} validé par ${req.adminId}: ${quiz.questions.length} questions ajoutées - Sauvegardé`);
    res.json({ 
      success: true,
      message: `Quiz validé avec succès: ${quiz.questions.length} questions ajoutées et sauvegardées`,
      questionsAdded: quiz.questions.length,
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
  } catch (error) {
    console.error('Erreur validation quiz:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la validation' 
    });
  }
});

// POST valider quiz image (admin) avec JSON
app.post('/api/admin/quizz-image/validate/:id', async (req, res) => {
  try {
    const quizId = req.params.id;
    
    const pending = db.read('quizz_image_pending');
    const quizIndex = pending.findIndex(q => q.id === quizId);
    
    if (quizIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Quiz image non trouvé' 
      });
    }
    
    const quiz = pending[quizIndex];
    const validated = db.read('quizz_image');
    
    const validatedQuiz = {
      question: quiz.question,
      imageUrl: quiz.imageUrl,
      options: quiz.options,
      answer: quiz.answer,
      proposedBy: quiz.proposedBy,
      category: quiz.category || "",
      validatedAt: new Date().toISOString(),
      validatedBy: req.adminId,
      bot: global.botname,
      creator: global.ownername,
      ai: geminiAI.getInfo()
    };
    
    validated.push(validatedQuiz);
    pending.splice(quizIndex, 1);
    
    db.write('quizz_image', validated);
    db.write('quizz_image_pending', pending);
    
    console.log(`✅ Quiz image ${quizId} validé par ${req.adminId} - Sauvegardé`);
    res.json({ 
      success: true, 
      message: 'Quiz image validé avec succès et sauvegardé',
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
    
  } catch (error) {
    console.error('Erreur validation quiz image:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la validation' 
    });
  }
});

// POST rejeter quiz (admin) avec JSON
app.post('/api/admin/quizz/reject', async (req, res) => {
  try {
    const { id, reason } = req.body;
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: 'ID du quiz requis' 
      });
    }

    const pending = db.read('quizz_pending');
    const quizIndex = pending.findIndex(q => q.id === id);
    
    if (quizIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Quiz non trouvé' 
      });
    }

    // Marquer comme rejeté au lieu de supprimer
    pending[quizIndex].status = 'rejected';
    pending[quizIndex].rejectedBy = req.adminId;
    pending[quizIndex].rejectedAt = new Date().toISOString();
    pending[quizIndex].rejectionReason = reason || 'Aucune raison spécifiée';
    pending[quizIndex].ai = geminiAI.getInfo();

    db.write('quizz_pending', pending);

    console.log(`❌ Quiz ${id} rejeté par ${req.adminId}: ${reason || 'Aucune raison spécifiée'} - Sauvegardé`);
    res.json({ 
      success: true,
      message: 'Quiz rejeté et sauvegardé (pas supprimé)',
      reason: reason || 'Aucune raison spécifiée',
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
  } catch (error) {
    console.error('Erreur rejet quiz:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors du rejet' 
    });
  }
});

// POST rejeter quiz image (admin) avec JSON
app.post('/api/admin/quizz-image/reject/:id', async (req, res) => {
  try {
    const quizId = req.params.id;
    const { reason } = req.body;
    
    const pending = db.read('quizz_image_pending');
    const quizIndex = pending.findIndex(q => q.id === quizId);
    
    if (quizIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Quiz image non trouvé' 
      });
    }
    
    // Marquer comme rejeté au lieu de supprimer
    pending[quizIndex].status = 'rejected';
    pending[quizIndex].rejectedBy = req.adminId;
    pending[quizIndex].rejectedAt = new Date().toISOString();
    pending[quizIndex].rejectionReason = reason || 'Aucune raison spécifiée';
    pending[quizIndex].ai = geminiAI.getInfo();
    
    db.write('quizz_image_pending', pending);
    
    console.log(`❌ Quiz image ${quizId} rejeté par ${req.adminId}: ${reason || 'Non spécifiée'} - Sauvegardé`);
    res.json({ 
      success: true, 
      message: 'Quiz image rejeté et sauvegardé (pas supprimé)',
      reason: reason || 'Aucune raison spécifiée',
      bot: global.botname,
      ai: geminiAI.getInfo()
    });
    
  } catch (error) {
    console.error('Erreur rejet quiz image:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors du rejet' 
    });
  }
});

// POST PARKY AI pour assistance quiz avec nouvelle bibliothèque
app.post('/api/parky-assist', async (req, res) => {
  try {
    const { message, type } = req.body;
    
    if (!message || !type) {
      return res.status(400).json({ 
        success: false,
        error: 'Message et type requis' 
      });
    }

    // Utiliser le nouveau service PARKY AI
    const reply = await geminiAI.generateQuizContent(message, type);
    
    let finalReply = reply;
    if (finalReply.length > 2000) {
      finalReply = finalReply.substring(0, 1997) + "...";
    }

    res.json({ 
      success: true, 
      response: finalReply,
      type,
      timestamp: new Date().toISOString(),
      powered_by: `Gemini AI ${geminiAI.model}`,
      library: geminiAI.getInfo().library,
      version: geminiAI.getInfo().version,
      bot: global.botname,
      creator: global.ownername
    });

  } catch (error) {
    console.error('Erreur PARKY AI:', error.message);
    res.json({ 
      success: false, 
      response: `Oups, j'ai eu un petit bug avec PARKY AI ${geminiAI.model}. Réessaie dans quelques secondes ! 😅`,
      error: error.message,
      library: geminiAI.getInfo().library,
      model: geminiAI.model,
      bot: global.botname
    });
  }
});

// GET statistiques réelles avec JSON
app.get('/api/stats', async (req, res) => {
  try {
    const stats = db.getStats();
    const geminiInfo = geminiAI.getInfo();
    
    res.json({
      success: true,
      ...stats,
      totalAll: stats.totalQuestions + stats.totalImageQuestions,
      lastUpdated: new Date().toISOString(),
      database: 'JSON Files',
      ai: {
        provider: 'Gemini AI',
        model: geminiInfo.model,
        library: geminiInfo.library,
        version: geminiInfo.version,
        available: geminiInfo.available,
        configured: geminiInfo.apiKeyConfigured
      },
      bot: global.botname,
      creator: global.ownername,
      version: global.botversion
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du calcul des statistiques' 
    });
  }
});

// GET quiz publics pour API
app.get('/api/public/quiz/random', async (req, res) => {
  try {
    const { type = 'text', count = 1 } = req.query;
    
    let quizzes = [];
    if (type === 'text') {
      quizzes = db.read('quizz');
    } else if (type === 'image') {
      quizzes = db.read('quizz_image');
    } else {
      // Mélanger les deux types
      const textQuizzes = db.read('quizz');
      const imageQuizzes = db.read('quizz_image');
      quizzes = [...textQuizzes, ...imageQuizzes];
    }
    
    if (quizzes.length === 0) {
      return res.json({
        success: true,
        quizzes: [],
        message: 'Aucun quiz disponible',
        bot: global.botname,
        ai: geminiAI.getInfo()
      });
    }
    
    // Sélectionner aléatoirement
    const selectedQuizzes = [];
    const requestedCount = Math.min(parseInt(count), 10); // Max 10
    
    for (let i = 0; i < requestedCount && quizzes.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * quizzes.length);
      selectedQuizzes.push(quizzes.splice(randomIndex, 1)[0]);
    }
    
    res.json({
      success: true,
      quizzes: selectedQuizzes,
      count: selectedQuizzes.length,
      type,
      database: 'JSON Files',
      ai: geminiAI.getInfo(),
      bot: global.botname,
      creator: global.ownername
    });
  } catch (error) {
    console.error('Erreur quiz publics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des quiz' 
    });
  }
});

// Middleware pour gérer les erreurs 404
app.use('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Gestionnaire d'erreurs global
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);
  res.status(500).json({
    success: false,
    error: 'Erreur serveur interne',
    bot: global.botname,
    ai: geminiAI.getInfo()
  });
});

app.listen(PORT, HOST, () => {
  const geminiInfo = geminiAI.getInfo();
  
  console.log(`🌐 ${global.botname} Quiz Web Server avec JSON Database démarré sur ${HOST}:${PORT}`);
  console.log(`🎮 Interface web disponible sur /`);
  console.log(`🤖 Propulsé par PARKY AI ${geminiInfo.model}`);
  console.log(`📚 Bibliothèque: ${geminiInfo.library} v${geminiInfo.version}`);
  console.log(`🗄️ Base de données: JSON Files persistants`);
  console.log(`🔐 Sessions admin persistantes activées`);
  console.log(`💾 Aucune perte de données garantie`);
  console.log(`👤 Créé par ${global.ownername}`);
  console.log(`🔗 Déployable partout: Heroku, Railway, Render, VPS, Panel Hosting`);
  console.log(`🌍 URL publique: ${global.SITE_URL}`);
  console.log(`✏️ Interface de modification des quiz ACTIVÉE`);
  console.log(`🔧 Statut PARKY AI: ${geminiInfo.available ? '✅ Opérationnel' : '⚠️ Mode dégradé'}`);
  
  if (!geminiInfo.apiKeyConfigured) {
    console.log(`⚠️ ATTENTION: Utilisez votre propre clé Gemini AI !`);
  } else {
    console.log(`✅ Gemini AI configuré avec ${geminiInfo.library}`);
  }
});