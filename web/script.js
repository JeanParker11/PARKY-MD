// Variables globales
let currentSection = 'home';
let questionCount = 0;
let adminToken = null;
let editingQuizId = null;
let isAdminLoggedIn = false;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadStats();
    checkAdminSession(); // Vérifier si déjà connecté
    
    // Rafraîchir les stats toutes les 30 secondes
    setInterval(loadStats, 30000);
});

function initializeApp() {
    // Navigation
    setupNavigation();
    
    // Quiz forms
    setupQuizForms();
    
    // Assistant PARKY
    setupAssistant();
    
    // Pairing
    setupPairing();
    
    // Admin
    setupAdmin();
    
    // Ajouter la première question par défaut
    addQuestion();
}

// Vérifier la session admin au chargement
async function checkAdminSession() {
    try {
        const response = await fetch('/api/admin/check-session', {
            headers: {
                'Authorization': localStorage.getItem('adminToken') || ''
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            adminToken = localStorage.getItem('adminToken');
            isAdminLoggedIn = true;
            console.log('✅ Session admin restaurée');
            
            // Si on est sur la section admin, afficher le panel
            if (currentSection === 'admin') {
                showAdminPanel();
                loadPendingQuizzes();
            }
        } else {
            // Session expirée, nettoyer
            localStorage.removeItem('adminToken');
            adminToken = null;
            isAdminLoggedIn = false;
        }
    } catch (error) {
        console.error('Erreur vérification session:', error);
        localStorage.removeItem('adminToken');
        adminToken = null;
        isAdminLoggedIn = false;
    }
}

function setupNavigation() {
    // Navigation links
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            if (this.classList.contains('nav-link')) {
                this.classList.add('active');
            }
            
            // Close mobile menu
            document.getElementById('nav-menu').classList.remove('active');
            document.getElementById('nav-toggle').classList.remove('active');
        });
    });
    
    // Mobile menu toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
    });
}

function setupQuizForms() {
    // Quiz tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tab}`).classList.add('active');
        });
    });
    
    // Quiz text form
    const quizForm = document.getElementById('quiz-form');
    if (quizForm) {
        quizForm.addEventListener('submit', handleQuizSubmit);
    }
    
    // Quiz image form
    const quizImageForm = document.getElementById('quiz-image-form');
    if (quizImageForm) {
        quizImageForm.addEventListener('submit', handleQuizImageSubmit);
    }
    
    // Add question button
    const addQuestionBtn = document.getElementById('add-question-btn');
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', addQuestion);
    }
}

function setupAssistant() {
    // Ask PARKY button
    const askParkyBtn = document.getElementById('ask-parky-btn');
    if (askParkyBtn) {
        askParkyBtn.addEventListener('click', askParky);
    }
    
    // PARKY input with Enter key
    const parkyInput = document.getElementById('parky-input');
    if (parkyInput) {
        parkyInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askParky();
            }
        });
    }
    
    // Suggestion buttons
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const suggestion = this.dataset.suggestion;
            document.getElementById('parky-input').value = suggestion;
            askParky();
        });
    });
}

function setupPairing() {
    const generatePairingBtn = document.getElementById('generate-pairing-btn');
    if (generatePairingBtn) {
        generatePairingBtn.addEventListener('click', generatePairingCode);
    }
    
    // Enter key for phone number
    const phoneInput = document.getElementById('phone-number');
    if (phoneInput) {
        phoneInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                generatePairingCode();
            }
        });
    }
}

function setupAdmin() {
    // Admin login
    const adminLoginBtn = document.getElementById('btn-admin-login');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', handleAdminLogin);
    }
    
    // Admin logout
    const adminLogoutBtn = document.getElementById('btn-admin-logout');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleAdminLogout);
    }
    
    // Enter key for admin password
    const adminPasswordInput = document.getElementById('admin-password');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleAdminLogin();
            }
        });
    }
}

function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // Special actions for admin section
        if (sectionName === 'admin') {
            if (isAdminLoggedIn && adminToken) {
                showAdminPanel();
                loadPendingQuizzes();
            } else {
                showAdminLogin();
            }
        }
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addQuestion() {
    questionCount++;
    const container = document.getElementById('questions-container');
    
    const questionHtml = `
        <div class="question-card" data-question="${questionCount}">
            <div class="question-number">Question ${questionCount}</div>
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-question-circle"></i>
                    Question
                </label>
                <input type="text" class="form-input question-input" placeholder="Tapez votre question ici..." required>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-list"></i>
                    Options de réponse
                </label>
                <div class="options-grid">
                    <input type="text" class="form-input option-a" placeholder="Option A" required>
                    <input type="text" class="form-input option-b" placeholder="Option B" required>
                    <input type="text" class="form-input option-c" placeholder="Option C" required>
                    <input type="text" class="form-input option-d" placeholder="Option D" required>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-check-circle"></i>
                    Réponse correcte
                </label>
                <select class="form-select answer-select" required>
                    <option value="">Sélectionnez la bonne réponse</option>
                    <option value="a">A</option>
                    <option value="b">B</option>
                    <option value="c">C</option>
                    <option value="d">D</option>
                </select>
            </div>
            
            ${questionCount > 1 ? `
                <div style="text-align: right; margin-top: 1rem;">
                    <button type="button" class="btn btn-outline" onclick="removeQuestion(${questionCount})" style="background: #fee2e2; color: #dc2626; border-color: #fecaca;">
                        <i class="fas fa-trash"></i>
                        Supprimer
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
}

function removeQuestion(questionNumber) {
    const questionCard = document.querySelector(`[data-question="${questionNumber}"]`);
    if (questionCard) {
        questionCard.remove();
    }
}

async function handleQuizSubmit(e) {
    e.preventDefault();
    
    const proposerName = document.getElementById('proposer-name').value.trim();
    if (!proposerName) {
        showToast('Veuillez entrer votre nom', 'error');
        return;
    }
    
    const questions = [];
    const questionCards = document.querySelectorAll('.question-card');
    
    for (let card of questionCards) {
        const question = card.querySelector('.question-input').value.trim();
        const optionA = card.querySelector('.option-a').value.trim();
        const optionB = card.querySelector('.option-b').value.trim();
        const optionC = card.querySelector('.option-c').value.trim();
        const optionD = card.querySelector('.option-d').value.trim();
        const answer = card.querySelector('.answer-select').value;
        
        if (!question || !optionA || !optionB || !optionC || !optionD || !answer) {
            showToast('Veuillez remplir tous les champs de toutes les questions', 'error');
            return;
        }
        
        questions.push({
            question,
            options: { a: optionA, b: optionB, c: optionC, d: optionD },
            answer
        });
    }
    
    if (questions.length === 0) {
        showToast('Veuillez ajouter au moins une question', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/quizz/propose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proposedBy: proposerName, questions })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Quiz proposé avec succès ! ${result.questionsCount} question(s) sauvegardée(s) dans La database.`, 'success');
            document.getElementById('quiz-form').reset();
            document.getElementById('questions-container').innerHTML = '';
            questionCount = 0;
            addQuestion();
        } else {
            showToast(result.error || 'Erreur lors de la proposition', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion à La database', 'error');
    }
}

async function handleQuizImageSubmit(e) {
    e.preventDefault();
    
    const proposerName = document.getElementById('image-proposer-name').value.trim();
    const imageUrl = document.getElementById('image-url').value.trim();
    const question = document.getElementById('image-question').value.trim();
    const optionA = document.getElementById('image-option-a').value.trim();
    const optionB = document.getElementById('image-option-b').value.trim();
    const optionC = document.getElementById('image-option-c').value.trim();
    const optionD = document.getElementById('image-option-d').value.trim();
    const answer = document.getElementById('image-answer').value;
    const category = document.getElementById('image-category').value.trim();
    
    if (!proposerName || !imageUrl || !question || !optionA || !optionB || !optionC || !optionD || !answer) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/quizz-image/propose', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                proposedBy: proposerName,
                imageUrl,
                question,
                options: { a: optionA, b: optionB, c: optionC, d: optionD },
                answer,
                category
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Quiz image proposé avec succès et sauvegardé dans La database !', 'success');
            document.getElementById('quiz-image-form').reset();
        } else {
            showToast(result.error || 'Erreur lors de la proposition', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion à La database', 'error');
    }
}

async function generatePairingCode() {
    const phoneNumber = document.getElementById('phone-number').value.trim();
    
    if (!phoneNumber) {
        showToast('Veuillez entrer votre numéro de téléphone', 'error');
        return;
    }
    
    if (!/^\d{8,15}$/.test(phoneNumber)) {
        showToast('Numéro invalide. Utilisez le format international sans + ni espaces', 'error');
        return;
    }
    
    const btn = document.getElementById('generate-pairing-btn');
    const originalText = btn.innerHTML;
    
    try {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération avec Baileys...';
        btn.disabled = true;
        
        const response = await fetch('/api/pairing/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('pairing-code-text').textContent = result.code;
            document.getElementById('pairing-result').style.display = 'block';
            showToast('Code de pairing RÉEL généré avec Baileys !', 'success');
        } else {
            showToast(result.error || 'Erreur lors de la génération du code', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function askParky() {
    const input = document.getElementById('parky-input');
    const message = input.value.trim();
    
    if (!message) {
        showToast('Veuillez entrer une question pour PARKY', 'error');
        return;
    }
    
    // Add user message
    addChatMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Add typing indicator
    const typingId = addChatMessage('PARKY réfléchit avec PARKY AI...', 'bot', true);
    
    try {
        const response = await fetch('/api/parky-assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, type: 'create' })
        });
        
        const result = await response.json();
        
        // Remove typing indicator
        removeChatMessage(typingId);
        
        if (result.success) {
            addChatMessage(result.response + '\n\n🤖 PARKY-AI', 'bot');
        } else {
            addChatMessage(result.response || 'Désolé, j\'ai eu un problème technique avec PARKY AI.', 'bot');
        }
    } catch (error) {
        console.error('Erreur PARKY:', error);
        removeChatMessage(typingId);
        addChatMessage('Oups, j\'ai eu un petit bug avec PARKY AI. Réessaie dans quelques secondes ! 😅', 'bot');
    }
}

function addChatMessage(text, sender, isTyping = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    const messageHtml = `
        <div class="message ${sender}-message" id="${messageId}">
            <div class="message-avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <p>${isTyping ? '<i class="fas fa-spinner fa-spin"></i> ' + text : text}</p>
            </div>
        </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageId;
}

function removeChatMessage(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

async function handleAdminLogin() {
    const password = document.getElementById('admin-password').value.trim();
    
    if (!password) {
        showAdminError('Veuillez entrer le mot de passe');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            adminToken = result.token;
            isAdminLoggedIn = true;
            
            // Sauvegarder le token dans localStorage pour persistance
            localStorage.setItem('adminToken', result.token);
            
            showAdminPanel();
            loadPendingQuizzes();
            showToast('Connexion administrateur réussie - Session sauvegardée dans La database', 'success');
        } else {
            showAdminError(result.error || 'Mot de passe incorrect');
        }
    } catch (error) {
        console.error('Erreur login:', error);
        showAdminError('Erreur de connexion');
    }
}

async function handleAdminLogout() {
    try {
        await fetch('/api/admin/logout', {
            method: 'POST',
            headers: { 'Authorization': adminToken }
        });
    } catch (error) {
        console.error('Erreur logout:', error);
    }
    
    // Nettoyer localement
    adminToken = null;
    isAdminLoggedIn = false;
    localStorage.removeItem('adminToken');
    
    showAdminLogin();
    showToast('Déconnexion réussie - Session supprimée de La database', 'success');
}

function showAdminLogin() {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-password').value = '';
    hideAdminError();
}

function showAdminPanel() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
}

function showAdminError(message) {
    const errorDiv = document.getElementById('admin-login-error');
    const errorText = document.getElementById('error-text');
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
}

function hideAdminError() {
    document.getElementById('admin-login-error').style.display = 'none';
}

async function loadPendingQuizzes() {
    if (!adminToken) return;
    
    try {
        // Load text quizzes
        const textResponse = await fetch('/api/admin/quizz/pending', {
            headers: { 'Authorization': adminToken }
        });
        const textResult = await textResponse.json();
        
        if (textResult.success) {
            displayPendingQuizzes(textResult.quizzes);
        }
        
        // Load image quizzes
        const imageResponse = await fetch('/api/admin/quizz-image/pending', {
            headers: { 'Authorization': adminToken }
        });
        const imageResult = await imageResponse.json();
        
        if (imageResult.success) {
            displayPendingImageQuizzes(imageResult.quizzes);
        }
    } catch (error) {
        console.error('Erreur chargement quiz pending:', error);
        showToast('Erreur lors du chargement des quiz en attente depuis La database', 'error');
    }
}

function displayPendingQuizzes(quizzes) {
    const container = document.getElementById('pending-quizzes');
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">Aucun quiz en attente dans La database</p>';
        return;
    }
    
    let html = '';
    quizzes.forEach(quiz => {
        html += `
            <div class="quiz-pending-item">
                <h6>Quiz de ${quiz.proposedBy}</h6>
                <small>Proposé le ${new Date(quiz.proposedAt).toLocaleDateString('fr-FR')} - Sauvegardé dans La database</small>
                <p><strong>${quiz.questions.length} question(s)</strong></p>
                
                ${quiz.questions.map((q, index) => `
                    <div class="question-preview">
                        <strong>Q${index + 1}:</strong> ${q.question}
                        <ul class="option-list">
                            <li ${q.answer === 'a' ? 'class="correct-answer"' : ''}>A) ${q.options.a}</li>
                            <li ${q.answer === 'b' ? 'class="correct-answer"' : ''}>B) ${q.options.b}</li>
                            <li ${q.answer === 'c' ? 'class="correct-answer"' : ''}>C) ${q.options.c}</li>
                            <li ${q.answer === 'd' ? 'class="correct-answer"' : ''}>D) ${q.options.d}</li>
                        </ul>
                    </div>
                `).join('')}
                
                <div class="btn-group">
                    <button class="btn btn-primary" onclick="editQuiz('${quiz.id}')">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn btn-primary" onclick="validateQuiz('${quiz.id}')" style="background: #10b981;">
                        <i class="fas fa-check"></i> Valider
                    </button>
                    <button class="btn btn-outline" onclick="rejectQuiz('${quiz.id}')" style="background: #fee2e2; color: #dc2626; border-color: #fecaca;">
                        <i class="fas fa-times"></i> Rejeter
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function displayPendingImageQuizzes(quizzes) {
    const container = document.getElementById('pending-image-quizzes');
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280;">Aucun quiz image en attente dans La database</p>';
        return;
    }
    
    let html = '';
    quizzes.forEach(quiz => {
        html += `
            <div class="quiz-pending-item">
                <h6>Quiz image de ${quiz.proposedBy}</h6>
                <small>Proposé le ${new Date(quiz.proposedAt).toLocaleDateString('fr-FR')} - Sauvegardé dans La database</small>
                ${quiz.category ? `<p><strong>Catégorie:</strong> ${quiz.category}</p>` : ''}
                
                <div class="question-preview">
                    <img src="${quiz.imageUrl}" alt="Quiz image" style="max-width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">
                    <strong>Question:</strong> ${quiz.question}
                    <ul class="option-list">
                        <li ${quiz.answer === 'a' ? 'class="correct-answer"' : ''}>A) ${quiz.options.a}</li>
                        <li ${quiz.answer === 'b' ? 'class="correct-answer"' : ''}>B) ${quiz.options.b}</li>
                        <li ${quiz.answer === 'c' ? 'class="correct-answer"' : ''}>C) ${quiz.options.c}</li>
                        <li ${quiz.answer === 'd' ? 'class="correct-answer"' : ''}>D) ${quiz.options.d}</li>
                    </ul>
                </div>
                
                <div class="btn-group">
                    <button class="btn btn-primary" onclick="editImageQuiz('${quiz.id}')">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button class="btn btn-primary" onclick="validateImageQuiz('${quiz.id}')" style="background: #10b981;">
                        <i class="fas fa-check"></i> Valider
                    </button>
                    <button class="btn btn-outline" onclick="rejectImageQuiz('${quiz.id}')" style="background: #fee2e2; color: #dc2626; border-color: #fecaca;">
                        <i class="fas fa-times"></i> Rejeter
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function validateQuiz(quizId) {
    if (!adminToken) return;
    
    try {
        const response = await fetch('/api/admin/quizz/validate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': adminToken 
            },
            body: JSON.stringify({ id: quizId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message + ' (JSON)', 'success');
            loadPendingQuizzes();
            loadStats();
        } else {
            showToast(result.error || 'Erreur lors de la validation', 'error');
        }
    } catch (error) {
        console.error('Erreur validation:', error);
        showToast('Erreur de connexion à La database', 'error');
    }
}

async function validateImageQuiz(quizId) {
    if (!adminToken) return;
    
    try {
        const response = await fetch(`/api/admin/quizz-image/validate/${quizId}`, {
            method: 'POST',
            headers: { 'Authorization': adminToken }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(result.message + ' (JSON)', 'success');
            loadPendingQuizzes();
            loadStats();
        } else {
            showToast(result.error || 'Erreur lors de la validation', 'error');
        }
    } catch (error) {
        console.error('Erreur validation image:', error);
        showToast('Erreur de connexion à La database', 'error');
    }
}

async function rejectQuiz(quizId) {
    if (!adminToken) return;
    
    const reason = prompt('Raison du rejet (optionnel):');
    
    try {
        const response = await fetch('/api/admin/quizz/reject', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': adminToken 
            },
            body: JSON.stringify({ id: quizId, reason })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Quiz rejeté et sauvegardé dans La database (pas supprimé)', 'success');
            loadPendingQuizzes();
        } else {
            showToast(result.error || 'Erreur lors du rejet', 'error');
        }
    } catch (error) {
        console.error('Erreur rejet:', error);
        showToast('Erreur de connexion à La database', 'error');
    }
}

async function rejectImageQuiz(quizId) {
    if (!adminToken) return;
    
    const reason = prompt('Raison du rejet (optionnel):');
    
    try {
        const response = await fetch(`/api/admin/quizz-image/reject/${quizId}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': adminToken 
            },
            body: JSON.stringify({ reason })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Quiz image rejeté et sauvegardé dans La database (pas supprimé)', 'success');
            loadPendingQuizzes();
        } else {
            showToast(result.error || 'Erreur lors du rejet', 'error');
        }
    } catch (error) {
        console.error('Erreur rejet image:', error);
        showToast('Erreur de connexion à La database', 'error');
    }
}

// 🔧 NOUVELLE FONCTIONNALITÉ : Interface de modification des quiz
async function editQuiz(quizId) {
    if (!adminToken) return;
    
    try {
        // Récupérer les détails du quiz
        const response = await fetch('/api/admin/quizz/pending', {
            headers: { 'Authorization': adminToken }
        });
        const result = await response.json();
        
        if (!result.success) {
            showToast('Erreur lors du chargement du quiz', 'error');
            return;
        }
        
        const quiz = result.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            showToast('Quiz non trouvé', 'error');
            return;
        }
        
        // Créer l'interface de modification
        showEditQuizModal(quiz);
        
    } catch (error) {
        console.error('Erreur edit quiz:', error);
        showToast('Erreur lors du chargement du quiz', 'error');
    }
}

async function editImageQuiz(quizId) {
    if (!adminToken) return;
    
    try {
        // Récupérer les détails du quiz image
        const response = await fetch('/api/admin/quizz-image/pending', {
            headers: { 'Authorization': adminToken }
        });
        const result = await response.json();
        
        if (!result.success) {
            showToast('Erreur lors du chargement du quiz image', 'error');
            return;
        }
        
        const quiz = result.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            showToast('Quiz image non trouvé', 'error');
            return;
        }
        
        // Créer l'interface de modification
        showEditImageQuizModal(quiz);
        
    } catch (error) {
        console.error('Erreur edit quiz image:', error);
        showToast('Erreur lors du chargement du quiz image', 'error');
    }
}

function showEditQuizModal(quiz) {
    // Créer le modal de modification
    const modalHtml = `
        <div class="modal-overlay" id="edit-quiz-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Modifier le Quiz</h3>
                    <button class="modal-close" onclick="closeEditQuizModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="edit-quiz-form">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-user"></i>
                                Proposé par
                            </label>
                            <input type="text" id="edit-proposer-name" class="form-input" value="${quiz.proposedBy}" readonly>
                        </div>
                        
                        <div id="edit-questions-container">
                            ${quiz.questions.map((q, index) => `
                                <div class="question-card" data-question="${index}">
                                    <div class="question-number">Question ${index + 1}</div>
                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-question-circle"></i>
                                            Question
                                        </label>
                                        <input type="text" class="form-input question-input" value="${q.question}" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-list"></i>
                                            Options de réponse
                                        </label>
                                        <div class="options-grid">
                                            <input type="text" class="form-input option-a" value="${q.options.a}" required>
                                            <input type="text" class="form-input option-b" value="${q.options.b}" required>
                                            <input type="text" class="form-input option-c" value="${q.options.c}" required>
                                            <input type="text" class="form-input option-d" value="${q.options.d}" required>
                                        </div>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-check-circle"></i>
                                            Réponse correcte
                                        </label>
                                        <select class="form-select answer-select" required>
                                            <option value="">Sélectionnez la bonne réponse</option>
                                            <option value="a" ${q.answer === 'a' ? 'selected' : ''}>A</option>
                                            <option value="b" ${q.answer === 'b' ? 'selected' : ''}>B</option>
                                            <option value="c" ${q.answer === 'c' ? 'selected' : ''}>C</option>
                                            <option value="d" ${q.answer === 'd' ? 'selected' : ''}>D</option>
                                        </select>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="closeEditQuizModal()">
                                <i class="fas fa-times"></i>
                                Annuler
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i>
                                Sauvegarder les modifications
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Ajouter le modal au DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Ajouter l'événement de soumission
    document.getElementById('edit-quiz-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveQuizEdits(quiz.id);
    });
    
    // Stocker l'ID du quiz en cours d'édition
    editingQuizId = quiz.id;
}

function showEditImageQuizModal(quiz) {
    // Créer le modal de modification pour quiz image
    const modalHtml = `
        <div class="modal-overlay" id="edit-quiz-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Modifier le Quiz Image</h3>
                    <button class="modal-close" onclick="closeEditQuizModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="edit-quiz-form">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-user"></i>
                                Proposé par
                            </label>
                            <input type="text" id="edit-proposer-name" class="form-input" value="${quiz.proposedBy}" readonly>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-link"></i>
                                URL de l'image
                            </label>
                            <input type="url" id="edit-image-url" class="form-input" value="${quiz.imageUrl}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Image actuelle</label>
                            <img src="${quiz.imageUrl}" alt="Quiz image" style="max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-question-circle"></i>
                                Question
                            </label>
                            <input type="text" id="edit-image-question" class="form-input" value="${quiz.question}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-list"></i>
                                Options de réponse
                            </label>
                            <div class="options-grid">
                                <input type="text" id="edit-image-option-a" class="form-input" value="${quiz.options.a}" required>
                                <input type="text" id="edit-image-option-b" class="form-input" value="${quiz.options.b}" required>
                                <input type="text" id="edit-image-option-c" class="form-input" value="${quiz.options.c}" required>
                                <input type="text" id="edit-image-option-d" class="form-input" value="${quiz.options.d}" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-check-circle"></i>
                                Réponse correcte
                            </label>
                            <select id="edit-image-answer" class="form-select" required>
                                <option value="">Sélectionnez la bonne réponse</option>
                                <option value="a" ${quiz.answer === 'a' ? 'selected' : ''}>A</option>
                                <option value="b" ${quiz.answer === 'b' ? 'selected' : ''}>B</option>
                                <option value="c" ${quiz.answer === 'c' ? 'selected' : ''}>C</option>
                                <option value="d" ${quiz.answer === 'd' ? 'selected' : ''}>D</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-tag"></i>
                                Catégorie
                            </label>
                            <input type="text" id="edit-image-category" class="form-input" value="${quiz.category || ''}">
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="closeEditQuizModal()">
                                <i class="fas fa-times"></i>
                                Annuler
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i>
                                Sauvegarder les modifications
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    // Ajouter le modal au DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Ajouter l'événement de soumission
    document.getElementById('edit-quiz-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveImageQuizEdits(quiz.id);
    });
    
    // Stocker l'ID du quiz en cours d'édition
    editingQuizId = quiz.id;
}

async function saveQuizEdits(quizId) {
    if (!adminToken) return;
    
    try {
        // Récupérer les données modifiées
        const questions = [];
        const questionCards = document.querySelectorAll('#edit-questions-container .question-card');
        
        for (let card of questionCards) {
            const question = card.querySelector('.question-input').value.trim();
            const optionA = card.querySelector('.option-a').value.trim();
            const optionB = card.querySelector('.option-b').value.trim();
            const optionC = card.querySelector('.option-c').value.trim();
            const optionD = card.querySelector('.option-d').value.trim();
            const answer = card.querySelector('.answer-select').value;
            
            if (!question || !optionA || !optionB || !optionC || !optionD || !answer) {
                showToast('Veuillez remplir tous les champs', 'error');
                return;
            }
            
            questions.push({
                question,
                options: { a: optionA, b: optionB, c: optionC, d: optionD },
                answer
            });
        }
        
        // Envoyer les modifications au serveur
        const response = await fetch(`/api/admin/quizz/edit/${quizId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': adminToken 
            },
            body: JSON.stringify({ questions })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Quiz modifié avec succès et sauvegardé dans La database !', 'success');
            closeEditQuizModal();
            loadPendingQuizzes();
        } else {
            showToast(result.error || 'Erreur lors de la modification', 'error');
        }
    } catch (error) {
        console.error('Erreur sauvegarde quiz:', error);
        showToast('Erreur de connexion à La database', 'error');
    }
}

async function saveImageQuizEdits(quizId) {
    if (!adminToken) return;
    
    try {
        // Récupérer les données modifiées
        const imageUrl = document.getElementById('edit-image-url').value.trim();
        const question = document.getElementById('edit-image-question').value.trim();
        const optionA = document.getElementById('edit-image-option-a').value.trim();
        const optionB = document.getElementById('edit-image-option-b').value.trim();
        const optionC = document.getElementById('edit-image-option-c').value.trim();
        const optionD = document.getElementById('edit-image-option-d').value.trim();
        const answer = document.getElementById('edit-image-answer').value;
        const category = document.getElementById('edit-image-category').value.trim();
        
        if (!imageUrl || !question || !optionA || !optionB || !optionC || !optionD || !answer) {
            showToast('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }
        
        // Envoyer les modifications au serveur
        const response = await fetch(`/api/admin/quizz-image/edit/${quizId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': adminToken 
            },
            body: JSON.stringify({
                imageUrl,
                question,
                options: { a: optionA, b: optionB, c: optionC, d: optionD },
                answer,
                category
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Quiz image modifié avec succès et sauvegardé dans La database !', 'success');
            closeEditQuizModal();
            loadPendingQuizzes();
        } else {
            showToast(result.error || 'Erreur lors de la modification', 'error');
        }
    } catch (error) {
        console.error('Erreur sauvegarde quiz image:', error);
        showToast('Erreur de connexion à La database', 'error');
    }
}

function closeEditQuizModal() {
    const modal = document.getElementById('edit-quiz-modal');
    if (modal) {
        modal.remove();
    }
    editingQuizId = null;
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        if (stats.success) {
            document.getElementById('total-questions').textContent = stats.totalQuestions;
            document.getElementById('image-questions').textContent = stats.totalImageQuestions;
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    // Update content
    toastMessage.textContent = message;
    
    // Update icon and style
    toastIcon.className = 'toast-icon fas';
    if (type === 'success') {
        toastIcon.classList.add('fa-check-circle');
        toastIcon.style.color = '#10b981';
    } else if (type === 'error') {
        toastIcon.classList.add('fa-exclamation-circle');
        toastIcon.style.color = '#ef4444';
    } else if (type === 'warning') {
        toastIcon.classList.add('fa-exclamation-triangle');
        toastIcon.style.color = '#f59e0b';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
}