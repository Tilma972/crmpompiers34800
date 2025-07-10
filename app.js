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

// Variables globales pour les parutions
let publicationCounter = 0;
let publicationsData = [];

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

// ✅ CORRECTION : Utilise GATEWAY_ENTITIES pour rechercher une qualification
async function searchQualificationForEnterprise(enterpriseId) {
    try {
        console.log('🔍 Recherche qualification pour enterprise_id:', enterpriseId);
        
        const requestData = {
            action: 'recherche_qualification',
            data: {
                enterprise_id: enterpriseId
            }
        };
        
        const response = await apiService.callWebhook('GATEWAY_ENTITIES', requestData);
        
        if (response.success && response.data && response.data.length > 0) {
            return response.data[0]; // Retourne la première qualification
        }
        
        return null; // Aucune qualification trouvée
        
    } catch (error) {
        console.error('💥 Erreur searchQualificationForEnterprise:', error);
        return null;
    }
}

// ================================
// 📄 GÉNÉRATION DE DOCUMENTS
// ================================
async function handleDocumentGeneration(enterprise, documentType) {
    try {
        // Vérifie si l'entreprise a des données suffisantes
        if (!enterprise.nom && !enterprise.name && !enterprise.nom_entreprise) {
            showMessage('❌ Données entreprise insuffisantes pour générer le document');
            return;
        }

        updateStatus(`🔍 Recherche qualification pour ${enterprise.nom_entreprise || enterprise.nom}...`);

        // ✅ CORRECTION : Rechercher une qualification existante d'abord
        const qualification = await searchQualificationForEnterprise(enterprise.id);
        
        if (qualification) {
            // ✅ Qualification trouvée → Dialog de validation
            console.log('✅ Qualification trouvée:', qualification);
            showQualificationValidationDialog(qualification, documentType);
        } else {
            // ❌ Pas de qualification → Demander création
            console.log('⚠️ Aucune qualification trouvée');
            showCreateQualificationFirst(enterprise, documentType);
        }

    } catch (error) {
        console.error('Erreur génération document:', error);
        showMessage('❌ Erreur lors de la génération du document');
    }
}

// ================================
// 🎯 DIALOGS DE QUALIFICATION
// ================================
function showQualificationValidationDialog(qualification, documentType) {
    const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
    if (!contentDiv) return;

    const documentLabel = getActionLabel(documentType);
    
    contentDiv.innerHTML = `
        <div class="qualification-validation-dialog">
            <h3>✅ Qualification existante trouvée</h3>
            <p>Une qualification existe déjà pour cette entreprise. Souhaitez-vous :</p>
            <div class="qualification-actions">
                <button class="btn btn-primary" onclick="generateDocumentWithQualification('${documentType}')">
                    📄 Générer ${documentLabel} avec cette qualification
                </button>
                <button class="btn btn-secondary" onclick="showQualificationInterface(selectedEnterprise)">
                    ✏️ Modifier la qualification
                </button>
                <button class="btn btn-secondary" onclick="navigationManager.showMainMenu()">
                    🏠 Retour au menu
                </button>
            </div>
        </div>
    `;
    
    // Sauvegarde la qualification pour usage ultérieur
    window.qualificationData = qualification;
}

function showCreateQualificationFirst(enterprise, documentType) {
    const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
    if (!contentDiv) return;

    const documentLabel = getActionLabel(documentType);
    
    contentDiv.innerHTML = `
        <div class="create-qualification-dialog">
            <h3>⚠️ Qualification requise</h3>
            <p>Aucune qualification n'existe pour <strong>${enterprise.nom_entreprise || enterprise.nom}</strong>.</p>
            <p>Vous devez créer une qualification avant de générer un ${documentLabel.toLowerCase()}.</p>
            <div class="qualification-actions">
                <button class="btn btn-primary" onclick="showQualificationInterface(selectedEnterprise)">
                    🎯 Créer une qualification
                </button>
                <button class="btn btn-secondary" onclick="navigationManager.showMainMenu()">
                    🏠 Retour au menu
                </button>
            </div>
        </div>
    `;
}

async function generateDocumentWithQualification(documentType) {
    if (!window.qualificationData) {
        showMessage('❌ Aucune qualification disponible');
        return;
    }

    try {
        updateStatus(`📄 Génération du ${getActionLabel(documentType)} en cours...`);
        
        const result = await documentGenerationManager.generateIntelligentDocument(
            window.qualificationData,
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
// 🎯 INTERFACE DE QUALIFICATION AVEC PARUTIONS MULTIPLES
// ================================
function showQualificationInterface(enterprise) {
    const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
    if (!contentDiv) return;

    currentState = 'qualification';
    
    // Générer le contenu de qualification avec parutions multiples
    contentDiv.innerHTML = getQualificationContent();
    
    // Initialiser les parutions
    initializePublications();
    
    // Auto-remplissage si données disponibles
    if (enterprise) {
        setTimeout(() => {
            autoFillQualificationForm(enterprise);
        }, 200);
    }
    
    // Configurer la validation en temps réel
    setupFieldValidation();
}

function getQualificationContent() {
    return `
        <div class="form-group">
            <label class="form-label">Entreprise concernée :</label>
            <input type="text" class="form-input" id="enterpriseInput" 
                   value="${selectedEnterprise ? (selectedEnterprise.nom_entreprise || selectedEnterprise.nom) : ''}"
                   placeholder="Tapez le nom de l'entreprise..."
                   oninput="handleEnterpriseSearch(this.value)">
        </div>
        <div id="enterpriseResults" class="search-results"></div>
        
        <!-- AUTO-REMPLISSAGE -->
        <div id="autoFillStatus" class="auto-fill-status" style="display: none;">
            <div style="background: #d1ecf1; padding: 8px; border-radius: 6px; margin: 10px 0; font-size: 12px;">
                🤖 <strong>Auto-remplissage activé</strong> - Les champs sont pré-remplis avec les données existantes
            </div>
        </div>
        
        <!-- SECTION PARUTIONS MULTIPLES -->
        <div class="form-group">
            <label class="form-label">
                📅 Parutions calendrier 2026
                <span style="font-size: 11px; color: #666; font-weight: normal;">
                    (Ajoutez une ou plusieurs parutions)
                </span>
            </label>
            <div id="publicationsList" class="publications-list">
                <!-- Publications ajoutées dynamiquement -->
            </div>
            <button type="button" class="btn btn-outline" onclick="addPublication()" id="addPublicationBtn">
                ➕ Ajouter une parution
            </button>
            <div class="price-display" id="priceDisplay">
                <strong>Prix total : 0€</strong>
                <div id="priceBreakdown" style="font-size: 12px; margin-top: 5px;"></div>
            </div>
        </div>
        
        <!-- OFFRES SPÉCIALES -->
        <div class="form-group" id="specialOffersSection" style="display: none;">
            <label class="form-label">🎁 Offres spéciales disponibles</label>
            <div id="availableOffers" class="offer-options">
                <!-- Offres générées automatiquement -->
            </div>
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
            <label class="form-label">Téléphone :</label>
            <input type="tel" class="form-input" id="telephoneContact" 
                   placeholder="06 12 34 56 78">
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
// 📅 GESTION PARUTIONS MULTIPLES
// ================================

function addPublication() {
    publicationCounter++;
    const publicationsList = document.getElementById('publicationsList');
    
    const publicationDiv = document.createElement('div');
    publicationDiv.className = 'publication-item';
    publicationDiv.id = `publication-${publicationCounter}`;
    
    publicationDiv.innerHTML = `
        <div class="publication-header">
            <span class="publication-title">📅 Parution ${publicationCounter}</span>
            <button type="button" class="btn-remove" onclick="removePublication(${publicationCounter})">
                🗑️ Supprimer
            </button>
        </div>
        <div class="publication-fields">
            <div class="form-field">
                <label>Mois :</label>
                <select class="form-select publication-mois" id="mois-${publicationCounter}" onchange="updatePublicationPrice(${publicationCounter})">
                    <option value="">Sélectionner...</option>
                    <option value="Janvier">Janvier 2026</option>
                    <option value="Février">Février 2026</option>
                    <option value="Mars">Mars 2026</option>
                    <option value="Avril">Avril 2026</option>
                    <option value="Mai">Mai 2026</option>
                    <option value="Juin">Juin 2026</option>
                    <option value="Juillet">Juillet 2026</option>
                    <option value="Août">Août 2026</option>
                    <option value="Septembre">Septembre 2026</option>
                    <option value="Octobre">Octobre 2026</option>
                    <option value="Novembre">Novembre 2026</option>
                    <option value="Décembre">Décembre 2026</option>
                </select>
            </div>
            <div class="form-field">
                <label>Format :</label>
                <select class="form-select publication-format" id="format-${publicationCounter}" onchange="updatePublicationPrice(${publicationCounter})">
                    <option value="">Sélectionner...</option>
                    <option value="6X4" data-price="350">6X4 - 350€</option>
                    <option value="6X8" data-price="500">6X8 - 500€</option>
                    <option value="12X4" data-price="500">12X4 - 500€</option>
                    <option value="SPECIAL" data-price="0">Format spécial (prix à définir)</option>
                </select>
            </div>
            <div class="form-field">
                <label>Prix :</label>
                <input type="number" class="form-input publication-prix" id="prix-${publicationCounter}" 
                       min="0" step="10" placeholder="0" onchange="updatePublicationPrice(${publicationCounter})">
            </div>
            <div class="form-field">
                <label>Type :</label>
                <select class="form-select publication-type" id="type-${publicationCounter}" onchange="updatePublicationPrice(${publicationCounter})">
                    <option value="payant">💰 Payant</option>
                    <option value="offert">🎁 Offert</option>
                </select>
            </div>
        </div>
        <div class="publication-summary" id="summary-${publicationCounter}">
            Complétez les champs ci-dessus
        </div>
    `;
    
    publicationsList.appendChild(publicationDiv);
    updateTotalPrice();
    checkSpecialOffers();
    
    // Auto-focus sur le premier champ
    document.getElementById(`mois-${publicationCounter}`).focus();
}

function removePublication(id) {
    const publicationDiv = document.getElementById(`publication-${id}`);
    if (publicationDiv) {
        publicationDiv.remove();
        updateTotalPrice();
        checkSpecialOffers();
        
        // Renommer les parutions restantes
        renumberPublications();
    }
}

function renumberPublications() {
    const publications = document.querySelectorAll('.publication-item');
    publications.forEach((pub, index) => {
        const title = pub.querySelector('.publication-title');
        if (title) {
            title.textContent = `📅 Parution ${index + 1}`;
        }
    });
}

function updatePublicationPrice(id) {
    const moisSelect = document.getElementById(`mois-${id}`);
    const formatSelect = document.getElementById(`format-${id}`);
    const prixInput = document.getElementById(`prix-${id}`);
    const typeSelect = document.getElementById(`type-${id}`);
    const summaryDiv = document.getElementById(`summary-${id}`);
    
    if (!moisSelect || !formatSelect || !prixInput || !typeSelect) return;
    
    const mois = moisSelect.value;
    const format = formatSelect.value;
    const type = typeSelect.value;
    
    // Auto-calcul du prix selon le format
    if (format && format !== 'SPECIAL') {
        const selectedOption = formatSelect.querySelector(`option[value="${format}"]`);
        const basePrice = parseInt(selectedOption.dataset.price || 0);
        
        if (type === 'payant') {
            prixInput.value = basePrice;
        } else {
            prixInput.value = 0;
        }
    }
    
    // Mise à jour du résumé
    updatePublicationSummary(id);
    updateTotalPrice();
    checkSpecialOffers();
}

function updatePublicationSummary(id) {
    const mois = document.getElementById(`mois-${id}`)?.value || '';
    const format = document.getElementById(`format-${id}`)?.value || '';
    const prix = parseInt(document.getElementById(`prix-${id}`)?.value || 0);
    const type = document.getElementById(`type-${id}`)?.value || 'payant';
    const summaryDiv = document.getElementById(`summary-${id}`);
    
    if (!summaryDiv) return;
    
    if (mois && format) {
        const typeIcon = type === 'offert' ? '🎁' : '💰';
        const priceText = type === 'offert' ? 'Offert' : `${prix}€`;
        
        summaryDiv.innerHTML = `
            <div class="publication-summary-content ${type}">
                ${typeIcon} <strong>${mois} ${format}</strong> - ${priceText}
            </div>
        `;
        summaryDiv.className = `publication-summary ${type}`;
    } else {
        summaryDiv.innerHTML = 'Complétez les champs ci-dessus';
        summaryDiv.className = 'publication-summary';
    }
}

// ================================
// 💰 CALCULS DE PRIX
// ================================

function collectPublicationsData() {
    const publications = [];
    const publicationItems = document.querySelectorAll('.publication-item');
    
    publicationItems.forEach(item => {
        const id = item.id.split('-')[1];
        const mois = document.getElementById(`mois-${id}`)?.value;
        const format = document.getElementById(`format-${id}`)?.value;
        const prix = parseInt(document.getElementById(`prix-${id}`)?.value || 0);
        const type = document.getElementById(`type-${id}`)?.value;
        
        if (mois && format) {
            publications.push({
                mois: mois,
                format: format,
                prix: prix,
                type: type,
                ordre: publications.length + 1
            });
        }
    });
    
    return publications;
}

function calculateTotalPrice(publications) {
    const payantes = publications.filter(p => p.type === 'payant');
    const offertes = publications.filter(p => p.type === 'offert');
    
    const montantPayant = payantes.reduce((total, pub) => total + pub.prix, 0);
    const montantOffert = offertes.reduce((total, pub) => total + pub.prix, 0);
    
    return {
        total: montantPayant,
        payant: montantPayant,
        offert: montantOffert,
        publications_payantes: payantes.length,
        publications_offertes: offertes.length
    };
}

function updateTotalPrice() {
    const publications = collectPublicationsData();
    const pricing = calculateTotalPrice(publications);
    
    const priceDisplay = document.getElementById('priceDisplay');
    const breakdownDiv = document.getElementById('priceBreakdown');
    
    if (!priceDisplay || !breakdownDiv) return;
    
    // Affichage principal
    priceDisplay.innerHTML = `<strong>Prix total : ${pricing.total}€</strong>`;
    
    // Détail
    let breakdown = [];
    if (pricing.publications_payantes > 0) {
        breakdown.push(`${pricing.publications_payantes} parution(s) payante(s) : ${pricing.payant}€`);
    }
    if (pricing.publications_offertes > 0) {
        breakdown.push(`${pricing.publications_offertes} parution(s) offerte(s) : 🎁 Incluses`);
    }
    
    breakdownDiv.innerHTML = breakdown.join(' • ');
    
    // Activation/désactivation du bouton
    const executeBtn = document.getElementById('executeBtn');
    if (executeBtn) {
        executeBtn.disabled = publications.length === 0 || !selectedEnterprise;
    }
}

// ================================
// 🎁 SYSTÈME D'OFFRES SPÉCIALES
// ================================

function checkSpecialOffers() {
    const publications = collectPublicationsData();
    const specialOffersSection = document.getElementById('specialOffersSection');
    const availableOffers = document.getElementById('availableOffers');
    
    if (!publications.length || !specialOffersSection || !availableOffers) {
        if (specialOffersSection) specialOffersSection.style.display = 'none';
        return;
    }
    
    const offers = generateSpecialOffers(publications);
    
    if (offers.length > 0) {
        specialOffersSection.style.display = 'block';
        availableOffers.innerHTML = offers.map(offer => createOfferHTML(offer)).join('');
    } else {
        specialOffersSection.style.display = 'none';
    }
}

function generateSpecialOffers(publications) {
    const offers = [];
    const payantes = publications.filter(p => p.type === 'payant');
    
    // Offre 3+1 gratuit
    if (payantes.length >= 3) {
        offers.push({
            type: '3plus1',
            title: '🎁 Offre 3+1 : 4ème parution offerte',
            description: 'Ajoutez une 4ème parution gratuite !',
            action: 'offerFreeFourthPublication',
            savings: 350
        });
    }
    
    // Offre fidélité (si client existant)
    if (selectedEnterprise && (selectedEnterprise.Client_2025 === 'Oui' || selectedEnterprise.client_2025 === 'Oui')) {
        offers.push({
            type: 'fidelite',
            title: '💎 Réduction fidélité -10%',
            description: 'Client fidèle : -10% sur le total',
            action: 'applyLoyaltyDiscount',
            savings: Math.round(calculateTotalPrice(publications).total * 0.1)
        });
    }
    
    return offers;
}

function createOfferHTML(offer) {
    return `
        <div class="special-offer" onclick="${offer.action}()">
            <div class="offer-header">
                <strong>${offer.title}</strong>
                <span class="offer-savings">Économie: ${offer.savings}€</span>
            </div>
            <div class="offer-description">${offer.description}</div>
        </div>
    `;
}

function offerFreeFourthPublication() {
    if (confirm('Ajouter une 4ème parution gratuite ?')) {
        addPublication();
        const newId = publicationCounter;
        
        // Pré-remplir comme offerte
        setTimeout(() => {
            document.getElementById(`type-${newId}`).value = 'offert';
            document.getElementById(`format-${newId}`).value = '6X4';
            document.getElementById(`prix-${newId}`).value = 0;
            updatePublicationPrice(newId);
        }, 100);
    }
}

function applyLoyaltyDiscount() {
    if (confirm('Appliquer la réduction fidélité de 10% ?')) {
        const publications = collectPublicationsData();
        publications.forEach((pub, index) => {
            if (pub.type === 'payant') {
                const publicationItems = document.querySelectorAll('.publication-item');
                const id = publicationItems[index].id.split('-')[1];
                const prixInput = document.getElementById(`prix-${id}`);
                const newPrice = Math.round(pub.prix * 0.9);
                prixInput.value = newPrice;
                updatePublicationPrice(id);
            }
        });
        
        showMessage('✅ Réduction fidélité appliquée !');
    }
}

// ================================
// 💾 CRÉATION QUALIFICATION COMPLÈTE
// ================================

async function createQualification() {
    if (!selectedEnterprise) {
        showMessage('Veuillez sélectionner une entreprise');
        return;
    }

    const publications = collectPublicationsData();
    
    if (publications.length === 0) {
        showMessage('Veuillez ajouter au moins une parution');
        return;
    }

    // Validation des champs obligatoires
    const hasIncompletePublication = publications.some(pub => !pub.mois || !pub.format);
    if (hasIncompletePublication) {
        showMessage('Veuillez compléter toutes les parutions');
        return;
    }

    const modePaiement = document.getElementById('modePaiement').value;
    const interlocuteur = document.getElementById('interlocuteur').value;
    const emailContact = document.getElementById('emailContact').value;
    const telephoneContact = document.getElementById('telephoneContact').value;
    const commentaires = document.getElementById('commentaires').value;
    
    const pricing = calculateTotalPrice(publications);

    updateStatus('🎯 Création qualification...');

    try {
        const qualificationData = {
            action: 'qualification',
            data: {
                enterprise_id: selectedEnterprise.id,
                enterprise_name: selectedEnterprise.nom_entreprise || selectedEnterprise.nom,
                enterprise_adresse: selectedEnterprise.adresse,
                enterprise_commune: selectedEnterprise.commune,
                enterprise_telephone: selectedEnterprise.telephone,
                
                // Publications détaillées
                publications: publications,
                mode_paiement: modePaiement,
                interlocuteur: interlocuteur || null,
                email_contact: emailContact || null,
                telephone_contact: telephoneContact || null,
                commentaires: commentaires || null,
                
                // Métriques
                nombre_parutions: publications.length,
                prix_total: pricing.total,
                montant_payant: pricing.payant,
                montant_offert: pricing.offert,
                has_multiple_publications: publications.length > 1,
                has_free_publications: pricing.publications_offertes > 0,
                
                // Métadonnées
                offre_type: pricing.publications_offertes > 0 ? 'avec_gratuites' : 'standard',
                user_id: getTelegramUser().id,
                timestamp: new Date().toISOString()
            }
        };

        console.log('📤 Payload qualification:', qualificationData);

        const response = await apiService.callWebhook('GATEWAY_ENTITIES', qualificationData);
        
        if (response.success) {
            // Sauvegarde globalement pour usage ultérieur
            window.qualificationData = response.data;
            
            // Affichage succès avec détails
            const summary = generateQualificationSummary(publications, pricing);
            showMessage(`✅ Qualification créée !\n\n${summary}`);
            
            updateStatus('✅ Qualification créée');
            setTimeout(showMainMenu, 2000);
        } else {
            throw new Error(response.error || 'Erreur création qualification');
        }
        
    } catch (error) {
        console.error('❌ Erreur création qualification:', error);
        showMessage(`❌ Erreur: ${error.message}`);
        updateStatus('❌ Erreur création qualification');
    }
}

function generateQualificationSummary(publications, pricing) {
    const payantes = publications.filter(p => p.type === 'payant');
    const offertes = publications.filter(p => p.type === 'offert');
    
    let summary = `📊 RÉSUMÉ :\n`;
    summary += `• ${publications.length} parution(s) au total\n`;
    
    if (payantes.length > 0) {
        summary += `• ${payantes.length} payante(s) : ${pricing.payant}€\n`;
        summary += `  ${payantes.map(p => `${p.mois} ${p.format}`).join(', ')}\n`;
    }
    
    if (offertes.length > 0) {
        summary += `• ${offertes.length} offerte(s) 🎁\n`;
        summary += `  ${offertes.map(p => `${p.mois} ${p.format}`).join(', ')}\n`;
    }
    
    return summary;
}

// ================================
// 🤖 UTILITAIRES AUTO-REMPLISSAGE
// ================================

function autoFillQualificationForm(enterprise) {
    console.log('📝 Auto-remplissage qualification avancé...');
    
    // Afficher l'indicateur d'auto-remplissage
    showAutoFillStatus('Formulaire pré-rempli avec les données existantes');
    
    // 🔒 CHAMPS CONTACT (lecture seule si données existantes)
    fillContactFields(enterprise);
    
    // 🎯 PRÉ-SÉLECTION INTELLIGENTE des formats
    fillFormatPreferences(enterprise);
    
    // 💰 PRÉ-REMPLISSAGE MODE DE PAIEMENT
    fillPaymentPreferences(enterprise);
    
    // 📝 COMMENTAIRE AUTOMATIQUE
    fillAutoComments(enterprise);
    
    console.log('✅ Auto-remplissage qualification terminé');
}

function fillContactFields(enterprise) {
    const fields = [
        { id: 'interlocuteur', value: enterprise.interlocuteur, label: 'Contact existant' },
        { id: 'emailContact', value: enterprise.email || enterprise.email_contact, label: 'Email existant' },
        { id: 'telephoneContact', value: enterprise.telephone || enterprise.portable, label: 'Téléphone existant' }
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && field.value) {
            element.value = field.value;
            element.style.backgroundColor = '#f0f0f0';
            element.style.color = '#666';
        }
    });
}

function fillFormatPreferences(enterprise) {
    // Vérifier si format historique disponible
    const historicalFormat = enterprise.format_encart_2025 || enterprise._original?.format_encart_2025;
    
    if (historicalFormat) {
        const mappedFormat = mapBaserowFormats(historicalFormat);
        console.log('🎯 Format historique détecté:', mappedFormat);
        
        // Ajouter automatiquement une parution avec ce format
        setTimeout(() => {
            if (document.getElementById('publicationsList')) {
                // S'assurer qu'il y a au moins une parution
                if (document.querySelectorAll('.publication-item').length === 0) {
                    addPublication();
                }
                
                // Pré-remplir la première parution
                const firstFormatSelect = document.querySelector('.publication-format');
                if (firstFormatSelect) {
                    firstFormatSelect.value = mappedFormat;
                    firstFormatSelect.style.border = '2px solid #fbbf24';
                    firstFormatSelect.style.backgroundColor = '#fff3cd';
                    
                    // Déclencher la mise à jour du prix
                    const publicationId = firstFormatSelect.id.split('-')[1];
                    updatePublicationPrice(publicationId);
                }
            }
        }, 200);
    }
}

function fillPaymentPreferences(enterprise) {
    const paiementSelect = document.getElementById('modePaiement');
    if (paiementSelect) {
        // Utiliser Virement par défaut pour les clients existants
        if (enterprise.Client_2025 === 'Oui' || enterprise.client_2025 === 'Oui') {
            paiementSelect.value = 'Virement';
        }
    }
}

function fillAutoComments(enterprise) {
    const commentairesField = document.getElementById('commentaires');
    if (commentairesField && !commentairesField.value) {
        const autoComment = generateAdvancedAutoComment(enterprise);
        commentairesField.value = autoComment;
        commentairesField.style.fontStyle = 'italic';
        commentairesField.style.color = '#666';
    }
}

function generateAdvancedAutoComment(enterprise) {
    const currentYear = new Date().getFullYear();
    let comments = [];
    
    // Type de client
    if (enterprise.Client_2025 === 'Oui' || enterprise.client_2025 === 'Oui') {
        comments.push(`🔄 Renouvellement ${currentYear} - Client fidèle`);
    } else {
        comments.push(`🆕 Nouveau client ${currentYear}`);
    }
    
    // Format habituel
    if (enterprise.format_encart_2025) {
        const format = mapBaserowFormats(enterprise.format_encart_2025);
        comments.push(`📋 Format habituel: ${format}`);
    }
    
    // Infos secteur si disponible
    if (enterprise.secteur_activite || enterprise.activite) {
        const secteur = enterprise.secteur_activite || enterprise.activite;
        comments.push(`🏢 Secteur: ${secteur}`);
    }
    
    return comments.join(' • ');
}

function mapBaserowFormats(baserowFormatId) {
    const formatMapping = {
        2984058: '6X4',   // 6X4
        2984059: '6X8',   // 6X8  
        2984060: '12X4'   // 12X4
    };
    return formatMapping[baserowFormatId] || '6X4';
}

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

function setupFieldValidation() {
    // Validation des publications en temps réel
    document.addEventListener('change', function(e) {
        if (e.target.matches('.publication-mois, .publication-format')) {
            validatePublicationField(e.target);
        }
    });
    
    // Validation email
    document.addEventListener('input', function(e) {
        if (e.target.id === 'emailContact') {
            validateEmailField(e.target);
        }
    });
}

function validatePublicationField(field) {
    const formField = field.closest('.form-field');
    
    if (field.value) {
        formField.classList.remove('error');
        formField.classList.add('success');
    } else {
        formField.classList.remove('success');
        formField.classList.add('error');
    }
}

function validateEmailField(emailField) {
    const formField = emailField.closest('.form-field');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailField.value && emailRegex.test(emailField.value)) {
        formField.classList.remove('error');
        formField.classList.add('success');
    } else if (emailField.value) {
        formField.classList.remove('success');
        formField.classList.add('error');
    } else {
        formField.classList.remove('success', 'error');
    }
}

function initializePublications() {
    if (document.getElementById('publicationsList')) {
        publicationCounter = 0;
        publicationsData = [];
        
        // Ajouter une première parution par défaut
        setTimeout(() => {
            addPublication();
        }, 100);
    }
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
window.generateDocumentWithQualification = generateDocumentWithQualification;

// Exposition des nouvelles fonctions de qualification
window.addPublication = addPublication;
window.removePublication = removePublication;
window.updatePublicationPrice = updatePublicationPrice;
window.createQualification = createQualification;
window.offerFreeFourthPublication = offerFreeFourthPublication;
window.applyLoyaltyDiscount = applyLoyaltyDiscount;

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
        
        const responseText = await response.text();
        console.log('🧪 Response text:', responseText);
        
        try {
            const data = JSON.parse(responseText);
            console.log('🧪 Response data:', data);
        } catch (parseError) {
            console.log('🧪 JSON parse error:', parseError);
            console.log('🧪 Raw response was:', responseText);
        }
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

// 🔍 FONCTION DE DIAGNOSTIC SAISIE
window.debugSearchInput = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        console.log('🔍 DIAGNOSTIC CHAMP RECHERCHE:');
        console.log('Element trouvé:', !!searchInput);
        console.log('Disabled:', searchInput.disabled);
        console.log('ReadOnly:', searchInput.readOnly);
        console.log('Value:', searchInput.value);
        console.log('Style display:', searchInput.style.display);
        console.log('Style visibility:', searchInput.style.visibility);
        console.log('TabIndex:', searchInput.tabIndex);
        console.log('Focused:', document.activeElement === searchInput);
        
        // Test de focus forcé
        searchInput.focus();
        console.log('✅ Focus forcé appliqué');
        
        // Test de saisie forcée
        searchInput.value = 'test';
        console.log('✅ Valeur test injectée:', searchInput.value);
        
        // Test d'événement
        searchInput.dispatchEvent(new Event('input'));
        console.log('✅ Événement input déclenché');
    } else {
        console.log('❌ Champ searchInput non trouvé');
    }
};

// 🔍 FONCTION DE TEST RECHERCHE COMPLÈTE
window.testSearchComplete = async function() {
    console.log('🔍 TEST RECHERCHE COMPLÈTE:');
    
    try {
        // 1. Aller à l'interface de recherche
        console.log('🔍 Étape 1: Accès interface recherche');
        window.showSearch();
        
        // 2. Attendre que l'interface se charge
        setTimeout(async () => {
            console.log('🔍 Étape 2: Test recherche');
            
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = 'drone';
                window.handleSearch('drone');
                
                // 3. Vérifier l'affichage
                setTimeout(() => {
                    const resultsDiv = document.getElementById('searchResults');
                    if (resultsDiv) {
                        console.log('✅ RÉSULTATS VISIBLES:', resultsDiv.innerHTML.length > 0);
                        console.log('✅ INTERFACE AFFICHÉE:', !resultsDiv.style.display || resultsDiv.style.display !== 'none');
                        
                        // Forcer l'affichage si nécessaire
                        if (resultsDiv.style.display === 'none') {
                            resultsDiv.style.display = 'block';
                            console.log('✅ Affichage forcé');
                        }
                    }
                }, 1000);
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Erreur test recherche complète:', error);
    }
};

// 🔍 FONCTION DE TEST RECHERCHE (version originale)
window.testSearch = async function() {
    console.log('🔍 TEST RECHERCHE:');
    
    try {
        // Test direct du service
        const result = await window.enterpriseService?.searchEnterprises('drone', {limit: 3});
        console.log('📊 Résultat searchEnterprises:', result);
        
        // Test de smartSearch
        const smartResult = await window.enterpriseService?.smartSearch('drone', {limit: 3});
        console.log('🧠 Résultat smartSearch:', smartResult);
        
        // Test de la fonction de recherche via l'interface
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            console.log('🔍 Test recherche via interface...');
            searchInput.value = 'drone';
            window.handleSearch('drone');
            
            // Vérifier l'affichage après un délai
            setTimeout(() => {
                const resultsDiv = document.getElementById('searchResults');
                if (resultsDiv) {
                    console.log('🔍 Contenu div résultats:', resultsDiv.innerHTML);
                    console.log('🔍 Style display:', resultsDiv.style.display);
                    console.log('🔍 Classes CSS:', resultsDiv.className);
                }
            }, 1000);
        }
        
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