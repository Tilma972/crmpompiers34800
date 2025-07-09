import { apiService, ApiUtils } from './api.js';
import { enterpriseCache, CacheUtils } from '../utils/cache.js';
import { validateEnterpriseName, validateEmail, validatePhoneNumber } from '../utils/validators.js';

// ==========================================
// 🔧 CONSTANTES D'ENDPOINTS
// ==========================================
const ENDPOINTS = {
    SEARCH: 'RECHERCHE_ENTREPRISE',    // Pour toute recherche
    ACTIONS: 'GATEWAY_ENTITIES'        // Pour toute action CRUD
};

// Service pour la gestion des entreprises - VERSION RESTRUCTURÉE
class EnterpriseService {
    constructor() {
        this.cache = enterpriseCache;
    }

    // ==========================================
    // 🔍 FONCTIONS DE RECHERCHE
    // Endpoint: RECHERCHE_ENTREPRISE
    // ==========================================
    
    // ✅ CORRECTION : Recherche avec endpoint unifié
    async searchEnterprises(query, options = {}) {
        if (!query || query.trim().length < 2) {
            return { success: false, error: 'Requête trop courte' };
        }

        const cacheKey = CacheUtils.generateSearchKey(query, 'enterprises');
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult && !options.forceRefresh) {
            return { success: true, data: cachedResult };
        }

        // ✅ CORRECTION : Format compatible avec workflow n8n
        const searchData = {
            operation: "getMany",
            search: query.trim(),
            limit: options.limit || 10
        };

        // 🔍 AJOUT DE LOGS DE DIAGNOSTIC
        console.log('🔍 [enterpriseService] Endpoint appelé:', ENDPOINTS.SEARCH);
        console.log('🔍 [enterpriseService] Data envoyée:', JSON.stringify(searchData));
        
        const response = await apiService.callWebhook(ENDPOINTS.SEARCH, searchData);
        
        console.log('🔍 [enterpriseService] Réponse reçue:', response);
        
        // ✅ CORRIGÉ : Validation du payload avant mise en cache
        if (response.success && response.data && Array.isArray(response.data)) {
            this.cache.set(cacheKey, response.data);
            console.log('✅ Cache mis à jour:', response.data.length, 'entreprises');
        } else if (response.success) {
            console.warn('⚠️ Réponse success mais data invalide:', response.data);
        }

        return response;
    }

    // ✅ CORRECTION : Recherche par ID avec endpoint unifié
    async getEnterpriseById(id) {
        if (!id) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const cacheKey = CacheUtils.generateEnterpriseKey(id);
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult) {
            return { success: true, data: cachedResult };
        }

        // ✅ CORRECTION : Format compatible
        const searchData = {
            operation: "get",
            id: id
        };

        const response = await apiService.callWebhook(ENDPOINTS.SEARCH, searchData);
        
        if (response.success) {
            this.cache.set(cacheKey, response.data);
        }

        return response;
    }

    // ✅ CORRECTION : Version simplifiée et cohérente
    async smartSearch(query, options = {}) {
        console.log('🧠 SmartSearch appelée avec:', query, options);
        
        // Recherche unique via RECHERCHE_ENTREPRISE
        const results = await this.searchEnterprises(query, options);
        
        if (results.success && results.data && Array.isArray(results.data)) {
            const mappedData = results.data.map(enterprise => 
                this.mapFromBaserowFields(enterprise)
            );
            
            return {
                success: true,
                data: mappedData,
                source: 'enterprises'
            };
        }
        
        return {
            success: false,
            data: [],
            source: 'enterprises',
            error: results.error || 'Aucun résultat trouvé'
        };
    }

    // ==========================================
    // 🏗️ FONCTIONS D'ACTIONS CRUD
    // Endpoint: GATEWAY_ENTITIES
    // ==========================================
    
    // ✅ CORRIGÉ : Utiliser GATEWAY_ENTITIES
    async createEnterprise(enterpriseData) {
        const validation = this.validateEnterpriseData(enterpriseData);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        const requestData = {
            action: 'nouvelle_entreprise',
            data: {
                nom_entreprise: enterpriseData.nom_entreprise || enterpriseData.nom,
                commune: enterpriseData.commune,
                adresse: enterpriseData.adresse,
                telephone: enterpriseData.telephone,
                email: enterpriseData.email,
                interlocuteur: enterpriseData.interlocuteur || enterpriseData.contact
            }
        };

        const response = await apiService.callWebhook(ENDPOINTS.ACTIONS, requestData);
        
        // Invalide le cache des recherches
        if (response.success) {
            this.invalidateSearchCache(enterpriseData.nom_entreprise || enterpriseData.nom);
        }

        return response;
    }

    // ✅ CORRIGÉ : Mise à jour avec GATEWAY_ENTITIES
    async updateEnterprise(id, updateData) {
        if (!id) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const validation = this.validateEnterpriseData(updateData, false);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        const requestData = {
            action: 'modifier_entreprise',
            data: {
                id: id,
                ...updateData
            }
        };

        const response = await apiService.callWebhook(ENDPOINTS.ACTIONS, requestData);
        
        // Invalide le cache
        if (response.success) {
            this.cache.delete(CacheUtils.generateEnterpriseKey(id));
            this.invalidateSearchCache(updateData.nom_entreprise || updateData.nom);
        }

        return response;
    }

    // ✅ CORRIGÉ : Suppression avec GATEWAY_ENTITIES
    async deleteEnterprise(id) {
        if (!id) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const requestData = {
            action: 'supprimer_entreprise',
            data: {
                id: id
            }
        };

        const response = await apiService.callWebhook(ENDPOINTS.ACTIONS, requestData);
        
        // Invalide le cache
        if (response.success) {
            this.cache.delete(CacheUtils.generateEnterpriseKey(id));
        }

        return response;
    }

    // ==========================================
    // 🔄 FONCTIONS DE MAPPING
    // Compatibilité Baserow
    // ==========================================
    
    // ✅ NOUVEAU : Mapping vers champs Baserow réels
    mapToBaserowFields(inputData) {
        const baserowData = {};
        
        // Nom de l'entreprise
        if (inputData.nom) baserowData.nom_entreprise = inputData.nom;
        if (inputData.nom_entreprise) baserowData.nom_entreprise = inputData.nom_entreprise;
        
        // Adresse et localisation
        if (inputData.adresse) baserowData.Adresse = inputData.adresse;
        if (inputData.commune) baserowData.Commune = this.getCommuneId(inputData.commune);
        if (inputData.ville) baserowData.Commune = this.getCommuneId(inputData.ville);
        
        // Contact
        if (inputData.telephone) baserowData.Telephone = inputData.telephone;
        if (inputData.portable) baserowData.portable = inputData.portable;
        if (inputData.email) baserowData.email = inputData.email;
        if (inputData.interlocuteur) baserowData.interlocuteur = inputData.interlocuteur;
        if (inputData.contact) baserowData.interlocuteur = inputData.contact;
        
        // Activité
        if (inputData.activite) baserowData.Activitée = inputData.activite;
        if (inputData.secteur_activite) baserowData.Activitée = inputData.secteur_activite;
        
        return baserowData;
    }

    // ✅ CORRECTION : Mapping corrigé pour le payload réel
    mapFromBaserowFields(baserowData) {
        if (!baserowData) return null;

        console.log('🔄 Mapping Baserow data:', Object.keys(baserowData));

        return {
            id: baserowData.id,
            nom: baserowData.nom_entreprise || 'Nom non spécifié',
            nom_entreprise: baserowData.nom_entreprise || 'Nom non spécifié',
            
            // ✅ CORRIGÉ : Adresse directe du payload
            adresse: baserowData.adresse || '',
            
            // ✅ CORRIGÉ : Commune directe du payload (pas de conversion nécessaire)
            commune: baserowData.commune || '',
            ville: baserowData.commune || '', // Alias pour compatibilité
            
            // ✅ CORRIGÉ : Téléphone direct du payload
            telephone: baserowData.telephone || '',
            portable: baserowData.portable || '',
            email: baserowData.email || '',
            interlocuteur: baserowData.interlocuteur || '',
            
            // ✅ CORRIGÉ : Activité directe du payload (même si vide)
            activite: baserowData.activite || '',
            secteur_activite: baserowData.activite || '', // Alias
            
            // ✅ CORRIGÉ : Statut direct du payload
            statut: baserowData.statut || 'actif',
            
            // Champs workflow directs du payload
            format_encart_2025: baserowData.format_encart_2025 || '',
            mois_parution_2025: baserowData.mois_parution_2025 || '',
            client_2025: baserowData.client_2025 || '',
            prospecteur_2024: baserowData.prospecteur_2024 || '',
            
            // Champs calculés/virtuels
            code_postal: '', // Pas disponible dans le payload
            date_creation: baserowData.created_at || null,
            commentaires: baserowData.commentaires || ''
        };
    }

    // ✅ NOUVEAU : Conversion ID commune (selon votre mapping Baserow)
    getCommuneId(communeLabel) {
        const mapping = {
            'CLERMONT-L\'HÉRAULT': 2984030,
            'CANET': 2984031,
            'SAINT-FELIX-DE-LODEZ': 2984032,
            'CEYRAS': 2984033,
            'BRIGNAC': 2984034,
            'NEBIAN': 2984035,
            'NÉBIAN': 2984035,
            'PERET': 2984036,
            'SALASC': 2984037,
            'MOUREZE': 2984038,
            'CABRIERES': 2984039,
            'VILLENEUVETTE': 2984040,
            'OCTON': 2984041,
            'LE BOSC': 2984042,
            'VENDEMIAN': 2984044
        };
        
        return mapping[communeLabel?.toUpperCase()] || null;
    }

    // ✅ NOUVEAU : Conversion label commune
    getCommuneLabel(communeId) {
        const mapping = {
            2984030: 'CLERMONT-L\'HÉRAULT',
            2984031: 'CANET',
            2984032: 'SAINT-FELIX-DE-LODEZ',
            2984033: 'CEYRAS',
            2984034: 'BRIGNAC',
            2984035: 'NÉBIAN',
            2984036: 'PERET',
            2984037: 'SALASC',
            2984038: 'MOUREZE',
            2984039: 'CABRIERES',
            2984040: 'VILLENEUVETTE',
            2984041: 'OCTON',
            2984042: 'LE BOSC',
            2984044: 'VENDEMIAN'
        };
        
        return mapping[communeId] || '';
    }

    // ==========================================
    // 🔧 FONCTIONS UTILITAIRES
    // ==========================================

    // ✅ CORRECTION : Validation avec champs Baserow
    validateEnterpriseData(data, required = true) {
        const errors = [];
        
        if (required) {
            const nom = data.nom_entreprise || data.nom;
            if (!nom || !validateEnterpriseName(nom)) {
                errors.push('Nom d\'entreprise invalide');
            }
        }

        const email = data.email;
        if (email && !validateEmail(email)) {
            errors.push('Email invalide');
        }

        const telephone = data.telephone || data.Telephone;
        if (telephone && !validatePhoneNumber(telephone)) {
            errors.push('Numéro de téléphone invalide');
        }

        // Validation commune si fournie
        if (data.commune && !this.getCommuneId(data.commune)) {
            errors.push('Commune non reconnue');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // ✅ CORRECTION : Formatage pour affichage avec mapping
    formatEnterpriseForDisplay(enterprise) {
        if (!enterprise) return null;

        // Applique le mapping Baserow -> Standard
        return this.mapFromBaserowFields(enterprise);
    }

    // ✅ CORRECTION : Invalidation cache avec bon nom
    invalidateSearchCache(nom) {
        if (!nom) return;
        
        // Invalide les recherches similaires
        const searchTerms = [
            nom.toLowerCase(),
            nom.toLowerCase().substring(0, 3),
            nom.toLowerCase().split(' ')[0]
        ];

        searchTerms.forEach(term => {
            const cacheKey = CacheUtils.generateSearchKey(term, 'enterprises');
            this.cache.delete(cacheKey);
        });
    }

    // ✅ CORRECTION : Stats avec endpoint unifié
    async getEnterpriseStats() {
        const requestData = {
            operation: "stats"
        };

        return apiService.callWebhook(ENDPOINTS.SEARCH, requestData);
    }

    // ✅ CORRECTION : Export avec endpoint unifié
    async exportEnterprises(format = 'csv', filters = {}) {
        const requestData = {
            operation: "export",
            format: format,
            filters: filters
        };

        return apiService.callWebhook(ENDPOINTS.SEARCH, requestData);
    }
}

// Instance singleton
export const enterpriseService = new EnterpriseService();

// ✅ CORRECTION : Utilitaires avec champs Baserow
export const EnterpriseUtils = {
    // Génère un nom de fichier pour l'export
    generateExportFilename(format = 'csv') {
        const date = new Date().toISOString().split('T')[0];
        return `enterprises_${date}.${format}`;
    },

    // Filtre les entreprises par critères (avec champs Baserow)
    filterEnterprises(enterprises, filters) {
        return enterprises.filter(enterprise => {
            // Utilise le champ mappé 'commune' au lieu de 'ville'
            if (filters.commune && !enterprise.commune?.toLowerCase().includes(filters.commune.toLowerCase())) {
                return false;
            }
            
            // Utilise le champ mappé 'activite' au lieu de 'secteur_activite'
            if (filters.activite && !enterprise.activite?.toLowerCase().includes(filters.activite.toLowerCase())) {
                return false;
            }
            
            return true;
        });
    },

    // Groupe les entreprises par commune (pas ville)
    groupByCommune(enterprises) {
        return enterprises.reduce((groups, enterprise) => {
            const commune = enterprise.commune || 'Non spécifié';
            if (!groups[commune]) {
                groups[commune] = [];
            }
            groups[commune].push(enterprise);
            return groups;
        }, {});
    },

    // Alias pour compatibilité
    groupByCity(enterprises) {
        return this.groupByCommune(enterprises);
    }
};

export default enterpriseService;