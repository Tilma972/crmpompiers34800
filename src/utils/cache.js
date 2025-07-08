import { DEFAULT_CONFIG } from '../config/constants.js';

// Cache simple en mémoire
class SimpleCache {
    constructor(ttl = DEFAULT_CONFIG.CACHE_TTL) {
        this.cache = new Map();
        this.ttl = ttl;
    }

    // Stocke une valeur avec TTL
    set(key, value, customTtl = null) {
        const expiry = Date.now() + (customTtl || this.ttl);
        this.cache.set(key, { value, expiry });
    }

    // Récupère une valeur
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    // Vérifie si une clé existe et est valide
    has(key) {
        return this.get(key) !== null;
    }

    // Supprime une clé
    delete(key) {
        return this.cache.delete(key);
    }

    // Vide le cache
    clear() {
        this.cache.clear();
    }

    // Nettoie les entrées expirées
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }

    // Retourne la taille du cache
    size() {
        return this.cache.size;
    }
}

// Instance globale du cache de recherche
export const searchCache = new SimpleCache();

// Cache pour les données d'entreprises
export const enterpriseCache = new SimpleCache(600000); // 10 minutes

// Cache pour les résultats de qualification
export const qualificationCache = new SimpleCache(300000); // 5 minutes

// Utilitaires pour gérer les caches
export const CacheUtils = {
    // Génère une clé de cache pour une recherche
    generateSearchKey(query, type = 'default') {
        return `${type}_${query.toLowerCase().trim()}`;
    },

    // Génère une clé de cache pour une entreprise
    generateEnterpriseKey(identifier) {
        return `enterprise_${identifier}`;
    },

    // Génère une clé de cache pour une qualification
    generateQualificationKey(enterpriseId, action) {
        return `qualification_${enterpriseId}_${action}`;
    },

    // Nettoie tous les caches
    clearAll() {
        searchCache.clear();
        enterpriseCache.clear();
        qualificationCache.clear();
    },

    // Nettoie les caches expirés
    cleanupAll() {
        searchCache.cleanup();
        enterpriseCache.cleanup();
        qualificationCache.cleanup();
    },

    // Obtient les statistiques des caches
    getStats() {
        return {
            search: {
                size: searchCache.size(),
                type: 'search'
            },
            enterprise: {
                size: enterpriseCache.size(),
                type: 'enterprise'
            },
            qualification: {
                size: qualificationCache.size(),
                type: 'qualification'
            }
        };
    }
};

// Nettoie automatiquement les caches toutes les 5 minutes
setInterval(() => {
    CacheUtils.cleanupAll();
}, 300000);

// Fonction de debounce pour les recherches
export function createSearchDebouncer(callback, delay = 300) {
    let timeoutId;
    let lastQuery = '';
    
    return function(query) {
        // Si la requête est identique, ignore
        if (query === lastQuery) return;
        
        lastQuery = query;
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            callback(query);
        }, delay);
    };
}

// Gestionnaire de cache pour les recherches avec debounce
export class SearchCacheManager {
    constructor(cacheInstance, debounceDelay = 300) {
        this.cache = cacheInstance;
        this.debounceDelay = debounceDelay;
        this.activeSearches = new Set();
    }

    // Recherche avec cache et debounce
    async search(query, searchFunction, cacheKey = null) {
        const key = cacheKey || CacheUtils.generateSearchKey(query);
        
        // Vérifie le cache d'abord
        const cachedResult = this.cache.get(key);
        if (cachedResult) {
            return cachedResult;
        }

        // Évite les recherches simultanées identiques
        if (this.activeSearches.has(key)) {
            return null;
        }

        this.activeSearches.add(key);

        try {
            const result = await searchFunction(query);
            
            // Met en cache le résultat
            if (result) {
                this.cache.set(key, result);
            }
            
            return result;
        } finally {
            this.activeSearches.delete(key);
        }
    }

    // Précharge des résultats dans le cache
    preload(queries, searchFunction) {
        queries.forEach(query => {
            const key = CacheUtils.generateSearchKey(query);
            if (!this.cache.has(key)) {
                this.search(query, searchFunction, key);
            }
        });
    }
}