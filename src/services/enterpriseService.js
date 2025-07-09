import { apiService, ApiUtils } from './api.js';
import { enterpriseCache, CacheUtils } from '../utils/cache.js';
import { validateEnterpriseName, validateEmail, validatePhoneNumber } from '../utils/validators.js';

// Service pour la gestion des entreprises - VERSION CORRIGÉE BASEROW
class EnterpriseService {
    constructor() {
        this.cache = enterpriseCache;
    }

    // ✅ CORRECTION : Recherche avec format n8n correct
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

        const response = await apiService.callWebhook('ENTERPRISE_API', searchData);
        
        if (response.success) {
            this.cache.set(cacheKey, response.data);
        }

        return response;
    }

    // ✅ CORRECTION : Recherche par ID avec bon format
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

        const response = await apiService.callWebhook('ENTERPRISE_API', searchData);
        
        if (response.success) {
            this.cache.set(cacheKey, response.data);
        }

        return response;
    }

    // ✅ CORRECTION : Création avec bon format
    async createEnterprise(enterpriseData) {
        const validation = this.validateEnterpriseData(enterpriseData);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        // ✅ CORRECTION : Mapping des champs Baserow
        const baserowData = this.mapToBaserowFields(enterpriseData);
        
        const requestData = {
            operation: "create",
            data: baserowData
        };

        const response = await apiService.callWebhook('FORM_ENTREPRISE', requestData);
        
        // Invalide le cache des recherches
        if (response.success) {
            this.invalidateSearchCache(enterpriseData.nom_entreprise || enterpriseData.nom);
        }

        return response;
    }

    // ✅ CORRECTION : Mise à jour avec bon format
    async updateEnterprise(id, updateData) {
        if (!id) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const validation = this.validateEnterpriseData(updateData, false);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        // ✅ CORRECTION : Mapping des champs Baserow
        const baserowData = this.mapToBaserowFields(updateData);
        
        const requestData = {
            operation: "update",
            id: id,
            data: baserowData
        };

        const response = await apiService.callWebhook('FORM_ENTREPRISE', requestData);
        
        // Invalide le cache
        if (response.success) {
            this.cache.delete(CacheUtils.generateEnterpriseKey(id));
            this.invalidateSearchCache(updateData.nom_entreprise || updateData.nom);
        }

        return response;
    }

    // ✅ CORRECTION : Suppression avec bon format
    async deleteEnterprise(id) {
        if (!id) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const requestData = {
            operation: "delete",
            id: id
        };

        const response = await apiService.callWebhook('FORM_ENTREPRISE', requestData);
        
        // Invalide le cache
        if (response.success) {
            this.cache.delete(CacheUtils.generateEnterpriseKey(id));
        }

        return response;
    }

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

    // ✅ NOUVEAU : Mapping depuis champs Baserow vers format standard
    mapFromBaserowFields(baserowData) {
        if (!baserowData) return null;

        return {
            id: baserowData.id,
            nom: baserowData.nom_entreprise || 'Nom non spécifié',
            nom_entreprise: baserowData.nom_entreprise || 'Nom non spécifié',
            adresse: baserowData.Adresse || '',
            commune: this.getCommuneLabel(baserowData.Commune) || '',
            ville: this.getCommuneLabel(baserowData.Commune) || '', // Alias pour compatibilité
            telephone: baserowData.Telephone || '',
            portable: baserowData.portable || '',
            email: baserowData.email || '',
            interlocuteur: baserowData.interlocuteur || '',
            activite: baserowData.Activitée || '',
            secteur_activite: baserowData.Activitée || '', // Alias pour compatibilité
            
            // Champs calculés/virtuels pour compatibilité
            code_postal: '', // Pas disponible dans Baserow
            statut: 'actif', // Valeur par défaut
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

    // ✅ CORRECTION : Recherche entités avec bon format
    async searchEntities(query, options = {}) {
        if (!query || query.trim().length < 2) {
            return { success: false, error: 'Requête trop courte' };
        }

        const searchData = {
            operation: "search",
            query: query.trim(),
            type: options.type || 'all',
            limit: options.limit || 10
        };

        return apiService.callWebhook('GATEWAY_ENTITIES', searchData);
    }

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

    // ✅ CORRECTION : Recherche intelligente avec mapping
    async smartSearch(query, options = {}) {
        const results = await this.searchEnterprises(query, options);
        
        if (results.success && results.data) {
            // Applique le mapping sur tous les résultats
            results.data = results.data.map(enterprise => this.mapFromBaserowFields(enterprise));
        }
        
        if (!results.success || !results.data || results.data.length === 0) {
            // Essayer une recherche par entités
            const entityResults = await this.searchEntities(query, options);
            if (entityResults.success && entityResults.data) {
                // Applique le mapping sur les entités aussi
                entityResults.data = entityResults.data.map(entity => this.mapFromBaserowFields(entity));
                
                return {
                    success: true,
                    data: entityResults.data,
                    source: 'entities'
                };
            }
        }

        return {
            ...results,
            source: 'enterprises'
        };
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

    // ✅ CORRECTION : Stats avec bon format
    async getEnterpriseStats() {
        const requestData = {
            operation: "stats"
        };

        return apiService.callWebhook('ENTERPRISE_API', requestData);
    }

    // ✅ CORRECTION : Export avec bon format
    async exportEnterprises(format = 'csv', filters = {}) {
        const requestData = {
            operation: "export",
            format: format,
            filters: filters
        };

        return apiService.callWebhook('ENTERPRISE_API', requestData);
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