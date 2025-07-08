import { analyzeClientType } from '../utils/validators.js';
import { generateAutoComment } from '../utils/formatters.js';
import { addReadOnlyIndicator, highlightPreSelected } from '../utils/dom.js';
import { showAutoFillStatus } from '../utils/ui.js';

// Gestionnaire d'auto-remplissage intelligent
class AutoFillManager {
    constructor() {
        this.autoFillEnabled = true;
        this.filledFields = new Set();
        this.fillHistory = [];
        this.fillRules = this.initializeFillRules();
    }

    // Initialise les règles d'auto-remplissage
    initializeFillRules() {
        return {
            // Règles pour les champs d'entreprise
            enterprise: {
                nom: { confidence: 0.9, source: 'database' },
                adresse: { confidence: 0.8, source: 'database' },
                ville: { confidence: 0.8, source: 'database' },
                code_postal: { confidence: 0.7, source: 'database' },
                telephone: { confidence: 0.8, source: 'database' },
                email: { confidence: 0.7, source: 'database' },
                secteur_activite: { confidence: 0.6, source: 'inference' }
            },
            
            // Règles pour les qualifications
            qualification: {
                commentaires: { confidence: 0.7, source: 'ai_generated' },
                statut_prospect: { confidence: 0.8, source: 'client_analysis' },
                prochaine_action: { confidence: 0.6, source: 'workflow' },
                format_recommande: { confidence: 0.8, source: 'history_analysis' }
            },
            
            // Règles pour les publications
            publications: {
                format: { confidence: 0.7, source: 'history_preference' },
                mois_preferes: { confidence: 0.6, source: 'seasonal_analysis' },
                prix_negocie: { confidence: 0.5, source: 'loyalty_discount' }
            }
        };
    }

    // Auto-remplit un formulaire d'entreprise
    async autoFillEnterpriseForm(enterprise) {
        if (!enterprise || !this.autoFillEnabled) return;

        showAutoFillStatus('🔄 Auto-remplissage en cours...');
        this.filledFields.clear();

        try {
            // Remplit les champs de base
            this.fillBasicEnterpriseFields(enterprise);
            
            // Analyse et remplit les champs intelligents
            await this.fillIntelligentEnterpriseFields(enterprise);
            
            showAutoFillStatus(`✅ ${this.filledFields.size} champs remplis automatiquement`);
        } catch (error) {
            console.error('Erreur lors de l\'auto-remplissage:', error);
            showAutoFillStatus('❌ Erreur lors de l\'auto-remplissage');
        }
    }

    // Remplit les champs de base de l'entreprise
    fillBasicEnterpriseFields(enterprise) {
        const fieldMappings = {
            nom: enterprise.nom || enterprise.name,
            adresse: enterprise.adresse || enterprise.address,
            ville: enterprise.ville || enterprise.city,
            code_postal: enterprise.code_postal || enterprise.postal_code,
            telephone: enterprise.telephone || enterprise.phone,
            email: enterprise.email,
            secteur_activite: enterprise.secteur_activite || enterprise.sector
        };

        Object.entries(fieldMappings).forEach(([fieldName, value]) => {
            if (value) {
                this.fillField(fieldName, value, 'database', 0.9);
            }
        });
    }

    // Remplit les champs intelligents de l'entreprise
    async fillIntelligentEnterpriseFields(enterprise) {
        // Analyse du secteur d'activité si manquant
        if (!enterprise.secteur_activite && enterprise.nom) {
            const inferredSector = this.inferBusinessSector(enterprise.nom, enterprise.commentaires);
            if (inferredSector) {
                this.fillField('secteur_activite', inferredSector, 'inference', 0.6);
            }
        }

        // Commentaires automatiques si manquants
        if (!enterprise.commentaires) {
            const autoComment = generateAutoComment(enterprise);
            if (autoComment) {
                this.fillField('commentaires', autoComment, 'ai_generated', 0.7);
            }
        }
    }

    // Auto-remplit un formulaire de qualification
    async autoFillQualificationForm(enterprise, actionType = 'qualification') {
        if (!enterprise || !this.autoFillEnabled) return;

        showAutoFillStatus('🔄 Auto-remplissage qualification...');
        this.filledFields.clear();

        try {
            // Analyse du client
            const clientAnalysis = analyzeClientType(enterprise);
            
            // Remplit selon l'analyse
            await this.fillQualificationByAnalysis(enterprise, clientAnalysis, actionType);
            
            // Pré-sélections intelligentes
            await this.fillSmartSelections(enterprise, clientAnalysis);
            
            showAutoFillStatus(`✅ Qualification pré-remplie (${this.filledFields.size} éléments)`);
        } catch (error) {
            console.error('Erreur lors de l\'auto-remplissage qualification:', error);
            showAutoFillStatus('❌ Erreur lors de l\'auto-remplissage');
        }
    }

    // Remplit la qualification selon l'analyse client
    async fillQualificationByAnalysis(enterprise, clientAnalysis, actionType) {
        // Commentaires de qualification intelligents
        const qualificationComment = this.generateQualificationComment(enterprise, clientAnalysis, actionType);
        this.fillField('qualification_comments', qualificationComment, 'ai_generated', 0.8);

        // Statut du prospect selon l'analyse
        const prospectStatus = this.determineProspectStatus(clientAnalysis);
        this.fillField('prospect_status', prospectStatus, 'client_analysis', 0.8);

        // Prochaine action recommandée
        const nextAction = this.recommendNextAction(clientAnalysis, actionType);
        this.fillField('next_action', nextAction, 'workflow', 0.7);
    }

    // Remplit les sélections intelligentes
    async fillSmartSelections(enterprise, clientAnalysis) {
        // Format recommandé basé sur l'historique
        const recommendedFormat = this.recommendFormat(enterprise, clientAnalysis);
        if (recommendedFormat) {
            this.preSelectFormat(recommendedFormat);
        }

        // Mois préférés selon l'historique ou le secteur
        const preferredMonths = this.analyzePreferredMonths(enterprise);
        if (preferredMonths.length > 0) {
            this.preSelectMonths(preferredMonths);
        }
    }

    // Génère un commentaire de qualification intelligent
    generateQualificationComment(enterprise, clientAnalysis, actionType) {
        const comments = [];
        
        // Ajoute le type de client
        if (clientAnalysis.type === 'renouvellement') {
            comments.push(`🔄 Client en renouvellement (confiance: ${Math.round(clientAnalysis.confidence * 100)}%)`);
        } else if (clientAnalysis.type === 'nouveau') {
            comments.push(`🆕 Nouveau prospect (confiance: ${Math.round(clientAnalysis.confidence * 100)}%)`);
        }

        // Ajoute des informations sur l'historique
        if (clientAnalysis.details?.historical_years > 0) {
            comments.push(`📅 Présent depuis ${clientAnalysis.details.historical_years} an(s)`);
        }

        // Ajoute des recommandations selon l'action
        switch (actionType) {
            case 'facture':
                comments.push('💼 Génération de facture - Vérifier les conditions de paiement');
                break;
            case 'bon_commande':
                comments.push('📋 Bon de commande - Confirmer les spécifications');
                break;
            case 'qualification':
                comments.push('🎯 Qualification en cours - Évaluer le potentiel commercial');
                break;
        }

        return comments.join(' • ');
    }

    // Détermine le statut du prospect
    determineProspectStatus(clientAnalysis) {
        if (clientAnalysis.type === 'renouvellement' && clientAnalysis.confidence > 0.8) {
            return 'very_interested';
        } else if (clientAnalysis.type === 'renouvellement') {
            return 'interested';
        } else if (clientAnalysis.type === 'nouveau') {
            return 'hesitant';
        }
        return 'interested';
    }

    // Recommande la prochaine action
    recommendNextAction(clientAnalysis, actionType) {
        if (actionType === 'facture') {
            return 'send_quote';
        } else if (actionType === 'bon_commande') {
            return 'schedule_meeting';
        } else if (clientAnalysis.type === 'renouvellement') {
            return 'send_quote';
        } else {
            return 'send_info';
        }
    }

    // Recommande un format basé sur l'historique
    recommendFormat(enterprise, clientAnalysis) {
        // Analyse des commentaires pour détecter des préférences
        const commentaires = enterprise.commentaires || '';
        
        if (commentaires.includes('1/2 page') || commentaires.includes('demi-page')) {
            return '1/2 page';
        } else if (commentaires.includes('1/4 page') || commentaires.includes('quart')) {
            return '1/4 page';
        } else if (commentaires.includes('couverture')) {
            return 'Couverture';
        } else if (commentaires.includes('page entière') || commentaires.includes('1 page')) {
            return '1 page';
        }

        // Format par défaut selon le type de client
        if (clientAnalysis.type === 'renouvellement') {
            return '1/4 page'; // Format standard pour renouvellements
        } else {
            return '1/6 page'; // Format économique pour nouveaux clients
        }
    }

    // Analyse les mois préférés
    analyzePreferredMonths(enterprise) {
        const preferredMonths = [];
        const commentaires = (enterprise.commentaires || '').toLowerCase();
        
        // Recherche de mentions de mois dans les commentaires
        const monthMentions = {
            'janvier': 'Janvier', 'février': 'Février', 'mars': 'Mars',
            'avril': 'Avril', 'mai': 'Mai', 'juin': 'Juin',
            'juillet': 'Juillet', 'août': 'Août', 'septembre': 'Septembre',
            'octobre': 'Octobre', 'novembre': 'Novembre', 'décembre': 'Décembre'
        };

        Object.entries(monthMentions).forEach(([searchTerm, monthName]) => {
            if (commentaires.includes(searchTerm)) {
                preferredMonths.push(monthName);
            }
        });

        // Si aucune préférence trouvée, recommande selon le secteur
        if (preferredMonths.length === 0) {
            const sectorPreferences = this.getSectorMonthPreferences(enterprise.secteur_activite);
            preferredMonths.push(...sectorPreferences);
        }

        return preferredMonths.slice(0, 3); // Maximum 3 mois
    }

    // Obtient les préférences de mois par secteur
    getSectorMonthPreferences(sector) {
        const sectorMappings = {
            'commerce': ['Novembre', 'Décembre', 'Janvier'], // Période des fêtes
            'agriculture': ['Mars', 'Avril', 'Mai'], // Printemps
            'tourisme': ['Juin', 'Juillet', 'Août'], // Été
            'education': ['Septembre', 'Octobre'], // Rentrée
            'sante': ['Janvier', 'Février'], // Début d'année
            'services': ['Septembre', 'Octobre', 'Novembre'] // Fin d'année
        };

        return sectorMappings[sector] || ['Septembre', 'Octobre']; // Par défaut
    }

    // Remplit un champ avec indication visuelle
    fillField(fieldName, value, source, confidence) {
        const field = document.getElementById(fieldName);
        if (!field || field.value) return; // Ne surécrit pas les valeurs existantes

        field.value = value;
        this.filledFields.add(fieldName);

        // Ajoute une indication visuelle selon la confiance
        if (confidence >= 0.8) {
            highlightPreSelected(field, `✨ Pré-sélectionné automatiquement (${source})`);
        } else if (confidence >= 0.6) {
            highlightPreSelected(field, `💡 Suggestion automatique (${source})`);
        } else {
            highlightPreSelected(field, `🤔 Proposition à vérifier (${source})`);
        }

        // Enregistre dans l'historique
        this.fillHistory.push({
            fieldName,
            value,
            source,
            confidence,
            timestamp: new Date().toISOString()
        });
    }

    // Pré-sélectionne un format
    preSelectFormat(format) {
        const formatRadio = document.querySelector(`input[name="selectedFormat"][value="${format}"]`);
        if (formatRadio && !formatRadio.checked) {
            formatRadio.checked = true;
            this.filledFields.add('selectedFormat');
            
            highlightPreSelected(formatRadio.parentElement, `✨ Format recommandé: ${format}`);
            
            // Déclenche l'événement de changement pour mettre à jour les prix
            formatRadio.dispatchEvent(new Event('change'));
        }
    }

    // Pré-sélectionne des mois
    preSelectMonths(months) {
        months.forEach(month => {
            const monthId = month.toLowerCase().replace(/[^a-z]/g, '');
            const checkbox = document.getElementById(`month_${monthId}`);
            
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                this.filledFields.add(`month_${monthId}`);
                
                highlightPreSelected(checkbox.parentElement, `💡 Mois recommandé`);
                
                // Déclenche l'événement de changement
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    }

    // Infère le secteur d'activité
    inferBusinessSector(businessName, comments = '') {
        const text = (businessName + ' ' + comments).toLowerCase();
        
        const sectorKeywords = {
            'commerce': ['boutique', 'magasin', 'commerce', 'vente', 'retail'],
            'industrie': ['usine', 'fabrication', 'production', 'industrie', 'manufacture'],
            'services': ['service', 'conseil', 'consulting', 'assistance', 'support'],
            'artisanat': ['artisan', 'atelier', 'création', 'fait main', 'artisanal'],
            'agriculture': ['agricole', 'ferme', 'élevage', 'culture', 'exploitation'],
            'sante': ['médical', 'santé', 'clinique', 'cabinet', 'pharmaceutique'],
            'education': ['école', 'formation', 'enseignement', 'éducation', 'cours']
        };

        for (const [sector, keywords] of Object.entries(sectorKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return sector;
            }
        }

        return 'services'; // Par défaut
    }

    // Active/désactive l'auto-remplissage
    setAutoFillEnabled(enabled) {
        this.autoFillEnabled = enabled;
        showAutoFillStatus(enabled ? '✅ Auto-remplissage activé' : '❌ Auto-remplissage désactivé');
    }

    // Vérifie si l'auto-remplissage est activé
    isAutoFillEnabled() {
        return this.autoFillEnabled;
    }

    // Obtient les champs remplis automatiquement
    getFilledFields() {
        return Array.from(this.filledFields);
    }

    // Obtient l'historique des remplissages
    getFillHistory() {
        return [...this.fillHistory];
    }

    // Annule le dernier auto-remplissage
    undoLastFill() {
        if (this.fillHistory.length === 0) return;

        const lastFill = this.fillHistory.pop();
        const field = document.getElementById(lastFill.fieldName);
        
        if (field) {
            field.value = '';
            this.filledFields.delete(lastFill.fieldName);
            
            // Supprime les indicateurs visuels
            const indicators = field.parentElement.querySelectorAll('.preselected-highlight');
            indicators.forEach(indicator => indicator.remove());
        }

        showAutoFillStatus('↩️ Dernier auto-remplissage annulé');
    }

    // Efface tous les auto-remplissages
    clearAllAutoFills() {
        this.filledFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field) {
                field.value = '';
                
                // Supprime les indicateurs visuels
                const indicators = field.parentElement.querySelectorAll('.preselected-highlight');
                indicators.forEach(indicator => indicator.remove());
            }
        });

        this.filledFields.clear();
        this.fillHistory = [];
        showAutoFillStatus('🧹 Tous les auto-remplissages effacés');
    }

    // Crée l'interface de contrôle de l'auto-remplissage
    createAutoFillControls() {
        return `
            <div class="autofill-controls">
                <div class="autofill-header">
                    <h4>🤖 Auto-remplissage intelligent</h4>
                    <label class="toggle-switch">
                        <input type="checkbox" ${this.autoFillEnabled ? 'checked' : ''} 
                               onchange="window.autoFillManager.setAutoFillEnabled(this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                
                <div class="autofill-stats">
                    <span>${this.filledFields.size} champs remplis automatiquement</span>
                </div>
                
                <div class="autofill-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.autoFillManager.undoLastFill()">
                        ↩️ Annuler dernier
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.autoFillManager.clearAllAutoFills()">
                        🧹 Tout effacer
                    </button>
                </div>
            </div>
        `;
    }

    // Réinitialise le gestionnaire
    reset() {
        this.filledFields.clear();
        this.fillHistory = [];
    }
}

// Instance singleton
export const autoFillManager = new AutoFillManager();

// Expose globalement pour les événements onclick
window.autoFillManager = autoFillManager;

// Utilitaires pour l'auto-remplissage
export const AutoFillUtils = {
    // Calcule un score de confiance global
    calculateOverallConfidence(fillHistory) {
        if (fillHistory.length === 0) return 0;
        
        const totalConfidence = fillHistory.reduce((sum, fill) => sum + fill.confidence, 0);
        return totalConfidence / fillHistory.length;
    },

    // Génère un rapport d'auto-remplissage
    generateAutoFillReport(fillHistory) {
        const sourceStats = {};
        fillHistory.forEach(fill => {
            sourceStats[fill.source] = (sourceStats[fill.source] || 0) + 1;
        });

        return {
            totalFills: fillHistory.length,
            averageConfidence: AutoFillUtils.calculateOverallConfidence(fillHistory),
            sourceBreakdown: sourceStats,
            lastFillTime: fillHistory.length > 0 ? fillHistory[fillHistory.length - 1].timestamp : null
        };
    },

    // Valide la qualité d'un auto-remplissage
    validateAutoFillQuality(fillHistory, requiredConfidence = 0.7) {
        const lowConfidenceFills = fillHistory.filter(fill => fill.confidence < requiredConfidence);
        
        return {
            isValid: lowConfidenceFills.length === 0,
            lowConfidenceFields: lowConfidenceFills.map(fill => fill.fieldName),
            averageConfidence: AutoFillUtils.calculateOverallConfidence(fillHistory)
        };
    }
};

export default autoFillManager;