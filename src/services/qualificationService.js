import { apiService, ApiUtils } from './api.js';
import { qualificationCache, CacheUtils } from '../utils/cache.js';
import { validatePrice } from '../utils/validators.js';
import { calculateTotalPrice } from '../utils/helpers.js';

// Service pour la gestion des qualifications
class QualificationService {
    constructor() {
        this.cache = qualificationCache;
    }

    // Création d'une qualification
    async createQualification(qualificationData) {
        const validation = this.validateQualificationData(qualificationData);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        const cleanData = ApiUtils.sanitizeData(qualificationData);
        const requestData = ApiUtils.prepareRequestData(cleanData, {
            action: 'create_qualification'
        });

        const response = await apiService.callWebhook('QUALIFICATION_API', requestData);
        
        // Met en cache si succès
        if (response.success && response.data) {
            const cacheKey = CacheUtils.generateQualificationKey(
                qualificationData.enterprise_id,
                qualificationData.action_type
            );
            this.cache.set(cacheKey, response.data);
        }

        return response;
    }

    // Récupération d'une qualification par ID
    async getQualificationById(id) {
        if (!id) {
            return { success: false, error: 'ID qualification requis' };
        }

        const cacheKey = CacheUtils.generateQualificationKey(id, 'by_id');
        const cachedResult = this.cache.get(cacheKey);
        
        if (cachedResult) {
            return { success: true, data: cachedResult };
        }

        const requestData = ApiUtils.prepareRequestData({
            action: 'get_qualification',
            qualification_id: id
        });

        const response = await apiService.callWebhook('QUALIFICATION_API', requestData);
        
        if (response.success) {
            this.cache.set(cacheKey, response.data);
        }

        return response;
    }

    // Recherche de qualifications
    async searchQualifications(criteria = {}) {
        const searchData = ApiUtils.prepareRequestData({
            action: 'search_qualifications',
            ...criteria
        });

        return apiService.callWebhook('QUALIFICATION_API', searchData);
    }

    // Mise à jour d'une qualification
    async updateQualification(id, updateData) {
        if (!id) {
            return { success: false, error: 'ID qualification requis' };
        }

        const validation = this.validateQualificationData(updateData, false);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        const cleanData = ApiUtils.sanitizeData(updateData);
        const requestData = ApiUtils.prepareRequestData(cleanData, {
            action: 'update_qualification',
            qualification_id: id
        });

        const response = await apiService.callWebhook('QUALIFICATION_API', requestData);
        
        // Invalide le cache
        if (response.success) {
            this.cache.delete(CacheUtils.generateQualificationKey(id, 'by_id'));
        }

        return response;
    }

    // Suppression d'une qualification
    async deleteQualification(id) {
        if (!id) {
            return { success: false, error: 'ID qualification requis' };
        }

        const requestData = ApiUtils.prepareRequestData({
            action: 'delete_qualification',
            qualification_id: id
        });

        const response = await apiService.callWebhook('QUALIFICATION_API', requestData);
        
        // Invalide le cache
        if (response.success) {
            this.cache.delete(CacheUtils.generateQualificationKey(id, 'by_id'));
        }

        return response;
    }

    // Validation des données de qualification
    validateQualificationData(data, required = true) {
        const errors = [];
        
        if (required) {
            if (!data.enterprise_id) {
                errors.push('ID entreprise requis');
            }
            
            if (!data.action_type) {
                errors.push('Type d\'action requis');
            }
        }

        if (data.publications && Array.isArray(data.publications)) {
            data.publications.forEach((pub, index) => {
                if (pub.prix && !validatePrice(pub.prix)) {
                    errors.push(`Prix invalide pour la publication ${index + 1}`);
                }
                
                if (pub.format && !this.isValidFormat(pub.format)) {
                    errors.push(`Format invalide pour la publication ${index + 1}`);
                }
            });
        }

        if (data.total_price && !validatePrice(data.total_price)) {
            errors.push('Prix total invalide');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Vérifie si un format est valide
    isValidFormat(format) {
        const validFormats = [
            '1/6 page',
            '1/4 page',
            '1/3 page',
            '1/2 page',
            '1 page',
            'Dos de couverture',
            'Couverture'
        ];
        return validFormats.includes(format);
    }

    // Calcul automatique du prix total
    calculateQualificationTotal(publications) {
        if (!publications || !Array.isArray(publications)) {
            return 0;
        }

        return calculateTotalPrice(publications);
    }

    // Préparation des données pour génération de document
    async prepareDocumentData(qualificationId, documentType) {
        const qualificationResponse = await this.getQualificationById(qualificationId);
        
        if (!qualificationResponse.success) {
            return qualificationResponse;
        }

        const qualification = qualificationResponse.data;
        
        // Prépare les données selon le type de document
        const documentData = {
            qualification_id: qualificationId,
            document_type: documentType,
            enterprise: qualification.enterprise,
            publications: qualification.publications || [],
            total_price: this.calculateQualificationTotal(qualification.publications),
            created_at: new Date().toISOString(),
            status: 'pending'
        };

        return { success: true, data: documentData };
    }

    // Génération de numéro de qualification
    generateQualificationNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        return `QUAL${year}${month}${day}${random}`;
    }

    // Obtenir les statistiques de qualifications
    async getQualificationStats(filters = {}) {
        const requestData = ApiUtils.prepareRequestData({
            action: 'get_stats',
            ...filters
        });

        return apiService.callWebhook('QUALIFICATION_API', requestData);
    }

    // Recherche de qualifications par entreprise
    async getQualificationsByEnterprise(enterpriseId) {
        if (!enterpriseId) {
            return { success: false, error: 'ID entreprise requis' };
        }

        const requestData = ApiUtils.prepareRequestData({
            action: 'get_by_enterprise',
            enterprise_id: enterpriseId
        });

        return apiService.callWebhook('QUALIFICATION_API', requestData);
    }

    // Clonage d'une qualification
    async cloneQualification(qualificationId, modifications = {}) {
        const originalResponse = await this.getQualificationById(qualificationId);
        
        if (!originalResponse.success) {
            return originalResponse;
        }

        const originalData = originalResponse.data;
        const clonedData = {
            ...originalData,
            ...modifications,
            qualification_number: this.generateQualificationNumber(),
            created_at: new Date().toISOString(),
            status: 'draft'
        };

        // Supprime l'ID original
        delete clonedData.id;

        return this.createQualification(clonedData);
    }

    // Validation des publications
    validatePublications(publications) {
        if (!publications || !Array.isArray(publications)) {
            return { valid: false, errors: ['Publications invalides'] };
        }

        const errors = [];
        
        publications.forEach((pub, index) => {
            if (!pub.format) {
                errors.push(`Format manquant pour la publication ${index + 1}`);
            }
            
            if (!pub.mois) {
                errors.push(`Mois manquant pour la publication ${index + 1}`);
            }
            
            if (!pub.prix || pub.prix <= 0) {
                errors.push(`Prix invalide pour la publication ${index + 1}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Formatage des données pour export
    formatQualificationForExport(qualification) {
        return {
            id: qualification.id,
            numero: qualification.qualification_number,
            entreprise: qualification.enterprise?.nom || 'N/A',
            type_action: qualification.action_type,
            nb_publications: qualification.publications?.length || 0,
            prix_total: qualification.total_price || 0,
            statut: qualification.status,
            date_creation: qualification.created_at,
            prospecteur: qualification.assigned_to || 'N/A'
        };
    }
}

// Instance singleton
export const qualificationService = new QualificationService();

// Utilitaires pour les qualifications
export const QualificationUtils = {
    // Groupe les qualifications par statut
    groupByStatus(qualifications) {
        return qualifications.reduce((groups, qualification) => {
            const status = qualification.status || 'unknown';
            if (!groups[status]) {
                groups[status] = [];
            }
            groups[status].push(qualification);
            return groups;
        }, {});
    },

    // Calcule les statistiques de base
    calculateBasicStats(qualifications) {
        const total = qualifications.length;
        const totalValue = qualifications.reduce((sum, q) => sum + (q.total_price || 0), 0);
        const avgValue = total > 0 ? totalValue / total : 0;
        
        const byStatus = QualificationUtils.groupByStatus(qualifications);
        
        return {
            total,
            totalValue,
            avgValue,
            byStatus: Object.keys(byStatus).map(status => ({
                status,
                count: byStatus[status].length,
                percentage: (byStatus[status].length / total) * 100
            }))
        };
    },

    // Filtre les qualifications par période
    filterByDateRange(qualifications, startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return qualifications.filter(qualification => {
            const date = new Date(qualification.created_at);
            return date >= start && date <= end;
        });
    }
};

export default qualificationService;