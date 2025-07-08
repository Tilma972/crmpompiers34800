import { analyzeClientHistory, analyzeClientType } from '../utils/validators.js';
import { getBasePriceByFormat } from '../utils/helpers.js';
import { formatPrice } from '../utils/formatters.js';

// Gestionnaire d'offres intelligentes
class SmartOffersManager {
    constructor() {
        this.currentOffers = [];
        this.selectedOffer = null;
        this.offerHistory = [];
    }

    // Calcule les offres intelligentes pour une entreprise
    calculateSmartOffers(enterprise, selectedFormat = '1/4 page') {
        if (!enterprise) return [];

        const clientAnalysis = this.analyzeClientProfile(enterprise);
        const offers = [];

        // Offre de fidélité
        if (clientAnalysis.loyalty !== 'unknown') {
            const loyaltyOffer = this.calculateLoyaltyOffer(selectedFormat, clientAnalysis);
            if (loyaltyOffer) offers.push(loyaltyOffer);
        }

        // Offre multi-parution
        const multiOffer = this.calculateMultiParutionOffer(selectedFormat, clientAnalysis);
        if (multiOffer) offers.push(multiOffer);

        // Offre de renouvellement
        if (clientAnalysis.isRenewal) {
            const renewalOffer = this.calculateRenewalOffer(selectedFormat, clientAnalysis);
            if (renewalOffer) offers.push(renewalOffer);
        }

        // Offre nouveau client
        if (clientAnalysis.isNew) {
            const newClientOffer = this.calculateNewClientOffer(selectedFormat, clientAnalysis);
            if (newClientOffer) offers.push(newClientOffer);
        }

        // Offre premium upgrade
        const upgradeOffer = this.calculateUpgradeOffer(selectedFormat, clientAnalysis);
        if (upgradeOffer) offers.push(upgradeOffer);

        this.currentOffers = offers;
        return offers;
    }

    // Analyse le profil client
    analyzeClientProfile(enterprise) {
        const history = analyzeClientHistory(enterprise);
        const clientType = analyzeClientType(enterprise);
        
        return {
            loyalty: history.loyalty,
            yearsActive: history.yearsActive,
            loyaltyScore: history.loyaltyScore,
            isRenewal: clientType.type === 'renouvellement',
            isNew: clientType.type === 'nouveau',
            confidence: clientType.confidence,
            details: {
                ...history.details,
                ...clientType.details
            }
        };
    }

    // Calcule une offre de fidélité
    calculateLoyaltyOffer(format, clientAnalysis) {
        if (clientAnalysis.loyalty === 'low' || clientAnalysis.yearsActive < 2) {
            return null;
        }

        const basePrice = getBasePriceByFormat(format);
        let discountPercent = 0;
        let title = '';
        let description = '';

        switch (clientAnalysis.loyalty) {
            case 'high':
                discountPercent = 15;
                title = '🏆 Offre Fidélité Premium';
                description = `Client fidèle depuis ${clientAnalysis.yearsActive} ans - Remise exceptionnelle de 15%`;
                break;
            case 'medium':
                discountPercent = 10;
                title = '⭐ Offre Fidélité';
                description = `Client régulier - Remise de fidélité de 10%`;
                break;
        }

        if (discountPercent === 0) return null;

        const discountAmount = basePrice * (discountPercent / 100);
        const finalPrice = basePrice - discountAmount;

        return {
            id: 'loyalty_offer',
            type: 'loyalty',
            title,
            description,
            format,
            originalPrice: basePrice,
            discountPercent,
            discountAmount,
            finalPrice,
            savings: discountAmount,
            icon: '🏆',
            priority: 'high',
            validUntil: this.calculateValidityDate(30),
            conditions: [
                `Valable pour le format ${format}`,
                'Non cumulable avec d\'autres offres',
                'Valable 30 jours'
            ]
        };
    }

    // Calcule une offre multi-parution
    calculateMultiParutionOffer(format, clientAnalysis) {
        const basePrice = getBasePriceByFormat(format);
        
        const multiOffers = [
            {
                months: 3,
                discount: 5,
                title: '📅 Pack Trimestriel',
                description: '3 mois consécutifs avec 5% de remise'
            },
            {
                months: 6,
                discount: 10,
                title: '📅 Pack Semestriel',
                description: '6 mois avec 10% de remise - Notre bestseller !'
            },
            {
                months: 12,
                discount: 15,
                title: '📅 Pack Annuel Premium',
                description: 'Calendrier complet 2026 avec 15% de remise'
            }
        ];

        // Recommande le pack selon le profil client
        let recommendedOffer;
        if (clientAnalysis.loyalty === 'high') {
            recommendedOffer = multiOffers[2]; // Pack annuel
        } else if (clientAnalysis.isRenewal) {
            recommendedOffer = multiOffers[1]; // Pack semestriel
        } else {
            recommendedOffer = multiOffers[0]; // Pack trimestriel
        }

        const totalPrice = basePrice * recommendedOffer.months;
        const discountAmount = totalPrice * (recommendedOffer.discount / 100);
        const finalPrice = totalPrice - discountAmount;

        return {
            id: 'multi_offer',
            type: 'multi_parution',
            title: recommendedOffer.title,
            description: recommendedOffer.description,
            format,
            months: recommendedOffer.months,
            originalPrice: totalPrice,
            discountPercent: recommendedOffer.discount,
            discountAmount,
            finalPrice,
            savings: discountAmount,
            pricePerMonth: finalPrice / recommendedOffer.months,
            icon: '📅',
            priority: 'medium',
            validUntil: this.calculateValidityDate(45),
            conditions: [
                `${recommendedOffer.months} parutions consécutives`,
                `Format ${format} pour toutes les parutions`,
                'Paiement en une fois',
                'Valable 45 jours'
            ]
        };
    }

    // Calcule une offre de renouvellement
    calculateRenewalOffer(format, clientAnalysis) {
        const basePrice = getBasePriceByFormat(format);
        const confidenceBonus = Math.floor(clientAnalysis.confidence * 5); // 0-5% bonus selon confiance
        const discountPercent = 8 + confidenceBonus;
        
        const discountAmount = basePrice * (discountPercent / 100);
        const finalPrice = basePrice - discountAmount;

        return {
            id: 'renewal_offer',
            type: 'renewal',
            title: '🔄 Offre Renouvellement 2026',
            description: `Renouvellement confirmé - Remise spéciale de ${discountPercent}%`,
            format,
            originalPrice: basePrice,
            discountPercent,
            discountAmount,
            finalPrice,
            savings: discountAmount,
            icon: '🔄',
            priority: 'high',
            validUntil: this.calculateValidityDate(60),
            conditions: [
                'Réservé aux clients renouvelant leur parution',
                `Valable pour le format ${format}`,
                'Offre limitée dans le temps',
                'Valable 60 jours'
            ]
        };
    }

    // Calcule une offre nouveau client
    calculateNewClientOffer(format, clientAnalysis) {
        const basePrice = getBasePriceByFormat(format);
        const discountPercent = 12; // Offre d'accueil généreuse
        
        const discountAmount = basePrice * (discountPercent / 100);
        const finalPrice = basePrice - discountAmount;

        return {
            id: 'new_client_offer',
            type: 'new_client',
            title: '🎉 Offre Bienvenue Nouveau Client',
            description: `Première parution avec ${discountPercent}% de remise + suivi personnalisé`,
            format,
            originalPrice: basePrice,
            discountPercent,
            discountAmount,
            finalPrice,
            savings: discountAmount,
            icon: '🎉',
            priority: 'high',
            validUntil: this.calculateValidityDate(90),
            extras: [
                'Suivi personnalisé de votre première campagne',
                'Conseils d\'optimisation gratuits',
                'Support prioritaire'
            ],
            conditions: [
                'Réservé aux nouveaux clients',
                `Valable pour le format ${format}`,
                'Une seule utilisation par client',
                'Valable 90 jours'
            ]
        };
    }

    // Calcule une offre d'upgrade
    calculateUpgradeOffer(format, clientAnalysis) {
        const formatHierarchy = [
            '1/6 page', '1/4 page', '1/3 page', '1/2 page', '1 page', 
            'Dos de couverture', 'Couverture'
        ];
        
        const currentIndex = formatHierarchy.indexOf(format);
        if (currentIndex >= formatHierarchy.length - 2) {
            return null; // Déjà au format premium
        }

        const nextFormat = formatHierarchy[currentIndex + 1];
        const currentPrice = getBasePriceByFormat(format);
        const nextPrice = getBasePriceByFormat(nextFormat);
        const normalUpgradeCost = nextPrice - currentPrice;
        
        // Offre upgrade avec réduction
        const discountPercent = 30;
        const discountAmount = normalUpgradeCost * (discountPercent / 100);
        const upgradeCost = normalUpgradeCost - discountAmount;
        const finalPrice = currentPrice + upgradeCost;

        return {
            id: 'upgrade_offer',
            type: 'upgrade',
            title: '⬆️ Offre Upgrade Premium',
            description: `Passez au format ${nextFormat} pour seulement ${formatPrice(upgradeCost)} de plus`,
            fromFormat: format,
            toFormat: nextFormat,
            originalUpgradeCost: normalUpgradeCost,
            discountPercent,
            discountAmount,
            upgradeCost,
            finalPrice,
            savings: discountAmount,
            icon: '⬆️',
            priority: 'medium',
            validUntil: this.calculateValidityDate(30),
            benefits: [
                'Visibilité augmentée de 40%',
                'Meilleur retour sur investissement',
                'Impact commercial renforcé'
            ],
            conditions: [
                `Upgrade de ${format} vers ${nextFormat}`,
                'Offre valable pour cette commande uniquement',
                'Non rétroactive',
                'Valable 30 jours'
            ]
        };
    }

    // Calcule la date de validité d'une offre
    calculateValidityDate(daysFromNow) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString();
    }

    // Sélectionne une offre
    selectOffer(offerId) {
        const offer = this.currentOffers.find(o => o.id === offerId);
        if (offer) {
            this.selectedOffer = offer;
            this.saveOfferHistory(offer);
            return offer;
        }
        return null;
    }

    // Obtient l'offre sélectionnée
    getSelectedOffer() {
        return this.selectedOffer;
    }

    // Sauvegarde dans l'historique des offres
    saveOfferHistory(offer) {
        this.offerHistory.unshift({
            ...offer,
            selectedAt: new Date().toISOString()
        });
        
        // Limite l'historique à 50 éléments
        if (this.offerHistory.length > 50) {
            this.offerHistory = this.offerHistory.slice(0, 50);
        }
    }

    // Crée l'interface d'affichage des offres
    createOffersInterface(offers) {
        if (!offers || offers.length === 0) {
            return `
                <div class="no-offers">
                    <div class="no-offers-icon">💡</div>
                    <h3>Aucune offre spéciale disponible</h3>
                    <p>Continuez avec le tarif standard</p>
                </div>
            `;
        }

        return `
            <div class="smart-offers-container">
                <div class="offers-header">
                    <h3>💡 Offres intelligentes personnalisées</h3>
                    <p>Offres calculées selon le profil client</p>
                </div>
                
                <div class="offers-grid">
                    ${offers.map(offer => this.createOfferCard(offer)).join('')}
                </div>
                
                <div class="offers-footer">
                    <p class="offers-note">
                        💡 Ces offres sont calculées automatiquement selon l'historique client
                    </p>
                </div>
            </div>
        `;
    }

    // Crée une carte d'offre
    createOfferCard(offer) {
        const isSelected = this.selectedOffer && this.selectedOffer.id === offer.id;
        
        return `
            <div class="offer-card ${offer.priority} ${isSelected ? 'selected' : ''}" 
                 data-offer-id="${offer.id}">
                <div class="offer-header">
                    <div class="offer-icon">${offer.icon}</div>
                    <div class="offer-badge">${offer.priority === 'high' ? 'RECOMMANDÉ' : 'INTÉRESSANT'}</div>
                </div>
                
                <div class="offer-content">
                    <h4 class="offer-title">${offer.title}</h4>
                    <p class="offer-description">${offer.description}</p>
                    
                    <div class="offer-pricing">
                        ${offer.originalPrice ? `
                            <div class="price-line original">
                                <span>Prix standard:</span>
                                <span class="price-crossed">${formatPrice(offer.originalPrice)}</span>
                            </div>
                        ` : ''}
                        
                        <div class="price-line final">
                            <span>Votre prix:</span>
                            <span class="price-final">${formatPrice(offer.finalPrice)}</span>
                        </div>
                        
                        <div class="price-savings">
                            <span class="savings-text">Vous économisez ${formatPrice(offer.savings)} (${offer.discountPercent}%)</span>
                        </div>
                    </div>
                    
                    ${offer.extras ? `
                        <div class="offer-extras">
                            <h5>Inclus:</h5>
                            <ul>
                                ${offer.extras.map(extra => `<li>${extra}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${offer.benefits ? `
                        <div class="offer-benefits">
                            <h5>Avantages:</h5>
                            <ul>
                                ${offer.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <div class="offer-footer">
                    <button class="btn ${isSelected ? 'btn-selected' : 'btn-primary'}" 
                            onclick="window.smartOffersManager.selectOffer('${offer.id}')">
                        ${isSelected ? '✅ Sélectionnée' : 'Sélectionner cette offre'}
                    </button>
                    
                    <div class="offer-validity">
                        Valable jusqu'au ${this.formatValidityDate(offer.validUntil)}
                    </div>
                </div>
                
                <div class="offer-conditions">
                    <details>
                        <summary>Conditions</summary>
                        <ul>
                            ${offer.conditions.map(condition => `<li>${condition}</li>`).join('')}
                        </ul>
                    </details>
                </div>
            </div>
        `;
    }

    // Formate la date de validité
    formatValidityDate(isoDate) {
        const date = new Date(isoDate);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Applique une offre à une qualification
    applyOfferToQualification(offer, baseQualificationData) {
        if (!offer) return baseQualificationData;

        const updatedData = { ...baseQualificationData };
        
        // Met à jour les prix selon le type d'offre
        switch (offer.type) {
            case 'multi_parution':
                updatedData.publications = this.generateMultiPublications(offer);
                break;
            case 'upgrade':
                updatedData.publications = updatedData.publications.map(pub => ({
                    ...pub,
                    format: offer.toFormat,
                    prix: offer.finalPrice
                }));
                break;
            default:
                updatedData.publications = updatedData.publications.map(pub => ({
                    ...pub,
                    prix: offer.finalPrice
                }));
        }

        // Ajoute les informations de l'offre
        updatedData.appliedOffer = {
            id: offer.id,
            title: offer.title,
            discountPercent: offer.discountPercent,
            savings: offer.savings,
            appliedAt: new Date().toISOString()
        };

        return updatedData;
    }

    // Génère les publications pour une offre multi-parution
    generateMultiPublications(offer) {
        const publications = [];
        const months = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        for (let i = 0; i < offer.months; i++) {
            publications.push({
                mois: months[i],
                format: offer.format,
                prix: offer.pricePerMonth
            });
        }

        return publications;
    }

    // Obtient les offres actuelles
    getCurrentOffers() {
        return this.currentOffers;
    }

    // Obtient l'historique des offres
    getOfferHistory() {
        return this.offerHistory;
    }

    // Réinitialise les offres
    reset() {
        this.currentOffers = [];
        this.selectedOffer = null;
    }

    // Valide qu'une offre est encore valide
    isOfferValid(offer) {
        const now = new Date();
        const validUntil = new Date(offer.validUntil);
        return now <= validUntil;
    }

    // Filtre les offres valides
    getValidOffers() {
        return this.currentOffers.filter(offer => this.isOfferValid(offer));
    }
}

// Instance singleton
export const smartOffersManager = new SmartOffersManager();

// Expose globalement pour les événements onclick
window.smartOffersManager = smartOffersManager;

// Utilitaires pour les offres intelligentes
export const SmartOffersUtils = {
    // Calcule le ROI potentiel d'une offre
    calculateOfferROI(offer, estimatedRevenue) {
        if (!estimatedRevenue || estimatedRevenue <= 0) return 0;
        
        const investment = offer.finalPrice;
        const roi = ((estimatedRevenue - investment) / investment) * 100;
        return Math.max(0, roi);
    },

    // Compare deux offres
    compareOffers(offer1, offer2) {
        // Compare d'abord les économies
        if (offer1.savings !== offer2.savings) {
            return offer2.savings - offer1.savings;
        }
        
        // Puis la priorité
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[offer2.priority] - priorityOrder[offer1.priority];
    },

    // Génère un résumé d'offre
    generateOfferSummary(offer) {
        return `${offer.title} - Économisez ${formatPrice(offer.savings)} (${offer.discountPercent}%)`;
    }
};

export default smartOffersManager;