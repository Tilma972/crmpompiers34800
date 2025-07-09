import { UI_ELEMENTS } from '../config/constants.js';

// Met à jour le texte de statut dans l'interface
export function updateStatus(message) {
    const statusElement = document.getElementById(UI_ELEMENTS.STATUS_TEXT);
    if (statusElement) {
        statusElement.textContent = message;
    }
    console.log('📱 Status:', message);
}

// 🔧 AJOUT CRITIQUE : Fonction showMessage manquante
export function showMessage(message) {
    // Essaie d'abord Telegram
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
        try {
            window.Telegram.WebApp.showAlert(message);
            return true;
        } catch (error) {
            console.warn('Telegram alert failed:', error);
        }
    }
    
    // Fallback vers status et console
    updateStatus(message);
    console.log('📱 Message:', message);
    
    // Alert pour les erreurs
    if (message.includes('Erreur') || message.includes('❌')) {
        alert(message);
    }
    
    return false;
}

// Affiche un indicateur d'auto-remplissage
export function showAutoFillStatus(message) {
    let statusElement = document.getElementById('autoFillStatus');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'autoFillStatus';
        statusElement.className = 'auto-fill-status';
        document.body.appendChild(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

// Affiche un état de chargement avec étapes
export function showLoadingState(documentType) {
    const stateDiv = document.getElementById(UI_ELEMENTS.CONVERSATION_STATE);
    const contentDiv = document.getElementById(UI_ELEMENTS.STATE_CONTENT);
    
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    <h3>🔄 Génération ${documentType} en cours...</h3>
                    <div class="loading-steps">
                        <div class="step active">📋 Préparation des données</div>
                        <div class="step">🧮 Calcul des montants</div>
                        <div class="step">📄 Génération du document</div>
                        <div class="step">✅ Finalisation</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (stateDiv) {
        stateDiv.style.display = 'block';
    }
}

// Masque l'état de chargement avec animation
export function hideLoadingState() {
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
        loadingState.style.opacity = '0';
        loadingState.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            const stateDiv = document.getElementById(UI_ELEMENTS.CONVERSATION_STATE);
            if (stateDiv) {
                stateDiv.style.display = 'none';
            }
        }, 300);
    }
}

// Met à jour l'indicateur de statut de paiement
export function updatePaymentStatus() {
    const paymentCheckbox = document.getElementById('paiementRecu');
    const paymentStatus = document.getElementById('paymentStatus');
    
    if (paymentCheckbox && paymentStatus) {
        if (paymentCheckbox.checked) {
            paymentStatus.innerHTML = '✅ <strong>Paiement reçu</strong>';
            paymentStatus.className = 'payment-status paid';
        } else {
            paymentStatus.innerHTML = '⏳ <strong>En attente de paiement</strong>';
            paymentStatus.className = 'payment-status pending';
        }
    }
}

// Initialise l'interface utilisateur avec les données utilisateur
export function initializeUserInterface(user) {
    const userNameElement = document.getElementById(UI_ELEMENTS.USER_NAME);
    const userAvatarElement = document.getElementById(UI_ELEMENTS.USER_AVATAR);
    
    if (userNameElement && user) {
        userNameElement.textContent = user.first_name;
    }
    
    if (userAvatarElement && user) {
        userAvatarElement.textContent = user.first_name.charAt(0).toUpperCase();
    }
    
    console.log('🎨 Interface utilisateur initialisée pour:', user?.first_name);
}

// 🔧 AJOUT : Fonction utilitaire pour mise à jour sécurisée du DOM
export function updateElementSafely(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        console.log(`✅ Mis à jour ${elementId}: ${value}`);
        return true;
    } else {
        console.warn(`⚠️ Élément ${elementId} non trouvé`);
        return false;
    }
}

// 🔧 AJOUT : Fonctions utilitaires pour l'interface
export function toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        if (show) {
            element.classList.remove('hidden');
            element.style.display = 'block';
        } else {
            element.classList.add('hidden');
            element.style.display = 'none';
        }
        return true;
    }
    return false;
}

export function clearElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
        return true;
    }
    return false;
}

// Export par défaut pour compatibilité
export default {
    updateStatus,
    showMessage,
    showAutoFillStatus,
    showLoadingState,
    hideLoadingState,
    updatePaymentStatus,
    initializeUserInterface,
    updateElementSafely,
    toggleElement,
    clearElement
};