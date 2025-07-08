import { UI_ELEMENTS, NAVIGATION_STATES, ACTIONS } from '../config/constants.js';
import { updateStatus } from '../utils/ui.js';
import { getActionLabel } from '../utils/formatters.js';

// Gestionnaire de navigation de l'application
class NavigationManager {
    constructor() {
        this.currentState = NAVIGATION_STATES.MAIN_MENU;
        this.stateHistory = [];
        this.maxHistoryLength = 10;
    }

    // Affiche le menu principal
    showMainMenu() {
        this.setState(NAVIGATION_STATES.MAIN_MENU);
        
        document.getElementById(UI_ELEMENTS.MAIN_MENU).classList.remove('hidden');
        document.getElementById(UI_ELEMENTS.SEARCH_INTERFACE).classList.add('hidden');
        document.getElementById(UI_ELEMENTS.CONVERSATION_STATE).style.display = 'none';
        
        updateStatus('Menu principal');
    }

    // Affiche l'interface de recherche
    showSearch() {
        this.setState(NAVIGATION_STATES.SEARCH);
        
        document.getElementById(UI_ELEMENTS.MAIN_MENU).classList.add('hidden');
        document.getElementById(UI_ELEMENTS.SEARCH_INTERFACE).classList.remove('hidden');
        document.getElementById(UI_ELEMENTS.SEARCH_INPUT).focus();
        
        updateStatus('Recherche entreprise');
    }

    // Affiche une action spécifique
    showAction(actionType) {
        const actionState = `action_${actionType}`;
        this.setState(actionState);
        
        document.getElementById(UI_ELEMENTS.MAIN_MENU).classList.add('hidden');
        this.showConversationState(actionType);
        
        updateStatus(`Action: ${getActionLabel(actionType)}`);
        
        return actionType;
    }

    // Affiche l'état conversationnel
    showConversationState(actionType) {
        const stateDiv = document.getElementById(UI_ELEMENTS.CONVERSATION_STATE);
        const titleDiv = document.getElementById(UI_ELEMENTS.STATE_TITLE);
        const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
        
        if (!stateDiv || !titleDiv || !contentDiv) {
            console.error('Éléments UI manquants pour l\'état conversationnel');
            return;
        }

        // Configuration du titre selon l'action
        const titles = {
            [ACTIONS.FACTURE]: '📄 Génération de Facture',
            [ACTIONS.BON_COMMANDE]: '📋 Génération de Bon de Commande',
            [ACTIONS.FORMULAIRE]: '📝 Envoi de Formulaire',
            [ACTIONS.STATS]: '📊 Statistiques Express',
            [ACTIONS.NOUVELLE_ENTREPRISE]: '➕ Nouvelle Entreprise',
            [ACTIONS.QUALIFICATION]: '🎯 Qualification Prospect',
            [ACTIONS.ATTRIBUTION]: '👤 Attribution Prospecteur'
        };

        titleDiv.textContent = titles[actionType] || 'Action en cours';
        
        // Contenu initial selon l'action
        this.initializeActionContent(actionType, contentDiv);
        
        stateDiv.style.display = 'block';
    }

    // Initialise le contenu selon l'action
    initializeActionContent(actionType, contentDiv) {
        const initialContent = {
            [ACTIONS.FACTURE]: this.createDocumentSelectionContent('facture'),
            [ACTIONS.BON_COMMANDE]: this.createDocumentSelectionContent('bon_commande'),
            [ACTIONS.FORMULAIRE]: this.createFormSelectionContent(),
            [ACTIONS.STATS]: this.createStatsContent(),
            [ACTIONS.NOUVELLE_ENTREPRISE]: this.createNewEnterpriseContent(),
            [ACTIONS.QUALIFICATION]: this.createQualificationContent(),
            [ACTIONS.ATTRIBUTION]: this.createAttributionContent()
        };

        contentDiv.innerHTML = initialContent[actionType] || this.createDefaultContent();
    }

    // Crée le contenu pour la sélection de document
    createDocumentSelectionContent(documentType) {
        const documentLabel = documentType === 'facture' ? 'Facture' : 'Bon de Commande';
        const documentIcon = documentType === 'facture' ? '📄' : '📋';
        
        return `
            <div class="action-content">
                <div class="action-header">
                    <div class="action-icon">${documentIcon}</div>
                    <h3>Génération ${documentLabel}</h3>
                </div>
                <div class="action-body">
                    <p>Sélectionnez une entreprise pour générer ${documentLabel.toLowerCase()}.</p>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="window.navigationManager.showSearch()">
                            🔍 Rechercher une entreprise
                        </button>
                        <button class="btn btn-secondary" onclick="window.navigationManager.showMainMenu()">
                            ← Retour au menu
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Crée le contenu pour la sélection de formulaire
    createFormSelectionContent() {
        return `
            <div class="action-content">
                <div class="action-header">
                    <div class="action-icon">📝</div>
                    <h3>Envoi de Formulaire</h3>
                </div>
                <div class="action-body">
                    <p>Sélectionnez une entreprise pour envoyer un formulaire.</p>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="window.navigationManager.showSearch()">
                            🔍 Rechercher une entreprise
                        </button>
                        <button class="btn btn-secondary" onclick="window.navigationManager.showMainMenu()">
                            ← Retour au menu
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Crée le contenu pour les statistiques
    createStatsContent() {
        return `
            <div class="action-content">
                <div class="action-header">
                    <div class="action-icon">📊</div>
                    <h3>Statistiques Express</h3>
                </div>
                <div class="action-body">
                    <p>Chargement des statistiques...</p>
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `;
    }

    // Crée le contenu pour nouvelle entreprise
    createNewEnterpriseContent() {
        return `
            <div class="action-content">
                <div class="action-header">
                    <div class="action-icon">➕</div>
                    <h3>Nouvelle Entreprise</h3>
                </div>
                <div class="action-body">
                    <p>Créer une nouvelle entreprise dans le système.</p>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="window.navigationManager.showNewEnterpriseForm()">
                            📝 Créer une entreprise
                        </button>
                        <button class="btn btn-secondary" onclick="window.navigationManager.showMainMenu()">
                            ← Retour au menu
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Crée le contenu pour qualification
    createQualificationContent() {
        return `
            <div class="action-content">
                <div class="action-header">
                    <div class="action-icon">🎯</div>
                    <h3>Qualification Prospect</h3>
                </div>
                <div class="action-body">
                    <p>Qualifier un prospect et créer une opportunité commerciale.</p>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="window.navigationManager.showSearch()">
                            🔍 Rechercher un prospect
                        </button>
                        <button class="btn btn-secondary" onclick="window.navigationManager.showMainMenu()">
                            ← Retour au menu
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Crée le contenu pour attribution
    createAttributionContent() {
        return `
            <div class="action-content">
                <div class="action-header">
                    <div class="action-icon">👤</div>
                    <h3>Attribution Prospecteur</h3>
                </div>
                <div class="action-body">
                    <p>Attribuer un prospect à un commercial.</p>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="window.navigationManager.showSearch()">
                            🔍 Rechercher un prospect
                        </button>
                        <button class="btn btn-secondary" onclick="window.navigationManager.showMainMenu()">
                            ← Retour au menu
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Crée le contenu par défaut
    createDefaultContent() {
        return `
            <div class="action-content">
                <div class="action-body">
                    <p>Action en cours de développement...</p>
                    <div class="action-buttons">
                        <button class="btn btn-secondary" onclick="window.navigationManager.showMainMenu()">
                            ← Retour au menu
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Définit l'état actuel
    setState(newState) {
        if (this.currentState !== newState) {
            this.stateHistory.push(this.currentState);
            
            // Limite la taille de l'historique
            if (this.stateHistory.length > this.maxHistoryLength) {
                this.stateHistory.shift();
            }
            
            this.currentState = newState;
        }
    }

    // Retourne à l'état précédent
    goBack() {
        if (this.stateHistory.length > 0) {
            const previousState = this.stateHistory.pop();
            this.currentState = previousState;
            
            // Navigue vers l'état précédent
            if (previousState === NAVIGATION_STATES.MAIN_MENU) {
                this.showMainMenu();
            } else if (previousState === NAVIGATION_STATES.SEARCH) {
                this.showSearch();
            } else if (previousState.startsWith('action_')) {
                const actionType = previousState.replace('action_', '');
                this.showAction(actionType);
            }
        } else {
            this.showMainMenu();
        }
    }

    // Obtient l'état actuel
    getCurrentState() {
        return this.currentState;
    }

    // Vérifie si on peut revenir en arrière
    canGoBack() {
        return this.stateHistory.length > 0;
    }

    // Réinitialise l'historique
    clearHistory() {
        this.stateHistory = [];
    }

    // Affiche le formulaire de nouvelle entreprise
    showNewEnterpriseForm() {
        // Cette méthode sera implémentée dans les features
        console.log('Affichage du formulaire de nouvelle entreprise');
    }

    // Gestionnaire d'événements pour le bouton retour
    setupBackButton() {
        const backButtons = document.querySelectorAll('[data-action="go-back"]');
        backButtons.forEach(button => {
            button.addEventListener('click', () => this.goBack());
        });
    }

    // Initialise la navigation
    initialize() {
        this.setupBackButton();
        this.showMainMenu();
    }
}

// Instance singleton
export const navigationManager = new NavigationManager();

// Expose globalement pour les événements onclick
window.navigationManager = navigationManager;

// Utilitaires de navigation
export const NavigationUtils = {
    // Crée un bouton de retour
    createBackButton(text = '← Retour', className = 'btn btn-secondary') {
        return `<button class="${className}" onclick="window.navigationManager.goBack()">${text}</button>`;
    },

    // Crée un bouton de menu principal
    createHomeButton(text = '🏠 Menu principal', className = 'btn btn-secondary') {
        return `<button class="${className}" onclick="window.navigationManager.showMainMenu()">${text}</button>`;
    },

    // Crée une barre de navigation avec historique
    createNavigationBar() {
        const canGoBack = navigationManager.canGoBack();
        const currentState = navigationManager.getCurrentState();
        
        return `
            <div class="navigation-bar">
                ${canGoBack ? NavigationUtils.createBackButton() : ''}
                <span class="current-state">${currentState}</span>
                ${NavigationUtils.createHomeButton()}
            </div>
        `;
    }
};

export default navigationManager;