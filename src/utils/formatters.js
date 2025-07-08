// Convertit les codes d'action en libellés français avec emojis
export function getActionLabel(actionType) {
    const labels = {
        'facture': '📄 Générer Facture',
        'bon_commande': '📋 Bon de Commande',
        'formulaire': '📝 Envoyer Formulaire',
        'stats': '📊 Statistiques Express',
        'nouvelle_entreprise': '➕ Nouvelle Entreprise',
        'qualification': '🎯 Qualification Prospect',
        'attribution': '👤 Attribution Prospecteur',
        'intelligence': '🧠 Intelligence CRM'
    };
    return labels[actionType] || actionType;
}

// Génère un commentaire automatique basé sur l'historique client
export function generateAutoComment(enterprise) {
    if (!enterprise || !enterprise.commentaires) return '';
    
    const commentaires = enterprise.commentaires.toLowerCase();
    let autoComment = '';
    
    if (commentaires.includes('fidèle') || commentaires.includes('régulier')) {
        autoComment = '✅ Client fidèle - Renouvellement prioritaire';
    } else if (commentaires.includes('nouveau') || commentaires.includes('première')) {
        autoComment = '🆕 Nouveau client - Accompagnement renforcé';
    } else if (commentaires.includes('retard') || commentaires.includes('paiement')) {
        autoComment = '⚠️ Suivi paiement nécessaire';
    } else {
        autoComment = '📝 Qualification standard';
    }
    
    return autoComment;
}

// Génère une description formatée pour les publications multiples
export function generateMultiPublicationsDescription(publicationsPayantes) {
    if (!publicationsPayantes || publicationsPayantes.length === 0) return '';
    
    const descriptions = publicationsPayantes.map(pub => {
        const format = pub.format || 'Format standard';
        const mois = pub.mois || 'Mois non spécifié';
        return `${format} - ${mois} 2026`;
    });
    
    if (descriptions.length === 1) {
        return `Insertion publicitaire ${descriptions[0]}`;
    } else {
        return `Insertions publicitaires: ${descriptions.join(' + ')} - Calendrier 2026`;
    }
}

// Génère un numéro de document unique (facture/bon de commande)
export function generateDocumentNumber(type) {
    const prefix = type === 'facture' ? 'FAC' : 'BC';
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const day = String(new Date().getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}${year}${month}${day}${random}`;
}

// Formate un prix en euros
export function formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

// Formate une date en français
export function formatDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

// Formate un nom d'entreprise pour l'affichage
export function formatEnterpriseName(name) {
    if (!name) return '';
    
    // Capitalise la première lettre de chaque mot
    return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

// Formate un numéro de téléphone
export function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Supprime tous les caractères non numériques
    const numbers = phone.replace(/\D/g, '');
    
    // Formate selon le standard français
    if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    
    return phone;
}

// Formate une adresse email
export function formatEmail(email) {
    if (!email) return '';
    return email.toLowerCase().trim();
}