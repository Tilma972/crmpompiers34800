// Configuration Telegram WebApp
let tg = window.Telegram.WebApp;

// Configuration des webhooks n8n
const N8N_WEBHOOKS = {
    AGENT_CRM: 'https://n8n.dsolution-ia.fr/webhook/crm_agent',
    ENTERPRISE_API: 'https://n8n.dsolution-ia.fr/webhook/recherche_entreprise',
    GATEWAY_ENTITIES: 'https://n8n.dsolution-ia.fr/webhook/gateway_entities',
    PDF_GENERATOR: 'https://n8n.dsolution-ia.fr/webhook/pdf_generator',
    EMAIL_WORKFLOW: 'https://n8n.dsolution-ia.fr/webhook/email_workflow',
    FORM_ENTREPRISE: 'https://n8n.dsolution-ia.fr/webhook/form_entreprise',
    QUALIFICATION_API: 'https://n8n.dsolution-ia.fr/webhook/recherche_qualification'
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

// Variables pour système d'offres
window.selectedOffer = null;
window.qualificationData = null;

// Alternative pour tg.showAlert compatible avec toutes les versions Telegram
function showMessage(message) {
    if (tg.showAlert && typeof tg.showAlert === 'function') {
        try {
            tg.showAlert(message);
            return;
        } catch (error) {
            console.warn('tg.showAlert non supporté:', error);
        }
    }

    updateStatus(message);
    console.log('📱 Message:', message);

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

// ================================
// 🧭 FONCTIONS DE NAVIGATION
// ================================

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
        callAgentOrchestrator('Analyse commerciale avancée demandée');
        return;
    }

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

// ================================
// 🎨 GÉNÉRATION CONTENU FORMULAIRES
// ================================

function getStateContent(actionType) {
    switch (actionType) {
        case 'facture':
        case 'bon_commande':
        case 'formulaire':
            return getBasicActionContent();
            
        case 'qualification':
            return getQualificationContent();
            
        case 'nouvelle_entreprise':
            return getNewEnterpriseContent();
            
        default:
            return '<p>Fonctionnalité en développement...</p>';
    }
}

function getBasicActionContent() {
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
}

function getQualificationContent() {
    return `
        <div class="form-group">
            <label class="form-label">Entreprise concernée :</label>
            <input type="text" class="form-input" id="enterpriseInput" 
                   placeholder="Tapez le nom de l'entreprise..."
                   oninput="handleEnterpriseSearch(this.value)">
        </div>
        <div id="enterpriseResults" class="search-results"></div>
        
        <!-- 🆕 INDICATEUR AUTO-REMPLISSAGE -->
        <div id="autoFillStatus" class="auto-fill-status" style="display: none;">
            <div style="background: #d1ecf1; padding: 8px; border-radius: 6px; margin: 10px 0; font-size: 12px;">
                🤖 <strong>Auto-remplissage activé</strong> - Les champs sont pré-remplis avec les données existantes
            </div>
        </div>
        
        <div class="form-group">
            <label class="form-label">Format encart :</label>
            <select class="form-select" id="formatEncart">
                <option value="6X4">6x4 (350€)</option>
                <option value="6X8">6x8 (500€)</option>
                <option value="12X4">12x4 (500€)</option>
                <option value="12PARUTIONS">12 parutions (1800€)</option>
            </select>
        </div>
        
        <!-- 🆕 SECTION OFFRES INTELLIGENTES -->
        <div id="smartOfferSection" style="display: none;">
            <div class="form-group">
                <label class="form-label">
                    🎯 Offres intelligentes
                    <button type="button" class="toggle-offers" onclick="toggleOfferMode()" style="margin-left: 10px; font-size: 11px;">
                        Mode manuel
                    </button>
                </label>
                <div id="offerOptions" class="offer-options">
                    <!-- Options générées dynamiquement -->
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label class="form-label">Nombre de parutions :</label>
            <input type="number" class="form-input" id="nombreParutions" value="1" min="1" max="12">
            <div class="price-display" id="priceDisplay">Prix total : 350€</div>
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
            <label class="form-label">Contact :</label>
            <input type="text" class="form-input" id="interlocuteur" 
                   placeholder="Nom du contact">
        </div>
        
        <div class="form-group">
            <label class="form-label">Email contact :</label>
            <input type="email" class="form-input" id="emailContact" 
                   placeholder="email@exemple.com">
        </div>
        
        <div class="form-group">
            <label class="form-label">Commentaires :</label>
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
}

function getNewEnterpriseContent() {
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
}

// ================================
// 🔍 FONCTIONS DE RECHERCHE
// ================================

function handleSearch(query) {
    clearTimeout(searchTimeout);

    if (query.length < 3) {
        document.getElementById('searchResults').style.display = 'none';
        return;
    }

    if (query === lastSearchQuery) {
        return;
    }

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

    if (query === lastSearchQuery) {
        return;
    }

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

        searchCache[query] = enterprises;
        displayEnterpriseResults(enterprises);

    } catch (error) {
        console.error('Erreur recherche entreprise:', error);
        displayEnterpriseResults([]);
    }
}

async function searchQualificationForEnterprise(enterpriseId) {
    try {
        console.log('🚀 Début recherche qualification pour enterprise_id:', enterpriseId);
        
        const payload = {
            enterprise_id: enterpriseId
        };
        console.log('📤 Payload envoyé:', JSON.stringify(payload));
        
        const response = await fetch(N8N_WEBHOOKS.QUALIFICATION_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        console.log('🔍 Réponse API qualification:', result);
        console.log('🔍 Type de réponse:', typeof result);
        console.log('🔍 Est-ce un tableau?', Array.isArray(result));
        
        if (Array.isArray(result) && result.length > 0) {
            console.log('🔍 Longueur du tableau:', result.length);
            
            // ✅ CORRECTION : Extraire les données depuis result[0].json
            const qualificationData = result[0].json;
            
            if (qualificationData && qualificationData.id) {
                console.log('✅ Qualification trouvée:', qualificationData);
                console.log('👤 Contact:', qualificationData.interlocuteur);
                console.log('💰 Prix:', qualificationData.prix_total);
                console.log('📋 Format:', qualificationData.format_encart?.value);
                
                return qualificationData;
            } else {
                console.log('❌ Structure de données invalide dans result[0].json');
                return null;
            }
        } else {
            console.log('❌ Tableau vide - Aucune qualification');
            return null;
        }

    } catch (error) {
        console.error('💥 Erreur searchQualificationForEnterprise:', error);
        console.error('💥 Stack trace:', error.stack);
        return null;
    }
}

// ================================
// 🎨 AFFICHAGE RÉSULTATS
// ================================

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

// ================================
// ✅ SÉLECTION ENTREPRISES
// ================================

function selectEnterprise(id, name) {
    selectedEnterprise = { id, name };
    updateStatus(`Entreprise sélectionnée: ${name}`);
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
    
    // 🆕 NOUVEAU : Auto-remplissage intelligent
    try {
        autoFillEnterpriseData(id, name);
    } catch (error) {
        console.warn('Auto-remplissage échoué, continuant en mode manuel:', error);
    }
}

// ================================
// 🤖 AUTO-REMPLISSAGE INTELLIGENT
// ================================

async function autoFillEnterpriseData(enterpriseId, enterpriseName) {
    console.log('🔄 Auto-remplissage pour:', enterpriseName);
    
    try {
        const response = await fetch(N8N_WEBHOOKS.ENTERPRISE_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operation: 'get',
                id: enterpriseId
            })
        });

        if (!response.ok) {
            console.warn('Impossible de récupérer les détails entreprise');
            return;
        }

        const result = await response.json();
        const enterprise = result.data;

        if (!enterprise) {
            console.warn('Pas de données entreprise trouvées');
            return;
        }

        console.log('📊 Données entreprise récupérées:', enterprise);

        // 🎯 AUTO-REMPLISSAGE selon l'action en cours
        if (currentAction === 'qualification') {
            autoFillQualificationForm(enterprise);
        } else if (currentAction === 'formulaire') {
            autoFillFormulaireForm(enterprise);
        }

    } catch (error) {
        console.error('Erreur auto-remplissage:', error);
    }
}

function autoFillQualificationForm(enterprise) {
    console.log('📝 Auto-remplissage qualification...');
    
    // Afficher l'indicateur d'auto-remplissage
    showAutoFillStatus('Formulaire pré-rempli avec les données existantes');
    
    // 🔒 CHAMPS EN LECTURE SEULE
    const interlocuteurField = document.getElementById('interlocuteur');
    const emailField = document.getElementById('emailContact');
    
    if (interlocuteurField && enterprise.interlocuteur) {
        interlocuteurField.value = enterprise.interlocuteur;
        interlocuteurField.setAttribute('readonly', true);
        interlocuteurField.style.backgroundColor = '#f0f0f0';
        interlocuteurField.style.color = '#666';
        addReadOnlyIndicator(interlocuteurField, 'Données existantes');
    }
    
    if (emailField && enterprise.email) {
        emailField.value = enterprise.email;
        emailField.setAttribute('readonly', true);
        emailField.style.backgroundColor = '#f0f0f0';
        emailField.style.color = '#666';
        addReadOnlyIndicator(emailField, 'Données existantes');
    }
    
    // 🎯 PRÉ-SÉLECTION INTELLIGENTE
    if (enterprise.format_encart_2025) {
        const formatSelect = document.getElementById('formatEncart');
        if (formatSelect) {
            formatSelect.value = enterprise.format_encart_2025;
            highlightPreSelected(formatSelect, 'Format utilisé en 2025');
            
            // Event listener pour mise à jour des offres
            formatSelect.addEventListener('change', function() {
                updateOfferOptions(enterprise, this.value);
                updateManualPrice();
            });
        }
    }
    
    if (enterprise.mode_paiement_2024) {
        const paiementSelect = document.getElementById('modePaiement');
        if (paiementSelect) {
            const modeMapping = {
                'Cheque': 'Cheque',
                'Chèque': 'Cheque', 
                'Virement': 'Virement',
                'Carte': 'Carte'
            };
            
            const mappedMode = modeMapping[enterprise.mode_paiement_2024] || enterprise.mode_paiement_2024;
            paiementSelect.value = mappedMode;
            highlightPreSelected(paiementSelect, 'Mode utilisé en 2024');
        }
    }
    
    // 📝 COMMENTAIRE AUTOMATIQUE
    const commentairesField = document.getElementById('commentaires');
    if (commentairesField && !commentairesField.value) {
        const autoComment = generateAutoComment(enterprise);
        commentairesField.value = autoComment;
        commentairesField.style.fontStyle = 'italic';
        commentairesField.style.color = '#666';
    }
    
    // 🎯 SYSTÈME D'OFFRES INTELLIGENTES
    initializeSmartOffers(enterprise);
    
    console.log('✅ Qualification auto-remplie');
    updateStatus(`📋 Formulaire pré-rempli avec données ${enterprise.nom_entreprise}`);
}

// ================================
// 🎁 SYSTÈME D'OFFRES INTELLIGENTES
// ================================

function initializeSmartOffers(enterprise) {
    // Afficher la section offres
    const smartOfferSection = document.getElementById('smartOfferSection');
    if (smartOfferSection) {
        smartOfferSection.style.display = 'block';
    }
    
    // Initialiser avec le format actuel
    const formatSelect = document.getElementById('formatEncart');
    const selectedFormat = formatSelect ? formatSelect.value : '6X4';
    
    updateOfferOptions(enterprise, selectedFormat);
    
    // Event listener pour nombre de parutions manuel
    const nombreInput = document.getElementById('nombreParutions');
    if (nombreInput) {
        nombreInput.addEventListener('input', function() {
            updateManualPrice();
        });
    }
}

function updateOfferOptions(enterprise, selectedFormat) {
    const offers = calculateSmartOffer(enterprise, selectedFormat);
    const optionsDiv = document.getElementById('offerOptions');
    const nombreInput = document.getElementById('nombreParutions');
    const priceDisplay = document.getElementById('priceDisplay');
    
    if (!optionsDiv) return;
    
    let optionsHTML = '';
    
    // Option de base
    optionsHTML += createOfferOption('base', offers.base, true);
    
    // Offre suggérée si disponible
    if (offers.suggested) {
        optionsHTML += createOfferOption('suggested', offers.suggested, false);
    }
    
    optionsDiv.innerHTML = optionsHTML;
    
    // Mise à jour automatique des champs
    if (nombreInput) nombreInput.value = offers.base.nombre_parutions;
    if (priceDisplay) priceDisplay.textContent = `Prix total : ${offers.base.prix_total}€`;
    
    // Event listeners pour sélection d'offre
    optionsDiv.querySelectorAll('.offer-option').forEach(option => {
        option.addEventListener('click', function() {
            selectOffer(this.dataset.offerType, offers);
        });
    });
    
    // Stocker l'offre par défaut
    window.selectedOffer = offers.base;
}

function calculateSmartOffer(enterprise, selectedFormat) {
    console.log('🧠 Calcul offre intelligente pour:', enterprise.nom_entreprise);
    
    const offers = {
        base: {
            nombre_parutions: 1,
            prix_unitaire: getBasePriceByFormat(selectedFormat),
            prix_total: getBasePriceByFormat(selectedFormat),
            offre_type: 'standard'
        },
        suggested: null
    };
    
    // 📊 ANALYSE HISTORIQUE CLIENT
    const clientHistory = analyzeClientHistory(enterprise);
    
    // 🎯 RÈGLES D'OFFRE INTELLIGENTE
    if (selectedFormat === '12PARUTIONS') {
        // Format annuel = offre automatique
        offers.base = {
            nombre_parutions: 12,
            prix_unitaire: 150, // 1800/12
            prix_total: 1800,
            offre_type: 'annuelle',
            discount: 'Tarif préférentiel annuel'
        };
    } else if (clientHistory.is_loyal && selectedFormat !== '6X4') {
        // Client fidèle + format premium = offre possible
        offers.suggested = calculateLoyaltyOffer(selectedFormat, clientHistory);
    } else if (clientHistory.previous_multi_parution) {
        // Historique multi-parution = offre multi
        offers.suggested = calculateMultiParutionOffer(selectedFormat, clientHistory);
    }
    
    return offers;
}

function analyzeClientHistory(enterprise) {
    const history = {
        is_loyal: false,
        previous_multi_parution: false,
        years_client: 0,
        total_amount_paid: 0,
        preferred_format: null,
        payment_reliability: 'unknown'
    };
    
    // Client 2025 = fidèle
    if (enterprise.Client_2025 === 'Oui') {
        history.is_loyal = true;
        history.years_client = 1;
    }
    
    // Montant historique
    if (enterprise.montant_payé_2024) {
        const amount = parseFloat(enterprise.montant_payé_2024.replace(/[€,]/g, ''));
        history.total_amount_paid = amount;
        
        // Si montant > prix standard = multi-parution probable
        if (amount > 500) {
            history.previous_multi_parution = true;
        }
    }
    
    // Format préféré
    history.preferred_format = enterprise.format_encart_2025 || '6X4';
    
    // Fiabilité paiement
    if (enterprise.montant_payé_2024) {
        history.payment_reliability = 'good';
    }
    
    console.log('📊 Historique client analysé:', history);
    return history;
}

function calculateLoyaltyOffer(format, history) {
    const basePrice = getBasePriceByFormat(format);
    
    return {
        nombre_parutions: 3,
        prix_unitaire: Math.round(basePrice * 0.85), // 15% de remise
        prix_total: Math.round(basePrice * 0.85 * 3),
        offre_type: 'fidelite',
        discount: '15% remise fidélité',
        description: `Offre fidélité : 3 parutions ${format} avec 15% de remise`,
        savings: Math.round(basePrice * 3 * 0.15)
    };
}

function calculateMultiParutionOffer(format, history) {
    const basePrice = getBasePriceByFormat(format);
    
    let suggestedParutions = 2;
    if (history.total_amount_paid > 800) {
        suggestedParutions = 6; // Semestre
    } else if (history.total_amount_paid > 1200) {
        suggestedParutions = 12; // Année
    }
    
    return {
        nombre_parutions: suggestedParutions,
        prix_unitaire: Math.round(basePrice * (1 - (suggestedParutions * 0.02))),
        prix_total: Math.round(basePrice * suggestedParutions * (1 - (suggestedParutions * 0.02))),
        offre_type: 'multi_parution',
        discount: `${suggestedParutions * 2}% remise multi-parution`,
        description: `${suggestedParutions} parutions ${format} avec remise progressive`,
        savings: Math.round(basePrice * suggestedParutions * (suggestedParutions * 0.02))
    };
}

function getBasePriceByFormat(format) {
    const prices = {
        '6X4': 350,
        '6X8': 500,
        '12X4': 500,
        '12PARUTIONS': 1800
    };
    return prices[format] || 350;
}

function createOfferOption(type, offer, selected) {
    const selectedClass = selected ? 'selected' : '';
    const savings = offer.savings ? `<span class="savings">Économie: ${offer.savings}€</span>` : '';
    
    return `
        <div class="offer-option ${selectedClass}" data-offer-type="${type}">
            <div class="offer-header">
                <strong>${offer.nombre_parutions} parution(s)</strong>
                <span class="offer-price">${offer.prix_total}€</span>
            </div>
            <div class="offer-details">
                ${offer.prix_unitaire}€/parution • ${offer.offre_type}
                ${offer.discount ? `<br><em>${offer.discount}</em>` : ''}
                ${savings}
            </div>
        </div>
    `;
}

function selectOffer(offerType, offers) {
    const selectedOffer = offers[offerType];
    
    // Mettre à jour l'interface
    const nombreInput = document.getElementById('nombreParutions');
    const priceDisplay = document.getElementById('priceDisplay');
    
    if (nombreInput) nombreInput.value = selectedOffer.nombre_parutions;
    if (priceDisplay) priceDisplay.textContent = `Prix total : ${selectedOffer.prix_total}€`;
    
    // Mettre à jour sélection visuelle
    document.querySelectorAll('.offer-option').forEach(opt => opt.classList.remove('selected'));
    const targetOption = document.querySelector(`[data-offer-type="${offerType}"]`);
    if (targetOption) targetOption.classList.add('selected');
    
    // Stocker l'offre sélectionnée
    window.selectedOffer = selectedOffer;
    
    console.log('✅ Offre sélectionnée:', selectedOffer);
}

function toggleOfferMode() {
    const button = document.querySelector('.toggle-offers');
    const offerOptions = document.getElementById('offerOptions');
    const nombreInput = document.getElementById('nombreParutions');
    
    if (!button || !offerOptions || !nombreInput) return;
    
    if (button.textContent === 'Mode manuel') {
        // Passer en mode manuel
        button.textContent = 'Mode offres';
        offerOptions.style.display = 'none';
        nombreInput.removeAttribute('readonly');
        nombreInput.style.backgroundColor = 'white';
        
        // Event listener pour calcul manuel
        nombreInput.addEventListener('input', function() {
            updateManualPrice();
        });
        
    } else {
        // Retour mode offres
        button.textContent = 'Mode manuel';
        offerOptions.style.display = 'block';
        nombreInput.setAttribute('readonly', true);
        nombreInput.style.backgroundColor = '#f0f0f0';
    }
}

function updateManualPrice() {
    const formatSelect = document.getElementById('formatEncart');
    const nombreInput = document.getElementById('nombreParutions');
    const priceDisplay = document.getElementById('priceDisplay');
    
    if (!formatSelect || !nombreInput || !priceDisplay) return;
    
    const format = formatSelect.value;
    const nombre = parseInt(nombreInput.value) || 1;
    const prixUnitaire = getBasePriceByFormat(format);
    const prixTotal = prixUnitaire * nombre;
    
    priceDisplay.textContent = `Prix total : ${prixTotal}€`;
    
    // Stocker l'offre manuelle
    window.selectedOffer = {
        nombre_parutions: nombre,
        prix_unitaire: prixUnitaire,
        prix_total: prixTotal,
        offre_type: 'manuelle'
    };
}

// ================================
// 🎨 FONCTIONS UTILITAIRES UI
// ================================

function showAutoFillStatus(message) {
    const statusDiv = document.getElementById('autoFillStatus');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div style="background: #d1ecf1; padding: 8px; border-radius: 6px; margin: 10px 0; font-size: 12px;">
                🤖 <strong>${message}</strong>
            </div>
        `;
    }
}

function addReadOnlyIndicator(field, message) {
    // Supprimer l'indicateur existant s'il y en a un
    const existingIndicator = field.parentNode.querySelector('.readonly-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Créer nouvel indicateur
    const indicator = document.createElement('div');
    indicator.className = 'readonly-indicator';
    indicator.innerHTML = `🔒 ${message}`;
    indicator.style.cssText = `
        font-size: 11px;
        color: #666;
        margin-top: 2px;
        font-style: italic;
    `;
    
    field.parentNode.appendChild(indicator);
}

function highlightPreSelected(field, message) {
    field.style.border = '2px solid #fbbf24';
    field.style.backgroundColor = '#fff3cd';
    
    // Ajouter message informatif
    const indicator = document.createElement('div');
    indicator.className = 'preselected-indicator';
    indicator.innerHTML = `💡 ${message} - Vous pouvez modifier`;
    indicator.style.cssText = `
        font-size: 11px;
        color: #856404;
        margin-top: 2px;
        font-style: italic;
    `;
    
    field.parentNode.appendChild(indicator);
}

function generateAutoComment(enterprise) {
    const currentYear = new Date().getFullYear();
    let comment = `Renouvellement ${currentYear} - `;
    
    if (enterprise.Client_2025 === 'Oui') {
        comment += 'Client fidèle. ';
    }
    
    if (enterprise.montant_payé_2024) {
        comment += `Montant 2024: ${enterprise.montant_payé_2024}. `;
    }
    
    if (enterprise.format_encart_2025) {
        comment += `Format habituel: ${enterprise.format_encart_2025}. `;
    }
    
    return comment.trim();
}

// ================================
// ⚡ EXÉCUTION ACTIONS
// ================================

async function executeAction() {
    console.log('🔍 === DIAGNOSTIC EXECUTE ACTION ===');
    console.log('1. selectedEnterprise:', selectedEnterprise);
    console.log('2. currentAction:', currentAction);

    if (!selectedEnterprise || !currentAction) {
        console.error('🚨 VALIDATION ÉCHEC');
        
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
        // 🎯 NOUVEAU : Vérification qualification pour facture/bon_commande
        if (currentAction === 'facture' || currentAction === 'bon_commande') {
            const qualification = await searchQualificationForEnterprise(selectedEnterprise.id);
            
            if (qualification) {
                showQualificationValidationDialog(qualification, currentAction);
            } else {
                showCreateQualificationFirst(currentAction);
            }
            return;
        }

        let webhookUrl;
        switch (currentAction) {
            case 'formulaire':
                webhookUrl = N8N_WEBHOOKS.FORM_ENTREPRISE;
                break;
            default:
                webhookUrl = N8N_WEBHOOKS.AGENT_CRM;
        }

        const payload = {
            action: currentAction,
            data: {
                enterprise_id: selectedEnterprise.id,
                enterprise_name: selectedEnterprise.name,
                user_id: user.id
            }
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        updateStatus('✅ Action terminée');
        alert(`✅ ${getActionLabel(currentAction)} exécutée avec succès!`);
        showMainMenu();

    } catch (error) {
        console.error('💥 Erreur complète:', error);
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
    
    // 🆕 RÉCUPÉRATION DONNÉES OFFRE SÉLECTIONNÉE
    const nombreParutions = document.getElementById('nombreParutions').value;
    const selectedOffer = window.selectedOffer;

    updateStatus('🎯 Création qualification...');

    try {
        const qualificationData = {
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
                nombre_parutions: nombreParutions,
                // 🆕 DONNÉES OFFRE INTELLIGENTE
                offre_type: selectedOffer?.offre_type || 'standard',
                prix_unitaire: selectedOffer?.prix_unitaire || getBasePriceByFormat(formatEncart),
                prix_total: selectedOffer?.prix_total || (getBasePriceByFormat(formatEncart) * parseInt(nombreParutions)),
                user_id: user.id
            }
        };

        const response = await fetch(N8N_WEBHOOKS.GATEWAY_ENTITIES, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(qualificationData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const result = await response.json();
        
        if (result.success === false) {
            throw new Error(result.error?.message || 'Erreur création qualification');
        }
        
        // 🆕 NOUVEAU : Proposer génération de documents
        if (result.success && result.next_steps) {
            setTimeout(() => {
                showDocumentChoiceDialog(result);
            }, 1000);
        } else {
            showMessage(`✅ Qualification créée avec succès!`);
            updateStatus('✅ Qualification créée');
            showMainMenu();
        }
        
    } catch (error) {
        console.error('❌ Erreur création qualification:', error);
        showMessage(`❌ Erreur: ${error.message}`);
        updateStatus('❌ Erreur création qualification');
    }
}

// ================================
// 📄 CHOIX DE DOCUMENT POST-QUALIFICATION
// ================================

function showDocumentChoiceDialog(qualificationResult) {
    const data = qualificationResult.data;
    const nextSteps = qualificationResult.next_steps;
    
    // Créer dialog personnalisé
    const dialogHTML = `
        <div class="choice-dialog">
            <div class="choice-title">
                🎯 Qualification "${data.qualification_ref}" créée !
                <br><small>Client: ${data.interlocuteur} - ${data.prix_total}</small>
            </div>
            
            <div class="choice-subtitle">Quelle action souhaitez-vous effectuer ?</div>
            
            <div class="choice-buttons">
                <button class="choice-btn choice-facture" onclick="generateDocument('facture', qualificationData)">
                    ${nextSteps.facture.label}
                    <small>${nextSteps.facture.description}</small>
                </button>
                
                <button class="choice-btn choice-commande" onclick="generateDocument('bon_commande', qualificationData)">
                    ${nextSteps.bon_commande.label}
                    <small>${nextSteps.bon_commande.description}</small>
                </button>
                
                <button class="choice-btn choice-later" onclick="closeDocumentDialog()">
                    ⏰ Plus tard
                    <small>Retour au menu principal</small>
                </button>
            </div>
        </div>
    `;
    
    // Stocker les données pour utilisation ultérieure
    window.qualificationData = qualificationResult;
    
    // Afficher le dialog
    document.getElementById('stateTitle').innerHTML = 'Choix du document';
    document.getElementById('stateContent').innerHTML = dialogHTML;
    document.getElementById('conversationState').style.display = 'block';
    document.getElementById('mainMenu').classList.add('hidden');
}

async function generateDocument(documentType, qualificationResult) {
    const autoData = qualificationResult.next_steps[documentType].auto_data;
    
    updateStatus(`🔄 Génération ${documentType}...`);
    
    try {
        const response = await fetch(N8N_WEBHOOKS.PDF_GENERATOR, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: JSON.stringify(autoData)
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        showMessage(`✅ ${documentType.toUpperCase()} généré avec succès !`);
        updateStatus(`✅ Document prêt`);
        
        setTimeout(() => {
            closeDocumentDialog();
        }, 2000);
        
    } catch (error) {
        console.error('Erreur génération document:', error);
        showMessage(`❌ Erreur génération ${documentType}`);
    }
}

function closeDocumentDialog() {
    document.getElementById('conversationState').style.display = 'none';
    window.qualificationData = null;
    showMainMenu();
}

// ================================
// 📋 VALIDATION QUALIFICATION EXISTANTE
// ================================

function showQualificationValidationDialog(qualificationData, documentType) {
    console.log('📋 Données qualification reçues:', qualificationData);
    
    const dialogHTML = `
        <div class="qualification-validation">
            <h3>📋 Qualification trouvée pour ${selectedEnterprise.name}</h3>
            
            <!-- DONNÉES EN LECTURE SEULE OU MODIFIABLE -->
            <div class="form-group">
                <label>Contact :</label>
                <input type="text" id="validationInterlocuteur" 
                       value="${qualificationData.interlocuteur || 'Non spécifié'}" readonly>
            </div>
            
            <div class="form-group">
                <label>Email :</label>
                <input type="email" id="validationEmail" 
                       value="${qualificationData.email_contact || 'Non spécifié'}" readonly>
            </div>
            
            <div class="form-group">
                <label>Format :</label>
                <select id="validationFormat">
                    <option value="6X4" ${qualificationData.format_encart?.value === '6X4' ? 'selected' : ''}>6X4 (350€)</option>
                    <option value="6X8" ${qualificationData.format_encart?.value === '6X8' ? 'selected' : ''}>6X8 (500€)</option>
                    <option value="12X4" ${qualificationData.format_encart?.value === '12X4' ? 'selected' : ''}>12X4 (500€)</option>
                    <option value="12PARUTIONS" ${qualificationData.format_encart?.value === '12PARUTIONS' ? 'selected' : ''}>12 parutions (1800€)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Prix :</label>
                <input type="text" id="validationPrix" 
                       value="${qualificationData.prix_total}€" readonly>
            </div>
            
            <!-- 🆕 SECTION STATUT PAIEMENT pour FACTURE -->
            ${documentType === 'facture' ? `
                <div class="form-group" style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; margin: 15px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #1d3557;">💰 Statut du paiement</h4>
                    
                    <div style="margin-bottom: 10px;">
                        <label>
                            <input type="radio" name="paymentStatus" value="non_payee" checked onchange="togglePaymentFields()">
                            ❌ Non payée (facture normale)
                        </label>
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <label>
                            <input type="radio" name="paymentStatus" value="payee" onchange="togglePaymentFields()">
                            ✅ Payée (facture acquittée)
                        </label>
                    </div>
                    
                    <!-- Champs de paiement (cachés par défaut) -->
                    <div id="paymentDetails" style="display: none; margin-top: 10px; padding: 10px; background: #f0f9ff; border-radius: 5px;">
                        <div class="form-group">
                            <label>Mode de paiement :</label>
                            <select id="validationPaiement">
                                <option value="Virement" ${qualificationData.mode_paiement?.value === 'Virement' ? 'selected' : ''}>Virement</option>
                                <option value="Cheque" ${qualificationData.mode_paiement?.value === 'Cheque' ? 'selected' : ''}>Chèque</option>
                                <option value="Carte" ${qualificationData.mode_paiement?.value === 'Carte' ? 'selected' : ''}>Carte</option>
                                <option value="Especes" ${qualificationData.mode_paiement?.value === 'Especes' ? 'selected' : ''}>Espèces</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Référence paiement (n° chèque, virement...) :</label>
                            <input type="text" id="referencePaiement" placeholder="Ex: CHK123456, VIR789012...">
                        </div>
                        
                        <div class="form-group">
                            <label>Date de paiement :</label>
                            <input type="date" id="datePaiement" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                </div>
            ` : `
                <div class="form-group">
                    <label>Mode de paiement :</label>
                    <select id="validationPaiement">
                        <option value="Virement" ${qualificationData.mode_paiement?.value === 'Virement' ? 'selected' : ''}>Virement</option>
                        <option value="Cheque" ${qualificationData.mode_paiement?.value === 'Cheque' ? 'selected' : ''}>Chèque</option>
                        <option value="Carte" ${qualificationData.mode_paiement?.value === 'Carte' ? 'selected' : ''}>Carte</option>
                        <option value="Especes" ${qualificationData.mode_paiement?.value === 'Especes' ? 'selected' : ''}>Espèces</option>
                    </select>
                </div>
            `}
            
            <!-- BOUTONS D'ACTION -->
            <div class="validation-buttons" style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="confirmGenerateDocument('${documentType}')" style="margin-bottom: 10px;">
                    ✅ Générer ${documentType === 'facture' ? 'Facture' : 'Bon de commande'}
                </button>
                <button class="btn btn-secondary" onclick="editQualificationFirst()" style="margin-bottom: 10px;">
                    ✏️ Modifier d'abord
                </button>
                <button class="btn btn-secondary" onclick="showMainMenu()">
                    ❌ Annuler
                </button>
            </div>
        </div>
    `;
    
    // Stocker les données pour confirmation
    window.currentQualificationData = qualificationData;
    window.currentDocumentType = documentType;
    
    // Afficher le dialog
    document.getElementById('stateTitle').innerHTML = `Génération ${documentType}`;
    document.getElementById('stateContent').innerHTML = dialogHTML;
    document.getElementById('conversationState').style.display = 'block';
    document.getElementById('mainMenu').classList.add('hidden');
    
    console.log('✅ Dialog qualification affiché avec données:', {
        contact: qualificationData.interlocuteur,
        prix: qualificationData.prix_total,
        format: qualificationData.format_encart?.value
    });
}

// 🆕 FONCTION pour basculer l'affichage des champs de paiement
function togglePaymentFields() {
    const paymentStatus = document.querySelector('input[name="paymentStatus"]:checked').value;
    const paymentDetails = document.getElementById('paymentDetails');
    
    if (paymentStatus === 'payee') {
        paymentDetails.style.display = 'block';
    } else {
        paymentDetails.style.display = 'none';
    }
}

// 🆕 FONCTION améliorée pour confirmer la génération
async function confirmGenerateDocument(documentType) {
    const qualData = window.currentQualificationData;
    
    // Récupérer les valeurs du dialog
    const finalData = {
        action: documentType,
        data: {
            enterprise_id: selectedEnterprise.id,
            enterprise_name: selectedEnterprise.name,
            format_encart: document.getElementById('validationFormat').value,
            mois_parution: qualData.mois_parution,
            mode_paiement: document.getElementById('validationPaiement').value,
            interlocuteur: document.getElementById('validationInterlocuteur').value,
            email_contact: document.getElementById('validationEmail').value,
            prix_total: qualData.prix_total,
            qualification_id: qualData.id,
            user_id: user.id,
            
            // 🆕 DONNÉES DE PAIEMENT (pour facture)
            est_payee: false,
            reference_paiement: null,
            date_paiement: null
        }
    };
    
    // Pour les factures, récupérer le statut de paiement
    if (documentType === 'facture') {
        const paymentStatus = document.querySelector('input[name="paymentStatus"]:checked').value;
        finalData.data.est_payee = paymentStatus === 'payee';
        
        if (finalData.data.est_payee) {
            finalData.data.reference_paiement = document.getElementById('referencePaiement').value || null;
            finalData.data.date_paiement = document.getElementById('datePaiement').value || null;
        }
    }
    
    console.log('📤 Envoi données pour génération:', finalData);
    updateStatus(`🔄 Génération ${documentType}...`);
    
    try {
        const response = await fetch(N8N_WEBHOOKS.GATEWAY_ENTITIES, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(finalData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        showMessage(`✅ ${documentType.toUpperCase()} ${finalData.data.est_payee ? 'acquittée ' : ''}générée avec succès !`);
        updateStatus('✅ Document prêt');
        showMainMenu();
        
    } catch (error) {
        console.error('Erreur génération document:', error);
        showMessage(`❌ Erreur génération ${documentType}`);
        updateStatus('❌ Erreur génération');
    }
}

function showCreateQualificationFirst(documentType) {
    const dialogHTML = `
        <div class="create-qualification-first">
            <h3>⚠️ Aucune qualification trouvée</h3>
            <p>Pour générer un ${documentType}, vous devez d'abord créer une qualification pour ${selectedEnterprise.name}.</p>
            
            <div class="info-box">
                💡 La qualification contient les informations nécessaires (format, prix, contact) pour générer le document.
            </div>
            
            <div class="validation-buttons">
                <button class="btn btn-primary" onclick="createQualificationThenDocument('${documentType}')">
                    🎯 Créer qualification
                </button>
                <button class="btn btn-secondary" onclick="showMainMenu()">
                    ❌ Annuler
                </button>
            </div>
        </div>
    `;
    
    // Stocker le type de document pour après création
    window.pendingDocumentType = documentType;
    
    // Afficher le dialog
    document.getElementById('stateContent').innerHTML = dialogHTML;
    document.getElementById('conversationState').style.display = 'block';
}

async function confirmGenerateDocument(documentType) {
    const qualData = window.currentQualificationData;
    
    // Récupérer les valeurs du dialog (en cas de modification)
    const finalData = {
        action: documentType,
        data: {
            enterprise_id: selectedEnterprise.id,
            enterprise_name: selectedEnterprise.name,
            format_encart: document.getElementById('validationFormat').value,
            mois_parution: qualData.mois_parution,
            mode_paiement: qualData.mode_paiement?.value || qualData.mode_paiement,
            interlocuteur: document.getElementById('validationInterlocuteur').value,
            email_contact: qualData.email_contact,
            prix_total: qualData.prix_total,
            qualification_id: qualData.id, // Référence qualification source
            user_id: user.id
        }
    };
    
    // ENVOI AU GATEWAY ENTITIES
    try {
        const response = await fetch(N8N_WEBHOOKS.GATEWAY_ENTITIES, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(finalData)
        });
        
        const result = await response.json();
        showMessage(`✅ ${documentType.toUpperCase()} généré avec succès !`);
        showMainMenu();
        
    } catch (error) {
        showMessage(`❌ Erreur génération ${documentType}`);
    }
}

function editQualificationFirst() {
    // Rediriger vers l'édition de qualification
    currentAction = 'qualification';
    showAction('qualification');
}

function createQualificationThenDocument(documentType) {
    // Stocker le document à générer après
    window.pendingDocumentType = documentType;
    
    // Rediriger vers création de qualification
    currentAction = 'qualification';
    showAction('qualification');
}

// ================================
// 🏢 CRÉATION ENTREPRISE
// ================================

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

// ================================
// 🤖 AGENT ORCHESTRATEUR
// ================================

async function callAgentOrchestrator(request) {
    updateStatus('🧠 Agent Orchestrateur activé...');

    try {
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

// ================================
// 🎨 FONCTION UTILITAIRE
// ================================

function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

// ================================
// 🚀 INITIALISATION
// ================================

// Gestion des boutons Telegram
tg.MainButton.setText('Fermer l\'app');
tg.MainButton.onClick(() => {
    tg.close();
});
tg.MainButton.show();

// Initialisation
console.log('🚒 CRM Mini App initialisée avec auto-remplissage intelligent');
updateStatus('🟢 Application prête');