import { apiService, ApiUtils } from './api.js';
import { enterpriseCache, CacheUtils } from '../utils/cache.js';
import { validateEnterpriseName, validateEmail, validatePhoneNumber } from '../utils/validators.js';

// Service pour la gestion des entreprises
class EnterpriseService {
    constructor() {
        this.cache = enterpriseCache;
    }

    // Recherche d'entreprises avec cache
    async searchEnterprises(query, options = {}) {
        if (!query || query.trim().length < 2) {
            return { success: false, error: 'Requête trop courte' };
        }

        const cacheKey = CacheUtils.generateSearchKey(query, 'enterprises');
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult && !options.forceRefresh) {
            return { success: true, data: cachedResult };
        }

        const searchData = ApiUtils.prepareRequestData({
            query: query.trim(),
            limit: options.limit || 10,
            offset: options.offset || 0
        });

        const response = await apiService.callWebhook('ENTERPRISE_API', searchData);
        
        if (response.success) {
            this.cache.set(cacheKey, response.data);
        }

        return response;
    }

    // Recherche d'entreprise par ID
    async getEnterpriseById(id) {
        if (!id) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const cacheKey = CacheUtils.generateEnterpriseKey(id);
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult) {
            return { success: true, data: cachedResult };
        }

        const searchData = ApiUtils.prepareRequestData({ id });
        const response = await apiService.callWebhook('ENTERPRISE_API', searchData);
        
        if (response.success) {
            this.cache.set(cacheKey, response.data);
        }

        return response;
    }

    // Création d'une nouvelle entreprise
    async createEnterprise(enterpriseData) {
        const validation = this.validateEnterpriseData(enterpriseData);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        const cleanData = ApiUtils.sanitizeData(enterpriseData);
        const requestData = ApiUtils.prepareRequestData(cleanData, {
            action: 'create_enterprise'
        });

        const response = await apiService.callWebhook('FORM_ENTREPRISE', requestData);
        
        // Invalide le cache des recherches
        if (response.success) {
            this.invalidateSearchCache(enterpriseData.nom);
        }

        return response;
    }

    // Mise à jour d'une entreprise
    async updateEnterprise(id, updateData) {
        if (!id) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const validation = this.validateEnterpriseData(updateData, false);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        const cleanData = ApiUtils.sanitizeData(updateData);
        const requestData = ApiUtils.prepareRequestData(cleanData, {
            action: 'update_enterprise',
            enterprise_id: id
        });

        const response = await apiService.callWebhook('FORM_ENTREPRISE', requestData);
        
        // Invalide le cache
        if (response.success) {
            this.cache.delete(CacheUtils.generateEnterpriseKey(id));
            this.invalidateSearchCache(updateData.nom);
        }

        return response;
    }

    // Suppression d'une entreprise
    async deleteEnterprise(id) {
        if (!id) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const requestData = ApiUtils.prepareRequestData({
            action: 'delete_enterprise',
            enterprise_id: id
        });

        const response = await apiService.callWebhook('FORM_ENTREPRISE', requestData);
        
        // Invalide le cache
        if (response.success) {
            this.cache.delete(CacheUtils.generateEnterpriseKey(id));
        }

        return response;
    }

    // Recherche d'entités via le gateway
    async searchEntities(query, options = {}) {
        if (!query || query.trim().length < 2) {
            return { success: false, error: 'Requête trop courte' };
        }

        const searchData = ApiUtils.prepareRequestData({
            query: query.trim(),
            type: options.type || 'all',
            limit: options.limit || 10
        });

        return apiService.callWebhook('GATEWAY_ENTITIES', searchData);
    }

    // Validation des données d'entreprise
    validateEnterpriseData(data, required = true) {
        const errors = [];
        
        if (required) {
            if (!data.nom || !validateEnterpriseName(data.nom)) {
                errors.push('Nom d\'entreprise invalide');
            }
        }

        if (data.email && !validateEmail(data.email)) {
            errors.push('Email invalide');
        }

        if (data.telephone && !validatePhoneNumber(data.telephone)) {
            errors.push('Numéro de téléphone invalide');
        }

        if (data.code_postal && !/^\d{5}$/.test(data.code_postal)) {
            errors.push('Code postal invalide');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Invalide le cache de recherche pour un nom d'entreprise
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

    // Prépare les données d'entreprise pour l'affichage
    formatEnterpriseForDisplay(enterprise) {
        if (!enterprise) return null;

        return {
            id: enterprise.id,
            nom: enterprise.nom || 'Nom non spécifié',
            adresse: enterprise.adresse || '',
            ville: enterprise.ville || '',
            code_postal: enterprise.code_postal || '',
            telephone: enterprise.telephone || '',
            email: enterprise.email || '',
            commentaires: enterprise.commentaires || '',
            date_creation: enterprise.date_creation || null,
            secteur_activite: enterprise.secteur_activite || '',
            statut: enterprise.statut || 'actif'
        };
    }

    // Recherche intelligente avec suggestions
    async smartSearch(query, options = {}) {
        const results = await this.searchEnterprises(query, options);
        
        if (!results.success || !results.data || results.data.length === 0) {
            // Essayer une recherche par entités
            const entityResults = await this.searchEntities(query, options);
            if (entityResults.success && entityResults.data) {
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

    // Obtenir les statistiques d'entreprises
    async getEnterpriseStats() {
        const requestData = ApiUtils.prepareRequestData({
            action: 'get_stats'
        });

        return apiService.callWebhook('ENTERPRISE_API', requestData);
    }

    // Exporter les données d'entreprises
    async exportEnterprises(format = 'csv', filters = {}) {
        const requestData = ApiUtils.prepareRequestData({
            action: 'export',
            format,
            filters
        });

        return apiService.callWebhook('ENTERPRISE_API', requestData);
    }
}

// Instance singleton
export const enterpriseService = new EnterpriseService();

// Utilitaires pour les entreprises
export const EnterpriseUtils = {
    // Génère un nom de fichier pour l'export
    generateExportFilename(format = 'csv') {
        const date = new Date().toISOString().split('T')[0];
        return `enterprises_${date}.${format}`;
    },

    // Filtre les entreprises par critères
    filterEnterprises(enterprises, filters) {
        return enterprises.filter(enterprise => {
            if (filters.ville && !enterprise.ville?.toLowerCase().includes(filters.ville.toLowerCase())) {
                return false;
            }
            
            if (filters.secteur && !enterprise.secteur_activite?.toLowerCase().includes(filters.secteur.toLowerCase())) {
                return false;
            }
            
            if (filters.statut && enterprise.statut !== filters.statut) {
                return false;
            }
            
            return true;
        });
    },

    // Groupe les entreprises par ville
    groupByCity(enterprises) {
        return enterprises.reduce((groups, enterprise) => {
            const city = enterprise.ville || 'Non spécifié';
            if (!groups[city]) {
                groups[city] = [];
            }
            groups[city].push(enterprise);
            return groups;
        }, {});
    }
};

export default enterpriseService;