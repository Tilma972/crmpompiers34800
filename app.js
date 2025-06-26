// Configuration Telegram WebApp
let tg = window.Telegram.WebApp;

// Configuration des webhooks n8n
const N8N_WEBHOOKS = {
    // Agent CRM - Création et validation d'entreprises
    AGENT_CRM: 'https://n8n.dsolution-ia.fr/webhook/crm_agent',

    // API Entreprises - Recherche et gestion des entreprises
    ENTERPRISE_API: 'https://n8n.dsolution-ia.fr/webhook/recherche_entreprise',

    // 🆕 NOUVEAU : Gateway Entities pour actions déterministes
    GATEWAY_ENTITIES: 'https://n8n.dsolution-ia.fr/webhook/gateway_entities',

    // PDF Generator - Génération de factures et bons de commande
    PDF_GENERATOR: 'https://n8n.dsolution-ia.fr/webhook/pdf_generator',

    // Email Workflow - Envoi de formulaires et emails
    EMAIL_WORKFLOW: 'https://n8n.dsolution-ia.fr/webhook/email_workflow',

    // Formulaire Entreprise - Workflows envoi de formulaire auto
    FORM_ENTREPRISE: 'https://n8n.dsolution-ia.fr/webhook/form_entreprise'
};

// Initialisation
tg.ready();
tg.expand();

// Variables d'état
let currentState = 'main_menu';
let selectedEnterprise = null;
let currentAction = null;
let searchTimeout = null;

// Cache de recherche et optimisation
const searchCache = {};
let lastSearchQuery = null;

// Alternative pour tg.showAlert compatible avec toutes les versions Telegram
function showMessage(message) {
    // Essayer d'abord tg.showAlert si disponible
    if (tg.showAlert && typeof tg.showAlert === 'function') {
        try {
            tg.showAlert(message);
            return;
        } catch (error) {
            console.warn('tg.showAlert non supporté:', error);
        }
    }

    // Fallback 1: updateStatus + console
    updateStatus(message);
    console.log('📱 Message:', message);

    // Fallback 2: alert natif du navigateur si nécessaire
    if (message.includes('Erreur') || message.includes('❌')) {
        alert(message);
    }
}

// Données utilisateur depuis Telegram
const user = tg.initDataUnsafe?.user || {
    first_name: 'Stève',
    id: 123456789
};

// Initialisation UI
document.getElementById('userName').textContent = user.first_name;
document.getElementById('userAvatar').textContent = user.first_name.charAt(0).toUpperCase();

// Fonctions de navigation
function showMainMenu() {
    currentState = 'main_menu';
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('searchInterface').classList.add('hidden');
    document.getElementById('conversationState').style.display = 'none';
    updateStatus('Menu principal');
}

function showSearch() {
    currentState = 'search';
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('searchInterface').classList.remove('hidden');
    document.getElementById('searchInput').focus();
    updateStatus('Recherche entreprise');
}

function showAction(actionType) {
    currentAction = actionType;

    if (actionType === 'intelligence') {
        // Redirection vers Agent Orchestrateur
        callAgentOrchestrator('Analyse commerciale avancée demandée');
        return;
    }

    // Actions déterministes
    currentState = 'action_' + actionType;
    document.getElementById('mainMenu').classList.add('hidden');
    showConversationState(actionType);
    updateStatus(`Action: ${getActionLabel(actionType)}`);
}

function showConversationState(actionType) {
    const stateDiv = document.getElementById('conversationState');
    const titleDiv = document.getElementById('stateTitle');
    const contentDiv = document.getElementById('stateContent');

    titleDiv.textContent = getActionLabel(actionType);
    contentDiv.innerHTML = getStateContent(actionType);
    stateDiv.style.display = 'block';
}

function getActionLabel(actionType) {
    const labels = {
        'facture': '📄 Génération Facture',
        'bon_commande': '📋 Bon de Commande',
        'formulaire': '📝 Envoi Formulaire',
        'stats': '📊 Statistiques Express',
        'nouvelle_entreprise': '➕ Nouvelle Entreprise',
        'qualification': '🎯 Qualification Prospect',
        'attribution': '👤 Attribution Prospecteur'
    };
    return labels[actionType] || actionType;
}

function getStateContent(actionType) {
    switch (actionType) {
        case 'facture':
        case 'bon_commande':
        case 'formulaire':
            return `
                <div class="form-group">
                    <label class="form-label">Entreprise concernée :</label>
                    <input type="text" class="form-input" id="enterpriseInput" 
                           placeholder="Tapez le nom de l'entreprise..."
                           oninput="handleEnterpriseSearch(this.value)">
                </div>
                <div id="enterpriseResults" class="search-results"></div>
                <div class="form-buttons">
                    <button class="btn btn-secondary" onclick="showMainMenu()">Annuler</button>
                    <button class="btn btn-primary" onclick="executeAction()" disabled id="executeBtn">
                        Continuer
                    </button>
                </div>
            `;

        case 'qualification':
            return `
                <div class="form-group">
                    <label class="form-label">Entreprise concernée :</label>
                    <input type="text" class="form-input" id="enterpriseInput" 
                           placeholder="Tapez le nom de l'entreprise..."
                           oninput="handleEnterpriseSearch(this.value)">
                </div>
                <div id="enterpriseResults" class="search-results"></div>
                
                <div class="form-group">
                    <label class="form-label">Format encart :</label>
                    <select class="form-select" id="formatEncart">
                        <option value="6X4">6x4 (350€)</option>
                        <option value="6X8">6x8 (500€)</option>
                        <option value="12X4">12x4 (500€)</option>
                        <option value="12PARUTIONS">12 parutions (1800€)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Mois de parution :</label>
                    <select class="form-select" id="moisParution">
                        <option value="Janvier">Janvier</option>
                        <option value="Février">Février</option>
                        <option value="Mars">Mars</option>
                        <option value="Avril">Avril</option>
                        <option value="Mai">Mai</option>
                        <option value="Juin">Juin</option>
                        <option value="Juillet">Juillet</option>
                        <option value="Août">Août</option>
                        <option value="Septembre">Septembre</option>
                        <option value="Octobre">Octobre</option>
                        <option value="Novembre">Novembre</option>
                        <option value="Décembre">Décembre</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Mode de paiement :</label>
                    <select class="form-select" id="modePaiement">
                        <option value="Virement">Virement bancaire</option>
                        <option value="Cheque">Chèque</option>
                        <option value="Carte">Carte bancaire</option>
                        <option value="Especes">Espèces</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Contact (optionnel) :</label>
                    <input type="text" class="form-input" id="interlocuteur" 
                           placeholder="Nom du contact">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email contact (optionnel) :</label>
                    <input type="email" class="form-input" id="emailContact" 
                           placeholder="email@exemple.com">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Commentaires (optionnel) :</label>
                    <textarea class="form-input" id="commentaires" rows="3" 
                              placeholder="Informations supplémentaires..."></textarea>
                </div>
                
                <div class="form-buttons">
                    <button class="btn btn-secondary" onclick="showMainMenu()">Annuler</button>
                    <button class="btn btn-primary" onclick="createQualification()" disabled id="executeBtn">
                        Créer Qualification
                    </button>
                </div>
            `;

        case 'nouvelle_entreprise':
            return `
                <div class="form-group">
                    <label class="form-label">Nom de l'entreprise * :</label>
                    <input type="text" class="form-input" id="nomEntreprise" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Commune :</label>
                    <select class="form-select" id="communeSelect">
                        <option value="">Sélectionner une commune...</option>
                        <option value="2984030">CLERMONT-L'HÉRAULT</option>
                        <option value="2984039">CABRIERES</option>
                        <option value="2984034">BRIGNAC</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Contact :</label>
                    <input type="text" class="form-input" id="contactNom">
                </div>
                <div class="form-group">
                    <label class="form-label">Email :</label>
                    <input type="email" class="form-input" id="emailContact">
                </div>
                <div class="form-buttons">
                    <button class="btn btn-secondary" onclick="showMainMenu()">Annuler</button>
                    <button class="btn btn-primary" onclick="createEnterprise()">
                        🧠 Valider avec Agent CRM
                    </button>
                </div>
            `;

        default:
            return '<p>Fonctionnalité en développement...</p>';
    }
}

// Recherche temps réel
function handleSearch(query) {
    clearTimeout(searchTimeout);

    if (query.length < 3) {
        document.getElementById('searchResults').style.display = 'none';
        return;
    }

    // Éviter les appels identiques consécutifs
    if (query === lastSearchQuery) {
        return;
    }

    // Vérifier le cache
    if (searchCache[query]) {
        displaySearchResults(searchCache[query]);
        updateStatus(`${searchCache[query].length} résultat(s) trouvé(s) (cache)`);
        return;
    }

    updateStatus('🔍 Recherche en cours...');

    searchTimeout = setTimeout(() => {
        lastSearchQuery = query;
        searchEnterprises(query);
    }, 800);
}

function handleEnterpriseSearch(query) {
    clearTimeout(searchTimeout);

    if (query.length < 3) {
        document.getElementById('enterpriseResults').style.display = 'none';
        document.getElementById('executeBtn').disabled = true;
        return;
    }

    // Éviter les appels identiques consécutifs
    if (query === lastSearchQuery) {
        return;
    }

    // Vérifier le cache
    if (searchCache[query]) {
        displayEnterpriseResults(searchCache[query]);
        return;
    }

    searchTimeout = setTimeout(() => {
        lastSearchQuery = query;
        searchEnterprisesForAction(query);
    }, 800);
}

async function searchEnterprises(query) {
    try {
        // Appel à la nouvelle API Entreprises
        const response = await fetch(N8N_WEBHOOKS.ENTERPRISE_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operation: 'getMany',
                search: query,
                limit: 10
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const enterprises = data.data || [];

        // Mettre en cache le résultat
        searchCache[query] = enterprises;

        displaySearchResults(enterprises);
        updateStatus(`${enterprises.length} résultat(s) trouvé(s)`);

    } catch (error) {
        console.error('Erreur recherche:', error);
        updateStatus('❌ Erreur de recherche');
    }
}

async function searchEnterprisesForAction(query) {
    try {
        // Appel à la nouvelle API Entreprises pour les actions
        const response = await fetch(N8N_WEBHOOKS.ENTERPRISE_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operation: 'getMany',
                search: query,
                limit: 5
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const enterprises = data.data || [];

        // Mettre en cache le résultat
        searchCache[query] = enterprises;

        displayEnterpriseResults(enterprises);

    } catch (error) {
        console.error('Erreur recherche entreprise:', error);
        displayEnterpriseResults([]);
    }
}

function displaySearchResults(results) {
    const resultsDiv = document.getElementById('searchResults');

    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">Aucun résultat trouvé</div>';
    } else {
        resultsDiv.innerHTML = results.map(result => `
            <div class="search-result-item" onclick="selectEnterprise(${result.id}, '${result.nom_entreprise}')">
                <div class="result-name">${result.nom_entreprise}</div>
                <div class="result-details">
                    📍 ${result.commune} • 
                    👤 ${result.interlocuteur || 'Pas de contact'} •
                    ✉️ ${result.email || 'Pas d\'email'}
                </div>
            </div>
        `).join('');
    }

    resultsDiv.style.display = 'block';
}

function displayEnterpriseResults(results) {
    const resultsDiv = document.getElementById('enterpriseResults');

    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="search-result-item">Aucun résultat trouvé</div>';
        document.getElementById('executeBtn').disabled = true;
    } else {
        resultsDiv.innerHTML = results.map(result => `
            <div class="search-result-item" onclick="selectEnterpriseForAction(${result.id}, '${result.nom_entreprise}')">
                <div class="result-name">${result.nom_entreprise}</div>
                <div class="result-details">📍 ${result.commune} • 👤 ${result.interlocuteur || 'Pas de contact'}</div>
            </div>
        `).join('');
        document.getElementById('executeBtn').disabled = false;
    }

    resultsDiv.style.display = 'block';
}

function selectEnterprise(id, name) {
    selectedEnterprise = { id, name };
    updateStatus(`Entreprise sélectionnée: ${name}`);

    // Afficher détails entreprise ou actions possibles
    showMessage(`Entreprise sélectionnée: ${name}`);
}

function selectEnterpriseForAction(id, name) {
    console.log('🎯 selectEnterpriseForAction appelée avec:', { id, name });
    selectedEnterprise = { id, name };
    console.log('✅ selectedEnterprise mise à jour:', selectedEnterprise);

    document.getElementById('enterpriseInput').value = name;
    document.getElementById('enterpriseResults').style.display = 'none';
    document.getElementById('executeBtn').disabled = false;
    updateStatus(`✅ ${name} sélectionnée`);
}

async function executeAction() {
    // === DEBUG COMPLET ===
    console.log('🔍 === DIAGNOSTIC EXECUTE ACTION ===');
    console.log('1. selectedEnterprise:', selectedEnterprise);
    console.log('2. currentAction:', currentAction);
    console.log('3. currentState:', currentState);
    console.log('4. executeBtn disabled:', document.getElementById('executeBtn')?.disabled);
    console.log('5. Valeur input entreprise:', document.getElementById('enterpriseInput')?.value);

    // Vérifier selectedEnterprise en détail
    if (selectedEnterprise) {
        console.log('✅ selectedEnterprise existe');
        console.log('   - ID:', selectedEnterprise.id);
        console.log('   - Name:', selectedEnterprise.name);
    } else {
        console.error('❌ selectedEnterprise est NULL ou UNDEFINED');
        console.log('   - Type:', typeof selectedEnterprise);
        console.log('   - Valeur exacte:', selectedEnterprise);
    }

    // Vérifier currentAction en détail
    if (currentAction) {
        console.log('✅ currentAction existe:', currentAction);
    } else {
        console.error('❌ currentAction est NULL ou UNDEFINED');
        console.log('   - Type:', typeof currentAction);
        console.log('   - Valeur exacte:', currentAction);
    }

    console.log('========================================');

    // Test de validation original
    if (!selectedEnterprise || !currentAction) {
        console.error('🚨 VALIDATION ÉCHEC - Détails:');
        console.error('   - selectedEnterprise falsy?', !selectedEnterprise);
        console.error('   - currentAction falsy?', !currentAction);

        // Affichage d'erreur personnalisé selon le cas
        if (!selectedEnterprise && !currentAction) {
            updateStatus('❌ Entreprise ET action manquantes');
            alert('DEBUG: Entreprise ET action manquantes');
        } else if (!selectedEnterprise) {
            updateStatus('❌ Entreprise manquante');
            alert('DEBUG: Entreprise manquante - Avez-vous bien cliqué sur une entreprise dans la liste ?');
        } else if (!currentAction) {
            updateStatus('❌ Action manquante');
            alert('DEBUG: Action manquante - currentAction vaut: ' + currentAction);
        }
        return;
    }

    console.log('✅ Validation OK, continuation...');
    updateStatus('⚡ Exécution en cours...');

    try {
        // Sélection du bon webhook selon l'action
        let webhookUrl;
        switch (currentAction) {
            case 'facture':
            case 'bon_commande':
                webhookUrl = N8N_WEBHOOKS.PDF_GENERATOR;
                console.log('🔗 Webhook PDF_GENERATOR sélectionné');
                break;
            case 'formulaire':
                webhookUrl = N8N_WEBHOOKS.FORM_ENTREPRISE;
                console.log('🔗 Webhook FORM_ENTREPRISE sélectionné');
                break;
            default:
                webhookUrl = N8N_WEBHOOKS.AGENT_CRM;
                console.log('🔗 Webhook AGENT_CRM par défaut');
        }

        console.log('🌐 URL webhook:', webhookUrl);

        const payload = {
            action: currentAction,
            data: {
                enterprise_id: selectedEnterprise.id,
                enterprise_name: selectedEnterprise.name,
                user_id: user.id
            }
        };

        console.log('📦 Payload à envoyer:', JSON.stringify(payload, null, 2));

        // Appel webhook n8n avec payload standardisé
        console.log('🚀 Envoi requête vers n8n...');
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('📡 Réponse reçue - Status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Résultat n8n:', result);

        updateStatus('✅ Action terminée');
        alert(`✅ ${getActionLabel(currentAction)} exécutée avec succès!`);
        showMainMenu();

    } catch (error) {
        console.error('💥 Erreur complète:', error);
        console.error('💥 Stack trace:', error.stack);
        alert('❌ Erreur lors de l\'exécution: ' + error.message);
        updateStatus('❌ Erreur d\'exécution');
    }
}

async function createQualification() {
    if (!selectedEnterprise) {
        showMessage('Veuillez sélectionner une entreprise');
        return;
    }

    // Récupération des données du formulaire
    const formatEncart = document.getElementById('formatEncart').value;
    const moisParution = document.getElementById('moisParution').value;
    const modePaiement = document.getElementById('modePaiement').value;
    const interlocuteur = document.getElementById('interlocuteur').value;
    const emailContact = document.getElementById('emailContact').value;
    const commentaires = document.getElementById('commentaires').value;

    updateStatus('🎯 Création qualification...');

    try {
        const response = await fetch(N8N_WEBHOOKS.GATEWAY_ENTITIES, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'qualification',
                data: {
                    enterprise_id: selectedEnterprise.id,
                    enterprise_name: selectedEnterprise.name,
                    format_encart: formatEncart,
                    mois_parution: moisParution,
                    mode_paiement: modePaiement,
                    interlocuteur: interlocuteur || null,
                    email_contact: emailContact || null,
                    commentaires: commentaires || null,
                    user_id: user.id
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.success === false) {
            throw new Error(result.error?.message || 'Erreur création qualification');
        }
        
        showMessage(`✅ Qualification créée avec succès!`);
        updateStatus('✅ Qualification créée');
        showMainMenu();
        
    } catch (error) {
        console.error('❌ Erreur création qualification:', error);
        showMessage(`❌ Erreur: ${error.message}`);
        updateStatus('❌ Erreur création qualification');
    }
}

async function createEnterprise() {
    const nom = document.getElementById('nomEntreprise').value;
    const commune = document.getElementById('communeSelect').value;
    const contact = document.getElementById('contactNom').value;
    const email = document.getElementById('emailContact').value;

    if (!nom) {
        showMessage('Le nom de l\'entreprise est obligatoire');
        return;
    }

    updateStatus('🧠 Validation Agent CRM...');

    try {
        // Appel Agent CRM pour validation et création
        const response = await fetch(N8N_WEBHOOKS.AGENT_CRM, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'create_enterprise',
                data: {
                    nom: nom,
                    commune: commune,
                    contact: contact,
                    email: email,
                    user_id: user.id
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        showMessage('✅ Entreprise créée et validée par l\'Agent CRM!');
        updateStatus('✅ Entreprise créée');
        showMainMenu();

    } catch (error) {
        console.error('Erreur création:', error);
        showMessage('❌ Erreur lors de la création');
        updateStatus('❌ Erreur création');
    }
}

async function callAgentOrchestrator(request) {
    updateStatus('🧠 Agent Orchestrateur activé...');

    try {
        // Appel direct à l'Agent CRM (orchestrateur intégré)
        const response = await fetch(N8N_WEBHOOKS.AGENT_CRM, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'orchestrate_intelligence',
                data: {
                    request: request,
                    user_id: user.id
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Redirection vers Agent via Telegram avec résultat
        tg.sendData(JSON.stringify({
            type: 'agent_request',
            request: request,
            user_id: user.id,
            orchestrator_response: result
        }));

    } catch (error) {
        console.error('Erreur Agent Orchestrateur:', error);
        showMessage('❌ Erreur communication Agent');
    }
}

function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

// Gestion des boutons Telegram
tg.MainButton.setText('Fermer l\'app');
tg.MainButton.onClick(() => {
    tg.close();
});
tg.MainButton.show();

// Initialisation
console.log('🚒 CRM Mini App initialisée');
updateStatus('🟢 Application prête');
