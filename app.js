// ================================
// 🚒 CRM CALENDRIER SAPEURS-POMPIERS
// Version modulaire refactorisée
// ================================

// Imports des modules de configuration
import { initTelegramWebApp, getTelegramUser, showTelegramMessage } from './src/config/telegram.js';
import { UI_ELEMENTS, ACTIONS } from './src/config/constants.js';

// Imports des utilitaires
import { updateStatus, initializeUserInterface, showAutoFillStatus } from './src/utils/ui.js';
import { formatPrice, getActionLabel, formatNumber, formatPercentage } from './src/utils/formatters.js';

// Imports des services
import { enterpriseService } from './src/services/enterpriseService.js';
import { qualificationService } from './src/services/qualificationService.js';
import { documentService } from './src/services/documentService.js';
import { apiService } from './src/services/api.js';

// Imports des composants
import { navigationManager } from './src/components/navigation.js';
import { searchManager } from './src/components/search.js';
import { formManager } from './src/components/forms.js';
import { publicationsManager } from './src/components/publications.js';
import { statsManager } from './src/components/stats.js';

// Imports des features
import { smartOffersManager } from './src/features/smartOffers.js';
import { autoFillManager } from './src/features/autoFill.js';
import { documentGenerationManager } from './src/features/documentGeneration.js';

// ================================
// 🌍 VARIABLES GLOBALES (Maintenues pour compatibilité)
// ================================
let currentState = 'main_menu';
let selectedEnterprise = null;
let currentAction = null;
let searchTimeout = null;

// Cache de recherche et optimisation (maintenu globalement)
const searchCache = {};
let lastSearchQuery = null;

// Variables pour système d'offres (maintenues globalement)
window.selectedOffer = null;
window.qualificationData = null;

// Variables pour les résultats de recherche (maintenues globalement)
let currentSearchResults = [];

// ================================
// 🔄 FONCTION PRINCIPALE D'INITIALISATION
// ================================
async function initializeApp() {
    try {
        // Initialise Telegram WebApp
        initTelegramWebApp();
        
        // Obtient les données utilisateur
        const user = getTelegramUser();
        
        // Initialise l'interface utilisateur
        initializeUserInterface(user);
        
        // Initialise les gestionnaires
        navigationManager.initialize();
        searchManager.initialize();
        statsManager.initialize();
        
        // Configure les événements globaux
        setupGlobalEventHandlers();
        
        // Configure l'auto-remplissage
        setupAutoFillIntegration();
        
        updateStatus('🟢 CRM connecté • MCP Active • Agent CRM prêt');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        updateStatus('❌ Erreur d\'initialisation');
        showMessage('Erreur lors de l\'initialisation de l\'application');
    }
}

// ================================
// 🎮 GESTIONNAIRES D'ÉVÉNEMENTS GLOBAUX
// ================================
function setupGlobalEventHandlers() {
    // Gestionnaire de sélection d'entreprise
    window.addEventListener('enterpriseSelected', (event) => {
        selectedEnterprise = event.detail;
        handleEnterpriseSelection(selectedEnterprise);
    });
    
    // Gestionnaire de changement d'offre
    window.addEventListener('offerSelected', (event) => {
        window.selectedOffer = event.detail;
        updateOfferDisplay(event.detail);
    });
    
    // Gestionnaire d'erreurs globales
    window.addEventListener('error', (event) => {
        console.error('Erreur globale:', event.error);
        updateStatus('❌ Erreur système');
    });
}

// ================================
// 🤖 INTÉGRATION AUTO-REMPLISSAGE
// ================================
function setupAutoFillIntegration() {
    // Auto-remplissage lors de sélection d'entreprise
    window.addEventListener('enterpriseSelected', async (event) => {
        if (currentAction && autoFillManager.isAutoFillEnabled()) {
            try {
                await autoFillManager.autoFillEnterpriseForm(event.detail);
                
                // Auto-remplissage spécifique selon l'action
                if (currentAction === 'qualification') {
                    await autoFillManager.autoFillQualificationForm(event.detail, currentAction);
                }
            } catch (error) {
                console.error('Erreur auto-remplissage:', error);
                showAutoFillStatus('❌ Erreur auto-remplissage');
            }
        }
    });
}

// ================================
// 🏢 GESTION DES ENTREPRISES
// ================================
function handleEnterpriseSelection(enterprise) {
    if (!enterprise) return;
    
    updateStatus(`✅ Entreprise sélectionnée: ${enterprise.nom || enterprise.name}`);
    
    // Traite selon l'action courante
    switch (currentAction) {
        case ACTIONS.FACTURE:
            handleDocumentGeneration(enterprise, 'facture');
            break;
        case ACTIONS.BON_COMMANDE:
            handleDocumentGeneration(enterprise, 'bon_commande');
            break;
        case ACTIONS.QUALIFICATION:
            showQualificationInterface(enterprise);
            break;
        case ACTIONS.FORMULAIRE:
            handleFormSending(enterprise);
            break;
        default:
            showEnterpriseDetails(enterprise);
    }
}

// ================================
// 📄 GÉNÉRATION DE DOCUMENTS
// ================================
async function handleDocumentGeneration(enterprise, documentType) {
    try {
        // Vérifie si l'entreprise a des données suffisantes
        if (!enterprise.nom && !enterprise.name) {
            showMessage('❌ Données entreprise insuffisantes pour générer le document');
            return;
        }

        // Prépare les données de qualification de base
        const baseQualificationData = {
            enterprise: enterprise,
            action_type: documentType,
            publications: window.qualificationData?.publications || [],
            total_price: window.qualificationData?.total_price || 0,
            created_at: new Date().toISOString()
        };

        // Applique l'offre sélectionnée si disponible
        let finalQualificationData = baseQualificationData;
        if (window.selectedOffer) {
            finalQualificationData = smartOffersManager.applyOfferToQualification(
                window.selectedOffer, 
                baseQualificationData
            );
        }

        // Génère le document avec l'IA
        const result = await documentGenerationManager.generateIntelligentDocument(
            finalQualificationData,
            documentType,
            { enhanced: true, includeAnalysis: true }
        );

        if (result.success) {
            showDocumentSuccess(result, documentType);
        } else {
            showMessage(`❌ Erreur lors de la génération: ${result.error}`);
        }

    } catch (error) {
        console.error('Erreur génération document:', error);
        showMessage('❌ Erreur lors de la génération du document');
    }
}

// ================================
// 🎯 INTERFACE DE QUALIFICATION
// ================================
function showQualificationInterface(enterprise) {
    const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
    if (!contentDiv) return;

    // Crée le formulaire de qualification
    contentDiv.innerHTML = formManager.createQualificationForm(enterprise, currentAction);
    
    // Initialise le formulaire avec callback
    formManager.initializeForm('qualificationForm', async (formData) => {
        await handleQualificationSubmission(formData);
    });

    // Génère et affiche les offres intelligentes
    showSmartOffersForEnterprise(enterprise);
}

// ================================
// 💡 OFFRES INTELLIGENTES
// ================================
async function showSmartOffersForEnterprise(enterprise) {
    try {
        // Calcule les offres intelligentes
        const offers = smartOffersManager.calculateSmartOffers(enterprise, '1/4 page');
        
        if (offers.length > 0) {
            // Ajoute la section des offres à l'interface
            const offersHtml = smartOffersManager.createOffersInterface(offers);
            const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
            
            if (contentDiv) {
                contentDiv.innerHTML += `
                    <div class="qualification-offers-section">
                        <h4>💡 Offres personnalisées</h4>
                        ${offersHtml}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Erreur génération offres:', error);
    }
}

// ================================
// 📝 SOUMISSION DE QUALIFICATION
// ================================
async function handleQualificationSubmission(formData) {
    try {
        updateStatus('🎯 Création de la qualification...');
        
        // Enrichit les données avec les publications et l'offre
        const enrichedData = {
            ...formData,
            publications: formData.publications || [],
            applied_offer: window.selectedOffer || null,
            created_by: 'WebApp',
            created_at: new Date().toISOString()
        };

        // Crée la qualification
        const result = await qualificationService.createQualification(enrichedData);
        
        if (result.success) {
            // Sauvegarde globalement pour usage ultérieur
            window.qualificationData = result.data;
            
            updateStatus('✅ Qualification créée avec succès');
            showMessage('🎯 Qualification créée avec succès !');
            
            // Propose la génération de document
            showDocumentGenerationOptions(enrichedData);
        } else {
            showMessage(`❌ Erreur: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Erreur soumission qualification:', error);
        showMessage('❌ Erreur lors de la création de la qualification');
    }
}

// ================================
// 📊 INTERFACE STATISTIQUES
// ================================
function showStatsInterface() {
    const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
    if (!contentDiv) return;

    // Crée l'interface des statistiques
    contentDiv.innerHTML = statsManager.createStatsInterface();
    
    // Charge les statistiques
    statsManager.loadStats();
}

// ================================
// 🔍 FONCTIONS DE RECHERCHE (Legacy)
// ================================
function handleSearch(query) {
    searchManager.handleSearch(query);
    currentSearchResults = searchManager.currentSearchResults;
}

function selectEnterprise(index) {
    searchManager.selectEnterprise(index);
}

// ================================
// 📱 FONCTIONS TELEGRAM
// ================================
function showMessage(message) {
    // Essaie d'abord Telegram
    if (!showTelegramMessage(message)) {
        // Fallback vers status et console
        updateStatus(message);
        console.log('📱 Message:', message);
        
        if (message.includes('Erreur') || message.includes('❌')) {
            alert(message);
        }
    }
}

// ================================
// 📄 GESTION DES DOCUMENTS
// ================================
function showDocumentSuccess(result, documentType) {
    const documentLabel = getActionLabel(documentType);
    showMessage(`✅ ${documentLabel} généré avec succès !`);
    
    if (result.data?.url) {
        // Propose le téléchargement ou l'envoi par email
        showDocumentActions(result.data, documentType);
    }
}

function showDocumentActions(documentData, documentType) {
    const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
    if (!contentDiv) return;

    const actionsHtml = `
        <div class="document-actions">
            <h4>📄 Document généré avec succès !</h4>
            <div class="document-buttons">
                <a href="${documentData.url}" target="_blank" class="btn btn-primary">
                    📥 Télécharger le document
                </a>
                <button class="btn btn-secondary" onclick="sendDocumentByEmail('${documentData.url}', '${documentType}')">
                    ✉️ Envoyer par email
                </button>
                <button class="btn btn-secondary" onclick="navigationManager.showMainMenu()">
                    🏠 Retour au menu
                </button>
            </div>
        </div>
    `;
    
    contentDiv.innerHTML += actionsHtml;
}

// ================================
// ✉️ ENVOI PAR EMAIL
// ================================
async function sendDocumentByEmail(documentUrl, documentType) {
    if (!selectedEnterprise?.email) {
        showMessage('❌ Aucune adresse email disponible pour cette entreprise');
        return;
    }

    try {
        const emailData = documentService.prepareEmailData(
            documentType,
            selectedEnterprise,
            documentUrl
        );
        
        const result = await documentService.sendDocumentByEmail(
            { url: documentUrl },
            emailData
        );
        
        if (result.success) {
            showMessage('✅ Document envoyé par email avec succès !');
        } else {
            showMessage(`❌ Erreur envoi email: ${result.error}`);
        }
    } catch (error) {
        console.error('Erreur envoi email:', error);
        showMessage('❌ Erreur lors de l\'envoi par email');
    }
}

// ================================
// 🎮 ACTIONS PRINCIPALES (Compatibilité)
// ================================
function showAction(actionType) {
    currentAction = actionType;
    
    if (actionType === ACTIONS.INTELLIGENCE) {
        callAgentOrchestrator('Analyse commerciale avancée demandée');
        return;
    }
    
    if (actionType === ACTIONS.STATS) {
        showStatsInterface();
        return;
    }
    
    return navigationManager.showAction(actionType);
}

function showMainMenu() {
    currentAction = null;
    selectedEnterprise = null;
    window.selectedOffer = null;
    window.qualificationData = null;
    
    return navigationManager.showMainMenu();
}

function showSearch() {
    return navigationManager.showSearch();
}

// ================================
// 🧠 AGENT CRM ORCHESTRATEUR
// ================================
async function callAgentOrchestrator(message) {
    try {
        updateStatus('🧠 Analyse CRM en cours...');
        
        const requestData = {
            message: message,
            context: {
                selected_enterprise: selectedEnterprise,
                current_action: currentAction,
                user_context: getTelegramUser()
            }
        };

        const result = await apiService.callWebhook('AGENT_CRM', requestData);
        
        if (result.success) {
            showMessage('🧠 Analyse terminée ! Consultez les recommandations.');
            updateStatus('✅ Analyse CRM terminée');
        } else {
            showMessage('❌ Erreur lors de l\'analyse CRM');
        }
    } catch (error) {
        console.error('Erreur agent CRM:', error);
        showMessage('❌ Erreur de connexion à l\'agent CRM');
    }
}

// ================================
// 🔧 FONCTIONS UTILITAIRES
// ================================
function showDocumentGenerationOptions(qualificationData) {
    const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
    if (!contentDiv) return;

    const optionsHtml = `
        <div class="document-generation-options">
            <h4>📄 Générer un document</h4>
            <p>Qualification créée avec succès. Que souhaitez-vous générer ?</p>
            <div class="generation-buttons">
                <button class="btn btn-primary" onclick="generateFromQualification('facture')">
                    📄 Générer une facture
                </button>
                <button class="btn btn-primary" onclick="generateFromQualification('bon_commande')">
                    📋 Générer un bon de commande
                </button>
                <button class="btn btn-secondary" onclick="navigationManager.showMainMenu()">
                    🏠 Retour au menu
                </button>
            </div>
        </div>
    `;
    
    contentDiv.innerHTML += optionsHtml;
}

async function generateFromQualification(documentType) {
    if (!window.qualificationData) {
        showMessage('❌ Aucune qualification disponible');
        return;
    }

    await handleDocumentGeneration(selectedEnterprise, documentType);
}

// ================================
// 🌐 EXPOSITION GLOBALE DES FONCTIONS
// ================================
// Exposition des fonctions principales pour compatibilité avec les événements onclick
window.showMainMenu = showMainMenu;
window.showSearch = showSearch;
window.showAction = showAction;
window.handleSearch = handleSearch;
window.selectEnterprise = selectEnterprise;
window.callAgentOrchestrator = callAgentOrchestrator;
window.sendDocumentByEmail = sendDocumentByEmail;
window.generateFromQualification = generateFromQualification;

// Exposition des gestionnaires pour les événements onclick
window.navigationManager = navigationManager;
window.searchManager = searchManager;
window.formManager = formManager;
window.publicationsManager = publicationsManager;
window.statsManager = statsManager;
window.smartOffersManager = smartOffersManager;
window.autoFillManager = autoFillManager;

// Exposition des services pour les tests
window.enterpriseService = enterpriseService;

// Exposition des fonctions de formatage
window.formatNumber = formatNumber;
window.formatPercentage = formatPercentage;

// Exposition des fonctions Telegram
window.getTelegramUser = getTelegramUser;

// 🧪 FONCTION DE TEST API TEMPORAIRE
window.testApiCall = async function() {
    console.log('🧪 Test direct API...');
    
    const testData = {
        operation: "getMany",
        search: "test",
        limit: 5
    };
    
    try {
        const response = await fetch('https://n8n.dsolution-ia.fr/webhook/recherche_entreprise', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        console.log('🧪 Response status:', response.status);
        console.log('🧪 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('🧪 Response data:', data);
    } catch (error) {
        console.error('🧪 Error:', error);
    }
};

// 🔍 FONCTION DE DIAGNOSTIC INTERFACE
window.debugInterface = function() {
    console.log('🔍 DIAGNOSTIC INTERFACE:');
    console.log('searchResults:', !!document.getElementById('searchResults'));
    console.log('enterpriseResults:', !!document.getElementById('enterpriseResults'));
    console.log('searchInput:', !!document.getElementById('searchInput'));
    console.log('stateContent:', !!document.getElementById('stateContent'));
    
    // Test d'affichage forcé
    const resultsDiv = document.getElementById('searchResults') || document.getElementById('enterpriseResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '<div style="padding: 10px; background: green; color: white;">🎯 TEST AFFICHAGE RÉUSSI</div>';
        resultsDiv.style.display = 'block';
        console.log('✅ Test affichage injecté');
    } else {
        console.log('❌ Aucun div de résultats trouvé');
    }
};

// 🔍 FONCTION DE TEST RECHERCHE
window.testSearch = async function() {
    console.log('🔍 TEST RECHERCHE:');
    
    try {
        // Test direct du service
        const result = await window.enterpriseService?.searchEnterprises('drone', {limit: 3});
        console.log('📊 Résultat searchEnterprises:', result);
        
        // Test de smartSearch
        const smartResult = await window.enterpriseService?.smartSearch('drone', {limit: 3});
        console.log('🧠 Résultat smartSearch:', smartResult);
        
    } catch (error) {
        console.error('❌ Erreur test recherche:', error);
    }
};

// ================================
// 🚀 DÉMARRAGE DE L'APPLICATION
// ================================
document.addEventListener('DOMContentLoaded', initializeApp);

// Export pour usage en module (si nécessaire)
export {
    initializeApp,
    showMainMenu,
    showSearch,
    showAction,
    handleSearch,
    selectEnterprise,
    selectedEnterprise,
    currentAction,
    searchCache,
    currentSearchResults
};