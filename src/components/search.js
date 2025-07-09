import { UI_ELEMENTS, TIMEOUTS } from '../config/constants.js';
import { enterpriseService } from '../services/enterpriseService.js';
import { createSearchDebouncer } from '../utils/cache.js';
import { updateStatus } from '../utils/ui.js';
import { formatEnterpriseName } from '../utils/formatters.js';

// Gestionnaire de recherche
class SearchManager {
    constructor() {
        this.searchTimeout = null;
        this.lastSearchQuery = '';
        this.currentSearchResults = [];
        this.selectedEnterprise = null;
        this.searchDebouncer = createSearchDebouncer(
            (query) => this.performSearch(query),
            TIMEOUTS.SEARCH_DELAY
        );
    }

    // Gère la recherche avec debouncing
    handleSearch(query) {
        if (!query || query.trim().length < 2) {
            this.clearSearchResults();
            return;
        }

        const trimmedQuery = query.trim();
        
        // Évite les recherches identiques
        if (trimmedQuery === this.lastSearchQuery) {
            return;
        }

        this.lastSearchQuery = trimmedQuery;
        this.searchDebouncer(trimmedQuery);
    }

    // Effectue la recherche
    async performSearch(query) {
        try {
            updateStatus('🔍 Recherche en cours...');
            
            const response = await enterpriseService.smartSearch(query, { limit: 10 });
            
            console.log('🔍 Response dans performSearch:', response);
            
            if (response.success && response.data && Array.isArray(response.data)) {
                this.currentSearchResults = response.data;
                this.displaySearchResults(response.data, response.source);
                updateStatus(`${response.data.length} résultat(s) trouvé(s)`);
            } else {
                this.displaySearchError(response.error || 'Aucun résultat');
                updateStatus('❌ Aucun résultat');
            }
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            this.displaySearchError('Erreur de connexion');
            updateStatus('❌ Erreur de connexion');
        }
    }

    // Affiche les résultats de recherche
    displaySearchResults(results, source = 'enterprises') {
        const resultsDiv = document.getElementById(UI_ELEMENTS.SEARCH_RESULTS);
        
        if (!resultsDiv) {
            console.error('Élément de résultats de recherche non trouvé');
            return;
        }

        if (!results || results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="search-no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>Aucun résultat trouvé</h3>
                    <p>Essayez avec d'autres mots-clés</p>
                </div>
            `;
            return;
        }

        const sourceLabel = source === 'entities' ? 'Entités externes' : 'Base de données';
        
        resultsDiv.innerHTML = `
            <div class="search-results-header">
                <h3>📊 ${results.length} résultat(s) - ${sourceLabel}</h3>
            </div>
            <div class="search-results-list">
                ${results.map((enterprise, index) => this.createEnterpriseCard(enterprise, index)).join('')}
            </div>
        `;
    }

    // Version simplifiée qui MARCHE
    createEnterpriseCard(enterprise, index) {
        console.log('🏢 Création carte pour:', enterprise);
        
        // Protection contre les données manquantes
        const name = enterprise.nom_entreprise || enterprise.nom || enterprise.name || 'Nom non disponible';
        const commune = enterprise.commune || enterprise.ville || 'Commune inconnue';
        const interlocuteur = enterprise.interlocuteur || enterprise.contact || 'Contact non disponible';
        const telephone = enterprise.telephone || enterprise.phone || '';
        const email = enterprise.email || '';
        
        console.log('🏢 Données extraites:', { name, commune, interlocuteur });
        
        return `
            <div class="enterprise-card" onclick="window.searchManager.selectEnterprise(${index})" style="
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 8px;
                margin: 8px 0;
                background: white;
                cursor: pointer;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='white'">
                <div class="enterprise-header">
                    <h4 class="enterprise-name" style="margin: 0 0 8px 0; color: #1d3557; font-size: 16px;">
                        ${name}
                    </h4>
                </div>
                <div class="enterprise-details" style="font-size: 14px; color: #666;">
                    <div class="enterprise-address" style="margin: 4px 0;">
                        📍 ${commune}
                    </div>
                    <div class="enterprise-contact" style="margin: 4px 0;">
                        👤 ${interlocuteur}
                    </div>
                    ${telephone ? `<div class="enterprise-phone" style="margin: 4px 0;">📞 ${telephone}</div>` : ''}
                    ${email ? `<div class="enterprise-email" style="margin: 4px 0;">✉️ ${email}</div>` : ''}
                </div>
            </div>
        `;
    }

    // Formate l'adresse
    formatAddress(enterprise) {
        const parts = [];
        
        if (enterprise.adresse || enterprise.address) {
            parts.push(enterprise.adresse || enterprise.address);
        }
        
        if (enterprise.code_postal || enterprise.postal_code) {
            parts.push(enterprise.code_postal || enterprise.postal_code);
        }
        
        if (enterprise.ville || enterprise.city) {
            parts.push(enterprise.ville || enterprise.city);
        }
        
        return parts.join(', ');
    }

    // Sélectionne une entreprise
    selectEnterprise(index) {
        if (index >= 0 && index < this.currentSearchResults.length) {
            this.selectedEnterprise = this.currentSearchResults[index];
            
            // Notification de sélection
            updateStatus(`✅ Entreprise sélectionnée: ${this.selectedEnterprise.nom || this.selectedEnterprise.name}`);
            
            // Met à jour l'affichage
            this.highlightSelectedEnterprise(index);
            
            // Déclenche un événement personnalisé
            this.dispatchEnterpriseSelected(this.selectedEnterprise);
        }
    }

    // Met en surbrillance l'entreprise sélectionnée
    highlightSelectedEnterprise(index) {
        const cards = document.querySelectorAll('.enterprise-card');
        cards.forEach((card, i) => {
            if (i === index) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    // Déclenche un événement de sélection d'entreprise
    dispatchEnterpriseSelected(enterprise) {
        const event = new CustomEvent('enterpriseSelected', {
            detail: enterprise
        });
        window.dispatchEvent(event);
    }

    // Affiche une erreur de recherche
    displaySearchError(error) {
        const resultsDiv = document.getElementById(UI_ELEMENTS.SEARCH_RESULTS);
        
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="search-error">
                    <div class="error-icon">❌</div>
                    <h3>Erreur de recherche</h3>
                    <p>${error}</p>
                    <button class="btn btn-secondary" onclick="window.searchManager.retry()">
                        🔄 Réessayer
                    </button>
                </div>
            `;
        }
    }

    // Vide les résultats de recherche
    clearSearchResults() {
        const resultsDiv = document.getElementById(UI_ELEMENTS.SEARCH_RESULTS);
        if (resultsDiv) {
            resultsDiv.innerHTML = '';
        }
        this.currentSearchResults = [];
    }

    // Réessaie la dernière recherche
    retry() {
        if (this.lastSearchQuery) {
            this.performSearch(this.lastSearchQuery);
        }
    }

    // Recherche d'entreprise spécifique
    async searchEnterpriseById(id) {
        try {
            updateStatus('🔍 Récupération des données...');
            
            const response = await enterpriseService.getEnterpriseById(id);
            
            if (response.success) {
                this.selectedEnterprise = response.data;
                this.displaySearchResults([response.data]);
                updateStatus('✅ Entreprise trouvée');
                return response.data;
            } else {
                this.displaySearchError(response.error);
                updateStatus('❌ Entreprise non trouvée');
                return null;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération:', error);
            this.displaySearchError('Erreur de connexion');
            updateStatus('❌ Erreur de connexion');
            return null;
        }
    }

    // Obtient l'entreprise sélectionnée
    getSelectedEnterprise() {
        return this.selectedEnterprise;
    }

    // Réinitialise la recherche
    reset() {
        this.lastSearchQuery = '';
        this.selectedEnterprise = null;
        this.currentSearchResults = [];
        this.clearSearchResults();
        
        const searchInput = document.getElementById(UI_ELEMENTS.SEARCH_INPUT);
        if (searchInput) {
            searchInput.value = '';
        }
    }

    // Initialise la recherche
    initialize() {
        const searchInput = document.getElementById(UI_ELEMENTS.SEARCH_INPUT);
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch(e.target.value);
                }
            });
        }
    }

    // Recherche avec filtres
    async searchWithFilters(query, filters = {}) {
        try {
            updateStatus('🔍 Recherche avec filtres...');
            
            const response = await enterpriseService.searchEnterprises(query, {
                ...filters,
                limit: 20
            });
            
            if (response.success) {
                this.currentSearchResults = response.data;
                this.displaySearchResults(response.data);
                updateStatus(`${response.data.length} résultat(s) avec filtres`);
            } else {
                this.displaySearchError(response.error);
                updateStatus('❌ Erreur de recherche');
            }
        } catch (error) {
            console.error('Erreur lors de la recherche avec filtres:', error);
            this.displaySearchError('Erreur de connexion');
            updateStatus('❌ Erreur de connexion');
        }
    }

    // Suggestions de recherche
    getSuggestions(query) {
        const suggestions = [];
        
        if (query.length >= 2) {
            // Suggestions basées sur l'historique des recherches
            const history = this.getSearchHistory();
            const matching = history.filter(term => 
                term.toLowerCase().includes(query.toLowerCase())
            );
            suggestions.push(...matching);
        }
        
        return suggestions.slice(0, 5);
    }

    // Obtient l'historique des recherches
    getSearchHistory() {
        try {
            const history = localStorage.getItem('searchHistory');
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            return [];
        }
    }

    // Sauvegarde une recherche dans l'historique
    saveToHistory(query) {
        if (!query || query.trim().length < 2) return;
        
        try {
            const history = this.getSearchHistory();
            const trimmedQuery = query.trim();
            
            // Évite les doublons
            const filtered = history.filter(term => term !== trimmedQuery);
            filtered.unshift(trimmedQuery);
            
            // Limite à 10 éléments
            const limited = filtered.slice(0, 10);
            
            localStorage.setItem('searchHistory', JSON.stringify(limited));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
        }
    }
}

// Instance singleton
export const searchManager = new SearchManager();

// Expose globalement pour les événements onclick
window.searchManager = searchManager;

// Utilitaires de recherche
export const SearchUtils = {
    // Nettoie une requête de recherche
    cleanSearchQuery(query) {
        return query
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, ' ');
    },

    // Génère des mots-clés de recherche
    generateSearchKeywords(text) {
        if (!text) return [];
        
        return text
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2)
            .slice(0, 5);
    },

    // Calcule la pertinence d'un résultat
    calculateRelevance(enterprise, query) {
        const keywords = SearchUtils.generateSearchKeywords(query);
        const text = `${enterprise.nom || enterprise.name || ''} ${enterprise.commentaires || enterprise.comments || ''}`.toLowerCase();
        
        let score = 0;
        keywords.forEach(keyword => {
            if (text.includes(keyword)) {
                score += 1;
            }
        });
        
        return score / keywords.length;
    }
};

export default searchManager;