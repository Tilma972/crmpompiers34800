// Retourne le prix de base selon le format d'encart
export function getBasePriceByFormat(format) {
    const basePrices = {
        '1/6 page': 135,
        '1/4 page': 175,
        '1/3 page': 195,
        '1/2 page': 240,
        '1 page': 380,
        'Dos de couverture': 450,
        'Couverture': 520
    };
    
    return basePrices[format] || 135;
}

// Calcule le prix total d'une liste de publications
export function calculateTotalPrice(publications) {
    return publications.reduce((total, pub) => total + (pub.prix || 0), 0);
}

// Trouve le format le plus utilisé dans une liste
export function findMostUsedFormat(publications) {
    if (!publications || publications.length === 0) return null;
    
    const formatCounts = {};
    publications.forEach(pub => {
        const format = pub.format || 'Format standard';
        formatCounts[format] = (formatCounts[format] || 0) + 1;
    });
    
    return Object.keys(formatCounts).reduce((a, b) => 
        formatCounts[a] > formatCounts[b] ? a : b
    );
}

// Génère un identifiant unique
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Convertit une chaîne en slug URL-friendly
export function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Capitalise la première lettre
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Tronque un texte à une longueur donnée
export function truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Supprime les accents d'une chaîne
export function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Vérifie si une valeur est vide
export function isEmpty(value) {
    return value === null || value === undefined || value === '' || 
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
}

// Clone profond d'un objet
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone(obj[key]);
        });
        return cloned;
    }
}

// Débounce une fonction
export function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Throttle une fonction
export function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}