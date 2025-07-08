import { apiService, ApiUtils } from './api.js';
import { generateDocumentNumber } from '../utils/formatters.js';
import { validatePrice } from '../utils/validators.js';

// Service pour la gestion des documents
class DocumentService {
    constructor() {
        this.supportedFormats = ['pdf', 'docx', 'xlsx'];
        this.documentTypes = ['facture', 'bon_commande', 'devis', 'rapport'];
    }

    // Génération d'un document PDF
    async generatePdf(documentData, documentType) {
        const validation = this.validateDocumentData(documentData, documentType);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        const requestData = ApiUtils.prepareRequestData({
            action: 'generate_pdf',
            document_type: documentType,
            document_number: generateDocumentNumber(documentType),
            ...documentData
        });

        return apiService.callWebhook('PDF_GENERATOR', requestData);
    }

    // Génération d'une facture
    async generateInvoice(invoiceData) {
        const enhancedData = this.enhanceInvoiceData(invoiceData);
        return this.generatePdf(enhancedData, 'facture');
    }

    // Génération d'un bon de commande
    async generatePurchaseOrder(orderData) {
        const enhancedData = this.enhancePurchaseOrderData(orderData);
        return this.generatePdf(enhancedData, 'bon_commande');
    }

    // Génération d'un devis
    async generateQuote(quoteData) {
        const enhancedData = this.enhanceQuoteData(quoteData);
        return this.generatePdf(enhancedData, 'devis');
    }

    // Envoi d'email avec document
    async sendDocumentByEmail(documentData, emailData) {
        const validation = this.validateEmailData(emailData);
        if (!validation.valid) {
            return { success: false, error: validation.errors.join(', ') };
        }

        const requestData = ApiUtils.prepareRequestData({
            action: 'send_document_email',
            document: documentData,
            email: emailData
        });

        return apiService.callWebhook('EMAIL_WORKFLOW', requestData);
    }

    // Validation des données de document
    validateDocumentData(data, documentType) {
        const errors = [];
        
        if (!documentType || !this.documentTypes.includes(documentType)) {
            errors.push('Type de document invalide');
        }

        if (!data.enterprise || !data.enterprise.nom) {
            errors.push('Données entreprise manquantes');
        }

        if (!data.publications || !Array.isArray(data.publications) || data.publications.length === 0) {
            errors.push('Publications manquantes');
        }

        if (data.publications) {
            data.publications.forEach((pub, index) => {
                if (!pub.format) {
                    errors.push(`Format manquant pour la publication ${index + 1}`);
                }
                
                if (!pub.prix || !validatePrice(pub.prix)) {
                    errors.push(`Prix invalide pour la publication ${index + 1}`);
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

    // Validation des données d'email
    validateEmailData(emailData) {
        const errors = [];
        
        if (!emailData.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailData.to)) {
            errors.push('Email destinataire invalide');
        }

        if (!emailData.subject || emailData.subject.trim().length === 0) {
            errors.push('Sujet email manquant');
        }

        if (!emailData.body || emailData.body.trim().length === 0) {
            errors.push('Corps email manquant');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Amélioration des données de facture
    enhanceInvoiceData(invoiceData) {
        const enhanced = {
            ...invoiceData,
            document_type: 'facture',
            document_number: generateDocumentNumber('facture'),
            issue_date: new Date().toISOString(),
            due_date: this.calculateDueDate(30), // 30 jours
            payment_terms: '30 jours net',
            vat_rate: 0.20, // 20% TVA
            currency: 'EUR'
        };

        // Calcul des totaux avec TVA
        if (enhanced.total_price) {
            enhanced.total_ht = enhanced.total_price;
            enhanced.total_tva = enhanced.total_price * enhanced.vat_rate;
            enhanced.total_ttc = enhanced.total_price + enhanced.total_tva;
        }

        return enhanced;
    }

    // Amélioration des données de bon de commande
    enhancePurchaseOrderData(orderData) {
        return {
            ...orderData,
            document_type: 'bon_commande',
            document_number: generateDocumentNumber('bon_commande'),
            order_date: new Date().toISOString(),
            expected_delivery: this.calculateDeliveryDate(7), // 7 jours
            status: 'pending',
            currency: 'EUR'
        };
    }

    // Amélioration des données de devis
    enhanceQuoteData(quoteData) {
        return {
            ...quoteData,
            document_type: 'devis',
            document_number: generateDocumentNumber('devis'),
            quote_date: new Date().toISOString(),
            valid_until: this.calculateValidityDate(30), // 30 jours
            status: 'pending',
            currency: 'EUR'
        };
    }

    // Calcul de la date d'échéance
    calculateDueDate(daysFromNow) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString();
    }

    // Calcul de la date de livraison
    calculateDeliveryDate(daysFromNow) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString();
    }

    // Calcul de la date de validité
    calculateValidityDate(daysFromNow) {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString();
    }

    // Préparation des données pour l'email
    prepareEmailData(documentType, enterprise, documentUrl) {
        const templates = {
            facture: {
                subject: `Facture - ${enterprise.nom}`,
                body: `Bonjour,

Veuillez trouver ci-joint votre facture.

Cordialement,
L'équipe Sapeurs-Pompiers Clermont-l'Hérault`
            },
            bon_commande: {
                subject: `Bon de commande - ${enterprise.nom}`,
                body: `Bonjour,

Veuillez trouver ci-joint votre bon de commande.

Cordialement,
L'équipe Sapeurs-Pompiers Clermont-l'Hérault`
            },
            devis: {
                subject: `Devis - ${enterprise.nom}`,
                body: `Bonjour,

Veuillez trouver ci-joint votre devis.

Cordialement,
L'équipe Sapeurs-Pompiers Clermont-l'Hérault`
            }
        };

        const template = templates[documentType] || templates.facture;
        
        return {
            to: enterprise.email,
            subject: template.subject,
            body: template.body,
            attachments: documentUrl ? [{ url: documentUrl, name: `${documentType}.pdf` }] : []
        };
    }

    // Génération et envoi automatique
    async generateAndSendDocument(documentData, documentType, sendByEmail = false) {
        // Génère le document
        const documentResponse = await this.generatePdf(documentData, documentType);
        
        if (!documentResponse.success) {
            return documentResponse;
        }

        const result = {
            success: true,
            data: {
                document: documentResponse.data,
                sent_by_email: false
            }
        };

        // Envoie par email si demandé
        if (sendByEmail && documentData.enterprise?.email) {
            const emailData = this.prepareEmailData(
                documentType,
                documentData.enterprise,
                documentResponse.data.url
            );
            
            const emailResponse = await this.sendDocumentByEmail(
                documentResponse.data,
                emailData
            );
            
            result.data.email_result = emailResponse;
            result.data.sent_by_email = emailResponse.success;
        }

        return result;
    }

    // Téléchargement d'un document
    async downloadDocument(documentId) {
        const requestData = ApiUtils.prepareRequestData({
            action: 'download_document',
            document_id: documentId
        });

        return apiService.callWebhook('PDF_GENERATOR', requestData);
    }

    // Obtenir l'historique des documents
    async getDocumentHistory(enterpriseId) {
        const requestData = ApiUtils.prepareRequestData({
            action: 'get_document_history',
            enterprise_id: enterpriseId
        });

        return apiService.callWebhook('PDF_GENERATOR', requestData);
    }

    // Suppression d'un document
    async deleteDocument(documentId) {
        const requestData = ApiUtils.prepareRequestData({
            action: 'delete_document',
            document_id: documentId
        });

        return apiService.callWebhook('PDF_GENERATOR', requestData);
    }
}

// Instance singleton
export const documentService = new DocumentService();

// Utilitaires pour les documents
export const DocumentUtils = {
    // Formate la taille d'un fichier
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Génère un nom de fichier sécurisé
    generateSafeFilename(originalName, documentType = 'document') {
        const timestamp = new Date().toISOString().slice(0, 10);
        const safeName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `${documentType}_${safeName}_${timestamp}.pdf`;
    },

    // Vérifie si un format est supporté
    isSupportedFormat(format) {
        return documentService.supportedFormats.includes(format.toLowerCase());
    },

    // Calcule le total TTC
    calculateTotalWithTax(totalHT, taxRate = 0.20) {
        const tax = totalHT * taxRate;
        return {
            total_ht: totalHT,
            total_tva: tax,
            total_ttc: totalHT + tax
        };
    }
};

export default documentService;