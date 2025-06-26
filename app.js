// Configuration Telegram WebApp
let tg = window.Telegram.WebApp;

// Configuration des webhooks n8n
const N8N_WEBHOOKS = {
    // Agent CRM - Création et validation d'entreprises
    AGENT_CRM: 'https://n8n.dsolution-ia.fr/webhook/crm_agent',
    
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
    switch(actionType) {
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
    
    if (query.length < 2) {
        document.getElementById('searchResults').style.display = 'none';
        return;
    }

    updateStatus('🔍 Recherche en cours...');
    
    searchTimeout = setTimeout(() => {
        searchEnterprises(query);
    }, 300);
}

function handleEnterpriseSearch(query) {
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        document.getElementById('enterpriseResults').style.display = 'none';
        document.getElementById('executeBtn').disabled = true;
        return;
    }
    
    searchTimeout = setTimeout(() => {
        searchEnterprisesForAction(query);
    }, 300);
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
    tg.showAlert(`Entreprise sélectionnée: ${name}`);
}

function selectEnterpriseForAction(id, name) {
    selectedEnterprise = { id, name };
    document.getElementById('enterpriseInput').value = name;
    document.getElementById('enterpriseResults').style.display = 'none';
    document.getElementById('executeBtn').disabled = false;
    updateStatus(`✅ ${name} sélectionnée`);
}

async function executeAction() {
    if (!selectedEnterprise || !currentAction) {
        tg.showAlert('Erreur: entreprise ou action manquante');
        return;
    }

    updateStatus('⚡ Exécution en cours...');
    
    try {
        // Sélection du bon webhook selon l'action
        let webhookUrl;
        switch(currentAction) {
            case 'facture':
            case 'bon_commande':
                webhookUrl = N8N_WEBHOOKS.PDF_GENERATOR;
                break;
            case 'formulaire':
                webhookUrl = N8N_WEBHOOKS.FORM_ENTREPRISE;
                break;
            default:
                webhookUrl = N8N_WEBHOOKS.AGENT_CRM;
        }

        // Appel webhook n8n avec payload standardisé
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: currentAction,
                data: {
                    enterprise_id: selectedEnterprise.id,
                    enterprise_name: selectedEnterprise.name,
                    user_id: user.id
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        tg.showAlert(`✅ ${getActionLabel(currentAction)} exécutée avec succès!`);
        updateStatus('✅ Action terminée');
        showMainMenu();
        
    } catch (error) {
        console.error('Erreur exécution:', error);
        tg.showAlert('❌ Erreur lors de l\'exécution');
        updateStatus('❌ Erreur d\'exécution');
    }
}

async function createEnterprise() {
    const nom = document.getElementById('nomEntreprise').value;
    const commune = document.getElementById('communeSelect').value;
    const contact = document.getElementById('contactNom').value;
    const email = document.getElementById('emailContact').value;

    if (!nom) {
        tg.showAlert('Le nom de l\'entreprise est obligatoire');
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
        
        tg.showAlert('✅ Entreprise créée et validée par l\'Agent CRM!');
        updateStatus('✅ Entreprise créée');
        showMainMenu();
        
    } catch (error) {
        console.error('Erreur création:', error);
        tg.showAlert('❌ Erreur lors de la création');
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
        tg.showAlert('❌ Erreur communication Agent');
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
