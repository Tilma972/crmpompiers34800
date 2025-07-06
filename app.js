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
    
    // Initialiser les parutions multiples pour le formulaire de qualification
    if (actionType === 'qualification') {
        setTimeout(() => {
            initializePublications();
        }, 100);
    }
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
        
        <!-- 🆕 SECTION PARUTIONS MULTIPLES -->
        <div class="form-group">
            <label class="form-label">Parutions :</label>
            <div id="publicationsList" class="publications-list">
                <!-- Publications ajoutées dynamiquement -->
            </div>
            <button type="button" class="btn btn-outline" onclick="addPublication()" id="addPublicationBtn">
                ➕ Ajouter une parution
            </button>
            <div class="price-display" id="priceDisplay">Prix total : 0€</div>
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
        resultsDiv.innerHTML = results.map((result, index) => `
            <div class="search-result-item" onclick="selectEnterpriseForAction(${index})">
                <div class="result-name">${result.nom_entreprise}</div>
                <div class="result-details">📍 ${result.commune} • 👤 ${result.interlocuteur || 'Pas de contact'}</div>
            </div>
        `).join('');
        
        // 🆕 Stocker les résultats pour récupération complète
        window.currentSearchResults = results;
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

function selectEnterpriseForAction(resultIndex) {
    console.log('🎯 selectEnterpriseForAction appelée avec index:', resultIndex);
    
    // 🏢 RÉCUPÉRATION COMPLÈTE DE L'ENTREPRISE
    const fullEnterprise = window.currentSearchResults[resultIndex];
    
    if (!fullEnterprise) {
        console.error('❌ Impossible de récupérer les données complètes de l\'entreprise');
        return;
    }
    
    console.log('📊 Données complètes entreprise récupérées:', fullEnterprise);
    
    // 🔄 STOCKAGE COMPLET avec tous les champs possibles
    selectedEnterprise = {
        // ID et nom (obligatoires)
        id: fullEnterprise.id,
        name: fullEnterprise.nom_entreprise,
        nom_entreprise: fullEnterprise.nom_entreprise,
        
        // 🏢 DONNÉES ADRESSE COMPLÈTES
        adresse: fullEnterprise.adresse || fullEnterprise.adresse_complete || fullEnterprise.adresse_ligne1,
        commune: fullEnterprise.commune || fullEnterprise.ville,
        code_postal: fullEnterprise.code_postal || fullEnterprise.cp,
        
        // 📞 CONTACT
        telephone: fullEnterprise.telephone || fullEnterprise.tel || fullEnterprise.phone,
        interlocuteur: fullEnterprise.interlocuteur || fullEnterprise.contact || fullEnterprise.contact_nom,
        email: fullEnterprise.email || fullEnterprise.email_contact,
        email_contact: fullEnterprise.email_contact || fullEnterprise.email,
        
        // 💼 DONNÉES MÉTIER
        secteur_activite: fullEnterprise.secteur_activite || fullEnterprise.activite,
        siret: fullEnterprise.siret || fullEnterprise.numero_siret,
        
        // 📊 DONNÉES HISTORIQUES (si disponibles)
        Client_2025: fullEnterprise.Client_2025,
        format_encart_2025: fullEnterprise.format_encart_2025,
        mode_paiement_2024: fullEnterprise.mode_paiement_2024,
        montant_payé_2024: fullEnterprise.montant_payé_2024,
        
        // 🔄 Objet complet en backup
        _original: fullEnterprise
    };
    
    console.log('✅ selectedEnterprise avec données complètes:', selectedEnterprise);
    
    // 🎨 MISE À JOUR INTERFACE
    document.getElementById('enterpriseInput').value = selectedEnterprise.name;
    document.getElementById('enterpriseResults').style.display = 'none';
    document.getElementById('executeBtn').disabled = false;
    updateStatus(`✅ ${selectedEnterprise.name} sélectionnée (données complètes)`);
    
    // 🆕 NOUVEAU : Auto-remplissage intelligent avec données complètes
    try {
        autoFillEnterpriseData(selectedEnterprise.id, selectedEnterprise.name);
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
        // 🆕 LOGIQUE DIFFÉRENCIÉE PAR ACTION
        if (currentAction === 'facture') {
            // Pour les factures : obligation d'avoir une qualification
            const qualification = await searchQualificationForEnterprise(selectedEnterprise.id);
            
            if (qualification) {
                showQualificationValidationDialog(qualification, currentAction);
            } else {
                showCreateQualificationFirst(currentAction);
            }
            return;
            
        } else if (currentAction === 'bon_commande') {
            // 🆕 NOUVEAU FLUX BON DE COMMANDE
            // Pas d'obligation de qualification - envoi direct du formulaire
            await handleBonCommandeDirect();
            return;
            
        } else if (currentAction === 'formulaire') {
            // Flux formulaire existant
            let webhookUrl = N8N_WEBHOOKS.FORM_ENTREPRISE;
            
            const payload = {
                action: currentAction,
                data: {
                    enterprise_id: selectedEnterprise.id,
                    enterprise_name: selectedEnterprise.name,
                    enterprise_adresse: selectedEnterprise.adresse,
                    enterprise_commune: selectedEnterprise.commune,
                    enterprise_telephone: selectedEnterprise.telephone,
                    interlocuteur: selectedEnterprise.interlocuteur,
                    email_contact: selectedEnterprise.email_contact,
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
        }

    } catch (error) {
        console.error('💥 Erreur complète:', error);
        alert('❌ Erreur lors de l\'exécution: ' + error.message);
        updateStatus('❌ Erreur d\'exécution');
    }
}

// 🆕 NOUVELLE FONCTION - Gestion directe bon de commande
async function handleBonCommandeDirect() {
    console.log('📋 Bon de commande direct pour:', selectedEnterprise.name);
    
    // 🔍 ANALYSE DU TYPE CLIENT
    const clientType = analyzeClientType(selectedEnterprise);
    
    // 📊 PRÉPARATION PAYLOAD COMPLET avec toutes les données disponibles
    const payload = {
        action: 'bon_commande',
        data: {
            // Données de base
            enterprise_id: selectedEnterprise.id,
            enterprise_name: selectedEnterprise.name,
            nom_entreprise: selectedEnterprise.name,
            
            // Contact
            contact_nom: selectedEnterprise.interlocuteur || 'Contact Entreprise',
            email_contact: selectedEnterprise.email_contact || selectedEnterprise.email,
            telephone: selectedEnterprise.telephone || selectedEnterprise.portable,
            
            // Adresse
            adresse: selectedEnterprise.adresse,
            commune: selectedEnterprise.commune,
            
            // Type de client
            client_type: clientType.type,
            is_renewal: clientType.is_renewal,
            
            // 🆕 DONNÉES HISTORIQUES pour renouvellement
            format_2025: clientType.historical_data.format_2025,
            mois_2025: clientType.historical_data.mois_2025,
            montant_2025: clientType.historical_data.montant_2025,
            mode_paiement_2025: clientType.historical_data.mode_paiement_2025,
            
            // Métadonnées
            user_id: user.id,
            source: 'mini_crm_direct',
            timestamp: new Date().toISOString()
        }
    };
    
    console.log(`🎯 ${clientType.type.toUpperCase()} détecté:`, clientType);
    
    // 🔄 APPEL AU WORKFLOW BON DE COMMANDE (via Gateway Entities)
    updateStatus(`📧 Envoi email ${clientType.type}...`);
    
    const response = await fetch(N8N_WEBHOOKS.GATEWAY_ENTITIES, {
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
    
    // 🎉 AFFICHAGE RÉSULTAT
    const messageType = clientType.is_renewal ? 'renouvellement' : 'nouveau client';
    
    showMessage(`✅ Email ${messageType} envoyé à ${selectedEnterprise.name}!`);
    updateStatus(`✅ Formulaire ${messageType} envoyé`);
    
    // 🆕 AFFICHAGE DÉTAILS selon le type
    if (clientType.is_renewal && clientType.historical_data.format_2025) {
        setTimeout(() => {
            showMessage(`📋 Rappel 2025: ${clientType.historical_data.format_2025} - ${clientType.historical_data.montant_2025}€`);
        }, 1500);
    }
    
    setTimeout(() => {
        showMainMenu();
    }, 3000);
}

// 🔍 FONCTION D'ANALYSE TYPE CLIENT
function analyzeClientType(enterprise) {
    console.log('🔍 Analyse type client pour:', enterprise.name);
    console.log('📊 Client_2025:', enterprise.Client_2025);
    console.log('📊 client_2025:', enterprise.client_2025);
    console.log('📊 _original.client_2025:', enterprise._original?.client_2025);
    console.log('📊 format_encart_2025:', enterprise.format_encart_2025);
    console.log('📊 montant_payé_2024:', enterprise.montant_payé_2024);
    
    // 🔧 CORRECTION : Vérifier toutes les variantes possibles
    const isClient2025 = enterprise.Client_2025 === 'Oui' || 
                         enterprise.client_2025 === 'Oui' ||
                         enterprise._original?.client_2025 === 'Oui';
    const hasHistoricalData = enterprise.format_encart_2025 || 
                             enterprise.montant_payé_2024 ||
                             enterprise._original?.format_encart_2025 ||
                             enterprise._original?.montant_payé_2024;
    
    // Extraction données historiques avec fallback sur _original
    const historicalData = {
        format_2025: null,
        mois_2025: null,
        montant_2025: null,
        mode_paiement_2025: null
    };
    
    if (isClient2025) {
        // Mapping des formats depuis les options Baserow
        const formatMapping = {
            2984058: '6X4',   // 6X4
            2984059: '6X8',   // 6X8  
            2984060: '12X4'   // 12X4
        };
        
        const paiementMapping = {
            2984072: 'Chèque',    // Chèque
            2984073: 'Virement'   // Virement
        };
        
        // 🔧 UTILISER _original si les données principales sont vides
        const sourceData = enterprise._original || enterprise;
        
        historicalData.format_2025 = formatMapping[sourceData.format_encart_2025] || 
                                     sourceData.format_encart_2025?.value || 
                                     sourceData.format_encart_2025 || null;
        historicalData.mois_2025 = sourceData.mois_parution_2025 || null;
        historicalData.montant_2025 = sourceData.montant_payé_2024 || null;
        historicalData.mode_paiement_2025 = paiementMapping[sourceData.mode_paiement_2024] || 
                                           sourceData.mode_paiement_2024?.value || 
                                           sourceData.mode_paiement_2024 || null;
    }
    
    const result = {
        type: isClient2025 ? 'renouvellement' : 'nouveau',
        is_renewal: isClient2025,
        has_historical_data: hasHistoricalData,
        historical_data: historicalData
    };
    
    console.log('✅ Analyse terminée:', result);
    return result;
}

// 🔧 FONCTION INCHANGÉE - pour showCreateQualificationFirst si besoin
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

async function createQualification() {
    if (!selectedEnterprise) {
        showMessage('Veuillez sélectionner une entreprise');
        return;
    }

    // Récupération des données du formulaire
    const modePaiement = document.getElementById('modePaiement').value;
    const interlocuteur = document.getElementById('interlocuteur').value;
    const emailContact = document.getElementById('emailContact').value;
    const commentaires = document.getElementById('commentaires').value;
    
    // 🆕 RÉCUPÉRATION DONNÉES PARUTIONS MULTIPLES
    const publications = collectPublicationsData();
    const selectedOffer = window.selectedOffer;

    updateStatus('🎯 Création qualification...');

    try {
        const qualificationData = {
            action: 'qualification',
            data: {
                enterprise_id: selectedEnterprise.id,
                enterprise_name: selectedEnterprise.name,
                enterprise_adresse: selectedEnterprise.adresse,
                enterprise_commune: selectedEnterprise.commune,
                enterprise_telephone: selectedEnterprise.telephone,
                publications: publications,
                mode_paiement: modePaiement,
                interlocuteur: interlocuteur || null,
                email_contact: emailContact || null,
                commentaires: commentaires || null,
                nombre_parutions: publications.length,
                // 🆕 DONNÉES OFFRE INTELLIGENTE
                offre_type: selectedOffer?.offre_type || 'standard',
                prix_total: calculateTotalPrice(publications),
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
// 🆕 GESTION PARUTIONS MULTIPLES
// ================================

let publicationCounter = 0;

function addPublication() {
    publicationCounter++;
    const publicationsList = document.getElementById('publicationsList');
    
    const publicationDiv = document.createElement('div');
    publicationDiv.className = 'publication-item';
    publicationDiv.id = `publication-${publicationCounter}`;
    
    publicationDiv.innerHTML = `
        <div class="publication-header">
            <span class="publication-title">📅 Parution ${publicationCounter}</span>
            <button type="button" class="btn btn-remove" onclick="removePublication(${publicationCounter})">❌</button>
        </div>
        <div class="publication-fields">
            <div class="form-field">
                <label>Mois :</label>
                <select class="form-select" id="mois-${publicationCounter}" onchange="updateTotalPrice()">
                    <option value="">Sélectionner...</option>
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
            <div class="form-field">
                <label>Format :</label>
                <select class="form-select" id="format-${publicationCounter}" onchange="updateTotalPrice()">
                    <option value="">Sélectionner...</option>
                    <option value="6X4">6X4 (350€)</option>
                    <option value="6X8">6X8 (500€)</option>
                    <option value="12X4">12X4 (500€)</option>
                    <option value="12PARUTIONS">12 parutions (1800€)</option>
                </select>
            </div>
            <div class="form-field">
                <label>Type :</label>
                <select class="form-select" id="type-${publicationCounter}" onchange="updateTotalPrice()">
                    <option value="payant">💰 Payant</option>
                    <option value="offert">🎁 Offert</option>
                </select>
            </div>
            <div class="publication-price" id="price-${publicationCounter}">0€</div>
        </div>
    `;
    
    publicationsList.appendChild(publicationDiv);
    updateTotalPrice();
}

function removePublication(id) {
    const publicationDiv = document.getElementById(`publication-${id}`);
    if (publicationDiv) {
        publicationDiv.remove();
        updateTotalPrice();
    }
}

function collectPublicationsData() {
    const publications = [];
    const publicationItems = document.querySelectorAll('.publication-item');
    
    publicationItems.forEach(item => {
        const id = item.id.split('-')[1];
        const mois = document.getElementById(`mois-${id}`).value;
        const format = document.getElementById(`format-${id}`).value;
        const type = document.getElementById(`type-${id}`).value;
        
        if (mois && format) {
            publications.push({
                mois: mois,
                format: format,
                type: type,
                prix: type === 'offert' ? 0 : getBasePriceByFormat(format)
            });
        }
    });
    
    return publications;
}

function calculateTotalPrice(publications) {
    return publications.reduce((total, pub) => total + pub.prix, 0);
}

function updateTotalPrice() {
    const publications = collectPublicationsData();
    const total = calculateTotalPrice(publications);
    document.getElementById('priceDisplay').textContent = `Prix total : ${total}€`;
    
    // Mettre à jour les prix individuels
    publications.forEach((pub, index) => {
        const publicationItems = document.querySelectorAll('.publication-item');
        if (publicationItems[index]) {
            const id = publicationItems[index].id.split('-')[1];
            const priceElement = document.getElementById(`price-${id}`);
            if (priceElement) {
                priceElement.textContent = pub.type === 'offert' ? '🎁 Offert' : `${pub.prix}€`;
                priceElement.className = pub.type === 'offert' ? 'publication-price free' : 'publication-price paid';
            }
        }
    });
}


// Initialiser avec une première parution quand le formulaire de qualification est affiché
function initializePublications() {
    if (document.getElementById('publicationsList')) {
        publicationCounter = 0; // Reset counter
        addPublication();
    }
}

// ================================
// 📋 VALIDATION QUALIFICATION EXISTANTE
// ================================

// 🔧 FONCTION MODIFIÉE - showQualificationValidationDialog

function showQualificationValidationDialog(qualificationData, documentType) {
    console.log('📋 Affichage dialog qualification simplifié...');
    console.log('📊 Données qualification:', qualificationData);
    console.log('📄 Type document:', documentType);
    
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
            
            <div class="form-group">
                <label>Mode de paiement :</label>
                <select id="validationPaiement">
                    <option value="Virement" ${qualificationData.mode_paiement?.value === 'Virement' ? 'selected' : ''}>Virement</option>
                    <option value="Cheque" ${qualificationData.mode_paiement?.value === 'Cheque' ? 'selected' : ''}>Chèque</option>
                    <option value="Carte" ${qualificationData.mode_paiement?.value === 'Carte' ? 'selected' : ''}>Carte</option>
                    <option value="Especes" ${qualificationData.mode_paiement?.value === 'Especes' ? 'selected' : ''}>Espèces</option>
                </select>
            </div>
            
            <!-- 🆕 SECTION PAIEMENT SIMPLIFIÉE pour FACTURE -->
            ${documentType === 'facture' ? `
                <div class="form-group" style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; margin: 15px 0; background: #f8f9fa;">
                    <h4 style="margin: 0 0 10px 0; color: #1d3557;">💰 Informations de paiement</h4>
                    <p style="font-size: 12px; color: #666; margin-bottom: 15px;">
                        Si le paiement a été reçu, renseignez la référence ci-dessous. 
                        <br><strong>Sinon, laissez vide pour une facture normale.</strong>
                    </p>
                    
                    <div class="form-group">
                        <label>Référence paiement (si payé) :</label>
                        <input type="text" id="referencePaiement" 
                               placeholder="Ex: CHK123456, VIR789012, CB-1234..." 
                               oninput="updatePaymentStatus()">
                        <div class="readonly-indicator" style="font-size: 11px; color: #666; margin-top: 2px;">
                            💡 Si renseigné → Facture acquittée automatiquement
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Date de paiement :</label>
                        <input type="date" id="datePaiement" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    
                    <!-- Indicateur visuel du statut -->
                    <div id="paymentStatusIndicator" style="margin-top: 10px; padding: 8px; border-radius: 5px; text-align: center; font-weight: 600;">
                        📄 Facture normale (à régler)
                    </div>
                </div>
            ` : ''}
            
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
    
    // 🎯 INITIALISER LA LOGIQUE AUTOMATIQUE pour factures
    if (documentType === 'facture') {
        console.log('💳 Initialisation logique paiement automatique...');
        setTimeout(() => {
            updatePaymentStatus(); // État initial
        }, 100);
    }
    
    console.log('✅ Dialog qualification simplifié affiché');
}




// 🆕 FONCTION améliorée pour confirmer la génération
async function confirmGenerateDocument(documentType) {
    const qualData = window.currentQualificationData;
    
    console.log('🎯 Génération document avec logique paiement simplifiée...');
    console.log('📋 Type document:', documentType);
    
    // 📊 RÉCUPÉRATION DONNÉES DE BASE
    const baseData = {
        enterprise_id: selectedEnterprise.id,
        enterprise_name: selectedEnterprise.name,
        enterprise_adresse: selectedEnterprise.adresse,
        enterprise_commune: selectedEnterprise.commune,
        enterprise_telephone: selectedEnterprise.telephone,
        format_encart: document.getElementById('validationFormat').value,
        mois_parution: qualData.mois_parution,
        mode_paiement: document.getElementById('validationPaiement').value,
        interlocuteur: document.getElementById('validationInterlocuteur').value,
        email_contact: qualData.email_contact,
        prix_total: qualData.prix_total,
        qualification_id: qualData.id,
        user_id: user.id
    };
    
    // 🎯 LOGIQUE PAIEMENT SIMPLIFIÉE POUR FACTURES
    if (documentType === 'facture') {
        console.log('💰 Application logique paiement automatique...');
        
        const referencePaiementElement = document.getElementById('referencePaiement');
        const datePaiementElement = document.getElementById('datePaiement');
        
        const referenceValue = referencePaiementElement ? referencePaiementElement.value.trim() : '';
        const hasPaymentReference = referenceValue.length > 0;
        
        if (hasPaymentReference) {
            // ✅ RÉFÉRENCE FOURNIE = FACTURE PAYÉE
            baseData.est_payee = true;
            baseData.reference_paiement = referenceValue;
            
            if (datePaiementElement && datePaiementElement.value) {
                baseData.date_paiement = datePaiementElement.value;
            }
            
            console.log('✅ AUTOMATIQUE: Facture PAYÉE');
            console.log('📝 Référence:', baseData.reference_paiement);
            console.log('📅 Date:', baseData.date_paiement);
            
        } else {
            // ❌ AUCUNE RÉFÉRENCE = FACTURE NORMALE
            baseData.est_payee = false;
            console.log('📄 AUTOMATIQUE: Facture NON PAYÉE');
        }
    }
    
    // 🎯 CONSTRUCTION PAYLOAD FINAL
    const finalData = {
        action: documentType,
        data: baseData
    };
    
    // 📊 DEBUG - Afficher le payload final
    console.log('📤 Payload final (logique simplifiée):', JSON.stringify(finalData, null, 2));
    console.log('💰 est_payee dans payload:', finalData.data.est_payee);
    console.log('📝 reference_paiement:', finalData.data.reference_paiement);
    
    // 🔄 ENVOI ET TRAITEMENT (reste identique)
    updateStatus('⚡ Génération en cours...');
    showLoadingState(documentType);
    
    try {
        const response = await fetch(N8N_WEBHOOKS.GATEWAY_ENTITIES, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(finalData)
        });
        
        console.log('📡 Réponse reçue, status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur HTTP:', response.status, errorText);
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📋 Résultat reçu:', result);
        
        if (result.success === false) {
            throw new Error(result.error?.message || result.message || 'Erreur lors de la génération');
        }
        
        // ✅ SUCCÈS
        hideLoadingState();
        
        if (result.data?.file_url) {
            showDocumentSuccessDialog(result, documentType);
        } else if (result.workflow_info?.pdf_generated) {
            showMessage(`🔄 ${documentType.toUpperCase()} en cours de finalisation...`);
            setTimeout(() => checkDocumentStatus(result.data.document_id), 3000);
        } else {
            showMessage(`✅ ${documentType.toUpperCase()} générée avec succès !`);
            showMainMenu();
        }
        
    } catch (error) {
        console.error('💥 Erreur génération document:', error);
        hideLoadingState();
        
        if (error.message.includes('HTTP 50')) {
            showMessage('❌ Erreur serveur. Veuillez réessayer dans quelques instants.');
        } else if (error.message.includes('timeout')) {
            showMessage('⏱️ Délai dépassé. Vérifiez votre connexion et réessayez.');
        } else {
            showMessage(`❌ Erreur: ${error.message}`);
        }
        
        updateStatus('❌ Erreur de génération');
    }
}


// 🎉 NOUVEAU DIALOG DE SUCCÈS
function showDocumentSuccessDialog(result, documentType) {
    const data = result.data;
    
    const dialogHTML = `
        <div class="success-dialog">
            <div class="success-title">
                ✅ ${documentType.toUpperCase()} générée avec succès !
            </div>
            
            <div class="document-info">
                <div class="info-row">
                    <span>📄 Référence :</span>
                    <span>${data.reference}</span>
                </div>
                <div class="info-row">
                    <span>🏢 Entreprise :</span>
                    <span>${data.enterprise_name}</span>
                </div>
                <div class="info-row">
                    <span>💰 Montant :</span>
                    <span>${data.amount}</span>
                </div>
                <div class="info-row">
                    <span>📧 Email envoyé :</span>
                    <span>${data.email_sent ? '✅ Oui' : '❌ Non'}</span>
                </div>
            </div>
            
            <div class="action-buttons">
                ${data.preview_url ? `<button class="btn btn-primary" onclick="openPreview('${data.preview_url}')">👁️ Prévisualiser</button>` : ''}
                ${data.file_url ? `<button class="btn btn-primary" onclick="downloadFile('${data.file_url}', '${data.filename}')">⬇️ Télécharger</button>` : ''}
                ${!data.email_sent && data.contact ? `<button class="btn btn-secondary" onclick="sendDocumentByEmail('${data.document_id}')">📧 Envoyer par email</button>` : ''}
                <button class="btn btn-secondary" onclick="closeSuccessDialog()">✅ Terminé</button>
            </div>
        </div>
    `;
    
    document.getElementById('stateTitle').innerHTML = 'Document généré';
    document.getElementById('stateContent').innerHTML = dialogHTML;
    document.getElementById('conversationState').style.display = 'block';
    
    updateStatus(`✅ ${documentType} prête - Référence: ${data.reference}`);
}

// 🔄 FONCTIONS UTILITAIRES
function showLoadingState(documentType) {
    const loadingHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <div class="loading-text">Génération de votre ${documentType} en cours...</div>
            <div class="loading-steps">
                <div class="step active">📄 Création du document</div>
                <div class="step">💾 Sauvegarde sur Drive</div>
                <div class="step">📧 Préparation email</div>
                <div class="step">✅ Finalisation</div>
            </div>
        </div>
    `;
    
    document.getElementById('stateContent').innerHTML = loadingHTML;
    document.getElementById('conversationState').style.display = 'block';
}

function hideLoadingState() {
    // Animation de sortie optionnelle
    const loadingDiv = document.querySelector('.loading-state');
    if (loadingDiv) {
        loadingDiv.style.opacity = '0';
        setTimeout(() => {
            loadingDiv.remove();
        }, 300);
    }
}

// 🎬 ACTIONS POST-GÉNÉRATION
function openPreview(url) {
    window.open(url, '_blank');
    updateStatus('👁️ Prévisualisation ouverte');
}

function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'document.pdf';
    link.click();
    updateStatus('⬇️ Téléchargement lancé');
}

async function sendDocumentByEmail(documentId) {
    try {
        updateStatus('📧 Envoi en cours...');
        
        const response = await fetch(N8N_WEBHOOKS.EMAIL_WORKFLOW, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'send_document',
                document_id: documentId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('📧 Email envoyé avec succès !');
            updateStatus('✅ Email envoyé');
        } else {
            throw new Error(result.message || 'Erreur envoi email');
        }
        
    } catch (error) {
        showMessage(`❌ Erreur envoi email: ${error.message}`);
        updateStatus('❌ Erreur envoi email');
    }
}

function closeSuccessDialog() {
    document.getElementById('conversationState').style.display = 'none';
    showMainMenu();
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

// 🆕 NOUVELLE FONCTION - Mise à jour automatique du statut
function updatePaymentStatus() {
    const referencePaiement = document.getElementById('referencePaiement');
    const indicator = document.getElementById('paymentStatusIndicator');
    
    if (!referencePaiement || !indicator) return;
    
    const hasReference = referencePaiement.value.trim().length > 0;
    
    if (hasReference) {
        // ✅ PAIEMENT REÇU
        indicator.innerHTML = '✅ Facture acquittée (paiement reçu)';
        indicator.style.background = '#d1fae5';
        indicator.style.color = '#065f46';
        indicator.style.border = '1px solid #10b981';
        
        console.log('✅ Statut: PAYÉE - Référence:', referencePaiement.value);
    } else {
        // ❌ FACTURE NORMALE
        indicator.innerHTML = '📄 Facture normale (à régler)';
        indicator.style.background = '#fef3c7';
        indicator.style.color = '#92400e';
        indicator.style.border = '1px solid #f59e0b';
        
        console.log('📄 Statut: NON PAYÉE');
    }
}

// ========================================================================
// 🎯 GÉNÉRATEUR DE DOCUMENT INTELLIGENT - Parutions multiples
// Amélioration du workflow Gateway Entities pour factures précises
// ========================================================================

// ========================================================================
// 1. NOUVELLE FONCTION - Analyser les publications depuis les commentaires
// ========================================================================

function parsePublicationsFromComments(commentaires, moisParution, prixTotal, formatPrincipal) {
    console.log('🔍 Analyse publications depuis commentaires:', commentaires);
    
    // Chercher le pattern "Publications: ..."
    const publicationsRegex = /Publications:\s*([^|]+)/i;
    const match = commentaires.match(publicationsRegex);
    
    if (!match) {
        console.log('❌ Pas de détail publications trouvé, utilisation des données simples');
        return {
            publications: [{
                mois: moisParution,
                format: formatPrincipal,
                prix: prixTotal,
                type: 'payant'
            }],
            has_multiple: false,
            has_free: false
        };
    }
    
    const publicationsText = match[1].trim();
    console.log('📋 Texte publications extrait:', publicationsText);
    
    // Parser chaque publication: "Mai 6X8 (500€), Juin 6X8 (500€), Juillet 6X4 (offert)"
    const publicationItems = publicationsText.split(',').map(item => item.trim());
    const publications = [];
    
    publicationItems.forEach(item => {
        // Pattern: "Mois Format (prix)" ou "Mois Format (offert)"
        const itemMatch = item.match(/(\w+)\s+(\w+)\s+\(([^)]+)\)/);
        
        if (itemMatch) {
            const [, mois, format, priceInfo] = itemMatch;
            
            let prix = 0;
            let type = 'payant';
            
            if (priceInfo.toLowerCase().includes('offert') || priceInfo.toLowerCase().includes('gratuit')) {
                prix = 0;
                type = 'offert';
            } else {
                // Extraire le prix : "500€" -> 500
                const prixMatch = priceInfo.match(/(\d+)/);
                prix = prixMatch ? parseInt(prixMatch[1]) : 0;
            }
            
            publications.push({
                mois: mois.trim(),
                format: format.trim(),
                prix: prix,
                type: type
            });
            
            console.log(`📅 Publication parsée: ${mois} ${format} ${prix}€ (${type})`);
        }
    });
    
    const hasMultiple = publications.length > 1;
    const hasFree = publications.some(p => p.type === 'offert');
    
    console.log(`✅ ${publications.length} publication(s) analysée(s), ${hasFree ? 'avec gratuités' : 'toutes payantes'}`);
    
    return {
        publications: publications,
        has_multiple: hasMultiple,
        has_free: hasFree
    };
}

// ========================================================================
// 2. FONCTION AMÉLIORÉE - Préparer données pour génération facture
// ========================================================================

function prepareEnhancedInvoiceData(qualificationData, documentType = 'facture') {
    console.log('📄 Préparation données facture/BC améliorée');
    
    // Extraction des données de base
    const baseData = {
        nom_entreprise: qualificationData.nom_entreprise || '',
        interlocuteur: qualificationData.interlocuteur || '',
        email: qualificationData.email_contact || '',
        telephone: qualificationData.Telephone_Contact || '',
        adresse: qualificationData.adresse || '',
        prix_total: qualificationData.prix_total || 0,
        mode_paiement: qualificationData.mode_paiement?.value || 'Virement',
        commentaires: qualificationData.commentaires || ''
    };
    
    // 🎯 ANALYSE DES PUBLICATIONS
    const publicationsAnalysis = parsePublicationsFromComments(
        baseData.commentaires,
        qualificationData.mois_parution,
        parseInt(baseData.prix_total),
        qualificationData.format_encart?.value || '6X4'
    );
    
    // 🎯 GÉNÉRATION DONNÉES POUR TEMPLATE
    if (publicationsAnalysis.has_multiple) {
        // === CAS PARUTIONS MULTIPLES ===
        console.log('📋 Génération pour parutions multiples');
        
        const publicationsPayantes = publicationsAnalysis.publications.filter(p => p.type === 'payant');
        const publicationsOffertes = publicationsAnalysis.publications.filter(p => p.type === 'offert');
        
        return {
            ...baseData,
            
            // Type de document
            document_type: documentType,
            is_multi_publications: true,
            
            // Publications détaillées
            publications_detail: publicationsAnalysis.publications,
            publications_payantes: publicationsPayantes,
            publications_offertes: publicationsOffertes,
            
            // Résumés pour affichage
            description_ligne1: generateMultiPublicationsDescription(publicationsPayantes),
            description_ligne2: publicationsOffertes.length > 0 ? 
                `+ ${publicationsOffertes.length} parution(s) offerte(s): ${publicationsOffertes.map(p => `${p.mois} ${p.format}`).join(', ')}` : null,
            
            // Prix
            montant_payant: publicationsPayantes.reduce((sum, p) => sum + p.prix, 0),
            montant_offert: publicationsOffertes.reduce((sum, p) => sum + (p.prix || 0), 0),
            
            // Format principal (pour fallback)
            format_principal: findMostUsedFormat(publicationsAnalysis.publications),
            mois_liste: publicationsAnalysis.publications.map(p => p.mois).join(', '),
            
            // Flags
            has_free_publications: publicationsOffertes.length > 0,
            total_publications: publicationsAnalysis.publications.length
        };
        
    } else {
        // === CAS PUBLICATION SIMPLE ===
        console.log('📋 Génération pour publication simple');
        
        const publication = publicationsAnalysis.publications[0];
        
        return {
            ...baseData,
            document_type: documentType,
            is_multi_publications: false,
            
            // Publication unique
            format_encart: publication.format,
            mois_parution: publication.mois,
            prix_unitaire: publication.prix,
            
            // Description simple
            description_ligne1: `Insertion publicitaire ${publication.format} - ${publication.mois} 2026`,
            description_ligne2: null,
            
            // Prix
            montant_payant: publication.prix,
            montant_offert: 0,
            
            // Flags
            has_free_publications: false,
            total_publications: 1
        };
    }
}

// ========================================================================
// 3. FONCTIONS UTILITAIRES
// ========================================================================

function generateMultiPublicationsDescription(publicationsPayantes) {
    if (publicationsPayantes.length === 0) return 'Prestations publicitaires';
    
    // Grouper par format
    const formatGroups = {};
    publicationsPayantes.forEach(pub => {
        if (!formatGroups[pub.format]) {
            formatGroups[pub.format] = [];
        }
        formatGroups[pub.format].push(pub.mois);
    });
    
    // Générer description par format
    const descriptions = Object.entries(formatGroups).map(([format, mois]) => {
        if (mois.length === 1) {
            return `${format} ${mois[0]}`;
        } else {
            return `${format} (${mois.join(', ')})`;
        }
    });
    
    return `Insertions publicitaires: ${descriptions.join(' + ')} - Calendrier 2026`;
}

function findMostUsedFormat(publications) {
    const formatCounts = {};
    publications.forEach(pub => {
        formatCounts[pub.format] = (formatCounts[pub.format] || 0) + 1;
    });
    
    return Object.keys(formatCounts).reduce((a, b) => 
        formatCounts[a] > formatCounts[b] ? a : b
    ) || '6X4';
}

// ========================================================================
// 4. FONCTION UTILITAIRE - Génération numéro de document
// ========================================================================

function generateDocumentNumber(type) {
    const prefix = type === 'facture' ? 'FA' : 'BC';
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = String(date.getTime()).slice(-6);
    
    return `${prefix}-${year}-${month}${day}-${time}`;
}