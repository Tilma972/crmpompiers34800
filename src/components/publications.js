import { getBasePriceByFormat, calculateTotalPrice } from '../utils/helpers.js';
import { formatPrice } from '../utils/formatters.js';
import { validatePrice } from '../utils/validators.js';
import { createElement, clearElement } from '../utils/dom.js';

// Gestionnaire des publications multiples
class PublicationsManager {
    constructor() {
        this.publications = [];
        this.selectedFormats = [];
        this.totalPrice = 0;
        this.onUpdateCallback = null;
    }

    // Crée l'interface de sélection des parutions multiples
    createMultiPublicationsInterface() {
        return `
            <div class="multi-publications-container">
                <div class="publications-header">
                    <h3>📅 Sélection des Parutions 2026</h3>
                    <p>Choisissez les mois et formats pour les insertions publicitaires</p>
                </div>
                
                <div class="publications-grid">
                    ${this.createMonthsGrid()}
                </div>
                
                <div class="format-selector">
                    <h4>📐 Format d'encart</h4>
                    ${this.createFormatSelector()}
                </div>
                
                <div class="publications-summary">
                    <h4>📋 Récapitulatif des sélections</h4>
                    <div id="selectedPublications" class="selected-publications">
                        <p class="no-selection">Aucune publication sélectionnée</p>
                    </div>
                    
                    <div class="price-summary">
                        <div class="price-line">
                            <span>Total HT:</span>
                            <span id="totalHT">0,00 €</span>
                        </div>
                        <div class="price-line">
                            <span>TVA (20%):</span>
                            <span id="totalTVA">0,00 €</span>
                        </div>
                        <div class="price-line total">
                            <span>Total TTC:</span>
                            <span id="totalTTC">0,00 €</span>
                        </div>
                    </div>
                </div>
                
                <div class="smart-suggestions" id="smartSuggestions" style="display: none;">
                    <h4>💡 Suggestions intelligentes</h4>
                    <div id="suggestionsContent"></div>
                </div>
            </div>
        `;
    }

    // Crée la grille des mois
    createMonthsGrid() {
        const months = [
            { id: 'janvier', name: 'Janvier', season: 'hiver' },
            { id: 'fevrier', name: 'Février', season: 'hiver' },
            { id: 'mars', name: 'Mars', season: 'printemps' },
            { id: 'avril', name: 'Avril', season: 'printemps' },
            { id: 'mai', name: 'Mai', season: 'printemps' },
            { id: 'juin', name: 'Juin', season: 'ete' },
            { id: 'juillet', name: 'Juillet', season: 'ete' },
            { id: 'aout', name: 'Août', season: 'ete' },
            { id: 'septembre', name: 'Septembre', season: 'automne' },
            { id: 'octobre', name: 'Octobre', season: 'automne' },
            { id: 'novembre', name: 'Novembre', season: 'automne' },
            { id: 'decembre', name: 'Décembre', season: 'hiver' }
        ];

        return `
            <div class="months-grid">
                ${months.map(month => `
                    <div class="month-card ${month.season}" data-month="${month.id}">
                        <div class="month-checkbox">
                            <input type="checkbox" id="month_${month.id}" 
                                   onchange="window.publicationsManager.toggleMonth('${month.id}', '${month.name}')">
                            <label for="month_${month.id}">${month.name}</label>
                        </div>
                        <div class="month-price" id="price_${month.id}">-</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Crée le sélecteur de format
    createFormatSelector() {
        const formats = [
            { value: '1/6 page', label: '1/6 page', price: 135, description: 'Format économique' },
            { value: '1/4 page', label: '1/4 page', price: 175, description: 'Format standard' },
            { value: '1/3 page', label: '1/3 page', price: 195, description: 'Bonne visibilité' },
            { value: '1/2 page', label: '1/2 page', price: 240, description: 'Très visible' },
            { value: '1 page', label: '1 page', price: 380, description: 'Impact maximum' },
            { value: 'Dos de couverture', label: 'Dos de couverture', price: 450, description: 'Premium' },
            { value: 'Couverture', label: 'Couverture', price: 520, description: 'Prestige' }
        ];

        return `
            <div class="format-options">
                ${formats.map(format => `
                    <div class="format-option">
                        <input type="radio" id="format_${format.value.replace(/[^a-z0-9]/gi, '_')}" 
                               name="selectedFormat" value="${format.value}"
                               onchange="window.publicationsManager.selectFormat('${format.value}')">
                        <label for="format_${format.value.replace(/[^a-z0-9]/gi, '_')}" class="format-card">
                            <div class="format-header">
                                <span class="format-name">${format.label}</span>
                                <span class="format-price">${formatPrice(format.price)}</span>
                            </div>
                            <div class="format-description">${format.description}</div>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Bascule la sélection d'un mois
    toggleMonth(monthId, monthName) {
        const checkbox = document.getElementById(`month_${monthId}`);
        const selectedFormat = this.getSelectedFormat();
        
        if (!selectedFormat) {
            checkbox.checked = false;
            alert('Veuillez d\'abord sélectionner un format d\'encart');
            return;
        }

        if (checkbox.checked) {
            this.addPublication(monthName, selectedFormat);
        } else {
            this.removePublication(monthName);
        }
        
        this.updateInterface();
    }

    // Sélectionne un format
    selectFormat(format) {
        // Met à jour les prix des mois sélectionnés
        const selectedMonths = document.querySelectorAll('.month-card input[type="checkbox"]:checked');
        selectedMonths.forEach(checkbox => {
            const monthId = checkbox.id.replace('month_', '');
            const priceElement = document.getElementById(`price_${monthId}`);
            if (priceElement) {
                priceElement.textContent = formatPrice(getBasePriceByFormat(format));
            }
        });

        // Recalcule les publications existantes avec le nouveau format
        this.publications.forEach(pub => {
            pub.format = format;
            pub.prix = getBasePriceByFormat(format);
        });

        this.updateInterface();
        this.showSmartSuggestions(format);
    }

    // Ajoute une publication
    addPublication(mois, format) {
        const prix = getBasePriceByFormat(format);
        const publication = {
            mois,
            format,
            prix,
            id: `${mois}_${format}`.replace(/[^a-z0-9]/gi, '_')
        };

        // Évite les doublons
        const existingIndex = this.publications.findIndex(p => p.mois === mois);
        if (existingIndex >= 0) {
            this.publications[existingIndex] = publication;
        } else {
            this.publications.push(publication);
        }
    }

    // Supprime une publication
    removePublication(mois) {
        this.publications = this.publications.filter(p => p.mois !== mois);
        
        // Décochecoche le mois
        const monthId = mois.toLowerCase().replace(/[^a-z]/g, '');
        const checkbox = document.getElementById(`month_${monthId}`);
        if (checkbox) {
            checkbox.checked = false;
        }
    }

    // Met à jour l'interface
    updateInterface() {
        this.updateSelectedPublications();
        this.updatePriceSummary();
        this.updateMonthPrices();
        
        if (this.onUpdateCallback) {
            this.onUpdateCallback(this.publications);
        }
    }

    // Met à jour l'affichage des publications sélectionnées
    updateSelectedPublications() {
        const container = document.getElementById('selectedPublications');
        if (!container) return;

        if (this.publications.length === 0) {
            container.innerHTML = '<p class="no-selection">Aucune publication sélectionnée</p>';
            return;
        }

        container.innerHTML = `
            <div class="publications-list">
                ${this.publications.map(pub => `
                    <div class="publication-item">
                        <span class="publication-month">${pub.mois}</span>
                        <span class="publication-format">${pub.format}</span>
                        <span class="publication-price">${formatPrice(pub.prix)}</span>
                        <button class="btn-remove" onclick="window.publicationsManager.removePublicationByMois('${pub.mois}')">
                            ❌
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Met à jour le résumé des prix
    updatePriceSummary() {
        const totalHT = calculateTotalPrice(this.publications);
        const totalTVA = totalHT * 0.20;
        const totalTTC = totalHT + totalTVA;

        this.totalPrice = totalTTC;

        const totalHTElement = document.getElementById('totalHT');
        const totalTVAElement = document.getElementById('totalTVA');
        const totalTTCElement = document.getElementById('totalTTC');

        if (totalHTElement) totalHTElement.textContent = formatPrice(totalHT);
        if (totalTVAElement) totalTVAElement.textContent = formatPrice(totalTVA);
        if (totalTTCElement) totalTTCElement.textContent = formatPrice(totalTTC);
    }

    // Met à jour les prix des mois
    updateMonthPrices() {
        const selectedFormat = this.getSelectedFormat();
        if (!selectedFormat) return;

        const price = getBasePriceByFormat(selectedFormat);
        
        // Met à jour tous les prix des mois
        const priceElements = document.querySelectorAll('[id^="price_"]');
        priceElements.forEach(element => {
            const monthId = element.id.replace('price_', '');
            const checkbox = document.getElementById(`month_${monthId}`);
            
            if (checkbox && checkbox.checked) {
                element.textContent = formatPrice(price);
            } else {
                element.textContent = '-';
            }
        });
    }

    // Obtient le format sélectionné
    getSelectedFormat() {
        const selectedRadio = document.querySelector('input[name="selectedFormat"]:checked');
        return selectedRadio ? selectedRadio.value : null;
    }

    // Supprime une publication par mois
    removePublicationByMois(mois) {
        this.removePublication(mois);
        this.updateInterface();
    }

    // Affiche les suggestions intelligentes
    showSmartSuggestions(format) {
        const suggestions = this.generateSmartSuggestions(format);
        const container = document.getElementById('smartSuggestions');
        const content = document.getElementById('suggestionsContent');
        
        if (!container || !content) return;

        if (suggestions.length > 0) {
            content.innerHTML = suggestions.map(suggestion => `
                <div class="suggestion-item">
                    <div class="suggestion-header">
                        <span class="suggestion-icon">${suggestion.icon}</span>
                        <span class="suggestion-title">${suggestion.title}</span>
                        <span class="suggestion-discount">${suggestion.discount}</span>
                    </div>
                    <div class="suggestion-description">${suggestion.description}</div>
                    <button class="btn btn-sm btn-secondary" onclick="window.publicationsManager.applySuggestion('${suggestion.id}')">
                        Appliquer
                    </button>
                </div>
            `).join('');
            
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }

    // Génère des suggestions intelligentes
    generateSmartSuggestions(format) {
        const suggestions = [];
        const selectedCount = this.publications.length;

        // Suggestion multi-parution
        if (selectedCount >= 3 && selectedCount < 6) {
            suggestions.push({
                id: 'multi_6',
                icon: '🎯',
                title: 'Pack 6 mois',
                discount: '-10%',
                description: 'Sélectionnez 6 mois et bénéficiez de 10% de remise',
                action: () => this.applyMultiMonthDiscount(6, 0.10)
            });
        }

        // Suggestion pack annuel
        if (selectedCount >= 6 && selectedCount < 12) {
            suggestions.push({
                id: 'annual',
                icon: '📅',
                title: 'Pack Annuel',
                discount: '-15%',
                description: 'Calendrier complet 2026 avec 15% de remise',
                action: () => this.applyAnnualPackage()
            });
        }

        // Suggestion format premium
        if (format === '1/6 page' || format === '1/4 page') {
            suggestions.push({
                id: 'upgrade',
                icon: '⬆️',
                title: 'Upgrade format',
                discount: 'Offre spéciale',
                description: 'Passez au format supérieur pour seulement +20€/mois',
                action: () => this.suggestFormatUpgrade()
            });
        }

        return suggestions;
    }

    // Applique une suggestion
    applySuggestion(suggestionId) {
        switch (suggestionId) {
            case 'multi_6':
                this.selectRandomMonths(6);
                break;
            case 'annual':
                this.selectAllMonths();
                break;
            case 'upgrade':
                this.upgradeFormat();
                break;
        }
        this.updateInterface();
    }

    // Sélectionne des mois aléatoires
    selectRandomMonths(count) {
        const allMonths = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        
        const selectedFormat = this.getSelectedFormat();
        if (!selectedFormat) return;

        // Désélectionne tout d'abord
        this.clearAllSelections();

        // Sélectionne aléatoirement
        const shuffled = allMonths.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        selected.forEach(month => {
            this.addPublication(month, selectedFormat);
            const monthId = month.toLowerCase().replace(/[^a-z]/g, '');
            const checkbox = document.getElementById(`month_${monthId}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // Sélectionne tous les mois
    selectAllMonths() {
        const allMonths = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        
        const selectedFormat = this.getSelectedFormat();
        if (!selectedFormat) return;

        allMonths.forEach(month => {
            this.addPublication(month, selectedFormat);
            const monthId = month.toLowerCase().replace(/[^a-z]/g, '');
            const checkbox = document.getElementById(`month_${monthId}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    // Améliore le format
    upgradeFormat() {
        const currentFormat = this.getSelectedFormat();
        const formatHierarchy = ['1/6 page', '1/4 page', '1/3 page', '1/2 page', '1 page'];
        
        const currentIndex = formatHierarchy.indexOf(currentFormat);
        if (currentIndex >= 0 && currentIndex < formatHierarchy.length - 1) {
            const newFormat = formatHierarchy[currentIndex + 1];
            const newFormatRadio = document.querySelector(`input[value="${newFormat}"]`);
            if (newFormatRadio) {
                newFormatRadio.checked = true;
                this.selectFormat(newFormat);
            }
        }
    }

    // Efface toutes les sélections
    clearAllSelections() {
        this.publications = [];
        const checkboxes = document.querySelectorAll('.month-card input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    // Obtient toutes les publications
    getPublications() {
        return [...this.publications];
    }

    // Définit un callback de mise à jour
    setUpdateCallback(callback) {
        this.onUpdateCallback = callback;
    }

    // Obtient le prix total
    getTotalPrice() {
        return this.totalPrice;
    }

    // Charge des publications existantes
    loadPublications(publications) {
        this.publications = [...publications];
        
        // Met à jour l'interface si elle existe
        if (document.getElementById('selectedPublications')) {
            this.updateInterface();
            
            // Coche les cases correspondantes
            publications.forEach(pub => {
                const monthId = pub.mois.toLowerCase().replace(/[^a-z]/g, '');
                const checkbox = document.getElementById(`month_${monthId}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
                
                // Sélectionne le format
                if (pub.format) {
                    const formatRadio = document.querySelector(`input[value="${pub.format}"]`);
                    if (formatRadio) {
                        formatRadio.checked = true;
                    }
                }
            });
        }
    }

    // Réinitialise le gestionnaire
    reset() {
        this.publications = [];
        this.totalPrice = 0;
        this.clearAllSelections();
        
        if (document.getElementById('selectedPublications')) {
            this.updateInterface();
        }
    }
}

// Instance singleton
export const publicationsManager = new PublicationsManager();

// Expose globalement pour les événements onclick
window.publicationsManager = publicationsManager;

// Utilitaires pour les publications
export const PublicationsUtils = {
    // Calcule la remise pour multi-parutions
    calculateMultiDiscount(publicationsCount) {
        if (publicationsCount >= 12) return 0.15; // 15% pour pack annuel
        if (publicationsCount >= 6) return 0.10;  // 10% pour pack semestriel
        if (publicationsCount >= 3) return 0.05;  // 5% pour pack trimestriel
        return 0;
    },

    // Génère un résumé textuel des publications
    generatePublicationsSummary(publications) {
        if (!publications || publications.length === 0) {
            return 'Aucune publication sélectionnée';
        }

        const months = publications.map(p => p.mois).join(', ');
        const format = publications[0]?.format || 'Format non spécifié';
        const total = calculateTotalPrice(publications);

        return `${publications.length} publication(s) - ${format} - ${months} - Total: ${formatPrice(total)}`;
    },

    // Valide les publications
    validatePublications(publications) {
        const errors = [];
        
        if (!publications || publications.length === 0) {
            errors.push('Au moins une publication est requise');
        }

        publications.forEach((pub, index) => {
            if (!pub.mois) {
                errors.push(`Mois manquant pour la publication ${index + 1}`);
            }
            if (!pub.format) {
                errors.push(`Format manquant pour la publication ${index + 1}`);
            }
            if (!pub.prix || !validatePrice(pub.prix)) {
                errors.push(`Prix invalide pour la publication ${index + 1}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

export default publicationsManager;