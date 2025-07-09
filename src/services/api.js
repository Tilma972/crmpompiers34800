import { N8N_WEBHOOKS, TIMEOUTS } from '../config/constants.js';

// Classe pour gérer les appels API
class ApiService {
    constructor() {
        this.baseTimeout = TIMEOUTS.API_TIMEOUT;
        this.retryDelay = TIMEOUTS.RETRY_DELAY;
        this.maxRetries = 3;
    }

    // Méthode générique pour les requêtes HTTP
    async request(url, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: this.baseTimeout,
            ...options
        };

        let lastError;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(url, {
                    ...config,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return { success: true, data };

            } catch (error) {
                lastError = error;

                if (attempt < this.maxRetries - 1) {
                    await this.delay(this.retryDelay * Math.pow(2, attempt));
                }
            }
        }

        return {
            success: false,
            error: lastError.message || 'Erreur de connexion',
            details: lastError
        };
    }

    // Méthode GET
    async get(url, headers = {}) {
        return this.request(url, { method: 'GET', headers });
    }

    // Méthode POST
    async post(url, data = {}, headers = {}) {
        return this.request(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
    }

    // Méthode PUT
    async put(url, data = {}, headers = {}) {
        return this.request(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data)
        });
    }

    // Méthode DELETE
    async delete(url, headers = {}) {
        return this.request(url, { method: 'DELETE', headers });
    }

    // Utilitaire pour les délais
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Appel spécifique aux webhooks n8n
    async callWebhook(webhookKey, data = {}, options = {}) {
        const webhookUrl = N8N_WEBHOOKS[webhookKey];

        if (!webhookUrl) {
            return {
                success: false,
                error: `Webhook ${webhookKey} non trouvé`
            };
        }

        // ✅ CORRECTION : Envoie les données telles quelles
        return this.post(webhookUrl, data, options.headers);
    }

    // Appel avec authentification Telegram
    async callWithTelegramAuth(webhookKey, data = {}, telegramData = {}) {
        const authHeaders = {};

        if (telegramData.user) {
            authHeaders['X-Telegram-User'] = JSON.stringify(telegramData.user);
        }

        if (telegramData.chat_id) {
            authHeaders['X-Telegram-Chat'] = telegramData.chat_id;
        }

        return this.callWebhook(webhookKey, data, { headers: authHeaders });
    }

    // Gestion des erreurs spécifiques
    handleApiError(error) {
        const errorMappings = {
            'NetworkError': 'Erreur de connexion réseau',
            'TimeoutError': 'Délai d\'attente dépassé',
            'AbortError': 'Requête annulée',
            'TypeError': 'Erreur de format de données',
            'SyntaxError': 'Erreur de parsing JSON'
        };

        const errorType = error.constructor.name;
        return errorMappings[errorType] || error.message || 'Erreur inconnue';
    }

    // Validation des données avant envoi
    validateRequestData(data, requiredFields = []) {
        const errors = [];

        requiredFields.forEach(field => {
            if (!data[field]) {
                errors.push(`Le champ ${field} est requis`);
            }
        });

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true, errors: [] };
    }
}

// Instance singleton
export const apiService = new ApiService();

// Fonctions utilitaires spécifiques
export const ApiUtils = {
    // Construit une URL avec des paramètres de requête
    buildUrl(baseUrl, params = {}) {
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });
        return url.toString();
    },

    // Nettoie les données avant envoi
    sanitizeData(data) {
        const sanitized = {};

        Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                sanitized[key] = value;
            }
        });

        return sanitized;
    },

    // Prépare les données pour l'envoi
    prepareRequestData(data, additionalData = {}) {
        return {
            ...ApiUtils.sanitizeData(data),
            ...additionalData            
        };
    },

    // Gère les réponses d'erreur
    handleResponse(response) {
        if (response.success) {
            return response.data;
        } else {
            throw new Error(response.error || 'Erreur API');
        }
    }
};

export default apiService;