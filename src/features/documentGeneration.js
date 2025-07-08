import { documentService } from '../services/documentService.js';
import { qualificationService } from '../services/qualificationService.js';
import { generateMultiPublicationsDescription, generateDocumentNumber } from '../utils/formatters.js';
import { calculateTotalPrice, findMostUsedFormat } from '../utils/helpers.js';
import { showLoadingState, hideLoadingState, updateStatus } from '../utils/ui.js';

// Gestionnaire de génération de documents avancé
class DocumentGenerationManager {
    constructor() {
        this.currentGeneration = null;
        this.generationHistory = [];
        this.generationQueue = [];
        this.isGenerating = false;
    }

    // Génère un document intelligent avec données enrichies
    async generateIntelligentDocument(qualificationData, documentType, options = {}) {
        if (this.isGenerating) {
            throw new Error('Une génération de document est déjà en cours');
        }

        this.isGenerating = true;
        showLoadingState(documentType);

        try {
            updateStatus('📋 Préparation des données...');
            
            // Enrichit les données de qualification
            const enhancedData = await this.enhanceQualificationData(qualificationData, documentType);
            
            updateStatus('🧮 Analyse et calculs...');
            
            // Parse et analyse les publications
            const analysisResult = await this.analyzePublications(enhancedData);
            
            updateStatus('📄 Génération du document...');
            
            // Génère le document avec les données enrichies
            const documentResult = await this.generateDocumentWithAnalysis(enhancedData, analysisResult, documentType, options);
            
            updateStatus('✅ Document généré avec succès');
            
            // Sauvegarde dans l'historique
            this.saveGenerationHistory(documentResult, enhancedData, documentType);
            
            return documentResult;
            
        } catch (error) {
            updateStatus('❌ Erreur lors de la génération');
            throw error;
        } finally {
            this.isGenerating = false;
            hideLoadingState();
        }
    }

    // Enrichit les données de qualification
    async enhanceQualificationData(qualificationData, documentType) {
        const enhanced = { ...qualificationData };
        
        // Ajoute les informations de document
        enhanced.documentInfo = {
            type: documentType,
            number: generateDocumentNumber(documentType),
            generatedAt: new Date().toISOString(),
            generatedBy: 'System Auto'
        };

        // Enrichit les données d'entreprise
        if (enhanced.enterprise) {
            enhanced.enterprise = this.enrichEnterpriseData(enhanced.enterprise);
        }

        // Parse les publications depuis les commentaires si nécessaire
        if (!enhanced.publications || enhanced.publications.length === 0) {
            enhanced.publications = await this.extractPublicationsFromComments(enhanced);
        }

        // Calcule les totaux
        enhanced.totals = this.calculateDocumentTotals(enhanced.publications);

        // Ajoute les informations de paiement
        enhanced.paymentInfo = this.generatePaymentInfo(documentType, enhanced.totals);

        return enhanced;
    }

    // Enrichit les données d'entreprise
    enrichEnterpriseData(enterprise) {
        return {
            ...enterprise,
            formatted: {
                name: enterprise.nom || 'Entreprise non spécifiée',
                fullAddress: this.formatFullAddress(enterprise),
                contactInfo: this.formatContactInfo(enterprise),
                businessInfo: this.formatBusinessInfo(enterprise)
            }
        };
    }

    // Formate l'adresse complète
    formatFullAddress(enterprise) {
        const parts = [];
        if (enterprise.adresse) parts.push(enterprise.adresse);
        if (enterprise.code_postal) parts.push(enterprise.code_postal);
        if (enterprise.ville) parts.push(enterprise.ville);
        return parts.join(', ') || 'Adresse non spécifiée';
    }

    // Formate les informations de contact
    formatContactInfo(enterprise) {
        const contact = {};
        if (enterprise.telephone) contact.phone = enterprise.telephone;
        if (enterprise.email) contact.email = enterprise.email;
        return contact;
    }

    // Formate les informations business
    formatBusinessInfo(enterprise) {
        return {
            sector: enterprise.secteur_activite || 'Non spécifié',
            clientSince: enterprise.date_creation ? new Date(enterprise.date_creation).getFullYear() : null,
            notes: enterprise.commentaires || ''
        };
    }

    // Extrait les publications depuis les commentaires
    async extractPublicationsFromComments(qualificationData) {
        const publications = [];
        
        if (!qualificationData.enterprise?.commentaires) {
            return publications;
        }

        // Parse les commentaires pour extraire les publications
        const comments = qualificationData.enterprise.commentaires;
        const parsedPublications = this.parsePublicationsFromComments(
            comments,
            qualificationData.mois_parution || 'Non spécifié',
            qualificationData.prix_total || 0,
            qualificationData.format_principal || '1/4 page'
        );

        return parsedPublications;
    }

    // Parse les publications depuis les commentaires avec regex avancées
    parsePublicationsFromComments(commentaires, moisParution, prixTotal, formatPrincipal) {
        const publications = [];
        
        // Patterns pour détecter les publications
        const patterns = {
            // "3 x 1/4 page janvier février mars"
            multipleMonths: /(\d+)\s*x?\s*(1\/[2-6]\s*page|1\s*page|couverture|dos\s*de\s*couverture)\s*[:\s]*([a-zûé\s,]+)/gi,
            
            // "1/4 page janvier, 1/2 page février"
            individual: /(1\/[2-6]\s*page|1\s*page|couverture|dos\s*de\s*couverture)\s*([a-zûé]+)/gi,
            
            // "janvier février mars" (format unique)
            monthsList: /([a-zûé]+(?:\s*,?\s*[a-zûé]+)*)/gi
        };

        // Essaie d'abord le pattern multiple
        let match = patterns.multipleMonths.exec(commentaires);
        if (match) {
            const count = parseInt(match[1]);
            const format = match[2].trim();
            const monthsText = match[3];
            const months = this.extractMonthsFromText(monthsText);
            
            months.slice(0, count).forEach(month => {
                publications.push({
                    mois: month,
                    format: format,
                    prix: this.getBasePriceByFormat(format)
                });
            });
        } else {
            // Essaie le pattern individuel
            const individualMatches = [...commentaires.matchAll(patterns.individual)];
            individualMatches.forEach(match => {
                const format = match[1].trim();
                const month = this.normalizeMonth(match[2]);
                
                if (month) {
                    publications.push({
                        mois: month,
                        format: format,
                        prix: this.getBasePriceByFormat(format)
                    });
                }
            });
        }

        // Si aucune publication trouvée, crée une par défaut
        if (publications.length === 0 && prixTotal > 0) {
            publications.push({
                mois: moisParution,
                format: formatPrincipal,
                prix: prixTotal
            });
        }

        return publications;
    }

    // Extrait les mois depuis un texte
    extractMonthsFromText(text) {
        const monthMappings = {
            'janvier': 'Janvier', 'jan': 'Janvier',
            'février': 'Février', 'fév': 'Février', 'fevrier': 'Février',
            'mars': 'Mars', 'mar': 'Mars',
            'avril': 'Avril', 'avr': 'Avril',
            'mai': 'Mai',
            'juin': 'Juin', 'jun': 'Juin',
            'juillet': 'Juillet', 'juil': 'Juillet',
            'août': 'Août', 'aout': 'Août',
            'septembre': 'Septembre', 'sep': 'Septembre', 'sept': 'Septembre',
            'octobre': 'Octobre', 'oct': 'Octobre',
            'novembre': 'Novembre', 'nov': 'Novembre',
            'décembre': 'Décembre', 'déc': 'Décembre', 'decembre': 'Décembre', 'dec': 'Décembre'
        };

        const months = [];
        const words = text.toLowerCase().split(/[\s,]+/);
        
        words.forEach(word => {
            const cleanWord = word.trim();
            if (monthMappings[cleanWord]) {
                months.push(monthMappings[cleanWord]);
            }
        });

        return months;
    }

    // Normalise un nom de mois
    normalizeMonth(month) {
        return this.extractMonthsFromText(month)[0] || null;
    }

    // Obtient le prix de base par format (copie de la fonction utilitaire)
    getBasePriceByFormat(format) {
        const basePrices = {
            '1/6 page': 135,
            '1/4 page': 175,
            '1/3 page': 195,
            '1/2 page': 240,
            '1 page': 380,
            'Dos de couverture': 450,
            'Couverture': 520
        };
        
        return basePrices[format] || 175; // Par défaut 1/4 page
    }

    // Analyse les publications
    async analyzePublications(qualificationData) {
        const publications = qualificationData.publications || [];
        
        return {
            totalCount: publications.length,
            formatAnalysis: this.analyzeFormats(publications),
            monthAnalysis: this.analyzeMonths(publications),
            priceAnalysis: this.analyzePrices(publications),
            recommendations: this.generateRecommendations(publications)
        };
    }

    // Analyse les formats utilisés
    analyzeFormats(publications) {
        const formatCounts = {};
        publications.forEach(pub => {
            const format = pub.format || 'Non spécifié';
            formatCounts[format] = (formatCounts[format] || 0) + 1;
        });

        const mostUsed = findMostUsedFormat(publications);
        
        return {
            breakdown: formatCounts,
            mostUsed,
            diversity: Object.keys(formatCounts).length
        };
    }

    // Analyse les mois utilisés
    analyzeMonths(publications) {
        const monthCounts = {};
        const seasons = { hiver: 0, printemps: 0, été: 0, automne: 0 };
        
        const seasonMapping = {
            'Décembre': 'hiver', 'Janvier': 'hiver', 'Février': 'hiver',
            'Mars': 'printemps', 'Avril': 'printemps', 'Mai': 'printemps',
            'Juin': 'été', 'Juillet': 'été', 'Août': 'été',
            'Septembre': 'automne', 'Octobre': 'automne', 'Novembre': 'automne'
        };

        publications.forEach(pub => {
            const month = pub.mois || 'Non spécifié';
            monthCounts[month] = (monthCounts[month] || 0) + 1;
            
            const season = seasonMapping[month];
            if (season) seasons[season]++;
        });

        return {
            breakdown: monthCounts,
            seasonalBreakdown: seasons,
            span: Object.keys(monthCounts).length
        };
    }

    // Analyse les prix
    analyzePrices(publications) {
        const prices = publications.map(pub => pub.prix || 0);
        const total = calculateTotalPrice(publications);
        const average = prices.length > 0 ? total / prices.length : 0;
        const min = Math.min(...prices);
        const max = Math.max(...prices);

        return {
            total,
            average,
            min,
            max,
            distribution: this.calculatePriceDistribution(prices)
        };
    }

    // Calcule la distribution des prix
    calculatePriceDistribution(prices) {
        const ranges = {
            'Économique (< 150€)': 0,
            'Standard (150-250€)': 0,
            'Premium (250-400€)': 0,
            'Prestige (> 400€)': 0
        };

        prices.forEach(price => {
            if (price < 150) ranges['Économique (< 150€)']++;
            else if (price < 250) ranges['Standard (150-250€)']++;
            else if (price < 400) ranges['Premium (250-400€)']++;
            else ranges['Prestige (> 400€)']++;
        });

        return ranges;
    }

    // Génère des recommandations
    generateRecommendations(publications) {
        const recommendations = [];
        
        if (publications.length >= 6) {
            recommendations.push({
                type: 'discount',
                message: 'Pack semestriel/annuel recommandé pour optimiser les coûts',
                icon: '💰'
            });
        }

        if (publications.length === 1) {
            recommendations.push({
                type: 'upsell',
                message: 'Parutions multiples recommandées pour un meilleur impact',
                icon: '📈'
            });
        }

        const formats = [...new Set(publications.map(p => p.format))];
        if (formats.length > 3) {
            recommendations.push({
                type: 'consistency',
                message: 'Uniformiser les formats pour une meilleure cohérence',
                icon: '🎯'
            });
        }

        return recommendations;
    }

    // Calcule les totaux du document
    calculateDocumentTotals(publications) {
        const totalHT = calculateTotalPrice(publications);
        const tvaRate = 0.20;
        const totalTVA = totalHT * tvaRate;
        const totalTTC = totalHT + totalTVA;

        return {
            totalHT,
            totalTVA,
            totalTTC,
            tvaRate,
            publicationsCount: publications.length
        };
    }

    // Génère les informations de paiement
    generatePaymentInfo(documentType, totals) {
        const paymentInfo = {
            method: 'Virement bancaire',
            terms: '30 jours net',
            dueDate: this.calculateDueDate(30),
            currency: 'EUR'
        };

        // Conditions spéciales selon le type de document
        switch (documentType) {
            case 'facture':
                paymentInfo.paymentRequired = true;
                paymentInfo.lateFees = '3% par mois de retard';
                break;
            case 'bon_commande':
                paymentInfo.paymentRequired = false;
                paymentInfo.terms = 'À la livraison';
                break;
            case 'devis':
                paymentInfo.paymentRequired = false;
                paymentInfo.terms = 'Selon acceptation';
                paymentInfo.validUntil = this.calculateDueDate(30);
                break;
        }

        return paymentInfo;
    }

    // Calcule la date d'échéance
    calculateDueDate(daysFromNow) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString();
    }

    // Génère le document avec l'analyse
    async generateDocumentWithAnalysis(enhancedData, analysisResult, documentType, options = {}) {
        // Prépare les données finales pour la génération
        const finalData = {
            ...enhancedData,
            analysis: analysisResult,
            generation: {
                timestamp: new Date().toISOString(),
                version: '2.0',
                enhanced: true
            },
            options
        };

        // Génère la description enrichie des publications
        finalData.publicationsDescription = generateMultiPublicationsDescription(finalData.publications);

        // Appelle le service de génération selon le type
        let result;
        switch (documentType) {
            case 'facture':
                result = await documentService.generateInvoice(finalData);
                break;
            case 'bon_commande':
                result = await documentService.generatePurchaseOrder(finalData);
                break;
            case 'devis':
                result = await documentService.generateQuote(finalData);
                break;
            default:
                result = await documentService.generatePdf(finalData, documentType);
        }

        // Enrichit le résultat avec les métadonnées
        if (result.success) {
            result.metadata = {
                enhancedData: true,
                analysisIncluded: true,
                publicationsCount: finalData.publications.length,
                totalAmount: finalData.totals.totalTTC,
                generationTime: new Date().toISOString()
            };
        }

        return result;
    }

    // Sauvegarde dans l'historique
    saveGenerationHistory(documentResult, enhancedData, documentType) {
        const historyEntry = {
            id: enhancedData.documentInfo.number,
            type: documentType,
            enterprise: enhancedData.enterprise.formatted.name,
            amount: enhancedData.totals.totalTTC,
            publicationsCount: enhancedData.publications.length,
            generatedAt: enhancedData.documentInfo.generatedAt,
            success: documentResult.success,
            url: documentResult.data?.url || null
        };

        this.generationHistory.unshift(historyEntry);
        
        // Limite l'historique
        if (this.generationHistory.length > 100) {
            this.generationHistory = this.generationHistory.slice(0, 100);
        }
    }

    // Génère un document en lots
    async generateBatchDocuments(qualifications, documentType, options = {}) {
        const results = [];
        const batchSize = options.batchSize || 5;
        
        for (let i = 0; i < qualifications.length; i += batchSize) {
            const batch = qualifications.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (qualification, index) => {
                try {
                    updateStatus(`📄 Génération ${i + index + 1}/${qualifications.length}...`);
                    return await this.generateIntelligentDocument(qualification, documentType, options);
                } catch (error) {
                    return { success: false, error: error.message, qualification };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Pause entre les lots
            if (i + batchSize < qualifications.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return {
            success: true,
            totalGenerated: results.filter(r => r.success).length,
            totalFailed: results.filter(r => !r.success).length,
            results
        };
    }

    // Prévisualise un document avant génération
    async previewDocument(qualificationData, documentType) {
        const enhancedData = await this.enhanceQualificationData(qualificationData, documentType);
        const analysisResult = await this.analyzePublications(enhancedData);
        
        return {
            enhancedData,
            analysis: analysisResult,
            preview: {
                title: `${documentType.toUpperCase()} - ${enhancedData.enterprise.formatted.name}`,
                publicationsCount: enhancedData.publications.length,
                totalAmount: enhancedData.totals.totalTTC,
                estimatedGenerationTime: '~30 secondes'
            }
        };
    }

    // Obtient l'historique de génération
    getGenerationHistory() {
        return [...this.generationHistory];
    }

    // Obtient les statistiques de génération
    getGenerationStats() {
        const total = this.generationHistory.length;
        const successful = this.generationHistory.filter(h => h.success).length;
        const byType = {};
        
        this.generationHistory.forEach(entry => {
            byType[entry.type] = (byType[entry.type] || 0) + 1;
        });

        return {
            total,
            successful,
            successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
            byType,
            lastGeneration: this.generationHistory[0]?.generatedAt || null
        };
    }

    // Nettoie l'historique
    clearHistory() {
        this.generationHistory = [];
    }

    // Vérifie si une génération est en cours
    isCurrentlyGenerating() {
        return this.isGenerating;
    }
}

// Instance singleton
export const documentGenerationManager = new DocumentGenerationManager();

// Utilitaires pour la génération de documents
export const DocumentGenerationUtils = {
    // Valide les données avant génération
    validateGenerationData(qualificationData, documentType) {
        const errors = [];
        
        if (!qualificationData.enterprise?.nom) {
            errors.push('Nom d\'entreprise manquant');
        }
        
        if (!qualificationData.publications || qualificationData.publications.length === 0) {
            errors.push('Aucune publication spécifiée');
        }
        
        if (documentType === 'facture' && !qualificationData.enterprise?.adresse) {
            errors.push('Adresse requise pour les factures');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    },

    // Estime le temps de génération
    estimateGenerationTime(qualificationData) {
        const baseTime = 15; // 15 secondes de base
        const perPublication = 3; // 3 secondes par publication
        const publicationsCount = qualificationData.publications?.length || 0;
        
        return baseTime + (publicationsCount * perPublication);
    },

    // Formate les métadonnées de génération
    formatGenerationMetadata(metadata) {
        return {
            enhanced: metadata.enhancedData ? '✅' : '❌',
            analysis: metadata.analysisIncluded ? '✅' : '❌',
            publications: metadata.publicationsCount,
            amount: `${metadata.totalAmount}€`,
            time: new Date(metadata.generationTime).toLocaleString('fr-FR')
        };
    }
};

export default documentGenerationManager;